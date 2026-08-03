import type { Perfil } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from './env.js'
import { naoAutorizado, semPermissao } from './erros.js'

// ============================================================
// Sessão por JWT em cookie httpOnly.
//
// O token não é legível por JavaScript no navegador, então uma
// sessão forjada via devtools deixa de ser possível — ao contrário
// do sessionStorage que o frontend usava na fase mock.
// ============================================================

const COOKIE = 'dr_sessao'

export interface Sessao {
  id: string
  email: string
  perfil: Perfil
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: Sessao
    }
  }
}

export function emitirSessao(res: Response, sessao: Sessao): void {
  const token = jwt.sign(sessao, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRACAO as never })

  res.cookie(COOKIE, token, {
    httpOnly: true,
    // sameSite 'none' exige secure — necessário quando API e front
    // estão em domínios diferentes (o caso típico no Coolify).
    secure: env.ehProducao,
    sameSite: env.ehProducao ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  })
}

export function encerrarSessao(res: Response): void {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: env.ehProducao,
    sameSite: env.ehProducao ? 'none' : 'lax',
    path: '/',
  })
}

/** Exige sessão válida. Popula req.usuario. */
export function exigirSessao(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE] as string | undefined
  if (!token) {
    next(naoAutorizado('Faça login para continuar.'))
    return
  }

  try {
    req.usuario = jwt.verify(token, env.JWT_SECRET) as Sessao
    next()
  } catch {
    next(naoAutorizado())
  }
}

/** Restringe a rota aos perfis informados. Use depois de exigirSessao. */
export function exigirPerfil(...perfis: Perfil[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) return next(naoAutorizado())
    if (!perfis.includes(req.usuario.perfil)) {
      return next(
        semPermissao(
          `Ação restrita a: ${perfis.join(', ')}. Seu perfil é "${req.usuario.perfil}".`,
        ),
      )
    }
    next()
  }
}

/** Atalho para handlers que precisam do id do usuário logado. */
export function sessaoDe(req: Request): Sessao {
  if (!req.usuario) throw naoAutorizado()
  return req.usuario
}
