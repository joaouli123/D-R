import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import express from 'express'
import multer from 'multer'
import { env } from '../env.js'
import { ErroHttp } from '../erros.js'
import { LIMITE_FOTOS_POR_ENVIO, LIMITE_MULTER_BYTES, TIPOS_IMAGEM_ACEITOS } from '../limites.js'

// O multer 2 repassa `defParamCharset` ao busboy; o @types/multer ainda não
// declara a opção.
declare module 'multer' {
  interface Options {
    defParamCharset?: string
  }
}

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

/**
 * A extensão sai do tipo que o filtro aceitou, nunca do nome enviado.
 *
 * A pasta é servida estaticamente, e o servidor estático escolhe o
 * Content-Type pela extensão: um "foto.html" declarado como image/png
 * passava no filtro e voltava como página HTML, executando no domínio do
 * sistema. Com a extensão presa ao tipo validado, o que foi aceito como
 * imagem só sai como imagem.
 */
const EXTENSAO_DO_TIPO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'application/pdf': '.pdf',
}

/** Nome opaco: um UUID e a extensão do tipo aceito; o nome original fica de fora. */
function nomeSeguro(mimetype: string): string {
  return `${crypto.randomUUID()}${EXTENSAO_DO_TIPO[mimetype] ?? ''}`
}

const armazenamento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PASTA_UPLOADS),
  filename: (_req, file, cb) => cb(null, nomeSeguro(file.mimetype)),
})

/**
 * Nome do arquivo em UTF-8. O padrão do multer é latin1, e o navegador manda
 * UTF-8: "Área de produção.jpg" virava "Ãrea de produÃ§Ã£o" na legenda
 * da foto e no nome do anexo em PDF.
 */
const CHARSET_DO_NOME = 'utf8'

/** O que a pasta serve para ser aberto no navegador; `.jpeg` vem dos nomes antigos. */
const EXTENSOES_EXIBIVEIS = new Set([...Object.values(EXTENSAO_DO_TIPO), '.jpeg'])

/**
 * A pasta de uploads servida ao navegador. Cache longo: o nome do arquivo é
 * um UUID, então o conteúdo nunca muda. `nosniff` impede o navegador de
 * adivinhar outro tipo pelo conteúdo — o Content-Type da extensão vale.
 *
 * Arquivos gravados antes de a extensão sair do tipo podem ter qualquer
 * extensão (`.html`, `.svg`): esses saem como download, nunca como página.
 * O `<img>` de uma foto antiga sem extensão continua igual — já saía como
 * application/octet-stream.
 */
export function servirUploads() {
  return express.static(PASTA_UPLOADS, {
    maxAge: '30d',
    immutable: true,
    index: false,
    dotfiles: 'deny',
    setHeaders: (res, caminho) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      if (!EXTENSOES_EXIBIVEIS.has(path.extname(caminho).toLowerCase())) {
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Disposition', 'attachment')
      }
    },
  })
}

const IMAGENS = new Set<string>(TIPOS_IMAGEM_ACEITOS)

export const uploadImagens = multer({
  storage: armazenamento,
  defParamCharset: CHARSET_DO_NOME,
  // Toda imagem para em LIMITE_IMAGEM_MB, e não em UPLOAD_MAX_MB: o
  // navegador confere o mesmo número antes de enviar, e ele não lê o .env.
  limits: { fileSize: LIMITE_MULTER_BYTES, files: LIMITE_FOTOS_POR_ENVIO },
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
 * Logo do perito: só PNG e JPEG, um arquivo, no mesmo teto das fotos.
 *
 * O recorte de formatos não é zelo estético. Esta imagem é EMBUTIDA no DOCX,
 * e o Word só aceita alguns formatos: um WebP aceito aqui viraria um
 * cabeçalho quebrado no arquivo que o perito entrega no processo — e ele só
 * descobriria ao abrir o .docx. PNG é o recomendado, porque preserva fundo
 * transparente.
 */
export const uploadLogo = multer({
  storage: armazenamento,
  defParamCharset: CHARSET_DO_NOME,
  limits: { fileSize: LIMITE_MULTER_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
      cb(new ErroHttp(415, `Formato não suportado: ${file.mimetype}. A logo deve ser PNG (de preferência, com fundo transparente) ou JPEG.`))
      return
    }
    cb(null, true)
  },
})

/**
 * Foto da assinatura manuscrita: fica na MEMÓRIA, não no volume.
 *
 * O arquivo enviado é só matéria-prima — o que se grava é o PNG recortado e
 * com fundo transparente que services/assinatura-perito.ts gera a partir
 * dele. Guardar a foto original seria deixar no disco, sem uso, a imagem de
 * uma assinatura com o papel, a mesa e o que mais a câmera pegou.
 */
export const uploadAssinatura = multer({
  storage: multer.memoryStorage(),
  defParamCharset: CHARSET_DO_NOME,
  limits: { fileSize: LIMITE_MULTER_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGENS.has(file.mimetype)) {
      cb(new ErroHttp(415, `Formato não suportado: ${file.mimetype}. Envie a foto da assinatura em JPEG ou PNG.`))
      return
    }
    cb(null, true)
  },
})

export const uploadPdf = multer({
  storage: armazenamento,
  defParamCharset: CHARSET_DO_NOME,
  // De propósito fora do teto das imagens: um processo digitalizado passa
  // longe de 3 MB, e recusar o anexo inteiro seria pior que a doença.
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

/**
 * Grava no volume um arquivo gerado pelo próprio servidor (não pelo multer),
 * com o mesmo nome opaco dos uploads. Devolve o nome gravado.
 */
export async function gravarUpload(dados: Buffer, mimetype: string): Promise<string> {
  const nome = nomeSeguro(mimetype)
  await fs.mkdir(PASTA_UPLOADS, { recursive: true })
  await fs.writeFile(caminhoDoUpload(nome), dados)
  return nome
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
