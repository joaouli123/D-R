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

export interface EstadoDosUploads {
  pasta: string
  /** Falso = as fotos nao tem onde ser gravadas; o upload vai falhar. */
  gravavel: boolean
  /** Quantos arquivos ja estao no volume. Zero apos um deploy = volume perdido. */
  arquivos: number
  erro?: string
}

/**
 * Cria a pasta e CONFIRMA que da para gravar nela.
 *
 * O mkdir sozinho nao provava nada: num volume montado somente-leitura, ou
 * montado por cima de /app/uploads com outro dono, ele passa e so o primeiro
 * upload real descobre o problema — na frente do perito, no meio da pericia.
 * Aqui a falha aparece no log da subida.
 *
 * De proposito NAO relanca o erro: quem chama e o bootstrap (index.ts), que
 * derruba a API se algo estourar. Sem as fotos o perito ainda escreve o
 * laudo; sem API, ele fica sem sistema nenhum — e o healthcheck do Coolify
 * ainda reverteria o deploy. O estado real fica visivel em GET /saude.
 */
export async function prepararArmazenamento(): Promise<void> {
  const sonda = path.join(PASTA_UPLOADS, `.escrita-${crypto.randomUUID()}`)
  try {
    await fs.mkdir(PASTA_UPLOADS, { recursive: true })
    await fs.writeFile(sonda, 'ok')
    await fs.unlink(sonda)
  } catch (e) {
    console.error(
      [
        '',
        `✗ A pasta de uploads (${PASTA_UPLOADS}) nao aceita escrita.`,
        '  As fotos da vistoria e os anexos em PDF nao serao salvos.',
        '  No Coolify: confira o Persistent Storage montado em /app/uploads.',
        '',
      ].join('\n'),
      e,
    )
  }
}

/** Diagnostico do volume, exposto em GET /saude. */
export async function estadoDosUploads(): Promise<EstadoDosUploads> {
  const sonda = path.join(PASTA_UPLOADS, `.escrita-${crypto.randomUUID()}`)
  try {
    await fs.mkdir(PASTA_UPLOADS, { recursive: true })
    await fs.writeFile(sonda, 'ok')
    await fs.unlink(sonda)
    const arquivos = await fs.readdir(PASTA_UPLOADS)
    return {
      pasta: PASTA_UPLOADS,
      gravavel: true,
      arquivos: arquivos.filter((a) => !a.startsWith('.')).length,
    }
  } catch (e) {
    return {
      pasta: PASTA_UPLOADS,
      gravavel: false,
      arquivos: 0,
      erro: e instanceof Error ? e.message : String(e),
    }
  }
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
      // HEIC/HEIF e o padrao das fotos de iPhone e nao abre no navegador
      // nem no Word. Vale a pena dizer onde se troca isso, em vez de
      // devolver so "formato invalido".
      const ehHeic = /hei[cf]/i.test(file.mimetype) || /\.hei[cf]$/i.test(file.originalname)
      cb(
        new ErroHttp(
          415,
          ehHeic
            ? `"${file.originalname}" esta em HEIC, o formato do iPhone, que nao abre no laudo. No iPhone: Ajustes › Camera › Formatos › "Mais Compativel" — as proximas fotos ja saem em JPEG.`
            : `Formato nao suportado: ${file.mimetype}. Envie JPEG, PNG ou WebP.`,
        ),
      )
      return
    }
    cb(null, true)
  },
})

/**
 * Logo do perito: só PNG e JPEG, um arquivo, 4 MB.
 *
 * O recorte de formatos não é zelo estético. Esta imagem é EMBUTIDA no DOCX,
 * e o Word só aceita alguns formatos: um WebP aceito aqui viraria um
 * cabeçalho quebrado no arquivo que o perito entrega no processo — e ele só
 * descobriria ao abrir o .docx. PNG é o recomendado, porque preserva fundo
 * transparente.
 */
export const uploadLogo = multer({
  storage: armazenamento,
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
      cb(new ErroHttp(415, `Formato não suportado: ${file.mimetype}. A logo deve ser PNG (de preferência, com fundo transparente) ou JPEG.`))
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
