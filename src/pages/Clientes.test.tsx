// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Clientes from './Clientes'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { Empresa, Pericia } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
// Só o cabeçalho interessa aqui — o resto do layout arrasta a aplicação inteira.
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {action}
    </div>
  ),
}))

const removerEmpresa = vi.fn()
const limparEmpresas = vi.fn()

const empresa = (id: string, razaoSocial: string): Empresa => ({
  id,
  razaoSocial,
  cnpj: '11222333000181',
  endereco: 'Rua Um',
  cidade: 'Campinas',
  uf: 'SP',
  criadoEm: '2026-08-01T12:00:00.000Z',
})

/** Perícia mínima que cita `empresaId` como reclamada. */
const periciaCom = (empresaId: string, status: Pericia['status'] = 'concluida') =>
  ({
    id: `per-${empresaId}`,
    reclamante: 'FULANO DE TAL',
    numeroProcesso: '1000675-40.2026.5.02.0264',
    status,
    reclamadas: [{ empresaId }],
  }) as unknown as Pericia

function montar(empresas: Empresa[], pericias: Pericia[] = []) {
  vi.mocked(useApp).mockReturnValue({
    empresas,
    pericias,
    removerEmpresa,
    limparEmpresas,
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter>
      <ToastProvider>
        <Clientes />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  removerEmpresa.mockReset()
  limparEmpresas.mockReset()
})

afterEach(cleanup)

describe('Clientes — limpeza dos cadastros de teste', () => {
  it('base vazia não oferece o botão de limpar', () => {
    montar([])
    expect(screen.queryByRole('button', { name: 'Limpar cadastros' })).toBeNull()
  })

  it('não apaga no primeiro clique: pede confirmação antes', async () => {
    const user = userEvent.setup()
    montar([empresa('e1', 'ALFA LTDA'), empresa('e2', 'BETA LTDA')])

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))

    expect(limparEmpresas).not.toHaveBeenCalled()
    expect(screen.getByText(/Serão apagadas as/).textContent).toContain('2')
  })

  it('avisa antes que empresa citada em processo vai ficar', async () => {
    const user = userEvent.setup()
    montar([empresa('e1', 'ALFA LTDA'), empresa('e2', 'BETA LTDA')], [periciaCom('e2')])

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))

    expect(screen.getByText(/é reclamada em um processo e será mantida/)).toBeDefined()
  })

  it('nomeia o processo que prende o cadastro, senão a sobra vira mistério', async () => {
    const user = userEvent.setup()
    montar([empresa('e1', 'ALFA LTDA'), empresa('e2', 'BETA LTDA')], [periciaCom('e2')])

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))

    expect(screen.getByText('FULANO DE TAL')).toBeDefined()
    expect(screen.getByText('1000675-40.2026.5.02.0264')).toBeDefined()
  })

  it('confirmada, apaga e diz quantas saíram', async () => {
    const user = userEvent.setup()
    limparEmpresas.mockResolvedValue({ excluidas: 2, rascunhosExcluidos: 0, mantidas: [] })
    montar([empresa('e1', 'ALFA LTDA'), empresa('e2', 'BETA LTDA')])

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))
    await user.click(screen.getByRole('button', { name: 'Apagar cadastros' }))

    expect(limparEmpresas).toHaveBeenCalledWith(false)
    expect(await screen.findByText('2 empresas excluídas.')).toBeDefined()
  })

  it('quem ficou é dito pelo nome — senão o perito conta e não entende a sobra', async () => {
    const user = userEvent.setup()
    limparEmpresas.mockResolvedValue({
      excluidas: 1,
      rascunhosExcluidos: 0,
      mantidas: [{ id: 'e2', razaoSocial: 'BETA LTDA', cnpj: '11222333000181', processos: 1 }],
    })
    montar([empresa('e1', 'ALFA LTDA'), empresa('e2', 'BETA LTDA')], [periciaCom('e2')])

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))
    await user.click(screen.getByRole('button', { name: 'Apagar cadastros' }))

    const aviso = await screen.findByText(/1 empresa excluída/)
    expect(aviso.textContent).toContain('1 ficou por estar em processo: BETA LTDA')
  })

  it('rascunho que prende cadastro pode sair junto, por escolha explícita', async () => {
    const user = userEvent.setup()
    limparEmpresas.mockResolvedValue({ excluidas: 2, rascunhosExcluidos: 1, mantidas: [] })
    montar(
      [empresa('e1', 'ALFA LTDA'), empresa('e2', 'BETA LTDA')],
      [periciaCom('e2', 'rascunho')],
    )

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Apagar cadastros' }))

    expect(limparEmpresas).toHaveBeenCalledWith(true)
    expect(await screen.findByText('2 empresas excluídas e 1 rascunho excluído.')).toBeDefined()
  })

  it('perícia concluída não oferece varrer rascunho — não há rascunho a varrer', async () => {
    const user = userEvent.setup()
    montar([empresa('e1', 'ALFA LTDA'), empresa('e2', 'BETA LTDA')], [periciaCom('e2')])

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))

    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('falha do servidor não some com a janela sem explicação', async () => {
    const user = userEvent.setup()
    limparEmpresas.mockRejectedValue(new Error('Banco indisponível.'))
    montar([empresa('e1', 'ALFA LTDA')])

    await user.click(screen.getByRole('button', { name: 'Limpar cadastros' }))
    await user.click(screen.getByRole('button', { name: 'Apagar cadastros' }))

    expect(await screen.findByText('Banco indisponível.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Apagar cadastros' })).toBeDefined()
  })
})
