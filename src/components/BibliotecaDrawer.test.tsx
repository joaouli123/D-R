// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BibliotecaDrawer } from './BibliotecaDrawer'
import { useApp } from '@/store/AppStore'
import type { TextoBiblioteca } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))

const texto = (
  id: string,
  titulo: string,
  tiposDocumento: TextoBiblioteca['tiposDocumento'],
): TextoBiblioteca => ({
  id,
  titulo,
  secao: 'analise',
  tiposDocumento,
  tags: [],
  conteudo: `Conteúdo de ${titulo}`,
  favorito: false,
  usos: 0,
  criadoEm: '2026-08-17',
})

const textos = [
  texto('geral', 'Texto geral', []),
  { ...texto('parecer', 'Texto de parecer', ['parecer']), referencia: '10.1.2' },
  { ...texto('outro-item', 'Texto de outro item', ['parecer']), referencia: '10.2.1' },
  { ...texto('laudo', 'Texto de laudo', ['laudo']), referencia: '10.1.2' },
]

beforeEach(() => {
  vi.mocked(useApp).mockReturnValue({
    textos,
    salvarTexto: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useApp>)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('BibliotecaDrawer por documento', () => {
  it('mostra o tipo atual e Uso geral, com opção de consultar tudo', async () => {
    const user = userEvent.setup()
    render(
      <BibliotecaDrawer
        open
        onClose={vi.fn()}
        secao="analise"
        tipoDocumento="parecer"
        referencia="10.1.2"
        onInserir={vi.fn()}
      />,
    )

    expect(screen.queryByText('Texto geral')).not.toBeNull()
    expect(screen.queryByText('Texto de parecer')).not.toBeNull()
    expect(screen.queryAllByText('Item 10.1.2')).toHaveLength(2)
    expect(screen.queryByText('Texto de outro item')).toBeNull()
    expect(screen.queryByText('Texto de laudo')).toBeNull()

    await user.click(screen.getByLabelText('Somente para este documento e seção'))
    expect(screen.queryByText('Texto de outro item')).not.toBeNull()
    expect(screen.queryByText('Texto de laudo')).not.toBeNull()
  })
})
