// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Usuarios from './Usuarios'
import { ToastProvider } from '@/components/ui'
import { ErroApi } from '@/services/api'
import { useApp } from '@/store/AppStore'
import type { Equipe, Usuario } from '@/types'

// ============================================================
// Tela de Usuários e equipes: o que o administrador enxerga e o que cada
// botão manda para a API. A regra de negócio (alcance pela hierarquia, e-mail
// único, o trabalho de quem sai) é do servidor e do mock — testada em
// api.usuarios.test.ts e nos testes do servidor. Aqui interessa que a tela
// peça as coisas certas e mostre o que o servidor responde.
// ============================================================

const chamadas = vi.hoisted(() => ({
  listar: vi.fn(),
  criarEquipe: vi.fn(),
  renomearEquipe: vi.fn(),
  excluirEquipe: vi.fn(),
  salvar: vi.fn(),
  redefinirSenha: vi.fn(),
  excluirUsuario: vi.fn(),
  recarregarUsuarios: vi.fn(),
}))

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/services/api', async (importOriginal) => ({
  // ErroApi e mensagemDeErro ficam os verdadeiros; só o que fala com a rede é trocado.
  ...(await importOriginal<typeof import('@/services/api')>()),
  equipes: {
    listar: chamadas.listar,
    criar: chamadas.criarEquipe,
    renomear: chamadas.renomearEquipe,
    excluir: chamadas.excluirEquipe,
  },
  usuarios: {
    salvar: chamadas.salvar,
    redefinirSenha: chamadas.redefinirSenha,
    excluir: chamadas.excluirUsuario,
  },
}))
// Só o cabeçalho interessa aqui — o resto do layout arrasta a aplicação inteira.
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {action}
    </div>
  ),
}))

const usuario = (id: string, nome: string, extra: Partial<Usuario> = {}): Usuario => ({
  id,
  nome,
  email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com.br`,
  perfil: 'assistente',
  ativo: true,
  ...extra,
})

const DINOEL = usuario('usr-1', 'Dinoel Ribeiro', { perfil: 'admin', organizacaoId: 'eqp-1' })
const HENRIQUE = usuario('usr-2', 'Henrique Alves', { organizacaoId: 'eqp-1' })
const CARLOS = usuario('usr-5', 'Carlos Tavares', { perfil: 'admin', organizacaoId: 'eqp-2' })
const FERNANDA = usuario('usr-6', 'Fernanda Lima', { perfil: 'perito', organizacaoId: 'eqp-2' })
const RAFAEL = usuario('usr-7', 'Rafael Dias', { ativo: false, organizacaoId: 'eqp-2' })

/** A árvore que o administrador enxerga: a dele, uma empresa parceira e uma filial vazia. */
const arvore = (): Equipe[] => [
  {
    id: 'eqp-1',
    nome: 'D&R Perícia Elite',
    paiId: null,
    nivel: 0,
    propria: true,
    principal: true,
    podeExcluir: false,
    usuarios: [DINOEL, HENRIQUE],
  },
  {
    id: 'eqp-2',
    nome: 'Laboratório Alfa',
    paiId: null,
    nivel: 1,
    propria: false,
    principal: false,
    podeExcluir: false,
    usuarios: [CARLOS, FERNANDA, RAFAEL],
  },
  {
    id: 'eqp-3',
    nome: 'Alfa Campinas',
    paiId: 'eqp-2',
    nivel: 2,
    propria: false,
    principal: false,
    podeExcluir: true,
    usuarios: [],
  },
]

const regiao = (nome: string) => screen.getByRole('region', { name: `Equipe ${nome}` })
const dialogo = () => screen.getByRole('dialog')

async function montar() {
  vi.mocked(useApp).mockReturnValue({
    usuario: DINOEL,
    recarregarUsuarios: chamadas.recarregarUsuarios,
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter>
      <ToastProvider>
        <Usuarios />
      </ToastProvider>
    </MemoryRouter>,
  )
  await screen.findByRole('region', { name: 'Equipe D&R Perícia Elite' })
}

beforeEach(() => {
  for (const fn of Object.values(chamadas)) fn.mockReset()
  chamadas.listar.mockImplementation(async () => arvore())
  chamadas.recarregarUsuarios.mockResolvedValue(undefined)
  chamadas.salvar.mockResolvedValue(undefined)
  chamadas.redefinirSenha.mockResolvedValue(undefined)
  chamadas.excluirUsuario.mockResolvedValue(undefined)
  chamadas.criarEquipe.mockResolvedValue(undefined)
  chamadas.renomearEquipe.mockResolvedValue(undefined)
  chamadas.excluirEquipe.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('Usuários e equipes — o que aparece', () => {
  it('mostra cada equipe da hierarquia com os seus usuários e só eles', async () => {
    await montar()

    const principal = within(regiao('D&R Perícia Elite'))
    expect(principal.getByText('Dinoel Ribeiro')).toBeTruthy()
    expect(principal.getByText('Henrique Alves')).toBeTruthy()
    expect(principal.queryByText('Carlos Tavares')).toBeNull()

    const alfa = within(regiao('Laboratório Alfa'))
    expect(alfa.getByText('Carlos Tavares')).toBeTruthy()
    expect(alfa.getByText('Fernanda Lima')).toBeTruthy()
    expect(alfa.queryByText('Dinoel Ribeiro')).toBeNull()

    expect(within(regiao('Alfa Campinas')).getByText('Nenhum usuário nesta equipe ainda.')).toBeTruthy()
  })

  it('marca a equipe do administrador e a principal, e resume os números', async () => {
    await montar()

    const principal = within(regiao('D&R Perícia Elite'))
    expect(principal.getByText('Sua equipe')).toBeTruthy()
    expect(principal.getByText('Equipe principal')).toBeTruthy()
    expect(within(regiao('Laboratório Alfa')).queryByText('Sua equipe')).toBeNull()

    expect(screen.getByText(/3 equipes · 5 usuários/)).toBeTruthy()
    // Rafael está inativo: 3 usuários, 2 ativos.
    expect(within(regiao('Laboratório Alfa')).getByText(/3 usuários · 2 ativos/)).toBeTruthy()
  })

  it('não deixa o administrador desativar nem excluir o próprio acesso', async () => {
    await montar()

    const principal = within(regiao('D&R Perícia Elite'))
    expect(principal.getByText('(você)')).toBeTruthy()
    expect(
      (principal.getByRole('button', { name: 'Desativar Dinoel Ribeiro' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (principal.getByRole('button', { name: 'Excluir Dinoel Ribeiro' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    // Os colegas continuam ao alcance.
    expect(
      (principal.getByRole('button', { name: 'Desativar Henrique Alves' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })

  it('oferece reativar quem está inativo', async () => {
    await montar()
    expect(
      within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Reativar Rafael Dias' }),
    ).toBeTruthy()
  })

  it('só oferece excluir a equipe que está vazia e não é a própria', async () => {
    await montar()

    expect(
      within(regiao('Alfa Campinas')).getByRole('button', { name: 'Excluir a equipe Alfa Campinas' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Excluir a equipe / })).toHaveLength(1)
  })

  it('mostra o erro de carregamento e tenta de novo', async () => {
    chamadas.listar.mockRejectedValueOnce(new ErroApi(500, 'Servidor fora do ar.'))
    vi.mocked(useApp).mockReturnValue({
      usuario: DINOEL,
      recarregarUsuarios: chamadas.recarregarUsuarios,
    } as unknown as ReturnType<typeof useApp>)
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ToastProvider>
          <Usuarios />
        </ToastProvider>
      </MemoryRouter>,
    )

    expect((await screen.findByRole('alert')).textContent).toContain('Servidor fora do ar.')
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('region', { name: 'Equipe D&R Perícia Elite' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Usuários e equipes — cadastrar', () => {
  it('cria o usuário na equipe do cartão, com a senha inicial, e atualiza as listas', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Novo usuário' }),
    )
    const d = within(dialogo())
    expect(d.getByText(/Será criado na equipe Laboratório Alfa/)).toBeTruthy()

    await user.type(d.getByRole('textbox', { name: /^Nome/ }), '  Bruno Costa ')
    await user.type(d.getByRole('textbox', { name: /^E-mail/ }), 'bruno@alfa.com.br')
    await user.selectOptions(d.getByRole('combobox', { name: 'Perfil' }), 'perito')
    await user.type(d.getByLabelText(/^Senha inicial/), 'senhaforte1')
    await user.click(d.getByRole('button', { name: 'Cadastrar' }))

    await waitFor(() => expect(chamadas.salvar).toHaveBeenCalledTimes(1))
    expect(chamadas.salvar).toHaveBeenCalledWith({
      nome: 'Bruno Costa',
      email: 'bruno@alfa.com.br',
      perfil: 'perito',
      senha: 'senhaforte1',
      titulo: undefined,
      registroProfissional: undefined,
      telefone: undefined,
      ativo: true,
      organizacaoId: 'eqp-2',
    })
    expect(await screen.findByText('O cadastro de Bruno Costa foi criado.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    // Árvore relida (uma na abertura, outra depois de salvar) e a lista do store também.
    expect(chamadas.listar).toHaveBeenCalledTimes(2)
    expect(chamadas.recarregarUsuarios).toHaveBeenCalledTimes(2)
  })

  it('quem nasce sem escolha de perfil é assistente', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('D&R Perícia Elite')).getByRole('button', { name: 'Novo usuário' }))

    expect((within(dialogo()).getByRole('combobox', { name: 'Perfil' }) as HTMLSelectElement).value).toBe(
      'assistente',
    )
  })

  it('recusa senha curta sem chamar a API', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('D&R Perícia Elite')).getByRole('button', { name: 'Novo usuário' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome/ }), 'Bruno')
    await user.type(d.getByRole('textbox', { name: /^E-mail/ }), 'bruno@x.com.br')
    await user.type(d.getByLabelText(/^Senha inicial/), '1234567')
    await user.click(d.getByRole('button', { name: 'Cadastrar' }))

    expect(d.getByRole('alert').textContent).toContain('pelo menos 8 caracteres')
    expect(chamadas.salvar).not.toHaveBeenCalled()
  })

  it('exige nome e e-mail', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('D&R Perícia Elite')).getByRole('button', { name: 'Novo usuário' }))
    await user.click(within(dialogo()).getByRole('button', { name: 'Cadastrar' }))

    expect(within(dialogo()).getByRole('alert').textContent).toContain('Nome e e-mail')
    expect(chamadas.salvar).not.toHaveBeenCalled()
  })

  it('mostra dentro do diálogo o que o servidor recusou e mantém o formulário aberto', async () => {
    chamadas.salvar.mockRejectedValueOnce(new ErroApi(409, 'Já existe um usuário com este e-mail.'))
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('D&R Perícia Elite')).getByRole('button', { name: 'Novo usuário' }))
    const d = within(dialogo())
    await user.type(d.getByRole('textbox', { name: /^Nome/ }), 'Bruno')
    await user.type(d.getByRole('textbox', { name: /^E-mail/ }), 'henrique@exemplo.com.br')
    await user.type(d.getByLabelText(/^Senha inicial/), 'senhaforte1')
    await user.click(d.getByRole('button', { name: 'Cadastrar' }))

    expect((await d.findByRole('alert')).textContent).toContain('Já existe um usuário com este e-mail.')
    // O que foi digitado continua lá para corrigir.
    expect((d.getByRole('textbox', { name: /^Nome/ }) as HTMLInputElement).value).toBe('Bruno')
    // E o formulário não foi tratado como concluído.
    expect(chamadas.listar).toHaveBeenCalledTimes(1)
  })
})

describe('Usuários e equipes — editar e trocar a senha', () => {
  it('edita mandando o id, sem senha e sem trocar a equipe', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Editar Fernanda Lima' }))
    const d = within(dialogo())
    expect(d.getByText(/O usuário não muda de equipe depois de criado/)).toBeTruthy()
    expect(d.queryByLabelText(/^Senha inicial/)).toBeNull()

    const titulo = d.getByRole('textbox', { name: /^Títulos/ })
    await user.type(titulo, 'Engenheira de Segurança')
    await user.click(d.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(chamadas.salvar).toHaveBeenCalledTimes(1))
    const enviado = chamadas.salvar.mock.calls[0][0]
    expect(enviado).toMatchObject({
      id: 'usr-6',
      nome: 'Fernanda Lima',
      perfil: 'perito',
      titulo: 'Engenheira de Segurança',
      ativo: true,
      organizacaoId: 'eqp-2',
    })
    expect('senha' in enviado).toBe(false)
    expect(await screen.findByText('Cadastro atualizado.')).toBeTruthy()
  })

  it('trava o perfil de quem edita o próprio cadastro', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('D&R Perícia Elite')).getByRole('button', { name: 'Editar Dinoel Ribeiro' }))

    const perfil = within(dialogo()).getByRole('combobox', { name: 'Perfil' }) as HTMLSelectElement
    expect(perfil.disabled).toBe(true)
    expect(within(dialogo()).getByText(/não pode alterar o próprio perfil/)).toBeTruthy()
  })

  it('redefine a senha de outra pessoa', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Trocar a senha de Fernanda Lima' }),
    )
    const d = within(dialogo())
    await user.type(d.getByLabelText(/^Nova senha/), 'outrasenha9')
    await user.type(d.getByLabelText(/^Confirmar nova senha/), 'outrasenha9')
    await user.click(d.getByRole('button', { name: 'Trocar senha' }))

    await waitFor(() => expect(chamadas.redefinirSenha).toHaveBeenCalledWith('usr-6', 'outrasenha9'))
    expect(await screen.findByText('Senha de Fernanda Lima alterada.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('não redefine com confirmação diferente nem com senha curta', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Trocar a senha de Fernanda Lima' }),
    )
    const d = within(dialogo())

    await user.type(d.getByLabelText(/^Nova senha/), 'curta')
    await user.click(d.getByRole('button', { name: 'Trocar senha' }))
    expect(d.getByRole('alert').textContent).toContain('pelo menos 8 caracteres')

    await user.clear(d.getByLabelText(/^Nova senha/))
    await user.type(d.getByLabelText(/^Nova senha/), 'outrasenha9')
    await user.type(d.getByLabelText(/^Confirmar nova senha/), 'outrasenha0')
    await user.click(d.getByRole('button', { name: 'Trocar senha' }))
    expect(d.getByRole('alert').textContent).toContain('não confere')

    expect(chamadas.redefinirSenha).not.toHaveBeenCalled()
  })
})

describe('Usuários e equipes — desativar e reativar', () => {
  it('desativa sem apagar nada: manda o cadastro com ativo=false', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('D&R Perícia Elite')).getByRole('button', { name: 'Desativar Henrique Alves' }))

    await waitFor(() => expect(chamadas.salvar).toHaveBeenCalledTimes(1))
    expect(chamadas.salvar.mock.calls[0][0]).toMatchObject({
      id: 'usr-2',
      ativo: false,
      organizacaoId: 'eqp-1',
    })
    expect(await screen.findByText(/O acesso de Henrique Alves foi desativado e vale agora/)).toBeTruthy()
    expect(chamadas.excluirUsuario).not.toHaveBeenCalled()
  })

  it('reativa quem estava inativo', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Reativar Rafael Dias' }))

    await waitFor(() => expect(chamadas.salvar).toHaveBeenCalledTimes(1))
    expect(chamadas.salvar.mock.calls[0][0]).toMatchObject({ id: 'usr-7', ativo: true })
    expect(await screen.findByText(/O acesso de Rafael Dias foi reativado/)).toBeTruthy()
  })

  it('mostra o motivo quando o servidor recusa', async () => {
    chamadas.salvar.mockRejectedValueOnce(new ErroApi(400, 'Você não pode remover o próprio acesso.'))
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('D&R Perícia Elite')).getByRole('button', { name: 'Desativar Henrique Alves' }))

    expect(await screen.findByText('Você não pode remover o próprio acesso.')).toBeTruthy()
  })
})

describe('Usuários e equipes — excluir usuário', () => {
  it('exclui direto quando a pessoa não responde por trabalho', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Excluir Fernanda Lima' }))
    expect(chamadas.excluirUsuario).not.toHaveBeenCalled() // pede confirmação antes
    await user.click(within(dialogo()).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(chamadas.excluirUsuario).toHaveBeenCalledWith('usr-6', undefined))
    expect(await screen.findByText('O cadastro de Fernanda Lima foi excluído.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('quando o servidor diz que há trabalho, pergunta quem assume — só entre os ativos da equipe', async () => {
    chamadas.excluirUsuario.mockRejectedValueOnce(
      new ErroApi(409, 'Fernanda Lima é responsável por 2 perícias e 1 documento.'),
    )
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Excluir Fernanda Lima' }))
    await user.click(within(dialogo()).getByRole('button', { name: 'Excluir' }))

    const d = within(dialogo())
    expect(await d.findByText('Fernanda Lima é responsável por 2 perícias e 1 documento.')).toBeTruthy()

    const escolha = d.getByRole('combobox', { name: /^Quem assume/ }) as HTMLSelectElement
    const opcoes = Array.from(escolha.options).map((o) => o.textContent)
    // Nem ela mesma, nem o inativo (Rafael), nem gente de outra equipe (Dinoel).
    expect(opcoes).toEqual(['Escolha…', 'Carlos Tavares (Administrador)'])

    // Sem escolher ninguém não dá para confirmar.
    expect((d.getByRole('button', { name: 'Excluir e repassar' }) as HTMLButtonElement).disabled).toBe(true)

    await user.selectOptions(escolha, 'usr-5')
    await user.click(d.getByRole('button', { name: 'Excluir e repassar' }))

    await waitFor(() => expect(chamadas.excluirUsuario).toHaveBeenLastCalledWith('usr-6', 'usr-5'))
    expect(chamadas.excluirUsuario).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('O cadastro de Fernanda Lima foi excluído.')).toBeTruthy()
  })

  it('sem ninguém ativo para herdar, não deixa excluir e aponta a desativação', async () => {
    // Carlos é o único ativo da equipe Alfa: Fernanda e Rafael estão inativos.
    chamadas.listar.mockImplementation(async () => {
      const t = arvore()
      t[1].usuarios = [CARLOS, { ...FERNANDA, ativo: false }, RAFAEL]
      return t
    })
    chamadas.excluirUsuario.mockRejectedValueOnce(
      new ErroApi(409, 'Carlos Tavares é responsável por 1 perícia.'),
    )
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Excluir Carlos Tavares' }))
    await user.click(within(dialogo()).getByRole('button', { name: 'Excluir' }))

    const d = within(dialogo())
    expect(await d.findByText('Carlos Tavares é responsável por 1 perícia.')).toBeTruthy()
    expect(d.getByText(/Não há outro usuário ativo nesta equipe/)).toBeTruthy()
    // Nada para escolher e nada para confirmar — só o caminho de desativar.
    expect(d.queryByRole('combobox')).toBeNull()
    expect(d.queryByRole('button', { name: 'Excluir' })).toBeNull()
    expect(d.queryByRole('button', { name: 'Excluir e repassar' })).toBeNull()
    expect(d.getByRole('button', { name: 'Desativar em vez de excluir' })).toBeTruthy()
    expect(chamadas.excluirUsuario).toHaveBeenCalledTimes(1)
  })

  it('oferece desativar em vez de excluir', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Excluir Fernanda Lima' }))
    await user.click(within(dialogo()).getByRole('button', { name: 'Desativar em vez de excluir' }))

    await waitFor(() => expect(chamadas.salvar).toHaveBeenCalledTimes(1))
    expect(chamadas.salvar.mock.calls[0][0]).toMatchObject({ id: 'usr-6', ativo: false })
    expect(chamadas.excluirUsuario).not.toHaveBeenCalled()
    expect(await screen.findByText(/O acesso de Fernanda Lima foi desativado/)).toBeTruthy()
  })

  it('não oferece desativar quem já está inativo', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Excluir Rafael Dias' }))

    expect(within(dialogo()).queryByRole('button', { name: 'Desativar em vez de excluir' })).toBeNull()
  })

  it('mostra dentro do diálogo um erro que não seja o do trabalho pendente', async () => {
    chamadas.excluirUsuario.mockRejectedValueOnce(new ErroApi(404, 'Usuário não encontrado.'))
    const user = userEvent.setup()
    await montar()

    await user.click(within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Excluir Fernanda Lima' }))
    await user.click(within(dialogo()).getByRole('button', { name: 'Excluir' }))

    expect((await within(dialogo()).findByRole('alert')).textContent).toContain('Usuário não encontrado.')
    expect(within(dialogo()).queryByRole('combobox')).toBeNull()
  })
})

describe('Usuários e equipes — a hierarquia de equipes', () => {
  it('cria uma equipe abaixo da escolhida', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Criar equipe abaixo' }),
    )
    const d = within(dialogo())
    expect((d.getByRole('combobox', { name: 'Fica abaixo de' }) as HTMLSelectElement).value).toBe('eqp-2')

    await user.type(d.getByRole('textbox', { name: /^Nome da equipe/ }), 'Alfa Sorocaba')
    await user.click(d.getByRole('button', { name: 'Criar equipe' }))

    await waitFor(() => expect(chamadas.criarEquipe).toHaveBeenCalledWith('Alfa Sorocaba', 'eqp-2'))
    expect(await screen.findByText('Equipe Alfa Sorocaba criada.')).toBeTruthy()
  })

  it('"Nova equipe" do cabeçalho nasce abaixo da equipe do próprio administrador', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova equipe' }))

    expect((within(dialogo()).getByRole('combobox', { name: 'Fica abaixo de' }) as HTMLSelectElement).value).toBe(
      'eqp-1',
    )
  })

  it('a lista de "Fica abaixo de" mostra a hierarquia recuada', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova equipe' }))

    const opcoes = Array.from(
      (within(dialogo()).getByRole('combobox', { name: 'Fica abaixo de' }) as HTMLSelectElement).options,
    ).map((o) => o.textContent)
    expect(opcoes).toEqual(['D&R Perícia Elite', '— Laboratório Alfa', '— — Alfa Campinas'])
  })

  it('renomeia a equipe', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(
      within(regiao('Laboratório Alfa')).getByRole('button', { name: 'Renomear a equipe Laboratório Alfa' }),
    )
    const d = within(dialogo())
    expect(d.queryByRole('combobox', { name: 'Fica abaixo de' })).toBeNull() // não muda de lugar
    const campo = d.getByRole('textbox', { name: /^Nome da equipe/ })
    await user.clear(campo)
    await user.type(campo, 'Alfa Segurança')
    await user.click(d.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(chamadas.renomearEquipe).toHaveBeenCalledWith('eqp-2', 'Alfa Segurança'))
    expect(await screen.findByText('Equipe renomeada.')).toBeTruthy()
  })

  it('recusa nome de equipe curto demais', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Nova equipe' }))
    await user.type(within(dialogo()).getByRole('textbox', { name: /^Nome da equipe/ }), 'A')
    await user.click(within(dialogo()).getByRole('button', { name: 'Criar equipe' }))

    expect(within(dialogo()).getByRole('alert').textContent).toContain('Informe o nome da equipe')
    expect(chamadas.criarEquipe).not.toHaveBeenCalled()
  })

  it('exclui a equipe vazia depois de confirmar', async () => {
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Excluir a equipe Alfa Campinas' }))
    expect(chamadas.excluirEquipe).not.toHaveBeenCalled()
    await user.click(within(dialogo()).getByRole('button', { name: 'Excluir equipe' }))

    await waitFor(() => expect(chamadas.excluirEquipe).toHaveBeenCalledWith('eqp-3'))
    expect(await screen.findByText('Equipe Alfa Campinas excluída.')).toBeTruthy()
  })

  it('mostra o motivo quando o servidor recusa excluir a equipe', async () => {
    chamadas.excluirEquipe.mockRejectedValueOnce(new ErroApi(409, 'Esta equipe ainda tem trabalho.'))
    const user = userEvent.setup()
    await montar()

    await user.click(screen.getByRole('button', { name: 'Excluir a equipe Alfa Campinas' }))
    await user.click(within(dialogo()).getByRole('button', { name: 'Excluir equipe' }))

    expect((await within(dialogo()).findByRole('alert')).textContent).toContain(
      'Esta equipe ainda tem trabalho.',
    )
  })
})
