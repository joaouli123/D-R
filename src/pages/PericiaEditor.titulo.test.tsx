// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ breadcrumb, title }: { breadcrumb?: string; title: string }) => (
    <header>
      <p>{breadcrumb}</p>
      <h1>{title}</h1>
    </header>
  ),
}))
vi.mock('@/components/BuscaProcesso', () => ({
  BuscaProcesso: () => <div>Busca de processo</div>,
}))
vi.mock('@/components/EpiSelector', () => ({
  EpiSelector: () => <div>Seleção de EPI</div>,
}))

afterEach(cleanup)

// Perícia nova: o editor monta o rascunho sozinho, a loja só precisa existir.
function abrirEditor(rota: string) {
  vi.mocked(useApp).mockReturnValue({
    usuario: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'perito' },
    empresas: [],
    pericias: [],
    documentos: [],
    textos: [],
    quesitos: [],
    salvarPericia: vi.fn(),
    salvarDocumento: vi.fn(),
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <Routes>
          <Route path="/pericias/nova" element={<PericiaEditor />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

const titulo = () => screen.getByRole('heading', { level: 1 }).textContent

describe('PericiaEditor — cabeçalho do documento novo', () => {
  it('chama de Parecer Técnico o que entra por "Gerar Parecer"', () => {
    abrirEditor('/pericias/nova?tipo=parecer')

    expect(titulo()).toBe('Novo Parecer Técnico')
    expect(screen.queryByText(/Nova perícia/i)).toBeNull()
  })

  it('chama de Laudo Técnico o que entra por "Gerar Laudo"', () => {
    abrirEditor('/pericias/nova?tipo=laudo')

    expect(titulo()).toBe('Novo Laudo Técnico')
    expect(screen.getByText('Novo Laudo Técnico', { selector: 'p' })).toBeDefined()
  })

  it('sem tipo na rota, o atalho antigo continua abrindo um parecer', () => {
    abrirEditor('/pericias/nova')

    expect(titulo()).toBe('Novo Parecer Técnico')
  })
})
