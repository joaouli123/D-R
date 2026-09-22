import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { afterEach, describe, expect, it, vi } from 'vitest'

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres'
const buscarNoBanco = vi.hoisted(() => vi.fn())

vi.mock('./env.js', () => ({
  env: { JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres', JWT_EXPIRACAO: '8h', ehProducao: false },
}))
vi.mock('./prisma.js', () => ({ prisma: { usuario: { findUnique: buscarNoBanco } } }))

const { definirBuscaDeUsuarioDaSessao, exigirEquipePrincipal, exigirPerfil, exigirSessao, sessaoDe } =
  await import('./auth.js')
const { LICENCA_PRINCIPAL_ID, ORGANIZACAO_RAIZ_ID } = await import('./tenancy.js')

afterEach(() => {
  buscarNoBanco.mockReset()
  definirBuscaDeUsuarioDaSessao()
})

const usuarioNoBanco = (extra: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'ana@equipe.test',
  perfil: 'perito',
  organizacaoId: 'equipe-a',
  ativo: true,
  organizacao: { licencaId: 'licenca-a', licenca: { ativa: true } },
  ...extra,
})

const tokenDe = (claims: Record<string, unknown>) => jwt.sign(claims, SEGREDO)

function pedir(cookie?: string) {
  const req = { cookies: cookie ? { dr_sessao: cookie } : {} } as unknown as Request
  const clearCookie = vi.fn()
  const res = { clearCookie } as unknown as Response
  return { req, res, clearCookie }
}

/** Roda o middleware e espera ele chamar next() uma vez. */
function executar(req: Request, res: Response): Promise<unknown> {
  return new Promise((resolve) => {
    exigirSessao(req, res, ((erro?: unknown) => resolve(erro)) as NextFunction)
  })
}

describe('exigirSessao', () => {
  it('sem cookie pede login e nem consulta o banco', async () => {
    const { req, res } = pedir()

    const erro = await executar(req, res)

    expect(erro).toMatchObject({ status: 401, message: 'Faça login para continuar.' })
    expect(buscarNoBanco).not.toHaveBeenCalled()
  })

  it('token adulterado ou de outro segredo é 401', async () => {
    const { req, res } = pedir(jwt.sign({ id: 'u1' }, 'outro-segredo-qualquer-com-32-caracteres'))

    expect(await executar(req, res)).toMatchObject({ status: 401 })
    expect(buscarNoBanco).not.toHaveBeenCalled()
  })

  it('token sem id não vale', async () => {
    const { req, res } = pedir(tokenDe({ email: 'x@y.z', perfil: 'admin' }))

    expect(await executar(req, res)).toMatchObject({ status: 401 })
    expect(buscarNoBanco).not.toHaveBeenCalled()
  })

  it('popula req.usuario com o que está no BANCO, não com o que o token declara', async () => {
    // O token diz "admin" da equipe raiz; o banco diz que a pessoa é perito
    // de outra equipe (foi rebaixada e movida). Vale o banco.
    buscarNoBanco.mockResolvedValue(usuarioNoBanco())
    const { req, res } = pedir(
      tokenDe({ id: 'u1', email: 'velho@x.test', perfil: 'admin', organizacaoId: ORGANIZACAO_RAIZ_ID }),
    )

    expect(await executar(req, res)).toBeUndefined()

    expect(req.usuario).toEqual({
      id: 'u1',
      email: 'ana@equipe.test',
      perfil: 'perito',
      organizacaoId: 'equipe-a',
      licencaId: 'licenca-a',
    })
    expect(buscarNoBanco).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: {
        id: true,
        email: true,
        perfil: true,
        organizacaoId: true,
        ativo: true,
        organizacao: { select: { licencaId: true, licenca: { select: { ativa: true } } } },
      },
    })
  })

  it('a licença vem do banco: um token que declara outra não muda o escopo', async () => {
    buscarNoBanco.mockResolvedValue(usuarioNoBanco())
    const { req, res } = pedir(tokenDe({ id: 'u1', licencaId: 'licenca-alheia' }))

    expect(await executar(req, res)).toBeUndefined()
    expect(req.usuario?.licencaId).toBe('licenca-a')
  })

  it('licença suspensa derruba a sessão na hora e o cookie é limpo', async () => {
    buscarNoBanco.mockResolvedValue(
      usuarioNoBanco({ organizacao: { licencaId: 'licenca-a', licenca: { ativa: false } } }),
    )
    const { req, res, clearCookie } = pedir(tokenDe({ id: 'u1' }))

    const erro = await executar(req, res)

    expect(erro).toMatchObject({ status: 401 })
    expect((erro as Error).message).toMatch(/licença desta conta está suspensa/i)
    expect(clearCookie).toHaveBeenCalledWith('dr_sessao', expect.any(Object))
    expect(req.usuario).toBeUndefined()
  })

  it('token emitido antes do multi-tenant (sem organizacaoId) continua valendo', async () => {
    buscarNoBanco.mockResolvedValue(usuarioNoBanco({ organizacaoId: ORGANIZACAO_RAIZ_ID }))
    const { req, res } = pedir(tokenDe({ id: 'u1', email: 'ana@equipe.test', perfil: 'perito' }))

    expect(await executar(req, res)).toBeUndefined()
    expect(req.usuario?.organizacaoId).toBe(ORGANIZACAO_RAIZ_ID)
  })

  it('usuário desativado perde o acesso na hora e o cookie é limpo', async () => {
    buscarNoBanco.mockResolvedValue(usuarioNoBanco({ ativo: false }))
    const { req, res, clearCookie } = pedir(tokenDe({ id: 'u1' }))

    const erro = await executar(req, res)

    expect(erro).toMatchObject({ status: 401 })
    expect((erro as Error).message).toMatch(/desativado/i)
    expect(clearCookie).toHaveBeenCalledWith('dr_sessao', expect.any(Object))
    expect(req.usuario).toBeUndefined()
  })

  it('usuário excluído perde o acesso na hora', async () => {
    buscarNoBanco.mockResolvedValue(null)
    const { req, res, clearCookie } = pedir(tokenDe({ id: 'u1' }))

    expect(await executar(req, res)).toMatchObject({ status: 401 })
    expect(clearCookie).toHaveBeenCalled()
    expect(req.usuario).toBeUndefined()
  })

  it('falha do banco vai para o tratador de erros, sem liberar a rota', async () => {
    const falha = new Error('banco fora do ar')
    buscarNoBanco.mockRejectedValue(falha)
    const { req, res } = pedir(tokenDe({ id: 'u1' }))

    expect(await executar(req, res)).toBe(falha)
    expect(req.usuario).toBeUndefined()
  })

  it('a consulta pode ser trocada (smoke sem banco) e restaurada', async () => {
    definirBuscaDeUsuarioDaSessao(async (id) => ({
      id,
      email: 'smoke@x.test',
      perfil: 'admin',
      organizacaoId: ORGANIZACAO_RAIZ_ID,
      ativo: true,
      organizacao: { licencaId: LICENCA_PRINCIPAL_ID, licenca: { ativa: true } },
    }))
    const { req, res } = pedir(tokenDe({ id: 'qualquer' }))

    expect(await executar(req, res)).toBeUndefined()
    expect(req.usuario?.perfil).toBe('admin')
    expect(buscarNoBanco).not.toHaveBeenCalled()
  })
})

describe('sessaoDe', () => {
  it('sem sessão é 401, com sessão devolve o usuário', () => {
    expect(() => sessaoDe({} as Request)).toThrow(/expirada/i)

    const usuario = { id: 'u1', email: 'a@b.c', perfil: 'perito', organizacaoId: 'x', licencaId: 'y' }
    expect(sessaoDe({ usuario } as unknown as Request)).toBe(usuario)
  })
})

describe('exigirPerfil', () => {
  const rodar = (perfil: string | null) => {
    const next = vi.fn()
    const req = { usuario: perfil ? { perfil } : undefined } as unknown as Request
    exigirPerfil('admin')(req, {} as Response, next)
    return next.mock.calls[0]?.[0]
  }

  it('libera o perfil pedido e barra os outros', () => {
    expect(rodar('admin')).toBeUndefined()
    expect(rodar('assistente')).toMatchObject({ status: 403 })
    expect(rodar(null)).toMatchObject({ status: 401 })
  })
})

describe('exigirEquipePrincipal', () => {
  const rodar = (organizacaoId: string | null) => {
    const next = vi.fn()
    const req = { usuario: organizacaoId ? { organizacaoId } : undefined } as unknown as Request
    exigirEquipePrincipal(req, {} as Response, next)
    return next.mock.calls[0]?.[0]
  }

  it('só a equipe raiz passa: equipe cliente leva 403, sem sessão 401', () => {
    expect(rodar(ORGANIZACAO_RAIZ_ID)).toBeUndefined()
    expect(rodar('equipe-a')).toMatchObject({ status: 403 })
    expect(rodar(null)).toMatchObject({ status: 401 })
  })
})
