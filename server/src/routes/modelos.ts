import { Router } from 'express'
import { z } from 'zod'
import { exigirPerfil, exigirSessao } from '../auth.js'
import { parametro, rota } from '../erros.js'
import { prisma } from '../prisma.js'

// ============================================================
// MÓDULO H — Modelos de documento (estruturas base).
// ============================================================

export const modelosRouter = Router()
modelosRouter.use(exigirSessao)

const corpo = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(1, 'Informe o nome do modelo.'),
  tipo: z.enum(['parecer', 'laudo', 'quesitos', 'manifestacao', 'impugnacao', 'esclarecimento']),
  secoes: z.number().int().min(0).default(0),
})

/** GET /modelos */
modelosRouter.get(
  '/',
  rota(async (_req, res) => {
    const modelos = await prisma.modeloDocumento.findMany({ orderBy: { nome: 'asc' } })
    res.json(
      modelos.map((m) => ({
        id: m.id,
        nome: m.nome,
        tipo: m.tipo,
        secoes: m.secoes,
        atualizado: m.atualizadoEm.toISOString().slice(0, 10),
      })),
    )
  }),
)

/** POST /modelos — upsert, restrito ao administrador. */
modelosRouter.post(
  '/',
  exigirPerfil('admin'),
  rota(async (req, res) => {
    const d = corpo.parse(req.body)

    const existente = d.id
      ? await prisma.modeloDocumento.findUnique({ where: { id: d.id } })
      : null

    const dados = { nome: d.nome, tipo: d.tipo, secoes: d.secoes }

    const modelo = existente
      ? await prisma.modeloDocumento.update({ where: { id: existente.id }, data: dados })
      : await prisma.modeloDocumento.create({ data: dados })

    res.status(existente ? 200 : 201).json({
      id: modelo.id,
      nome: modelo.nome,
      tipo: modelo.tipo,
      secoes: modelo.secoes,
      atualizado: modelo.atualizadoEm.toISOString().slice(0, 10),
    })
  }),
)

/** DELETE /modelos/:id */
modelosRouter.delete(
  '/:id',
  exigirPerfil('admin'),
  rota(async (req, res) => {
    await prisma.modeloDocumento.delete({ where: { id: parametro(req, 'id') } })
    res.status(204).end()
  }),
)
