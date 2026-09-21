// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CampoHonorarios } from './CampoHonorarios'

afterEach(cleanup)

// O pai de verdade guarda o valor em centavos; o campo só o mostra e o edita.
function Pai({ inicial, aoMudar }: { inicial?: number; aoMudar?: (centavos: number | undefined) => void }) {
  const [centavos, setCentavos] = useState<number | undefined>(inicial)
  return (
    <CampoHonorarios
      centavos={centavos}
      onChange={(valor) => {
        setCentavos(valor)
        aoMudar?.(valor)
      }}
    />
  )
}

const campo = () => screen.getByLabelText<HTMLInputElement>('Valor proposto dos honorários (R$)')

describe('CampoHonorarios', () => {
  it('mostra o valor guardado no formato do dinheiro brasileiro', () => {
    render(<Pai inicial={250_050} />)

    expect(campo().value).toBe('2.500,50')
    expect(screen.getByText(/dois mil e quinhentos reais e cinquenta centavos/)).toBeDefined()
  })

  it('é um campo de texto (não reescreve o que o perito digita a cada tecla)', () => {
    render(<Pai />)

    expect(campo().type).toBe('text')
    expect(campo().getAttribute('inputmode')).toBe('decimal')
  })

  it('guarda em centavos e mostra o extenso enquanto digita', () => {
    const aoMudar = vi.fn()
    render(<Pai aoMudar={aoMudar} />)

    fireEvent.change(campo(), { target: { value: '5000' } })

    expect(aoMudar).toHaveBeenLastCalledWith(500_000)
    expect(screen.getByText('Por extenso: cinco mil reais.')).toBeDefined()
  })

  it('deixa o texto como foi digitado até sair do campo, e aí formata', () => {
    const aoMudar = vi.fn()
    render(<Pai aoMudar={aoMudar} />)

    fireEvent.change(campo(), { target: { value: '2.500,5' } })
    expect(campo().value).toBe('2.500,5')
    expect(aoMudar).toHaveBeenLastCalledWith(250_050)

    fireEvent.blur(campo())
    expect(campo().value).toBe('2.500,50')
  })

  it('aceita o valor colado com R$', () => {
    const aoMudar = vi.fn()
    render(<Pai aoMudar={aoMudar} />)

    fireEvent.change(campo(), { target: { value: 'R$ 3.500,00' } })
    fireEvent.blur(campo())

    expect(aoMudar).toHaveBeenLastCalledWith(350_000)
    expect(campo().value).toBe('3.500,00')
  })

  it('recusa texto que não é valor, sem mexer no valor guardado', () => {
    const aoMudar = vi.fn()
    render(<Pai inicial={100_000} aoMudar={aoMudar} />)

    fireEvent.change(campo(), { target: { value: '10abc' } })

    expect(screen.getByRole('alert').textContent).toMatch(/Use apenas números/)
    expect(campo().getAttribute('aria-invalid')).toBe('true')
    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('ao sair com texto inválido volta ao último valor bom e avisa', () => {
    render(<Pai inicial={100_000} />)

    fireEvent.change(campo(), { target: { value: '10abc' } })
    fireEvent.blur(campo())

    expect(campo().value).toBe('1.000,00')
    const aviso = screen.getByRole('alert').textContent ?? ''
    expect(aviso).toContain('10abc')
    expect(aviso).toContain('1.000,00')
  })

  it('o aviso some assim que o perito volta a digitar', () => {
    render(<Pai inicial={100_000} />)

    fireEvent.change(campo(), { target: { value: '10abc' } })
    fireEvent.blur(campo())
    fireEvent.change(campo(), { target: { value: '2000' } })

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('recusa valor acima do teto', () => {
    const aoMudar = vi.fn()
    render(<Pai aoMudar={aoMudar} />)

    fireEvent.change(campo(), { target: { value: '100.000.001' } })

    expect(screen.getByRole('alert').textContent).toMatch(/não pode passar de R\$ 100\.000\.000,00/)
    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('campo vazio ou zero limpa o valor e volta a dica de opcional', () => {
    const aoMudar = vi.fn()
    render(<Pai inicial={100_000} aoMudar={aoMudar} />)

    fireEvent.change(campo(), { target: { value: '' } })
    expect(aoMudar).toHaveBeenLastCalledWith(undefined)
    expect(screen.getByText(/Opcional\. A seção não será emitida/)).toBeDefined()

    fireEvent.change(campo(), { target: { value: '0' } })
    expect(aoMudar).toHaveBeenLastCalledWith(undefined)
    fireEvent.blur(campo())
    expect(campo().value).toBe('')
  })

  it('acompanha o valor quando ele muda por fora (perícia carregada depois)', () => {
    const { rerender } = render(<CampoHonorarios centavos={undefined} onChange={() => {}} />)
    expect(campo().value).toBe('')

    rerender(<CampoHonorarios centavos={123_456} onChange={() => {}} />)

    expect(campo().value).toBe('1.234,56')
  })
})
