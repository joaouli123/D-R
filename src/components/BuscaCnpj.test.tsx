// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BuscaCnpj } from './BuscaCnpj'
import type { DadosCnpj } from '@/services/api'

const { consultarCnpj } = vi.hoisted(() => ({ consultarCnpj: vi.fn() }))
vi.mock('@/services/api', () => ({ consultas: { cnpj: consultarCnpj } }))

afterEach(cleanup)
// Corpo em bloco de propósito: `mockReset()` devolve o próprio mock, e o
// vitest chamaria esse retorno como função de limpeza ao fim do teste.
beforeEach(() => {
  consultarCnpj.mockReset()
})

const AURORA: DadosCnpj = {
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
  complemento: null,
  bairro: 'DISTRITO INDUSTRIAL',
  cidade: 'São Bernardo do Campo',
  uf: 'SP',
  cep: '09750-000',
  telefone: null,
  email: null,
  consultadoEm: '2026-08-22T12:00:00.000Z',
  fonte: 'Receita Federal (BrasilAPI)',
}

function Campo({
  autoBuscar = true,
  onDados = vi.fn(),
}: {
  autoBuscar?: boolean
  onDados?: (dados: DadosCnpj, origem: 'automatica' | 'manual') => void
}) {
  const [valor, setValor] = useState('')
  return <BuscaCnpj valor={valor} onChange={setValor} onDados={onDados} autoBuscar={autoBuscar} />
}

const campo = () => screen.getByRole('textbox', { name: 'CNPJ' })

describe('BuscaCnpj', () => {
  it('cadastro em branco: completou os 14 dígitos, os dados chegam sozinhos', async () => {
    const user = userEvent.setup()
    const onDados = vi.fn()
    consultarCnpj.mockResolvedValue(AURORA)
    render(<Campo onDados={onDados} />)

    await user.type(campo(), '11222333000181')

    expect(await screen.findByText(/METALURGICA AURORA LTDA/)).toBeDefined()
    expect(consultarCnpj).toHaveBeenCalledTimes(1)
    expect(consultarCnpj).toHaveBeenCalledWith('11222333000181')
    expect(onDados).toHaveBeenCalledWith(AURORA, 'automatica')
    expect((campo() as HTMLInputElement).value).toBe('11.222.333/0001-81')
  })

  it('cadastro já preenchido: só busca quando o perito pede', async () => {
    const user = userEvent.setup()
    const onDados = vi.fn()
    consultarCnpj.mockResolvedValue(AURORA)
    render(<Campo autoBuscar={false} onDados={onDados} />)

    await user.type(campo(), '11222333000181')
    expect(consultarCnpj).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Buscar na Receita/ }))

    expect(await screen.findByText(/METALURGICA AURORA LTDA/)).toBeDefined()
    expect(onDados).toHaveBeenCalledWith(AURORA, 'manual')
  })

  it('botão fica fora de alcance enquanto o número não fecha', async () => {
    const user = userEvent.setup()
    render(<Campo autoBuscar={false} />)

    const botao = screen.getByRole('button', { name: /Buscar na Receita/ })
    expect((botao as HTMLButtonElement).disabled).toBe(true)

    await user.type(campo(), '11222333000181')
    expect((botao as HTMLButtonElement).disabled).toBe(false)
  })

  it('falha na consulta explica o que houve e deixa o cadastro seguir à mão', async () => {
    const user = userEvent.setup()
    const onDados = vi.fn()
    consultarCnpj.mockImplementation(async () => {
      throw new Error('CNPJ não consta na base da Receita Federal.')
    })
    render(<Campo onDados={onDados} />)

    await user.type(campo(), '11222333000181')

    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('CNPJ não consta na base da Receita Federal.')
    expect(aviso.textContent).toContain('livres para preenchimento manual')
    expect(onDados).not.toHaveBeenCalled()
  })

  it('depois da falha, corrigir e redigitar o mesmo número não dispara busca de novo', async () => {
    const user = userEvent.setup()
    consultarCnpj.mockImplementation(async () => {
      throw new Error('Fonte fora do ar.')
    })
    render(<Campo />)

    await user.type(campo(), '11222333000181')
    await screen.findByRole('alert')

    await user.type(campo(), '{backspace}1')

    expect(consultarCnpj).toHaveBeenCalledTimes(1)
  })

  it('não fala em grau de risco: o dado saiu deste tipo de documento', async () => {
    const user = userEvent.setup()
    consultarCnpj.mockResolvedValue(AURORA)
    render(<Campo />)

    await user.type(campo(), '11222333000181')
    await screen.findByText(/METALURGICA AURORA LTDA/)

    expect(screen.queryByText(/Grau de risco/)).toBeNull()
  })

  it('empresa baixada é apontada — pode não ser a reclamada do processo', async () => {
    const user = userEvent.setup()
    consultarCnpj.mockResolvedValue({ ...AURORA, situacao: 'BAIXADA' })
    render(<Campo />)

    await user.type(campo(), '11222333000181')

    expect(await screen.findByText(/situação cadastral BAIXADA/)).toBeDefined()
  })
})
