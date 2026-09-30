// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BuscaProcesso } from './BuscaProcesso'
import type { DadosProcesso } from '@/services/api'

const { consultarProcesso } = vi.hoisted(() => ({ consultarProcesso: vi.fn() }))
vi.mock('@/services/api', () => ({
  consultas: { processo: consultarProcesso },
  // Mesma regra do módulo de verdade: o corpo que traz `estado` é o
  // aviso de que a busca continua correndo no servidor.
  aindaBuscando: (r: unknown) =>
    !!r && typeof r === 'object' && (r as { estado?: string }).estado === 'buscando',
}))

afterEach(cleanup)
// Corpo em bloco de propósito: `mockReset()` devolve o próprio mock, e o
// vitest chamaria esse retorno como função de limpeza ao fim do teste.
beforeEach(() => {
  consultarProcesso.mockReset()
})

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
  aviso:
    'A base pública do CNJ publica a tramitação, mas não os nomes das partes — reclamante e reclamadas continuam sendo preenchidos por você.',
}

function Campo({
  autoBuscar = true,
  onDados = vi.fn(),
}: {
  autoBuscar?: boolean
  onDados?: (dados: DadosProcesso, origem: 'automatica' | 'manual') => void
}) {
  const [valor, setValor] = useState('')
  return (
    <BuscaProcesso valor={valor} onChange={setValor} onDados={onDados} autoBuscar={autoBuscar} />
  )
}

const campo = () => screen.getByRole('textbox', { name: 'Número do processo' })

describe('BuscaProcesso', () => {
  it('perícia nova: o número fechou, vara e comarca chegam sozinhas', async () => {
    const user = userEvent.setup()
    const onDados = vi.fn()
    consultarProcesso.mockResolvedValue(PROCESSO)
    render(<Campo onDados={onDados} />)

    await user.type(campo(), '10008903820225020011')

    expect(await screen.findByText(/TRT2 · 1º grau/)).toBeDefined()
    expect(consultarProcesso).toHaveBeenCalledTimes(1)
    expect(consultarProcesso).toHaveBeenCalledWith('10008903820225020011')
    expect(onDados).toHaveBeenCalledWith(PROCESSO, 'automatica')
    expect((campo() as HTMLInputElement).value).toBe('1000890-38.2022.5.02.0011')
  })

  it('diz na tela que as partes não vêm do CNJ', async () => {
    const user = userEvent.setup()
    consultarProcesso.mockResolvedValue(PROCESSO)
    render(<Campo />)

    await user.type(campo(), '10008903820225020011')

    expect(await screen.findByText(/não os nomes das partes/)).toBeDefined()
  })

  it('mostra o segundo grau sem sobrescrever a vara de origem', async () => {
    const user = userEvent.setup()
    consultarProcesso.mockResolvedValue(PROCESSO)
    render(<Campo />)

    await user.type(campo(), '10008903820225020011')

    expect(await screen.findByText(/2º grau · 9ª Turma/)).toBeDefined()
  })

  it('perícia já preenchida: só busca pelo botão', async () => {
    const user = userEvent.setup()
    const onDados = vi.fn()
    consultarProcesso.mockResolvedValue(PROCESSO)
    render(<Campo autoBuscar={false} onDados={onDados} />)

    await user.type(campo(), '10008903820225020011')
    expect(consultarProcesso).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Buscar no CNJ/ }))

    expect(await screen.findByText(/TRT2 · 1º grau/)).toBeDefined()
    expect(onDados).toHaveBeenCalledWith(PROCESSO, 'manual')
  })

  it('tribunal fora da cobertura não trava o cadastro', async () => {
    const user = userEvent.setup()
    const onDados = vi.fn()
    consultarProcesso.mockImplementation(async () => {
      throw new Error('A consulta automática cobre a Justiça do Trabalho e a Justiça Federal.')
    })
    render(<Campo onDados={onDados} />)

    await user.type(campo(), '10008903820225020011')

    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('Justiça do Trabalho')
    expect(aviso.textContent).toContain('preenchimento manual')
    expect(onDados).not.toHaveBeenCalled()
  })

  it('CNJ lento: avisa que continua buscando e preenche quando chega', async () => {
    const user = userEvent.setup()
    const onDados = vi.fn()
    consultarProcesso
      .mockResolvedValueOnce({
        estado: 'buscando',
        numeroProcesso: '10008903820225020011',
        numeroFormatado: '1000890-38.2022.5.02.0011',
        desde: '2026-09-30T12:00:00.000Z',
        aviso: 'A base pública do CNJ está lenta agora. Continuamos consultando no servidor.',
      })
      .mockResolvedValue(PROCESSO)
    render(<Campo onDados={onDados} />)

    await user.type(campo(), '10008903820225020011')

    // Primeira resposta: nada de erro, e a tela diz que a busca segue.
    expect(await screen.findByText(/está lenta agora/)).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onDados).not.toHaveBeenCalled()

    // Passado o intervalo, a tela volta a perguntar e o dado chega.
    // A espera é de verdade: é o mesmo relógio que o perito vê.
    expect(await screen.findByText(/TRT2 · 1º grau/, {}, { timeout: 10_000 })).toBeDefined()
    expect(onDados).toHaveBeenCalledWith(PROCESSO, 'automatica')
    expect(screen.queryByText(/está lenta agora/)).toBeNull()
  }, 20_000)
})
