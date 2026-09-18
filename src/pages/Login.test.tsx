// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useApp } from '@/store/AppStore'
import Login from './Login'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))

afterEach(cleanup)

describe('Login', () => {
  it('mantém o conteúdo institucional em um painel sem rolagem interna', () => {
    vi.mocked(useApp).mockReturnValue({ login: vi.fn() } as unknown as ReturnType<typeof useApp>)

    render(<Login />)

    const painel = screen.getByTestId('login-brand-panel')
    expect(painel.className).toContain('login-brand-panel')
    expect(painel.className).not.toContain('overflow-y-auto')
    expect(screen.getByText('Precisão, fundamentação e praticidade')).toBeDefined()
    expect(screen.getAllByText('Em desenvolvimento')).toHaveLength(2)
  })

  it('marca o formulário para o ajuste vertical de telas baixas', () => {
    vi.mocked(useApp).mockReturnValue({ login: vi.fn() } as unknown as ReturnType<typeof useApp>)

    render(<Login />)

    expect(screen.getByTestId('login-form-panel').className).toContain('login-form-panel')
    expect(screen.getByRole('heading', { name: 'Acessar o sistema' })).toBeDefined()
  })
})
