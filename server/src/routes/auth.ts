import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { emitirSessao, encerrarSessao, exigirSessao, sessaoDe } from '../auth.js'
import { ErroHttp, naoAutorizado, rota } from '../erros.js'
import { usuarioParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'

export const authRouter = Router()

const credenciais = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe a senha.'),
})

/**
 * POST /auth/login
 * Responde com o usuário e grava o cookie de sessão.
 * A mensagem de erro é a mesma para e-mail inexistente e senha
 * errada — não confirmamos quais e-mails existem na base.
 */
authRouter.post(
  '/login',
  rota(async (req, res) => {
    const { email, senha } = credenciais.parse(req.body)

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    })

    const invalido = naoAutorizado('E-mail ou senha inválidos.')
    if (!usuario) {
      // Gasta o mesmo tempo do caminho feliz para não vazar a
      // existência do e-mail pela diferença de latência.
      await bcrypt.compare(senha, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
      throw invalido
    }
    if (!(await bcrypt.compare(senha, usuario.senhaHash))) throw invalido
    if (!usuario.ativo) {
      throw new ErroHttp(403, 'Este usuário está inativo. Procure o administrador.')
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcesso: new Date() },
    })

    emitirSessao(res, { id: usuario.id, email: usuario.email, perfil: usuario.perfil })
    res.json(usuarioParaApi(atualizado))
  }),
)

/** POST /auth/logout */
authRouter.post('/logout', (_req, res) => {
  encerrarSessao(res)
  res.status(204).end()
})

/**
 * GET /auth/eu
 * Restaura a sessão no boot do frontend, sem depender de storage
 * do navegador. Responde 401 quando não há cookie válido.
 */
authRouter.get(
  '/eu',
  exigirSessao,
  rota(async (req, res) => {
    const { id } = sessaoDe(req)
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario || !usuario.ativo) {
      encerrarSessao(res)
      throw naoAutorizado()
    }
    res.json(usuarioParaApi(usuario))
  }),
)

/** POST /auth/senha — troca da própria senha. */
authRouter.post(
  '/senha',
  exigirSessao,
  rota(async (req, res) => {
    const { atual, nova } = z
      .object({
        atual: z.string().min(1, 'Informe a senha atual.'),
        nova: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
      })
      .parse(req.body)

    const { id } = sessaoDe(req)
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id } })

    if (!(await bcrypt.compare(atual, usuario.senhaHash))) {
      throw new ErroHttp(400, 'Senha atual incorreta.')
    }

    await prisma.usuario.update({
      where: { id },
      data: { senhaHash: await bcrypt.hash(nova, 12) },
    })

    res.status(204).end()
  }),
)
