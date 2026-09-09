import { readFileSync } from 'node:fs'
import path from 'node:path'

// ============================================================
// A marca impressa no cabeçalho do documento.
//
// White-label: cada perito sobe a própria logo em Configurações › Meu perfil
// e ela passa a sair no app, no PDF e no DOCX. A arte da D&R deixou de ser
// "a logo do sistema" e virou a logo de UM perito — o Dinoel. O que sobrou
// aqui é apenas o fallback: quem ainda não subiu nada, ou cujo arquivo
// sumiu do volume, continua com um cabeçalho válido em vez de um buraco.
// ============================================================

/** Arte embutida, usada apenas como fallback. */
export const LOGO_OFICIAL_JPEG = readFileSync(
  new URL('../../assets/logo-dr-oficial.jpeg', import.meta.url),
)

export const LOGO_OFICIAL_DATA_URI =
  `data:image/jpeg;base64,${LOGO_OFICIAL_JPEG.toString('base64')}`

export const LOGO_OFICIAL_ALT =
  'Logo oficial D&R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional'

/** Formatos que o Word aceita embutir E que o navegador do PDF renderiza. */
const TIPO_POR_EXTENSAO: Record<string, 'jpg' | 'png' | 'gif' | 'bmp'> = {
  '.jpg': 'jpg',
  '.jpeg': 'jpg',
  '.png': 'png',
  '.gif': 'gif',
  '.bmp': 'bmp',
}

const MIME_POR_TIPO: Record<'jpg' | 'png' | 'gif' | 'bmp', string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
}

/** Caixa do cabeçalho no DOCX, em pontos. A logo cabe dentro dela inteira. */
const CAIXA_DOCX = { largura: 270, altura: 95 }

export interface MarcaDoDocumento {
  /** Bytes da imagem — o DOCX embute o arquivo, não um link. */
  dados: Buffer
  /** O `type` que o ImageRun do docx exige; não é deduzido do buffer. */
  tipo: 'jpg' | 'png' | 'gif' | 'bmp'
  /** `data:` URI para o HTML que o Chromium transforma em PDF (sem rede). */
  dataUri: string
  /** Dimensão já ajustada à caixa do cabeçalho, preservando a proporção. */
  largura: number
  altura: number
  alt: string
  /** true = caiu na arte embutida (perito sem logo, ou arquivo ausente). */
  padrao: boolean
}

/**
 * Encaixa a imagem na caixa do cabeçalho sem deformar.
 *
 * A versão anterior fixava 270x93pt, a proporção exata da arte da D&R. Com a
 * logo de outro perito — quadrada, ou mais alta que larga — aquilo esticava a
 * marca de outra pessoa no cabeçalho de um documento judicial.
 */
function encaixar(largura?: number, altura?: number): { largura: number; altura: number } {
  if (!largura || !altura) return { largura: CAIXA_DOCX.largura, altura: CAIXA_DOCX.altura }
  const escala = Math.min(CAIXA_DOCX.largura / largura, CAIXA_DOCX.altura / altura)
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  }
}

async function dimensoes(dados: Buffer): Promise<{ largura?: number; altura?: number }> {
  try {
    // Import dinâmico: o sharp carrega binário nativo e só vale a pena pagar
    // isso quando existe logo de perito para medir.
    const sharp = (await import('sharp')).default
    const meta = await sharp(dados).metadata()
    return { largura: meta.width, altura: meta.height }
  } catch {
    return {}
  }
}

/** A marca embutida, já medida. Fallback de todos os caminhos abaixo. */
async function marcaPadrao(): Promise<MarcaDoDocumento> {
  const { largura, altura } = await dimensoes(LOGO_OFICIAL_JPEG)
  return {
    dados: LOGO_OFICIAL_JPEG,
    tipo: 'jpg',
    dataUri: LOGO_OFICIAL_DATA_URI,
    ...encaixar(largura, altura),
    alt: LOGO_OFICIAL_ALT,
    padrao: true,
  }
}

/**
 * A marca deste perito, pronta para os dois renderizadores.
 *
 * Nunca lança: se o arquivo sumiu do volume (deploy sem volume persistente,
 * por exemplo), o documento sai com a arte embutida. Ficar sem laudo porque
 * uma imagem de cabeçalho não foi encontrada seria pior do que sair com o
 * cabeçalho antigo.
 */
export async function marcaDoDocumento(
  perito?: { nome?: string | null; logoArquivo?: string | null } | null,
): Promise<MarcaDoDocumento> {
  const arquivo = perito?.logoArquivo?.trim()
  if (!arquivo) return marcaPadrao()

  const tipo = TIPO_POR_EXTENSAO[path.extname(arquivo).toLowerCase()]
  if (!tipo) return marcaPadrao()

  try {
    const { lerUpload } = await import('./armazenamento.js')
    const dados = await lerUpload(arquivo)
    if (!dados.length) return marcaPadrao()
    const { largura, altura } = await dimensoes(dados)
    return {
      dados,
      tipo,
      dataUri: `data:${MIME_POR_TIPO[tipo]};base64,${dados.toString('base64')}`,
      ...encaixar(largura, altura),
      alt: perito?.nome?.trim() ? `Logo de ${perito.nome.trim()}` : 'Logo do perito responsável',
      padrao: false,
    }
  } catch {
    return marcaPadrao()
  }
}
