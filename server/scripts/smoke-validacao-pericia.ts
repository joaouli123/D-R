// Smoke test do contrato de agentes de perícia.
//
//   npm run smoke:pericia
//
// Confere que registros legados continuam válidos, que os novos
// metadados normativos são preservados e que enums inválidos são rejeitados.
import { readFileSync } from 'node:fs'

process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@127.0.0.1:5432/smoke'
process.env.JWT_SECRET ??= 'smoke-test-secret-with-at-least-32-characters'

const migracaoNumeroVistoria = readFileSync(
  new URL('../prisma/migrations/20260826104500_numero_vistoria/migration.sql', import.meta.url),
  'utf8',
)
const entrypoint = readFileSync(new URL('../docker-entrypoint.sh', import.meta.url), 'utf8')
const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')

const moduloPericias = await import('../src/routes/pericias.js')
const { agenteSchema } = moduloPericias
const tecnicoSchema = (
  moduloPericias as typeof moduloPericias & {
    tecnicoSchema?: { safeParse: (valor: unknown) => { success: boolean; data?: Record<string, unknown> } }
  }
).tecnicoSchema

const agenteLegado = {
  id: 'agn-legado',
  nome: 'Ruído contínuo',
  tipo: 'fisico',
  criterio: 'quantitativo',
  medido: '85 dB(A)',
}

const agenteCompleto = {
  ...agenteLegado,
  id: 'agn-completo',
  referenciaNormativaId: 'nr15-anexo-1',
  atividadeEnquadrada: 'Operação de prensa',
  unidadeLimite: 'dB(A)',
}

const agenteComEnumInvalido = {
  ...agenteLegado,
  tipo: 'ergonomico',
}

const epiSelecionado = {
  catalogoId: 'epi-1',
  categoria: 'Vapores Orgânicos',
  modelo: '3M 6200 + Cartucho 3M 6001',
  marca: '3M',
  caPecaFacial: '4115',
  caFiltroCartucho: '5635',
  observacao: 'Conjunto respiratório',
  nivelProtecaoDb: 17,
  metodoAtenuacao: 'NRRsf',
}

const agenteComMedicaoEEpi = {
  ...agenteLegado,
  id: 'agn-medicao-epi',
  valorMedido: '12.5',
  unidadeMedicao: 'ppm',
  epis: [epiSelecionado],
}

const agenteComValorMedidoInvalido = {
  ...agenteLegado,
  valorMedido: 'doze',
  unidadeMedicao: 'ppm',
}

const agenteComMedicaoDosRegistros = {
  ...agenteLegado,
  tipoMedicaoEmpresa: 'registros_processo',
  origemMedicao: 'nao_informado',
}

const agenteComTipoMedicaoEmpresaInvalido = {
  ...agenteLegado,
  tipoMedicaoEmpresa: 'texto_livre',
}

const medicoesPorUnidade = [
  'ppm', 'mg/m³', '% O₂ em volume', 'dB(A)', 'dB(C)', 'dB(Linear)',
  'IBUTG °C', 'mSv/ano', 'm/s²', 'm/s¹·⁷⁵', 'fibras/cm³',
].map((unidadeMedicao) =>
  agenteSchema.safeParse({ ...agenteLegado, valorMedido: '1.5', unidadeMedicao }),
)

const agenteComMuitosEpis = {
  ...agenteLegado,
  epis: Array.from({ length: 11 }, (_, indice) => ({ ...epiSelecionado, catalogoId: `epi-${indice}` })),
}

const agenteComEpiSemCamposObrigatorios = {
  ...agenteLegado,
  epis: [{ catalogoId: 'epi-incompleto' }],
}

const agenteComEpiComCamposObrigatoriosVazios = {
  ...agenteLegado,
  epis: [{ ...epiSelecionado, categoria: ' ', modelo: '', marca: '  ' }],
}

const agenteComEpiMinimo = {
  ...agenteLegado,
  epis: [{ categoria: 'Vapores Orgânicos', modelo: '3M 6200', marca: '3M' }],
}

const agenteComEpiManual = {
  ...agenteLegado,
  epis: [{
    categoria: 'Protetor auditivo',
    modelo: 'Protetor tipo concha',
    validadeCa: '31/12/2028',
    caUnico: '11882',
    nivelProtecaoDb: 13,
    metodoAtenuacao: 'NRRsf',
  }],
}

const tecnicoNaNovaEstrutura = {
  apresentacao: '',
  enderecamento: '',
  objetivoPericia: '',
  descricaoEmpresa: '',
  descricaoAmbiente: '',
  descricaoPostoTrabalho: 'Posto de soldagem',
  maquinasFerramentas: 'Máquina de solda e esmerilhadeira',
  produtosUtilizados: 'Argônio e oxigênio',
  atividadesFuncoes: '',
  periodos: [],
  agentes: [],
  normasReferencias: '',
  equipamentosAnalisados: '',
  informacoesLevantadas: '',
  divergenciasFaticas: '',
  alegacoesReclamante: 'Versão apresentada pelo reclamante',
  informacoesReclamada: 'Versão apresentada pela reclamada',
  consideracoesDivergencias: 'Síntese técnica das divergências',
  criterioAvaliacaoPericulosidade: 'Avaliação qualitativa conforme a NR-16',
  notaTecnicaEpis: 'Primazia da realidade e conjunto probatório',
  protecoesColetivas: 'Exaustão localizada',
  analiseTecnica: '',
  conclusao: '',
  conclusaoInsalubridade: 'Não caracterizada',
  conclusaoPericulosidade: 'Não caracterizada',
  respostasQuesitos: 'Quesitos respondidos no corpo do parecer',
  encerramento: 'Parecer composto por folhas rubricadas.',
  observacoesAdicionais: '',
}

const legado = agenteSchema.safeParse(agenteLegado)
const completo = agenteSchema.safeParse(agenteCompleto)
const enumInvalido = agenteSchema.safeParse(agenteComEnumInvalido)
const medicaoEEpi = agenteSchema.safeParse(agenteComMedicaoEEpi)
const valorMedidoInvalido = agenteSchema.safeParse(agenteComValorMedidoInvalido)
const medicaoDosRegistros = agenteSchema.safeParse(agenteComMedicaoDosRegistros)
const tipoMedicaoEmpresaInvalido = agenteSchema.safeParse(agenteComTipoMedicaoEmpresaInvalido)
const muitosEpis = agenteSchema.safeParse(agenteComMuitosEpis)
const epiSemCamposObrigatorios = agenteSchema.safeParse(agenteComEpiSemCamposObrigatorios)
const epiComCamposObrigatoriosVazios = agenteSchema.safeParse(agenteComEpiComCamposObrigatoriosVazios)
const epiMinimo = agenteSchema.safeParse(agenteComEpiMinimo)
const epiManual = agenteSchema.safeParse(agenteComEpiManual)
const novaEstrutura = tecnicoSchema?.safeParse(tecnicoNaNovaEstrutura)

const resultados = [
  {
    nome: 'registro legado é aceito',
    ok: legado.success && legado.data.medido === '85 dB(A)' && legado.data.epis?.length === 0,
  },
  {
    nome: 'novos metadados normativos são preservados',
    ok:
      completo.success &&
      completo.data.referenciaNormativaId === 'nr15-anexo-1' &&
      completo.data.atividadeEnquadrada === 'Operação de prensa' &&
      completo.data.unidadeLimite === 'dB(A)',
  },
  {
    nome: 'tipo de agente inválido é rejeitado',
    ok: !enumInvalido.success,
  },
  {
    nome: 'medição estruturada e snapshot de EPI são preservados',
    ok:
      medicaoEEpi.success &&
      medicaoEEpi.data.valorMedido === '12.5' &&
      medicaoEEpi.data.unidadeMedicao === 'ppm' &&
      medicaoEEpi.data.epis.length === 1 &&
      medicaoEEpi.data.epis[0]?.catalogoId === 'epi-1' &&
      medicaoEEpi.data.epis[0]?.caPecaFacial === '4115' &&
      medicaoEEpi.data.epis[0]?.caFiltroCartucho === '5635' &&
      medicaoEEpi.data.epis[0]?.observacao === 'Conjunto respiratório' &&
      medicaoEEpi.data.epis[0]?.nivelProtecaoDb === 17 &&
      medicaoEEpi.data.epis[0]?.metodoAtenuacao === 'NRRsf',
  },
  {
    nome: 'valor medido não numérico é rejeitado',
    ok: !valorMedidoInvalido.success,
  },
  {
    nome: 'terceira forma da medição da empresa é preservada e enum inválido é rejeitado',
    ok:
      medicaoDosRegistros.success &&
      medicaoDosRegistros.data.tipoMedicaoEmpresa === 'registros_processo' &&
      !tipoMedicaoEmpresaInvalido.success,
  },
  {
    nome: 'todas as unidades estruturadas dos anexos são aceitas',
    ok: medicoesPorUnidade.every((resultado) => resultado.success),
  },
  {
    nome: 'mais de dez EPIs é rejeitado',
    ok: !muitosEpis.success,
  },
  {
    nome: 'snapshot de EPI incompleto ou vazio é rejeitado sem exigir campos opcionais',
    ok: !epiSemCamposObrigatorios.success && !epiComCamposObrigatoriosVazios.success && epiMinimo.success,
  },
  {
    nome: 'cadastro manual preserva a validade do CA sem exigir marca',
    ok: epiManual.success && epiManual.data.epis[0]?.validadeCa === '31/12/2028',
  },
  {
    nome: 'estrutura enxuta do parecer é preservada pelo contrato da perícia',
    ok:
      novaEstrutura?.success === true &&
      novaEstrutura.data?.descricaoPostoTrabalho === 'Posto de soldagem' &&
      novaEstrutura.data?.protecoesColetivas === 'Exaustão localizada' &&
      novaEstrutura.data?.alegacoesReclamante === 'Versão apresentada pelo reclamante' &&
      novaEstrutura.data?.informacoesReclamada === 'Versão apresentada pela reclamada' &&
      novaEstrutura.data?.consideracoesDivergencias === 'Síntese técnica das divergências' &&
      novaEstrutura.data?.criterioAvaliacaoPericulosidade === 'Avaliação qualitativa conforme a NR-16' &&
      novaEstrutura.data?.notaTecnicaEpis === 'Primazia da realidade e conjunto probatório' &&
      novaEstrutura.data?.conclusaoPericulosidade === 'Não caracterizada' &&
      novaEstrutura.data?.encerramento === 'Parecer composto por folhas rubricadas.',
  },
  {
    nome: 'migração do número é idempotente e recupera somente a falha conhecida',
    ok:
      migracaoNumeroVistoria.includes('ADD COLUMN IF NOT EXISTS "numeroVistoria"') &&
      entrypoint.includes('prisma migrate resolve --rolled-back "$MIGRACAO_RECUPERAVEL"'),
  },
  {
    nome: 'imagem contém os dois clientes aceitos pelo healthcheck do Coolify',
    ok: dockerfile.includes('       curl \\') && dockerfile.includes('       wget \\'),
  },
]

for (const resultado of resultados) {
  console.log(`${resultado.ok ? '✓' : '✗'} ${resultado.nome}`)
}

const falhas = resultados.filter((resultado) => !resultado.ok).length
console.log(`\n${resultados.length} verificações · ${falhas} falhas\n`)
process.exitCode = falhas ? 1 : 0
