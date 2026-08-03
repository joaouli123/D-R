// Renderiza os HTMLs produzidos por `npm run smoke` em PNG, para
// conferência visual do layout e da identidade da marca.
//
//   SAIDA_TESTE=./saida-teste ALVOS=parecer,impugnacao npm run capturar
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const dir = process.env.SAIDA_TESTE ?? './saida-teste'
const alvos = process.env.ALVOS?.split(',') ?? ['parecer']

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

for (const alvo of alvos) {
  const html = await fs.readFile(path.join(dir, `${alvo}.html`), 'utf8')
  const page = await browser.newPage()
  // Largura de uma folha A4 a 96dpi, já descontadas as margens.
  await page.setViewport({ width: 794, height: 1400, deviceScaleFactor: 1.4 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.screenshot({ path: path.join(dir, `${alvo}.png`) as `${string}.png`, fullPage: true })
  await page.close()
  console.log(`${alvo}.png`)
}

await browser.close()
