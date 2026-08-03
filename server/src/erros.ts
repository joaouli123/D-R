import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { env } from './env.js'

/** Erro com status HTTP e mensagem já pronta para o usuário final. */
export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detalhes?: unknown,
  ) {
    super(message)
    this.name = 'ErroHttp'
  }
}

export const naoEncontrado = (o = 'Registro') => new ErroHttp(404, `${o} não encontrado.`)
export const naoAutorizado = (m = 'Sessão expirada. Entre novamente.') => new ErroHttp(401, m)
export const semPermissao = (m = 'Você não tem permissão para esta ação.') => new ErroHttp(403, m)

/**
 * Lê um parâmetro de rota já estreitado para string.
 *
 * O Express sempre popula os parâmetros declarados no path, mas o
 * tipo é `string | undefined`; sem esta checagem um `undefined`
 * chegaria ao Prisma como "buscar qualquer um".
 */
export function parametro(req: Request, nome: string): string {
  const valor = req.params[nome]
  if (!valor) throw new ErroHttp(400, `Parâmetro "${nome}" ausente na rota.`)
  return valor
}

/** Envolve handler async para que rejeições cheguem ao middleware de erro. */
export function rota<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req as T, res, next).catch(next)
  }
}

export function tratarErros(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (erro instanceof ErroHttp) {
    res.status(erro.status).json({ erro: erro.message, detalhes: erro.detalhes })
    return
  }

  if (erro instanceof ZodError) {
    res.status(422).json({
      erro: 'Dados inválidos.',
      detalhes: erro.issues.map((i) => ({ campo: i.path.join('.'), problema: i.message })),
    })
    return
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 — violação de unicidade (ex.: CNPJ ou e-mail já cadastrado)
    if (erro.code === 'P2002') {
      const campos = (erro.meta?.target as string[] | undefined)?.join(', ') ?? 'registro'
      res.status(409).json({ erro: `Já existe um cadastro com este ${campos}.` })
      return
    }
    // P2003 — violação de chave estrangeira (ex.: excluir empresa em uso)
    if (erro.code === 'P2003' || erro.code === 'P2014') {
      res.status(409).json({
        erro: 'Este registro está vinculado a outros e não pode ser excluído.',
      })
      return
    }
    // P2025 — registro alvo não existe
    if (erro.code === 'P2025') {
      res.status(404).json({ erro: 'Registro não encontrado.' })
      return
    }
  }

  console.error('[erro não tratado]', erro)
  res.status(500).json({
    erro: 'Erro interno do servidor.',
    ...(env.ehProducao ? {} : { detalhes: erro instanceof Error ? erro.message : String(erro) }),
  })
}
