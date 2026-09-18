import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

// env.js chama process.exit(1) sem DATABASE_URL; o ErroHttp vem de erros.ts,
// que importa o env.
vi.mock('../env.js', () => ({ env: { UPLOAD_DIR: 'uploads-teste', UPLOAD_MAX_MB: 15, ehProducao: true } }))

// O "volume" do teste: um PNG largo com o nome certo, nada com os outros.
vi.mock('./armazenamento.js', async () => {
  const { default: sharpNoMock } = await import('sharp')
  const png = await sharpNoMock({
    create: { width: 900, height: 300, channels: 4, background: { r: 20, g: 30, b: 90, alpha: 1 } },
  }).png().toBuffer()
  return {
    lerUpload: async (arquivo: string) => {
      if (arquivo === 'assinatura.png') return png
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    },
  }
})

const { assinaturaDoDocumento, processarAssinatura } = await import('./assinatura-perito.js')

// ============================================================
// A foto da assinatura em papel vira um PNG só com o traço.
//
// O perito fotografa com o celular: o papel não é branco puro, tem sombra
// de um lado, e a assinatura ocupa uma parte pequena da foto. O que entra no
// documento tem de ser só a tinta, com fundo transparente e recortada rente —
// senão a linha de assinatura ganha um retângulo cinza em volta.
// ============================================================

/** Folha fotografada: papel amarelado, sombra num canto, traço de caneta azul. */
async function fotoDeAssinatura(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs>
      <linearGradient id="luz" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f4f1ea"/>
        <stop offset="1" stop-color="#c9c3b6"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#luz)"/>
    <path d="M300 450 C 380 300, 450 600, 520 420 S 700 350, 780 470 S 900 380, 940 430"
      stroke="#1d2a6b" stroke-width="9" fill="none" stroke-linecap="round"/>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
}

describe('processarAssinatura', () => {
  it('devolve só o traço, recortado rente e com fundo transparente', async () => {
    const png = await processarAssinatura(await fotoDeAssinatura())
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })

    expect(info.channels).toBe(4)
    // Recortado: o traço ocupa ~650x240 da foto de 1200x800.
    expect(info.width).toBeGreaterThan(600)
    expect(info.width).toBeLessThan(800)
    expect(info.height).toBeLessThan(360)

    const alfa = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]!
    // Os cantos são papel: transparentes, inclusive o da sombra.
    expect(alfa(0, 0)).toBe(0)
    expect(alfa(info.width - 1, info.height - 1)).toBe(0)

    let tinta = 0
    let visivel = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! > 200) tinta++
      if (data[i]! > 0) visivel++
    }
    expect(tinta).toBeGreaterThan(1000)
    // Nada de véu cinza sobre o papel: só o traço e a borda dele aparecem.
    expect(visivel / (info.width * info.height)).toBeLessThan(0.25)
  })

  it('recusa com 422 uma foto sem assinatura', async () => {
    const branca = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#f2efe8' },
    }).jpeg().toBuffer()

    await expect(processarAssinatura(branca)).rejects.toMatchObject({ status: 422 })
  })

  it('recusa com 415 um arquivo que não abre como imagem', async () => {
    await expect(processarAssinatura(Buffer.from('não sou uma imagem'))).rejects.toMatchObject({ status: 415 })
  })
})

describe('assinaturaDoDocumento', () => {
  it('encaixa a assinatura na caixa do documento, sem distorcer', async () => {
    const assinatura = await assinaturaDoDocumento({ assinaturaArquivo: 'assinatura.png' })

    expect(assinatura).not.toBeNull()
    expect(assinatura!.dataUri.startsWith('data:image/png;base64,')).toBe(true)
    // 900x300 na caixa de 220x64: quem limita é a altura.
    expect(assinatura!.altura).toBe(64)
    expect(assinatura!.largura).toBe(192)
  })

  it('devolve null sem assinatura cadastrada ou com o arquivo sumido', async () => {
    expect(await assinaturaDoDocumento(null)).toBeNull()
    expect(await assinaturaDoDocumento({ assinaturaArquivo: null })).toBeNull()
    expect(await assinaturaDoDocumento({ assinaturaArquivo: 'foto.jpg' })).toBeNull()
    expect(await assinaturaDoDocumento({ assinaturaArquivo: 'apagada.png' })).toBeNull()
  })
})
