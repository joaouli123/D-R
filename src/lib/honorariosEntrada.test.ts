import { describe, expect, it } from 'vitest'

import { HONORARIOS_MAXIMO_CENTAVOS } from './honorarios'
import { interpretarEntradaHonorarios, textoDoCampoHonorarios } from './honorariosEntrada'

const centavos = (texto: string) => interpretarEntradaHonorarios(texto)

describe('entrada do valor dos honorários (padrão brasileiro)', () => {
  it('campo vazio limpa o valor', () => {
    expect(centavos('')).toEqual({ centavos: undefined })
    expect(centavos('   ')).toEqual({ centavos: undefined })
    expect(centavos('R$')).toEqual({ centavos: undefined })
  })

  it.each([
    ['3500', 350_000],
    ['3.500', 350_000],
    ['3.500,00', 350_000],
    ['R$ 2.500,00', 250_000],
    ['R$2.500,50', 250_050],
    ['1.000', 100_000],
    ['1.000.000', 100_000_000],
    ['2500,5', 250_050],
    ['2500,05', 250_005],
    ['2500,', 250_000],
    ['0,50', 50],
    [',50', 50],
    ['2500.50', 250_050],
    ['2500.5', 250_050],
    ['0', 0],
    ['0,00', 0],
    ['R$ 2.500,00', 250_000],
  ])('interpreta "%s" como %i centavos', (entrada, esperado) => {
    expect(centavos(entrada)).toEqual({ centavos: esperado })
  })

  it.each(['abc', '12a', '1,2,3', '2.500,999', '1..000', '-500', '1.00.0', '2,5.00', '12 34x'])(
    'recusa "%s" com mensagem de formato',
    (entrada) => {
      const resultado = centavos(entrada)
      expect('erro' in resultado && resultado.erro).toMatch(/Use apenas números/)
    },
  )

  it('recusa valor acima do teto, sem estourar', () => {
    const resultado = centavos('100.000.000,01')
    expect('erro' in resultado && resultado.erro).toMatch(/não pode passar de R\$ 100\.000\.000,00/)
    expect(centavos('99999999999999999999')).toHaveProperty('erro')
    expect(centavos('100.000.000,00')).toEqual({ centavos: HONORARIOS_MAXIMO_CENTAVOS })
  })

  it('devolve o valor guardado no formato do campo, sem o R$', () => {
    expect(textoDoCampoHonorarios(undefined)).toBe('')
    expect(textoDoCampoHonorarios(0)).toBe('')
    expect(textoDoCampoHonorarios(250_000)).toBe('2.500,00')
    expect(textoDoCampoHonorarios(250_050)).toBe('2.500,50')
    expect(textoDoCampoHonorarios(5)).toBe('0,05')
  })
})
