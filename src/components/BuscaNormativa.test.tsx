// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BuscaNormativa } from './BuscaNormativa'
import { SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'

afterEach(cleanup)

function renderizar(onSelect = vi.fn()) {
  render(
    <div>
      <BuscaNormativa
        itens={SUBSTANCIAS_ANEXO_11}
        value=""
        onSelect={onSelect}
        placeholder="Buscar substância"
      />
      <button type="button">Consultar CA</button>
    </div>,
  )
  return { onSelect, campo: screen.getByRole('combobox', { name: 'Buscar substância' }) }
}

describe('BuscaNormativa', () => {
  it('começa fechada, deixando à vista o que vem depois dela', () => {
    const { campo } = renderizar()

    expect(campo.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Consultar CA' })).toBeDefined()
  })

  it('abre no foco e limita a lista a trinta referências normativas', async () => {
    const user = userEvent.setup()
    const { campo } = renderizar()

    await user.click(campo)

    expect(campo.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('option')).toHaveLength(30)
    expect(screen.getByText('Acetaldeído — CAS 75-07-0')).toBeDefined()
  })

  it('fecha ao clicar fora, sem exigir Escape', async () => {
    const user = userEvent.setup()
    const { campo } = renderizar()

    await user.click(campo)
    expect(screen.getByRole('listbox')).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Consultar CA' }))

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(campo.getAttribute('aria-expanded')).toBe('false')
  })

  it('filtra pela consulta e fecha ao selecionar', async () => {
    const user = userEvent.setup()
    const { campo, onSelect } = renderizar()

    await user.type(campo, 'acetaldeído')
    const opcoes = screen.getAllByRole('option')
    expect(opcoes.length).toBeLessThan(30)

    await user.click(opcoes[0])

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ cas: '75-07-0' }))
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
