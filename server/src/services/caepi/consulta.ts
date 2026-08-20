// ============================================================
// Consulta ao espelho do CAEPI.
//
// As funções puras ficam aqui, separadas da rota, porque são o que
// decide o que vai escrito no laudo — e precisam ser testáveis sem
// banco e sem rede.
//
// Duas perguntas moram neste arquivo:
//
//   1. "o perito digitou um texto; que tsquery isso vira?"
//      A resposta precisa ser SEMPRE sintaticamente válida: um
//      to_tsquery malformado derruba a consulta com erro do Postgres,
//      e o texto vem de campo livre.
//
//   2. "o CA tem mais de uma homologação; qual delas vale na data
//      da perícia?" — 22 CAs da base têm histórico, e escolher a
//      errada muda a conclusão do laudo.
// ============================================================

import { validadeNaData, type SituacaoCa, type ValidadeNaData } from './normalizar.js'

/** Colunas cobertas pelo índice GIN de busca textual. */
export const EXPRESSAO_BUSCA =
  `to_tsvector('portuguese', coalesce("marca", '') || ' ' || coalesce("referencia", '') || ' ' || ` +
  `coalesce("razaoSocial", '') || ' ' || coalesce("descricao", ''))`

/** Teto de termos considerados. Além disso o ganho é nulo e o custo cresce. */
const MAX_TERMOS = 6

/**
 * Texto livre → argumento de `to_tsquery`.
 *
 * Cada termo vira `'termo':*` para que a busca funcione enquanto o
 * perito ainda está digitando ("prot" acha "protetor"). Os termos são
 * unidos por `&`: quem digita "3m 1100" quer os dois, não qualquer um.
 *
 * O aspas simples em volta de cada lexema é proposital — é o que
 * impede que um caractere sobrevivente vire operador de tsquery.
 * Devolve null quando não sobra nada pesquisável.
 */
export function montarTsQuery(termo: string | null | undefined): string | null {
  if (!termo) return null

  const lexemas = String(termo)
    .toLowerCase()
    // Mantém letras (com acento), dígitos e nada mais.
    .split(/[^\p{L}\p{N}]+/u)
    .filter((parte) => parte.length >= 2)
    .slice(0, MAX_TERMOS)
    // A aspa simples não sobrevive ao split acima, mas o escape fica
    // como rede: se o filtro mudar, a query continua sem injeção.
    .map((parte) => `'${parte.replace(/'/g, "''")}':*`)

  return lexemas.length ? lexemas.join(' & ') : null
}

/** Uma homologação como sai do banco. */
export interface Homologacao {
  numeroCa: string
  processo: string
  dataValidade: string | null
  situacao: SituacaoCa | string
  equipamento: string
  descricao: string | null
  marca: string | null
  referencia: string | null
  cor: string | null
  cnpj: string | null
  razaoSocial: string | null
  natureza: string | null
  aprovadoParaLaudo: string | null
  restricaoLaudo: string | null
  observacaoLaudo: string | null
  normas: string[]
  laudos: unknown
  categoria: string
  anexos: string[]
  exigeNrrsf: boolean
  descontinuado: boolean
}

export interface HomologacaoAvaliada extends Homologacao {
  validade: ValidadeNaData
}

/** Acrescenta o parecer de validade na data de referência. */
export function avaliar<T extends Homologacao>(registro: T, dataReferencia: string): T & { validade: ValidadeNaData } {
  return { ...registro, validade: validadeNaData(registro, dataReferencia) }
}

/**
 * Escolhe a homologação pertinente à data da perícia.
 *
 * Regra, nesta ordem:
 *   1. a que estava válida na data — é a resposta certa quando existe;
 *   2. não havendo nenhuma válida, a de validade mais recente, que é
 *      a que o perito precisa citar para dizer "já estava vencido".
 *
 * Empate de data é resolvido pelo processo, só para o resultado ser
 * estável entre chamadas.
 */
export function escolherHomologacao<T extends Homologacao>(
  homologacoes: readonly T[],
  dataReferencia: string,
): (T & { validade: ValidadeNaData }) | null {
  if (!homologacoes.length) return null

  const avaliadas = homologacoes.map((registro) => avaliar(registro, dataReferencia))

  const ordenar = (a: T & { validade: ValidadeNaData }, b: T & { validade: ValidadeNaData }) =>
    (b.dataValidade ?? '').localeCompare(a.dataValidade ?? '') || a.processo.localeCompare(b.processo)

  const validas = avaliadas.filter((registro) => registro.validade.valido)
  const candidatas = validas.length ? validas : avaliadas

  return [...candidatas].sort(ordenar)[0] ?? null
}

/** Data de hoje em ISO curto, no fuso local — é a data que o perito vê. */
export function hojeIso(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}
