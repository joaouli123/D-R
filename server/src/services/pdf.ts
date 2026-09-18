import { PDFDocument } from 'pdf-lib'
import puppeteer, { type Browser } from 'puppeteer'
import { env } from '../env.js'
import { ErroHttp } from '../erros.js'

// ============================================================
// MÓDULO H — Motor de PDF.
//
// Um único Chromium é reaproveitado entre requisições: subir um
// processo por laudo custaria ~1s a mais em cada geração.
// ============================================================

let browserPromise: Promise<Browser> | null = null

async function obterBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          // O /dev/shm padrão do Docker (64MB) estoura em documentos
          // com muitas fotos.
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
        ],
      })
      .catch((e) => {
        browserPromise = null
        throw e
      })

    const browser = await browserPromise
    browser.once('disconnected', () => {
      browserPromise = null
    })
  }
  return browserPromise
}

export async function encerrarBrowser(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise.catch(() => null)
  browserPromise = null
  await browser?.close().catch(() => undefined)
}

// O rodapé ocupa a largura da folha; o recuo o alinha às margens do texto.
const RODAPE = `
  <div style="width:100%;font-family:Arial,sans-serif;font-size:8pt;color:#656155;padding:0 2cm 0 3cm;
              display:flex;justify-content:space-between;align-items:center;">
    <span>© D&amp;R Perícia Trabalhista — Propriedade intelectual exclusiva e protegida.</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`

/**
 * Área útil da folha A4 com as margens da ABNT, em pixels CSS (96 dpi):
 * 297 − 3 (topo) − 2 (rodapé) = 247 mm. É o teto que a folha de rosto tem
 * para caber inteira numa página.
 */
const ALTURA_UTIL_A4_PX = (247 / 25.4) * 96

/** Largura útil: 210 − 3 (esquerda) − 2 (direita) = 160 mm. */
const LARGURA_UTIL_A4_PX = (160 / 25.4) * 96

/**
 * O que o callback de `page.evaluate` usa do DOM. O tsconfig do servidor
 * não carrega a lib `dom` de propósito (é Node); este é o recorte mínimo
 * para o callback continuar tipado sem trazer o DOM inteiro.
 */
declare const document: {
  querySelector(seletor: string): { scrollHeight: number; classList: { add(classe: string): void } } | null
}

/**
 * Renderiza o HTML do documento em PDF A4.
 *
 * A rede fica bloqueada dentro da página: todo recurso já vem
 * embutido (as fotos viram data URI), e um documento nunca deve
 * disparar requisição externa a partir do servidor.
 */
export async function gerarPdf(html: string): Promise<Buffer> {
  const browser = await obterBrowser()
  const page = await browser.newPage()

  try {
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const url = req.url()
      if (url.startsWith('data:') || url.startsWith('about:')) {
        void req.continue()
      } else {
        void req.abort()
      }
    })

    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })

    // A folha de rosto força quebra de página depois dela. Quando ela não
    // cabe numa folha (dez reclamadas de razão social comprida e uma
    // apresentação de três parágrafos, 18/09), essa quebra forçada punha o
    // item 1 na folha 3 depois de uma folha 2 com meia dúzia de linhas — a
    // folha fantasma. Só o Chromium sabe se coube, então a decisão é tomada
    // aqui, pela altura real do layout de impressão, e não por contagem de
    // texto: se a capa passa da área útil, ela perde a quebra forçada e o
    // item 1 segue no fluxo, logo depois da apresentação.
    //
    // `evaluate` roda pelo CDP, fora do sandbox da página: continua
    // funcionando com o JavaScript da página desligado acima.
    //
    // A largura importa tanto quanto a altura: o viewport padrão do Puppeteer
    // tem 800px, mas a área útil da A4 tem 160mm (≈605px). Em 800px o texto
    // quebra menos, a capa mede mais baixa e um caso limítrofe "cabe" na
    // medição e estoura na impressão — foi o que aconteceu com oito
    // reclamadas. A medição só vale na largura em que o Chromium vai imprimir.
    await page.setViewport({ width: Math.round(LARGURA_UTIL_A4_PX), height: Math.round(ALTURA_UTIL_A4_PX) })
    await page.emulateMediaType('print')
    await page.evaluate((alturaUtilPx) => {
      const capa = document.querySelector('.capa')
      if (capa && capa.scrollHeight > alturaUtilPx) capa.classList.add('capa--longa')
    }, ALTURA_UTIL_A4_PX)

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: RODAPE,
      // Margens da ABNT (NBR 14724), as mesmas do @page de documento-html.ts.
      margin: { top: '3cm', right: '2cm', bottom: '2cm', left: '3cm' },
      timeout: 60_000,
    })

    return Buffer.from(pdf)
  } finally {
    await page.close().catch(() => undefined)
  }
}

/**
 * Módulo H — anexa o PDF externo (dosimetria, ART, FISPQ) ao final
 * do documento gerado. Um anexo corrompido não derruba a geração:
 * o documento sai sem ele e o chamador é avisado.
 */
export async function concatenarPdf(
  principal: Buffer,
  anexo: Buffer,
): Promise<{ pdf: Buffer; anexado: boolean; aviso?: string }> {
  try {
    const destino = await PDFDocument.load(principal)
    const origem = await PDFDocument.load(anexo, { ignoreEncryption: true })

    const paginas = await destino.copyPages(origem, origem.getPageIndices())
    paginas.forEach((p) => destino.addPage(p))

    return { pdf: Buffer.from(await destino.save()), anexado: true }
  } catch (e) {
    return {
      pdf: principal,
      anexado: false,
      aviso: `O anexo externo não pôde ser incorporado (${
        e instanceof Error ? e.message : 'arquivo inválido'
      }). O documento foi gerado sem ele.`,
    }
  }
}

/** Falha cedo se o Chromium não estiver disponível no ambiente. */
export async function verificarPdf(): Promise<void> {
  try {
    await obterBrowser()
  } catch (e) {
    throw new ErroHttp(
      503,
      'Motor de PDF indisponível — o Chromium não pôde ser iniciado. ' +
        (e instanceof Error ? e.message : ''),
    )
  }
}
