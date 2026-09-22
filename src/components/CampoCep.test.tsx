// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CampoCep } from './CampoCep'
import type { DadosCep } from '@/services/api'

const { consultarCep } = vi.hoisted(() => ({ consultarCep: vi.fn() }))
vi.mock('@/services/api', () => ({ consultas: { cep: consultarCep } }))

afterEach(cleanup)
beforeEach(() => {
  consultarCep.mockReset()
})

const PAULISTA: DadosCep = {
  cep: '01310100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  enderecoCompleto: 'Avenida Paulista, Bela Vista, São Paulo/SP',
  fonte: 'ViaCEP (via BrasilAPI)',
}

function Campo({ onEndereco = vi.fn() }: { onEndereco?: (dados: DadosCep) => void }) {
  const [valor, setValor] = useState('')
  return (
    <>
      <CampoCep valor={valor} onChange={setValor} onEndereco={onEndereco} focarAoPreencher="numero" />
      <input id="numero" aria-label="Número" />
    </>
  )
}

const campo = () => screen.getByRole('textbox', { name: 'CEP' }) as HTMLInputElement

describe('CampoCep', () => {
  it('formata enquanto digita e conta o que falta', async () => {
    const user = userEvent.setup()
    render(<Campo />)

    await user.type(campo(), '01310')
    expect(campo().value).toBe('01310')
    expect(screen.getByText('Faltam 3 dígitos.')).toBeDefined()

    await user.type(campo(), '1')
    expect(campo().value).toBe('01310-1')
    expect(consultarCep).not.toHaveBeenCalled()
  })

  it('fechou os 8 dígitos: o endereço chega e o cursor vai para o número', async () => {
    const user = userEvent.setup()
    const onEndereco = vi.fn()
    consultarCep.mockResolvedValue(PAULISTA)
    render(<Campo onEndereco={onEndereco} />)

    await user.type(campo(), '01310100')

    expect(await screen.findByText(/Endereço preenchido pelo CEP/)).toBeDefined()
    expect(campo().value).toBe('01310-100')
    expect(consultarCep).toHaveBeenCalledTimes(1)
    expect(consultarCep).toHaveBeenCalledWith('01310100')
    expect(onEndereco).toHaveBeenCalledWith(PAULISTA)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Número' }))
  })

  it('CEP que não existe deixa o endereço à mão e permite tentar de novo', async () => {
    const user = userEvent.setup()
    const onEndereco = vi.fn()
    consultarCep.mockRejectedValueOnce(new Error('CEP não encontrado.'))
    consultarCep.mockResolvedValueOnce(PAULISTA)
    render(<Campo onEndereco={onEndereco} />)

    await user.type(campo(), '01310100')

    expect(await screen.findByText(/CEP não encontrado\. Preencha o endereço à mão\./)).toBeDefined()
    expect(onEndereco).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText(/Endereço preenchido pelo CEP/)).toBeDefined()
    expect(onEndereco).toHaveBeenCalledWith(PAULISTA)
  })
})
