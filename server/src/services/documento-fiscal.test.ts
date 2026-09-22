import { describe, expect, it } from 'vitest'

import { documentoDaEmpresa, mascaraCnpj } from './documento-comum.js'
import { formatarDocumento, problemaNoDocumento, tipoDoDocumento } from './documento-fiscal.js'

// A mesma regra de src/lib/cadastro.ts: a tela avisa enquanto digita, e a
// API recusa o que passar mesmo assim.

describe('CPF e CNPJ na API', () => {
  it('só reconhece o documento completo', () => {
    expect(tipoDoDocumento('529.982.247-25')).toBe('cpf')
    expect(tipoDoDocumento('11.222.333/0001-81')).toBe('cnpj')
    expect(tipoDoDocumento('12.abc.345/01de-35')).toBe('cnpj')
    expect(tipoDoDocumento('11.222.333/0001')).toBeNull()
    // Letra nos verificadores não existe.
    expect(tipoDoDocumento('12ABC34501DEXY')).toBeNull()
  })

  it('explica por que recusa', () => {
    expect(problemaNoDocumento('11.222.333/0001-81')).toBeNull()
    expect(problemaNoDocumento('12ABC34501DE35')).toBeNull()
    expect(problemaNoDocumento('529.982.247-25')).toBeNull()
    expect(problemaNoDocumento('529.982.247-25', { aceitarCpf: false })).toBe('Informe os 14 caracteres do CNPJ.')
    expect(problemaNoDocumento('1234')).toMatch(/CPF \(11 dígitos\) ou um CNPJ/)
    expect(problemaNoDocumento('11222333000180')).toBe(
      'O CNPJ 11.222.333/0001-80 não confere no dígito verificador. Confira o número.',
    )
  })

  it('grava com a máscara', () => {
    expect(formatarDocumento('12abc34501de35')).toBe('12.ABC.345/01DE-35')
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25')
  })
})

describe('documento da reclamada no laudo', () => {
  it('sai com o rótulo que corresponde ao número', () => {
    expect(documentoDaEmpresa('11222333000181')).toBe('CNPJ 11.222.333/0001-81')
    expect(documentoDaEmpresa('12ABC34501DE35')).toBe('CNPJ 12.ABC.345/01DE-35')
    expect(documentoDaEmpresa('529.982.247-25')).toBe('CPF 529.982.247-25')
    expect(mascaraCnpj('')).toBe('—')
  })
})
