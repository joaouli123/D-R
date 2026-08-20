// ============================================================
// Acesso ao espelho do CAEPI.
//
// A rota conversa com a interface RepositorioCaepi, não com o Prisma.
// Não é cerimônia: o smoke test precisa exercitar as rotas — inclusive
// o cálculo de validade na data da perícia, que é o que vira frase de
// laudo — sem subir um Postgres.
//
// A busca textual é SQL cru de propósito: o `contains` do Prisma vira
// ILIKE '%termo%', que ignora o índice GIN e varre as 42 mil linhas a
// cada tecla digitada no seletor de EPI.
// ============================================================

import { prisma } from '../../prisma.js'
import { EXPRESSAO_BUSCA, montarTsQuery, type Homologacao } from './consulta.js'

export interface Atenuacao {
  numeroCa: string
  nrrsfDb: number | null
  fonte: string
  bandas: unknown
  observacao: string | null
  fichaConsultadaEm: Date | null
  atualizadoEm: Date
}

/** Homologação enriquecida com o NRRsf, que mora em outra tabela. */
export interface HomologacaoComAtenuacao extends Homologacao {
  nrrsfDb: number | null
  fonteNrrsf: string | null
}

export interface FiltrosBusca {
  termo?: string
  numeroCa?: string
  categoria?: string
  anexo?: string
  /** true = só protetor auditivo; false = só o resto; undefined = tudo. */
  auditivo?: boolean
  /** Por padrão os layouts descontinuados do MTE ficam de fora. */
  incluirDescontinuados?: boolean
  dataReferencia: string
  limite: number
}

export interface StatusCaepi {
  ultimaSincronizacao: {
    id: string
    iniciadoEm: Date
    concluidoEm: Date | null
    status: string
    origem: string
    registrosLidos: number
    registrosNovos: number
    registrosAtualizados: number
    fichasConsultadas: number
    erro: string | null
  } | null
  totais: {
    homologacoes: number
    cas: number
    validosHoje: number
    protetoresAuditivos: number
    comNrrsf: number
    nrrsfDoPerito: number
  }
}

export interface RepositorioCaepi {
  homologacoesDe(numeroCa: string): Promise<Homologacao[]>
  atenuacaoDe(numeroCa: string): Promise<Atenuacao | null>
  buscar(filtros: FiltrosBusca): Promise<HomologacaoComAtenuacao[]>
  salvarAtenuacao(
    numeroCa: string,
    dados: { nrrsfDb: number | null; observacao: string | null },
  ): Promise<Atenuacao>
  status(dataReferencia: string): Promise<StatusCaepi>
}

/**
 * Monta o SQL da busca.
 *
 * Exportado para o smoke test conferir duas coisas que o
 * `$queryRawUnsafe` esconderia até a produção: que a expressão
 * indexada é usada literalmente (senão o índice GIN não entra) e que
 * nenhum valor do usuário é concatenado no texto do comando.
 */
export function montarBusca(filtros: FiltrosBusca): { sql: string; parametros: unknown[] } {
  const limite = Math.min(Math.max(Math.trunc(filtros.limite) || 30, 1), 200)

  const parametros: unknown[] = [
    montarTsQuery(filtros.termo),
    filtros.numeroCa ?? null,
    filtros.categoria ?? null,
    filtros.anexo ?? null,
    filtros.auditivo ?? null,
    filtros.dataReferencia,
  ]

  const sql = [
    'SELECT o.*, a."nrrsfDb", a."fonte" AS "fonteNrrsf"',
    '  FROM "cas_oficiais" o',
    '  LEFT JOIN "cas_atenuacao" a ON a."numeroCa" = o."numeroCa"',
    ` WHERE ($1::text IS NULL OR ${EXPRESSAO_BUSCA} @@ to_tsquery('portuguese', $1))`,
    '   AND ($2::text IS NULL OR o."numeroCa" = $2)',
    '   AND ($3::text IS NULL OR o."categoria" = $3)',
    '   AND ($4::text IS NULL OR $4::text = ANY(o."anexos"))',
    '   AND ($5::boolean IS NULL OR o."exigeNrrsf" = $5::boolean)',
    filtros.incluirDescontinuados ? '' : '   AND o."descontinuado" = FALSE',
    // Quem valia na data da perícia vem primeiro: é o registro que o
    // laudo cita. Depois, o de validade mais recente.
    ' ORDER BY (o."dataValidade" >= $6::text) DESC NULLS LAST,',
    '          o."dataValidade" DESC NULLS LAST,',
    '          o."numeroCa" ASC',
    ` LIMIT ${limite}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { sql, parametros }
}

export const repositorioPrisma: RepositorioCaepi = {
  async homologacoesDe(numeroCa) {
    const linhas = await prisma.caOficial.findMany({
      where: { numeroCa },
      orderBy: [{ dataValidade: 'desc' }, { processo: 'asc' }],
    })
    return linhas as unknown as Homologacao[]
  },

  async atenuacaoDe(numeroCa) {
    return (await prisma.caAtenuacao.findUnique({ where: { numeroCa } })) as Atenuacao | null
  },

  async buscar(filtros) {
    const { sql, parametros } = montarBusca(filtros)
    return prisma.$queryRawUnsafe<HomologacaoComAtenuacao[]>(sql, ...parametros)
  },

  async salvarAtenuacao(numeroCa, dados) {
    // fonte PERITO sempre: esta rota só existe para o valor que o
    // perito levantou. A sincronização do MTE respeita a marca.
    const resultado = await prisma.caAtenuacao.upsert({
      where: { numeroCa },
      create: { numeroCa, nrrsfDb: dados.nrrsfDb, observacao: dados.observacao, fonte: 'PERITO' },
      update: { nrrsfDb: dados.nrrsfDb, observacao: dados.observacao, fonte: 'PERITO' },
    })
    return resultado as Atenuacao
  },

  async status(dataReferencia) {
    const ultima = await prisma.caepiSincronizacao.findFirst({ orderBy: { iniciadoEm: 'desc' } })

    const [totais] = await prisma.$queryRawUnsafe<
      { homologacoes: bigint; cas: bigint; validosHoje: bigint; protetores: bigint }[]
    >(
      `SELECT count(*)                                                   AS "homologacoes",
              count(DISTINCT "numeroCa")                                 AS "cas",
              count(*) FILTER (WHERE "dataValidade" >= $1::text)          AS "validosHoje",
              count(DISTINCT "numeroCa") FILTER (WHERE "exigeNrrsf")     AS "protetores"
         FROM "cas_oficiais"`,
      dataReferencia,
    )

    const [atenuacao] = await prisma.$queryRawUnsafe<{ comNrrsf: bigint; doPerito: bigint }[]>(
      `SELECT count(*) FILTER (WHERE "nrrsfDb" IS NOT NULL)                        AS "comNrrsf",
              count(*) FILTER (WHERE "fonte" = 'PERITO' AND "nrrsfDb" IS NOT NULL) AS "doPerito"
         FROM "cas_atenuacao"`,
    )

    return {
      ultimaSincronizacao: ultima,
      totais: {
        homologacoes: Number(totais?.homologacoes ?? 0),
        cas: Number(totais?.cas ?? 0),
        validosHoje: Number(totais?.validosHoje ?? 0),
        protetoresAuditivos: Number(totais?.protetores ?? 0),
        comNrrsf: Number(atenuacao?.comNrrsf ?? 0),
        nrrsfDoPerito: Number(atenuacao?.doPerito ?? 0),
      },
    }
  },
}
