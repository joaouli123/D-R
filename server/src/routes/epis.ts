import type { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao } from '../auth.js'
import { rota } from '../erros.js'
import { prisma } from '../prisma.js'

const consultaSchema = z.object({
  q: z.string().trim().optional(),
  categoria: z.string().trim().optional(),
  anexo: z.string().trim().optional(),
})

type BuscarEpis = (
  consulta: Prisma.EpiCatalogoFindManyArgs,
) => ReturnType<typeof prisma.epiCatalogo.findMany>

export function criarEpisRouter(buscarEpis: BuscarEpis = (consulta) => prisma.epiCatalogo.findMany(consulta)) {
  const episRouter = Router()
  episRouter.use(exigirSessao)

  episRouter.get(
    '/',
    rota(async (req, res) => {
      const parametros = consultaSchema.parse(req.query)
      const q = parametros.q || undefined
      const anexo = parametros.anexo || undefined
      const categoria = parametros.categoria || undefined
      const filtroAplicacao = {
        ...(anexo ? { anexo } : {}),
        ...(categoria ? { categoria } : {}),
      } satisfies Prisma.EpiAplicacaoWhereInput

      const where = {
        ativo: true,
        ...(Object.keys(filtroAplicacao).length ? { aplicacoes: { some: filtroAplicacao } } : {}),
        ...(q
          ? {
              OR: [
                { modelo: { contains: q, mode: 'insensitive' } },
                { marca: { contains: q, mode: 'insensitive' } },
                { caUnico: { contains: q, mode: 'insensitive' } },
                { caPecaFacial: { contains: q, mode: 'insensitive' } },
                { caFiltroCartucho: { contains: q, mode: 'insensitive' } },
                { aplicacoes: { some: { categoria: { contains: q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      } satisfies Prisma.EpiCatalogoWhereInput

      const epis = await buscarEpis({
        where,
        include: {
          aplicacoes: {
            where: filtroAplicacao,
            orderBy: [{ anexo: 'asc' }, { categoria: 'asc' }],
          },
        },
        orderBy: { modelo: 'asc' },
        take: 100,
      })
      res.json(epis)
    }),
  )

  return episRouter
}

export const episRouter = criarEpisRouter()
