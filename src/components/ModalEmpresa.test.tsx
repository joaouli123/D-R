// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { empresaVazia, ModalEmpresa } from './ModalEmpresa'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { Empresa } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
const { consultarCep } = vi.hoisted(() => ({ consultarCep: vi.fn() }))
vi.mock('@/services/api', () => ({ consultas: { cnpj: vi.fn(), cep: consultarCep } }))

const salvarEmpresa = vi.fn()

beforeEach(() => {
  salvarEmpresa.mockReset()
  consultarCep.mockReset()
  vi.mocked(useApp).mockReturnValue({ salvarEmpresa } as unknown as ReturnType<typeof useApp>)
})

afterEach(cleanup)

const preencher = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('textbox', { name: /Razão social/ }), 'ADZ SERVICOS LTDA')
  await user.type(screen.getByRole('textbox', { name: 'CPF ou CNPJ' }), '11222333000181')
}

const valor = (nome: RegExp) => (screen.getByRole('textbox', { name: nome }) as HTMLInputElement).value

describe('ModalEmpresa', () => {
  it('permite registrar o grau de risco sem assumir grau 3 no cadastro vazio', () => {
    render(<ModalEmpresa inicial={empresaVazia()} titulo="Nova empresa" onFechar={vi.fn()} />)

    const grau = screen.getByRole('combobox', { name: /Grau de risco/ }) as HTMLSelectElement
    expect(grau.value).toBe('')
    expect(screen.getByRole('option', { name: 'Não informado' })).toBeDefined()
  })

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

  it('o CEP vem antes do logradouro e preenche o endereço', async () => {
    const user = userEvent.setup()
    consultarCep.mockResolvedValue({
      cep: '09750000',
      logradouro: 'Rua das Indústrias',
      bairro: 'Distrito Industrial',
      cidade: 'São Bernardo do Campo',
      uf: 'SP',
      enderecoCompleto: '',
      fonte: 'ViaCEP',
    })
    render(<ModalEmpresa inicial={empresaVazia()} titulo="Nova empresa" onFechar={vi.fn()} />)

    const cep = screen.getByRole('textbox', { name: /^CEP/ })
    const rua = screen.getByRole('textbox', { name: /^Logradouro/ })
    expect(cep.compareDocumentPosition(rua) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.type(cep, '09750000')

    await screen.findByText(/Endereço preenchido pelo CEP/)
    expect(valor(/^CEP/)).toBe('09750-000')
    expect(valor(/^Logradouro/)).toBe('Rua das Indústrias')
    expect(valor(/^Bairro/)).toBe('Distrito Industrial')
    expect(valor(/^Cidade/)).toBe('São Bernardo do Campo')
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /^Número/ }))
  })

  it('aceita reclamada pessoa física pelo CPF e formata o telefone', async () => {
    const user = userEvent.setup()
    salvarEmpresa.mockImplementation(async (e: Empresa) => e)
    render(<ModalEmpresa inicial={empresaVazia()} titulo="Nova empresa" onFechar={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: 'CPF ou CNPJ' }), '52998224725')
    expect(valor(/^CPF ou CNPJ/)).toBe('529.982.247-25')
    await user.type(screen.getByRole('textbox', { name: /^Nome completo/ }), 'Maria da Silva')
    await user.type(screen.getByRole('textbox', { name: /^Telefone/ }), '11987654321')
    expect(valor(/^Telefone/)).toBe('(11) 98765-4321')
    await user.click(screen.getByRole('button', { name: 'Salvar empresa' }))

    expect(salvarEmpresa.mock.calls[0]?.[0]).toMatchObject({
      razaoSocial: 'Maria da Silva',
      cnpj: '529.982.247-25',
      contatoTelefone: '(11) 98765-4321',
    })
  })

  it('CNPJ com dígito errado não chega a ir ao servidor', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ModalEmpresa inicial={empresaVazia()} titulo="Nova empresa" onFechar={vi.fn()} />
      </ToastProvider>,
    )

    await user.type(screen.getByRole('textbox', { name: /Razão social/ }), 'ADZ SERVICOS LTDA')
    await user.type(screen.getByRole('textbox', { name: 'CPF ou CNPJ' }), '11222333000180')
    await user.click(screen.getByRole('button', { name: 'Salvar empresa' }))

    expect(await screen.findByText(/O CNPJ 11\.222\.333\/0001-80 não confere no dígito verificador/)).toBeDefined()
    expect(salvarEmpresa).not.toHaveBeenCalled()
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
