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

const RODAPE = `
  <div style="width:100%;font-family:Arial,sans-serif;font-size:8pt;color:#656155;padding:0 2cm;
              display:flex;justify-content:space-between;align-items:center;">
    <span>D&amp;R Perícia — Plataforma Inteligente de Perícia Trabalhista</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`

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

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: RODAPE,
      margin: { top: '2.5cm', right: '2cm', bottom: '2cm', left: '3cm' },
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
