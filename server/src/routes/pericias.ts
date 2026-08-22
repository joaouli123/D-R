import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao, sessaoDe } from '../auth.js'
import { naoEncontrado, parametro, rota } from '../erros.js'
import { periciaParaApi } from '../mappers.js'
import { prisma } from '../prisma.js'
import { apagarUpload } from '../services/armazenamento.js'

export const periciasRouter = Router()
periciasRouter.use(exigirSessao)

const incluirTudo = {
  reclamadas: true,
  participantes: true,
  fotos: { orderBy: { ordem: 'asc' } },
} as const

const texto = z.string().default('')
const textoObrigatorio = z.string().trim().min(1)

const periodoSchema = z.object({
  id: z.string(),
  funcao: texto,
  inicio: texto,
  fim: texto.optional(),
  setor: texto.optional(),
  descricaoAtividades: texto.optional(),
})

const epiSelecionadoSchema = z.object({
  catalogoId: texto.optional(),
  categoria: textoObrigatorio,
  modelo: textoObrigatorio,
  marca: texto.optional(),
  validadeCa: texto.optional(),
  caUnico: texto.optional(),
  caPecaFacial: texto.optional(),
  caFiltroCartucho: texto.optional(),
  nivelProtecaoDb: z.number().min(0).max(100).nullable().optional(),
  metodoAtenuacao: z.enum(['NRRsf']).nullable().optional(),
  observacao: texto.optional(),
}).refine((epi) => Boolean(epi.marca?.trim() || epi.validadeCa?.trim()), {
  message: 'Informe a marca do catálogo ou a validade do CA no cadastro manual.',
  path: ['validadeCa'],
})

export const agenteSchema = z.object({
  id: z.string(),
  nome: texto,
  tipo: z.enum(['quimico', 'fisico', 'biologico', 'periculosidade']),
  cas: texto.optional(),
  anexoNr15: texto.optional(),
  referenciaNormativaId: texto.optional(),
  atividadeEnquadrada: texto.optional(),
  unidadeLimite: texto.optional(),
  limiteTolerancia: texto.optional(),
  medido: texto.optional(),
  valorMedido: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  // A medição da empresa (PGR, LTCAT) convive com a do perito: o laudo
  // guarda as duas e diz qual adotou.
  medicaoEmpresa: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  fonteMedicaoEmpresa: texto.optional(),
  origemMedicao: z.enum(['perito', 'empresa', 'nao_informado']).optional(),
  unidadeMedicao: z.enum([
    'ppm', 'mg/m³', '% O₂ em volume', 'dB(A)', 'dB(C)', 'dB(Linear)',
    'IBUTG °C', 'mSv/ano', 'm/s²', 'm/s¹·⁷⁵', 'fibras/cm³',
  ]).optional(),
  epis: z.array(epiSelecionadoSchema).max(10).default([]),
  criterio: z.enum(['qualitativo', 'quantitativo', 'nao_aplicavel']),
  grau: z.enum(['minimo', 'medio', 'maximo', 'nao_caracterizado']).optional(),
  epiEficaz: z.boolean().optional(),
  observacao: texto.optional(),
})

export const tecnicoSchema = z.object({
  apresentacao: texto,
  enderecamento: texto,
  objetivoPericia: texto,
  descricaoEmpresa: texto,
  descricaoAmbiente: texto,
  descricaoPostoTrabalho: texto,
  maquinasFerramentas: texto,
  produtosUtilizados: texto,
  atividadesFuncoes: texto,
  periodos: z.array(periodoSchema).default([]),
  agentes: z.array(agenteSchema).default([]),
  normasReferencias: texto,
  equipamentosAnalisados: texto,
  informacoesLevantadas: texto,
  divergenciasFaticas: texto,
  protecoesColetivas: texto,
  analiseTecnica: texto,
  conclusao: texto,
  conclusaoInsalubridade: texto,
  conclusaoPericulosidade: texto,
  respostasQuesitos: texto,
  encerramento: texto,
  observacoesAdicionais: texto,
})

const corpo = z.object({
  id: z.string().optional(),
  numeroProcesso: texto,
  vara: texto,
  comarca: texto,
  reclamante: texto,
  cpfReclamante: texto.optional(),
  funcaoReclamante: texto.optional(),
  admissao: texto.optional(),
  demissao: texto.optional(),
  dataVistoria: texto.optional(),
  horaVistoria: texto.optional(),
  localVistoria: texto.optional(),
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
        papel: z.enum([
          'perito_judicial',
          'reclamante',
          'engenheiro_assistente_reclamante',
          'tecnico_assistente_reclamante',
          'assistente_reclamante',
          'engenheiro_assistente_reclamada',
          'tecnico_assistente_reclamada',
          'assistente_reclamada',
          'advogado_reclamante',
          'advogado_reclamada',
          'preposto',
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
  /// As fotos são criadas em POST /pericias/:id/fotos. Aqui só
  /// chegam as edições de legenda/ordem e as remoções.
  fotos: z
    .array(z.object({ id: z.string(), legenda: texto, ordem: z.number().int().default(0) }))
    .default([]),
})

const nulo = (v?: string) => (v?.trim() ? v.trim() : null)

/** GET /pericias */
periciasRouter.get(
  '/',
  rota(async (_req, res) => {
    const pericias = await prisma.pericia.findMany({
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
    const pericia = await prisma.pericia.findUnique({
      where: { id: parametro(req, 'id') },
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

    const escalares = {
      numeroProcesso: d.numeroProcesso,
      vara: d.vara,
      comarca: d.comarca,
      reclamante: d.reclamante,
      cpfReclamante: nulo(d.cpfReclamante),
      funcaoReclamante: nulo(d.funcaoReclamante),
      admissao: nulo(d.admissao),
      demissao: nulo(d.demissao),
      dataVistoria: nulo(d.dataVistoria),
      horaVistoria: nulo(d.horaVistoria),
      localVistoria: nulo(d.localVistoria),
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
          papel: p.papel,
          registro: nulo(p.registro),
          contato: nulo(p.contato),
        })),
      },
    }

    const existente = d.id ? await prisma.pericia.findUnique({ where: { id: d.id } }) : null

    const pericia = await prisma.$transaction(async (tx) => {
      if (!existente) {
        return tx.pericia.create({
          data: {
            ...(d.id ? { id: d.id } : {}),
            ...escalares,
            responsavelId: d.responsavelId || sessao.id,
            ...filhos,
          },
          include: incluirTudo,
        })
      }

      await tx.reclamada.deleteMany({ where: { periciaId: existente.id } })
      await tx.participante.deleteMany({ where: { periciaId: existente.id } })

      // Fotos ausentes na lista enviada foram removidas na tela.
      const idsMantidos = d.fotos.map((f) => f.id)
      const removidas = await tx.foto.findMany({
        where: { periciaId: existente.id, id: { notIn: idsMantidos.length ? idsMantidos : [''] } },
      })
      if (removidas.length) {
        await tx.foto.deleteMany({ where: { id: { in: removidas.map((f) => f.id) } } })
      }

      for (const f of d.fotos) {
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

      // Os arquivos só saem do disco depois do commit lógico.
      await Promise.all(removidas.map((f) => apagarUpload(f.arquivo)))

      return atualizada
    })

    res.status(existente ? 200 : 201).json(periciaParaApi(pericia))
  }),
)

/** DELETE /pericias/:id — leva junto fotos, reclamadas e participantes. */
periciasRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const fotos = await prisma.foto.findMany({ where: { periciaId: parametro(req, 'id') } })

    await prisma.pericia.delete({ where: { id: parametro(req, 'id') } })
    await Promise.all(fotos.map((f) => apagarUpload(f.arquivo)))

    res.status(204).end()
  }),
)
