// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'
import { useApp } from '@/store/AppStore'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/BuscaGlobal', () => ({ BuscaGlobal: () => <div>Busca</div> }))

afterEach(cleanup)

describe('painel lateral por tipo de documento', () => {
  it('leva às ações disponíveis e mantém os módulos futuros desabilitados', () => {
    vi.mocked(useApp).mockReturnValue({
      usuario: { id: 'u-1', nome: 'Perito Teste', email: 'teste@example.com', perfil: 'perito' },
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useApp>)

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Página inicial</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    const navegacao = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(navegacao).getAllByRole('link').map((link) => link.textContent?.trim())).toEqual([
      'Início',
      'Cadastrar Empresa',
      'Gerar Parecer Técnico Pericial',
      'Gerar Laudo Técnico Pericial',
      'Elaborar Quesitos Técnicos',
      'Elaborar Manifestação sobre o Laudo',
      'Elaborar Impugnação ao Laudo',
      'Elaborar Esclarecimentos Técnicos',
      'Biblioteca',
      'Configurações',
      'Ajuda',
    ])

    const futuros = screen.getByRole('region', { name: 'Em desenvolvimento' })
    expect(within(futuros).getAllByRole('button').map((botao) => ({
      texto: botao.textContent?.replace(/\s+/g, ' ').trim(),
      desabilitado: (botao as HTMLButtonElement).disabled,
    }))).toEqual([
      { texto: 'Gerar PGR Em breve', desabilitado: true },
      { texto: 'Gerar Laudo de Insalubridade Em breve', desabilitado: true },
      { texto: 'Gerar Laudo de Periculosidade Em breve', desabilitado: true },
      { texto: 'Gerar LTCAT Em breve', desabilitado: true },
      { texto: 'Entrega de EPIs por biometria/facial Em breve', desabilitado: true },
    ])
  })
})
