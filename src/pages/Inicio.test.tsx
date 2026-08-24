// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Inicio from './Inicio'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { Pericia } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
// Só o cabeçalho interessa aqui — o resto do layout arrasta a aplicação inteira.
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

const removerPericia = vi.fn()

const pericia = (id: string, reclamante: string, status: Pericia['status'] = 'rascunho') =>
  ({
    id,
    reclamante,
    numeroProcesso: `100067${id}-40.2026.5.02.0264`,
    status,
    reclamadas: [],
    atualizadoEm: '2026-08-22T12:00:00.000Z',
  }) as unknown as Pericia

function montar(pericias: Pericia[]) {
  vi.mocked(useApp).mockReturnValue({
    usuario: { nome: 'Henrique Dinoel' },
    pericias,
    documentos: [],
    empresas: [],
    removerPericia,
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter>
      <ToastProvider>
        <Inicio />
      </ToastProvider>
    </MemoryRouter>,
  )
}

// Corpo em bloco de propósito: o que `beforeEach` devolve o Vitest
// registra como limpeza, e `mockReset()` devolve o próprio mock — em
// forma concisa, ele seria chamado de novo no fim de cada teste.
beforeEach(() => {
  removerPericia.mockReset()
})
afterEach(cleanup)

describe('Início — descartar o que ficou em aberto', () => {
  it('cada perícia em aberto pode ser excluída dali mesmo', async () => {
    const user = userEvent.setup()
    removerPericia.mockResolvedValue(undefined)
    montar([pericia('1', 'JHONATHAN VICTOR'), pericia('2', 'EDMAR KANASHIRO')])

    await user.click(screen.getByRole('button', { name: 'Excluir perícia de EDMAR KANASHIRO' }))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(removerPericia).toHaveBeenCalledWith('2')
    expect(await screen.findByText('Perícia excluída.')).toBeDefined()
  })

  it('não apaga no primeiro clique: pede confirmação antes', async () => {
    const user = userEvent.setup()
    montar([pericia('1', 'JHONATHAN VICTOR')])

    await user.click(screen.getByRole('button', { name: 'Excluir perícia de JHONATHAN VICTOR' }))

    expect(removerPericia).not.toHaveBeenCalled()
    expect(screen.getByText(/Documentos já\s+gerados permanecem no histórico/)).toBeDefined()
  })

  it('falha do servidor é dita, não engolida', async () => {
    const user = userEvent.setup()
    removerPericia.mockRejectedValue(new Error('Banco indisponível.'))
    montar([pericia('1', 'JHONATHAN VICTOR')])

    await user.click(screen.getByRole('button', { name: 'Excluir perícia de JHONATHAN VICTOR' }))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('Banco indisponível.')).toBeDefined()
  })

  it('sem perícia em aberto, o cartão de retomada não aparece', () => {
    montar([])
    expect(screen.queryByText('Continuar de onde parou')).toBeNull()
  })
})
