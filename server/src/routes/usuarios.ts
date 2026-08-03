import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { exigirPerfil, exigirSessao, sessaoDe } from '../auth.js'
import { ErroHttp, parametro, rota, semPermissao } from '../erros.js'
import { usuarioParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'

export const usuariosRouter = Router()
usuariosRouter.use(exigirSessao)

const perfis = z.enum(['admin', 'perito', 'assistente'])

const corpo = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(1, 'Informe o nome.'),
  email: z.string().email('E-mail inválido.'),
  perfil: perfis,
  registroProfissional: z.string().optional(),
  titulo: z.string().optional(),
  telefone: z.string().optional(),
  ativo: z.boolean().default(true),
  /// Só usada na criação; a troca posterior é feita em POST /auth/senha.
  senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').optional(),
})

/** GET /usuarios */
usuariosRouter.get(
  '/',
  rota(async (_req, res) => {
    const usuarios = await prisma.usuario.findMany({ orderBy: { nome: 'asc' } })
    res.json(usuarios.map(usuarioParaApi))
  }),
)

/**
 * POST /usuarios — upsert.
 *
 * Cada usuário pode editar o próprio cadastro; criar outros,
 * mudar perfil ou ativar/desativar é exclusivo do administrador.
 */
usuariosRouter.post(
  '/',
  rota(async (req, res) => {
    const dados = corpo.parse(req.body)
    const sessao = sessaoDe(req)
    const ehAdmin = sessao.perfil === 'admin'
    const ehProprio = dados.id === sessao.id

    if (!ehAdmin && !ehProprio) {
      throw semPermissao('Somente o administrador pode gerenciar outros usuários.')
    }

    const existente = dados.id
      ? await prisma.usuario.findUnique({ where: { id: dados.id } })
      : null

    // ---------- Criação ----------
    if (!existente) {
      if (!ehAdmin) throw semPermissao('Somente o administrador pode cadastrar usuários.')
      if (!dados.senha) {
        throw new ErroHttp(422, 'Informe uma senha inicial de pelo menos 8 caracteres.')
      }

      const criado = await prisma.usuario.create({
        data: {
          nome: dados.nome,
          email: dados.email.toLowerCase(),
          senhaHash: await bcrypt.hash(dados.senha, 12),
          perfil: dados.perfil,
          registroProfissional: dados.registroProfissional || null,
          titulo: dados.titulo || null,
          telefone: dados.telefone || null,
          ativo: dados.ativo,
        },
      })
      res.status(201).json(usuarioParaApi(criado))
      return
    }

    // ---------- Atualização ----------
    // Um não-admin não escala o próprio perfil nem se reativa.
    const camposRestritos = ehAdmin
      ? { perfil: dados.perfil, ativo: dados.ativo, email: dados.email.toLowerCase() }
      : {}

    if (ehAdmin && existente.id === sessao.id && (!dados.ativo || dados.perfil !== 'admin')) {
      throw new ErroHttp(
        400,
        'Você não pode remover o próprio acesso de administrador. Peça a outro administrador.',
      )
    }

    const atualizado = await prisma.usuario.update({
      where: { id: existente.id },
      data: {
        nome: dados.nome,
        registroProfissional: dados.registroProfissional || null,
        titulo: dados.titulo || null,
        telefone: dados.telefone || null,
        ...camposRestritos,
      },
    })

    res.json(usuarioParaApi(atualizado))
  }),
)

/** POST /usuarios/:id/senha — administrador redefine a senha de alguém. */
usuariosRouter.post(
  '/:id/senha',
  exigirPerfil('admin'),
  rota(async (req, res) => {
    const { nova } = z
      .object({ nova: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.') })
      .parse(req.body)

    await prisma.usuario.update({
      where: { id: parametro(req, 'id') },
      data: { senhaHash: await bcrypt.hash(nova, 12) },
    })

    res.status(204).end()
  }),
)
