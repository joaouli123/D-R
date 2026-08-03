// ============================================================
// Vocabulário e formatação compartilhados pelas duas saídas do
// documento (HTML → PDF e DOCX). Manter aqui evita que o rótulo
// de um grau de insalubridade divirja entre os dois formatos.
// ============================================================

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
