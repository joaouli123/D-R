import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao } from '../auth.js'
import { ErroHttp, naoEncontrado, parametro, rota } from '../erros.js'
import { urlDaFoto } from '../mappers.js'
import { prisma } from '../prisma.js'
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
  uploadImagens.array('fotos', 30),
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

    const jaExistem = await prisma.foto.count({ where: { periciaId, secao } })

    const criadas = await prisma.$transaction(
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
