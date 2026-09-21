import { describe, expect, it } from 'vitest'

import fonteDoServidor from '../../server/src/services/honorarios.ts?raw'
import fonteDoFront from './honorarios.ts?raw'
import {
  HONORARIOS_MAXIMO_CENTAVOS,
  formatarHonorarios,
  honorariosPorExtenso,
  separarFechoDoEncerramento,
  textoHonorariosPericiais,
} from './honorarios'

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

  it('separa milhares e centavos como o texto pericial: R$ 1.234,56 e R$ 0,05', () => {
    expect(formatarHonorarios(123_456)).toBe('R$ 1.234,56')
    expect(formatarHonorarios(5)).toBe('R$ 0,05')
    expect(formatarHonorarios(100_000_000)).toBe('R$ 1.000.000,00')
  })

  it.each([
    [100, 'um real'],
    [200, 'dois reais'],
    [1_000, 'dez reais'],
    [10_000, 'cem reais'],
    [10_100, 'cento e um reais'],
    [11_000, 'cento e dez reais'],
    [100_000, 'mil reais'],
    [100_100, 'mil e um reais'],
    [102_000, 'mil e vinte reais'],
    [110_000, 'mil e cem reais'],
    [110_100, 'mil, cento e um reais'],
    [123_400, 'mil, duzentos e trinta e quatro reais'],
    [250_000, 'dois mil e quinhentos reais'],
    [350_000, 'três mil e quinhentos reais'],
    [2_100_100, 'vinte e um mil e um reais'],
    [10_000_000, 'cem mil reais'],
    [10_010_000, 'cem mil e cem reais'],
    [10_101_000, 'cento e um mil e dez reais'],
    [100_000_000, 'um milhão de reais'],
    [200_000_000, 'dois milhões de reais'],
    [10_000_000_000, 'cem milhões de reais'],
    [100_000_100, 'um milhão e um reais'],
    [125_000_000, 'um milhão, duzentos e cinquenta mil reais'],
    [150_000_000, 'um milhão e quinhentos mil reais'],
    [100_100_000, 'um milhão e mil reais'],
    [300_100_100, 'três milhões, mil e um reais'],
    [123_456_700, 'um milhão, duzentos e trinta e quatro mil, quinhentos e sessenta e sete reais'],
  ])('escreve %i centavos como "%s"', (centavos, extenso) => {
    expect(honorariosPorExtenso(centavos)).toBe(extenso)
  })

  it('usa "de reais" quando o total em reais é milhão ou bilhão exato, mesmo com centavos', () => {
    expect(honorariosPorExtenso(100_000_000)).toBe('um milhão de reais')
    expect(honorariosPorExtenso(100_000_050)).toBe('um milhão de reais e cinquenta centavos')
    expect(honorariosPorExtenso(500_000_000)).toBe('cinco milhões de reais')
  })

  it('escreve só centavos quando não há reais', () => {
    expect(honorariosPorExtenso(1)).toBe('um centavo')
    expect(honorariosPorExtenso(50)).toBe('cinquenta centavos')
    expect(honorariosPorExtenso(0)).toBe('zero reais')
  })

  it('não quebra nem inventa valor com número inválido ou fora do limite', () => {
    expect(formatarHonorarios(Number.NaN)).toBe('R$ 0,00')
    expect(honorariosPorExtenso(Number.NaN)).toBe('zero reais')
    expect(honorariosPorExtenso(-500)).toBe('zero reais')
    expect(honorariosPorExtenso(Number.POSITIVE_INFINITY)).toBe('zero reais')
    expect(formatarHonorarios(HONORARIOS_MAXIMO_CENTAVOS * 10)).toBe(formatarHonorarios(HONORARIOS_MAXIMO_CENTAVOS))
    expect(honorariosPorExtenso(HONORARIOS_MAXIMO_CENTAVOS * 10)).toBe('cem milhões de reais')
  })

  it('arredonda fração de centavo para o centavo mais próximo', () => {
    expect(formatarHonorarios(150.4)).toBe('R$ 1,50')
    expect(honorariosPorExtenso(150.4)).toBe('um real e cinquenta centavos')
  })

  it('escreve o valor no formato R$ 2.500,00 dentro do texto do laudo', () => {
    expect(textoHonorariosPericiais(250_000)).toContain(
      'requer o Perito o arbitramento de seus honorários em R$ 2.500,00 (dois mil e quinhentos reais).',
    )
  })

  describe('fecho do encerramento', () => {
    const DIANTE = 'Diante do exposto, o signatário coloca-se à disposição dos envolvidos para os esclarecimentos técnicos que se fizerem necessários.'
    const encerramento = ['As considerações e conclusões.', 'O presente laudo técnico foi elaborado.', DIANTE].join('\n\n')

    it('separa o "Diante do exposto…" final, que passa a fechar o documento depois dos honorários', () => {
      expect(separarFechoDoEncerramento(encerramento)).toEqual({
        corpo: 'As considerações e conclusões.\n\nO presente laudo técnico foi elaborado.',
        fecho: DIANTE,
      })
    })

    it('reconhece o fecho sem depender de maiúsculas e de espaços em volta', () => {
      const { corpo, fecho } = separarFechoDoEncerramento(`  Um parágrafo.\n\n\n  diante do exposto, fico à disposição.  \n`)
      expect(corpo).toBe('Um parágrafo.')
      expect(fecho).toBe('diante do exposto, fico à disposição.')
    })

    it('deixa o texto como está quando o encerramento foi reescrito sem esse parágrafo final', () => {
      const texto = 'Texto do perito.\n\nOutro parágrafo do perito.'
      expect(separarFechoDoEncerramento(texto)).toEqual({ corpo: texto, fecho: '' })
    })

    it('não separa quando "Diante do exposto" não é o último parágrafo', () => {
      const texto = `${DIANTE}\n\nMais um parágrafo depois.`
      expect(separarFechoDoEncerramento(texto)).toEqual({ corpo: texto, fecho: '' })
    })

    it('não esvazia o encerramento quando o "Diante do exposto" é o único parágrafo', () => {
      expect(separarFechoDoEncerramento(DIANTE)).toEqual({ corpo: DIANTE, fecho: '' })
    })

    it('aceita texto vazio ou ausente', () => {
      expect(separarFechoDoEncerramento('')).toEqual({ corpo: '', fecho: '' })
      expect(separarFechoDoEncerramento(undefined)).toEqual({ corpo: '', fecho: '' })
      expect(separarFechoDoEncerramento(null)).toEqual({ corpo: '', fecho: '' })
    })
  })

  // As duas cópias (front e API) precisam escrever o mesmo texto; se uma
  // divergir, a prévia mostraria um valor e o PDF/DOCX outro.
  it('mantém a cópia do servidor idêntica à do front', () => {
    expect(fonteDoServidor).toBe(fonteDoFront)
  })
})
