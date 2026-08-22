/**
 * Limite de tolerância por unidade de medição do ruído:
 * 85 dB(A) no Anexo 1 (contínuo ou intermitente) e, no Anexo 2 (impacto),
 * 130 dB(C) na resposta Impacto ou 120 dB(Linear) na resposta Fast.
 * Sem isso o impacto seria julgado pelo limite do contínuo e todo
 * protetor apareceria como ineficaz.
 */
const LIMITE_POR_UNIDADE = {
  'dB(A)': 85,
  'dB(C)': 130,
  'dB(Linear)': 120,
} as const

export type UnidadeRuido = keyof typeof LIMITE_POR_UNIDADE

export const UNIDADE_RUIDO_PADRAO: UnidadeRuido = 'dB(A)'

/** Normaliza a unidade do agente; desconhecida cai no padrão dB(A). */
export function unidadeRuido(unidade?: string | null): UnidadeRuido {
  return unidade && unidade in LIMITE_POR_UNIDADE
    ? (unidade as UnidadeRuido)
    : UNIDADE_RUIDO_PADRAO
}

export function limiteRuido(unidade?: string | null): number {
  return LIMITE_POR_UNIDADE[unidadeRuido(unidade)]
}

export interface ResultadoProtecaoAuditiva {
  medicaoDbA: number
  atenuacaoDb: number
  resultadoDbA: number
  eficaz: boolean
  nivelInformado: boolean
  unidade: UnidadeRuido
  limiteDb: number
}

export interface ProtecaoDoConjunto {
  /** O protetor que mais atenua — é ele que decide se a exposição é neutralizada. */
  melhor: ResultadoProtecaoAuditiva
  indiceMelhor: number
  quantidade: number
  /** Nenhum dos protetores baixa a exposição ao limite. */
  nenhumEficaz: boolean
}

/**
 * Conclusão do conjunto de protetores auditivos.
 *
 * O trabalhador que recebeu quatro CAs diferentes ao longo do contrato
 * não usa os quatro ao mesmo tempo: cada um é avaliado por si (e o
 * laudo lista todos), mas a exposição só está neutralizada se ao menos
 * um deles der conta. Daí a conclusão sair do melhor NRRsf, e não do
 * primeiro da lista.
 */
export function protecaoDoConjunto(
  medicaoDbA: number,
  epis: readonly { nivelProtecaoDb?: number | null }[],
  unidadeMedicao?: string | null,
): ProtecaoDoConjunto | undefined {
  if (!epis.length) return undefined

  let indiceMelhor = 0
  epis.forEach((epi, indice) => {
    if ((epi.nivelProtecaoDb ?? 0) > (epis[indiceMelhor].nivelProtecaoDb ?? 0)) indiceMelhor = indice
  })

  const melhor = calcularProtecaoAuditiva(medicaoDbA, epis[indiceMelhor].nivelProtecaoDb, unidadeMedicao)
  return { melhor, indiceMelhor, quantidade: epis.length, nenhumEficaz: !melhor.eficaz }
}

export function calcularProtecaoAuditiva(
  medicaoDbA: number,
  nivelProtecaoDb?: number | null,
  unidadeMedicao?: string | null,
): ResultadoProtecaoAuditiva {
  const atenuacaoDb = nivelProtecaoDb ?? 0
  const resultadoDbA = Number((medicaoDbA - atenuacaoDb).toFixed(2))
  const unidade = unidadeRuido(unidadeMedicao)
  const limiteDb = LIMITE_POR_UNIDADE[unidade]

  return {
    medicaoDbA,
    atenuacaoDb,
    resultadoDbA,
    eficaz: resultadoDbA <= limiteDb,
    nivelInformado: nivelProtecaoDb != null,
    unidade,
    limiteDb,
  }
}
