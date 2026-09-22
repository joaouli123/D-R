import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================================
// Usuários e equipes no modo demonstração (sem backend).
//
// O mock reproduz, em pequeno, as regras que o servidor aplica de verdade: o
// alcance pela hierarquia (uma equipe só enxerga a si mesma e as de baixo),
// e-mail único, equipe fixa depois de criado, o trabalho de quem sai indo para
// alguém ativo da mesma equipe. Aqui se confere que a demonstração se comporta
// como a API real — a contraparte do servidor está em server/src/tenancy.test.ts.
//
// O "banco" do mock vive no módulo, então cada teste recarrega o módulo: começa
// sempre do zero e a ordem dos testes não importa. O relógio é falso porque o
// mock espera 220 ms por chamada, como se fosse rede.
// ============================================================

type Api = typeof import('./api')

async function carregar(): Promise<Api> {
  vi.resetModules()
  return import('./api')
}

/** Deixa o relógio andar até a chamada do mock terminar e devolve o resultado (ou repropaga o erro). */
async function esperar<T>(chamada: Promise<T>): Promise<T> {
  // O tratamento entra antes de o tempo correr, para uma rejeição nunca ficar sem dono.
  const resultado = chamada.then(
    (valor) => ({ ok: true as const, valor }),
    (erro: unknown) => ({ ok: false as const, erro }),
  )
  await vi.runAllTimersAsync()
  const r = await resultado
  if (r.ok) return r.valor
  throw r.erro
}

/** O erro que a chamada lança — falha o teste se ela der certo. */
async function falha(chamada: Promise<unknown>): Promise<{ status: number; message: string }> {
  try {
    await esperar(chamada)
  } catch (e) {
    return e as { status: number; message: string }
  }
  throw new Error('A chamada deveria ter falhado.')
}

const cadastro = (extra: Record<string, unknown> = {}) => ({
  nome: 'Bruno Costa',
  email: 'bruno@exemplo.com.br',
  perfil: 'assistente' as const,
  ativo: true,
  senha: 'senhaforte1',
  ...extra,
})

// Ids do banco de demonstração (src/mocks/db.ts).
const DINOEL = 'usr-1' // admin, equipe principal
const RENATA = 'usr-2' // perito, equipe principal, responsável por 2 perícias
const MARCOS = 'usr-3' // assistente, equipe principal, sem trabalho
const PAULA = 'usr-4' // assistente INATIVA, equipe principal
const CARLOS = 'usr-5' // admin da equipe Alfa
const FERNANDA = 'usr-6' // perito da equipe Alfa
const PRINCIPAL = 'eqp-1'
const ALFA = 'eqp-2'
const CAMPINAS = 'eqp-3' // filial vazia, abaixo da Alfa

let api: Api

beforeEach(async () => {
  vi.useFakeTimers()
  api = await carregar()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Do ponto de vista de quem está logado: o Carlos, da equipe Alfa, um andar abaixo do Dinoel. */
async function entrarComoCarlos() {
  await esperar(api.auth.login('carlos@alfaseguranca.com.br', 'qualquer-senha'))
}

/** Os usuários de uma equipe, achados na árvore devolvida por `equipes.listar()`. */
async function usuariosDe(equipeId: string) {
  const arvore = await esperar(api.equipes.listar())
  return arvore.find((e) => e.id === equipeId)?.usuarios ?? []
}

describe('equipes.listar — a árvore que cada um enxerga', () => {
  it('o administrador da equipe principal vê a própria equipe e todas as de baixo, em ordem', async () => {
    const arvore = await esperar(api.equipes.listar())

    expect(arvore.map((e) => [e.id, e.nivel])).toEqual([
      [PRINCIPAL, 0],
      [ALFA, 1],
      [CAMPINAS, 2],
    ])
    const [principal, alfa, campinas] = arvore
    expect(principal).toMatchObject({
      propria: true,
      principal: true,
      podeExcluir: false,
      paiId: null,
    })
    expect(alfa).toMatchObject({
      propria: false,
      principal: false,
      podeExcluir: false,
      paiId: PRINCIPAL,
    })
    expect(campinas).toMatchObject({ propria: false, podeExcluir: true, paiId: ALFA })
    expect(principal.usuarios.map((u) => u.id).sort()).toEqual(
      [DINOEL, RENATA, MARCOS, PAULA].sort(),
    )
    expect(alfa.usuarios.map((u) => u.id).sort()).toEqual([CARLOS, FERNANDA].sort())
  })

  it('a equipe de baixo enxerga só a si mesma e as suas — nunca a de cima', async () => {
    await entrarComoCarlos()

    const arvore = await esperar(api.equipes.listar())

    expect(arvore.map((e) => [e.id, e.nivel])).toEqual([
      [ALFA, 0],
      [CAMPINAS, 1],
    ])
    // Nem o id da equipe acima vaza: para quem olha, a Alfa é a raiz.
    expect(arvore[0]).toMatchObject({ propria: true, principal: false, paiId: null })
    expect(JSON.stringify(arvore)).not.toContain('dinoel@')
  })

  it('usuarios.listar devolve só os da própria equipe', async () => {
    await entrarComoCarlos()

    const lista = await esperar(api.usuarios.listar())

    expect(lista.map((u) => u.id).sort()).toEqual([CARLOS, FERNANDA].sort())
  })

  it('devolve cópias: mexer no resultado não altera o banco', async () => {
    const arvore = await esperar(api.equipes.listar())
    arvore[0].usuarios[0].nome = 'Adulterado'
    arvore[0].nome = 'Adulterada'

    const de_novo = await esperar(api.equipes.listar())

    expect(de_novo[0].nome).toBe('DR Perícias Trabalhista')
    expect(de_novo[0].usuarios.some((u) => u.nome === 'Adulterado')).toBe(false)
  })
})

describe('usuarios.salvar — cadastrar', () => {
  it('sem equipe informada, cria na equipe de quem cadastra e normaliza o e-mail', async () => {
    const criado = await esperar(
      api.usuarios.salvar(cadastro({ email: '  Bruno@Exemplo.com.br ' })),
    )

    expect(criado).toMatchObject({
      nome: 'Bruno Costa',
      email: 'bruno@exemplo.com.br',
      organizacaoId: PRINCIPAL,
      equipePrincipal: true,
    })
    expect(criado.id).toBeTruthy()
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === criado.id)).toBe(true)
  })

  it('cria direto numa equipe de baixo da hierarquia', async () => {
    const criado = await esperar(api.usuarios.salvar(cadastro({ organizacaoId: ALFA })))

    expect(criado).toMatchObject({ organizacaoId: ALFA, equipePrincipal: false })
    expect((await usuariosDe(ALFA)).some((u) => u.id === criado.id)).toBe(true)
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === criado.id)).toBe(false)
  })

  it('a senha nunca volta na resposta nem fica guardada no cadastro', async () => {
    const criado = await esperar(api.usuarios.salvar(cadastro()))

    expect(JSON.stringify(criado)).not.toContain('senhaforte1')
    expect('senha' in criado).toBe(false)
  })

  it('a resposta é uma cópia: mexer nela não altera o cadastro guardado', async () => {
    const criado = await esperar(api.usuarios.salvar(cadastro()))
    criado.nome = 'Adulterado'

    const guardado = (await usuariosDe(PRINCIPAL)).find((u) => u.email === 'bruno@exemplo.com.br')
    expect(guardado?.nome).toBe('Bruno Costa')
  })

  it('exige senha inicial de pelo menos 8 caracteres', async () => {
    for (const senha of [undefined, '', '1234567']) {
      const erro = await falha(api.usuarios.salvar(cadastro({ senha })))
      expect(erro.status).toBe(422)
      expect(erro.message).toMatch(/senha inicial de pelo menos 8/)
    }
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.nome === 'Bruno Costa')).toBe(false)
  })

  it('recusa e-mail que já existe — sem diferenciar maiúsculas e valendo para qualquer equipe', async () => {
    const naMesmaEquipe = await falha(
      api.usuarios.salvar(cadastro({ email: 'RENATA@drpericiaelite.com.br' })),
    )
    const emOutraEquipe = await falha(
      api.usuarios.salvar(cadastro({ email: 'carlos@alfaseguranca.com.br' })),
    )

    expect(naMesmaEquipe).toMatchObject({
      status: 409,
      message: 'Já existe um usuário com este e-mail.',
    })
    expect(emOutraEquipe.status).toBe(409)
  })

  it('a equipe de baixo não cadastra na de cima, nem numa equipe que não existe', async () => {
    await entrarComoCarlos()

    const acima = await falha(api.usuarios.salvar(cadastro({ organizacaoId: PRINCIPAL })))
    const inexistente = await falha(api.usuarios.salvar(cadastro({ organizacaoId: 'eqp-999' })))

    expect(acima.status).toBe(403)
    expect(acima.message).toMatch(/na sua equipe ou nas equipes abaixo dela/)
    expect(inexistente.status).toBe(403)
    // Sem `organizacaoId`, cai na equipe dele, e só nela.
    const dele = await esperar(api.usuarios.salvar(cadastro({ email: 'bruno@alfa.com.br' })))
    expect(dele.organizacaoId).toBe(ALFA)
  })
})

describe('usuarios.salvar — editar, desativar e reativar', () => {
  const daRenata = (extra: Record<string, unknown> = {}) => ({
    id: RENATA,
    nome: 'Renata Alves Prado',
    email: 'renata@drpericiaelite.com.br',
    perfil: 'perito' as const,
    ativo: true,
    organizacaoId: PRINCIPAL,
    ...extra,
  })

  it('atualiza os dados e mantém a equipe', async () => {
    await esperar(api.usuarios.salvar(daRenata({ nome: 'Renata A. Prado', perfil: 'assistente' })))

    const renata = (await usuariosDe(PRINCIPAL)).find((u) => u.id === RENATA)
    expect(renata).toMatchObject({
      nome: 'Renata A. Prado',
      perfil: 'assistente',
      organizacaoId: PRINCIPAL,
    })
  })

  it('permite salvar mantendo o próprio e-mail', async () => {
    const salvo = await esperar(api.usuarios.salvar(daRenata({ titulo: 'Engenheira Sênior' })))

    expect(salvo.titulo).toBe('Engenheira Sênior')
  })

  it('a resposta é uma cópia: mexer nela não altera o cadastro guardado', async () => {
    const salvo = await esperar(api.usuarios.salvar(daRenata()))
    salvo.nome = 'Adulterado'

    expect((await usuariosDe(PRINCIPAL)).find((u) => u.id === RENATA)?.nome).toBe(
      'Renata Alves Prado',
    )
  })

  it('recusa trocar o e-mail por um que já é de outra pessoa', async () => {
    const erro = await falha(
      api.usuarios.salvar(daRenata({ email: 'marcos@drpericiaelite.com.br' })),
    )

    expect(erro.status).toBe(409)
  })

  it('o usuário não muda de equipe depois de criado', async () => {
    const erro = await falha(api.usuarios.salvar(daRenata({ organizacaoId: ALFA })))

    expect(erro).toMatchObject({
      status: 422,
      message: 'Um usuário não muda de equipe depois de criado.',
    })
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === RENATA)).toBe(true)
  })

  it('desativa e reativa quem é de outro — a pessoa continua no cadastro', async () => {
    await esperar(api.usuarios.salvar(daRenata({ ativo: false })))
    expect((await usuariosDe(PRINCIPAL)).find((u) => u.id === RENATA)?.ativo).toBe(false)

    await esperar(api.usuarios.salvar(daRenata({ ativo: true })))
    expect((await usuariosDe(PRINCIPAL)).find((u) => u.id === RENATA)?.ativo).toBe(true)
  })

  it('o administrador não desativa nem rebaixa a si mesmo', async () => {
    const doDinoel = {
      id: DINOEL,
      nome: 'Dinoel R. Santos',
      email: 'dinoel@drpericiaelite.com.br',
      organizacaoId: PRINCIPAL,
    }

    const desativar = await falha(
      api.usuarios.salvar({ ...doDinoel, perfil: 'admin', ativo: false }),
    )
    const rebaixar = await falha(
      api.usuarios.salvar({ ...doDinoel, perfil: 'perito', ativo: true }),
    )

    expect(desativar.status).toBe(400)
    expect(rebaixar.status).toBe(400)
    expect((await usuariosDe(PRINCIPAL)).find((u) => u.id === DINOEL)).toMatchObject({
      perfil: 'admin',
      ativo: true,
    })
  })

  it('quem está fora do alcance é tratado como inexistente (404, não 403)', async () => {
    await entrarComoCarlos()

    const erro = await falha(api.usuarios.salvar(daRenata({ nome: 'Invasão' })))

    expect(erro).toMatchObject({ status: 404, message: 'Usuário não encontrado.' })
  })

  it('o pai edita quem está numa equipe de baixo', async () => {
    const fernanda = {
      id: FERNANDA,
      nome: 'Fernanda Souza Lima',
      email: 'fernanda@alfaseguranca.com.br',
      perfil: 'perito' as const,
      ativo: false,
      organizacaoId: ALFA,
    }

    await esperar(api.usuarios.salvar(fernanda))

    expect((await usuariosDe(ALFA)).find((u) => u.id === FERNANDA)?.ativo).toBe(false)
  })
})

describe('usuarios.redefinirSenha', () => {
  it('aceita senha de 8 caracteres para quem está no alcance', async () => {
    await expect(
      esperar(api.usuarios.redefinirSenha(FERNANDA, 'novasenha1')),
    ).resolves.toBeUndefined()
  })

  it('recusa senha curta', async () => {
    const erro = await falha(api.usuarios.redefinirSenha(FERNANDA, '1234567'))

    expect(erro.status).toBe(422)
  })

  it('quem está fora do alcance ou não existe dá 404', async () => {
    await entrarComoCarlos()

    const acima = await falha(api.usuarios.redefinirSenha(DINOEL, 'novasenha1'))
    const inexistente = await falha(api.usuarios.redefinirSenha('usr-999', 'novasenha1'))

    expect(acima.status).toBe(404)
    expect(inexistente.status).toBe(404)
  })
})

describe('usuarios.excluir', () => {
  it('exclui direto quem não responde por trabalho', async () => {
    await esperar(api.usuarios.excluir(MARCOS))

    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === MARCOS)).toBe(false)
  })

  it('exclui quem está numa equipe de baixo', async () => {
    await esperar(api.usuarios.excluir(FERNANDA))

    expect((await usuariosDe(ALFA)).some((u) => u.id === FERNANDA)).toBe(false)
  })

  it('não exclui a si mesmo', async () => {
    const erro = await falha(api.usuarios.excluir(DINOEL))

    expect(erro.status).toBe(400)
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === DINOEL)).toBe(true)
  })

  it('quem responde por perícias não sai sem herdeiro: 409 com a contagem, e nada é apagado', async () => {
    const erro = await falha(api.usuarios.excluir(RENATA))

    expect(erro.status).toBe(409)
    expect(erro.message).toMatch(/Renata Alves Prado é responsável por 2 perícias/)
    expect(erro.message).toMatch(/desative o usuário/)
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === RENATA)).toBe(true)
  })

  it('com herdeiro ativo da mesma equipe, o trabalho passa para ele e o usuário sai', async () => {
    const antes = (await esperar(api.pericias.listar())).filter((p) => p.responsavelId === RENATA)
    expect(antes).toHaveLength(2)

    await esperar(api.usuarios.excluir(RENATA, MARCOS))

    const depois = await esperar(api.pericias.listar())
    for (const p of antes) {
      expect(depois.find((d) => d.id === p.id)?.responsavelId).toBe(MARCOS)
    }
    expect(depois.some((p) => p.responsavelId === RENATA)).toBe(false)
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === RENATA)).toBe(false)
  })

  it('herdeiro inválido é recusado (422) e nada muda: inativo, de outra equipe, o próprio ou inexistente', async () => {
    const candidatos = [PAULA, CARLOS, RENATA, 'usr-999']

    for (const herdeiro of candidatos) {
      const erro = await falha(api.usuarios.excluir(RENATA, herdeiro))
      expect(erro.status, `herdeiro ${herdeiro}`).toBe(422)
    }

    // Nenhuma tentativa deixou perícia com a pessoa errada nem apagou a Renata.
    const pericias = await esperar(api.pericias.listar())
    expect(pericias.filter((p) => p.responsavelId === RENATA)).toHaveLength(2)
    expect((await usuariosDe(PRINCIPAL)).some((u) => u.id === RENATA)).toBe(true)
  })

  it('quem está fora do alcance dá 404', async () => {
    await entrarComoCarlos()

    const erro = await falha(api.usuarios.excluir(RENATA))

    expect(erro.status).toBe(404)
  })
})

describe('equipes — criar, renomear e excluir', () => {
  it('cria abaixo da equipe de quem cria, com o nome aparado', async () => {
    const criada = await esperar(api.equipes.criar('  Beta Perícias  '))

    expect(criada).toMatchObject({
      nome: 'Beta Perícias',
      nivel: 1,
      propria: false,
      principal: false,
      podeExcluir: true,
      paiId: PRINCIPAL,
      usuarios: [],
    })
    const arvore = await esperar(api.equipes.listar())
    expect(arvore.some((e) => e.id === criada.id)).toBe(true)
  })

  it('cria mais fundo na hierarquia quando o pai é indicado', async () => {
    const criada = await esperar(api.equipes.criar('Alfa Sorocaba', ALFA))

    expect(criada).toMatchObject({ nivel: 2, paiId: ALFA })
    const arvore = await esperar(api.equipes.listar())
    // A nova fica junto da família da Alfa, não no fim da lista solta.
    expect(arvore.map((e) => e.nome).slice(0, 2)).toEqual([
      'DR Perícias Trabalhista',
      'Laboratório Alfa Segurança',
    ])
  })

  it('as respostas de criar e renomear são cópias: mexer nelas não altera o que está guardado', async () => {
    const renomeada = await esperar(api.equipes.renomear(ALFA, 'Alfa Segurança'))
    renomeada.nome = 'Adulterada'
    renomeada.usuarios[0].nome = 'Adulterado'
    const criada = await esperar(api.equipes.criar('Beta Perícias'))
    criada.nome = 'Adulterada'

    const arvore = await esperar(api.equipes.listar())
    const alfa = arvore.find((e) => e.id === ALFA)
    expect(alfa?.nome).toBe('Alfa Segurança')
    expect(alfa?.usuarios.some((u) => u.nome === 'Adulterado')).toBe(false)
    expect(arvore.some((e) => e.nome === 'Beta Perícias')).toBe(true)
    expect(arvore.some((e) => e.nome === 'Adulterada')).toBe(false)
  })

  it('recusa nome curto demais', async () => {
    const erro = await falha(api.equipes.criar(' A '))

    expect(erro).toMatchObject({ status: 422, message: 'Informe o nome da equipe.' })
  })

  it('não cria equipe debaixo de uma que está fora do alcance', async () => {
    await entrarComoCarlos()

    const erro = await falha(api.equipes.criar('Intrusa', PRINCIPAL))

    expect(erro).toMatchObject({ status: 404, message: 'Equipe não encontrada.' })
  })

  it('renomeia, e não renomeia o que está fora do alcance', async () => {
    const renomeada = await esperar(api.equipes.renomear(ALFA, 'Alfa Segurança do Trabalho'))
    expect(renomeada.nome).toBe('Alfa Segurança do Trabalho')

    const curto = await falha(api.equipes.renomear(ALFA, 'x'))
    expect(curto.status).toBe(422)

    await entrarComoCarlos()
    const acima = await falha(api.equipes.renomear(PRINCIPAL, 'Tomada'))
    expect(acima.status).toBe(404)
  })

  it('exclui a equipe vazia', async () => {
    await esperar(api.equipes.excluir(CAMPINAS))

    const arvore = await esperar(api.equipes.listar())
    expect(arvore.map((e) => e.id)).toEqual([PRINCIPAL, ALFA])
  })

  it('não exclui a própria equipe', async () => {
    const erro = await falha(api.equipes.excluir(PRINCIPAL))

    expect(erro.status).toBe(400)
  })

  it('não exclui equipe que tem equipes abaixo, nem equipe com usuários', async () => {
    const sorocaba = await esperar(api.equipes.criar('Sorocaba', CAMPINAS))
    const comFilha = await falha(api.equipes.excluir(CAMPINAS))
    expect(comFilha).toMatchObject({ status: 409 })
    expect(comFilha.message).toMatch(/equipes abaixo/)

    await esperar(api.equipes.excluir(sorocaba.id)) // esvazia a família de Campinas
    await esperar(api.usuarios.salvar(cadastro({ organizacaoId: CAMPINAS })))
    const comGente = await falha(api.equipes.excluir(CAMPINAS))
    expect(comGente.status).toBe(409)
    expect(comGente.message).toMatch(/ainda tem usuários/)
  })

  it('não exclui a equipe de entrada de uma licença — ela sai só com a licença', async () => {
    await esperar(api.equipes.excluir(CAMPINAS)) // nem com a família vazia
    const entrada = await falha(api.equipes.excluir(ALFA))

    expect(entrada.status).toBe(409)
    expect(entrada.message).toMatch(/página Licenças/)
  })

  it('podeExcluir acompanha o conteúdo: vira falso quando entra o primeiro usuário', async () => {
    const criada = await esperar(api.equipes.criar('Beta'))
    expect(criada.podeExcluir).toBe(true)

    await esperar(api.usuarios.salvar(cadastro({ organizacaoId: criada.id })))

    const arvore = await esperar(api.equipes.listar())
    expect(arvore.find((e) => e.id === criada.id)?.podeExcluir).toBe(false)
  })

  it('não exclui equipe fora do alcance', async () => {
    await entrarComoCarlos()

    const erro = await falha(api.equipes.excluir(PRINCIPAL))

    expect(erro.status).toBe(404)
  })
})

// ============================================================
// O conteúdo de exemplo é da equipe principal; as outras começam vazias — o
// isolamento que o servidor aplica por `organizacaoId`, visível na demonstração.
// ============================================================
describe('conteúdo da demonstração — isolado por equipe', () => {
  it('a equipe principal enxerga as empresas, perícias e documentos de exemplo', async () => {
    const [empresas, pericias, documentos] = await Promise.all([
      esperar(api.empresas.listar()),
      esperar(api.pericias.listar()),
      esperar(api.documentos.listar()),
    ])

    expect(empresas.length).toBeGreaterThan(0)
    expect(pericias.length).toBeGreaterThan(0)
    expect(documentos.length).toBeGreaterThan(0)
  })

  it('quem entra por outra equipe não vê nada disso, nem pelo id', async () => {
    await entrarComoCarlos()

    expect(await esperar(api.empresas.listar())).toEqual([])
    expect(await esperar(api.pericias.listar())).toEqual([])
    expect(await esperar(api.documentos.listar())).toEqual([])
    expect(await esperar(api.pericias.obter('per-1'))).toBeUndefined()
    expect(await esperar(api.documentos.obter('doc-1'))).toBeUndefined()
  })

  it('voltar para a equipe principal traz o conteúdo de volta', async () => {
    await entrarComoCarlos()
    await esperar(api.auth.login('dinoel@drpericiaelite.com.br', 'qualquer-senha'))

    expect((await esperar(api.pericias.listar())).length).toBeGreaterThan(0)
  })
})

describe('retomarSessaoDemo — recarregar a página não troca quem está logado', () => {
  it('as chamadas voltam a agir como o usuário guardado, na equipe dele', async () => {
    expect(api.retomarSessaoDemo({ id: CARLOS })).toBe(true)

    const arvore = await esperar(api.equipes.listar())

    expect(arvore.map((e) => e.id)).toEqual([ALFA, CAMPINAS])
    expect(await esperar(api.pericias.listar())).toEqual([])
  })

  it('recusa um cadastro que não existe mais, ou que está inativo', () => {
    expect(api.retomarSessaoDemo({ id: 'usr-que-nao-existe' })).toBe(false)
    expect(api.retomarSessaoDemo({ id: PAULA })).toBe(false)
  })

  it('quando recusa, a sessão anterior continua valendo', async () => {
    api.retomarSessaoDemo({ id: CARLOS })

    api.retomarSessaoDemo({ id: PAULA })

    const arvore = await esperar(api.equipes.listar())
    expect(arvore[0]?.id).toBe(ALFA)
  })
})

describe('licenças — as empresas clientes, só para o perito titular', () => {
  const LIC_PRINCIPAL = 'lic-1'
  const LIC_ALFA = 'lic-2'

  it('o titular vê todas as licenças, com os números de cada uma e nenhum conteúdo', async () => {
    const licencas = await esperar(api.licencas.listar())

    expect(licencas.map((l) => l.id)).toEqual([LIC_PRINCIPAL, LIC_ALFA])
    const alfa = licencas.find((l) => l.id === LIC_ALFA)!
    expect(alfa).toMatchObject({
      principal: false,
      ativa: true,
      equipes: 2,
      equipePrincipalId: ALFA,
    })
    expect(alfa.administradores.map((a) => a.id)).toEqual([CARLOS])
    expect(licencas.find((l) => l.id === LIC_PRINCIPAL)!.principal).toBe(true)
  })

  it('o administrador de outra licença não abre a página', async () => {
    await entrarComoCarlos()

    const erro = await falha(api.licencas.listar())

    expect(erro.status).toBe(403)
  })

  it('a licença nova nasce isolada: o administrador dela entra e não vê nada de ninguém', async () => {
    const nova = await esperar(
      api.licencas.criar({
        nome: 'Beta Engenharia',
        documento: '11.222.333/0001-81',
        admin: { nome: 'Joana Lima', email: 'joana@beta.com.br', senha: 'senhaforte1' },
      }),
    )
    expect(nova).toMatchObject({ nome: 'Beta Engenharia', equipes: 1, usuarios: 1, empresas: 0 })

    await esperar(api.auth.login('joana@beta.com.br', 'senhaforte1'))

    const arvore = await esperar(api.equipes.listar())
    expect(arvore.map((e) => e.id)).toEqual([nova.equipePrincipalId])
    expect(await esperar(api.empresas.listar())).toEqual([])
    expect(await esperar(api.pericias.listar())).toEqual([])
  })

  it('não repete o e-mail de quem já tem cadastro em qualquer licença', async () => {
    const erro = await falha(
      api.licencas.criar({
        nome: 'Gama',
        admin: { nome: 'Outro Carlos', email: 'CARLOS@alfaseguranca.com.br', senha: 'senhaforte1' },
      }),
    )

    expect(erro.status).toBe(409)
  })

  it('suspender tira o acesso de todos da licença; reativar devolve', async () => {
    await esperar(api.licencas.atualizar(LIC_ALFA, { ativa: false }))

    const erro = await falha(api.auth.login('carlos@alfaseguranca.com.br', 'qualquer-senha'))
    expect(erro.status).toBe(403)

    await esperar(api.licencas.atualizar(LIC_ALFA, { ativa: true }))
    await entrarComoCarlos()
  })

  async function cadastroPendente() {
    await esperar(
      api.cadastroPublico.enviar({
        nome: 'Delta Perícias',
        admin: { nome: 'Rui Delta', email: 'rui@delta.com.br', senha: 'senhaforte1' },
      }),
    )
    const pendente = (await esperar(api.licencas.listar())).find(
      (l) => l.nome === 'Delta Perícias',
    )!
    expect(pendente.aguardandoAprovacao).toBe(true)
    expect((await falha(api.auth.login('rui@delta.com.br', 'senhaforte1'))).status).toBe(403)
    return pendente
  }

  it('aprovar como empresa dedicada libera a licença do próprio cadastro', async () => {
    const pendente = await cadastroPendente()

    await esperar(api.licencas.aprovar(pendente.id, { como: 'empresa' }))

    const lic = (await esperar(api.licencas.listar())).find((l) => l.id === pendente.id)!
    expect(lic).toMatchObject({ ativa: true, aguardandoAprovacao: false })
    await esperar(api.auth.login('rui@delta.com.br', 'senhaforte1'))
  })

  it('aprovar como funcionário leva a pessoa para a equipe escolhida e descarta a licença', async () => {
    const pendente = await cadastroPendente()

    await esperar(
      api.licencas.aprovar(pendente.id, { como: 'equipe', equipeId: ALFA, perfil: 'perito' }),
    )

    expect((await esperar(api.licencas.listar())).some((l) => l.id === pendente.id)).toBe(false)
    const sessao = await esperar(api.auth.login('rui@delta.com.br', 'senhaforte1'))
    expect(sessao).toMatchObject({ perfil: 'perito', organizacaoId: ALFA })
  })

  it('a licença principal não pode ser suspensa nem excluída', async () => {
    expect((await falha(api.licencas.atualizar(LIC_PRINCIPAL, { ativa: false }))).status).toBe(400)
    expect((await falha(api.licencas.excluir(LIC_PRINCIPAL))).status).toBe(400)
  })

  it('excluir leva as equipes e os usuários da licença junto', async () => {
    await esperar(api.licencas.excluir(LIC_ALFA))

    const licencas = await esperar(api.licencas.listar())
    expect(licencas.map((l) => l.id)).toEqual([LIC_PRINCIPAL])
    const erro = await falha(api.auth.login('carlos@alfaseguranca.com.br', 'qualquer-senha'))
    expect(erro.status).toBe(401)
  })

  it('renomear leva o nome para a equipe de entrada, e CNPJ vazio apaga o CNPJ', async () => {
    await esperar(api.licencas.atualizar(LIC_ALFA, { documento: '11.222.333/0001-81' }))

    const depois = await esperar(
      api.licencas.atualizar(LIC_ALFA, { nome: 'Alfa Segurança', documento: '' }),
    )

    expect(depois).toMatchObject({ nome: 'Alfa Segurança', documento: undefined })
    await entrarComoCarlos()
    const arvore = await esperar(api.equipes.listar())
    // A equipe de entrada tinha o mesmo nome da licença, então acompanha; a filial não muda.
    expect(arvore.map((e) => e.nome)).toEqual(['Alfa Segurança', 'Alfa · Filial Campinas'])
  })

  it('confere o CPF ou CNPJ e guarda o cadastro já formatado', async () => {
    const invalido = await falha(
      api.licencas.atualizar(LIC_ALFA, { documento: '11.222.333/0001-80' }),
    )
    expect(invalido.status).toBe(422)

    const depois = await esperar(
      api.licencas.atualizar(LIC_ALFA, {
        documento: '11222333000181',
        cidade: ' Campinas ',
        uf: 'sp',
      }),
    )
    expect(depois).toMatchObject({ documento: '11.222.333/0001-81', cidade: 'Campinas', uf: 'SP' })

    const cpf = await esperar(api.licencas.atualizar(LIC_ALFA, { documento: '52998224725' }))
    expect(cpf.documento).toBe('529.982.247-25')

    const alfanumerico = await esperar(
      api.licencas.atualizar(LIC_ALFA, { documento: '12abc34501de35' }),
    )
    expect(alfanumerico.documento).toBe('12.ABC.345/01DE-35')
  })

  it('o mesmo CNPJ não entra em duas licenças', async () => {
    await esperar(api.licencas.atualizar(LIC_ALFA, { documento: '11.222.333/0001-81' }))
    const erro = await falha(
      api.licencas.criar({
        nome: 'Gama Consultoria',
        documento: '11222333000181',
        admin: { nome: 'Paula Souza', email: 'paula@gama.com.br', senha: 'senha-segura' },
      }),
    )
    expect(erro.status).toBe(409)
    expect(erro.message).toContain('Laboratório Alfa')
  })

  it('licença que não existe dá 404 com a mensagem certa', async () => {
    const erro = await falha(api.licencas.excluir('lic-nao-existe'))

    expect(erro).toMatchObject({ status: 404, message: 'Licença não encontrada.' })
  })
})
