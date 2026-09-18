// ============================================================
// Assinatura manuscrita do perito.
//
// O perito assina numa folha branca, fotografa e envia em Configurações ›
// Meu perfil. A foto nunca é usada como veio: papel amarelado, sombra da
// mão, a mesa em volta. Daqui sai um PNG só com o traço — fundo
// transparente, recortado rente à assinatura e num tamanho que o documento
// encaixa sobre a linha de assinatura.
// ============================================================

/** Lado maior, em pixels, da foto que entra no tratamento. */
const LADO_DE_TRABALHO = 1600

/** O PNG final cabe nesta caixa: nítido na impressão e leve no DOCX. */
const CAIXA_FINAL = { largura: 900, altura: 360 }

/**
 * Tamanho de cada célula do mapa de fundo, como fração do lado maior.
 *
 * O fundo não é uma cor só: a foto tem sombra, vinheta e luz de um lado.
 * Cada célula mede o próprio "branco do papel" e o traço é o que fica bem
 * mais escuro que o papel AO REDOR — não mais escuro que um branco fixo.
 */
const CELULAS_POR_LADO = 40

/**
 * Luminância relativa ao papel. Acima de CLARO é papel (transparente);
 * abaixo de ESCURO é tinta cheia; no meio, a borda do traço, semitransparente.
 */
const CLARO = 0.86
const ESCURO = 0.55

/** Alfa a partir do qual um pixel conta como traço para o recorte. */
const ALFA_DO_TRACO = 96

/** Escurece a cor da tinta (caneta azul fotografada sai lavada). */
const GAMA_DA_TINTA = 1.5

function limitar(valor: number, minimo: number, maximo: number): number {
  return valor < minimo ? minimo : valor > maximo ? maximo : valor
}

/**
 * O "branco do papel" de cada célula: o percentil 90 da luminância. A tinta
 * ocupa pouco de cada célula, então o percentil alto ignora o traço e fica
 * com o papel — uma média puxaria o fundo para baixo justo onde há escrita.
 */
function mapaDoFundo(lum: Float32Array, largura: number, altura: number, celula: number) {
  const colunas = Math.ceil(largura / celula)
  const linhas = Math.ceil(altura / celula)
  const fundo = new Float32Array(colunas * linhas)
  const histograma = new Uint32Array(256)

  for (let cy = 0; cy < linhas; cy++) {
    for (let cx = 0; cx < colunas; cx++) {
      histograma.fill(0)
      const x0 = cx * celula
      const y0 = cy * celula
      const x1 = Math.min(largura, x0 + celula)
      const y1 = Math.min(altura, y0 + celula)
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) histograma[Math.round(lum[y * largura + x] ?? 0)]!++
      }
      const total = (x1 - x0) * (y1 - y0)
      let acumulado = 0
      let valor = 255
      for (let nivel = 0; nivel < 256; nivel++) {
        acumulado += histograma[nivel]!
        if (acumulado >= total * 0.9) {
          valor = nivel
          break
        }
      }
      fundo[cy * colunas + cx] = valor
    }
  }

  // Suaviza 3x3: tira o degrau entre células vizinhas.
  const suave = new Float32Array(fundo.length)
  for (let cy = 0; cy < linhas; cy++) {
    for (let cx = 0; cx < colunas; cx++) {
      let soma = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx
          const y = cy + dy
          if (x < 0 || y < 0 || x >= colunas || y >= linhas) continue
          soma += fundo[y * colunas + x]!
          n++
        }
      }
      suave[cy * colunas + cx] = soma / n
    }
  }

  /** Fundo no pixel (x, y), interpolado entre os centros das células. */
  return (x: number, y: number): number => {
    const gx = limitar((x + 0.5) / celula - 0.5, 0, colunas - 1)
    const gy = limitar((y + 0.5) / celula - 0.5, 0, linhas - 1)
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const x1 = Math.min(colunas - 1, x0 + 1)
    const y1 = Math.min(linhas - 1, y0 + 1)
    const fx = gx - x0
    const fy = gy - y0
    const topo = suave[y0 * colunas + x0]! * (1 - fx) + suave[y0 * colunas + x1]! * fx
    const base = suave[y1 * colunas + x0]! * (1 - fx) + suave[y1 * colunas + x1]! * fx
    return topo * (1 - fy) + base * fy
  }
}

/** Retângulo que contém o traço, ignorando sujeira isolada do papel. */
async function recorteDoTraco(
  alfa: Uint8Array,
  largura: number,
  altura: number,
): Promise<{ left: number; top: number; width: number; height: number } | null> {
  const sharp = (await import('sharp')).default
  const mascara = Buffer.alloc(largura * altura)
  for (let i = 0; i < mascara.length; i++) mascara[i] = (alfa[i] ?? 0) >= ALFA_DO_TRACO ? 255 : 0

  const caixa = (pixels: Uint8Array | Buffer) => {
    let x0 = largura
    let y0 = altura
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        if ((pixels[y * largura + x] ?? 0) < 128) continue
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 }
  }

  // Mediana: um ponto de poeira some, o traço (mais grosso que a janela) fica.
  // Foto pequena tem traço fino, então a janela encolhe junto.
  const janela = Math.max(largura, altura) >= 1000 ? 5 : 3
  const limpa = await sharp(mascara, { raw: { width: largura, height: altura, channels: 1 } })
    .median(janela)
    .raw()
    .toBuffer()
  const achado = caixa(limpa) ?? caixa(mascara)
  if (!achado) return null

  // Folga em volta: a mediana come a ponta fina de uma letra, e a folga a devolve.
  const folga = Math.round(Math.max(largura, altura) * 0.015) + 2
  const left = Math.max(0, achado.x0 - folga)
  const top = Math.max(0, achado.y0 - folga)
  const right = Math.min(largura - 1, achado.x1 + folga)
  const bottom = Math.min(altura - 1, achado.y1 + folga)
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

/**
 * Transforma a foto de uma assinatura em papel num PNG pronto para o
 * documento: só o traço, fundo transparente, recortado rente.
 *
 * Lança ErroHttp 422 quando não há traço nenhum na imagem (foto em branco,
 * escura demais ou fora de foco) e 415 quando o arquivo não abre como imagem.
 */
export async function processarAssinatura(entrada: Buffer): Promise<Buffer> {
  // Dinâmicos: erros.ts lê o env e derrubaria o teste de documento, que
  // importa este módulo só por causa de assinaturaDoDocumento.
  const { ErroHttp } = await import('../erros.js')
  const sharp = (await import('sharp')).default

  let bruto: { data: Buffer; info: { width: number; height: number; channels: number } }
  try {
    bruto = await sharp(entrada, { failOn: 'none' })
      .rotate() // orientação do EXIF: foto de celular deitada fica em pé
      .resize({ width: LADO_DE_TRABALHO, height: LADO_DE_TRABALHO, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
  } catch {
    throw new ErroHttp(415, 'Não foi possível abrir a imagem da assinatura. Envie uma foto em JPEG ou PNG.')
  }

  const { data, info } = bruto
  const { width: largura, height: altura, channels: canais } = info
  const total = largura * altura

  const lum = new Float32Array(total)
  for (let i = 0; i < total; i++) {
    const p = i * canais
    lum[i] = 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!
  }

  const celula = Math.max(8, Math.round(Math.max(largura, altura) / CELULAS_POR_LADO))
  const fundoEm = mapaDoFundo(lum, largura, altura, celula)

  const rgba = Buffer.alloc(total * 4)
  const alfa = new Uint8Array(total)
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x
      const fundo = Math.max(24, fundoEm(x, y))
      const relativo = lum[i]! / fundo
      const a = Math.round(limitar((CLARO - relativo) / (CLARO - ESCURO), 0, 1) * 255)
      alfa[i] = a
      const p = i * canais
      const o = i * 4
      // A cor da tinta como seria sobre papel branco, um pouco mais carregada.
      for (let c = 0; c < 3; c++) {
        const proporcao = limitar(data[p + c]! / fundo, 0, 1)
        rgba[o + c] = Math.round(255 * Math.pow(proporcao, GAMA_DA_TINTA))
      }
      rgba[o + 3] = a
    }
  }

  const recorte = await recorteDoTraco(alfa, largura, altura)
  if (!recorte) {
    throw new ErroHttp(
      422,
      'Não encontramos a assinatura na imagem. Assine com caneta escura numa folha branca, fotografe de perto e com boa luz, e envie de novo.',
    )
  }

  return sharp(rgba, { raw: { width: largura, height: altura, channels: 4 } })
    .extract(recorte)
    .resize({ width: CAIXA_FINAL.largura, height: CAIXA_FINAL.altura, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// ---------------- leitura para os documentos ----------------

/**
 * Caixa da assinatura no DOCX, em pixels a 96 dpi (a unidade do ImageRun) —
 * a mesma caixa máxima do `.assinatura-imagem` no PDF.
 */
const CAIXA_DOCX = { largura: 220, altura: 64 }

export interface AssinaturaDoDocumento {
  /** Bytes do PNG — o DOCX embute o arquivo, não um link. */
  dados: Buffer
  /** `data:` URI para o HTML que o Chromium transforma em PDF (sem rede). */
  dataUri: string
  /** Dimensão já encaixada na caixa do DOCX, preservando a proporção. */
  largura: number
  altura: number
}

/**
 * A assinatura deste perito, pronta para o PDF e o DOCX — ou null.
 *
 * Nunca lança: sem assinatura cadastrada, ou com o arquivo sumido do volume,
 * o documento sai como sempre saiu, com a linha em branco para assinar à mão.
 */
export async function assinaturaDoDocumento(
  perito?: { assinaturaArquivo?: string | null } | null,
): Promise<AssinaturaDoDocumento | null> {
  const arquivo = perito?.assinaturaArquivo?.trim()
  if (!arquivo || !arquivo.toLowerCase().endsWith('.png')) return null

  try {
    // Imports dinâmicos: armazenamento.ts lê o env (e o teste não tem banco),
    // e o sharp carrega binário nativo — só vale pagar quando há assinatura.
    const { lerUpload } = await import('./armazenamento.js')
    const dados = await lerUpload(arquivo)
    if (!dados.length) return null
    const sharp = (await import('sharp')).default
    const meta = await sharp(dados).metadata()
    if (!meta.width || !meta.height) return null
    const escala = Math.min(CAIXA_DOCX.largura / meta.width, CAIXA_DOCX.altura / meta.height)
    return {
      dados,
      dataUri: `data:image/png;base64,${dados.toString('base64')}`,
      largura: Math.max(1, Math.round(meta.width * escala)),
      altura: Math.max(1, Math.round(meta.height * escala)),
    }
  } catch {
    return null
  }
}
