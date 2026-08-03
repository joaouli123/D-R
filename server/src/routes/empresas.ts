import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao } from '../auth.js'
import { ErroHttp, parametro, rota } from '../erros.js'
import { empresaParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'

export const empresasRouter = Router()
empresasRouter.use(exigirSessao)

const opcional = z.string().trim().optional()

const corpo = z.object({
  id: z.string().optional(),
  razaoSocial: z.string().trim().min(1, 'Informe a razão social.'),
  nomeFantasia: opcional,
  cnpj: z
    .string()
    .trim()
    .min(1, 'Informe o CNPJ.')
    .refine((v) => v.replace(/\D/g, '').length === 14, 'CNPJ deve ter 14 dígitos.'),
  cnae: opcional,
  grauRisco: z.enum(['1', '2', '3', '4']).optional(),
  endereco: z.string().trim().default(''),
  numero: opcional,
  complemento: opcional,
  bairro: opcional,
  cidade: z.string().trim().default(''),
  uf: z.string().trim().length(2, 'UF deve ter 2 letras.').default('SP'),
  cep: opcional,
  contatoNome: opcional,
  contatoEmail: z.union([z.string().email('E-mail de contato inválido.'), z.literal('')]).optional(),
  contatoTelefone: opcional,
  ramoAtividade: opcional,
})

const vazioParaNulo = (v?: string) => (v?.trim() ? v.trim() : null)

/** GET /empresas */
empresasRouter.get(
  '/',
  rota(async (_req, res) => {
    const empresas = await prisma.empresa.findMany({ orderBy: { razaoSocial: 'asc' } })
    res.json(empresas.map(empresaParaApi))
  }),
)

/** POST /empresas — upsert. */
empresasRouter.post(
  '/',
  rota(async (req, res) => {
    const d = corpo.parse(req.body)

    const dados = {
      razaoSocial: d.razaoSocial,
      nomeFantasia: vazioParaNulo(d.nomeFantasia),
      cnpj: d.cnpj,
      cnae: vazioParaNulo(d.cnae),
      grauRisco: d.grauRisco ?? null,
      endereco: d.endereco,
      numero: vazioParaNulo(d.numero),
      complemento: vazioParaNulo(d.complemento),
      bairro: vazioParaNulo(d.bairro),
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      cep: vazioParaNulo(d.cep),
      contatoNome: vazioParaNulo(d.contatoNome),
      contatoEmail: vazioParaNulo(d.contatoEmail),
      contatoTelefone: vazioParaNulo(d.contatoTelefone),
      ramoAtividade: vazioParaNulo(d.ramoAtividade),
    }

    const existente = d.id ? await prisma.empresa.findUnique({ where: { id: d.id } }) : null

    const empresa = existente
      ? await prisma.empresa.update({ where: { id: existente.id }, data: dados })
      : await prisma.empresa.create({ data: { ...dados, ...(d.id ? { id: d.id } : {}) } })

    res.status(existente ? 200 : 201).json(empresaParaApi(empresa))
  }),
)

/**
 * DELETE /empresas/:id
 * Recusa a exclusão de empresa citada como reclamada — um parecer
 * já emitido não pode perder a identificação da parte.
 */
empresasRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const vinculos = await prisma.reclamada.count({ where: { empresaId: parametro(req, 'id') } })
    if (vinculos > 0) {
      throw new ErroHttp(
        409,
        `Esta empresa é reclamada em ${vinculos} ${vinculos === 1 ? 'processo' : 'processos'} e não pode ser excluída.`,
      )
    }

    await prisma.empresa.delete({ where: { id: parametro(req, 'id') } })
    res.status(204).end()
  }),
)
