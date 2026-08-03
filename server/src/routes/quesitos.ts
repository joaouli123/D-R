import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao, sessaoDe } from '../auth.js'
import { naoEncontrado, parametro, rota, semPermissao } from '../erros.js'
import { quesitoParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'

// ============================================================
// MÓDULO K — Quesitos técnicos (item 17).
//
// A lista devolvida junta o banco global (usuarioId null, os 39
// pré-cadastrados) com os quesitos próprios do perito logado.
// ============================================================

export const quesitosRouter = Router()
quesitosRouter.use(exigirSessao)

const corpo = z.object({
  id: z.string().optional(),
  codigo: z.string().trim().optional(),
  tema: z.enum([
    'gerais',
    'insalubridade',
    'periculosidade',
    'ruido',
    'calor',
    'quimicos',
    'biologicos',
    'epi',
    'ergonomia',
    'eletricidade',
    'inflamaveis',
  ]),
  origem: z.enum(['juizo', 'reclamante', 'reclamada', 'proprio']),
  pergunta: z.string().trim().min(1, 'Informe a pergunta do quesito.'),
  respostaPadrao: z.string().default(''),
  favorito: z.boolean().default(false),
  usos: z.number().int().min(0).default(0),
  personalizado: z.boolean().default(true),
})

/** GET /quesitos */
quesitosRouter.get(
  '/',
  rota(async (req, res) => {
    const quesitos = await prisma.quesito.findMany({
      where: { OR: [{ usuarioId: null }, { usuarioId: sessaoDe(req).id }] },
      orderBy: [{ favorito: 'desc' }, { codigo: 'asc' }],
    })
    res.json(quesitos.map(quesitoParaApi))
  }),
)

/**
 * POST /quesitos — upsert.
 *
 * O banco global é compartilhado pelo escritório: qualquer perito
 * pode favoritar e ajustar a resposta padrão de um quesito global,
 * mas a pergunta em si só o administrador reescreve.
 */
quesitosRouter.post(
  '/',
  rota(async (req, res) => {
    const d = corpo.parse(req.body)
    const sessao = sessaoDe(req)

    const existente = d.id ? await prisma.quesito.findUnique({ where: { id: d.id } }) : null

    if (!existente) {
      const total = await prisma.quesito.count()
      const criado = await prisma.quesito.create({
        data: {
          ...(d.id ? { id: d.id } : {}),
          usuarioId: sessao.id,
          codigo: d.codigo?.trim() || `PER-${String(total + 1).padStart(3, '0')}`,
          tema: d.tema,
          origem: d.origem,
          pergunta: d.pergunta,
          respostaPadrao: d.respostaPadrao || null,
          favorito: d.favorito,
          usos: d.usos,
          personalizado: true,
        },
      })
      res.status(201).json(quesitoParaApi(criado))
      return
    }

    const ehGlobal = existente.usuarioId === null
    const ehDono = existente.usuarioId === sessao.id

    if (!ehGlobal && !ehDono) {
      throw semPermissao('Este quesito pertence a outro usuário.')
    }
    if (ehGlobal && sessao.perfil !== 'admin' && d.pergunta !== existente.pergunta) {
      throw semPermissao(
        'A pergunta dos quesitos do banco global só pode ser alterada pelo administrador. ' +
          'Cadastre um quesito próprio se precisar de outra redação.',
      )
    }

    const atualizado = await prisma.quesito.update({
      where: { id: existente.id },
      data: {
        tema: d.tema,
        origem: d.origem,
        pergunta: d.pergunta,
        respostaPadrao: d.respostaPadrao || null,
        favorito: d.favorito,
        usos: d.usos,
      },
    })

    res.json(quesitoParaApi(atualizado))
  }),
)

/** DELETE /quesitos/:id — apenas quesitos próprios. */
quesitosRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const { count } = await prisma.quesito.deleteMany({
      where: { id: parametro(req, 'id'), usuarioId: sessaoDe(req).id },
    })
    if (!count) {
      throw naoEncontrado('Quesito próprio')
    }
    res.status(204).end()
  }),
)
