/**
 * Mede quanto tempo `processarAssinatura` leva numa foto de folha INTEIRA,
 * que é o cenário do perito: ele assina no meio de uma A4 e fotografa a folha
 * toda, de longe. Rodar com: npx tsx scripts/medir-assinatura.ts
 */
import sharp from 'sharp'
import { processarAssinatura } from '../src/services/assinatura-perito.js'

/** Uma "folha fotografada": papel quase branco, com um rabisco pequeno no meio. */
async function folhaFotografada(largura: number, altura: number): Promise<Buffer> {
  const traco = Math.round(Math.min(largura, altura) * 0.08)
  const risco = await sharp({
    create: { width: traco * 4, height: traco, channels: 3, background: '#ffffff' },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${traco * 4}" height="${traco}">
             <path d="M5,${traco * 0.7} C${traco},5 ${traco * 2},${traco * 0.9} ${traco * 4 - 5},${traco * 0.3}"
                   stroke="#1a1a3a" stroke-width="${Math.max(2, traco * 0.06)}" fill="none"/>
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer()

  return sharp({
    create: { width: largura, height: altura, channels: 3, background: '#f2f0ea' },
  })
    .composite([{ input: risco, top: Math.round(altura / 2), left: Math.round(largura / 3) }])
    .jpeg({ quality: 85 })
    .toBuffer()
}

for (const [rotulo, w, h] of [
  ['celular 12 MP (4032x3024)', 4032, 3024],
  ['celular 48 MP (8000x6000)', 8000, 6000],
] as const) {
  const foto = await folhaFotografada(w, h)
  const inicio = Date.now()
  try {
    const png = await processarAssinatura(foto)
    console.log(
      `${rotulo}: entrada ${(foto.length / 1024 / 1024).toFixed(1)} MB → ` +
        `saída ${(png.length / 1024).toFixed(0)} kB em ${((Date.now() - inicio) / 1000).toFixed(1)}s`,
    )
  } catch (e) {
    console.log(
      `${rotulo}: FALHOU em ${((Date.now() - inicio) / 1000).toFixed(1)}s — ` +
        (e instanceof Error ? e.message : String(e)),
    )
  }
}
