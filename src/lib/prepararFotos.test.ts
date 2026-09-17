import { describe, expect, it, vi } from 'vitest'

import { LIMITE_IMAGEM_BYTES } from './limitesUpload'
import {
  TENTATIVAS_COMPRESSAO,
  decidirPreparo,
  ehHeic,
  mensagemFormato,
  mensagemHeic,
  prepararFotosParaEnvio,
  type Decodificador,
  type ImagemDecodificada,
} from './prepararFotos'

// ============================================================
// Foto de celular passa de 3 MB. Antes, uma única foto grande derrubava o
// lote inteiro e o perito ficava sem saber o que fazer. Aqui se trava que o
// navegador reduz a foto grande, converte o formato que o servidor recusaria
// e só recusa — sozinho — o arquivo que não abre.
// ============================================================

function arquivo(nome: string, tipo: string, bytes: number): File {
  const f = new File(['x'], nome, { type: tipo, lastModified: 1_700_000_000_000 })
  Object.defineProperty(f, 'size', { value: bytes })
  return f
}

function decodificadorFalso(tamanhos: number[] | ((tentativa: number) => number)) {
  const liberar = vi.fn()
  const codificacoes: { ladoMaximo: number; qualidade: number }[] = []
  const decodificar = vi.fn<Decodificador>(async (): Promise<ImagemDecodificada> => ({
    largura: 4000,
    altura: 3000,
    liberar,
    async codificarJpeg(opcoes) {
      codificacoes.push(opcoes)
      const i = codificacoes.length - 1
      const bytes = typeof tamanhos === 'function' ? tamanhos(i) : (tamanhos[i] ?? tamanhos[tamanhos.length - 1]!)
      return new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })
    },
  }))
  return { decodificar, liberar, codificacoes }
}

describe('decidirPreparo', () => {
  it('mantém a foto aceita que cabe no limite — inclusive exatamente 3 MB', () => {
    expect(decidirPreparo(arquivo('a.jpg', 'image/jpeg', 1024))).toBe('manter')
    expect(decidirPreparo(arquivo('a.jpg', 'image/jpeg', LIMITE_IMAGEM_BYTES))).toBe('manter')
    expect(decidirPreparo(arquivo('a.png', 'image/png', 10))).toBe('manter')
    expect(decidirPreparo(arquivo('a.webp', 'image/webp', 10))).toBe('manter')
  })

  it('reduz a foto aceita acima de 3 MB', () => {
    expect(decidirPreparo(arquivo('a.jpg', 'image/jpeg', LIMITE_IMAGEM_BYTES + 1))).toBe('reduzir')
  })

  it('converte o que o servidor recusaria: HEIC, BMP e tipo vazio', () => {
    expect(decidirPreparo(arquivo('IMG_0001.HEIC', 'image/heic', 10))).toBe('converter')
    expect(decidirPreparo(arquivo('IMG_0001.heic', '', 10))).toBe('converter')
    expect(decidirPreparo(arquivo('a.bmp', 'image/bmp', 10))).toBe('converter')
    expect(decidirPreparo(arquivo('semtipo', '', 10))).toBe('converter')
  })

  it('reconhece HEIC pelo tipo ou pela extensão', () => {
    expect(ehHeic({ name: 'x.jpg', type: 'image/heif' })).toBe(true)
    expect(ehHeic({ name: 'x.HEIF', type: '' })).toBe(true)
    expect(ehHeic({ name: 'x.jpg', type: 'image/jpeg' })).toBe(false)
  })
})

describe('prepararFotosParaEnvio', () => {
  it('não toca na foto que já cabe — o original segue com os metadados', async () => {
    const { decodificar } = decodificadorFalso([100])
    const original = arquivo('pequena.jpg', 'image/jpeg', 500_000)
    const { prontos, recusas } = await prepararFotosParaEnvio([original], decodificar)
    expect(prontos[0]).toBe(original)
    expect(recusas).toEqual([])
    expect(decodificar).not.toHaveBeenCalled()
  })

  it('reduz a foto grande para JPEG, com o nome trocado para .jpg', async () => {
    const { decodificar, liberar, codificacoes } = decodificadorFalso([900_000])
    const { prontos, recusas } = await prepararFotosParaEnvio(
      [arquivo('grande.PNG', 'image/png', 7_000_000)],
      decodificar,
    )
    expect(recusas).toEqual([])
    expect(prontos).toHaveLength(1)
    expect(prontos[0]!.name).toBe('grande.jpg')
    expect(prontos[0]!.type).toBe('image/jpeg')
    expect(prontos[0]!.size).toBe(900_000)
    expect(prontos[0]!.lastModified).toBe(1_700_000_000_000)
    expect(codificacoes).toEqual([TENTATIVAS_COMPRESSAO[0]])
    expect(liberar).toHaveBeenCalledTimes(1)
  })

  it('tenta qualidade menor até caber, e aceita exatamente o limite', async () => {
    const { decodificar, codificacoes } = decodificadorFalso([
      LIMITE_IMAGEM_BYTES + 500,
      LIMITE_IMAGEM_BYTES + 1,
      LIMITE_IMAGEM_BYTES,
    ])
    const { prontos } = await prepararFotosParaEnvio([arquivo('a.jpg', 'image/jpeg', 9_000_000)], decodificar)
    expect(codificacoes).toEqual(TENTATIVAS_COMPRESSAO.slice(0, 3))
    expect(prontos[0]!.size).toBe(LIMITE_IMAGEM_BYTES)
  })

  it('recusa só a foto que não coube em nenhuma tentativa, e libera a memória', async () => {
    const { decodificar, liberar, codificacoes } = decodificadorFalso(() => LIMITE_IMAGEM_BYTES + 1)
    const pequena = arquivo('ok.jpg', 'image/jpeg', 100)
    const { prontos, recusas } = await prepararFotosParaEnvio(
      [arquivo('gigante.jpg', 'image/jpeg', 40_000_000), pequena],
      decodificar,
    )
    expect(codificacoes).toHaveLength(TENTATIVAS_COMPRESSAO.length)
    expect(prontos).toEqual([pequena])
    expect(recusas).toEqual(['“gigante.jpg” continua acima de 3 MB mesmo reduzida. Envie uma versão menor.'])
    expect(liberar).toHaveBeenCalledTimes(1)
  })

  it('HEIC que o navegador não abre vira recusa com o caminho no iPhone, sem derrubar o lote', async () => {
    const decodificar = vi.fn<Decodificador>(async () => {
      throw new Error('formato não suportado')
    })
    const jpeg = arquivo('ok.jpg', 'image/jpeg', 100)
    const { prontos, recusas } = await prepararFotosParaEnvio(
      [arquivo('IMG_1.HEIC', 'image/heic', 2_000_000), jpeg, arquivo('x.bmp', 'image/bmp', 10)],
      decodificar,
    )
    expect(prontos).toEqual([jpeg])
    expect(recusas).toEqual([mensagemHeic('IMG_1.HEIC'), mensagemFormato('x.bmp')])
  })

  it('HEIC que o navegador abre é convertido para JPEG', async () => {
    const { decodificar } = decodificadorFalso([1_200_000])
    const { prontos, recusas } = await prepararFotosParaEnvio([arquivo('IMG_2.heic', '', 1_500_000)], decodificar)
    expect(recusas).toEqual([])
    expect(prontos.map((f) => [f.name, f.type])).toEqual([['IMG_2.jpg', 'image/jpeg']])
  })

  it('libera a imagem mesmo quando a codificação falha', async () => {
    const liberar = vi.fn()
    const decodificar: Decodificador = async () => ({
      largura: 10,
      altura: 10,
      liberar,
      codificarJpeg: async () => {
        throw new Error('canvas')
      },
    })
    const { prontos, recusas } = await prepararFotosParaEnvio([arquivo('a.png', 'image/png', 5_000_000)], decodificar)
    expect(prontos).toEqual([])
    expect(recusas).toEqual([mensagemFormato('a.png')])
    expect(liberar).toHaveBeenCalledTimes(1)
  })

  it('processa uma foto de cada vez e mantém a ordem de escolha', async () => {
    let abertas = 0
    let maximoAbertas = 0
    const decodificar: Decodificador = async (f) => {
      abertas += 1
      maximoAbertas = Math.max(maximoAbertas, abertas)
      await new Promise((r) => setTimeout(r, 5))
      return {
        largura: 10,
        altura: 10,
        liberar: () => {
          abertas -= 1
        },
        codificarJpeg: async () => new Blob([f.name]),
      }
    }
    const nomes = ['c.png', 'a.png', 'b.png']
    const { prontos } = await prepararFotosParaEnvio(
      nomes.map((n) => arquivo(n, 'image/png', 5_000_000)),
      decodificar,
    )
    expect(maximoAbertas).toBe(1)
    expect(prontos.map((f) => f.name)).toEqual(['c.jpg', 'a.jpg', 'b.jpg'])
  })
})
