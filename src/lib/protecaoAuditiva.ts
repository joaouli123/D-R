export interface ResultadoProtecaoAuditiva {
  medicaoDbA: number
  atenuacaoDb: number
  resultadoDbA: number
  eficaz: boolean
  nivelInformado: boolean
}

export function calcularProtecaoAuditiva(
  medicaoDbA: number,
  nivelProtecaoDb?: number | null,
): ResultadoProtecaoAuditiva {
  const atenuacaoDb = nivelProtecaoDb ?? 0
  const resultadoDbA = Number((medicaoDbA - atenuacaoDb).toFixed(2))

  return {
    medicaoDbA,
    atenuacaoDb,
    resultadoDbA,
    eficaz: resultadoDbA <= 85,
    nivelInformado: nivelProtecaoDb != null,
  }
}
