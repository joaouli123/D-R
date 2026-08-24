import { formatDate } from './utils'

// ============================================================
// Período de avaliação da empresa.
//
// O laudo não avalia o contrato inteiro: avalia os cinco anos
// anteriores ao ajuizamento da ação (art. 7º, XXIX, da Constituição).
// Se o trabalhador foi admitido dentro dessa janela, ela começa na
// admissão — não há o que avaliar antes de ele existir na empresa.
//
// Fazer essa conta a mão é onde o erro entra: pedir à empresa o PGR de
// um ano prescrito, ou deixar de pedir o do primeiro ano que conta.
//
// Espelhado em `server/src/services/documento-comum.ts`
// (`periodoAvaliacaoDocumento`). Os dois precisam mudar juntos: a tela
// mostra o período ao perito, o servidor imprime o que vai ao juízo.
// ============================================================

/** O que definiu o começo da janela. */
export type MotivoInicioPeriodo = 'prescricao' | 'admissao'

export interface PeriodoAvaliacao {
  /** Primeiro dia avaliado, em ISO. */
  inicio: string
  /** Último dia avaliado. Ausente = contrato ainda em curso. */
  fim?: string
  motivoInicio: MotivoInicioPeriodo
  /** O corte dos cinco anos, mesmo quando não foi ele que prevaleceu. */
  marcoPrescricional: string
  /** O contrato acabou antes do corte — não sobra período a avaliar. */
  foraDoPrazo: boolean
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}/

/** Só os 10 primeiros caracteres, a mesma convenção de `formatDate`. */
function comoData(valor?: string | null): string {
  const limpo = (valor ?? '').trim()
  return DATA_ISO.test(limpo) ? limpo.slice(0, 10) : ''
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/**
 * A mesma data, tantos anos antes.
 *
 * Ajuizamento em 29/02 é o caso que quebra a conta ingênua: cinco anos
 * antes não existe no calendário, e o corte cai no último dia de
 * fevereiro daquele ano.
 */
export function subtrairAnos(iso: string, anos: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  if (!ano || !mes || !dia) return iso
  const alvo = ano - anos
  const ultimoDiaDoMes = new Date(Date.UTC(alvo, mes, 0)).getUTCDate()
  return `${alvo}-${doisDigitos(mes)}-${doisDigitos(Math.min(dia, ultimoDiaDoMes))}`
}

/**
 * A janela que a empresa precisa cobrir com PGR e laudos ambientais.
 *
 * Sem data de ajuizamento não há conta a fazer — devolve `null` em vez
 * de chutar uma janela, porque um período errado no laudo é pior do que
 * período nenhum.
 */
export function periodoAvaliacaoEmpresa(pericia: {
  dataAjuizamento?: string
  admissao?: string
  demissao?: string
}): PeriodoAvaliacao | null {
  const ajuizamento = comoData(pericia.dataAjuizamento)
  if (!ajuizamento) return null

  const marcoPrescricional = subtrairAnos(ajuizamento, 5)
  const admissao = comoData(pericia.admissao)
  const demissao = comoData(pericia.demissao)

  const comecaNaAdmissao = Boolean(admissao) && admissao > marcoPrescricional
  const inicio = comecaNaAdmissao ? admissao : marcoPrescricional

  return {
    inicio,
    fim: demissao || undefined,
    motivoInicio: comecaNaAdmissao ? 'admissao' : 'prescricao',
    marcoPrescricional,
    foraDoPrazo: Boolean(demissao) && demissao < marcoPrescricional,
  }
}

/** "26/05/2021 a 14/08/2024" — o intervalo, sem a justificativa. */
export function intervaloDoPeriodo(periodo: PeriodoAvaliacao): string {
  if (periodo.foraDoPrazo) return 'Nenhum — contrato encerrado antes do marco prescricional'
  const inicio = formatDate(periodo.inicio)
  return periodo.fim ? `${inicio} a ${formatDate(periodo.fim)}` : `${inicio} até o fim do contrato`
}

/**
 * Por que o período é esse. Vai junto do intervalo no documento: o
 * intervalo sozinho parece arbitrário para quem lê e não fez a conta.
 */
export function motivoDoPeriodo(periodo: PeriodoAvaliacao, dataAjuizamento?: string): string {
  const ajuizamento = comoData(dataAjuizamento)
  const referencia = ajuizamento ? ` (${formatDate(ajuizamento)})` : ''

  if (periodo.foraDoPrazo) {
    return `O contrato encerrou-se antes de ${formatDate(periodo.marcoPrescricional)}, marco dos cinco anos anteriores ao ajuizamento da ação${referencia}.`
  }
  if (periodo.motivoInicio === 'admissao') {
    return `Contado da admissão, posterior ao marco de ${formatDate(periodo.marcoPrescricional)} — cinco anos anteriores ao ajuizamento da ação${referencia}.`
  }
  return `Cinco anos anteriores ao ajuizamento da ação${referencia}.`
}
