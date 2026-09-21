import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao, sessaoDe } from '../auth.js'
import { ErroHttp, naoEncontrado, parametro, rota } from '../erros.js'
import { urlDaFoto } from '../mappers.js'
import { prisma } from '../prisma.js'
import { LIMITE_FOTOS_POR_ENVIO } from '../limites.js'
import { apagarUpload, uploadImagens } from '../services/armazenamento.js'

// ============================================================
// MÓDULO E — Relatório fotográfico
// As fotos ficam no volume de uploads e são referenciadas pela
// perícia. Substitui o URL.createObjectURL da fase mock, que
// morria a cada reload.
// ============================================================

/**
 * O POST desta rota pode carregar um multipart grande. Se a sessão for
 * rejeitada aqui — antes do multer sequer começar a ler o corpo — e o
 * servidor responder sem consumir o resto do envio, o SO costuma fechar o
 * socket com RST em vez de FIN enquanto o navegador ainda está enviando
 * bytes: o fetch() no perito via isso como falha de rede genérica, não como
 * "sessão expirada". Drenar o corpo (sem processá-lo — nada chega a tocar o
 * disco, o multer nunca roda) resolve isso sem abrir mão de checar a sessão
 * antes do multer.
 */
export function exigirSessaoDrenandoUpload(req: Request, res: Response, next: NextFunction): void {
  exigirSessao(req, res, (erro?: unknown) => {
    if (erro) {
      req.resume()
      req.on('error', () => undefined)
    }
    next(erro)
  })
}

export const fotosRouter = Router({ mergeParams: true })
fotosRouter.use(exigirSessaoDrenandoUpload)

// 'epi' saiu das opções (pedido do cliente: ficou redundante com
// 'documentos'), mas continua reconhecida em SecaoFoto para não invalidar
// fotos já gravadas — só não é mais um destino válido de novo envio. Um front
// desatualizado que ainda a ofereça cai no safeParse abaixo.
const secoes = z.enum(['ambiente', 'atividades', 'equipamentos', 'produtos', 'documentos'])

/** Confirma que a foto não pode ser vinculada a um agente de outra perícia. */
export function agentePertenceAoTecnico(tecnico: unknown, agenteId: string): boolean {
  if (!tecnico || typeof tecnico !== 'object' || Array.isArray(tecnico)) return false
  const agentes = (tecnico as { agentes?: unknown }).agentes
  return Array.isArray(agentes) && agentes.some((agente) =>
    Boolean(agente && typeof agente === 'object' && (agente as { id?: unknown }).id === agenteId),
  )
}

/** POST /pericias/:periciaId/fotos — multipart, campo "fotos". */
fotosRouter.post(
  '/',
  uploadImagens.array('fotos', LIMITE_FOTOS_POR_ENVIO),
  rota(async (req, res) => {
    const periciaId = parametro(req, 'periciaId')
    const arquivos = (req.files as Express.Multer.File[] | undefined) ?? []

    if (!arquivos.length) throw new ErroHttp(400, 'Nenhuma imagem enviada.')

    // Só a perícia da própria equipe: subir foto na de outra equipe é 404.
    const pericia = await prisma.pericia.findFirst({
      where: { id: periciaId, organizacaoId: sessaoDe(req).organizacaoId },
    })
    if (!pericia) {
      await Promise.all(arquivos.map((a) => apagarUpload(a.filename)))
      throw naoEncontrado('Perícia')
    }

    // safeParse, não parse: um front desatualizado pode mandar uma seção que
    // não existe mais. Sem o cleanup abaixo, os arquivos que o multer já
    // gravou no disco ficavam órfãos — o INSERT nunca chegava a rodar, então
    // nenhuma foto no banco apontava pra eles, mas o volume nunca esvaziava.
    const resultadoSecao = secoes.safeParse(req.body.secao ?? 'ambiente')
    if (!resultadoSecao.success) {
      await Promise.all(arquivos.map((a) => apagarUpload(a.filename)))
      throw new ErroHttp(400, 'Seção de foto inválida.')
    }
    const secao = resultadoSecao.data
    const agenteId = typeof req.body.agenteId === 'string' && req.body.agenteId.trim()
      ? req.body.agenteId.trim()
      : undefined
    if (agenteId && !agentePertenceAoTecnico(pericia.tecnico, agenteId)) {
      await Promise.all(arquivos.map((a) => apagarUpload(a.filename)))
      throw new ErroHttp(422, 'O agente informado não pertence a esta perícia.')
    }

    // Maior `ordem` da PERÍCIA, não da seção nem a contagem de fotos: `ordem` é
    // lida globalmente em routes/pericias.ts e os renderizadores desempatam por
    // ela. Contando por seção, a 1ª foto de "Ambiente" e a 1ª de "EPIs"
    // empatavam em ordem 1; contando fotos, apagar uma do meio fazia a próxima
    // repetir a ordem de uma que ficou (ex.: ordens 1, 3 → count 2 → nova = 3).
    const { _max } = await prisma.foto.aggregate({ where: { periciaId }, _max: { ordem: true } })
    const ultimaOrdem = _max.ordem ?? 0

    // Se o INSERT falhar, os arquivos ja estao no disco: sem esta limpeza
    // eles ficariam ocupando o volume para sempre, sem nenhuma foto no
    // banco apontando para eles.
    let criadas
    try {
      criadas = await prisma.$transaction(
        arquivos.map((arquivo, i) =>
          prisma.foto.create({
            data: {
              periciaId,
              secao,
              agenteId,
              arquivo: arquivo.filename,
              legenda: arquivo.originalname.replace(/\.[^.]+$/, ''),
              ordem: ultimaOrdem + i + 1,
            },
          }),
        ),
      )
    } catch (e) {
      await Promise.all(arquivos.map((a) => apagarUpload(a.filename)))
      throw e
    }

    res.status(201).json(
      criadas.map((f) => ({
        id: f.id,
        secao: f.secao,
        agenteId: f.agenteId ?? undefined,
        url: urlDaFoto(f.arquivo),
        legenda: f.legenda,
        ordem: f.ordem,
      })),
    )
  }),
)

/** DELETE /pericias/:periciaId/fotos/:id */
fotosRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const foto = await prisma.foto.findFirst({
      where: {
        id: parametro(req, 'id'),
        periciaId: parametro(req, 'periciaId'),
        pericia: { organizacaoId: sessaoDe(req).organizacaoId },
      },
    })
    if (!foto) throw naoEncontrado('Foto')

    await prisma.foto.delete({ where: { id: foto.id } })
    await apagarUpload(foto.arquivo)

    res.status(204).end()
  }),
)
