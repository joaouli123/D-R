import { describe, expect, it } from 'vitest'

import { calcularProtecaoAuditiva } from './protecaoAuditiva'

describe('calcularProtecaoAuditiva', () => {
  it('classifica como eficaz quando a medição menos o NRRsf fica abaixo do limite', () => {
    expect(calcularProtecaoAuditiva(90, 17)).toEqual({
      medicaoDbA: 90,
      atenuacaoDb: 17,
      resultadoDbA: 73,
      eficaz: true,
      nivelInformado: true,
    })
  })

  it('classifica como ineficaz quando o resultado fica acima do limite', () => {
    expect(calcularProtecaoAuditiva(99, 13)).toEqual({
      medicaoDbA: 99,
      atenuacaoDb: 13,
      resultadoDbA: 86,
      eficaz: false,
      nivelInformado: true,
    })
  })

  it('usa zero e sinaliza nível ausente quando o CA não informa NRRsf', () => {
    expect(calcularProtecaoAuditiva(99, null)).toEqual({
      medicaoDbA: 99,
      atenuacaoDb: 0,
      resultadoDbA: 99,
      eficaz: false,
      nivelInformado: false,
    })
  })
})
