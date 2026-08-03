import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import { env } from '../env.js'
import { ErroHttp } from '../erros.js'

// ============================================================
// Armazenamento local dos uploads (fotos da vistoria e anexos
// em PDF). No Coolify a pasta é um volume persistente — ver
// docker-compose.yml.
// ============================================================

export const PASTA_UPLOADS = path.resolve(env.UPLOAD_DIR)

export async function prepararArmazenamento(): Promise<void> {
  await fs.mkdir(PASTA_UPLOADS, { recursive: true })
}

/** Nome opaco: preserva só a extensão, descarta o nome original. */
function nomeSeguro(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase().slice(0, 10)
  const seguro = /^\.[a-z0-9]+$/.test(ext) ? ext : ''
  return `${crypto.randomUUID()}${seguro}`
}

const armazenamento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PASTA_UPLOADS),
  filename: (_req, file, cb) => cb(null, nomeSeguro(file.originalname)),
})

const IMAGENS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

export const uploadImagens = multer({
  storage: armazenamento,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGENS.has(file.mimetype)) {
      cb(new ErroHttp(415, `Formato não suportado: ${file.mimetype}. Envie JPEG, PNG ou WebP.`))
      return
    }
    cb(null, true)
  },
})

export const uploadPdf = multer({
  storage: armazenamento,
  limits: { fileSize: env.UPLOAD_MAX_MB * 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new ErroHttp(415, 'O anexo externo deve ser um arquivo PDF.'))
      return
    }
    cb(null, true)
  },
})

/** Caminho absoluto de um arquivo, barrando travessia de diretório. */
export function caminhoDoUpload(arquivo: string): string {
  const destino = path.resolve(PASTA_UPLOADS, arquivo)
  if (destino !== PASTA_UPLOADS && !destino.startsWith(PASTA_UPLOADS + path.sep)) {
    throw new ErroHttp(400, 'Caminho de arquivo inválido.')
  }
  return destino
}

export async function lerUpload(arquivo: string): Promise<Buffer> {
  return fs.readFile(caminhoDoUpload(arquivo))
}

/** Remove sem estourar: um arquivo já ausente não é problema. */
export async function apagarUpload(arquivo?: string | null): Promise<void> {
  if (!arquivo) return
  try {
    await fs.unlink(caminhoDoUpload(arquivo))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`[uploads] não foi possível remover ${arquivo}:`, e)
    }
  }
}

/** Data URI para embutir a imagem no HTML que vira PDF. */
export async function comoDataUri(arquivo: string): Promise<string | null> {
  try {
    const buffer = await fs.readFile(caminhoDoUpload(arquivo))
    const ext = path.extname(arquivo).toLowerCase()
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : ext === '.avif'
              ? 'image/avif'
              : 'image/jpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}
