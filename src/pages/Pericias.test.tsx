// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Pericias from './Pericias'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { Pericia } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {action}
    </div>
  ),
}))

const removerPericia = vi.fn()

const pericia = {
  id: 'p1',
  numeroProcesso: '1000675-40.2026.5.02.0264',
  reclamante: 'FULANO DE TAL',
  vara: '1ª Vara',
  status: 'concluida',
  modalidade: 'insalubridade',
  reclamadas: [{ empresaId: 'e1', principal: true }],
  participantes: [],
  atualizadoEm: '2026-09-21T12:00:00.000Z',
} as unknown as Pericia

function montar() {
  vi.mocked(useApp).mockReturnValue({
    pericias: [pericia],
    empresaPorId: () => undefined,
    removerPericia,
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter>
      <ToastProvider>
        <Pericias />
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function excluir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Excluir perícia' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
}

beforeEach(() => {
  removerPericia.mockReset()
})
afterEach(cleanup)

describe('Perícias — exclusão', () => {
  it('só diz "excluída" depois que o servidor confirma', async () => {
    const user = userEvent.setup()
    removerPericia.mockResolvedValue(undefined)
    montar()

    await excluir(user)

    expect(removerPericia).toHaveBeenCalledWith('p1')
    expect(await screen.findByText('Perícia excluída.')).toBeDefined()
  })

  it('falha do servidor aparece — não vira um "excluída" que não aconteceu', async () => {
    const user = userEvent.setup()
    removerPericia.mockRejectedValue(new Error('Sessão expirada.'))
    montar()

    await excluir(user)

    expect(await screen.findByText('Sessão expirada.')).toBeDefined()
    expect(screen.queryByText('Perícia excluída.')).toBeNull()
  })

  it('perícia entregue tem aba própria — não some da vista', () => {
    montar()
    expect(screen.getByText(/Entregues/)).toBeDefined()
  })
})
