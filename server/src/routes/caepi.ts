import { Router } from 'express'
import { z } from 'zod'
import { exigirPerfil, exigirSessao, sessaoDe } from '../auth.js'
import { ErroHttp, parametro, rota } from '../erros.js'
import { descomprimirCsvCaepi, pareceComprimido } from '../services/caepi/arquivo.js'
import { colheitaNrrsf, type Colheita } from '../services/caepi/colheita.js'
import { avaliar, escolherHomologacao, hojeIso } from '../services/caepi/consulta.js'
import { normalizarNumeroCa, normalizarNrrsf } from '../services/caepi/normalizar.js'
import { buscadorNrrsf, type Buscador, type EstadoBuscaNrrsf } from '../services/caepi/nrrsf.js'
import { repositorioPrisma, type RepositorioCaepi } from '../services/caepi/repositorio.js'
import { sincronizar } from '../services/caepi/sync.js'

// ============================================================
// Consulta ao espelho oficial do CAEPI.
//
// Todas as respostas carregam `dataReferencia` e o parecer de
// validade NAQUELA data — nunca "está válido hoje". A perícia
// trabalhista examina um período passado: um CA vencido em 2024
// valia normalmente em 2022, e é isso que precisa ir para o laudo.
//
// Sem `?em=`, a referência é hoje. É o padrão certo para quem está
// só conferindo um CA, e a resposta diz qual data foi usada para o
// perito nunca ficar na dúvida.
// ============================================================

const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato aaaa-mm-dd.')

const consultaSchema = z.object({
  q: z.string().trim().max(120).optional(),
  numero: z.string().trim().max(20).optional(),
  categoria: z.string().trim().max(80).optional(),
  anexo: z.string().trim().max(20).optional(),
  auditivo: z.enum(['1', '0']).optional(),
  descontinuados: z.enum(['1', '0']).optional(),
  em: dataIso.optional(),
  limite: z.coerce.number().int().min(1).max(200).optional(),
})

const fichaSchema = z.object({
  em: dataIso.optional(),
  // O perito clicando "buscar de novo" depois de o portal ter caído.
  // Ignora o disjuntor, que existe para o caso automático.
  buscarNrrsf: z.enum(['forcar']).optional(),
})

const importacaoSchema = z.object({
  // O nome do arquivo é o que diz se veio comprimido — a mesma regra
  // do CLI. Cheirar os bytes seria pior: um .gz corrompido passaria
  // como texto puro em vez de estourar na cara de quem enviou.
  nome: z.string().trim().min(1).max(200),
})

const atenuacaoSchema = z.object({
  // null é apagar o valor. O front manda null quando o perito limpa
  // o campo, e apagar precisa ser possível — senão um erro de
  // digitação fica gravado para sempre.
  nrrsfDb: z.union([z.number(), z.string(), z.null()]),
  observacao: z.string().trim().max(500).nullish(),
})

function exigirNumeroCa(bruto: string): string {
  const numero = normalizarNumeroCa(bruto)
  if (!numero) throw new ErroHttp(400, 'Informe o número do CA (apenas dígitos).')
  return numero
}

export function criarCaepiRouter(
  repositorio: RepositorioCaepi = repositorioPrisma,
  buscador: Buscador = buscadorNrrsf,
  colheita: Colheita = colheitaNrrsf,
) {
  const caepiRouter = Router()
  caepiRouter.use(exigirSessao)

  // Quando o espelho foi atualizado pela última vez e o que tem dentro.
  //
  // Vai junto o estado da colheita de NRRsf. Sem isso, "faltam 300
  // protetores sem atenuação" é indistinguível de "a varredura está
  // parada há uma semana" — e a diferença entre as duas é justamente o
  // que decide se o perito espera ou se preenche na mão.
  caepiRouter.get(
    '/status',
    rota(async (_req, res) => {
      res.json({ ...(await repositorio.status(hojeIso())), colheitaNrrsf: colheita.situacao() })
    }),
  )

  // Carga da base a partir do arquivo do MTE, enviado pelo painel.
  //
  // Existe porque o download automático não é confiável: o portal fica
  // atrás do Cloudflare e responde com desafio de navegador. Em vez de
  // depender de alguém com acesso ao servidor rodando um script, quem
  // tem o arquivo sobe por aqui e o resto é igual ao do CLI — mesmo
  // descompressor, mesmo parser, mesmo histórico de sincronização.
  //
  // O corpo é o arquivo cru, em fluxo. Nada de multipart: são 21 MB
  // que não têm por que passar por buffer intermediário.
  caepiRouter.post(
    '/importar',
    exigirPerfil('admin'),
    rota(async (req, res) => {
      const { nome } = importacaoSchema.parse(req.query)
      if (!/\.(csv|gz)$/i.test(nome)) {
        throw new ErroHttp(422, 'Envie o arquivo .csv ou .csv.gz baixado do portal do MTE.')
      }

      const resultado = await sincronizar({
        fonte: descomprimirCsvCaepi(req, pareceComprimido(nome)),
        origem: `painel:${sessaoDe(req).email}`,
      }).catch((erro: unknown) => {
        const detalhe = erro instanceof Error ? erro.message : String(erro)
        throw new ErroHttp(422, `Não foi possível ler o arquivo do MTE. ${detalhe}`)
      })

      res.json({
        id: resultado.id,
        linhasLidas: resultado.linhasLidas,
        registros: resultado.registros,
        novos: resultado.novos,
        atualizados: resultado.atualizados,
        linhasIgnoradas: resultado.linhasIgnoradas,
      })
    }),
  )

  // Busca por texto (marca, referência, fabricante, descrição) e filtros.
  caepiRouter.get(
    '/cas',
    rota(async (req, res) => {
      const filtros = consultaSchema.parse(req.query)
      const dataReferencia = filtros.em ?? hojeIso()

      const encontrados = await repositorio.buscar({
        ...(filtros.q ? { termo: filtros.q } : {}),
        ...(filtros.numero ? { numeroCa: normalizarNumeroCa(filtros.numero) ?? filtros.numero } : {}),
        ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
        ...(filtros.anexo ? { anexo: filtros.anexo } : {}),
        ...(filtros.auditivo ? { auditivo: filtros.auditivo === '1' } : {}),
        incluirDescontinuados: filtros.descontinuados === '1',
        dataReferencia,
        limite: filtros.limite ?? 30,
      })

      res.json({
        dataReferencia,
        total: encontrados.length,
        itens: encontrados.map((registro) => ({
          ...avaliar(registro, dataReferencia),
          nrrsfDb: registro.nrrsfDb ?? null,
          fonteNrrsf: registro.fonteNrrsf ?? null,
        })),
      })
    }),
  )

  // Ficha completa de um CA: todas as homologações + atenuação.
  //
  // Quando é protetor auditivo e o NRRsf ainda não está no espelho, a
  // ficha individual do MTE é buscada aqui mesmo — é a única fonte do
  // valor, e deixar isso para um lote manual significava, na prática,
  // o perito ir buscar o certificado no site do Ministério à mão.
  caepiRouter.get(
    '/cas/:numero',
    rota(async (req, res) => {
      const numeroCa = exigirNumeroCa(parametro(req, 'numero'))
      const { em, buscarNrrsf } = fichaSchema.parse(req.query)
      const dataReferencia = em ?? hojeIso()

      const homologacoes = await repositorio.homologacoesDe(numeroCa)
      if (!homologacoes.length) {
        throw new ErroHttp(
          404,
          `CA ${numeroCa} não consta na base oficial do MTE. Confira o número ou informe o EPI manualmente.`,
        )
      }

      let atenuacao = await repositorio.atenuacaoDe(numeroCa)
      const exigeNrrsf = homologacoes.some((registro) => registro.exigeNrrsf)

      // Só protetor auditivo tem NRRsf, e valor do perito nunca é
      // trocado pelo da ficha — por isso a busca só entra quando falta.
      let buscaNrrsf: EstadoBuscaNrrsf | null = null
      if (exigeNrrsf) {
        if (atenuacao?.nrrsfDb != null && buscarNrrsf !== 'forcar') {
          buscaNrrsf = 'ja_tinha'
        } else {
          buscaNrrsf = (await buscador.garantir(numeroCa, buscarNrrsf === 'forcar')).estado
          if (buscaNrrsf === 'encontrado') atenuacao = await repositorio.atenuacaoDe(numeroCa)
        }
      }

      res.json({
        numeroCa,
        dataReferencia,
        exigeNrrsf,
        // O que aconteceu com a busca automática. O front usa para
        // dizer se vale esperar ou se é caso de digitar o valor.
        buscaNrrsf,
        // Mais de uma homologação = o CA foi renovado com validades
        // diferentes. O front avisa, porque muda a resposta do laudo.
        temHistorico: homologacoes.length > 1,
        vigente: escolherHomologacao(homologacoes, dataReferencia),
        homologacoes: homologacoes.map((registro) => avaliar(registro, dataReferencia)),
        atenuacao: atenuacao
          ? {
              nrrsfDb: atenuacao.nrrsfDb,
              fonte: atenuacao.fonte,
              bandas: atenuacao.bandas ?? null,
              observacao: atenuacao.observacao,
              fichaConsultadaEm: atenuacao.fichaConsultadaEm,
            }
          : null,
      })
    }),
  )

  // NRRsf preenchido pelo perito. Gravado com fonte PERITO, que é o
  // que faz a sincronização do MTE nunca sobrescrever este valor.
  caepiRouter.patch(
    '/cas/:numero/atenuacao',
    rota(async (req, res) => {
      const numeroCa = exigirNumeroCa(parametro(req, 'numero'))
      const corpo = atenuacaoSchema.parse(req.body)

      let nrrsfDb: number | null = null
      if (corpo.nrrsfDb !== null && String(corpo.nrrsfDb).trim() !== '') {
        // Mesmo normalizador da ficha do MTE: aceita "17", "17 dB",
        // "5,1" e recusa fora da faixa de 0 a 50 dB.
        nrrsfDb = normalizarNrrsf(String(corpo.nrrsfDb))
        if (nrrsfDb == null) {
          throw new ErroHttp(422, 'Informe o NRRsf em dB, entre 0 e 50. Ex.: 17 ou 21,5.')
        }
      }

      const homologacoes = await repositorio.homologacoesDe(numeroCa)
      if (!homologacoes.length) {
        throw new ErroHttp(404, `CA ${numeroCa} não consta na base oficial do MTE.`)
      }

      const salvo = await repositorio.salvarAtenuacao(numeroCa, {
        nrrsfDb,
        observacao: corpo.observacao?.trim() || null,
      })

      res.json({
        numeroCa,
        nrrsfDb: salvo.nrrsfDb,
        fonte: salvo.fonte,
        observacao: salvo.observacao,
        atualizadoEm: salvo.atualizadoEm,
      })
    }),
  )

  return caepiRouter
}

export const caepiRouter = criarCaepiRouter()
