/**
 * Trata os logos dos órgãos (CREA-SP, CONFEA, MTE) para o selo da tela de
 * entrada: tira o fundo branco do JPEG, recorta rente ao desenho e grava PNG
 * com transparência em src/assets/orgaos/.
 *
 * Os originais vieram como JPEG de baixa resolução com fundo branco — o
 * "branco" tem artefato de compressão, então o corte é por rampa de
 * luminância (não por cor exata), e um pixel quase branco vira
 * semitransparente em vez de sumir ou ficar como quadrado cinza.
 *
 * Rodar com: npx tsx scripts/tratar-logos-orgaos.ts
 */
import path from 'node:path'
import sharp from 'sharp'

const DOWNLOADS = 'C:/Users/Lenovo/Downloads'
const RAIZ = path.resolve(import.meta.dirname, '../..')
const DESTINO = path.join(RAIZ, 'src/assets/orgaos')

const LOGOS: { origem: string; nome: string; destinos?: string[] }[] = [
  { origem: 'WhatsApp Image 2026-09-18 at 11.50.06.jpeg', nome: 'crea-sp' },
  { origem: 'WhatsApp Image 2026-09-18 at 11.50.06 (1).jpeg', nome: 'confea' },
  { origem: 'WhatsApp Image 2026-09-18 at 11.50.06 (2).jpeg', nome: 'mte' },
  // A logo da D&R era JPEG, e JPEG não tem transparência: em cima do painel
  // azul do login saía um retângulo branco — o "cara de print" que o perito
  // apontou em 18/09. Vai para o front (tela) e para o server (fallback do
  // cabeçalho do PDF/DOCX), os dois lugares que a embutem.
  {
    origem: path.join(RAIZ, 'src/assets/logo-dr-oficial.jpeg'),
    nome: 'logo-dr-oficial',
    destinos: [path.join(RAIZ, 'src/assets'), path.join(RAIZ, 'server/assets')],
  },
]

/** Acima de CLARO é fundo (some); abaixo de ESCURO é desenho (fica). */
const CLARO = 246
const ESCURO = 226

async function tratar(origem: string, nome: string, destinos: string[]) {
  const caminho = path.isAbsolute(origem) ? origem : path.join(DOWNLOADS, origem)
  // Conversão é de uma vez só: o original sai do repositório depois que o
  // PNG entra (duas fontes de verdade é pedir bug). Sem o original, o PNG que
  // já existe é o produto final — não há o que refazer.
  const existe = await import('node:fs/promises').then((fs) => fs.access(caminho).then(() => true, () => false))
  if (!existe) {
    console.log(`${nome}.png: origem ausente (${path.basename(caminho)}), mantido o PNG atual`)
    return
  }
  const { data, info } = await sharp(caminho)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const total = width * height

  const lum = new Float32Array(total)
  for (let i = 0; i < total; i++) {
    const p = i * channels
    lum[i] = 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!
  }

  // Só o branco LIGADO À BORDA é fundo. O "MTE" e a faixa da bandeira são
  // brancos por dentro do logo: um corte por cor os apagaria junto com o
  // fundo, e o PNG só pareceria certo em cima de branco. O preenchimento
  // parte das quatro bordas e só atravessa pixel claro; o que fica cercado
  // por cor não é alcançado e permanece opaco.
  const fundo = new Uint8Array(total)
  const fila: number[] = []
  const marcar = (i: number) => {
    if (fundo[i] || lum[i]! < ESCURO) return
    fundo[i] = 1
    fila.push(i)
  }
  for (let x = 0; x < width; x++) {
    marcar(x)
    marcar((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    marcar(y * width)
    marcar(y * width + width - 1)
  }
  while (fila.length) {
    const i = fila.pop()!
    const x = i % width
    const y = (i - x) / width
    if (x > 0) marcar(i - 1)
    if (x < width - 1) marcar(i + 1)
    if (y > 0) marcar(i - width)
    if (y < height - 1) marcar(i + width)
  }

  const saida = Buffer.alloc(total * 4)
  for (let i = 0; i < total; i++) {
    const p = i * channels
    const l = lum[i]!
    // Rampa só na região de fundo: a borda do desenho fica suave, sem serrilha.
    const alfa = !fundo[i]
      ? 255
      : l >= CLARO ? 0 : l <= ESCURO ? 255 : Math.round(((CLARO - l) / (CLARO - ESCURO)) * 255)
    const o = i * 4
    saida[o] = data[p]!
    saida[o + 1] = data[p + 1]!
    saida[o + 2] = data[p + 2]!
    saida[o + 3] = alfa
  }

  const png = await sharp(saida, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 8 })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })

  const fs = await import('node:fs/promises')
  for (const pasta of destinos) {
    await fs.mkdir(pasta, { recursive: true })
    await fs.writeFile(path.join(pasta, `${nome}.png`), png.data)
  }
  console.log(
    `${nome}.png: ${png.info.width}x${png.info.height}, ${(png.data.length / 1024).toFixed(0)} kB` +
      ` → ${destinos.map((d) => path.relative(RAIZ, d)).join(', ')}`,
  )
}

for (const logo of LOGOS) await tratar(logo.origem, logo.nome, logo.destinos ?? [DESTINO])
