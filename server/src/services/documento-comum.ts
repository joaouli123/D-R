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
  reclamante: 'Reclamante',
  engenheiro_assistente_reclamante: 'Eng. Segurança do Trabalho - Assistente Técnico',
  tecnico_assistente_reclamante: 'Téc. Segurança do Trabalho - Assistente Técnico',
  perito_judicial: 'Perito Judicial do Trabalho',
  assistente_reclamante: 'Assistente Técnico do Reclamante',
  engenheiro_assistente_reclamada: 'Eng. Segurança do Trabalho - Assistente Técnico',
  tecnico_assistente_reclamada: 'Téc. Segurança do Trabalho - Assistente Técnico',
  assistente_reclamada: 'Assistente Técnico da Reclamada',
  advogado_reclamante: 'Advogado (a)',
  advogado_reclamada: 'Advogado (a)',
  preposto: 'Preposto',
  auxiliar_perito: 'Auxiliar do Perito',
  paradigma: 'Paradigma',
  entrevistado: 'Entrevistado',
  acompanhante: 'Acompanhante',
}

export const ATUACAO: Record<string, string> = {
  reclamante: 'Apresentação das suas alegações.',
  engenheiro_assistente_reclamante: 'Acompanhamento Técnico – Reclamante',
  tecnico_assistente_reclamante: 'Acompanhamento Técnico – Reclamante',
  assistente_reclamante: 'Acompanhamento Técnico – Reclamante',
  advogado_reclamante: 'Representante Jurídico - Reclamante.',
  engenheiro_assistente_reclamada: 'Acompanhamento Técnico – Reclamada',
  tecnico_assistente_reclamada: 'Acompanhamento Técnico – Reclamada',
  assistente_reclamada: 'Acompanhamento Técnico – Reclamada',
  advogado_reclamada: 'Representante Jurídico - Reclamada.',
  preposto: 'Representação da Reclamada, prestação de esclarecimentos e narrativa da defesa',
  perito_judicial: 'Condução da diligência pericial',
  auxiliar_perito: 'Auxílio e suporte ao Perito',
  paradigma: 'Demonstração das atividades exercidas',
  entrevistado: 'Prestação de informações complementares',
  acompanhante: 'Prestação de informações complementares',
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

export interface EpiDocumento {
  catalogoId?: string
  categoria: string
  modelo: string
  marca: string
  caUnico?: string
  caPecaFacial?: string
  caFiltroCartucho?: string
  nivelProtecaoDb?: number | null
  metodoAtenuacao?: 'NRRsf' | null
  observacao?: string
}

export interface AgenteDocumento {
  id: string
  nome: string
  tipo?: string
  cas?: string
  anexoNr15?: string
  referenciaNormativaId?: string
  atividadeEnquadrada?: string
  unidadeLimite?: string
  limiteTolerancia?: string
  medido?: string
  valorMedido?: string
  unidadeMedicao?: 'ppm' | 'mg/m³' | '% O₂ em volume' | 'dB(A)' | 'dB(C)' | 'dB(Linear)' | 'IBUTG °C' | 'mSv/ano' | 'm/s²' | 'm/s¹·⁷⁵' | 'fibras/cm³'
  epis?: EpiDocumento[]
  epiEficaz?: boolean
  criterio: string
  grau?: string
}

export function formatarMedicao(agente: AgenteDocumento): string {
  const valor = agente.valorMedido?.trim()
  if (valor) {
    const formatado = valor.replace('.', ',')
    return agente.unidadeMedicao ? `${formatado} ${agente.unidadeMedicao}` : formatado
  }
  return agente.medido?.trim() || '—'
}

export function formatarCasEpi(epi: EpiDocumento): string[] {
  return [
    epi.caUnico?.trim() ? `CA: ${epi.caUnico.trim()}` : undefined,
    epi.caPecaFacial?.trim() ? `CA da peça facial: ${epi.caPecaFacial.trim()}` : undefined,
    epi.caFiltroCartucho?.trim()
      ? `CA do cartucho/filtro: ${epi.caFiltroCartucho.trim()}`
      : undefined,
  ].filter((linha): linha is string => Boolean(linha))
}

export interface LinhaApresentacaoAgente {
  rotulo: string
  valor: string
  destaque?: 'positivo' | 'negativo' | 'aviso'
}

export interface ApresentacaoAgenteDocumento {
  titulo: string
  linhas: LinhaApresentacaoAgente[]
  protecoes: { titulo: string; linhas: LinhaApresentacaoAgente[] }[]
}

const NATUREZA_AGENTE: Record<string, string> = {
  quimico: 'Químico', fisico: 'Físico', biologico: 'Biológico', periculosidade: 'Periculosidade',
}

function numeroDocumento(valor: number | string): string {
  return String(valor).replace('.', ',')
}

function anexoLegivel(anexo?: string): string {
  const rotulos: Record<string, string> = {
    ANEXO_01: 'Anexo 1 — Ruído Contínuo ou Intermitente',
    ANEXO_02: 'Anexo 2 — Ruído de Impacto',
    ANEXO_03: 'Anexo 3 — Exposição ao Calor',
    ANEXO_05: 'Anexo 5 — Radiações Ionizantes',
    ANEXO_06: 'Anexo 6 — Trabalho sob Condições Hiperbáricas',
    ANEXO_07: 'Anexo 7 — Radiações Não Ionizantes',
    ANEXO_08_VMB: 'Anexo 8 — Vibrações em Mãos e Braços (VMB)',
    ANEXO_08_VCI: 'Anexo 8 — Vibrações de Corpo Inteiro (VCI)',
    ANEXO_09: 'Anexo 9 — Frio',
    ANEXO_10: 'Anexo 10 — Umidade',
    ANEXO_11: 'Anexo 11 — Agentes Químicos com Limite',
    ANEXO_12_ASBESTO: 'Anexo 12 — Poeiras Minerais: Asbesto/Amianto',
    ANEXO_12_MANGANES: 'Anexo 12 — Poeiras Minerais: Manganês',
    ANEXO_12_SILICA: 'Anexo 12 — Poeiras Minerais: Sílica Livre Cristalizada',
    ANEXO_13: 'Anexo 13 — Agentes Químicos (Atividades)',
    ANEXO_13A: 'Anexo 13-A — Benzeno',
    ANEXO_14: 'Anexo 14 — Agentes Biológicos',
  }
  return anexo ? (rotulos[anexo] ?? anexo) : ''
}

function protecaoDocumento(
  agente: AgenteDocumento,
  epi: EpiDocumento,
  indice: number,
): ApresentacaoAgenteDocumento['protecoes'][number] {
  const linhas: LinhaApresentacaoAgente[] = [
    { rotulo: 'Categoria', valor: epi.categoria },
    { rotulo: 'Modelo', valor: epi.modelo },
    { rotulo: 'Marca', valor: epi.marca },
    ...[
      epi.caUnico?.trim() ? { rotulo: 'CA', valor: epi.caUnico.trim() } : undefined,
      epi.caPecaFacial?.trim() ? { rotulo: 'CA da peça facial', valor: epi.caPecaFacial.trim() } : undefined,
      epi.caFiltroCartucho?.trim() ? { rotulo: 'CA do cartucho/filtro', valor: epi.caFiltroCartucho.trim() } : undefined,
    ].filter((linha): linha is LinhaApresentacaoAgente => Boolean(linha)),
  ]

  if (agente.anexoNr15 === 'ANEXO_01') {
    const medicao = agente.valorMedido == null ? Number.NaN : Number(agente.valorMedido)
    const atenuacao = epi.nivelProtecaoDb ?? 0
    const resultado = Number.isFinite(medicao) ? Number((medicao - atenuacao).toFixed(2)) : null
    linhas.push({
      rotulo: 'NRRsf',
      valor: epi.nivelProtecaoDb == null ? 'Não informado — considerado 0 dB' : `${numeroDocumento(epi.nivelProtecaoDb)} dB`,
      ...(epi.nivelProtecaoDb == null ? { destaque: 'aviso' as const } : {}),
    })
    if (resultado == null) {
      linhas.push({ rotulo: 'Cálculo', valor: 'Medição registrada não informada', destaque: 'aviso' })
    } else {
      const eficaz = resultado <= 85
      linhas.push(
        { rotulo: 'Cálculo', valor: `${numeroDocumento(medicao)} - ${numeroDocumento(atenuacao)} = ${numeroDocumento(resultado)} dB(A)` },
        { rotulo: 'Conclusão', valor: eficaz ? 'Proteção eficaz' : 'Proteção ineficaz', destaque: eficaz ? 'positivo' : 'negativo' },
      )
    }
  } else {
    linhas.push({ rotulo: 'Eficácia comprovada', valor: agente.epiEficaz ? 'Sim' : 'Não', destaque: agente.epiEficaz ? 'positivo' : 'negativo' })
  }

  return { titulo: `Proteção ${indice + 1}`, linhas }
}

export function montarApresentacaoAgente(agente: AgenteDocumento): ApresentacaoAgenteDocumento {
  const ruido = agente.anexoNr15 === 'ANEXO_01'
  const qualitativo = agente.criterio === 'qualitativo'
  const linhas: LinhaApresentacaoAgente[] = [
    ...(agente.anexoNr15 ? [{ rotulo: 'Anexo NR-15', valor: anexoLegivel(agente.anexoNr15) }] : []),
    ...(agente.tipo ? [{ rotulo: 'Natureza', valor: NATUREZA_AGENTE[agente.tipo] ?? agente.tipo }] : []),
    { rotulo: 'Critério', valor: CRITERIO[agente.criterio] ?? agente.criterio },
    ...(agente.grau ? [{ rotulo: 'Grau', valor: GRAU[agente.grau] ?? agente.grau }] : []),
    ...(!ruido && agente.cas?.trim() ? [{ rotulo: 'CAS', valor: agente.cas.trim() }] : []),
    ...(agente.atividadeEnquadrada?.trim() ? [{ rotulo: 'Atividade ou referência normativa', valor: agente.atividadeEnquadrada.trim() }] : []),
    ...(agente.limiteTolerancia?.trim() ? [{ rotulo: 'Limite de tolerância', valor: limiteComUnidade(agente.limiteTolerancia, agente.unidadeLimite) }] : []),
    ...(!qualitativo && (agente.valorMedido || agente.medido) ? [{ rotulo: 'Medição registrada', valor: formatarMedicao(agente) }] : []),
  ]
  return {
    titulo: agente.nome || 'Agente não informado',
    linhas,
    protecoes: (agente.epis ?? []).map((epi, indice) => protecaoDocumento(agente, epi, indice)),
  }
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
  agentes: AgenteDocumento[]
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
