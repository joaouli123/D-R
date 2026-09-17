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
  parte_reclamante_ausente: 'Parte reclamante ausente',
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
  representante_setorial: 'Representante Setorial',
  recursos_humanos: 'Recursos Humanos',
  auxiliar_perito: 'Auxiliar do Perito',
  paradigma: 'Paradigma',
  entrevistado: 'Entrevistado',
  acompanhante: 'Participante Autorizado',
}

export const ATUACAO: Record<string, string> = {
  reclamante: 'Apresentação das suas alegações.',
  parte_reclamante_ausente: 'A parte reclamante não compareceu para a apresentação de suas alegações.',
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
  representante_setorial: 'Acompanhamento e esclarecimentos pertinentes ao setor.',
  recursos_humanos: 'Acompanhamento e esclarecimentos pertinentes à área administrativa.',
  perito_judicial: 'Condução da diligência pericial',
  auxiliar_perito: 'Auxílio e suporte ao Perito',
  paradigma: 'Demonstração das atividades exercidas',
  entrevistado: 'Prestação de informações complementares',
  acompanhante: 'Pessoa autorizada pelo juiz para acompanhar na diligência.',
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

// Ordem em que as secoes de fotografia aparecem NO DOCUMENTO: ambiente (3.1),
// atividades (6.1), equipamentos (6.2), documentos (6.3) e produtos (6.4).
//
// 'epi' nao e mais oferecida no editor (dobrada em 'documentos', pedido do
// cliente), mas compartilha o mesmo numero aqui: fotos ja gravadas naquela
// secao continuam saindo junto das evidencias do 6.3, em vez de sumir do
// documento.
//
// Espelha src/lib/fotosDocumento.ts: os dois precisam mudar juntos, senao a
// previa numera as fotos diferente do PDF e do DOCX. Nao e a ordem de
// SECOES_FOTO do editor (src/pages/PericiaEditor.tsx), que agrupa por
// afinidade para quem esta enviando as fotos.
export const ORDEM_SECAO_FOTO: Record<string, number> = {
  ambiente: 0,
  atividades: 1,
  equipamentos: 2,
  documentos: 3,
  epi: 3,
  produtos: 4,
}

export const SECAO_FOTO: Record<string, string> = {
  ambiente: 'Ambiente de Trabalho',
  atividades: 'Atividades Desenvolvidas',
  equipamentos: 'Equipamentos e Máquinas',
  produtos: 'Produtos Químicos Utilizados',
  documentos: 'Documentos Apresentados',
  epi: 'Equipamentos de Proteção Individual',
}

/**
 * Ordena as fotos na sequencia em que elas saem no documento e nao pela
 * coluna `ordem` sozinha: ate a correcao de server/src/routes/fotos.ts o
 * contador de `ordem` era por secao, entao fotos de secoes diferentes
 * empatam nas pericias ja gravadas e a legenda "Fotografia N" saia fora de
 * sequencia. O desempate final pelo id mantem o resultado estavel.
 */
export function fotosEmOrdemDeDocumento<T extends { secao: string; ordem: number; id: string }>(
  fotos: readonly T[],
): T[] {
  return [...fotos].sort(
    (a, b) =>
      ((ORDEM_SECAO_FOTO[a.secao] ?? 99) - (ORDEM_SECAO_FOTO[b.secao] ?? 99)) ||
      a.ordem - b.ordem ||
      a.id.localeCompare(b.id),
  )
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

export function objetivoAutomaticoDocumento(modalidade: string): string {
  const insalubridade = 'Avaliar, sob o ponto de vista técnico, a caracterização ou não de insalubridade, nos termos da NR-15, e, quando caracterizada, indicar o respectivo grau: mínimo, médio ou máximo.'
  const periculosidade = 'Avaliar, sob o ponto de vista técnico, a caracterização ou não de periculosidade, nos termos da NR-16, e, quando caracterizada, indicar o respectivo percentual.'
  if (modalidade === 'insalubridade') return insalubridade
  if (modalidade === 'periculosidade') return periculosidade
  return `${insalubridade}\n\n${periculosidade}`
}

export function horarioDaVistoriaDocumento(pericia: {
  horaVistoria?: string | null
  horaFimVistoria?: string | null
}): string {
  const inicio = pericia.horaVistoria?.trim()
  const fim = pericia.horaFimVistoria?.trim()
  if (inicio && fim) return `, das ${inicio} às ${fim}`
  if (inicio) return `, com início às ${inicio}`
  if (fim) return `, com término às ${fim}`
  return ''
}

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

/**
 * Texto livre → parágrafos, quebrando nas linhas em branco.
 *
 * O recorte das pontas preserva o TAB inicial de propósito: ele é o
 * marcador de "linha recuada sem marcador" da matriz do perito (item
 * 4.2.1, Anexos da NR-16) e some se usarmos `trim()` puro quando a
 * primeira linha do bloco já é um item recuado.
 */
export function emParagrafos(texto?: string | null): string[] {
  if (!texto?.trim()) return []
  return texto
    .split(/\n{2,}/)
    .map((p) => p.replace(/^[ \r\n]+/, '').replace(/\s+$/, ''))
    .filter(Boolean)
}

/**
 * Espelha src/lib/listasDocumento.ts. Os dois precisam mudar juntos.
 *
 * A matriz do perito usa dois formatos de lista dentro de um mesmo
 * bloco de texto, e os três renderizadores (pré-visualização, PDF e
 * DOCX) precisam lê-los do mesmo jeito:
 *   "• item"  → item de lista com marcador (marcador em 1,25 cm,
 *               texto em 2,25 cm, alinhado à esquerda);
 *   "\titem"  → linha recuada SEM marcador (os Anexos da NR-16).
 * Qualquer outra linha continua sendo parágrafo justificado.
 *
 * Só o TAB conta como recuo sem marcador. Espaços à esquerda não
 * contam: os mesmos campos guardam texto colado de outros documentos,
 * que costuma vir indentado com espaços sem nenhuma intenção de lista.
 *
 * O marcador e o TAB são REMOVIDOS do texto — quem devolve o glifo é o
 * renderizador. É isso que permite ao DOCX usar a numeração nativa do
 * Word em vez de escrever "•" como caractere comum.
 */
export type TipoLinhaBloco = 'texto' | 'item' | 'item-sem-marcador'
export interface LinhaBloco {
  tipo: TipoLinhaBloco
  texto: string
}
export const MARCADOR_LISTA = '•'

export function linhasDoBloco(bloco: string): LinhaBloco[] {
  return bloco.split(/\r?\n/).flatMap<LinhaBloco>((linha) => {
    const comMarcador = linha.match(/^\s*•\s*(.*)$/)
    if (comMarcador) {
      const conteudo = (comMarcador[1] ?? '').trim()
      return conteudo ? [{ tipo: 'item', texto: conteudo }] : []
    }
    const recuada = linha.match(/^\t+(.*)$/)
    if (recuada) {
      const conteudo = (recuada[1] ?? '').trim()
      return conteudo ? [{ tipo: 'item-sem-marcador', texto: conteudo }] : []
    }
    const conteudo = linha.trim()
    return conteudo ? [{ tipo: 'texto', texto: conteudo }] : []
  })
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
  /** Ver `AgenteAvaliado.periodoId` em src/types/index.ts. */
  periodoId?: string
  identificadoNaAtividade?: boolean
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
  analiseAnexos?: string
  exposicaoPericulosidade?:
    | 'permanente'
    | 'intermitente'
    | 'fortuita'
    | 'tempo_extremamente_reduzido'
    | 'eventual'
    | 'nao_constatada'
  resultadoPericulosidade?: 'caracterizada' | 'caracterizada_parcial' | 'nao_caracterizada' | 'prejudicada'
  /** Redação própria da exposição; vence `exposicaoPericulosidade`. */
  exposicaoPericulosidadeTexto?: string
  /** Redação própria do resultado; vence `resultadoPericulosidade`. */
  resultadoPericulosidadeTexto?: string
  /** Pontos de verificação do anexo da NR-16, na ordem de impressão. */
  detalhesNr16?: { id: string; rotulo: string; valor: string }[]
  /** Espelha os campos de mesmo nome de `AgenteAvaliado` (src/types/index.ts). */
  enquadramentoNr16?: string
  situacaoAreaRisco?: 'dentro' | 'parcialmente_dentro' | 'fora' | 'nao_caracterizada'
  presencaAreaRisco?:
    | 'permanencia'
    | 'circulacao'
    | 'acesso_eventual'
    | 'fora_sem_procedimento'
    | 'fora_com_procedimento'
    | 'acesso_nao_autorizado_sem_procedimento'
    | 'acesso_nao_autorizado_com_procedimento'
  delimitacaoAreaRisco?: string
  distanciaAreaRisco?: string
  tempoExposicaoNr16?: string
  unidadeTempoExposicaoNr16?: 'minutos_dia' | 'horas_dia'
  frequenciaOperacionalNr16?: string
  periodicidadeOperacionalNr16?: 'dia' | 'semana' | 'mes'
  relacaoAtividadeNr16?: 'principal' | 'secundaria' | 'complementar'
  periodoCaracterizacaoNr16?: string
  unidadeMedicao?: 'ppm' | 'mg/m³' | '% O₂ em volume' | 'dB(A)' | 'dB(C)' | 'dB(Linear)' | 'IBUTG °C' | 'mSv/ano' | 'm/s²' | 'm/s¹·⁷⁵' | 'fibras/cm³'
  epis?: EpiDocumento[]
  epiEficaz?: boolean
  criterio: string
  grau?: string
  observacao?: string
}

export interface ItemVarreduraDocumento {
  anexoId: string
  status: 'nao_avaliado' | 'sem_exposicao' | 'exposicao_identificada' | 'nao_aplicavel'
  conclusao?: string
}

/**
 * Avaliações NR-15 sempre precisam levar sua conclusão individual ao documento.
 *
 * Espelha src/lib/conclusoesAgentes.ts. Os dois precisam mudar juntos: esta
 * cópia recusa a geração no servidor, a do front acende a pendência na tela
 * do editor. Quando divergiram, o perito viu o editor cobrar a conclusão de
 * um agente que a modalidade do processo já tinha escondido dele.
 */
export function agentesNr15SemConclusao(
  tecnico?: { agentes?: AgenteDocumento[] } | null,
  modalidade?: string | null,
): string[] {
  if (modalidade === 'periculosidade') return []

  return (tecnico?.agentes ?? [])
    .filter((agente) => agente.tipo !== 'periculosidade' && !agente.observacao?.trim())
    .map((agente) => agente.nome?.trim() || 'Agente sem identificação')
}

/**
 * O bloco "Conclusão" só existe quando há o que escrever nele.
 *
 * Espelha src/lib/conclusoesAgentes.ts. A regra tem duas metades: avaliação de
 * periculosidade nunca leva conclusão individual (a NR-16 conclui no bloco
 * próprio, mais abaixo) e avaliação NR-15 sem texto também não — o título
 * sozinho, pendurado no fim do quadro, era o que o perito via como pendência
 * dentro do documento pronto.
 *
 * Chamada pelo HTML/PDF e pelo DOCX; a pré-visualização chama a cópia do
 * front. É o que mantém os três renderizadores idênticos.
 */
export function agenteExibeConclusao(agente: Pick<AgenteDocumento, 'tipo' | 'observacao'>): boolean {
  return agente.tipo !== 'periculosidade' && Boolean(agente.observacao?.trim())
}

/**
 * O que falta em UMA avaliação para ela poder ir ao documento.
 *
 * Espelha `CampoPendenteAgente`, `exigeEficaciaEpi` e `camposPendentesAgente`
 * de src/lib/conclusoesAgentes.ts — a tela cobra, esta cópia recusa a
 * emissão. A paridade é travada em conclusoes-agentes.test.ts.
 *
 * Origem: a emissão travou em "NR-15, Anexo 1: sem eficácia do EPI". No ruído
 * a eficácia sai da conta medição − NRRsf e a tela nem faz a pergunta — o
 * servidor cobrava um campo que o perito não tinha onde preencher.
 */
export type CampoPendenteAgente = 'observacao' | 'epiEficaz' | 'resultadoPericulosidade' | 'anexoNr16'

export type AgenteComPendenciasDocumento = Pick<
  AgenteDocumento,
  | 'nome'
  | 'tipo'
  | 'observacao'
  | 'anexoNr15'
  | 'anexoNr16'
  | 'identificadoNaAtividade'
  | 'epis'
  | 'epiEficaz'
  | 'resultadoPericulosidade'
  | 'resultadoPericulosidadeTexto'
>

export function exigeEficaciaEpi(agente: AgenteComPendenciasDocumento): boolean {
  if (agente.tipo === 'periculosidade') return false
  if (!agente.epis?.length) return false
  if (agente.identificadoNaAtividade === false) return false
  return !usaAtenuacaoRuidoDocumento(agente)
}

/**
 * Espelha `faltaAnexoNr16` do front. Sem anexo, o quadro da NR-16 derivado
 * das avaliações diria "Sem exposição" em todos os anexos — inclusive ao lado
 * de uma redação própria que caracteriza a periculosidade.
 */
function faltaAnexoNr16(agente: AgenteComPendenciasDocumento): boolean {
  if (temAnexoNr16ValidoDocumento(agente)) return false
  const caracteriza = agente.resultadoPericulosidade === 'caracterizada'
    || agente.resultadoPericulosidade === 'caracterizada_parcial'
  if (caracteriza) return true
  if (agente.anexoNr16 === SEM_ENQUADRAMENTO_NR16_DOCUMENTO) return false
  // "Prejudicada" também não é "Sem risco": sem o anexo examinado, o quadro
  // imprimiria "Sem exposição" em todos os anexos.
  return agente.resultadoPericulosidade === 'prejudicada' || Boolean(agente.resultadoPericulosidadeTexto?.trim())
}

export function camposPendentesAgente(agente: AgenteComPendenciasDocumento): CampoPendenteAgente[] {
  const campos: CampoPendenteAgente[] = []
  if (agente.tipo === 'periculosidade') {
    if (!agente.resultadoPericulosidade && !agente.resultadoPericulosidadeTexto?.trim()) {
      campos.push('resultadoPericulosidade')
    }
    if (faltaAnexoNr16(agente)) campos.push('anexoNr16')
    return campos
  }
  if (!agente.observacao?.trim()) campos.push('observacao')
  if (exigeEficaciaEpi(agente) && typeof agente.epiEficaz !== 'boolean') campos.push('epiEficaz')
  return campos
}

export const TEXTO_AUSENCIA_RECLAMANTE =
  'A parte reclamante não compareceu para a apresentação de suas alegações.'

export function primeiroNomeEmpresa(razaoSocial?: string | null): string {
  return razaoSocial?.trim().split(/\s+/)[0] ?? ''
}

export function qualificacaoParticipanteDocumento(
  papel: string,
  razaoSocial?: string | null,
): string {
  const qualificacao = PAPEL[papel] ?? papel
  const empresa = primeiroNomeEmpresa(razaoSocial)
  return empresa ? `${qualificacao}, ${empresa}` : qualificacao
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

/** Linhas digitadas no histórico laboral viram itens reais de atividade. */
export function atividadesDoPeriodo(texto?: string | null): string[] {
  if (!texto?.trim()) return []
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ''))
    .filter(Boolean)
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

/**
 * As proteções do agente resumidas em uma linha por EPI, para caber numa
 * célula só do quadro de análise do item 10.
 *
 * Vive aqui porque os quatro renderizadores montavam a mesma string cada um
 * por si — e quando o quadro da NR-16 passou a ser montado à parte, a linha
 * simplesmente não foi junto. Os EPIs de periculosidade sumiram do laudo
 * inteiro: a seção de EPIs só alcança agente com bloco de proteção próprio,
 * e o de periculosidade não tem.
 */
export function resumoProtecoesAssociadas(epis?: EpiDocumento[]): string {
  return (epis ?? []).map((epi, indice) => {
    const cas = [
      epi.caUnico?.trim() ? `CA ${epi.caUnico.trim()}` : '',
      epi.caPecaFacial?.trim() ? `CA peça facial ${epi.caPecaFacial.trim()}` : '',
      epi.caFiltroCartucho?.trim() ? `CA cartucho/filtro ${epi.caFiltroCartucho.trim()}` : '',
    ].filter(Boolean).join(' / ')
    return `Proteção ${indice + 1}: ${epi.modelo}${cas ? ` — ${cas}` : ''}`
  }).join('\n')
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
    ANEXO_12_MANGANES: 'Anexo 12 — Poeiras Minerais: Manganês (poeiras)',
    ANEXO_12_MANGANES_FUMOS: 'Anexo 12 — Poeiras Minerais: Manganês (fumos)',
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

/**
 * Os anexos da NR-16 na ordem em que o documento os lista.
 *
 * Cópia de `ANEXOS_NR16` de src/content/anexosNr16.ts — o front não pode ser
 * importado daqui. Mudou lá, muda aqui: quem cobra a paridade é
 * server/src/services/periculosidade-nr16.test.ts.
 */
export const ANEXOS_NR16_DOCUMENTO: { id: string; numero: string; assunto: string }[] = [
  { id: 'ANEXO_01', numero: '1', assunto: 'Explosivos' },
  { id: 'ANEXO_02', numero: '2', assunto: 'Inflamáveis' },
  { id: 'ANEXO_03', numero: '3', assunto: 'Segurança pessoal ou patrimonial' },
  { id: 'ANEXO_04', numero: '4', assunto: 'Energia elétrica' },
  { id: 'ANEXO_05', numero: '5', assunto: 'Motocicleta' },
  { id: 'ANEXO_06', numero: '6', assunto: 'Agentes das autoridades de trânsito' },
  { id: 'ANEXO_RADIACOES', numero: '(*)', assunto: 'Radiações ionizantes ou substâncias radioativas' },
]

/** Espelha `SEM_ENQUADRAMENTO_NR16` do front: fora do rol, de propósito. */
export const SEM_ENQUADRAMENTO_NR16_DOCUMENTO = 'SEM_ENQUADRAMENTO'

/** Espelha `temAnexoNr16Valido` do front. */
export function temAnexoNr16ValidoDocumento(agente: { anexoNr16?: string }): boolean {
  return ANEXOS_NR16_DOCUMENTO.some((anexo) => anexo.id === agente.anexoNr16)
}

/** Espelha `itemListaAnexoNr16` do front. */
export function itemListaAnexoNr16Documento(anexo: { numero: string; assunto: string }): string {
  return anexo.numero === '(*)' ? `Anexo (*) – ${anexo.assunto}` : anexo.assunto
}

/**
 * Os subitens do item 10 para a NR-16 — um por agente avaliado.
 *
 * O perito riscou do modelo a lista solta dos sete anexos que saía aqui, um
 * subitem para cada: o rol dos anexos observados pertence ao corpo do
 * quadro, na célula “Resultado técnico / Conclusão” — é `conclusaoSemRiscoNr16`
 * quem o imprime. Nas palavras dele, “ele só deve aparecer dentro da tabela”.
 *
 * Retirada a lista, a numeração passa a ser sequencial. Numerar pelo anexo
 * deixaria buraco: uma perícia com um só agente de Inflamáveis abriria o
 * item 10 em “10.2.2”, com o 10.2.1 em lugar nenhum. A ordem continua sendo
 * a dos anexos da NR-16, e o cenário negativo — agente sem anexo escolhido —
 * fecha a sequência como “Sem Risco”.
 */
export function quadrosNr16DoItem10<A extends { nome?: string; anexoNr16?: string }>(
  agentes: A[],
  prefixo: string,
): { numero: string; titulo: string; agente: A }[] {
  const comSufixo = (base: string, lista: A[], agente: A, indice: number) =>
    lista.length > 1 ? `${base} (${agente.nome?.trim() || `Risco ${indice + 1}`})` : base

  const avaliados: { titulo: string; agente: A }[] = []
  ANEXOS_NR16_DOCUMENTO.forEach((anexo) => {
    const doAnexo = agentes.filter((agente) => agente.anexoNr16 === anexo.id)
    doAnexo.forEach((agente, i) => {
      // Mesmo rótulo do rol de anexos: sem isso o sétimo anexo perde o
      // "(*)" justamente no quadro em que foi avaliado, e o leitor toma o
      // subitem por "Anexo 7", que a norma não tem.
      const base = `${itemListaAnexoNr16Documento(anexo)} – Avaliação, Resultado e Conclusão`
      avaliados.push({ titulo: comSufixo(base, doAnexo, agente, i), agente })
    })
  })

  // Sobra tudo o que não entrou em anexo nenhum — e não só quem está sem
  // anexo. Agente gravado com valor que não é id de anexo (as perícias
  // antigas guardavam "Anexo 2") não casava com nada e sumia do item 10 sem
  // aviso; agora ele cai aqui.
  const colocados = new Set(avaliados.map((quadro) => quadro.agente))
  const semAnexo = agentes.filter((agente) => !colocados.has(agente))
  semAnexo.forEach((agente, i) => {
    const base = 'Sem Risco – Avaliação, Resultado e Conclusão'
    avaliados.push({ titulo: comSufixo(base, semAnexo, agente, i), agente })
  })

  return avaliados.map((quadro, indice) => ({ numero: `${prefixo}.${indice + 1}`, ...quadro }))
}

export const ANALISE_ATIVIDADES_NR16 =
  'Análise das atividades, inspeção nos locais de trabalho e adjacentes'

export const CRITERIO_QUALITATIVO_NR16 = `Qualitativo – ${ANALISE_ATIVIDADES_NR16}`

export const LAPSO_TEMPORAL_NR16 = 'Análise de todo o período válido para inspeção pericial'

/** Espelha `conclusaoSemRiscoNr16` do front. */
export function conclusaoSemRiscoNr16(): string {
  return [
    'Não foi caracterizada periculosidade, por ausência de enquadramento das atividades e '
      + 'condições de trabalho nos critérios técnicos e normativos aplicáveis.',
    [
      'Todos os anexos foram observados:',
      ...ANEXOS_NR16_DOCUMENTO.map((anexo) => `\u2022 Anexo ${anexo.numero} – ${anexo.assunto};`),
    ].join('\n'),
    'Inaplicáveis às atividades e condições de trabalho do Reclamante, não havendo enquadramento '
      + 'nas hipóteses de caracterização de periculosidade.',
  ].join('\n\n')
}

const EXPOSICAO_PERICULOSIDADE: Record<string, string> = {
  permanente: 'Permanente',
  intermitente: 'Intermitente',
  fortuita: 'Eventual, assim considerado o contato fortuito',
  tempo_extremamente_reduzido: 'Habitual, por tempo extremamente reduzido',
  eventual: 'Eventual ou por tempo extremamente reduzido',
  nao_constatada: 'Não constatada exposição a condição de risco que atenda aos critérios normativos de caracterização.',
}

const RESULTADO_PERICULOSIDADE: Record<string, { valor: string; destaque: LinhaApresentacaoAgente['destaque'] }> = {
  nao_caracterizada: {
    valor: 'Não caracterizada periculosidade, por ausência de enquadramento nos critérios técnicos e normativos aplicáveis.',
    destaque: 'positivo',
  },
  prejudicada: { valor: 'Não foi possível caracterizar a periculosidade, por insuficiência de elementos técnicos.', destaque: 'aviso' },
}

/** Espelha `resultadoPericulosidade` de src/lib/apresentacaoAgente.ts. */
function resultadoPericulosidade(
  agente: AgenteDocumento,
): { valor: string; destaque: LinhaApresentacaoAgente['destaque'] } | undefined {
  const enquadramento = agente.enquadramentoNr16?.trim()
  const citacao = enquadramento ? ` (${enquadramento})` : ''
  if (agente.resultadoPericulosidade === 'caracterizada') {
    return { valor: `Periculosidade caracterizada${citacao}`, destaque: 'negativo' }
  }
  if (agente.resultadoPericulosidade === 'caracterizada_parcial') {
    const periodo = agente.periodoCaracterizacaoNr16?.trim()
    return {
      valor: `Periculosidade caracterizada parcialmente${citacao}${periodo ? ` — ${periodo}` : ''}`,
      destaque: 'negativo',
    }
  }
  return agente.resultadoPericulosidade ? RESULTADO_PERICULOSIDADE[agente.resultadoPericulosidade] : undefined
}

// ------------------------------------------------------------
// O levantamento da NR-16 em frases.
//
// Cada dado estruturado da tela vira uma frase do laudo. Número digitado
// sozinho ganha a unidade ("15" → "15 metros"); texto livre sai como foi
// escrito, porque o perito pode ter registrado "entre 10 e 15 minutos" e a
// unidade repetida estragaria a frase.
//
// Espelha src/lib/apresentacaoAgente.ts — mudou aqui, muda lá.
// ------------------------------------------------------------

const SITUACAO_AREA_RISCO: Record<string, string> = {
  dentro: 'Atividade exercida dentro da área de risco',
  parcialmente_dentro: 'Atividade exercida parcialmente dentro da área de risco',
  fora: 'Atividade exercida fora da área de risco',
  nao_caracterizada: 'Área de risco não caracterizada',
}

/** A presença como complemento da situação: "…dentro da área de risco, com permanência." */
const PRESENCA_AREA_RISCO: Record<string, string> = {
  permanencia: 'com permanência',
  circulacao: 'em circulação',
  acesso_eventual: 'com acesso eventual',
  fora_sem_procedimento: 'mesmo sem procedimento formal',
  fora_com_procedimento: 'conforme procedimento formal',
  acesso_nao_autorizado_sem_procedimento: 'com acesso não autorizado mesmo sem procedimento formal',
  acesso_nao_autorizado_com_procedimento: 'com acesso não autorizado, conforme procedimento formal',
}

/** A presença registrada sem a situação. */
const PRESENCA_AREA_RISCO_ISOLADA: Record<string, string> = {
  permanencia: 'Permanência na área de risco.',
  circulacao: 'Circulação pela área de risco.',
  acesso_eventual: 'Acesso eventual à área de risco.',
  fora_sem_procedimento: 'Fora da área de risco, mesmo sem procedimento formal.',
  fora_com_procedimento: 'Fora da área de risco, conforme procedimento formal.',
  acesso_nao_autorizado_sem_procedimento: 'Acesso não autorizado mesmo sem procedimento formal.',
  acesso_nao_autorizado_com_procedimento: 'Acesso não autorizado, conforme procedimento formal.',
}

/**
 * As quatro opções novas descrevem por que a atividade ficou fora da área (ou
 * o acesso indevido a ela) — só cabem quando a situação é 'fora'. As três
 * antigas descrevem como o trabalhador ocupava a área por dentro, e só cabem
 * quando a situação é 'dentro' ou 'parcialmente_dentro' (inclusive ainda não
 * escolhida).
 */
const PRESENCA_NOVA = new Set<string>([
  'fora_sem_procedimento',
  'fora_com_procedimento',
  'acesso_nao_autorizado_sem_procedimento',
  'acesso_nao_autorizado_com_procedimento',
])

function presencaCabeNaSituacao(situacao: string | undefined, presenca: string): boolean {
  if (situacao === 'nao_caracterizada') return false
  const nova = PRESENCA_NOVA.has(presenca)
  return situacao === 'fora' ? nova : !nova
}

const PERIODICIDADE_OPERACIONAL: Record<string, string> = {
  dia: 'dia',
  semana: 'semana',
  mes: 'mês',
}

const RELACAO_ATIVIDADE: Record<string, string> = {
  principal: 'Atividade principal',
  secundaria: 'Atividade secundária',
  complementar: 'Atividade complementar',
}

/** "15", "7,5", "2 a 3", "2-3" — número digitado sem unidade. */
const SO_NUMERO_NR16 = /^\d+(?:[.,]\d+)?(?:\s*(?:a|-)\s*\d+(?:[.,]\d+)?)?$/
/** "1.100", "1.000,5" — milhar com ponto, à brasileira. Nunca é um só. */
const MILHAR_NR16 = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/

function soNumeroNr16(valor: string): boolean {
  return MILHAR_NR16.test(valor) || SO_NUMERO_NR16.test(valor)
}
function quantidadeNr16(valor: string, singular: string, plural: string): string {
  // Antes do teste de número com decimal: "1.100" não é 1,1 metro.
  if (MILHAR_NR16.test(valor)) return `${valor} ${plural}`
  if (!SO_NUMERO_NR16.test(valor)) return valor
  const numero = valor.replace(/\./g, ',')
  return `${numero} ${Number(valor.replace(',', '.')) === 1 ? singular : plural}`
}

function fraseSituacaoAreaRiscoNr16(agente: AgenteDocumento): string {
  const situacao = agente.situacaoAreaRisco ? SITUACAO_AREA_RISCO[agente.situacaoAreaRisco] : undefined
  const presenca =
    agente.presencaAreaRisco && presencaCabeNaSituacao(agente.situacaoAreaRisco, agente.presencaAreaRisco)
      ? agente.presencaAreaRisco
      : undefined
  if (situacao && presenca) return `${situacao}, ${PRESENCA_AREA_RISCO[presenca]}.`
  if (situacao) return `${situacao}.`
  return presenca ? PRESENCA_AREA_RISCO_ISOLADA[presenca] ?? '' : ''
}

function textoDistanciaAreaRiscoNr16(agente: AgenteDocumento): string {
  const distancia = agente.distanciaAreaRisco?.trim()
  return distancia ? quantidadeNr16(distancia, 'metro', 'metros') : ''
}

function textoTempoExposicaoNr16(agente: AgenteDocumento): string {
  const tempo = agente.tempoExposicaoNr16?.trim()
  if (!tempo) return ''
  if (!agente.unidadeTempoExposicaoNr16 || !soNumeroNr16(tempo)) return tempo
  const [singular, plural] = agente.unidadeTempoExposicaoNr16 === 'horas_dia'
    ? ['hora', 'horas']
    : ['minuto', 'minutos']
  return `${quantidadeNr16(tempo, singular, plural)} por dia`
}

function textoFrequenciaOperacionalNr16(agente: AgenteDocumento): string {
  const frequencia = agente.frequenciaOperacionalNr16?.trim()
  if (!frequencia) return ''
  if (!soNumeroNr16(frequencia)) return frequencia
  const periodo = agente.periodicidadeOperacionalNr16
    ? ` por ${PERIODICIDADE_OPERACIONAL[agente.periodicidadeOperacionalNr16]}`
    : ''
  return `${quantidadeNr16(frequencia, 'vez', 'vezes')}${periodo}`
}

function textoRelacaoAtividadeNr16(agente: AgenteDocumento): string {
  return agente.relacaoAtividadeNr16 ? RELACAO_ATIVIDADE[agente.relacaoAtividadeNr16] ?? '' : ''
}

/**
 * A célula "Condição ou área de risco": onde o trabalhador estava, qual é a
 * área que a norma delimita, a que distância dela, e o texto livre do perito.
 * Uma informação por linha, nessa ordem.
 */
function textoCondicaoAreaRiscoNr16(agente: AgenteDocumento): string {
  const delimitacao = agente.delimitacaoAreaRisco?.trim()
  const distancia = textoDistanciaAreaRiscoNr16(agente)
  return [
    fraseSituacaoAreaRiscoNr16(agente),
    delimitacao ? `Área de risco: ${delimitacao}` : '',
    distancia ? `Distância verificada: ${distancia}` : '',
    agente.areaRisco?.trim() ?? '',
  ].filter(Boolean).join('\n')
}

/**
 * Anexos julgados pela conta "medição − NRRsf": o 1 (contínuo ou
 * intermitente) e o 2 (impacto). Espelha `usaAtenuacaoRuido` do front —
 * os dois precisam mudar juntos, ou a tela e o laudo divergem.
 */
const ANEXOS_RUIDO = new Set(['ANEXO_01', 'ANEXO_02'])

export function usaAtenuacaoRuidoDocumento(agente: Pick<AgenteDocumento, 'anexoNr15'>): boolean {
  return ANEXOS_RUIDO.has(agente.anexoNr15 ?? '')
}

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
  const linhas: LinhaApresentacaoAgente[] = [
    { rotulo: 'Equipamento', valor: epi.categoria },
    { rotulo: 'Descrição', valor: epi.modelo },
    { rotulo: 'Validade do CA', valor: epi.validadeCa?.trim() || 'Não informada' },
    ...[
      epi.caUnico?.trim() ? { rotulo: 'CA', valor: epi.caUnico.trim() } : undefined,
      epi.caPecaFacial?.trim() ? { rotulo: 'CA da peça facial', valor: epi.caPecaFacial.trim() } : undefined,
      epi.caFiltroCartucho?.trim() ? { rotulo: 'CA do cartucho/filtro', valor: epi.caFiltroCartucho.trim() } : undefined,
    ].filter((linha): linha is LinhaApresentacaoAgente => Boolean(linha)),
  ].filter((linha): linha is LinhaApresentacaoAgente => Boolean(linha))

  if (usaAtenuacaoRuidoDocumento(agente)) {
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
    // Sem resposta não é "Não": a emissão já cobra a resposta, mas o
    // rascunho pré-visualizado não pode afirmar ineficácia que ninguém atestou.
    linhas.push(
      typeof agente.epiEficaz === 'boolean'
        ? { rotulo: 'Eficácia comprovada', valor: agente.epiEficaz ? 'Sim' : 'Não', destaque: agente.epiEficaz ? 'positivo' : 'negativo' }
        : { rotulo: 'Eficácia comprovada', valor: 'Não informada', destaque: 'aviso' },
    )
  }

  return { titulo: `Proteção ${indice + 1}`, linhas }
}

export interface OpcoesApresentacaoAgenteDocumento {
  /** Ver `OpcoesApresentacaoAgente` em src/lib/apresentacaoAgente.ts. */
  conclusiva?: boolean
}

/** Ver `AgenteApresentavel` em src/lib/apresentacaoAgente.ts. */
export type AgenteApresentavelDocumento = AgenteDocumento & { funcaoPosto?: string }

/** Ver `PeriodoDeAgente` em src/lib/apresentacaoAgente.ts. */
export interface PeriodoDeAgenteDocumento {
  id: string
  funcao?: string
  setor?: string
}

/**
 * "Operador de Prensa — Estamparia", ou só o que houver dos dois.
 *
 * Espelha src/lib/apresentacaoAgente.ts — mudou aqui, muda lá.
 */
export function rotuloFuncaoPosto(periodo: PeriodoDeAgenteDocumento | undefined): string {
  const funcao = periodo?.funcao?.trim() ?? ''
  const setor = periodo?.setor?.trim() ?? ''
  if (funcao && setor) return `${funcao} — ${setor}`
  return funcao || setor
}

/**
 * Resolve o rótulo da função de cada agente, na entrada do renderizador.
 *
 * Ver `comFuncaoPosto` em src/lib/apresentacaoAgente.ts, que é quem explica
 * por que o vínculo é o id do período e não o rótulo copiado.
 *
 * Espelha src/lib/apresentacaoAgente.ts — mudou aqui, muda lá.
 */
export function comFuncaoPosto<A extends { periodoId?: string }>(
  agentes: A[],
  periodos: PeriodoDeAgenteDocumento[],
): (A & { funcaoPosto?: string })[] {
  return agentes.map((agente) => ({
    ...agente,
    funcaoPosto:
      rotuloFuncaoPosto(periodos.find((periodo) => periodo.id === agente.periodoId)) || undefined,
  }))
}

export function montarApresentacaoAgente(
  agente: AgenteApresentavelDocumento,
  opcoes: OpcoesApresentacaoAgenteDocumento = {},
): ApresentacaoAgenteDocumento {
  if (agente.tipo === 'periculosidade') {
    // ------------------------------------------------------------
    // O mesmo agente, dois quadros.
    //
    // No item 7 sai o levantamento: o que foi avaliado, sob que critério, em
    // que período, contra quais anexos e com que exposição. Nenhuma linha de
    // resultado — é só o registro do exame.
    //
    // No item 10 sai a conclusão, em duas linhas: o que foi examinado e o que
    // se concluiu. No cenário negativo a conclusão é a lista inteira dos
    // anexos observados, montada por `conclusaoSemRiscoNr16`.
    //
    // "Adicional Pretendido" aparece nos dois cenários de propósito: os 30%
    // são o que a parte pede, não o que o laudo reconhece.
    //
    // Espelha src/lib/apresentacaoAgente.ts — mudou aqui, muda lá.
    // ------------------------------------------------------------
    const resultado = resultadoPericulosidade(agente)
    const exposicaoTexto = agente.exposicaoPericulosidadeTexto?.trim()
    const resultadoTexto = agente.resultadoPericulosidadeTexto?.trim()
    const semEnquadramento =
      !resultadoTexto && agente.resultadoPericulosidade === 'nao_caracterizada'
    const titulo = agente.nome || 'Risco de periculosidade não informado'

    if (opcoes.conclusiva) {
      // Mesma pergunta que `quadrosNr16DoItem10` faz para dar o título ao
      // quadro. Ver `temAnexoNr16ValidoDocumento`.
      const conclusao = resultadoTexto
        ? { valor: resultadoTexto }
        : semEnquadramento && !temAnexoNr16ValidoDocumento(agente)
          ? { valor: conclusaoSemRiscoNr16(), destaque: 'positivo' as const }
          : resultado
            ? { valor: resultado.valor, destaque: resultado.destaque }
            : undefined
      const observacao = agente.observacao?.trim()
      const corpo = [conclusao?.valor, observacao].filter(Boolean).join('\n\n')
      // Quando o perito registrou EPIs no agente de periculosidade, este é o
      // único quadro do laudo em que eles aparecem. No cenário negativo não há
      // EPI nenhum e a tabela sai com as duas linhas do print.
      const protecoesAssociadas = resumoProtecoesAssociadas(agente.epis)
      return {
        titulo,
        linhas: [
          ...(agente.funcaoPosto ? [{ rotulo: 'Função / Posto', valor: agente.funcaoPosto }] : []),
          {
            rotulo: 'Condição / Atividades',
            valor: [ANALISE_ATIVIDADES_NR16, LAPSO_TEMPORAL_NR16].join('\n'),
          },
          ...(corpo
            ? [{
                rotulo: 'Resultado técnico / Conclusão',
                valor: corpo,
                ...(conclusao?.destaque ? { destaque: conclusao.destaque } : {}),
              }]
            : []),
          ...(protecoesAssociadas
            ? [{ rotulo: 'Proteções associadas', valor: protecoesAssociadas }]
            : []),
        ],
        protecoes: [],
      }
    }

    // Ver o comentário gêmeo em src/lib/apresentacaoAgente.ts: ordem do
    // raciocínio pericial, sem resultado, e "Sem enquadramento" sem a linha
    // do anexo.
    const enquadramento = agente.enquadramentoNr16?.trim()
    const condicaoArea = textoCondicaoAreaRiscoNr16(agente)
    const tempo = textoTempoExposicaoNr16(agente)
    const frequencia = textoFrequenciaOperacionalNr16(agente)
    const relacao = textoRelacaoAtividadeNr16(agente)
    return {
      titulo,
      linhas: [
        ...(agente.funcaoPosto ? [{ rotulo: 'Função / Posto', valor: agente.funcaoPosto }] : []),
        ...(agente.anexoNr16 && agente.anexoNr16 !== SEM_ENQUADRAMENTO_NR16_DOCUMENTO
          ? [{ rotulo: 'Anexo NR-16', valor: anexoNr16Legivel(agente.anexoNr16) }]
          : []),
        { rotulo: 'Natureza', valor: 'Periculosidade' },
        { rotulo: 'Critério', valor: CRITERIO_QUALITATIVO_NR16 },
        { rotulo: 'Lapso temporal', valor: LAPSO_TEMPORAL_NR16 },
        { rotulo: 'Adicional Pretendido', valor: '30%' },
        ...(enquadramento ? [{ rotulo: 'Enquadramento normativo', valor: enquadramento }] : []),
        ...(agente.atividadeEnquadrada?.trim()
          ? [{ rotulo: 'Atividade ou operação avaliada', valor: agente.atividadeEnquadrada.trim() }]
          : []),
        ...(condicaoArea ? [{ rotulo: 'Condição ou área de risco', valor: condicaoArea }] : []),
        ...(agente.analiseAnexos?.trim()
          ? [{ rotulo: 'Análise dos Anexos', valor: agente.analiseAnexos.trim() }]
          : []),
        ...(agente.detalhesNr16 ?? [])
          .filter((detalhe) => detalhe.valor.trim())
          .map((detalhe) => ({ rotulo: detalhe.rotulo, valor: detalhe.valor.trim() })),
        ...(exposicaoTexto
          ? [{ rotulo: 'Exposição', valor: exposicaoTexto }]
          : agente.exposicaoPericulosidade
            ? [{ rotulo: 'Exposição', valor: EXPOSICAO_PERICULOSIDADE[agente.exposicaoPericulosidade]! }]
            : []),
        ...(tempo ? [{ rotulo: 'Tempo médio de exposição', valor: tempo }] : []),
        ...(frequencia ? [{ rotulo: 'Frequência operacional', valor: frequencia }] : []),
        ...(relacao ? [{ rotulo: 'Relação com a atividade', valor: relacao }] : []),
      ],
      protecoes: [],
    }
  }

  const ruido = usaAtenuacaoRuidoDocumento(agente)
  const qualitativo = agente.criterio === 'qualitativo'
  const somenteRegistrosEmpresa =
    tipoMedicaoEmpresaDe(agente) === 'registros_processo' && !medicaoAdotadaDocumento(agente).valor
  const linhas: LinhaApresentacaoAgente[] = [
    ...(agente.funcaoPosto ? [{ rotulo: 'Função / Posto', valor: agente.funcaoPosto }] : []),
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
  varreduraNr15?: ItemVarreduraDocumento[]
  varreduraNr16?: ItemVarreduraDocumento[]
  normasReferencias: string
  equipamentosAnalisados: string
  informacoesLevantadas: string
  divergenciasFaticas?: string
  alegacoesReclamante?: string
  informacoesReclamada?: string
  consideracoesDivergencias?: string
  criterioAvaliacaoPericulosidade?: string
  riscoAlegadoPericulosidade?: string
  fonteRiscoAlegado?: string
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
