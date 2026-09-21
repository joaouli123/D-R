import bcrypt from 'bcryptjs'
import type { Request } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { exigirPerfil, exigirSessao, sessaoDe, type Sessao } from '../auth.js'
import { equipesAlcancadas } from '../equipes.js'
import { ErroHttp, naoEncontrado, parametro, rota, semPermissao } from '../erros.js'
import { usuarioParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'
import { apagarUpload, gravarUpload, uploadAssinatura, uploadLogo } from '../services/armazenamento.js'
import { processarAssinatura } from '../services/assinatura-perito.js'

// ============================================================
// Usuários — multi-tenant.
//
// Cada usuário pertence a uma equipe (ver tenancy.ts). O administrador
// gere os usuários da PRÓPRIA equipe e os das equipes abaixo dela; nunca
// os da mãe, das irmãs ou de outra árvore. O que fica fora do alcance
// responde 404, não 403: quem não tem acesso não fica sabendo que o
// usuário existe.
// ============================================================

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
  /// Só na criação: a equipe onde o usuário nasce. Vazio = a equipe de quem
  /// cadastra. Depois de criado, o usuário não troca de equipe.
  organizacaoId: z.string().optional(),
  /// Só usada na criação; a troca posterior é feita em POST /auth/senha
  /// (a própria pessoa) ou POST /usuarios/:id/senha (o administrador).
  senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').optional(),
})

/**
 * As equipes cujos usuários a sessão enxerga: o administrador, a própria e as
 * de baixo; os demais perfis, só a própria.
 */
async function equipesVisiveis(sessao: Sessao): Promise<string[]> {
  return sessao.perfil === 'admin'
    ? equipesAlcancadas(sessao.organizacaoId)
    : [sessao.organizacaoId]
}

/** Carrega o usuário-alvo, tratando o que está fora do alcance como inexistente. */
async function carregarAlvo(sessao: Sessao, id: string) {
  const alvo = await prisma.usuario.findUnique({ where: { id } })
  if (!alvo || !(await equipesVisiveis(sessao)).includes(alvo.organizacaoId)) {
    throw naoEncontrado('Usuário')
  }
  return alvo
}

/** GET /usuarios — a equipe da sessão. A árvore inteira está em GET /equipes. */
usuariosRouter.get(
  '/',
  rota(async (req, res) => {
    const usuarios = await prisma.usuario.findMany({
      where: { organizacaoId: sessaoDe(req).organizacaoId },
      orderBy: { nome: 'asc' },
    })
    res.json(usuarios.map(usuarioParaApi))
  }),
)

/**
 * POST /usuarios — upsert.
 *
 * Cada usuário pode editar o próprio cadastro; criar outros, mudar perfil
 * ou ativar/desativar é exclusivo do administrador, dentro do seu alcance.
 */
usuariosRouter.post(
  '/',
  rota(async (req, res) => {
    const dados = corpo.parse(req.body)
    const sessao = sessaoDe(req)
    const ehAdmin = sessao.perfil === 'admin'

    const existente = dados.id ? await carregarAlvo(sessao, dados.id).catch(async (erro: unknown) => {
      // Um id desconhecido sempre virou criação (o id do cliente é ignorado);
      // mas um id que EXISTE e está fora do alcance nunca pode virar uma
      // criação silenciosa ao lado do usuário de outra equipe.
      if (erro instanceof ErroHttp && erro.status === 404) {
        const existeMasEstaLonge = await prisma.usuario.findUnique({
          where: { id: dados.id },
          select: { id: true },
        })
        if (existeMasEstaLonge) throw erro
        return null
      }
      throw erro
    }) : null

    // ---------- Criação ----------
    if (!existente) {
      if (!ehAdmin) throw semPermissao('Somente o administrador pode cadastrar usuários.')
      if (!dados.senha) {
        throw new ErroHttp(422, 'Informe uma senha inicial de pelo menos 8 caracteres.')
      }

      const organizacaoId = dados.organizacaoId ?? sessao.organizacaoId
      if (!(await equipesAlcancadas(sessao.organizacaoId)).includes(organizacaoId)) {
        throw semPermissao(
          'Você só pode cadastrar usuários na sua equipe ou nas equipes abaixo dela.',
        )
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
          organizacaoId,
        },
      })
      res.status(201).json(usuarioParaApi(criado))
      return
    }

    // ---------- Atualização ----------
    const ehProprio = existente.id === sessao.id
    if (!ehAdmin && !ehProprio) {
      throw semPermissao('Somente o administrador pode gerenciar outros usuários.')
    }
    if (dados.organizacaoId && dados.organizacaoId !== existente.organizacaoId) {
      throw new ErroHttp(422, 'Um usuário não muda de equipe depois de criado.')
    }

    // Um não-admin não escala o próprio perfil nem se reativa.
    const camposRestritos = ehAdmin
      ? { perfil: dados.perfil, ativo: dados.ativo, email: dados.email.toLowerCase() }
      : {}

    if (ehAdmin && ehProprio && (!dados.ativo || dados.perfil !== 'admin')) {
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

/** POST /usuarios/:id/senha — o administrador redefine a senha de alguém do seu alcance. */
usuariosRouter.post(
  '/:id/senha',
  exigirPerfil('admin'),
  rota(async (req, res) => {
    const { nova } = z
      .object({ nova: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.') })
      .parse(req.body)

    const alvo = await carregarAlvo(sessaoDe(req), parametro(req, 'id'))

    await prisma.usuario.update({
      where: { id: alvo.id },
      data: { senhaHash: await bcrypt.hash(nova, 12) },
    })

    res.status(204).end()
  }),
)

/**
 * DELETE /usuarios/:id — exclui de vez.
 *
 * Perícias e documentos apontam para o usuário (responsável e autor) e o banco
 * recusa apagá-lo enquanto houver algum. Nesse caso é preciso dizer quem
 * assume o trabalho (`?transferirPara=<id>`, alguém ATIVO da mesma equipe):
 * o documento passa a sair com a identidade de quem assumiu. Para só tirar o
 * acesso sem mexer em nada, o caminho é desativar, não excluir.
 *
 * Os textos da biblioteca e os quesitos próprios da pessoa vão junto (cascata
 * do banco) — são dela.
 */
usuariosRouter.delete(
  '/:id',
  exigirPerfil('admin'),
  rota(async (req, res) => {
    const sessao = sessaoDe(req)
    const alvo = await carregarAlvo(sessao, parametro(req, 'id'))

    if (alvo.id === sessao.id) {
      throw new ErroHttp(
        400,
        'Você não pode excluir o próprio usuário. Peça a outro administrador.',
      )
    }

    const [pericias, documentos] = await Promise.all([
      prisma.pericia.count({ where: { responsavelId: alvo.id } }),
      prisma.documentoGerado.count({ where: { criadoPorId: alvo.id } }),
    ])

    const transferirPara =
      typeof req.query.transferirPara === 'string' && req.query.transferirPara
        ? req.query.transferirPara
        : undefined

    let herdeiroId: string | undefined
    if (pericias + documentos > 0) {
      if (!transferirPara) {
        throw new ErroHttp(
          409,
          `${alvo.nome} é responsável por ${pericias} ${pericias === 1 ? 'perícia' : 'perícias'} ` +
            `e ${documentos} ${documentos === 1 ? 'documento' : 'documentos'}. ` +
            'Escolha quem assume esse trabalho ou, se só quer tirar o acesso, desative o usuário.',
        )
      }

      const herdeiro = await prisma.usuario.findFirst({
        where: {
          id: transferirPara,
          organizacaoId: alvo.organizacaoId,
          ativo: true,
          NOT: { id: alvo.id },
        },
        select: { id: true },
      })
      if (!herdeiro) {
        throw new ErroHttp(
          422,
          'Escolha, para assumir o trabalho, outro usuário ATIVO da mesma equipe.',
        )
      }
      herdeiroId = herdeiro.id
    }

    await prisma.$transaction(async (tx) => {
      if (herdeiroId) {
        await tx.pericia.updateMany({
          where: { responsavelId: alvo.id },
          data: { responsavelId: herdeiroId },
        })
        await tx.documentoGerado.updateMany({
          where: { criadoPorId: alvo.id },
          data: { criadoPorId: herdeiroId },
        })
      }
      await tx.usuario.delete({ where: { id: alvo.id } })
    })

    // Só depois de o banco confirmar, como nas demais rotas com arquivo.
    await Promise.all([apagarUpload(alvo.logoArquivo), apagarUpload(alvo.assinaturaArquivo)])

    res.status(204).end()
  }),
)

// ---------------- logo do perito (white-label) ----------------

/**
 * Quem pode mexer na logo de quem.
 *
 * A logo sai no cabeçalho de um documento assinado — trocar a de outra
 * pessoa é assinar com a marca dela. Vale a mesma regra do cadastro: cada um
 * cuida da própria, o administrador cuida das do seu alcance.
 */
async function usuarioQuePodeEditar(req: Request, oQue = 'a logo') {
  const sessao = sessaoDe(req)
  const usuario = await carregarAlvo(sessao, parametro(req, 'id'))
  if (sessao.perfil !== 'admin' && sessao.id !== usuario.id) {
    throw semPermissao(`Somente o administrador pode trocar ${oQue} de outro usuário.`)
  }
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
