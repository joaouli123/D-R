import { describe, expect, it } from 'vitest'

import { formatarHonorarios, honorariosPorExtenso, textoHonorariosPericiais } from './honorarios'

describe('honorários periciais', () => {
  it('formata o valor monetário e o escreve por extenso', () => {
    expect(formatarHonorarios(500_000)).toBe('R$ 5.000,00')
    expect(honorariosPorExtenso(500_000)).toBe('cinco mil reais')
    expect(honorariosPorExtenso(100)).toBe('um real')
    expect(honorariosPorExtenso(150)).toBe('um real e cinquenta centavos')
  })

  it('monta o texto oficial sem deixar marcadores de substituição', () => {
    const texto = textoHonorariosPericiais(500_000)
    expect(texto).toContain('R$ 5.000,00 (cinco mil reais)')
    expect(texto).toContain('Regulamento de Honorários para Avaliações e Perícias de Engenharia do IBAPE/SP')
    expect(texto).not.toContain('[VALOR]')
  })
})
