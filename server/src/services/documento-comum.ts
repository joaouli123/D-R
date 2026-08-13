// ============================================================
// Vocabulário e formatação compartilhados pelas duas saídas do
// documento (HTML → PDF e DOCX). Manter aqui evita que o rótulo
// de um grau de insalubridade divirja entre os dois formatos.
// ============================================================

/**
 * Identidade visual, espelhando tailwind.config.js do frontend.
 * O documento gerado tem de sair com a mesma marca da tela, então
 * uma troca de identidade se resolve aqui e não espalhada pelos
 * geradores de PDF e DOCX.
 */
export const MARCA = {
  /** brand-700 — azul principal do logotipo */
  primaria: '173F9B',
  /** navy-600 — azul das credenciais */
  credencial: '1B3A6B',
  tinta900: '161A21',
  tinta800: '262C37',
  tinta600: '4D5668',
  tinta500: '69748A',
  tinta400: '94A0B2',
  tinta300: 'C3CBD6',
  tinta100: 'EEF1F5',
} as const

/** A mesma paleta com o "#", para uso em CSS. */
export const css = (cor: string): string => `#${cor}`

export const PAPEL: Record<string, string> = {
  perito_judicial: 'Perito Judicial',
  assistente_reclamante: 'Assistente Técnico do Reclamante',
  assistente_reclamada: 'Assistente Técnico da Reclamada',
  advogado_reclamante: 'Advogado do Reclamante',
  advogado_reclamada: 'Advogado da Reclamada',
  preposto: 'Preposto',
  acompanhante: 'Acompanhante',
}

export const CRITERIO: Record<string, string> = {
  qualitativo: 'Qualitativo',
  quantitativo: 'Quantitativo',
  nao_aplicavel: 'Não aplicável',
}

export const GRAU: Record<string, string> = {
  minimo: 'Mínimo (10%)',
  medio: 'Médio (20%)',
  maximo: 'Máximo (40%)',
  nao_caracterizado: 'Não caracterizado',
}

export const SECAO_FOTO: Record<string, string> = {
  ambiente: 'Ambiente de Trabalho',
  atividades: 'Atividades Desenvolvidas',
  equipamentos: 'Equipamentos e Máquinas',
  epi: 'Equipamentos de Proteção Individual',
  produtos: 'Produtos Químicos Utilizados',
  documentos: 'Documentos Apresentados',
}

export const AGENTE_LABEL: Record<string, string> = {
  ruido: 'Ruído',
  calor: 'Calor',
  biologico: 'Agentes Biológicos',
  periculosidade: 'Periculosidade',
}

export const ORIGEM_PONTO: Record<string, string> = {
  juizo: 'Do MM. Juízo',
  reclamante: 'Do Reclamante',
  reclamada: 'Da Reclamada',
}

export const MODALIDADE_LABEL: Record<string, string> = {
  insalubridade: 'Insalubridade',
  periculosidade: 'Periculosidade',
  ambas: 'Insalubridade e Periculosidade',
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "2026-07-15" → "15/07/2026" */
export function data(iso?: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

/** "2026-07-15" → "15 de julho de 2026" */
export function extenso(iso?: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return String(iso)
  return `${d} de ${MESES[m - 1]} de ${y}`
}

export const hoje = (): string => new Date().toISOString().slice(0, 10)

/** Texto livre → parágrafos, quebrando nas linhas em branco. */
export function emParagrafos(texto?: string | null): string[] {
  if (!texto?.trim()) return []
  return texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export const VAZIO = '[Seção não preenchida]'

/**
 * Acrescenta a unidade informada pela referência normativa apenas quando o
 * limite ainda não a traz. Referências com mais de uma unidade (ex.: ppm |
 * mg/m³) são consideradas cobertas quando todos os seus componentes já
 * aparecem no limite.
 */
export function limiteComUnidade(limite?: string, unidade?: string): string {
  const valor = limite?.trim() ?? ''
  const medida = unidade?.trim() ?? ''
  if (!medida) return valor || '—'
  if (!valor) return medida

  const componentes = medida.split('|').map((parte) => parte.trim()).filter(Boolean)
  const jaContemUnidade = componentes.length > 0 && componentes.every((parte) => valor.includes(parte))
  return jaContemUnidade ? valor : `${valor} (${medida})`
}

/** Estrutura do preenchimento técnico guardada em Pericia.tecnico. */
export interface TecnicoJson {
  apresentacao: string
  enderecamento: string
  objetivoPericia: string
  descricaoEmpresa: string
  descricaoAmbiente: string
  atividadesFuncoes: string
  periodos: {
    id: string
    funcao: string
    setor?: string
    inicio: string
    fim?: string
    descricaoAtividades?: string
  }[]
  agentes: {
    id: string
    nome: string
    cas?: string
    anexoNr15?: string
    referenciaNormativaId?: string
    atividadeEnquadrada?: string
    unidadeLimite?: string
    limiteTolerancia?: string
    medido?: string
    criterio: string
    grau?: string
  }[]
  normasReferencias: string
  equipamentosAnalisados: string
  informacoesLevantadas: string
  analiseTecnica: string
  conclusao: string
  observacoesAdicionais: string
}

export interface ConteudoQuesitos {
  quesitos?: { pergunta: string; resposta: string }[]
}

export interface ConteudoManifestacao {
  agente?: string
  posicionamento?: string
  fundamentacao?: string
  blocos?: { titulo: string; conteudo: string }[]
  encerramento?: string
}

export interface ConteudoEsclarecimento {
  agente?: string
  referencia?: string
  introducao?: string
  pontos?: { origem: string; questionamento: string; resposta: string }[]
  conclusao?: string
}
