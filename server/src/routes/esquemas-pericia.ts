// Esquemas de validação do corpo da perícia, sem dependência de runtime.
//
// Moram fora de `pericias.ts` porque aquele módulo puxa `auth.ts` → `env.ts`,
// que chama `process.exit(1)` quando falta JWT_SECRET: importar a rota dentro
// de um teste derruba o processo inteiro, com a mensagem de validação de
// ambiente no lugar do resultado. Aqui só entra `zod`, e é por isso que
// `esquemas-pericia.test.ts` consegue conferir o contrato.
//
// `agenteSchema` é o quarto gêmeo de `AgenteAvaliado` (src/types/index.ts), e
// o mais perigoso: é um `z.object` sem `.strict()`, e o Zod 3 descarta em
// silêncio a chave que não declarou — o objeto podado é o que o Prisma grava.
// Campo novo entra nos DOIS lados, ou some no primeiro "Salvar rascunho" com
// HTTP 200 e nenhum erro. `src/types/chavesAgente.ts` trava esse par.
import { z } from 'zod'

export const texto = z.string().default('')
export const textoObrigatorio = z.string().trim().min(1)
export const dataIsoSchema = z
  .string()
  .regex(/^(?:|\d{4}-\d{2}-\d{2})$/, 'Use uma data com ano de quatro dígitos.')

export const periodoSchema = z.object({
  id: z.string(),
  funcao: texto,
  inicio: dataIsoSchema.default(''),
  fim: dataIsoSchema.optional(),
  setor: texto.optional(),
  descricaoAtividades: texto.optional(),
})

export const epiSelecionadoSchema = z.object({
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
  // O período em que o agente foi avaliado. Ver `AgenteAvaliado.periodoId`.
  // Sem esta linha o Zod apagaria o vínculo em silêncio a cada gravação.
  periodoId: texto.optional(),
  identificadoNaAtividade: z.boolean().optional(),
  cas: texto.optional(),
  anexoNr15: texto.optional(),
  anexoNr16: texto.optional(),
  referenciaNormativaId: texto.optional(),
  atividadeEnquadrada: texto.optional(),
  unidadeLimite: texto.optional(),
  limiteTolerancia: texto.optional(),
  medido: texto.optional(),
  valorMedido: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  // A medição da empresa (PGR, laudos ambientais) convive com a do
  // perito: o laudo guarda as duas e diz qual adotou. Quando ela variou
  // no período, vem como faixa — e o `Ate` é o topo, que é o adotado.
  medicaoEmpresa: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  medicaoEmpresaAte: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  tipoMedicaoEmpresa: z.enum(['valor', 'faixa', 'registros_processo']).optional(),
  fonteMedicaoEmpresa: texto.optional(),
  origemMedicao: z.enum(['perito', 'empresa', 'nao_informado']).optional(),
  fonteRuido: z.enum(['maquinas', 'ruido_fundo', 'administrativa']).optional(),
  areaRisco: texto.optional(),
  analiseAnexos: texto.optional(),
  exposicaoPericulosidade: z.enum(['permanente', 'intermitente', 'eventual', 'nao_constatada']).optional(),
  resultadoPericulosidade: z.enum(['caracterizada', 'nao_caracterizada', 'prejudicada']).optional(),
  // A redação própria e os pontos de verificação do anexo entram como
  // opcionais de propósito: perícias já gravadas não os têm e precisam
  // continuar validando na hora de salvar.
  exposicaoPericulosidadeTexto: texto.optional(),
  resultadoPericulosidadeTexto: texto.optional(),
  detalhesNr16: z.array(z.object({ id: texto, rotulo: texto, valor: texto })).max(20).optional(),
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
  alegacoesReclamante: texto,
  informacoesReclamada: texto,
  consideracoesDivergencias: texto,
  criterioAvaliacaoPericulosidade: texto,
  riscoAlegadoPericulosidade: texto,
  fonteRiscoAlegado: texto,
  notaTecnicaEpis: texto,
  protecoesColetivas: texto,
  analiseTecnica: texto,
  conclusao: texto,
  conclusaoInsalubridade: texto,
  conclusaoPericulosidade: texto,
  respostasQuesitos: texto,
  encerramento: texto,
  dataAssinatura: dataIsoSchema.optional(),
  cidadeAssinatura: texto.optional(),
  observacoesAdicionais: texto,
})
