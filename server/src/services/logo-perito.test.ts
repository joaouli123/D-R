import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'

// ============================================================
// A marca do cabecalho, agora white-label.
//
// A arte da D&R deixou de ser "a logo do sistema" e virou a logo de UM
// perito. Este teste cobre as duas metades da regra: a logo que o perito
// subiu tem de sair no documento COM A PROPORCAO DELA, e todo caminho de
// falha tem de cair na arte embutida em vez de derrubar a geracao — perder
// um laudo porque a imagem do cabecalho sumiu do volume seria pior do que
// sair com o cabecalho antigo.
// ============================================================

const raiz = path.join(os.tmpdir(), 'dr-logo-teste')

async function carregar(dir: string) {
  vi.resetModules()
  vi.doMock('../env.js', () => ({ env: { UPLOAD_DIR: dir, UPLOAD_MAX_MB: 15 } }))
  return import('./logo-oficial.js')
}

/** Grava no "volume" uma imagem de verdade, com as dimensoes pedidas. */
async function gravar(dir: string, nome: string, largura: number, altura: number) {
  await fs.mkdir(dir, { recursive: true })
  const png = await sharp({
    create: { width: largura, height: altura, channels: 4, background: { r: 0, g: 122, b: 61, alpha: 1 } },
  })
    .png()
    .toBuffer()
  await fs.writeFile(path.join(dir, nome), png)
  return png
}

afterEach(async () => {
  vi.doUnmock('../env.js')
  await fs.rm(raiz, { recursive: true, force: true })
})

describe('marca do documento', () => {
  it('sem perito, usa a arte embutida', async () => {
    const { marcaDoDocumento } = await carregar(path.join(raiz, 'vazio'))

    const marca = await marcaDoDocumento(null)

    expect(marca.padrao).toBe(true)
    expect(marca.tipo).toBe('png')
    expect(marca.dataUri.startsWith('data:image/png;base64,')).toBe(true)
    expect(marca.alt).toContain('D&R')
  })

  it('perito que ainda nao subiu logo tambem usa a arte embutida', async () => {
    const { marcaDoDocumento } = await carregar(path.join(raiz, 'sem-logo'))

    expect((await marcaDoDocumento({ nome: 'Dinoel', logoArquivo: null })).padrao).toBe(true)
    expect((await marcaDoDocumento({ nome: 'Dinoel', logoArquivo: '   ' })).padrao).toBe(true)
  })

  it('usa a logo que o perito subiu, embutida no proprio documento', async () => {
    const dir = path.join(raiz, 'com-logo')
    const png = await gravar(dir, 'minha.png', 800, 275)
    const { marcaDoDocumento } = await carregar(dir)

    const marca = await marcaDoDocumento({ nome: 'Dinoel Ribeiro', logoArquivo: 'minha.png' })

    expect(marca.padrao).toBe(false)
    expect(marca.tipo).toBe('png')
    expect(marca.dados.equals(png)).toBe(true)
    // Sem rede: o Chromium que gera o PDF recebe a imagem dentro do HTML.
    expect(marca.dataUri.startsWith('data:image/png;base64,')).toBe(true)
    expect(marca.alt).toBe('Logo de Dinoel Ribeiro')
  })

  it('cabe na caixa do cabecalho sem deformar', async () => {
    const dir = path.join(raiz, 'quadrada')
    await gravar(dir, 'quadrada.png', 400, 400)
    const { marcaDoDocumento } = await carregar(dir)

    const marca = await marcaDoDocumento({ nome: 'Perita', logoArquivo: 'quadrada.png' })

    // A caixa e 270x95: uma logo quadrada limita pela ALTURA e sai 95x95.
    // A versao anterior fixava 270x93 — a proporcao exata da arte da D&R —
    // e esticaria a marca de qualquer outro perito.
    expect(marca.altura).toBe(95)
    expect(marca.largura).toBe(95)
  })

  it('logo mais larga que a caixa encolhe pela largura', async () => {
    const dir = path.join(raiz, 'larga')
    await gravar(dir, 'larga.png', 1600, 200)
    const { marcaDoDocumento } = await carregar(dir)

    const marca = await marcaDoDocumento({ nome: 'Perito', logoArquivo: 'larga.png' })

    expect(marca.largura).toBe(270)
    expect(marca.altura).toBe(Math.round(200 * (270 / 1600)))
  })

  it('arquivo que sumiu do volume nao impede a geracao do laudo', async () => {
    const { marcaDoDocumento } = await carregar(path.join(raiz, 'volume-perdido'))

    // E o que acontece num deploy sem volume persistente: o cadastro aponta
    // para um arquivo que nao esta mais la.
    const marca = await marcaDoDocumento({ nome: 'Dinoel', logoArquivo: 'sumiu.png' })

    expect(marca.padrao).toBe(true)
    expect(marca.tipo).toBe('png')
  })

  it('formato que o Word nao embute cai na arte embutida', async () => {
    const dir = path.join(raiz, 'webp')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'marca.webp'), 'nao importa o conteudo')
    const { marcaDoDocumento } = await carregar(dir)

    // O Word so embute jpg/png/gif/bmp. Um WebP aceito aqui viraria um
    // cabecalho quebrado no .docx que o perito entrega no processo.
    expect((await marcaDoDocumento({ nome: 'X', logoArquivo: 'marca.webp' })).padrao).toBe(true)
  })

  it('arquivo vazio no volume tambem cai na arte embutida', async () => {
    const dir = path.join(raiz, 'zerado')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'vazia.png'), '')
    const { marcaDoDocumento } = await carregar(dir)

    expect((await marcaDoDocumento({ nome: 'X', logoArquivo: 'vazia.png' })).padrao).toBe(true)
  })

  it('perito sem nome ainda recebe um alt utilizavel', async () => {
    const dir = path.join(raiz, 'anonimo')
    await gravar(dir, 'anon.png', 300, 100)
    const { marcaDoDocumento } = await carregar(dir)

    const marca = await marcaDoDocumento({ nome: '  ', logoArquivo: 'anon.png' })

    expect(marca.alt).toBe('Logo do perito responsável')
  })
})
