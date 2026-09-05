import { describe, expect, it } from 'vitest'

import { casValido, erroCas, formatoCas } from './cas'

describe('número CAS', () => {
  it('aceita os CAS fixos do sistema e o bórax que o cliente usou de teste', () => {
    for (const cas of ['7439-96-5', '1332-21-4', '14808-60-7', '75-07-0', '1303-96-4', '50-00-0']) {
      expect(casValido(cas), cas).toBe(true)
    }
  })

  it('recusa dígito verificador trocado mesmo com o formato certo', () => {
    expect(formatoCas('7439-96-4')).toBe(true)
    expect(casValido('7439-96-4')).toBe(false)
    expect(casValido('1303-96-5')).toBe(false)
  })

  it('recusa o que não tem a estrutura NNNNNNN-NN-N', () => {
    for (const valor of ['7439965', '7439-96', '7439-96-55', '1-96-5', '12345678-96-5', 'abc', '', undefined]) {
      expect(formatoCas(valor), String(valor)).toBe(false)
      expect(casValido(valor), String(valor)).toBe(false)
    }
  })

  it('ignora espaços em volta, que sobram de copiar e colar', () => {
    expect(casValido(' 7439-96-5 ')).toBe(true)
    expect(erroCas('  7439-96-5')).toBeUndefined()
  })

  it('não reclama de campo vazio nem de CAS pela metade', () => {
    expect(erroCas('')).toBeUndefined()
    expect(erroCas(undefined)).toBeUndefined()
    // Sete dígitos seguidos ainda podem ser o corpo de um CAS de sete dígitos.
    for (const parcial of ['7', '7439', '7439965', '7439-', '7439-9', '7439-96', '7439-96-']) {
      expect(erroCas(parcial), parcial).toBeUndefined()
    }
  })

  it('distingue formato errado de verificador errado', () => {
    expect(erroCas('7439-96-4')).toMatch(/Dígito verificador não confere/)
    expect(erroCas('74399650')).toMatch(/Formato esperado/)
    expect(erroCas('1-2-3')).toMatch(/Formato esperado/)
    expect(erroCas('7439-96-55')).toMatch(/Formato esperado/)
    expect(erroCas('abc')).toMatch(/Formato esperado/)
  })
})
