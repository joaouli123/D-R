import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { exigirEquipePrincipal, exigirPerfil, exigirSessao } from '../auth.js'
import { ErroHttp, parametro, rota } from '../erros.js'
import { prisma } from '../prisma.js'
import { apagarUpload } from '../services/armazenamento.js'
import {
  formatarDocumento,
  limparDocumento,
  problemaNoDocumento,
  rotuloDoDocumento,
} from '../services/documento-fiscal.js'
import { LICENCA_PRINCIPAL_ID, ORGANIZACAO_RAIZ_ID } from '../tenancy.js'

// ============================================================
// Licenças — as empresas clientes da plataforma.
//
// Só o perito titular (administrador da equipe raiz) chega aqui. Ele cria a
// licença junto com o primeiro administrador dela, renomeia, suspende e, se
// ainda não houver trabalho dentro, exclui. Daí em diante quem cuida das
// equipes e dos usuários da licença é o administrador dela.
//
// Esta tela mostra QUANTO há em cada licença, nunca O QUE há: empresas,
// perícias e documentos continuam só de quem é da licença.
// ============================================================

export const licencasRouter = Router()
licencasRouter.use(exigirSessao, exigirPerfil('admin'), exigirEquipePrincipal)

const nomeDaLicenca = z.string().trim().min(2, 'Informe o nome da empresa.').max(160)
const documento = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => v || null)

/** Texto opcional: vazio vira `null`, que é como o banco guarda "sem dado". */
const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null)

/** Contato e endereço do cliente — o que a Receita e o CEP ajudam a preencher. */
const cadastro = {
  nomeFantasia: texto(160),
  email: z
    .union([z.string().trim().email('E-mail da empresa inválido.'), z.literal('')])
    .optional()
    .transform((v) => v || null),
  telefone: texto(30),
  cep: texto(9),
  endereco: texto(200),
  numero: texto(20),
  complemento: texto(120),
  bairro: texto(120),
  cidade: texto(120),
  uf: z
    .union([z.string().trim().regex(/^[A-Za-z]{2}$/, 'UF deve ter 2 letras.'), z.literal('')])
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
}
const CAMPOS_DE_CADASTRO = Object.keys(cadastro) as Array<keyof typeof cadastro>

const corpoDeCriacao = z.object({
  nome: nomeDaLicenca,
  documento,
  ...cadastro,
  admin: z.object({
    nome: z.string().trim().min(1, 'Informe o nome do administrador.'),
    email: z.string().email('E-mail do administrador inválido.'),
    senha: z.string().min(8, 'A senha do administrador deve ter pelo menos 8 caracteres.'),
  }),
})

const corpoDeEdicao = z.object({
  nome: nomeDaLicenca.optional(),
  documento,
  ...cadastro,
  ativa: z.boolean().optional(),
})

/**
 * O documento como vai para o banco — sempre com a máscara —, depois de
 * conferir o dígito verificador e que nenhuma outra licença já o usa.
 *
 * O que já estava gravado e não mudou passa sem conferência: licença antiga
 * com número digitado errado não pode travar a troca do telefone.
 */
async function documentoConferido(
  documento: string | null,
  { licencaId, anterior }: { licencaId?: string; anterior?: string | null } = {},
): Promise<string | null> {
  if (!documento) return null
  const limpo = limparDocumento(documento)
  if (anterior && limparDocumento(anterior) === limpo) return anterior

  const problema = problemaNoDocumento(documento)
  if (problema) throw new ErroHttp(422, problema)

  const outras = await prisma.licenca.findMany({
    where: { documento: { not: null }, ...(licencaId ? { NOT: { id: licencaId } } : {}) },
    select: { nome: true, documento: true },
  })
  const repetida = outras.find((l) => limparDocumento(l.documento) === limpo)
  if (repetida) {
    throw new ErroHttp(
      409,
      `O ${rotuloDoDocumento(limpo)} ${formatarDocumento(limpo)} já é da licença "${repetida.nome}".`,
    )
  }
  return formatarDocumento(limpo)
}

/**
 * A equipe que nasceu com a licença. Na principal é a raiz; nas clientes é a
 * única da licença pendurada direto na raiz.
 */
const ehEquipeDeEntrada = (licencaId: string, e: { id: string; paiId: string | null }) =>
  licencaId === LICENCA_PRINCIPAL_ID ? e.id === ORGANIZACAO_RAIZ_ID : e.paiId === ORGANIZACAO_RAIZ_ID

async function listar(where: { id?: string } = {}) {
  const licencas = await prisma.licenca.findMany({
    where,
    orderBy: { criadoEm: 'asc' },
    include: {
      _count: { select: { organizacoes: true, empresas: true, pericias: true, documentos: true } },
      organizacoes: {
        select: {
          id: true,
          paiId: true,
          nome: true,
          _count: { select: { usuarios: true } },
          usuarios: {
            where: { perfil: 'admin' },
            select: { id: true, nome: true, email: true, ativo: true },
            orderBy: { nome: 'asc' },
          },
        },
      },
    },
  })

  return licencas.map((l) => {
    const entrada = l.organizacoes.find((e) => ehEquipeDeEntrada(l.id, e))
    return {
      id: l.id,
      nome: l.nome,
      documento: l.documento ?? undefined,
      ...Object.fromEntries(CAMPOS_DE_CADASTRO.map((campo) => [campo, l[campo] ?? undefined])),
      ativa: l.ativa,
      principal: l.id === LICENCA_PRINCIPAL_ID,
      criadoEm: l.criadoEm.toISOString(),
      equipePrincipalId: entrada?.id,
      equipes: l._count.organizacoes,
      usuarios: l.organizacoes.reduce((soma, e) => soma + e._count.usuarios, 0),
      empresas: l._count.empresas,
      pericias: l._count.pericias,
      documentos: l._count.documentos,
      administradores: l.organizacoes.flatMap((e) => e.usuarios),
    }
  })
}

async function uma(id: string) {
  const [licenca] = await listar({ id })
  if (!licenca) throw new ErroHttp(404, 'Licença não encontrada.')
  return licenca
}

/** GET /licencas — todas, com o tamanho de cada uma e quem as administra. */
licencasRouter.get(
  '/',
  rota(async (_req, res) => {
    res.json(await listar())
  }),
)

/**
 * POST /licencas — cria a licença, a equipe principal dela (logo abaixo da
 * raiz, para o perito titular seguir gerindo os acessos) e o primeiro
 * administrador. Tudo ou nada.
 */
licencasRouter.post(
  '/',
  rota(async (req, res) => {
    const d = corpoDeCriacao.parse(req.body)
    const email = d.admin.email.toLowerCase()

    if (await prisma.usuario.findUnique({ where: { email }, select: { id: true } })) {
      throw new ErroHttp(409, 'Já existe um usuário com este e-mail. Use outro para o administrador.')
    }

    const documentoFinal = await documentoConferido(d.documento)
    const senhaHash = await bcrypt.hash(d.admin.senha, 12)
    const licenca = await prisma.$transaction(async (tx) => {
      const criada = await tx.licenca.create({
        data: {
          nome: d.nome,
          documento: documentoFinal,
          ...Object.fromEntries(CAMPOS_DE_CADASTRO.map((campo) => [campo, d[campo]])),
        },
      })
      const equipe = await tx.organizacao.create({
        data: { nome: d.nome, paiId: ORGANIZACAO_RAIZ_ID, licencaId: criada.id },
      })
      await tx.usuario.create({
        data: {
          nome: d.admin.nome,
          email,
          senhaHash,
          perfil: 'admin',
          ativo: true,
          organizacaoId: equipe.id,
        },
      })
      return criada
    })

    res.status(201).json(await uma(licenca.id))
  }),
)

/** PATCH /licencas/:id — renomeia, troca o documento, suspende ou reativa. */
licencasRouter.patch(
  '/:id',
  rota(async (req, res) => {
    const d = corpoDeEdicao.parse(req.body)
    const atual = await uma(parametro(req, 'id'))

    if (atual.principal && d.ativa === false) {
      throw new ErroHttp(400, 'A licença principal não pode ser suspensa.')
    }

    // Campo que não veio no corpo fica como está; o que veio vazio é apagado.
    const veio = (campo: string) => campo in req.body
    const documentoFinal = veio('documento')
      ? await documentoConferido(d.documento, { licencaId: atual.id, anterior: atual.documento })
      : undefined

    await prisma.$transaction(async (tx) => {
      await tx.licenca.update({
        where: { id: atual.id },
        data: {
          ...(d.nome !== undefined ? { nome: d.nome } : {}),
          ...(documentoFinal !== undefined ? { documento: documentoFinal } : {}),
          ...Object.fromEntries(
            CAMPOS_DE_CADASTRO.filter(veio).map((campo) => [campo, d[campo]]),
          ),
          ...(d.ativa !== undefined ? { ativa: d.ativa } : {}),
        },
      })
      // A equipe de entrada acompanha o nome da licença — mas só se ainda tiver
      // o nome antigo: um nome que o administrador dela escolheu fica.
      if (d.nome !== undefined && atual.equipePrincipalId) {
        await tx.organizacao.updateMany({
          where: { id: atual.equipePrincipalId, nome: atual.nome },
          data: { nome: d.nome },
        })
      }
    })

    res.json(await uma(atual.id))
  }),
)

/**
 * DELETE /licencas/:id — só sem trabalho dentro (empresas, perícias,
 * documentos). As equipes e os usuários da licença saem junto; para só tirar o
 * acesso, o caminho é suspender.
 */
licencasRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const licenca = await uma(parametro(req, 'id'))

    if (licenca.principal) {
      throw new ErroHttp(400, 'A licença principal não pode ser excluída.')
    }
    if (licenca.empresas + licenca.pericias + licenca.documentos > 0) {
      throw new ErroHttp(
        409,
        `A licença "${licenca.nome}" tem ${licenca.empresas} empresa(s), ${licenca.pericias} ` +
          `perícia(s) e ${licenca.documentos} documento(s) cadastrados e não pode ser excluída. ` +
          'Para tirar o acesso sem perder nada, suspenda a licença.',
      )
    }

    const arquivos = await prisma.usuario.findMany({
      where: { organizacao: { licencaId: licenca.id } },
      select: { logoArquivo: true, assinaturaArquivo: true },
    })

    await prisma.$transaction(async (tx) => {
      await tx.usuario.deleteMany({ where: { organizacao: { licencaId: licenca.id } } })
      // A hierarquia recusa apagar uma equipe com filhas: solta os laços antes.
      await tx.organizacao.updateMany({ where: { licencaId: licenca.id }, data: { paiId: null } })
      await tx.organizacao.deleteMany({ where: { licencaId: licenca.id } })
      await tx.licenca.delete({ where: { id: licenca.id } })
    })

    // Só depois de o banco confirmar, como nas demais rotas com arquivo.
    await Promise.all(
      arquivos.flatMap((u) => [apagarUpload(u.logoArquivo), apagarUpload(u.assinaturaArquivo)]),
    )

    res.status(204).end()
  }),
)
