// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Licencas from './Licencas'
import { ToastProvider } from '@/components/ui'
import { ErroApi } from '@/services/api'
import type { Licenca } from '@/types'

// ============================================================
// Tela de Licenças: o que o perito titular enxerga e o que cada botão manda
// para a API. As regras (só o titular, e-mail único, não excluir licença com
// trabalho, não suspender a principal) são do servidor — testadas em
// server/src/routes/licencas.test.ts. Aqui interessa que a tela peça as coisas
// certas e mostre o que o servidor responde.
// ============================================================

const chamadas = vi.hoisted(() => ({
  listar: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  excluir: vi.fn(),
}))

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  licencas: {
    listar: chamadas.listar,
    criar: chamadas.criar,
    atualizar: chamadas.atualizar,
    excluir: chamadas.excluir,
  },
}))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {action}
    </div>
  ),
}))

const licenca = (extra: Partial<Licenca> & Pick<Licenca, 'id' | 'nome'>): Licenca => ({
  ativa: true,
  principal: false,
  criadoEm: '2026-09-01T12:00:00.000Z',
  equipes: 1,
  usuarios: 1,
  empresas: 0,
  pericias: 0,
  documentos: 0,
  administradores: [],
  ...extra,
})

const lista = (): Licenca[] => [
  licenca({
    id: 'lic-1',
    nome: 'D&R Perícia Elite',
    principal: true,
    equipes: 2,
    usuarios: 4,
    empresas: 12,
    pericias: 30,
    documentos: 41,
    administradores: [{ id: 'usr-1', nome: 'Dinoel Ribeiro', email: 'dinoel@exemplo.com.br', ativo: true }],
  }),
  licenca({
    id: 'lic-2',
    nome: 'Laboratório Alfa',
    documento: '12.345.678/0001-90',
    equipes: 2,
    usuarios: 3,
    empresas: 2,
    pericias: 1,
    documentos: 0,
    administradores: [{ id: 'usr-5', nome: 'Carlos Tavares', email: 'carlos@alfa.com.br', ativo: true }],
  }),
  licenca({ id: 'lic-3', nome: 'Beta Engenharia', ativa: false, equipes: 1, usuarios: 2 }),
]

const regiao = (nome: string) => screen.getByRole('region', { name: `Licença ${nome}` })
const dialogo = () => screen.getByRole('dialog')

async function montar() {
  render(
    <MemoryRouter>
      <ToastProvider>
        <Licencas />
      </ToastProvider>
    </MemoryRouter>,
  )
  await screen.findByRole('region', { name: 'Licença D&R Perícia Elite' })
}

beforeEach(() => {
  for (const fn of Object.values(chamadas)) fn.mockReset()
  chamadas.listar.mockImplementation(async () => lista())
  chamadas.criar.mockResolvedValue(undefined)
  chamadas.atualizar.mockResolvedValue(undefined)
  chamadas.excluir.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('Licenças — o que aparece', () => {
  it('lista cada licença com o tamanho dela, o status e quem a administra', async () => {
    await montar()

    expect(screen.getByText(/3 licenças · 2 ativas/)).toBeTruthy()

    const principal = within(regiao('D&R Perícia Elite'))
    expect(principal.getByText('Principal')).toBeTruthy()
    expect(principal.getByText('Ativa')).toBeTruthy()
    expect(principal.getByText('41')).toBeTruthy()
    expect(principal.getByText('Dinoel Ribeiro')).toBeTruthy()

    const alfa = within(regiao('Laboratório Alfa'))
    expect(alfa.getByText(/CNPJ 12\.345\.678\/0001-90/)).toBeTruthy()
    expect(alfa.getByText(/carlos@alfa\.com\.br/)).toBeTruthy()

    expect(within(regiao('Beta Engenharia')).getByText('Suspensa')).toBeTruthy()
    expect(within(regiao('Beta Engenharia')).getByText('Nenhum administrador cadastrado.')).toBeTruthy()
  })

  it('a licença principal não se suspende nem se exclui', async () => {
    await montar()

    const principal = within(regiao('D&R Perícia Elite'))
    expect(principal.queryByRole('button', { name: 'Suspender' })).toBeNull()
    expect(principal.queryByRole('button', { name: /^Excluir a licença/ })).toBeNull()
    expect(principal.getByRole('button', { name: 'Editar' })).toBeTruthy()
  })

  it('mostra o erro de carregamento e deixa tentar de novo', async () => {
    chamadas.listar.mockRejectedValueOnce(new ErroApi(403, 'Só o administrador titular gere as licenças.'))
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ToastProvider>
          <Licencas />
        </ToastProvider>
      </MemoryRouter>,
    )

    expect((await screen.findByRole('alert')).textContent).toContain('Só o administrador titular')
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('region', { name: 'Licença Laboratório Alfa' })).toBeTruthy()
  })
})

describe('Licenças — criar', () => {
  it('cria a licença com o primeiro administrador', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome da empresa/ }), 'Gama Consultoria')
    await user.type(d.getByRole('textbox', { name: /^CNPJ/ }), '11222333000181')
    await user.type(d.getByRole('textbox', { name: /^Nome$/ }), 'Paula Souza')
    await user.type(d.getByRole('textbox', { name: /^E-mail/ }), 'paula@gama.com.br')
    await user.type(d.getByLabelText(/^Senha inicial/), 'senha-segura')
    await user.click(d.getByRole('button', { name: 'Criar licença' }))

    await waitFor(() =>
      expect(chamadas.criar).toHaveBeenCalledWith({
        nome: 'Gama Consultoria',
        documento: '11.222.333/0001-81',
        admin: { nome: 'Paula Souza', email: 'paula@gama.com.br', senha: 'senha-segura' },
      }),
    )
    expect(await screen.findByText(/Licença Gama Consultoria criada/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(chamadas.listar).toHaveBeenCalledTimes(2)
  })

  it('recusa senha curta antes de chamar o servidor', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome da empresa/ }), 'Gama Consultoria')
    await user.type(d.getByRole('textbox', { name: /^Nome$/ }), 'Paula Souza')
    await user.type(d.getByRole('textbox', { name: /^E-mail/ }), 'paula@gama.com.br')
    await user.type(d.getByLabelText(/^Senha inicial/), '123')
    await user.click(d.getByRole('button', { name: 'Criar licença' }))

    expect(d.getByRole('alert').textContent).toContain('pelo menos 8 caracteres')
    expect(chamadas.criar).not.toHaveBeenCalled()
  })

  it('mostra dentro do diálogo o e-mail já usado', async () => {
    chamadas.criar.mockRejectedValueOnce(
      new ErroApi(409, 'Já existe um usuário com este e-mail. Use outro para o administrador.'),
    )
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome da empresa/ }), 'Gama Consultoria')
    await user.type(d.getByRole('textbox', { name: /^Nome$/ }), 'Paula Souza')
    await user.type(d.getByRole('textbox', { name: /^E-mail/ }), 'carlos@alfa.com.br')
    await user.type(d.getByLabelText(/^Senha inicial/), 'senha-segura')
    await user.click(d.getByRole('button', { name: 'Criar licença' }))

    expect((await d.findByRole('alert')).textContent).toContain('Já existe um usuário com este e-mail')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('Licenças — editar, suspender e reativar', () => {
  it('renomeia e apaga o CNPJ', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Editar' }))
    const d = within(dialogo())
    const nome = d.getByRole('textbox', { name: /^Nome da empresa/ })
    await user.clear(nome)
    await user.type(nome, 'Alfa Segurança')
    await user.clear(d.getByRole('textbox', { name: /^CNPJ/ }))
    await user.click(d.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(chamadas.atualizar).toHaveBeenCalledWith('lic-2', { nome: 'Alfa Segurança', documento: '' }),
    )
    expect(await screen.findByText('Licença atualizada.')).toBeTruthy()
  })

  it('suspende depois de avisar quantos perdem o acesso', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Suspender' }))
    const d = within(dialogo())
    expect(d.getByText(/3 usuários perdem o acesso na hora/)).toBeTruthy()
    expect(chamadas.atualizar).not.toHaveBeenCalled()
    await user.click(d.getByRole('button', { name: 'Suspender' }))

    await waitFor(() => expect(chamadas.atualizar).toHaveBeenCalledWith('lic-2', { ativa: false }))
    expect(await screen.findByText(/A licença Laboratório Alfa foi suspensa/)).toBeTruthy()
  })

  it('reativa direto, sem diálogo', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Beta Engenharia')).getByRole('button', { name: 'Reativar' }))

    await waitFor(() => expect(chamadas.atualizar).toHaveBeenCalledWith('lic-3', { ativa: true }))
    expect(await screen.findByText(/A licença Beta Engenharia foi reativada/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Licenças — excluir', () => {
  it('sem trabalho dentro, exclui depois de dizer o que sai junto', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Beta Engenharia')).getByRole('button', { name: 'Excluir a licença Beta Engenharia' }),
    )
    const d = within(dialogo())
    expect(d.getByText('1 equipe e 2 usuários')).toBeTruthy()
    // Suspensa já: não tem por que oferecer suspender.
    expect(d.queryByRole('button', { name: 'Suspender em vez de excluir' })).toBeNull()
    await user.click(d.getByRole('button', { name: 'Excluir licença' }))

    await waitFor(() => expect(chamadas.excluir).toHaveBeenCalledWith('lic-3'))
    expect(await screen.findByText('Licença Beta Engenharia excluída.')).toBeTruthy()
  })

  it('com trabalho dentro, não oferece excluir e aponta a suspensão', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Excluir a licença Laboratório Alfa' }),
    )
    const d = within(dialogo())
    expect(d.getByText(/2 empresas, 1 perícia e 0 documentos/)).toBeTruthy()
    expect(d.queryByRole('button', { name: 'Excluir licença' })).toBeNull()

    await user.click(d.getByRole('button', { name: 'Suspender em vez de excluir' }))
    expect(within(dialogo()).getByText(/3 usuários perdem o acesso/)).toBeTruthy()
    expect(chamadas.excluir).not.toHaveBeenCalled()
  })

  it('mostra dentro do diálogo a recusa do servidor', async () => {
    chamadas.excluir.mockRejectedValueOnce(
      new ErroApi(409, 'A licença "Beta Engenharia" tem 1 empresa(s). Para tirar o acesso sem perder nada, suspenda a licença.'),
    )
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Beta Engenharia')).getByRole('button', { name: 'Excluir a licença Beta Engenharia' }),
    )
    await user.click(within(dialogo()).getByRole('button', { name: 'Excluir licença' }))

    expect((await within(dialogo()).findByRole('alert')).textContent).toContain('suspenda a licença')
  })
})
