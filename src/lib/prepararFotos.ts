import { LIMITE_IMAGEM_BYTES, LIMITE_IMAGEM_MB, TIPOS_IMAGEM_ACEITOS } from './limitesUpload'

// ============================================================
// Preparo das fotografias ANTES do envio.
//
// Foto de celular costuma ter de 3 a 8 MB, e o servidor para em 3 MB. Antes
// a tela recusava o lote inteiro por causa de uma foto só e mandava o perito
// "reduzir a resolução" por conta própria. Agora o próprio navegador reduz a
// foto grande e converte para JPEG o que o servidor não grava, e só recusa o
// arquivo que não consegue abrir — um de cada vez, sem derrubar o lote.
//
// A foto que já cabe no limite, num formato aceito, sobe intacta: o original
// preserva os metadados (data, orientação) e não perde qualidade à toa.
// ============================================================

/** Lado maior, em pixels, da foto reduzida. Legível no laudo e bem abaixo de 3 MB. */
export const LADO_MAXIMO_FOTO = 2400

/**
 * Tentativas de compressão, da mais fiel para a mais leve. Um JPEG de
 * 2400 px com qualidade 0,85 fica, na prática, entre 0,6 e 1,5 MB; as
 * demais existem para a foto excepcionalmente cheia de detalhe.
 */
export const TENTATIVAS_COMPRESSAO = [
  { ladoMaximo: LADO_MAXIMO_FOTO, qualidade: 0.85 },
  { ladoMaximo: LADO_MAXIMO_FOTO, qualidade: 0.75 },
  { ladoMaximo: 2000, qualidade: 0.7 },
  { ladoMaximo: 1600, qualidade: 0.7 },
] as const

export type Preparo = 'manter' | 'reduzir' | 'converter'

/** O que interessa de um `File` para decidir — o teste não precisa de imagem real. */
export interface ArquivoDeImagem {
  name: string
  type: string
  size: number
}

export function ehHeic(arquivo: Pick<ArquivoDeImagem, 'name' | 'type'>): boolean {
  return /hei[cf]/i.test(arquivo.type) || /\.hei[cf]$/i.test(arquivo.name)
}

/**
 * - `manter`: formato aceito e dentro do limite — sobe como está;
 * - `reduzir`: formato aceito, mas grande demais — vira JPEG menor;
 * - `converter`: formato que o servidor recusaria (HEIC, BMP, tipo vazio) —
 *   o navegador tenta abrir e regravar em JPEG; se não conseguir, recusa.
 */
export function decidirPreparo(arquivo: ArquivoDeImagem): Preparo {
  const aceito = (TIPOS_IMAGEM_ACEITOS as readonly string[]).includes(arquivo.type)
  if (!aceito || ehHeic(arquivo)) return 'converter'
  // Mesma borda do servidor: exatamente 3 MB ainda passa.
  return arquivo.size > LIMITE_IMAGEM_BYTES ? 'reduzir' : 'manter'
}

/** Imagem já aberta pelo navegador, pronta para ser regravada. */
export interface ImagemDecodificada {
  largura: number
  altura: number
  codificarJpeg(opcoes: { ladoMaximo: number; qualidade: number }): Promise<Blob>
  liberar(): void
}

export type Decodificador = (arquivo: File) => Promise<ImagemDecodificada>

export function mensagemHeic(nome: string): string {
  return `“${nome}” está em HEIC, o formato do iPhone, e este navegador não consegue convertê-la. No iPhone: Ajustes › Câmera › Formatos › “Mais Compatível” — as próximas fotos já saem em JPEG.`
}

export function mensagemFormato(nome: string): string {
  return `“${nome}” não pôde ser aberta como imagem. Envie JPEG, PNG ou WebP.`
}

function nomeJpeg(nome: string): string {
  const base = nome.replace(/\.[^.]+$/, '') || 'foto'
  return `${base}.jpg`
}

async function regravarEmJpeg(arquivo: File, decodificar: Decodificador): Promise<File | string> {
  let imagem: ImagemDecodificada
  try {
    imagem = await decodificar(arquivo)
  } catch {
    return ehHeic(arquivo) ? mensagemHeic(arquivo.name) : mensagemFormato(arquivo.name)
  }

  try {
    for (const tentativa of TENTATIVAS_COMPRESSAO) {
      const blob = await imagem.codificarJpeg(tentativa)
      if (blob.size > 0 && blob.size <= LIMITE_IMAGEM_BYTES) {
        return new File([blob], nomeJpeg(arquivo.name), {
          type: 'image/jpeg',
          lastModified: arquivo.lastModified,
        })
      }
    }
    return `“${arquivo.name}” continua acima de ${LIMITE_IMAGEM_MB} MB mesmo reduzida. Envie uma versão menor.`
  } catch {
    return ehHeic(arquivo) ? mensagemHeic(arquivo.name) : mensagemFormato(arquivo.name)
  } finally {
    imagem.liberar()
  }
}

export interface FotosPreparadas {
  prontos: File[]
  /** Uma frase por arquivo recusado, já pronta para mostrar ao perito. */
  recusas: string[]
}

/**
 * Prepara as fotos UMA DE CADA VEZ: abrir vinte fotos de 12 megapixels ao
 * mesmo tempo estoura a memória de um celular. A ordem de escolha é mantida,
 * porque ela vira a numeração "Fotografia N" do laudo.
 */
export async function prepararFotosParaEnvio(
  arquivos: File[],
  decodificar: Decodificador = decodificarNoNavegador,
): Promise<FotosPreparadas> {
  const prontos: File[] = []
  const recusas: string[] = []

  for (const arquivo of arquivos) {
    if (decidirPreparo(arquivo) === 'manter') {
      prontos.push(arquivo)
      continue
    }
    const resultado = await regravarEmJpeg(arquivo, decodificar)
    if (typeof resultado === 'string') recusas.push(resultado)
    else prontos.push(resultado)
  }

  return { prontos, recusas }
}

// ------------------------------------------------------------
// Decodificação real, no navegador.
//
// Testado no Chrome: `createImageBitmap` com `imageOrientation: 'from-image'`
// já devolve a foto em pé (aplica o EXIF), e o fundo branco evita que a
// transparência de um PNG vire preto no JPEG. O jsdom não tem nada disso —
// os testes injetam um decodificador falso.
// ------------------------------------------------------------

type Desenhavel = ImageBitmap | HTMLImageElement

function criarCanvas(largura: number, altura: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(largura, altura)
    return {
      contexto: canvas.getContext('2d'),
      paraBlob: (qualidade: number) => canvas.convertToBlob({ type: 'image/jpeg', quality: qualidade }),
    }
  }
  // Safari anterior ao 16.4 não tem OffscreenCanvas.
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  return {
    contexto: canvas.getContext('2d'),
    paraBlob: (qualidade: number) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('O navegador não gerou o JPEG.'))),
          'image/jpeg',
          qualidade,
        ),
      ),
  }
}

async function abrirComoElemento(arquivo: File): Promise<{ imagem: HTMLImageElement; liberar: () => void }> {
  const url = URL.createObjectURL(arquivo)
  const imagem = new Image()
  imagem.src = url
  try {
    await imagem.decode()
  } catch (erro) {
    URL.revokeObjectURL(url)
    throw erro
  }
  return { imagem, liberar: () => URL.revokeObjectURL(url) }
}

export async function decodificarNoNavegador(arquivo: File): Promise<ImagemDecodificada> {
  let fonte: Desenhavel
  let liberar: () => void
  let largura: number
  let altura: number

  try {
    if (typeof createImageBitmap !== 'function') throw new Error('sem createImageBitmap')
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
    fonte = bitmap
    largura = bitmap.width
    altura = bitmap.height
    liberar = () => bitmap.close()
  } catch {
    // O Safari abre HEIC num <img>, mas não em createImageBitmap.
    const aberta = await abrirComoElemento(arquivo)
    fonte = aberta.imagem
    largura = aberta.imagem.naturalWidth
    altura = aberta.imagem.naturalHeight
    liberar = aberta.liberar
  }

  if (!largura || !altura) {
    liberar()
    throw new Error('Imagem sem dimensões.')
  }

  return {
    largura,
    altura,
    liberar,
    async codificarJpeg({ ladoMaximo, qualidade }) {
      const escala = Math.min(1, ladoMaximo / Math.max(largura, altura))
      const w = Math.max(1, Math.round(largura * escala))
      const h = Math.max(1, Math.round(altura * escala))
      const { contexto, paraBlob } = criarCanvas(w, h)
      if (!contexto) throw new Error('O navegador não abriu o canvas.')
      contexto.fillStyle = '#FFFFFF'
      contexto.fillRect(0, 0, w, h)
      contexto.imageSmoothingEnabled = true
      contexto.imageSmoothingQuality = 'high'
      contexto.drawImage(fonte, 0, 0, w, h)
      return paraBlob(qualidade)
    },
  }
}
