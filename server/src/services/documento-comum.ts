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
  /**
   * Sistema visual dos documentos. Uma única cor de destaque — um azul-ardósia
   * sóbrio — em todos os títulos, para um visual padrão de peça técnica, sem
   * excesso de cores. Tabelas ficam com cabeçalho cinza-claro e corpo branco.
   */
  documentoTitulo: '2C3E50',
  documentoSecao: '2C3E50',
  documentoTexto: '333333',
  documentoBorda: 'D9DEE5',
  documentoFundo: 'FFFFFF',
  documentoTabela: 'EFF1F4',
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
  engenheiro_sst_empresa: 'Eng. Segurança do Trabalho',
  tecnico_sst_empresa: 'Téc. Segurança do Trabalho',
  gestor_lideranca: 'Gestor Imediato / Liderança',
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
  engenheiro_sst_empresa: 'Representação do Departamento de SST da empresa',
  tecnico_sst_empresa: 'Representação do Departamento de SST da empresa',
  gestor_lideranca: 'Esclarecimentos sobre atividades habituais, eventuais e demais aspectos da rotina de trabalho',
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

const CIDADE_COM_UF = /^(.+?)\s*\/\s*[A-Z]{2}$/i

export function cidadeDaVistoriaDocumento(localVistoria?: string | null): string {
  const endereco = localVistoria?.trim()
  if (!endereco) return ''

  const segmentos = endereco.split(/\s+[—–]\s+/).map((parte) => parte.trim()).filter(Boolean)
  const ultimo = segmentos.at(-1) ?? ''
  return ultimo.match(CIDADE_COM_UF)?.[1]?.trim() ?? ''
}

export function dadosAssinaturaDocumento(pericia: {
  dataVistoria?: string | null
  localVistoria?: string | null
  tecnico?: { dataAssinatura?: string; cidadeAssinatura?: string } | null
}): { cidade: string; data: string } {
  return {
    cidade:
      pericia.tecnico?.cidadeAssinatura?.trim() ||
      cidadeDaVistoriaDocumento(pericia.localVistoria) ||
      'Santo André',
    data:
      pericia.tecnico?.dataAssinatura?.trim() ||
      pericia.dataVistoria?.trim() ||
      hoje(),
  }
}

// ---- Período de avaliação da empresa ------------------------------------
// O laudo avalia os cinco anos anteriores ao ajuizamento da ação, ou o
// que houver a partir da admissão, se ela for posterior a esse marco.
//
// Espelha `src/lib/periodoAvaliacao.ts`. Os dois precisam mudar juntos:
// a tela mostra o período ao perito, este arquivo imprime o que vai ao
// juízo.

export interface PeriodoAvaliacaoDocumento {
  inicio: string
  fim?: string
  motivoInicio: 'prescricao' | 'admissao'
  marcoPrescricional: string
  foraDoPrazo: boolean
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}/

function comoDataIso(valor?: string | null): string {
  const limpo = (valor ?? '').trim()
  return DATA_ISO.test(limpo) ? limpo.slice(0, 10) : ''
}

/**
 * A mesma data, tantos anos antes. Ajuizamento em 29/02 não existe cinco
 * anos antes: o corte cai no último dia de fevereiro daquele ano.
 */
export function subtrairAnos(iso: string, anos: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  if (!ano || !mes || !dia) return iso
  const alvo = ano - anos
  const ultimoDiaDoMes = new Date(Date.UTC(alvo, mes, 0)).getUTCDate()
  const doisDigitos = (n: number) => String(n).padStart(2, '0')
  return `${alvo}-${doisDigitos(mes)}-${doisDigitos(Math.min(dia, ultimoDiaDoMes))}`
}

/** Sem data de ajuizamento não há conta a fazer — melhor nada que errado. */
export function periodoAvaliacaoDocumento(pericia: {
  dataAjuizamento?: string | null
  admissao?: string | null
  demissao?: string | null
}): PeriodoAvaliacaoDocumento | null {
  const ajuizamento = comoDataIso(pericia.dataAjuizamento)
  if (!ajuizamento) return null

  const marcoPrescricional = subtrairAnos(ajuizamento, 5)
  const admissao = comoDataIso(pericia.admissao)
  const demissao = comoDataIso(pericia.demissao)

  const comecaNaAdmissao = Boolean(admissao) && admissao > marcoPrescricional

  return {
    inicio: comecaNaAdmissao ? admissao : marcoPrescricional,
    fim: demissao || undefined,
    motivoInicio: comecaNaAdmissao ? 'admissao' : 'prescricao',
    marcoPrescricional,
    foraDoPrazo: Boolean(demissao) && demissao < marcoPrescricional,
  }
}

export function intervaloDoPeriodo(periodo: PeriodoAvaliacaoDocumento): string {
  if (periodo.foraDoPrazo) return 'Nenhum — contrato encerrado antes do marco prescricional'
  const inicio = data(periodo.inicio)
  return periodo.fim ? `${inicio} a ${data(periodo.fim)}` : `${inicio} até o fim do contrato`
}

// ---- Máscaras de documentos e contatos ----------------------------------
// Formatam apenas quando a contagem de dígitos bate; caso contrário devolvem
// o valor original limpo (ou "—"), para nunca inventar um número inválido.

/** "12345678000190" → "12.345.678/0001-90" */
export function mascaraCnpj(valor?: string | null): string {
  const d = (valor ?? '').replace(/\D/g, '')
  if (d.length !== 14) return (valor ?? '').trim() || '—'
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** "12345678900" → "123.456.789-00" */
export function mascaraCpf(valor?: string | null): string {
  const d = (valor ?? '').replace(/\D/g, '')
  if (d.length !== 11) return (valor ?? '').trim() || '—'
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** "06000000" → "06000-000" */
export function mascaraCep(valor?: string | null): string {
  const d = (valor ?? '').replace(/\D/g, '')
  if (d.length !== 8) return (valor ?? '').trim() || '—'
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** "11987654321" → "(11) 98765-4321"; "1133334444" → "(11) 3333-4444" */
export function mascaraTelefone(valor?: string | null): string {
  const d = (valor ?? '').replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return (valor ?? '').trim() || '—'
}

/** Texto livre → parágrafos, quebrando nas linhas em branco. */
export function emParagrafos(texto?: string | null): string[] {
  if (!texto?.trim()) return []
  return texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * Numera as seções do parecer na ordem em que elas realmente entram no
 * documento.
 *
 * Algumas seções são condicionais — uma perícia só de insalubridade não
 * tem a conclusão da NR-16, e nem todo processo traz quesitos. Com os
 * números escritos à mão, o documento entregue ao juízo pulava de "11."
 * para "13.". Contar aqui mantém HTML e DOCX numerando igual.
 *
 * `sub` numera dentro da última seção aberta (7.1, 7.2…) e recomeça a
 * cada seção nova.
 */
export function numeradorDeSecoes() {
  let secaoAtual = 0
  let subAtual = 0
  return {
    secao(titulo: string): string {
      secaoAtual += 1
      subAtual = 0
      return `${secaoAtual}. ${titulo}`
    },
    sub(titulo: string): string {
      subAtual += 1
      return `${secaoAtual}.${subAtual}. ${titulo}`
    },
  }
}

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
  marca?: string
  validadeCa?: string
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
  anexoNr16?: string
  referenciaNormativaId?: string
  atividadeEnquadrada?: string
  unidadeLimite?: string
  limiteTolerancia?: string
  medido?: string
  valorMedido?: string
  medicaoEmpresa?: string
  medicaoEmpresaAte?: string
  tipoMedicaoEmpresa?: TipoMedicaoEmpresaDocumento
  fonteMedicaoEmpresa?: string
  origemMedicao?: OrigemMedicaoDocumento
  fonteRuido?: FonteRuidoDocumento
  areaRisco?: string
  exposicaoPericulosidade?: 'permanente' | 'intermitente' | 'eventual' | 'nao_constatada'
  resultadoPericulosidade?: 'caracterizada' | 'nao_caracterizada' | 'prejudicada'
  unidadeMedicao?: 'ppm' | 'mg/m³' | '% O₂ em volume' | 'dB(A)' | 'dB(C)' | 'dB(Linear)' | 'IBUTG °C' | 'mSv/ano' | 'm/s²' | 'm/s¹·⁷⁵' | 'fibras/cm³'
  epis?: EpiDocumento[]
  epiEficaz?: boolean
  criterio: string
  grau?: string
  observacao?: string
}

export type OrigemMedicaoDocumento = 'perito' | 'empresa' | 'nao_informado'
export type TipoMedicaoEmpresaDocumento = 'valor' | 'faixa' | 'registros_processo'

export const TEXTO_MEDICAO_REGISTROS_PROCESSO =
  'Medição conforme registros apresentados junto ao processo.'

export const ROTULO_ORIGEM_MEDICAO: Record<OrigemMedicaoDocumento, string> = {
  perito: 'Perito — medição em perícia',
  empresa: 'Empresa — medição do período avaliado (PGR / laudos ambientais)',
  nao_informado: 'Não informado pelo perito — adotada a medição da empresa',
}

export const NOTA_ORIGEM_MEDICAO: Record<OrigemMedicaoDocumento, string> = {
  perito: 'Medição a ser informada no laudo pericial do perito.',
  empresa: 'Medição conforme registros apresentados junto ao processo.',
  nao_informado: 'Medição conforme registros apresentados junto ao processo.',
}

export type FonteRuidoDocumento = 'maquinas' | 'ruido_fundo' | 'administrativa'

export const FONTE_RUIDO: Record<FonteRuidoDocumento, { rotulo: string; frase: string }> = {
  maquinas: {
    rotulo: 'Máquinas e equipamentos',
    frase: 'Ruído proveniente de máquinas, equipamentos e demais dispositivos existentes no local.',
  },
  ruido_fundo: {
    rotulo: 'Ruído de fundo',
    frase: 'Não há fonte direta de ruído no local. O nível identificado corresponde ao ruído de fundo.',
  },
  administrativa: {
    rotulo: 'Atividade administrativa',
    frase:
      'Não há fonte de ruído relevante. Ambiente destinado a atividades administrativas, sem operação de máquinas ou equipamentos.',
  },
}

export interface MedicaoAdotadaDocumento {
  valor: string
  origem: OrigemMedicaoDocumento
  rotuloOrigem: string
  notaOrigem: string
  fonte?: string
  faixaEmpresa?: { de: string; ate: string }
  divergente: boolean
}

function maiorMedicao(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  return Number(b) > Number(a) ? b : a
}

/**
 * Qual medição o documento adota.
 *
 * A medição da empresa pode vir como faixa; quando vem, adota-se o topo
 * — é o pior cenário do período avaliado.
 *
 * Espelha `medicaoAdotada` de `src/lib/medicoes.ts`. Os dois precisam
 * mudar juntos: a tela mostra uma conclusão ao perito, este arquivo
 * imprime a que vai ao juízo.
 */
export function medicaoAdotadaDocumento(agente: AgenteDocumento): MedicaoAdotadaDocumento {
  const origem: OrigemMedicaoDocumento = agente.origemMedicao ?? 'perito'
  const doPerito = agente.valorMedido?.trim() ?? ''
  const deEmpresa = agente.medicaoEmpresa?.trim() ?? ''
  const ateEmpresa = agente.medicaoEmpresaAte?.trim() ?? ''
  const daEmpresa = maiorMedicao(deEmpresa, ateEmpresa)
  const fonte = agente.fonteMedicaoEmpresa?.trim() || undefined
  const faixaEmpresa =
    deEmpresa && ateEmpresa && Number(deEmpresa) !== Number(ateEmpresa)
      ? { de: deEmpresa, ate: ateEmpresa }
      : undefined
  const divergente = Boolean(doPerito && daEmpresa && Number(doPerito) !== Number(daEmpresa))
  const rotuloOrigem = ROTULO_ORIGEM_MEDICAO[origem]
  const notaOrigem = NOTA_ORIGEM_MEDICAO[origem]

  if (origem === 'perito') {
    return { valor: doPerito, origem, rotuloOrigem, notaOrigem, faixaEmpresa, divergente }
  }
  return { valor: daEmpresa, origem, rotuloOrigem, notaOrigem, fonte, faixaEmpresa, divergente }
}

function comUnidadeMedicao(valor: string, unidade?: string): string {
  const formatado = valor.replace('.', ',')
  return unidade ? `${formatado} ${unidade}` : formatado
}

function tipoMedicaoEmpresaDe(agente: AgenteDocumento): TipoMedicaoEmpresaDocumento {
  return agente.tipoMedicaoEmpresa ?? (agente.medicaoEmpresaAte ? 'faixa' : 'valor')
}

function formatarMedicaoEmpresa(agente: AgenteDocumento): string | null {
  const tipo = tipoMedicaoEmpresaDe(agente)
  if (tipo === 'registros_processo') return TEXTO_MEDICAO_REGISTROS_PROCESSO

  const de = agente.medicaoEmpresa?.trim() ?? ''
  const ate = agente.medicaoEmpresaAte?.trim() ?? ''
  if (tipo === 'faixa' && de && ate && Number(de) !== Number(ate)) {
    return `entre ${comUnidadeMedicao(de)} e ${comUnidadeMedicao(ate, agente.unidadeMedicao)}`
  }
  const valor = de || ate
  return valor ? comUnidadeMedicao(valor, agente.unidadeMedicao) : null
}

export function formatarMedicao(agente: AgenteDocumento): string {
  const valor = medicaoAdotadaDocumento(agente).valor
  if (valor) return comUnidadeMedicao(valor, agente.unidadeMedicao)
  if (tipoMedicaoEmpresaDe(agente) === 'registros_processo') {
    return TEXTO_MEDICAO_REGISTROS_PROCESSO
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

function anexoNr16Legivel(anexo?: string): string {
  const rotulos: Record<string, string> = {
    ANEXO_01: 'Anexo 1 — Atividades e Operações Perigosas com Explosivos',
    ANEXO_02: 'Anexo 2 — Atividades e Operações Perigosas com Inflamáveis',
    ANEXO_03: 'Anexo 3 — Segurança Pessoal ou Patrimonial',
    ANEXO_04: 'Anexo 4 — Atividades e Operações Perigosas com Energia Elétrica',
    ANEXO_05: 'Anexo 5 — Atividades Perigosas em Motocicleta',
    ANEXO_06: 'Anexo 6 — Agentes das Autoridades de Trânsito',
    ANEXO_RADIACOES: 'Anexo sem número — Radiações Ionizantes ou Substâncias Radioativas',
  }
  return anexo ? (rotulos[anexo] ?? anexo) : ''
}

const EXPOSICAO_PERICULOSIDADE: Record<string, string> = {
  permanente: 'Permanente',
  intermitente: 'Intermitente',
  eventual: 'Eventual ou por tempo extremamente reduzido',
  nao_constatada: 'Não constatada exposição a condição de risco que atenda aos critérios normativos de caracterização.',
}

const RESULTADO_PERICULOSIDADE: Record<string, { valor: string; destaque: LinhaApresentacaoAgente['destaque'] }> = {
  caracterizada: { valor: 'Periculosidade caracterizada', destaque: 'negativo' },
  nao_caracterizada: {
    valor: 'Não caracterizada periculosidade, por ausência de enquadramento nos critérios técnicos e normativos aplicáveis.',
    destaque: 'positivo',
  },
  prejudicada: { valor: 'Avaliação prejudicada por insuficiência de elementos', destaque: 'aviso' },
}

/**
 * Anexos julgados pela conta "medição − NRRsf": o 1 (contínuo ou
 * intermitente) e o 2 (impacto). Espelha `usaAtenuacaoRuido` do front —
 * os dois precisam mudar juntos, ou a tela e o laudo divergem.
 */
const ANEXOS_RUIDO = new Set(['ANEXO_01', 'ANEXO_02'])

/**
 * O limite vem da unidade: 85 dB(A) no Anexo 1; no Anexo 2, 130 dB(C)
 * na resposta Impacto ou 120 dB(Linear) na resposta Fast.
 */
const LIMITE_RUIDO_POR_UNIDADE = {
  'dB(A)': 85,
  'dB(C)': 130,
  'dB(Linear)': 120,
} as const

type UnidadeRuido = keyof typeof LIMITE_RUIDO_POR_UNIDADE

function unidadeRuido(unidade?: string): UnidadeRuido {
  return unidade && unidade in LIMITE_RUIDO_POR_UNIDADE ? (unidade as UnidadeRuido) : 'dB(A)'
}

function protecaoDocumento(
  agente: AgenteDocumento,
  epi: EpiDocumento,
  indice: number,
): ApresentacaoAgenteDocumento['protecoes'][number] {
  const manualAtual = Boolean(epi.validadeCa?.trim())
  const linhas: LinhaApresentacaoAgente[] = [
    { rotulo: manualAtual ? 'Equipamento' : 'Categoria', valor: epi.categoria },
    { rotulo: manualAtual ? 'Descrição' : 'Modelo', valor: epi.modelo },
    manualAtual
      ? { rotulo: 'Validade do CA', valor: epi.validadeCa!.trim() }
      : epi.marca?.trim() ? { rotulo: 'Marca', valor: epi.marca.trim() } : undefined,
    ...[
      epi.caUnico?.trim() ? { rotulo: 'CA', valor: epi.caUnico.trim() } : undefined,
      epi.caPecaFacial?.trim() ? { rotulo: 'CA da peça facial', valor: epi.caPecaFacial.trim() } : undefined,
      epi.caFiltroCartucho?.trim() ? { rotulo: 'CA do cartucho/filtro', valor: epi.caFiltroCartucho.trim() } : undefined,
    ].filter((linha): linha is LinhaApresentacaoAgente => Boolean(linha)),
  ].filter((linha): linha is LinhaApresentacaoAgente => Boolean(linha))

  if (ANEXOS_RUIDO.has(agente.anexoNr15 ?? '')) {
    const unidade = unidadeRuido(agente.unidadeMedicao)
    const limite = LIMITE_RUIDO_POR_UNIDADE[unidade]
    const adotada = medicaoAdotadaDocumento(agente).valor
    const medicao = adotada ? Number(adotada) : Number.NaN
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
      const eficaz = resultado <= limite
      linhas.push(
        { rotulo: 'Cálculo', valor: `${numeroDocumento(medicao)} - ${numeroDocumento(atenuacao)} = ${numeroDocumento(resultado)} ${unidade}` },
        {
          rotulo: 'Conclusão',
          valor: `${eficaz ? 'Proteção eficaz' : 'Proteção ineficaz'} (limite de ${numeroDocumento(limite)} ${unidade})`,
          destaque: eficaz ? 'positivo' : 'negativo',
        },
      )
    }
  } else {
    linhas.push({ rotulo: 'Eficácia comprovada', valor: agente.epiEficaz ? 'Sim' : 'Não', destaque: agente.epiEficaz ? 'positivo' : 'negativo' })
  }

  return { titulo: `Proteção ${indice + 1}`, linhas }
}

export function montarApresentacaoAgente(agente: AgenteDocumento): ApresentacaoAgenteDocumento {
  if (agente.tipo === 'periculosidade') {
    const resultado = agente.resultadoPericulosidade
      ? RESULTADO_PERICULOSIDADE[agente.resultadoPericulosidade]
      : undefined
    return {
      titulo: agente.nome || 'Risco de periculosidade não informado',
      linhas: [
        ...(agente.anexoNr16 ? [{ rotulo: 'Anexo NR-16', valor: anexoNr16Legivel(agente.anexoNr16) }] : []),
        { rotulo: 'Natureza', valor: 'Periculosidade' },
        { rotulo: 'Critério', valor: 'Qualitativo' },
        { rotulo: 'Adicional', valor: '30%' },
        ...(agente.atividadeEnquadrada?.trim()
          ? [{ rotulo: 'Atividade ou operação avaliada', valor: agente.atividadeEnquadrada.trim() }]
          : []),
        ...(agente.areaRisco?.trim()
          ? [{ rotulo: 'Condição ou área de risco', valor: agente.areaRisco.trim() }]
          : []),
        ...(agente.exposicaoPericulosidade
          ? [{ rotulo: 'Exposição', valor: EXPOSICAO_PERICULOSIDADE[agente.exposicaoPericulosidade]! }]
          : []),
        ...(resultado
          ? [{ rotulo: 'Resultado técnico', valor: resultado.valor, destaque: resultado.destaque }]
          : []),
      ],
      protecoes: [],
    }
  }

  const ruido = ANEXOS_RUIDO.has(agente.anexoNr15 ?? '')
  const qualitativo = agente.criterio === 'qualitativo'
  const somenteRegistrosEmpresa =
    tipoMedicaoEmpresaDe(agente) === 'registros_processo' && !medicaoAdotadaDocumento(agente).valor
  const linhas: LinhaApresentacaoAgente[] = [
    ...(agente.anexoNr15 ? [{ rotulo: 'Anexo NR-15', valor: anexoLegivel(agente.anexoNr15) }] : []),
    ...(agente.tipo ? [{ rotulo: 'Natureza', valor: NATUREZA_AGENTE[agente.tipo] ?? agente.tipo }] : []),
    { rotulo: 'Critério', valor: CRITERIO[agente.criterio] ?? agente.criterio },
    ...(agente.grau ? [{ rotulo: 'Grau', valor: GRAU[agente.grau] ?? agente.grau }] : []),
    ...(!ruido && agente.cas?.trim() ? [{ rotulo: 'CAS', valor: agente.cas.trim() }] : []),
    ...(agente.atividadeEnquadrada?.trim() ? [{ rotulo: 'Atividade ou referência normativa', valor: agente.atividadeEnquadrada.trim() }] : []),
    ...(agente.limiteTolerancia?.trim() ? [{ rotulo: 'Limite de tolerância', valor: limiteComUnidade(agente.limiteTolerancia, agente.unidadeLimite) }] : []),
    // A frase inteira, não o rótulo: o documento é lido por quem não
    // acompanhou a diligência, e "Ruído de fundo" sozinho não explica
    // por que o nível medido não vem de máquina nenhuma.
    ...(agente.fonteRuido ? [{ rotulo: 'Fonte do ruído', valor: FONTE_RUIDO[agente.fonteRuido].frase }] : []),
    ...(!qualitativo && (agente.valorMedido || agente.medicaoEmpresa || agente.medicaoEmpresaAte || agente.medido || agente.tipoMedicaoEmpresa === 'registros_processo')
      ? [{ rotulo: somenteRegistrosEmpresa ? 'Medição da empresa – PGR / Laudos Ocupacionais' : 'Medição registrada', valor: formatarMedicao(agente) }, ...linhasOrigemMedicao(agente)]
      : []),
  ]

  const epis = agente.epis ?? []
  const protecoes = epis.map((epi, indice) => protecaoDocumento(agente, epi, indice))

  // Vários protetores: o laudo avalia cada um e ainda precisa responder
  // se o melhor deles neutraliza a exposição.
  if (ruido && epis.length > 1) {
    const conjunto = conclusaoDoConjunto(agente, epis)
    if (conjunto) protecoes.push(conjunto)
  }

  return { titulo: agente.nome || 'Agente não informado', linhas, protecoes }
}

/**
 * De onde veio o número. Só entra no documento quando há divergência ou
 * escolha explícita — do contrário o laudo ganharia linhas para dizer
 * que o perito mediu, que é o esperado.
 */
function linhasOrigemMedicao(agente: AgenteDocumento): LinhaApresentacaoAgente[] {
  const adotada = medicaoAdotadaDocumento(agente)
  const medicaoEmpresa = formatarMedicaoEmpresa(agente)
  const origemExplicita = (agente.origemMedicao ?? 'perito') !== 'perito'
  if (!medicaoEmpresa && !origemExplicita) return []
  const somenteRegistros = tipoMedicaoEmpresaDe(agente) === 'registros_processo' && !adotada.valor

  return [
    { rotulo: 'Origem da medição', valor: adotada.rotuloOrigem, ...(adotada.divergente ? { destaque: 'aviso' as const } : {}) },
    { rotulo: 'Base da medição', valor: adotada.notaOrigem },
    ...(adotada.fonte ? [{ rotulo: 'Documento da empresa', valor: adotada.fonte }] : []),
    ...(medicaoEmpresa && !somenteRegistros
      ? [{ rotulo: 'Medição da empresa – PGR / Laudos Ocupacionais', valor: medicaoEmpresa }]
      : []),
  ]
}

function conclusaoDoConjunto(
  agente: AgenteDocumento,
  epis: EpiDocumento[],
): ApresentacaoAgenteDocumento['protecoes'][number] | undefined {
  const adotada = medicaoAdotadaDocumento(agente).valor
  const medicao = adotada ? Number(adotada) : Number.NaN
  if (!Number.isFinite(medicao)) return undefined

  const unidade = unidadeRuido(agente.unidadeMedicao)
  const limite = LIMITE_RUIDO_POR_UNIDADE[unidade]

  // Quem responde se a exposição foi neutralizada é o protetor que
  // atenua mais — não o primeiro que o perito associou.
  let indiceMelhor = 0
  let atenuacao = epis[0]?.nivelProtecaoDb ?? 0
  epis.forEach((epi, indice) => {
    const daVez = epi.nivelProtecaoDb ?? 0
    if (daVez > atenuacao) {
      atenuacao = daVez
      indiceMelhor = indice
    }
  })

  const maisAtenuante = epis[indiceMelhor]
  if (!maisAtenuante) return undefined

  const resultado = Number((medicao - atenuacao).toFixed(2))
  const eficaz = resultado <= limite

  return {
    titulo: `Conclusão do conjunto (${epis.length} protetores)`,
    linhas: [
      { rotulo: 'Protetor mais atenuante', valor: `Proteção ${indiceMelhor + 1} — ${maisAtenuante.modelo}` },
      { rotulo: 'Cálculo', valor: `${numeroDocumento(medicao)} - ${numeroDocumento(atenuacao)} = ${numeroDocumento(resultado)} ${unidade}` },
      {
        rotulo: 'Conclusão',
        valor: eficaz
          ? `Exposição neutralizada pelo protetor mais atenuante (limite de ${numeroDocumento(limite)} ${unidade})`
          : `Nenhum dos protetores associados neutraliza a exposição (limite de ${numeroDocumento(limite)} ${unidade})`,
        destaque: eficaz ? 'positivo' : 'negativo',
      },
    ],
  }
}

/** Estrutura do preenchimento técnico guardada em Pericia.tecnico. */
export interface TecnicoJson {
  apresentacao: string
  enderecamento: string
  objetivoPericia: string
  descricaoEmpresa: string
  descricaoAmbiente: string
  descricaoPostoTrabalho?: string
  maquinasFerramentas?: string
  produtosUtilizados?: string
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
  divergenciasFaticas?: string
  alegacoesReclamante?: string
  informacoesReclamada?: string
  consideracoesDivergencias?: string
  criterioAvaliacaoPericulosidade?: string
  notaTecnicaEpis?: string
  protecoesColetivas?: string
  analiseTecnica: string
  conclusao: string
  conclusaoInsalubridade?: string
  conclusaoPericulosidade?: string
  respostasQuesitos?: string
  encerramento?: string
  dataAssinatura?: string
  cidadeAssinatura?: string
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
