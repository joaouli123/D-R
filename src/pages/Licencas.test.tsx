// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Licencas from './Licencas'
import { ToastProvider } from '@/components/ui'
import { ErroApi, type DadosCep, type DadosCnpj } from '@/services/api'
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
  cnpj: vi.fn(),
  cep: vi.fn(),
}))

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  licencas: {
    listar: chamadas.listar,
    criar: chamadas.criar,
    atualizar: chamadas.atualizar,
    excluir: chamadas.excluir,
  },
  consultas: { cnpj: chamadas.cnpj, cep: chamadas.cep },
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
    nome: 'DR Perícias Trabalhista',
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
    documento: '12.345.678/0001-95',
    cidade: 'Campinas',
    uf: 'SP',
    equipes: 2,
    usuarios: 3,
    empresas: 2,
    pericias: 1,
    documentos: 0,
    administradores: [{ id: 'usr-5', nome: 'Carlos Tavares', email: 'carlos@alfa.com.br', ativo: true }],
  }),
  licenca({ id: 'lic-3', nome: 'Beta Engenharia', ativa: false, equipes: 1, usuarios: 2 }),
]

const RECEITA: DadosCnpj = {
  cnpj: '11222333000181',
  cnpjFormatado: '11.222.333/0001-81',
  razaoSocial: 'GAMA CONSULTORIA LTDA',
  nomeFantasia: 'Gama',
  situacao: 'ATIVA',
  situacaoDesde: '2015-03-02',
  cnae: '7119703',
  cnaeDescricao: 'Serviços de desenho técnico',
  grauRisco: '1',
  grauRiscoClasse: '71.19-7',
  naturezaJuridica: 'Sociedade Empresária Limitada',
  porte: 'ME',
  abertura: '2015-03-02',
  endereco: 'Rua das Flores',
  numero: '120',
  complemento: 'Sala 4',
  bairro: 'Centro',
  cidade: 'Campinas',
  uf: 'SP',
  cep: '13010-111',
  telefone: '(19) 3232-1000',
  email: 'CONTATO@GAMA.COM.BR',
  consultadoEm: '2026-09-22T12:00:00.000Z',
  fonte: 'Receita Federal (via BrasilAPI)',
}

const CORREIOS: DadosCep = {
  cep: '01310100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  enderecoCompleto: 'Avenida Paulista, Bela Vista, São Paulo/SP',
  fonte: 'ViaCEP (via BrasilAPI)',
}

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
  await screen.findByRole('region', { name: 'Licença DR Perícias Trabalhista' })
}

beforeEach(() => {
  for (const fn of Object.values(chamadas)) fn.mockReset()
  chamadas.listar.mockImplementation(async () => lista())
  chamadas.criar.mockResolvedValue(undefined)
  chamadas.atualizar.mockResolvedValue(undefined)
  chamadas.excluir.mockResolvedValue(undefined)
  chamadas.cnpj.mockResolvedValue(RECEITA)
  chamadas.cep.mockResolvedValue(CORREIOS)
})

/** Preenche o primeiro administrador — a parte que não muda entre os testes. */
async function preencherAdmin(
  user: ReturnType<typeof userEvent.setup>,
  d: ReturnType<typeof within>,
  {
    email = 'paula@gama.com.br',
    senha = 'senha-segura',
    repetir = senha,
  }: { email?: string; senha?: string; repetir?: string } = {},
) {
  await user.type(d.getByRole('textbox', { name: /^Nome$/ }), 'Paula Souza')
  await user.type(d.getByRole('textbox', { name: /^E-mail de acesso/ }), email)
  await user.type(d.getByLabelText(/^Senha inicial/), senha)
  if (repetir) await user.type(d.getByLabelText(/^Repetir senha/), repetir)
}

afterEach(cleanup)

describe('Licenças — o que aparece', () => {
  it('lista cada licença com o tamanho dela, o status e quem a administra', async () => {
    await montar()

    expect(screen.getByText(/3 licenças · 2 ativas/)).toBeTruthy()

    const principal = within(regiao('DR Perícias Trabalhista'))
    expect(principal.getByText('Principal')).toBeTruthy()
    expect(principal.getByText('Ativa')).toBeTruthy()
    expect(principal.getByText('41')).toBeTruthy()
    expect(principal.getByText('Dinoel Ribeiro')).toBeTruthy()

    const alfa = within(regiao('Laboratório Alfa'))
    expect(alfa.getByText(/CNPJ 12\.345\.678\/0001-95 · Campinas\/SP · Criada em/)).toBeTruthy()
    expect(alfa.getByText(/carlos@alfa\.com\.br/)).toBeTruthy()

    expect(within(regiao('Beta Engenharia')).getByText('Suspensa')).toBeTruthy()
    expect(within(regiao('Beta Engenharia')).getByText('Nenhum administrador cadastrado.')).toBeTruthy()
  })

  it('a licença principal não se suspende nem se exclui', async () => {
    await montar()

    const principal = within(regiao('DR Perícias Trabalhista'))
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
    await user.type(d.getByRole('textbox', { name: /^CPF ou CNPJ/ }), '11222333000181')
    await preencherAdmin(user, d)
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
    // Nome já digitado: a Receita só é consultada pelo botão.
    expect(chamadas.cnpj).not.toHaveBeenCalled()
  })

  it('com o CNPJ digitado primeiro, traz da Receita o nome, o contato e o endereço', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    const documento = d.getByRole('textbox', { name: /^CPF ou CNPJ/ })
    await user.type(documento, '11222333000181')

    expect((documento as HTMLInputElement).value).toBe('11.222.333/0001-81')
    await waitFor(() => expect(chamadas.cnpj).toHaveBeenCalledWith('11222333000181'))
    await waitFor(() =>
      expect((d.getByRole('textbox', { name: /^Nome da empresa/ }) as HTMLInputElement).value).toBe(
        'GAMA CONSULTORIA LTDA',
      ),
    )
    const valor = (nome: RegExp) => (d.getByRole('textbox', { name: nome }) as HTMLInputElement).value
    expect(valor(/^Nome fantasia/)).toBe('Gama')
    expect(valor(/^Telefone/)).toBe('(19) 3232-1000')
    expect(valor(/^E-mail da empresa/)).toBe('contato@gama.com.br')
    expect(valor(/^CEP/)).toBe('13010-111')
    expect(valor(/^Endereço/)).toBe('Rua das Flores')
    expect(valor(/^Número/)).toBe('120')
    expect(valor(/^Complemento/)).toBe('Sala 4')
    expect(valor(/^Bairro/)).toBe('Centro')
    expect(valor(/^Cidade/)).toBe('Campinas')
    expect((d.getByRole('combobox', { name: /^UF/ }) as HTMLSelectElement).value).toBe('SP')
    // O CEP que veio da Receita não dispara outra consulta.
    expect(chamadas.cep).not.toHaveBeenCalled()

    await preencherAdmin(user, d)
    await user.click(d.getByRole('button', { name: 'Criar licença' }))

    await waitFor(() =>
      expect(chamadas.criar).toHaveBeenCalledWith({
        nome: 'GAMA CONSULTORIA LTDA',
        documento: '11.222.333/0001-81',
        nomeFantasia: 'Gama',
        email: 'contato@gama.com.br',
        telefone: '(19) 3232-1000',
        cep: '13010-111',
        endereco: 'Rua das Flores',
        numero: '120',
        complemento: 'Sala 4',
        bairro: 'Centro',
        cidade: 'Campinas',
        uf: 'SP',
        admin: { nome: 'Paula Souza', email: 'paula@gama.com.br', senha: 'senha-segura' },
      }),
    )
  })

  it('o CEP vem antes da rua e preenche o endereço sozinho', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    const cep = d.getByRole('textbox', { name: /^CEP/ })
    const rua = d.getByRole('textbox', { name: /^Endereço/ })
    expect(cep.compareDocumentPosition(rua) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.type(cep, '01310100')

    expect((cep as HTMLInputElement).value).toBe('01310-100')
    await waitFor(() => expect((rua as HTMLInputElement).value).toBe('Avenida Paulista'))
    expect(chamadas.cep).toHaveBeenCalledWith('01310100')
    const valor = (nome: RegExp) => (d.getByRole('textbox', { name: nome }) as HTMLInputElement).value
    expect(valor(/^Bairro/)).toBe('Bela Vista')
    expect(valor(/^Cidade/)).toBe('São Paulo')
    expect((d.getByRole('combobox', { name: /^UF/ }) as HTMLSelectElement).value).toBe('SP')
    // O que sobra digitar é o número: o cursor já está lá.
    expect(document.activeElement).toBe(d.getByRole('textbox', { name: /^Número/ }))
  })

  it('reconhece o CPF na hora e troca o rótulo do nome', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    const documento = d.getByRole('textbox', { name: /^CPF ou CNPJ/ })
    await user.type(documento, '52998224725')

    expect((documento as HTMLInputElement).value).toBe('529.982.247-25')
    expect(d.getByText(/Não há consulta pública de CPF/)).toBeTruthy()
    expect(d.getByRole('textbox', { name: /^Nome completo/ })).toBeTruthy()
    expect(chamadas.cnpj).not.toHaveBeenCalled()
  })

  it('recusa CNPJ com dígito errado antes de chamar o servidor', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome da empresa/ }), 'Gama Consultoria')
    await user.type(d.getByRole('textbox', { name: /^CPF ou CNPJ/ }), '11222333000180')
    expect(d.getByRole('textbox', { name: /^CPF ou CNPJ/ }).getAttribute('aria-invalid')).toBe('true')
    await preencherAdmin(user, d)
    await user.click(d.getByRole('button', { name: 'Criar licença' }))

    expect(d.getByRole('alert').textContent).toMatch(/CNPJ/)
    expect(chamadas.criar).not.toHaveBeenCalled()
  })

  it('pede a senha repetida e recusa quando não confere', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome da empresa/ }), 'Gama Consultoria')
    await preencherAdmin(user, d, { senha: 'senha-segura', repetir: 'senha-errada' })

    expect(d.getByText('As senhas não conferem.')).toBeTruthy()
    expect(d.getByLabelText(/^Repetir senha/).getAttribute('aria-invalid')).toBe('true')
    await user.click(d.getByRole('button', { name: 'Criar licença' }))

    expect(d.getByRole('alert').textContent).toContain('As senhas não conferem')
    expect(chamadas.criar).not.toHaveBeenCalled()
  })

  it('recusa senha curta antes de chamar o servidor', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova licença' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome da empresa/ }), 'Gama Consultoria')
    await preencherAdmin(user, d, { senha: '123' })
    expect(d.getByText(/Faltam 5 caracteres/)).toBeTruthy()
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
    await preencherAdmin(user, d, { email: 'carlos@alfa.com.br' })
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
    expect((d.getByRole('textbox', { name: /^Cidade/ }) as HTMLInputElement).value).toBe('Campinas')
    const nome = d.getByRole('textbox', { name: /^Nome da empresa/ })
    await user.clear(nome)
    await user.type(nome, 'Alfa Segurança')
    await user.clear(d.getByRole('textbox', { name: /^CPF ou CNPJ/ }))
    await user.clear(d.getByRole('textbox', { name: /^Cidade/ }))
    await user.click(d.getByRole('button', { name: 'Salvar' }))

    // Vazio vai como '' — é o que o servidor entende como "apagar".
    await waitFor(() =>
      expect(chamadas.atualizar).toHaveBeenCalledWith(
        'lic-2',
        expect.objectContaining({ nome: 'Alfa Segurança', documento: '', cidade: '', uf: 'SP' }),
      ),
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
