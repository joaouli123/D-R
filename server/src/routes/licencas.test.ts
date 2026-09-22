import type { AddressInfo } from 'node:net'
import express from 'express'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Roda a rota REAL de licenças (Express de verdade, com os guardas reais de
// perfil e de equipe principal) contra um "banco" em memória. O que importa:
// só o perito titular entra, a criação monta licença + equipe + administrador
// de uma vez, a principal não é suspensa nem excluída, e uma licença com
// trabalho dentro não some.

const RAIZ = '00000000-0000-4000-8000-000000000001'
const PRINCIPAL = '00000000-0000-4000-8000-000000000002'

type Licenca = {
  id: string
  aguardandoAprovacao?: boolean
  nome: string
  documento: string | null
  ativa: boolean
  criadoEm: Date
  nomeFantasia?: string | null
  email?: string | null
  telefone?: string | null
  cep?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}
type Equipe = { id: string; nome: string; paiId: string | null; licencaId: string }
type Usuario = {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
  organizacaoId: string
  senhaHash?: string
  logoArquivo?: string | null
  assinaturaArquivo?: string | null
}

const banco = vi.hoisted(() => ({
  licencas: [] as Licenca[],
  equipes: [] as Equipe[],
  usuarios: [] as Usuario[],
  conteudo: {} as Record<string, { empresas: number; pericias: number; documentos: number }>,
  apagados: [] as string[],
  seq: 0,
}))

vi.mock('../env.js', () => ({ env: { JWT_SECRET: 'x'.repeat(40), ehProducao: false } }))
vi.mock('bcryptjs', () => ({ default: { hash: async (s: string) => `hash:${s}` } }))
vi.mock('../services/armazenamento.js', () => ({
  apagarUpload: async (a?: string | null) => {
    if (a) banco.apagados.push(a)
  },
}))
vi.mock('../prisma.js', () => {
  const equipesDa = (licencaId: string) => banco.equipes.filter((e) => e.licencaId === licencaId)
  const daLicenca = (licencaId: string) => {
    const ids = new Set(equipesDa(licencaId).map((e) => e.id))
    return banco.usuarios.filter((u) => ids.has(u.organizacaoId))
  }
  const prisma = {
    licenca: {
      findMany: async ({
        where,
      }: {
        where?: { id?: string; documento?: { not: null }; NOT?: { id: string } }
      }) =>
        banco.licencas
          .filter((l) => !where?.id || l.id === where.id)
          .filter((l) => !where?.documento || l.documento !== null)
          .filter((l) => !where?.NOT || l.id !== where.NOT.id)
          .map((l) => ({
            ...l,
            _count: {
              organizacoes: equipesDa(l.id).length,
              ...(banco.conteudo[l.id] ?? { empresas: 0, pericias: 0, documentos: 0 }),
            },
            organizacoes: equipesDa(l.id).map((e) => {
              const gente = banco.usuarios.filter((u) => u.organizacaoId === e.id)
              return {
                id: e.id,
                paiId: e.paiId,
                nome: e.nome,
                _count: { usuarios: gente.length },
                usuarios: gente
                  .filter((u) => u.perfil === 'admin')
                  .map(({ id, nome, email, ativo }) => ({ id, nome, email, ativo })),
              }
            }),
          })),
      create: async ({ data }: { data: Partial<Licenca> }) => {
        const l: Licenca = { id: `lic-${++banco.seq}`, documento: null, ativa: true, criadoEm: new Date(), nome: '', ...data }
        banco.licencas.push(l)
        return l
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Licenca> }) =>
        Object.assign(banco.licencas.find((l) => l.id === where.id)!, data),
      delete: async ({ where }: { where: { id: string } }) => {
        banco.licencas = banco.licencas.filter((l) => l.id !== where.id)
      },
    },
    organizacao: {
      create: async ({ data }: { data: Omit<Equipe, 'id'> }) => {
        const e = { id: `eq-${++banco.seq}`, ...data }
        banco.equipes.push(e)
        return e
      },
      updateMany: async ({ where, data }: { where: Partial<Equipe>; data: Partial<Equipe> }) => {
        const alvo = banco.equipes.filter((e) =>
          Object.entries(where).every(([k, v]) => (e as Record<string, unknown>)[k] === v),
        )
        alvo.forEach((e) => Object.assign(e, data))
        return { count: alvo.length }
      },
      deleteMany: async ({ where }: { where: { licencaId: string } }) => {
        if (banco.equipes.some((e) => e.licencaId === where.licencaId && banco.equipes.some((f) => f.paiId === e.id))) {
          throw new Error('FK: equipe com filhas')
        }
        banco.equipes = banco.equipes.filter((e) => e.licencaId !== where.licencaId)
      },
    },
    usuario: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        banco.usuarios.find((u) => u.email === where.email) ?? null,
      findMany: async ({ where }: { where: { organizacao: { licencaId: string } } }) =>
        daLicenca(where.organizacao.licencaId),
      create: async ({ data }: { data: Omit<Usuario, 'id'> }) => {
        const u = { id: `u-${++banco.seq}`, ...data }
        banco.usuarios.push(u)
        return u
      },
      deleteMany: async ({ where }: { where: { organizacao: { licencaId: string } } }) => {
        const sai = new Set(daLicenca(where.organizacao.licencaId).map((u) => u.id))
        banco.usuarios = banco.usuarios.filter((u) => !sai.has(u.id))
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  }
  return { prisma }
})
// A sessão vem dos cabeçalhos: o que se testa é a rota e os guardas, não o JWT.
vi.mock('../auth.js', async (original) => ({
  ...(await original<typeof import('../auth.js')>()),
  exigirSessao: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.usuario = {
      id: 'dinoel',
      email: 'd@x',
      perfil: String(req.headers['x-perfil'] ?? 'admin'),
      organizacaoId: String(req.headers['x-equipe'] ?? RAIZ),
      licencaId: PRINCIPAL,
    } as never
    next()
  },
}))

const { licencasRouter } = await import('./licencas.js')
const { tratarErros } = await import('../erros.js')

const app = express()
app.use(express.json())
app.use('/licencas', licencasRouter)
app.use(tratarErros)
const servidor = app.listen(0)
afterAll(() => new Promise((ok) => servidor.close(ok)))

async function chamar(metodo: string, caminho: string, corpo?: unknown, cabecalhos: Record<string, string> = {}) {
  const resposta = await fetch(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}${caminho}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...cabecalhos },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  const texto = await resposta.text()
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : undefined }
}

const novaLicenca = {
  nome: 'Laboratório Alfa',
  documento: '12.345.678/0001-95',
  admin: { nome: 'Ana Alfa', email: 'Ana@Alfa.test', senha: 'senha-forte-1' },
}

beforeEach(() => {
  banco.seq = 0
  banco.apagados = []
  banco.conteudo = {}
  banco.licencas = [{ id: PRINCIPAL, nome: 'D&R Perícia Elite', documento: null, ativa: true, criadoEm: new Date(0) }]
  banco.equipes = [{ id: RAIZ, nome: 'D&R Perícia Elite', paiId: null, licencaId: PRINCIPAL }]
  banco.usuarios = [
    { id: 'dinoel', nome: 'Dinoel', email: 'dinoel@dr.test', perfil: 'admin', ativo: true, organizacaoId: RAIZ },
  ]
})

describe('rota de licenças — quem entra', () => {
  it('administrador de uma licença cliente leva 403', async () => {
    const r = await chamar('GET', '/licencas', undefined, { 'x-equipe': 'eq-cliente' })
    expect(r.status).toBe(403)
  })

  it('perito da equipe raiz também leva 403', async () => {
    const r = await chamar('GET', '/licencas', undefined, { 'x-perfil': 'perito' })
    expect(r.status).toBe(403)
  })
})

describe('rota de licenças — criar', () => {
  it('cria licença, equipe de entrada abaixo da raiz e o primeiro administrador', async () => {
    const r = await chamar('POST', '/licencas', novaLicenca)

    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({
      nome: 'Laboratório Alfa',
      documento: '12.345.678/0001-95',
      ativa: true,
      principal: false,
      equipes: 1,
      usuarios: 1,
      administradores: [{ nome: 'Ana Alfa', email: 'ana@alfa.test', ativo: true }],
    })

    const licenca = banco.licencas.find((l) => l.nome === 'Laboratório Alfa')!
    const equipe = banco.equipes.find((e) => e.licencaId === licenca.id)!
    expect(equipe).toMatchObject({ nome: 'Laboratório Alfa', paiId: RAIZ })
    expect(r.corpo.equipePrincipalId).toBe(equipe.id)
    expect(banco.usuarios.find((u) => u.email === 'ana@alfa.test')).toMatchObject({
      perfil: 'admin',
      organizacaoId: equipe.id,
      senhaHash: 'hash:senha-forte-1',
    })
  })

  it('e-mail já usado é 409 e nada é criado', async () => {
    const r = await chamar('POST', '/licencas', {
      ...novaLicenca,
      admin: { ...novaLicenca.admin, email: 'DINOEL@dr.test' },
    })

    expect(r.status).toBe(409)
    expect(banco.licencas).toHaveLength(1)
    expect(banco.equipes).toHaveLength(1)
  })

  it('senha curta é recusada', async () => {
    const r = await chamar('POST', '/licencas', { ...novaLicenca, admin: { ...novaLicenca.admin, senha: '123' } })
    expect(r.status).toBe(422)
  })
})

describe('rota de licenças — editar', () => {
  it('suspende e reativa uma licença cliente', async () => {
    const { corpo } = await chamar('POST', '/licencas', novaLicenca)

    expect((await chamar('PATCH', `/licencas/${corpo.id}`, { ativa: false })).corpo.ativa).toBe(false)
    expect((await chamar('PATCH', `/licencas/${corpo.id}`, { ativa: true })).corpo.ativa).toBe(true)
  })

  it('ativar um cadastro público é aprová-lo', async () => {
    const { criarLicenca } = await import('./licencas.js')
    const criada = await criarLicenca(
      { ...novaLicenca, documento: null, admin: { ...novaLicenca.admin, email: 'bia@beta.test' } } as never,
      { aguardando: true },
    )
    const [antes] = (await chamar('GET', '/licencas')).corpo.filter((l: { id: string }) => l.id === criada.id)
    expect(antes).toMatchObject({ ativa: false, aguardandoAprovacao: true })

    const r = await chamar('PATCH', `/licencas/${criada.id}`, { ativa: true })
    expect(r.corpo).toMatchObject({ ativa: true, aguardandoAprovacao: false })
  })

  it('a licença principal não pode ser suspensa', async () => {
    const r = await chamar('PATCH', `/licencas/${PRINCIPAL}`, { ativa: false })
    expect(r.status).toBe(400)
    expect(banco.licencas[0]!.ativa).toBe(true)
  })

  it('renomear leva junto a equipe de entrada, se ela ainda tiver o nome antigo', async () => {
    const { corpo } = await chamar('POST', '/licencas', novaLicenca)

    await chamar('PATCH', `/licencas/${corpo.id}`, { nome: 'Alfa Engenharia' })
    expect(banco.equipes.find((e) => e.id === corpo.equipePrincipalId)!.nome).toBe('Alfa Engenharia')

    banco.equipes.find((e) => e.id === corpo.equipePrincipalId)!.nome = 'Matriz'
    await chamar('PATCH', `/licencas/${corpo.id}`, { nome: 'Alfa S.A.' })
    expect(banco.equipes.find((e) => e.id === corpo.equipePrincipalId)!.nome).toBe('Matriz')
  })

  it('licença inexistente é 404', async () => {
    expect((await chamar('PATCH', '/licencas/nao-existe', { nome: 'X X' })).status).toBe(404)
  })
})

describe('rota de licenças — cadastro da empresa cliente', () => {
  const endereco = {
    nomeFantasia: 'Alfa Lab',
    email: 'contato@alfa.test',
    telefone: '(11) 3333-4444',
    cep: '01310-100',
    endereco: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Conj. 12',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'sp',
  }

  it('grava contato e endereço, e a edição mexe só no que veio', async () => {
    const { status, corpo } = await chamar('POST', '/licencas', { ...novaLicenca, ...endereco })

    expect(status).toBe(201)
    expect(corpo).toMatchObject({ ...endereco, uf: 'SP' })

    const r = await chamar('PATCH', `/licencas/${corpo.id}`, { telefone: '', numero: '1001' })
    expect(r.status).toBe(200)
    expect(r.corpo.telefone).toBeUndefined()
    expect(r.corpo).toMatchObject({ numero: '1001', cidade: 'São Paulo', documento: '12.345.678/0001-95' })
  })

  it('o documento vai para o banco com a máscara, seja CNPJ, CNPJ alfanumérico ou CPF', async () => {
    const sem = await chamar('POST', '/licencas', { ...novaLicenca, documento: '12345678000195' })
    expect(sem.corpo.documento).toBe('12.345.678/0001-95')

    const alfa = await chamar('POST', '/licencas', {
      ...novaLicenca,
      documento: '12abc34501de35',
      admin: { ...novaLicenca.admin, email: 'b@alfa.test' },
    })
    expect(alfa.status).toBe(201)
    expect(alfa.corpo.documento).toBe('12.ABC.345/01DE-35')

    const cpf = await chamar('POST', '/licencas', {
      ...novaLicenca,
      documento: '52998224725',
      admin: { ...novaLicenca.admin, email: 'c@alfa.test' },
    })
    expect(cpf.status).toBe(201)
    expect(cpf.corpo.documento).toBe('529.982.247-25')
  })

  it('dígito verificador errado é 422 e nada é criado', async () => {
    const r = await chamar('POST', '/licencas', { ...novaLicenca, documento: '12.345.678/0001-90' })

    expect(r.status).toBe(422)
    expect(r.corpo.erro).toMatch(/não confere/)
    expect(banco.licencas).toHaveLength(1)
    expect(banco.usuarios).toHaveLength(1)
  })

  it('o mesmo documento em duas licenças é 409, com ou sem máscara', async () => {
    await chamar('POST', '/licencas', novaLicenca)

    const r = await chamar('POST', '/licencas', {
      ...novaLicenca,
      nome: 'Beta',
      documento: '12345678000195',
      admin: { ...novaLicenca.admin, email: 'beta@beta.test' },
    })

    expect(r.status).toBe(409)
    expect(r.corpo.erro).toBe('O CNPJ 12.345.678/0001-95 já é da licença "Laboratório Alfa".')
    expect(banco.licencas).toHaveLength(2)
  })

  it('na edição, o próprio documento passa e o de outra licença não', async () => {
    const alfa = (await chamar('POST', '/licencas', novaLicenca)).corpo
    const beta = (
      await chamar('POST', '/licencas', {
        ...novaLicenca,
        nome: 'Beta',
        documento: '11.222.333/0001-81',
        admin: { ...novaLicenca.admin, email: 'beta@beta.test' },
      })
    ).corpo

    expect((await chamar('PATCH', `/licencas/${alfa.id}`, { documento: '12345678000195' })).status).toBe(200)
    expect((await chamar('PATCH', `/licencas/${beta.id}`, { documento: '12.345.678/0001-95' })).status).toBe(409)
    expect((await chamar('PATCH', `/licencas/${beta.id}`, { documento: '' })).corpo.documento).toBeUndefined()
  })

  it('licença antiga com documento que não confere continua editável', async () => {
    banco.licencas.push({ id: 'lic-velha', nome: 'Velha', documento: '12.345.678/0001-90', ativa: true, criadoEm: new Date(0) })

    expect((await chamar('PATCH', '/licencas/lic-velha', { telefone: '(11) 2222-3333' })).status).toBe(200)
    const r = await chamar('PATCH', '/licencas/lic-velha', { nome: 'Velha Ltda', documento: '12.345.678/0001-90' })
    expect(r.status).toBe(200)
    expect(r.corpo.documento).toBe('12.345.678/0001-90')
  })

  it('UF que não tem 2 letras e e-mail inválido são recusados', async () => {
    expect((await chamar('POST', '/licencas', { ...novaLicenca, uf: 'São Paulo' })).status).toBe(422)
    expect((await chamar('POST', '/licencas', { ...novaLicenca, email: 'sem-arroba' })).status).toBe(422)
  })
})

describe('rota de licenças — excluir', () => {
  it('sem trabalho dentro, sai com as equipes, os usuários e os arquivos deles', async () => {
    const { corpo } = await chamar('POST', '/licencas', novaLicenca)
    // Uma equipe filha e um perito com assinatura, para exercitar a hierarquia.
    banco.equipes.push({ id: 'eq-filha', nome: 'Campinas', paiId: corpo.equipePrincipalId, licencaId: corpo.id })
    banco.usuarios.push({
      id: 'u-caio', nome: 'Caio', email: 'caio@alfa.test', perfil: 'perito', ativo: true,
      organizacaoId: 'eq-filha', assinaturaArquivo: 'assinatura-caio.png',
    })

    expect((await chamar('DELETE', `/licencas/${corpo.id}`)).status).toBe(204)

    expect(banco.licencas.map((l) => l.id)).toEqual([PRINCIPAL])
    expect(banco.equipes.map((e) => e.id)).toEqual([RAIZ])
    expect(banco.usuarios.map((u) => u.id)).toEqual(['dinoel'])
    expect(banco.apagados).toEqual(['assinatura-caio.png'])
  })

  it('com empresas, perícias ou documentos é 409 e nada sai', async () => {
    const { corpo } = await chamar('POST', '/licencas', novaLicenca)
    banco.conteudo[corpo.id] = { empresas: 2, pericias: 1, documentos: 0 }

    const r = await chamar('DELETE', `/licencas/${corpo.id}`)

    expect(r.status).toBe(409)
    expect(r.corpo.erro).toMatch(/suspenda a licença/i)
    expect(banco.licencas).toHaveLength(2)
    expect(banco.usuarios).toHaveLength(2)
  })

  it('a licença principal não pode ser excluída', async () => {
    expect((await chamar('DELETE', `/licencas/${PRINCIPAL}`)).status).toBe(400)
    expect(banco.licencas).toHaveLength(1)
  })
})
