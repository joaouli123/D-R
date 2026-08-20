// ============================================================
// Sincronização do espelho do CAEPI.
//
// Duas etapas independentes, porque têm custo e frequência diferentes:
//
//   1. sincronizarBase()   — baixa o CSV inteiro e grava os ~42 mil
//                            registros. Um download só.
//   2. sincronizarFichas() — visita a ficha individual dos protetores
//                            auditivos para pegar o NRRsf, que não
//                            existe no CSV. Uma requisição por CA.
//
// A etapa 2 é incremental por natureza: só busca quem ainda não tem
// NRRsf. Depois da carga inicial, cada rodada trata apenas as
// homologações novas.
//
// Nenhuma das duas escreve em cas_atenuacao a partir do CSV — é o
// que garante que atualizar a base do MTE nunca apaga o valor que o
// perito digitou.
// ============================================================

import { prisma } from '../../prisma.js'
import { lerCaepi } from './csv.js'
import { chaveRegistro, mapearLinha, mesclarRegistros, type RegistroCa } from './mapear.js'
import { normalizarNrrsf } from './normalizar.js'
import { baixarBaseCaepi, buscarFicha } from './portal.js'

/** Colunas gravadas a partir do CSV, na ordem dos parâmetros. */
export const COLUNAS_CSV = [
  'numeroCa', 'processo', 'dataValidade', 'situacao', 'cnpj', 'razaoSocial',
  'natureza', 'equipamento', 'descricao', 'marca', 'referencia', 'cor',
  'aprovadoParaLaudo', 'restricaoLaudo', 'observacaoLaudo', 'normas', 'laudos',
  'categoria', 'anexos', 'exigeNrrsf', 'descontinuado',
] as const

/**
 * 21 colunas por linha. O Postgres aceita 65.535 parâmetros por
 * comando, então 500 linhas (10.500) fica bem abaixo do teto.
 */
export const TAMANHO_LOTE = 500

export interface ResultadoBase {
  linhasLidas: number
  registros: number
  novos: number
  atualizados: number
  linhasIgnoradas: number
}

export interface ResultadoFichas {
  consultadas: number
  comNrrsf: number
  falhas: number
}

function valoresDoRegistro(registro: RegistroCa): unknown[] {
  return [
    registro.numeroCa, registro.processo, registro.dataValidade, registro.situacao,
    registro.cnpj, registro.razaoSocial, registro.natureza, registro.equipamento,
    registro.descricao, registro.marca, registro.referencia, registro.cor,
    registro.aprovadoParaLaudo, registro.restricaoLaudo, registro.observacaoLaudo,
    registro.normas, JSON.stringify(registro.laudos), registro.categoria,
    registro.anexos, registro.exigeNrrsf, registro.descontinuado,
  ]
}

/**
 * Monta o INSERT ... ON CONFLICT do lote.
 *
 * `xmax = 0` é o truque padrão do Postgres para distinguir a linha
 * inserida da atualizada dentro de um upsert — é o que alimenta a
 * contagem de "novos" no histórico de sincronização.
 */
export function montarUpsert(quantidade: number): string {
  const colunas = COLUNAS_CSV.map((coluna) => `"${coluna}"`).join(', ')

  const tuplas: string[] = []
  for (let linha = 0; linha < quantidade; linha += 1) {
    const base = linha * COLUNAS_CSV.length
    const parametros = COLUNAS_CSV.map((coluna, indice) => {
      const posicao = `$${base + indice + 1}`
      // laudos chega como texto JSON; o Postgres precisa do cast.
      return coluna === 'laudos' ? `${posicao}::jsonb` : posicao
    })
    tuplas.push(`(${parametros.join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
  }

  const atualizacoes = COLUNAS_CSV
    .filter((coluna) => coluna !== 'numeroCa' && coluna !== 'processo')
    .map((coluna) => `"${coluna}" = EXCLUDED."${coluna}"`)
    .join(', ')

  return [
    `INSERT INTO "cas_oficiais" (${colunas}, "sincronizadoEm", "atualizadoEm")`,
    `VALUES ${tuplas.join(', ')}`,
    `ON CONFLICT ("numeroCa", "processo") DO UPDATE SET ${atualizacoes},`,
    `  "sincronizadoEm" = CURRENT_TIMESTAMP,`,
    `  "atualizadoEm" = CURRENT_TIMESTAMP`,
    `RETURNING (xmax = 0) AS inserido`,
  ].join('\n')
}

export interface ContagemLote {
  novos: number
  atualizados: number
}

/** Grava um lote e devolve quantos eram registros novos. */
async function gravarLote(lote: RegistroCa[]): Promise<ContagemLote> {
  if (!lote.length) return { novos: 0, atualizados: 0 }

  const sql = montarUpsert(lote.length)
  const parametros = lote.flatMap(valoresDoRegistro)
  const linhas = await prisma.$queryRawUnsafe<{ inserido: boolean }[]>(sql, ...parametros)

  const novos = linhas.filter((linha) => linha.inserido).length
  return { novos, atualizados: linhas.length - novos }
}

export type Gravador = (lote: RegistroCa[]) => Promise<ContagemLote>

export interface OpcoesBase {
  /** Stream alternativo — usado nos testes e na carga a partir de arquivo local. */
  fonte?: NodeJS.ReadableStream
  sinal?: AbortSignal
  aoProgredir?: (etapa: 'lendo' | 'gravando', quantidade: number) => void
  gravar?: Gravador
}

/**
 * Baixa a base do MTE e atualiza o espelho.
 *
 * A agregação por (CA, processo) precisa acontecer em memória: as
 * linhas do mesmo CA não vêm agrupadas no arquivo (75 mil das 124 mil
 * aparecem fora de sequência), então não dá para fechar um grupo
 * antes do fim da leitura. São ~42 mil registros já normalizados,
 * o que cabe com folga; o que não caberia é o CSV de 143 MB, e esse
 * continua passando em fluxo.
 */
export async function sincronizarBase(opcoes: OpcoesBase = {}): Promise<ResultadoBase> {
  const stream = opcoes.fonte ?? (await baixarBaseCaepi(opcoes.sinal))
  const gravar = opcoes.gravar ?? gravarLote

  // O arquivo é UTF-8 (com BOM duplicado). setEncoding cuida das
  // fronteiras de caractere multibyte entre chunks.
  stream.setEncoding('utf8')

  const agrupados = new Map<string, RegistroCa>()
  let linhasLidas = 0
  let linhasIgnoradas = 0

  for await (const linha of lerCaepi(stream as AsyncIterable<string>)) {
    if (opcoes.sinal?.aborted) throw new Error('Sincronização cancelada')

    linhasLidas += 1
    if (linhasLidas % 10_000 === 0) opcoes.aoProgredir?.('lendo', linhasLidas)

    const registro = mapearLinha(linha)
    if (!registro) {
      linhasIgnoradas += 1
      continue
    }

    const chave = chaveRegistro(registro)
    const anterior = agrupados.get(chave)
    agrupados.set(chave, anterior ? mesclarRegistros(anterior, registro) : registro)
  }

  let novos = 0
  let atualizados = 0
  let gravados = 0
  let lote: RegistroCa[] = []

  const descarregar = async () => {
    const parcial = await gravar(lote)
    novos += parcial.novos
    atualizados += parcial.atualizados
    gravados += lote.length
    lote = []
    opcoes.aoProgredir?.('gravando', gravados)
  }

  for (const registro of agrupados.values()) {
    if (opcoes.sinal?.aborted) throw new Error('Sincronização cancelada')
    lote.push(registro)
    if (lote.length >= TAMANHO_LOTE) await descarregar()
  }
  if (lote.length) await descarregar()

  return { linhasLidas, registros: agrupados.size, novos, atualizados, linhasIgnoradas }
}

export interface OpcoesFichas {
  limite?: number
  /** Pausa entre requisições. O portal do MTE é lento e sequencial. */
  pausaMs?: number
  sinal?: AbortSignal
  aoProgredir?: (numeroCa: string, nrrsf: number | null) => void
  buscar?: typeof buscarFicha
  /** Revisita fichas já consultadas que voltaram sem NRRsf. */
  incluirJaConsultados?: boolean
}

/** Números de CA que exigem NRRsf e ainda não têm valor registrado. */
export async function listarPendentesDeNrrsf(opcoes: OpcoesFichas = {}): Promise<string[]> {
  const linhas = await prisma.$queryRawUnsafe<{ numeroCa: string }[]>(
    `SELECT DISTINCT o."numeroCa"
       FROM "cas_oficiais" o
       LEFT JOIN "cas_atenuacao" a ON a."numeroCa" = o."numeroCa"
      WHERE o."exigeNrrsf" = TRUE
        AND a."nrrsfDb" IS NULL
        ${opcoes.incluirJaConsultados ? '' : 'AND a."fichaConsultadaEm" IS NULL'}
      ORDER BY o."numeroCa"
      ${opcoes.limite ? `LIMIT ${Number(opcoes.limite)}` : ''}`,
  )
  return linhas.map((linha) => linha.numeroCa)
}

/**
 * Busca o NRRsf na ficha individual dos protetores auditivos.
 *
 * O UPDATE nunca sobrescreve fonte PERITO: se o perito digitou o
 * valor, ele permanece, mesmo que o MTE passe a publicar outro.
 */
export async function sincronizarFichas(opcoes: OpcoesFichas = {}): Promise<ResultadoFichas> {
  const buscar = opcoes.buscar ?? buscarFicha
  const pausa = opcoes.pausaMs ?? 800

  const pendentes = await listarPendentesDeNrrsf(opcoes)

  let consultadas = 0
  let comNrrsf = 0
  let falhas = 0

  for (const numeroCa of pendentes) {
    if (opcoes.sinal?.aborted) break

    try {
      const ficha = await buscar(numeroCa, opcoes.sinal)
      consultadas += 1

      const nrrsf = normalizarNrrsf(ficha?.nrrsfBruto)
      const bandas = ficha?.bandas && Object.keys(ficha.bandas).length ? JSON.stringify(ficha.bandas) : null

      // Marca a visita mesmo sem NRRsf, senão a próxima rodada
      // tentaria os mesmos CAs sem valor para sempre.
      await prisma.$executeRawUnsafe(
        `INSERT INTO "cas_atenuacao" ("numeroCa", "nrrsfDb", "fonte", "bandas", "fichaConsultadaEm", "atualizadoEm")
         VALUES ($1, $2, 'CAEPI', $3::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT ("numeroCa") DO UPDATE SET
           "nrrsfDb"           = COALESCE(EXCLUDED."nrrsfDb", "cas_atenuacao"."nrrsfDb"),
           "bandas"            = COALESCE(EXCLUDED."bandas", "cas_atenuacao"."bandas"),
           "fichaConsultadaEm" = CURRENT_TIMESTAMP,
           "atualizadoEm"      = CURRENT_TIMESTAMP
         WHERE "cas_atenuacao"."fonte" <> 'PERITO'`,
        numeroCa,
        nrrsf,
        bandas,
      )

      if (nrrsf != null) comNrrsf += 1
      opcoes.aoProgredir?.(numeroCa, nrrsf)
    } catch {
      falhas += 1
    }

    if (pausa > 0) await new Promise((resolver) => setTimeout(resolver, pausa))
  }

  return { consultadas, comNrrsf, falhas }
}

export interface OpcoesSincronizacao extends OpcoesBase {
  origem?: string
  /** Quantas fichas de NRRsf buscar depois do CSV. 0 pula a etapa. */
  fichas?: number
  pausaFichasMs?: number
}

/**
 * Roda a sincronização completa registrando o resultado no histórico.
 *
 * O registro é gravado mesmo quando dá erro — a tela de status
 * precisa mostrar a falha, não o silêncio de uma sync que nunca
 * terminou.
 */
export async function sincronizar(opcoes: OpcoesSincronizacao = {}) {
  const execucao = await prisma.caepiSincronizacao.create({
    data: { status: 'executando', origem: opcoes.origem ?? 'manual' },
  })

  try {
    const base = await sincronizarBase(opcoes)

    const fichas = opcoes.fichas
      ? await sincronizarFichas({
          limite: opcoes.fichas,
          pausaMs: opcoes.pausaFichasMs,
          sinal: opcoes.sinal,
        })
      : { consultadas: 0, comNrrsf: 0, falhas: 0 }

    await prisma.caepiSincronizacao.update({
      where: { id: execucao.id },
      data: {
        status: 'concluida',
        concluidoEm: new Date(),
        registrosLidos: base.linhasLidas,
        registrosNovos: base.novos,
        registrosAtualizados: base.atualizados,
        fichasConsultadas: fichas.consultadas,
      },
    })

    return { id: execucao.id, ...base, ...fichas }
  } catch (erro) {
    await prisma.caepiSincronizacao.update({
      where: { id: execucao.id },
      data: {
        status: 'falhou',
        concluidoEm: new Date(),
        erro: erro instanceof Error ? erro.message : String(erro),
      },
    })
    throw erro
  }
}
