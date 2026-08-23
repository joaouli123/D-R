// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { empresaVazia, ModalEmpresa } from './ModalEmpresa'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { Empresa } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/services/api', () => ({ consultas: { cnpj: vi.fn() } }))

const salvarEmpresa = vi.fn()

beforeEach(() => {
  salvarEmpresa.mockReset()
  vi.mocked(useApp).mockReturnValue({ salvarEmpresa } as unknown as ReturnType<typeof useApp>)
})

afterEach(cleanup)

const preencher = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('textbox', { name: /Razão social/ }), 'ADZ SERVICOS LTDA')
  await user.type(screen.getByRole('textbox', { name: 'CNPJ' }), '11222333000181')
}

describe('ModalEmpresa', () => {
  it('devolve a empresa como o servidor gravou — é ela que vira reclamada', async () => {
    const user = userEvent.setup()
    const onSalvo = vi.fn()
    const onFechar = vi.fn()
    // O servidor pode devolver o registro com outro id (empresa já
    // cadastrada com o mesmo CNPJ, por exemplo): quem vincula precisa
    // do id salvo, não do que a tela inventou.
    salvarEmpresa.mockImplementation(async (e: Empresa) => ({ ...e, id: 'emp-do-servidor' }))

    render(
      <ModalEmpresa
        inicial={empresaVazia()}
        titulo="Nova empresa reclamada"
        onFechar={onFechar}
        onSalvo={onSalvo}
      />,
    )

    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Salvar empresa' }))

    expect(salvarEmpresa).toHaveBeenCalledTimes(1)
    expect(salvarEmpresa.mock.calls[0]?.[0]).toMatchObject({ razaoSocial: 'ADZ SERVICOS LTDA' })
    expect(onSalvo).toHaveBeenCalledWith(expect.objectContaining({ id: 'emp-do-servidor' }))
    expect(onFechar).toHaveBeenCalled()
  })

  it('sem razão social e CNPJ não salva nem fecha', async () => {
    const user = userEvent.setup()
    const onFechar = vi.fn()

    render(<ModalEmpresa inicial={empresaVazia()} titulo="Nova empresa" onFechar={onFechar} />)

    await user.click(screen.getByRole('button', { name: 'Salvar empresa' }))

    expect(salvarEmpresa).not.toHaveBeenCalled()
    expect(onFechar).not.toHaveBeenCalled()
  })

  it('erro do servidor mantém a janela aberta com o que foi digitado', async () => {
    const user = userEvent.setup()
    const onSalvo = vi.fn()
    const onFechar = vi.fn()
    salvarEmpresa.mockRejectedValue(new Error('CNPJ já cadastrado.'))

    render(
      // Com o provedor de avisos porque o que importa aqui é o perito
      // *ver* a recusa do servidor, não só o cadastro não fechar.
      <ToastProvider>
        <ModalEmpresa
          inicial={empresaVazia()}
          titulo="Nova empresa"
          onFechar={onFechar}
          onSalvo={onSalvo}
        />
      </ToastProvider>,
    )

    await preencher(user)
    await user.click(screen.getByRole('button', { name: 'Salvar empresa' }))

    expect(await screen.findByText('CNPJ já cadastrado.')).toBeDefined()
    expect(onSalvo).not.toHaveBeenCalled()
    expect(onFechar).not.toHaveBeenCalled()
    expect((screen.getByRole('textbox', { name: /Razão social/ }) as HTMLInputElement).value).toBe(
      'ADZ SERVICOS LTDA',
    )
  })
})
