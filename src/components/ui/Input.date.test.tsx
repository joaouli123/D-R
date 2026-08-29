// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { Input } from './index'

afterEach(cleanup)

it('impede que um campo de data entregue ano com mais de quatro dígitos', () => {
  const aoAlterar = vi.fn()

  render(
    <Input
      label="Data da vistoria"
      type="date"
      value="2026-08-29"
      onChange={aoAlterar}
    />,
  )

  const campo = screen.getByLabelText('Data da vistoria') as HTMLInputElement
  fireEvent.change(campo, { target: { value: '202626-08-29' } })

  expect(aoAlterar).not.toHaveBeenCalled()
  expect(campo.value).toBe('2026-08-29')
})

it('mantém a seleção normal de uma data com ano de quatro dígitos', () => {
  const aoAlterar = vi.fn()

  render(
    <Input
      label="Data da vistoria"
      type="date"
      value=""
      onChange={(evento) => aoAlterar(evento.target.value)}
    />,
  )

  fireEvent.change(screen.getByLabelText('Data da vistoria'), {
    target: { value: '2026-08-29' },
  })

  expect(aoAlterar).toHaveBeenCalledOnce()
  expect(aoAlterar).toHaveBeenCalledWith('2026-08-29')
})
