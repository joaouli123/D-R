import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao, sessaoDe } from '../auth.js'
import { ErroHttp, naoEncontrado, parametro, rota } from '../erros.js'
import { periciaParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'
import { apagarUpload } from '../services/armazenamento.js'
import { decidirSincronizacaoDeFotos } from '../services/fotos-pericia.js'
import { dataIsoSchema, tecnicoSchema, texto } from './esquemas-pericia.js'

// `npm run smoke:pericia` lê os esquemas por este módulo desde antes da
// extração; continua lendo.
export { agenteSchema, dataIsoSchema, tecnicoSchema } from './esquemas-pericia.js'

// Multi-tenant: a perícia pertence à EQUIPE do usuário. Toda leitura e escrita
// leva `organizacaoId` da sessão (nunca `undefined`, que o Prisma leria como
// "sem filtro"); um id de outra equipe responde 404, como se não existisse.

export const periciasRouter = Router()
periciasRouter.use(exigirSessao)

const incluirTudo = {
  reclamadas: true,
  participantes: true,
  fotos: { orderBy: { ordem: 'asc' } },
} as const

const corpo = z.object({
  id: z.string().optional(),
  numeroProcesso: texto,
  vara: texto,
  comarca: texto,
  reclamante: texto,
  cpfReclamante: texto.optional(),
  funcaoReclamante: texto.optional(),
  dataAjuizamento: dataIsoSchema.optional(),
  admissao: dataIsoSchema.optional(),
  demissao: dataIsoSchema.optional(),
  dataVistoria: dataIsoSchema.optional(),
  horaVistoria: texto.optional(),
  horaFimVistoria: texto.optional(),
  cepVistoria: texto.optional(),
  localVistoria: texto.optional(),
  numeroVistoria: texto.optional(),
  setorVistoriado: texto.optional(),
  modalidade: z.enum(['insalubridade', 'periculosidade', 'ambas']).default('insalubridade'),
  status: z.enum(['rascunho', 'em_andamento', 'concluida', 'entregue']).default('rascunho'),
  responsavelId: z.string().optional(),
  tecnico: tecnicoSchema,
  reclamadas: z
    .array(
      z.object({
        id: z.string().optional(),
        empresaId: z.string(),
        principal: z.boolean().default(false),
      }),
    )
    .default([]),
  participantes: z
    .array(
      z.object({
        id: z.string().optional(),
        nome: texto,
        empresaId: z.string().optional(),
        papel: z.enum([
          'perito_judicial',
          'reclamante',
          'parte_reclamante_ausente',
          'engenheiro_assistente_reclamante',
          'tecnico_assistente_reclamante',
          'assistente_reclamante',
          'engenheiro_assistente_reclamada',
          'tecnico_assistente_reclamada',
          'assistente_reclamada',
          'advogado_reclamante',
          'advogado_reclamada',
          'preposto',
          'engenheiro_sst_empresa',
          'tecnico_sst_empresa',
          'gestor_lideranca',
          'representante_setorial',
          'recursos_humanos',
          'auxiliar_perito',
          'paradigma',
          'entrevistado',
          'acompanhante',
        ]),
        registro: texto.optional(),
        contato: texto.optional(),
      }),
    )
    .default([]),
  /// As fotos são criadas em POST /pericias/:id/fotos e removidas pela
  /// rota DELETE própria. Aqui chegam apenas edições de legenda/ordem.
  fotos: z
    .array(z.object({ id: z.string(), legenda: texto, ordem: z.number().int().default(0) }))
    .default([]),
})

const nulo = (v?: string) => (v?.trim() ? v.trim() : null)

/** GET /pericias */
periciasRouter.get(
  '/',
  rota(async (req, res) => {
    const pericias = await prisma.pericia.findMany({
      where: { organizacaoId: sessaoDe(req).organizacaoId },
      include: incluirTudo,
      orderBy: { atualizadoEm: 'desc' },
    })
    res.json(pericias.map(periciaParaApi))
  }),
)

/** GET /pericias/:id */
periciasRouter.get(
  '/:id',
  rota(async (req, res) => {
    const pericia = await prisma.pericia.findFirst({
      where: { id: parametro(req, 'id'), organizacaoId: sessaoDe(req).organizacaoId },
      include: incluirTudo,
    })
    if (!pericia) throw naoEncontrado('Perícia')
    res.json(periciaParaApi(pericia))
  }),
)

/**
 * POST /pericias — upsert com filhos.
 *
 * Reclamadas e participantes são substituídos por inteiro: o
 * frontend sempre envia a lista completa, e essa é a única forma
 * de refletir remoções feitas na tela.
 */
periciasRouter.post(
  '/',
  rota(async (req, res) => {
    const d = corpo.parse(req.body)
    const sessao = sessaoDe(req)

    // Uma empresa não pode figurar duas vezes como reclamada do mesmo
    // processo: a ficha do laudo imprime uma linha por vínculo, e ela
    // sairia repetida no documento entregue ao juízo. A tela já evita o
    // engano (src/lib/reclamadas.ts, função `semRepetidas`) — aqui é a
    // última porta antes do banco. Os dois precisam mudar juntos.
    const reclamadasValidas = d.reclamadas.filter(
      (r, i, todas) => r.empresaId !== '' && todas.findIndex((x) => x.empresaId === r.empresaId) === i,
    )

    // Uma única reclamada pode ser a principal; se o cliente não
    // marcou nenhuma, a primeira assume.
    const indicePrincipal = Math.max(
      0,
      reclamadasValidas.findIndex((r) => r.principal),
    )
    const empresasReclamadas = new Set(reclamadasValidas.map((r) => r.empresaId))

    const escalares = {
      numeroProcesso: d.numeroProcesso,
      vara: d.vara,
      comarca: d.comarca,
      reclamante: d.reclamante,
      cpfReclamante: nulo(d.cpfReclamante),
      funcaoReclamante: nulo(d.funcaoReclamante),
      dataAjuizamento: nulo(d.dataAjuizamento),
      admissao: nulo(d.admissao),
      demissao: nulo(d.demissao),
      dataVistoria: nulo(d.dataVistoria),
      horaVistoria: nulo(d.horaVistoria),
      horaFimVistoria: nulo(d.horaFimVistoria),
      cepVistoria: nulo(d.cepVistoria),
      localVistoria: nulo(d.localVistoria),
      numeroVistoria: nulo(d.numeroVistoria),
      setorVistoriado: nulo(d.setorVistoriado),
      modalidade: d.modalidade,
      status: d.status,
      tecnico: d.tecnico,
    }

    const filhos = {
      reclamadas: {
        create: reclamadasValidas.map((r, i) => ({
          empresaId: r.empresaId,
          principal: i === indicePrincipal,
        })),
      },
      participantes: {
        create: d.participantes.map((p) => ({
          nome: p.nome,
          empresaId: p.empresaId && empresasReclamadas.has(p.empresaId) ? p.empresaId : null,
          papel: p.papel,
          registro: nulo(p.registro),
          contato: nulo(p.contato),
        })),
      },
    }

    // O que a perícia referencia tem de ser da MESMA equipe: senão bastaria
    // colar o id de uma empresa (ou de um usuário) de outra equipe para puxar
    // os dados dela para dentro do laudo.
    if (d.responsavelId) {
      const responsavel = await prisma.usuario.findFirst({
        where: { id: d.responsavelId, organizacaoId: sessao.organizacaoId },
        select: { id: true },
      })
      if (!responsavel) throw new ErroHttp(422, 'O perito responsável precisa ser da sua equipe.')
    }
    if (empresasReclamadas.size > 0) {
      const daEquipe = await prisma.empresa.count({
        where: { id: { in: [...empresasReclamadas] }, organizacaoId: sessao.organizacaoId },
      })
      if (daEquipe !== empresasReclamadas.size) {
        throw new ErroHttp(422, 'Uma das empresas reclamadas não existe no cadastro da sua equipe.')
      }
    }

    // Só enxerga como "existente" o que é da própria equipe. Um id de outra
    // equipe vira uma perícia nova (com id gerado), nunca uma edição da alheia.
    const existente = d.id
      ? await prisma.pericia.findFirst({
          where: { id: d.id, organizacaoId: sessao.organizacaoId },
        })
      : null
    const idSugerido =
      !existente && d.id && (await prisma.pericia.count({ where: { id: d.id } })) === 0
        ? d.id
        : undefined

    const pericia = await prisma.$transaction(async (tx) => {
      if (!existente) {
        return tx.pericia.create({
          data: {
            ...(idSugerido ? { id: idSugerido } : {}),
            ...escalares,
            organizacaoId: sessao.organizacaoId,
            responsavelId: d.responsavelId || sessao.id,
            ...filhos,
          },
          include: incluirTudo,
        })
      }

      await tx.reclamada.deleteMany({ where: { periciaId: existente.id } })
      await tx.participante.deleteMany({ where: { periciaId: existente.id } })

      const fotosPersistidas = await tx.foto.findMany({
        where: { periciaId: existente.id },
        select: { id: true },
      })
      const sincronizacao = decidirSincronizacaoDeFotos(fotosPersistidas, d.fotos)
      for (const f of sincronizacao.atualizar) {
        await tx.foto.updateMany({
          where: { id: f.id, periciaId: existente.id },
          data: { legenda: f.legenda, ordem: f.ordem },
        })
      }

      const atualizada = await tx.pericia.update({
        where: { id: existente.id },
        data: {
          ...escalares,
          ...(d.responsavelId ? { responsavelId: d.responsavelId } : {}),
          ...filhos,
        },
        include: incluirTudo,
      })

      return atualizada
    })

    res.status(existente ? 200 : 201).json(periciaParaApi(pericia))
  }),
)

/** DELETE /pericias/:id — leva junto fotos, reclamadas e participantes. */
periciasRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const pericia = await prisma.pericia.findFirst({
      where: { id: parametro(req, 'id'), organizacaoId: sessaoDe(req).organizacaoId },
      select: { id: true },
    })
    if (!pericia) throw naoEncontrado('Perícia')

    const fotos = await prisma.foto.findMany({ where: { periciaId: pericia.id } })

    await prisma.pericia.delete({ where: { id: pericia.id } })
    await Promise.all(fotos.map((f) => apagarUpload(f.arquivo)))

    res.status(204).end()
  }),
)
