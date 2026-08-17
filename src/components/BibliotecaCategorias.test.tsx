// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BibliotecaCategorias } from './BibliotecaCategorias'

describe('BibliotecaCategorias', () => {
  it('expõe categorias, contagens e seleção acessível', async () => {
    const onChange = vi.fn()
    render(
      <BibliotecaCategorias
        ativa="parecer"
        contagens={{
          todas: 8,
          parecer: 3,
          laudo: 2,
          quesitos: 1,
          manifestacao: 0,
          impugnacao: 1,
          esclarecimento: 0,
          geral: 2,
        }}
        onChange={onChange}
      />,
    )

    expect(
      screen.getByRole('button', { name: /Parecer Técnico Pericial: 3 textos/ }).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true')
    expect(screen.getAllByRole('button')).toHaveLength(8)

    await userEvent.click(screen.getByRole('button', { name: /Laudo Técnico Pericial: 2 textos/ }))
    expect(onChange).toHaveBeenCalledWith('laudo')
  })
})
