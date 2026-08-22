import { describe, expect, it } from 'vitest'

import { calcularProtecaoAuditiva, protecaoDoConjunto } from './protecaoAuditiva'

describe('calcularProtecaoAuditiva', () => {
  it('classifica como eficaz quando a medição menos o NRRsf fica abaixo do limite', () => {
    expect(calcularProtecaoAuditiva(90, 17)).toEqual({
      medicaoDbA: 90,
      atenuacaoDb: 17,
      resultadoDbA: 73,
      eficaz: true,
      nivelInformado: true,
      unidade: 'dB(A)',
      limiteDb: 85,
    })
  })

  it('classifica como ineficaz quando o resultado fica acima do limite', () => {
    expect(calcularProtecaoAuditiva(99, 13)).toEqual({
      medicaoDbA: 99,
      atenuacaoDb: 13,
      resultadoDbA: 86,
      eficaz: false,
      nivelInformado: true,
      unidade: 'dB(A)',
      limiteDb: 85,
    })
  })

  it('usa zero e sinaliza nível ausente quando o CA não informa NRRsf', () => {
    expect(calcularProtecaoAuditiva(99, null)).toEqual({
      medicaoDbA: 99,
      atenuacaoDb: 0,
      resultadoDbA: 99,
      eficaz: false,
      nivelInformado: false,
      unidade: 'dB(A)',
      limiteDb: 85,
    })
  })

  it('usa o limite do ruído de impacto quando a medição é em dB(C)', () => {
    // 125 dB(C) seria "ineficaz" pelo limite do contínuo (85), mas o
    // Anexo 2 tolera até 130 dB(C) na resposta Impacto.
    expect(calcularProtecaoAuditiva(140, 17, 'dB(C)')).toMatchObject({
      resultadoDbA: 123,
      eficaz: true,
      unidade: 'dB(C)',
      limiteDb: 130,
    })
  })

  it('usa 120 dB na resposta Fast (dB(Linear))', () => {
    expect(calcularProtecaoAuditiva(140, 17, 'dB(Linear)')).toMatchObject({
      resultadoDbA: 123,
      eficaz: false,
      unidade: 'dB(Linear)',
      limiteDb: 120,
    })
  })

  it('cai no limite do Anexo 1 quando a unidade não é de ruído', () => {
    expect(calcularProtecaoAuditiva(90, 0, 'mg/m³')).toMatchObject({
      unidade: 'dB(A)',
      limiteDb: 85,
    })
  })
})

describe('protecaoDoConjunto', () => {
  it('conclui pelo protetor mais atenuante, não pelo primeiro da lista', () => {
    // O trabalhador usa vários CAs; o laudo precisa responder se algum
    // deles neutraliza a exposição.
    const conjunto = protecaoDoConjunto(88.41, [
      { nivelProtecaoDb: 9 },
      { nivelProtecaoDb: 17 },
      { nivelProtecaoDb: 12 },
    ])

    expect(conjunto).toMatchObject({ indiceMelhor: 1, quantidade: 3, nenhumEficaz: false })
    expect(conjunto?.melhor.resultadoDbA).toBe(71.41)
  })

  it('trata NRRsf ausente como zero sem perder para ele', () => {
    const conjunto = protecaoDoConjunto(90, [{ nivelProtecaoDb: null }, { nivelProtecaoDb: 17 }])

    expect(conjunto?.indiceMelhor).toBe(1)
    expect(conjunto?.melhor.atenuacaoDb).toBe(17)
  })

  it('avisa quando nenhum dos protetores basta', () => {
    const conjunto = protecaoDoConjunto(110, [{ nivelProtecaoDb: 9 }, { nivelProtecaoDb: 17 }])

    expect(conjunto?.nenhumEficaz).toBe(true)
    expect(conjunto?.melhor.eficaz).toBe(false)
  })

  it('não conclui nada sem protetor associado', () => {
    expect(protecaoDoConjunto(90, [])).toBeUndefined()
  })
})
