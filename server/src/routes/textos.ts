import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao, sessaoDe } from '../auth.js'
import { naoEncontrado, parametro, rota } from '../erros.js'
import { textoParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'

// ============================================================
// MÓDULO F — Biblioteca pessoal de textos.
// Cada perito enxerga e edita apenas os próprios textos.
// ============================================================

export const textosRouter = Router()
textosRouter.use(exigirSessao)

const corpo = z.object({
  id: z.string().optional(),
  titulo: z.string().trim().min(1, 'Informe o título.'),
  secao: z
    .enum([
      'apresentacao',
      'objetivo',
      'empresa',
      'ambiente',
      'atividades',
      'analise',
      'conclusao',
      'manifestacao',
      'impugnacao',
      'esclarecimento',
      'generico',
    ])
    .default('generico'),
  tags: z.array(z.string().trim()).default([]),
  conteudo: z.string().trim().min(1, 'O texto não pode ficar vazio.'),
  favorito: z.boolean().default(false),
  usos: z.number().int().min(0).default(0),
})

/** GET /textos */
textosRouter.get(
  '/',
  rota(async (req, res) => {
    const textos = await prisma.textoBiblioteca.findMany({
      where: { usuarioId: sessaoDe(req).id },
      orderBy: [{ favorito: 'desc' }, { usos: 'desc' }, { titulo: 'asc' }],
    })
    res.json(textos.map(textoParaApi))
  }),
)

/** POST /textos — upsert restrito ao dono. */
textosRouter.post(
  '/',
  rota(async (req, res) => {
    const d = corpo.parse(req.body)
    const usuarioId = sessaoDe(req).id

    const existente = d.id
      ? await prisma.textoBiblioteca.findFirst({ where: { id: d.id, usuarioId } })
      : null

    const dados = {
      titulo: d.titulo,
      secao: d.secao,
      tags: d.tags.filter(Boolean),
      conteudo: d.conteudo,
      favorito: d.favorito,
      usos: d.usos,
    }

    const texto = existente
      ? await prisma.textoBiblioteca.update({ where: { id: existente.id }, data: dados })
      : await prisma.textoBiblioteca.create({ data: { ...dados, usuarioId } })

    res.status(existente ? 200 : 201).json(textoParaApi(texto))
  }),
)

/** POST /textos/:id/uso — registra reaproveitamento (alimenta os relatórios). */
textosRouter.post(
  '/:id/uso',
  rota(async (req, res) => {
    const usuarioId = sessaoDe(req).id
    const { count } = await prisma.textoBiblioteca.updateMany({
      where: { id: parametro(req, 'id'), usuarioId },
      data: { usos: { increment: 1 } },
    })
    if (!count) throw naoEncontrado('Texto')
    res.status(204).end()
  }),
)

/** DELETE /textos/:id */
textosRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const { count } = await prisma.textoBiblioteca.deleteMany({
      where: { id: parametro(req, 'id'), usuarioId: sessaoDe(req).id },
    })
    if (!count) throw naoEncontrado('Texto')
    res.status(204).end()
  }),
)
