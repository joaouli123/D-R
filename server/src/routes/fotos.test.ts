import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// prisma.js instancia um PrismaClient de verdade, que exige DATABASE_URL no
// processo — sem mock a simples importação de fotos.ts já quebraria antes
// do teste começar. env.js mockado pelo mesmo motivo (JWT_SECRET).
vi.mock('../env.js', () => ({
  env: { UPLOAD_DIR: './uploads', UPLOAD_MAX_MB: 15, ehProducao: false },
}))
vi.mock('../prisma.js', () => ({ prisma: {} }))

const exigirSessaoMock = vi.hoisted(() => vi.fn())
vi.mock('../auth.js', () => ({ exigirSessao: exigirSessaoMock }))

const { agentePertenceAoTecnico, exigirSessaoDrenandoUpload } = await import('./fotos.js')

// ============================================================
// Se a sessão for rejeitada com um multipart grande ainda chegando e o
// servidor responder sem drenar o resto do corpo, o SO costuma fechar o
// socket com RST em vez de FIN — o fetch() do perito via isso como falha
// de rede genérica, não como "sessão expirada". Ver o comentário acima de
// exigirSessaoDrenandoUpload em fotos.ts.
// ============================================================

function requisicaoFalsa() {
  const chamadas: string[] = []
  const req = {
    resume: () => chamadas.push('resume'),
    on: () => chamadas.push('on'),
  }
  return { req: req as unknown as Request, chamadas }
}

describe('exigirSessaoDrenandoUpload', () => {
  it('drena o corpo quando a sessão é rejeitada', () => {
    const erro = new Error('sessão inválida')
    exigirSessaoMock.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(erro),
    )
    const { req, chamadas } = requisicaoFalsa()
    const next = vi.fn()

    exigirSessaoDrenandoUpload(req, {} as Response, next)

    expect(chamadas).toContain('resume')
    expect(next).toHaveBeenCalledWith(erro)
  })

  it('não mexe no corpo quando a sessão é válida', () => {
    exigirSessaoMock.mockImplementation((_req: Request, _res: Response, next: NextFunction) =>
      next(),
    )
    const { req, chamadas } = requisicaoFalsa()
    const next = vi.fn()

    exigirSessaoDrenandoUpload(req, {} as Response, next)

    expect(chamadas).not.toContain('resume')
    expect(next).toHaveBeenCalledWith(undefined)
  })
})

describe('agentePertenceAoTecnico', () => {
  it('aceita somente um agente gravado no preenchimento da própria perícia', () => {
    const tecnico = { agentes: [{ id: 'agente-1' }, { id: 'agente-2' }] }

    expect(agentePertenceAoTecnico(tecnico, 'agente-2')).toBe(true)
    expect(agentePertenceAoTecnico(tecnico, 'agente-de-outra-pericia')).toBe(false)
    expect(agentePertenceAoTecnico(null, 'agente-1')).toBe(false)
  })
})
