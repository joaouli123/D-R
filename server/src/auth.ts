import type { Perfil } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from './env.js'
import { naoAutorizado, semPermissao } from './erros.js'
import { prisma } from './prisma.js'
import { ehEquipePrincipal } from './tenancy.js'

// ============================================================
// Sessão por JWT em cookie httpOnly.
//
// O token não é legível por JavaScript no navegador, então uma
// sessão forjada via devtools deixa de ser possível — ao contrário
// do sessionStorage que o frontend usava na fase mock.
//
// O token só prova QUEM é o usuário (o id). Perfil, equipe e situação
// são lidos do banco a cada requisição: quem foi desativado, excluído
// ou rebaixado perde o acesso na hora, não daqui a 8 horas, e a equipe
// que isola os dados nunca vem de um valor que o token carregou.
// ============================================================

const COOKIE = 'dr_sessao'

export interface Sessao {
  id: string
  email: string
  perfil: Perfil
  /** Equipe do usuário — o escopo de tudo o que ele lê e grava. */
  organizacaoId: string
}

export interface UsuarioDaSessao extends Sessao {
  ativo: boolean
}

export type BuscarUsuarioDaSessao = (id: string) => Promise<UsuarioDaSessao | null>

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: Sessao
    }
  }
}

const buscarNoBanco: BuscarUsuarioDaSessao = (id) =>
  prisma.usuario.findUnique({
    where: { id },
    select: { id: true, email: true, perfil: true, organizacaoId: true, ativo: true },
  })

let buscarUsuario: BuscarUsuarioDaSessao = buscarNoBanco

/**
 * Troca a consulta ao banco. Existe para os scripts de smoke, que exercitam
 * as rotas sem PostgreSQL, e para os testes. Sem argumento, volta à padrão.
 */
export function definirBuscaDeUsuarioDaSessao(buscar?: BuscarUsuarioDaSessao): void {
  buscarUsuario = buscar ?? buscarNoBanco
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

/**
 * Exige sessão válida. Popula req.usuario com os dados ATUAIS do banco.
 *
 * Responde 401 — e limpa o cookie — quando o usuário não existe mais ou foi
 * desativado, para o frontend cair na tela de login em vez de continuar
 * mostrando erros de permissão.
 */
export function exigirSessao(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE] as string | undefined
  if (!token) {
    next(naoAutorizado('Faça login para continuar.'))
    return
  }

  let id: string
  try {
    const declarado = (jwt.verify(token, env.JWT_SECRET) as { id?: unknown }).id
    if (typeof declarado !== 'string' || !declarado) throw new Error('token sem id')
    id = declarado
  } catch {
    next(naoAutorizado())
    return
  }

  buscarUsuario(id).then((usuario) => {
    if (!usuario || !usuario.ativo) {
      encerrarSessao(res)
      next(naoAutorizado(usuario ? 'Este usuário foi desativado. Procure o administrador.' : undefined))
      return
    }
    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      organizacaoId: usuario.organizacaoId,
    }
    next()
  }, next)
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

/**
 * Restringe a rota a quem é da equipe principal (a do perito titular).
 *
 * Serve para o que é compartilhado por TODAS as equipes — a base do CAEPI e
 * o banco global de quesitos. Uma equipe cliente lê, mas não altera: senão a
 * edição de uma mudaria o documento de outra.
 */
export function exigirEquipePrincipal(req: Request, _res: Response, next: NextFunction): void {
  if (!req.usuario) return next(naoAutorizado())
  if (!ehEquipePrincipal(req.usuario.organizacaoId)) {
    return next(semPermissao('Esta ação é restrita à equipe principal.'))
  }
  next()
}

/** Atalho para handlers que precisam do id do usuário logado. */
export function sessaoDe(req: Request): Sessao {
  if (!req.usuario) throw naoAutorizado()
  return req.usuario
}
