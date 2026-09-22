import { describe, expect, it } from 'vitest'

import {
  cnpjValido,
  cpfValido,
  documentoValido,
  formatarDocumento,
  mascararCep,
  mascararCnpj,
  mascararCpfCnpj,
  mascararTelefone,
  problemaNaSenha,
  problemaNoDocumento,
  rotuloDoDocumento,
  situacaoDoDocumento,
  tipoDoDocumento,
} from './cadastro'

describe('CPF ou CNPJ no mesmo campo', () => {
  it('até 11 dígitos é CPF; passou disso, ou tem letra, é CNPJ', () => {
    expect(tipoDoDocumento('')).toBeNull()
    expect(tipoDoDocumento('529.982')).toBe('cpf')
    expect(tipoDoDocumento('52998224725')).toBe('cpf')
    expect(tipoDoDocumento('112223330001')).toBe('cnpj')
    expect(tipoDoDocumento('12ABC')).toBe('cnpj')
  })

  it('a máscara acompanha a digitação e troca de CPF para CNPJ', () => {
    expect(mascararCpfCnpj('529')).toBe('529')
    expect(mascararCpfCnpj('5299822')).toBe('529.982.2')
    expect(mascararCpfCnpj('52998224725')).toBe('529.982.247-25')
    expect(mascararCpfCnpj('112223330001')).toBe('11.222.333/0001')
    expect(mascararCpfCnpj('11222333000181')).toBe('11.222.333/0001-81')
    // Colar já formatado, ou com lixo, dá no mesmo.
    expect(mascararCpfCnpj(' 11.222.333/0001-81 ')).toBe('11.222.333/0001-81')
    expect(mascararCpfCnpj('112223330001819999')).toBe('11.222.333/0001-81')
  })

  it('aceita o CNPJ alfanumérico, em maiúsculas e com os verificadores só em número', () => {
    expect(mascararCpfCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35')
    expect(mascararCnpj('12ABC34501DEXY35')).toBe('12.ABC.345/01DE-35')
    expect(cnpjValido('12.ABC.345/01DE-35')).toBe(true)
    expect(cnpjValido('12.ABC.345/01DE-36')).toBe(false)
  })

  it('confere os dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('529.982.247-24')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cnpjValido('11.222.333/0001-81')).toBe(true)
    expect(cnpjValido('11.222.333/0001-80')).toBe(false)
    expect(cnpjValido('00.000.000/0000-00')).toBe(false)
    expect(documentoValido('52998224725')).toBe(true)
    expect(documentoValido('11222333000181')).toBe(true)
    expect(documentoValido('')).toBe(false)
  })

  it('formata e rotula o que já está gravado', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25')
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatarDocumento('123')).toBe('123')
    expect(rotuloDoDocumento('529.982.247-25')).toBe('CPF')
    expect(rotuloDoDocumento('11.222.333/0001-81')).toBe('CNPJ')
    expect(rotuloDoDocumento('12.ABC.345/01DE-35')).toBe('CNPJ')
  })
})

describe('a recusa de quem vai salvar', () => {
  it('é a mesma do servidor', () => {
    expect(problemaNoDocumento('11.222.333/0001-81')).toBeNull()
    expect(problemaNoDocumento('529.982.247-25')).toBeNull()
    expect(problemaNoDocumento('529.982.247-25', { aceitarCpf: false })).toBe('Informe os 14 caracteres do CNPJ.')
    expect(problemaNoDocumento('11.222.333/0001')).toBe('Informe um CPF (11 dígitos) ou um CNPJ (14 caracteres).')
    expect(problemaNoDocumento('11222333000180')).toBe(
      'O CNPJ 11.222.333/0001-80 não confere no dígito verificador. Confira o número.',
    )
  })
})

describe('o que o campo diz enquanto a pessoa digita', () => {
  it('conta o que falta', () => {
    expect(situacaoDoDocumento('529.98')).toMatchObject({ tipo: 'cpf', mensagem: 'Faltam 6 dígitos para o CPF.' })
    expect(situacaoDoDocumento('11.222.333/0001-8')).toMatchObject({
      tipo: 'cnpj',
      mensagem: 'Falta 1 dígito para o CNPJ.',
    })
  })

  it('CPF que não fecha ainda pode ser o começo de um CNPJ', () => {
    expect(situacaoDoDocumento('112.223.330-00')).toMatchObject({ tipo: 'cpf', valido: false, tom: 'aviso' })
    expect(situacaoDoDocumento('529.982.247-25')).toMatchObject({ tipo: 'cpf', valido: true, tom: 'ok' })
  })

  it('CNPJ completo e errado é erro', () => {
    expect(situacaoDoDocumento('11.222.333/0001-80')).toMatchObject({ tipo: 'cnpj', completo: true, tom: 'erro' })
    expect(situacaoDoDocumento('11.222.333/0001-81')).toMatchObject({ valido: true, mensagem: 'CNPJ válido.' })
  })

  it('só CNPJ: 11 dígitos contam como CNPJ incompleto', () => {
    expect(situacaoDoDocumento('52998224725', { aceitarCpf: false })).toMatchObject({
      tipo: 'cnpj',
      completo: false,
    })
  })
})

describe('CEP, telefone e senha', () => {
  it('CEP', () => {
    expect(mascararCep('01310')).toBe('01310')
    expect(mascararCep('01310100')).toBe('01310-100')
    expect(mascararCep('01310-1009')).toBe('01310-100')
  })

  it('telefone fixo e celular', () => {
    expect(mascararTelefone('')).toBe('')
    expect(mascararTelefone('11')).toBe('(11')
    expect(mascararTelefone('1133')).toBe('(11) 33')
    expect(mascararTelefone('1133334444')).toBe('(11) 3333-4444')
    expect(mascararTelefone('11999998888')).toBe('(11) 99999-8888')
  })

  it('senha e repetir senha', () => {
    expect(problemaNaSenha('curta', 'curta')).toContain('pelo menos 8')
    expect(problemaNaSenha('senha-segura', 'senha-segurA')).toContain('não conferem')
    expect(problemaNaSenha('senha-segura', 'senha-segura')).toBeNull()
  })
})
