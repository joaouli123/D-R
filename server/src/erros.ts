import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'
import { env } from './env.js'
import { LIMITE_FOTOS_POR_ENVIO, LIMITE_IMAGEM_MB } from './limites.js'

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
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (erro instanceof ErroHttp) {
    // Erros "esperados" (422, 401...) nunca precisaram de rastro. Mas 5xx e
    // 429 escondiam falha real de dependência externa (ex.: DataJud fora do
    // ar ou limitando taxa) atrás de uma resposta perfeitamente tratada —
    // sem isso, get_logs voltava vazio mesmo quando a consulta falhava.
    if (erro.status >= 500 || erro.status === 429) {
      console.error(`[erro ${erro.status}]`, req.method, req.originalUrl, erro.message)
    }
    res.status(erro.status).json({ erro: erro.message, detalhes: erro.detalhes })
    return
  }

  // Falhas do multer chegavam aqui como erro desconhecido e viravam
  // "Erro interno do servidor." — sem detalhe nenhum em producao. Era o
  // que o perito via quando o upload de foto falhava: uma caixa vermelha
  // generica, indistinguivel de um servidor fora do ar.
  if (erro instanceof multer.MulterError) {
    // Imagem (foto ou logo) para no teto fixo; so o anexo em PDF, que nao e
    // imagem, segue o ambiente. Ver limites.ts e armazenamento.ts.
    const limiteMb = erro.field === 'anexo' ? env.UPLOAD_MAX_MB * 4 : LIMITE_IMAGEM_MB
    const mensagens: Record<string, [number, string]> = {
      LIMIT_FILE_SIZE: [
        413,
        `Arquivo grande demais. O limite e ${limiteMb} MB por arquivo — reduza a resolucao da foto e envie de novo.`,
      ],
      LIMIT_FILE_COUNT: [
        400,
        `Fotos demais de uma vez. Envie no maximo ${LIMITE_FOTOS_POR_ENVIO} por vez.`,
      ],
      LIMIT_UNEXPECTED_FILE: [
        400,
        'O servidor nao reconheceu o campo do arquivo enviado. Atualize a pagina e tente de novo.',
      ],
    }
    const [status, mensagem] = mensagens[erro.code] ?? [
      400,
      `Nao foi possivel receber o arquivo (${erro.code}).`,
    ]
    res.status(status).json({ erro: mensagem })
    return
  }

  // body-parser: JSON acima do limite de express.json(). Acontece quando a
  // pericia fica muito longa; sem esta ramificacao virava 500 mudo.
  if ((erro as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({
      erro: 'Os dados da pericia ficaram grandes demais para uma unica gravacao. Salve o rascunho e avise o suporte.',
    })
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
