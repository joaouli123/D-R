import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { exigirPerfil, exigirSessao, sessaoDe } from '../auth.js'
import { ErroHttp, naoEncontrado, parametro, rota, semPermissao } from '../erros.js'
import { usuarioParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'
import { apagarUpload, gravarUpload, uploadAssinatura, uploadLogo } from '../services/armazenamento.js'
import { processarAssinatura } from '../services/assinatura-perito.js'

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

// ---------------- logo do perito (white-label) ----------------

/**
 * Quem pode mexer na logo de quem.
 *
 * A logo sai no cabeçalho de um documento assinado — trocar a de outra
 * pessoa é assinar com a marca dela. Vale a mesma regra do cadastro: cada um
 * cuida da própria, o administrador cuida de todas.
 */
async function usuarioQuePodeEditar(req: Parameters<typeof exigirSessao>[0], oQue = 'a logo') {
  const id = parametro(req, 'id')
  const sessao = sessaoDe(req)
  if (sessao.perfil !== 'admin' && sessao.id !== id) {
    throw semPermissao(`Somente o administrador pode trocar ${oQue} de outro usuário.`)
  }
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) throw naoEncontrado('Usuário')
  return usuario
}

/** POST /usuarios/:id/logo — multipart, campo "logo". */
usuariosRouter.post(
  '/:id/logo',
  uploadLogo.single('logo'),
  rota(async (req, res) => {
    const arquivo = req.file
    if (!arquivo) throw new ErroHttp(400, 'Nenhuma imagem enviada.')

    let usuario
    try {
      usuario = await usuarioQuePodeEditar(req)
    } catch (e) {
      // O multer já gravou no volume antes de a rota rodar. Sem esta limpeza,
      // toda tentativa barrada deixaria um arquivo órfão ocupando o disco.
      await apagarUpload(arquivo.filename)
      throw e
    }

    const anterior = usuario.logoArquivo
    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { logoArquivo: arquivo.filename },
    })

    // Só depois de o banco confirmar: se o UPDATE falhasse antes, o perito
    // ficaria sem logo nenhuma — a antiga apagada e a nova sem referência.
    await apagarUpload(anterior)

    res.status(201).json(usuarioParaApi(atualizado))
  }),
)

/** DELETE /usuarios/:id/logo — volta à arte embutida do sistema. */
usuariosRouter.delete(
  '/:id/logo',
  rota(async (req, res) => {
    const usuario = await usuarioQuePodeEditar(req)

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { logoArquivo: null },
    })
    await apagarUpload(usuario.logoArquivo)

    res.json(usuarioParaApi(atualizado))
  }),
)

// ---------------- assinatura manuscrita do perito ----------------

/**
 * POST /usuarios/:id/assinatura — multipart, campo "assinatura".
 *
 * Recebe a FOTO da assinatura feita em papel e grava só o PNG tratado
 * (recortado, fundo transparente). A foto original fica na memória e morre
 * com a requisição. Assinatura é mais sensível que a logo: a mesma regra de
 * quem pode editar, e nenhuma cópia a mais no disco.
 */
usuariosRouter.post(
  '/:id/assinatura',
  uploadAssinatura.single('assinatura'),
  rota(async (req, res) => {
    const arquivo = req.file
    if (!arquivo?.buffer?.length) throw new ErroHttp(400, 'Nenhuma imagem enviada.')

    const usuario = await usuarioQuePodeEditar(req, 'a assinatura')
    const png = await processarAssinatura(arquivo.buffer)
    const nome = await gravarUpload(png, 'image/png')

    const anterior = usuario.assinaturaArquivo
    let atualizado
    try {
      atualizado = await prisma.usuario.update({
        where: { id: usuario.id },
        data: { assinaturaArquivo: nome },
      })
    } catch (e) {
      await apagarUpload(nome)
      throw e
    }

    // Só depois de o banco confirmar, como na logo.
    await apagarUpload(anterior)

    res.status(201).json(usuarioParaApi(atualizado))
  }),
)

/** DELETE /usuarios/:id/assinatura — o documento volta a sair só com a linha. */
usuariosRouter.delete(
  '/:id/assinatura',
  rota(async (req, res) => {
    const usuario = await usuarioQuePodeEditar(req, 'a assinatura')

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { assinaturaArquivo: null },
    })
    await apagarUpload(usuario.assinaturaArquivo)

    res.json(usuarioParaApi(atualizado))
  }),
)
