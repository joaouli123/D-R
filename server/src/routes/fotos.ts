import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao } from '../auth.js'
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

export const fotosRouter = Router({ mergeParams: true })
fotosRouter.use(exigirSessao)

const secoes = z.enum(['ambiente', 'atividades', 'equipamentos', 'epi', 'produtos', 'documentos'])

/** POST /pericias/:periciaId/fotos — multipart, campo "fotos". */
fotosRouter.post(
  '/',
  uploadImagens.array('fotos', LIMITE_FOTOS_POR_ENVIO),
  rota(async (req, res) => {
    const periciaId = parametro(req, 'periciaId')
    const arquivos = (req.files as Express.Multer.File[] | undefined) ?? []

    if (!arquivos.length) throw new ErroHttp(400, 'Nenhuma imagem enviada.')

    const pericia = await prisma.pericia.findUnique({ where: { id: periciaId } })
    if (!pericia) {
      await Promise.all(arquivos.map((a) => apagarUpload(a.filename)))
      throw naoEncontrado('Perícia')
    }

    const secao = secoes.parse(req.body.secao ?? 'ambiente')

    // Contagem por PERÍCIA, não por seção: `ordem` é lida globalmente em
    // routes/pericias.ts e os três renderizadores numeram "Fotografia N" na
    // sequência global. Contando por seção, a 1ª foto de "Ambiente" e a 1ª de
    // "EPIs" empatavam em ordem 1 e a legenda saía fora de sequência.
    const jaExistem = await prisma.foto.count({ where: { periciaId } })

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
              arquivo: arquivo.filename,
              legenda: arquivo.originalname.replace(/\.[^.]+$/, ''),
              ordem: jaExistem + i + 1,
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
      where: { id: parametro(req, 'id'), periciaId: parametro(req, 'periciaId') },
    })
    if (!foto) throw naoEncontrado('Foto')

    await prisma.foto.delete({ where: { id: foto.id } })
    await apagarUpload(foto.arquivo)

    res.status(204).end()
  }),
)
