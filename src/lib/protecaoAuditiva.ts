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
