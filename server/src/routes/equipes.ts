import { Router } from 'express'
import { z } from 'zod'
import { exigirPerfil, exigirSessao, sessaoDe } from '../auth.js'
import { carregarEquipes } from '../equipes.js'
import { ErroHttp, naoEncontrado, parametro, rota } from '../erros.js'
import { usuarioParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'
import { arvoreOrdenada, ehEquipePrincipal, idsDaSubarvore } from '../tenancy.js'

// ============================================================
// Equipes — a hierarquia de organizações.
//
// O administrador enxerga a própria equipe e as que estão abaixo dela, com os
// usuários de cada uma, e pode criar, renomear e excluir equipes abaixo. O que
// ele NÃO faz é ler o trabalho (empresas, perícias, documentos) das equipes de
// baixo: a gestão é de acessos, não de conteúdo.
//
// O que está fora do alcance responde 404 — quem não tem acesso não fica
// sabendo que existe.
// ============================================================

export const equipesRouter = Router()
equipesRouter.use(exigirSessao, exigirPerfil('admin'))

const nomeDaEquipe = z.string().trim().min(2, 'Informe o nome da equipe.').max(120)

/** Monta a resposta da tela: a subárvore em ordem de exibição, com os usuários de cada equipe. */
async function montarArvore(organizacaoId: string) {
  const todas = await carregarEquipes()
  const ordenadas = arvoreOrdenada(todas, organizacaoId)
  const ids = ordenadas.map((e) => e.id)

  const [contagens, usuarios] = await Promise.all([
    prisma.organizacao.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        _count: { select: { usuarios: true, empresas: true, pericias: true, documentos: true } },
      },
    }),
    prisma.usuario.findMany({
      where: { organizacaoId: { in: ids } },
      orderBy: { nome: 'asc' },
    }),
  ])

  const contagemDe = new Map(contagens.map((c) => [c.id, c._count]))
  const temFilhas = new Set(todas.map((e) => e.paiId).filter((id): id is string => id !== null))

  return ordenadas.map((equipe) => {
    const conta = contagemDe.get(equipe.id)
    const vazia =
      !!conta &&
      conta.usuarios + conta.empresas + conta.pericias + conta.documentos === 0 &&
      !temFilhas.has(equipe.id)

    return {
      id: equipe.id,
      nome: equipe.nome,
      // A mãe da equipe da própria sessão fica fora do alcance: não a revelamos.
      paiId: equipe.nivel === 0 ? null : equipe.paiId,
      nivel: equipe.nivel,
      propria: equipe.id === organizacaoId,
      principal: ehEquipePrincipal(equipe.id),
      // Uma equipe só sai do sistema vazia (sem gente, sem trabalho e sem
      // equipes filhas) e nunca a própria — senão quem exclui perderia o acesso.
      podeExcluir: equipe.id !== organizacaoId && vazia,
      usuarios: usuarios.filter((u) => u.organizacaoId === equipe.id).map(usuarioParaApi),
    }
  })
}

/** Carrega uma equipe do alcance da sessão; fora dele, 404. */
async function equipeDoAlcance(organizacaoId: string, id: string) {
  const todas = await carregarEquipes()
  if (!idsDaSubarvore(todas, organizacaoId).includes(id)) throw naoEncontrado('Equipe')
  const equipe = todas.find((e) => e.id === id)
  if (!equipe) throw naoEncontrado('Equipe')
  return equipe
}

/** GET /equipes — a árvore da sessão, com os usuários de cada equipe. */
equipesRouter.get(
  '/',
  rota(async (req, res) => {
    res.json(await montarArvore(sessaoDe(req).organizacaoId))
  }),
)

/** POST /equipes — cria uma equipe. Sem `paiId`, nasce logo abaixo da equipe de quem cria. */
equipesRouter.post(
  '/',
  rota(async (req, res) => {
    const { nome, paiId } = z
      .object({ nome: nomeDaEquipe, paiId: z.string().optional() })
      .parse(req.body)
    const { organizacaoId } = sessaoDe(req)

    const pai = await equipeDoAlcance(organizacaoId, paiId ?? organizacaoId)
    const criada = await prisma.organizacao.create({ data: { nome, paiId: pai.id } })

    const arvore = await montarArvore(organizacaoId)
    res.status(201).json(arvore.find((e) => e.id === criada.id))
  }),
)

/** PATCH /equipes/:id — renomeia. */
equipesRouter.patch(
  '/:id',
  rota(async (req, res) => {
    const { nome } = z.object({ nome: nomeDaEquipe }).parse(req.body)
    const { organizacaoId } = sessaoDe(req)

    const equipe = await equipeDoAlcance(organizacaoId, parametro(req, 'id'))
    await prisma.organizacao.update({ where: { id: equipe.id }, data: { nome } })

    const arvore = await montarArvore(organizacaoId)
    res.json(arvore.find((e) => e.id === equipe.id))
  }),
)

/**
 * DELETE /equipes/:id — só uma equipe VAZIA e abaixo da própria.
 *
 * O banco também recusa (chaves RESTRICT), mas a conferência aqui devolve o
 * motivo em português em vez de um 409 genérico.
 */
equipesRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const { organizacaoId } = sessaoDe(req)
    const equipe = await equipeDoAlcance(organizacaoId, parametro(req, 'id'))

    if (equipe.id === organizacaoId) {
      throw new ErroHttp(400, 'Você não pode excluir a própria equipe.')
    }

    const [filhas, contagem] = await Promise.all([
      prisma.organizacao.count({ where: { paiId: equipe.id } }),
      prisma.organizacao.findUniqueOrThrow({
        where: { id: equipe.id },
        select: { _count: { select: { usuarios: true, empresas: true, pericias: true, documentos: true } } },
      }),
    ])

    if (filhas > 0) {
      throw new ErroHttp(409, 'Esta equipe tem equipes abaixo dela. Exclua-as primeiro.')
    }
    const { usuarios, empresas, pericias, documentos } = contagem._count
    if (usuarios > 0) {
      throw new ErroHttp(
        409,
        'Esta equipe ainda tem usuários. Exclua-os (ou desative-os, para só tirar o acesso) antes.',
      )
    }
    if (empresas + pericias + documentos > 0) {
      throw new ErroHttp(
        409,
        'Esta equipe tem empresas, perícias ou documentos cadastrados e não pode ser excluída.',
      )
    }

    await prisma.organizacao.delete({ where: { id: equipe.id } })
    res.status(204).end()
  }),
)
