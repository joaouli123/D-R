import { describe, expect, it } from 'vitest'

import {
  cnpjCompleto,
  digitos,
  numeroProcessoCompleto,
  origemDoGrauRisco,
  outrasInstancias,
  patchDaReceita,
  patchDoProcesso,
  resumoDaReceita,
  resumoDoProcesso,
  situacaoIrregular,
} from './consultas'
import type { DadosCnpj, DadosProcesso } from '@/services/api'
import type { Empresa, Pericia } from '@/types'

const RECEITA: DadosCnpj = {
  cnpj: '11222333000181',
  cnpjFormatado: '11.222.333/0001-81',
  razaoSocial: 'METALURGICA AURORA LTDA',
  nomeFantasia: 'AURORA',
  situacao: 'ATIVA',
  situacaoDesde: '2005-11-03',
  cnae: '25.11-0-00',
  cnaeDescricao: 'Fabricacao de estruturas metalicas',
  grauRisco: '4',
  grauRiscoClasse: '25.11-0',
  naturezaJuridica: 'Sociedade Empresaria Limitada',
  porte: 'DEMAIS',
  abertura: '2005-11-03',
  endereco: 'Rua das Industrias',
  numero: '1200',
  complemento: 'GALPAO 3',
  bairro: 'DISTRITO INDUSTRIAL',
  cidade: 'São Bernardo do Campo',
  uf: 'SP',
  cep: '09750-000',
  telefone: '(11) 4330-1000',
  email: 'contato@aurora.com.br',
  consultadoEm: '2026-08-22T12:00:00.000Z',
  fonte: 'Receita Federal (BrasilAPI)',
}

const empresa = (patch: Partial<Empresa> = {}): Empresa =>
  ({
    id: 'emp-1',
    razaoSocial: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    uf: 'SP',
    criadoEm: '2026-08-22T12:00:00.000Z',
    ...patch,
  }) as Empresa

const PROCESSO: DadosProcesso = {
  numeroProcesso: '10008903820225020011',
  numeroFormatado: '1000890-38.2022.5.02.0011',
  tribunal: 'TRT2',
  grau: 'G1',
  grauRotulo: '1º grau',
  vara: '11ª Vara do Trabalho de São Paulo',
  comarca: 'São Paulo/SP',
  classe: 'Ação Trabalhista - Rito Ordinário',
  assuntos: ['Adicional de Insalubridade'],
  dataAjuizamento: '2022-02-23T16:55:23.000Z',
  instancias: [
    {
      grau: 'G1',
      grauRotulo: '1º grau',
      orgao: '11ª Vara do Trabalho de São Paulo',
      classe: 'Ação Trabalhista - Rito Ordinário',
      dataAjuizamento: '2022-02-23T16:55:23.000Z',
      ultimaAtualizacao: '2024-03-01T10:00:00.000Z',
      assuntos: ['Adicional de Insalubridade'],
    },
    {
      grau: 'G2',
      grauRotulo: '2º grau',
      orgao: '9ª Turma',
      classe: 'Recurso Ordinário Trabalhista',
      dataAjuizamento: null,
      ultimaAtualizacao: '2025-06-10T10:00:00.000Z',
      assuntos: [],
    },
  ],
  consultadoEm: '2026-08-22T12:00:00.000Z',
  fonte: 'Base pública do CNJ (DataJud) — TRT2',
  aviso: 'A base pública do CNJ não publica os nomes das partes.',
}

const pericia = (patch: Partial<Pericia> = {}): Pericia =>
  ({ id: 'per-1', numeroProcesso: '', vara: '', comarca: '', ...patch }) as Pericia

describe('digitos e completude', () => {
  it('tira máscara do que veio digitado', () => {
    expect(digitos('11.222.333/0001-81')).toBe('11222333000181')
    expect(digitos('')).toBe('')
  })

  it('reconhece CNPJ e número de processo fechados', () => {
    expect(cnpjCompleto('11.222.333/0001-81')).toBe(true)
    expect(cnpjCompleto('11.222.333/0001-8')).toBe(false)
    expect(numeroProcessoCompleto('1000890-38.2022.5.02.0011')).toBe(true)
    expect(numeroProcessoCompleto('1000890-12.2022.5.02.001')).toBe(false)
  })
})

describe('patchDaReceita', () => {
  it('preenche o cadastro em branco', () => {
    const patch = patchDaReceita(empresa(), RECEITA)
    expect(patch.razaoSocial).toBe('METALURGICA AURORA LTDA')
    expect(patch.cidade).toBe('São Bernardo do Campo')
    expect(patch.cep).toBe('09750-000')
    expect(patch.contatoEmail).toBe('contato@aurora.com.br')
    expect(patch.ramoAtividade).toBe('Fabricacao de estruturas metalicas')
  })

  it('busca automática não reescreve o que o perito digitou', () => {
    const atual = empresa({ razaoSocial: 'Aurora (matriz)', bairro: 'Centro' })
    const patch = patchDaReceita(atual, RECEITA)
    expect(patch.razaoSocial).toBeUndefined()
    expect(patch.bairro).toBeUndefined()
    expect(patch.cidade).toBe('São Bernardo do Campo')
  })

  it('a UF é exceção: o "SP" do formulário é padrão de tela, não digitação', () => {
    const patch = patchDaReceita(empresa({ uf: 'SP' }), { ...RECEITA, uf: 'MG' })
    expect(patch.uf).toBe('MG')
  })

  it('o grau de risco do formulário também é padrão de tela: o da NR-04 entra por cima', () => {
    const patch = patchDaReceita(empresa({ grauRisco: '3' }), RECEITA)
    expect(patch.grauRisco).toBe('4')
  })

  it('CNAE fora da tabela da NR-04 não mexe no grau que está na tela', () => {
    const patch = patchDaReceita(empresa({ grauRisco: '3' }), {
      ...RECEITA,
      grauRisco: null,
      grauRiscoClasse: null,
    })
    expect('grauRisco' in patch).toBe(false)
  })

  it('pelo botão, o dado oficial substitui o que estava lá', () => {
    const atual = empresa({ razaoSocial: 'Aurora (matriz)', bairro: 'Centro' })
    const patch = patchDaReceita(atual, RECEITA, { sobrescrever: true })
    expect(patch.razaoSocial).toBe('METALURGICA AURORA LTDA')
    expect(patch.bairro).toBe('DISTRITO INDUSTRIAL')
  })

  it('campo que a Receita não tem não vira string vazia no cadastro', () => {
    const patch = patchDaReceita(empresa(), { ...RECEITA, email: null, telefone: '' })
    expect('contatoEmail' in patch).toBe(false)
    expect('contatoTelefone' in patch).toBe(false)
  })
})

describe('patchDoProcesso', () => {
  it('traz vara e comarca da perícia nova', () => {
    expect(patchDoProcesso(pericia(), PROCESSO)).toEqual({
      vara: '11ª Vara do Trabalho de São Paulo',
      comarca: 'São Paulo/SP',
    })
  })

  it('não mexe na vara já preenchida quando a busca foi automática', () => {
    const atual = pericia({ vara: '11ª VT/SP' })
    expect(patchDoProcesso(atual, PROCESSO)).toEqual({ comarca: 'São Paulo/SP' })
  })

  it('pelo botão, atualiza as duas', () => {
    const atual = pericia({ vara: '11ª VT/SP', comarca: 'SP' })
    expect(patchDoProcesso(atual, PROCESSO, { sobrescrever: true })).toEqual({
      vara: '11ª Vara do Trabalho de São Paulo',
      comarca: 'São Paulo/SP',
    })
  })

  it('processo sem órgão identificado não devolve patch nenhum', () => {
    expect(patchDoProcesso(pericia(), { ...PROCESSO, vara: null, comarca: null })).toEqual({})
  })
})

describe('resumos de conferência', () => {
  it('resume o cadastro da Receita', () => {
    expect(resumoDaReceita(RECEITA)).toBe(
      'METALURGICA AURORA LTDA · ATIVA · São Bernardo do Campo/SP',
    )
  })

  it('acusa empresa que não está ativa', () => {
    expect(situacaoIrregular(RECEITA)).toBe(false)
    expect(situacaoIrregular({ ...RECEITA, situacao: 'BAIXADA' })).toBe(true)
    expect(situacaoIrregular({ ...RECEITA, situacao: null })).toBe(false)
  })

  it('mostra de qual classe da NR-04 saiu o grau de risco', () => {
    expect(origemDoGrauRisco(RECEITA)).toBe(
      'Grau de risco 4 pelo Anexo I da NR-04 para a classe 25.11-0 — confira pela atividade do setor avaliado.',
    )
    expect(origemDoGrauRisco({ ...RECEITA, grauRisco: null })).toBeNull()
  })

  it('resume o processo', () => {
    expect(resumoDoProcesso(PROCESSO)).toContain('TRT2 · 1º grau · Ação Trabalhista')
    expect(resumoDoProcesso(PROCESSO)).toContain('ajuizado em')
  })

  it('lista as demais instâncias, sem repetir a principal', () => {
    expect(outrasInstancias(PROCESSO)).toEqual(['2º grau · 9ª Turma · Recurso Ordinário Trabalhista'])
    expect(outrasInstancias({ ...PROCESSO, instancias: [PROCESSO.instancias[0]] })).toEqual([])
  })
})
