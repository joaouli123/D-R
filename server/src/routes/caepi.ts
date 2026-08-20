import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao } from '../auth.js'
import { ErroHttp, parametro, rota } from '../erros.js'
import { avaliar, escolherHomologacao, hojeIso } from '../services/caepi/consulta.js'
import { normalizarNumeroCa, normalizarNrrsf } from '../services/caepi/normalizar.js'
import { repositorioPrisma, type RepositorioCaepi } from '../services/caepi/repositorio.js'

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

const referenciaSchema = z.object({ em: dataIso.optional() })

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

export function criarCaepiRouter(repositorio: RepositorioCaepi = repositorioPrisma) {
  const caepiRouter = Router()
  caepiRouter.use(exigirSessao)

  // Quando o espelho foi atualizado pela última vez e o que tem dentro.
  caepiRouter.get(
    '/status',
    rota(async (_req, res) => {
      res.json(await repositorio.status(hojeIso()))
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
  caepiRouter.get(
    '/cas/:numero',
    rota(async (req, res) => {
      const numeroCa = exigirNumeroCa(parametro(req, 'numero'))
      const { em } = referenciaSchema.parse(req.query)
      const dataReferencia = em ?? hojeIso()

      const homologacoes = await repositorio.homologacoesDe(numeroCa)
      if (!homologacoes.length) {
        throw new ErroHttp(
          404,
          `CA ${numeroCa} não consta na base oficial do MTE. Confira o número ou informe o EPI manualmente.`,
        )
      }

      const atenuacao = await repositorio.atenuacaoDe(numeroCa)
      const exigeNrrsf = homologacoes.some((registro) => registro.exigeNrrsf)

      res.json({
        numeroCa,
        dataReferencia,
        exigeNrrsf,
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
