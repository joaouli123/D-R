// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'

import { bundleDoHtml, bundleEmUso, bundleNoServidor, versaoMudou } from './versaoApp'

const htmlPublicado = (bundle: string) => `<!doctype html><html><head>
<link rel="stylesheet" href="/assets/index-AbCd1234.css">
</head><body><div id="root"></div>
<script type="module" crossorigin src="${bundle}"></script>
</body></html>`

function documentoCom(...srcs: string[]): Document {
  const doc = document.implementation.createHTMLDocument('teste')
  for (const src of srcs) {
    const script = doc.createElement('script')
    script.setAttribute('src', src)
    doc.body.appendChild(script)
  }
  return doc
}

function respostaFake(corpo: string, ok = true) {
  return vi.fn(async () => ({ ok, text: async () => corpo }) as unknown as Response)
}

describe('bundleDoHtml', () => {
  it('acha o bundle de entrada no html publicado', () => {
    expect(bundleDoHtml(htmlPublicado('/assets/index-BKBiSBBC.js'))).toBe('/assets/index-BKBiSBBC.js')
  })

  it('devolve null quando não há bundle com hash', () => {
    expect(bundleDoHtml('<script type="module" src="/src/main.tsx"></script>')).toBeNull()
  })
})

describe('bundleEmUso', () => {
  it('lê o bundle que a aba carregou', () => {
    expect(bundleEmUso(documentoCom('/assets/index-BKBiSBBC.js'))).toBe('/assets/index-BKBiSBBC.js')
  })

  it('ignora scripts que não são o bundle', () => {
    expect(bundleEmUso(documentoCom('/analytics.js', '/assets/index-Zz99.js'))).toBe('/assets/index-Zz99.js')
  })

  it('em desenvolvimento não há o que comparar', () => {
    expect(bundleEmUso(documentoCom('/src/main.tsx'))).toBeNull()
  })
})

describe('versaoMudou', () => {
  it('avisa quando os nomes diferem', () => {
    expect(versaoMudou('/assets/index-A.js', '/assets/index-B.js')).toBe(true)
  })

  it('fica calado quando é o mesmo bundle', () => {
    expect(versaoMudou('/assets/index-A.js', '/assets/index-A.js')).toBe(false)
  })

  it('fica calado quando falta algum dos lados', () => {
    expect(versaoMudou(null, '/assets/index-B.js')).toBe(false)
    expect(versaoMudou('/assets/index-A.js', null)).toBe(false)
  })
})

describe('bundleNoServidor', () => {
  it('busca o index.html sem passar pelo cache', async () => {
    const buscar = respostaFake(htmlPublicado('/assets/index-Novo123.js'))

    await expect(bundleNoServidor(buscar as unknown as typeof fetch)).resolves.toBe('/assets/index-Novo123.js')
    expect(buscar).toHaveBeenCalledWith('/', { cache: 'no-store' })
  })

  it('devolve null quando a resposta não vem ok', async () => {
    const buscar = respostaFake('erro', false)
    await expect(bundleNoServidor(buscar as unknown as typeof fetch)).resolves.toBeNull()
  })

  it('devolve null quando a rede falha, em vez de estourar', async () => {
    const buscar = vi.fn(async () => {
      throw new Error('offline')
    })
    await expect(bundleNoServidor(buscar as unknown as typeof fetch)).resolves.toBeNull()
  })
})
