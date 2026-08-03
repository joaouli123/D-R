import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao, sessaoDe } from '../auth.js'
import { naoEncontrado, parametro, rota } from '../erros.js'
import { prisma } from '../prisma.js'

// ============================================================
// Agenda — vistorias, prazos e audiências do perito logado.
// ============================================================

export const agendaRouter = Router()
agendaRouter.use(exigirSessao)

const corpo = z.object({
  id: z.string().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.'),
  hora: z.string().default(''),
  titulo: z.string().trim().min(1, 'Informe o título do compromisso.'),
  local: z.string().default(''),
  processo: z.string().optional(),
  tipo: z.enum(['vistoria', 'prazo', 'audiencia']).default('vistoria'),
})

const paraApi = (c: {
  id: string
  data: string
  hora: string
  titulo: string
  local: string
  processo: string | null
  tipo: string
}) => ({
  id: c.id,
  data: c.data,
  hora: c.hora,
  titulo: c.titulo,
  local: c.local,
  processo: c.processo ?? '',
  tipo: c.tipo,
})

/** GET /agenda */
agendaRouter.get(
  '/',
  rota(async (req, res) => {
    const compromissos = await prisma.compromisso.findMany({
      where: { usuarioId: sessaoDe(req).id },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    })
    res.json(compromissos.map(paraApi))
  }),
)

/** POST /agenda — upsert. */
agendaRouter.post(
  '/',
  rota(async (req, res) => {
    const d = corpo.parse(req.body)
    const usuarioId = sessaoDe(req).id

    const existente = d.id
      ? await prisma.compromisso.findFirst({ where: { id: d.id, usuarioId } })
      : null

    const dados = {
      data: d.data,
      hora: d.hora,
      titulo: d.titulo,
      local: d.local,
      processo: d.processo?.trim() || null,
      tipo: d.tipo,
    }

    const compromisso = existente
      ? await prisma.compromisso.update({ where: { id: existente.id }, data: dados })
      : await prisma.compromisso.create({ data: { ...dados, usuarioId } })

    res.status(existente ? 200 : 201).json(paraApi(compromisso))
  }),
)

/** DELETE /agenda/:id */
agendaRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const { count } = await prisma.compromisso.deleteMany({
      where: { id: parametro(req, 'id'), usuarioId: sessaoDe(req).id },
    })
    if (!count) throw naoEncontrado('Compromisso')
    res.status(204).end()
  }),
)
