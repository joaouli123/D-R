import type { DocumentoGerado, Usuario } from '@prisma/client'
import JSZip from 'jszip'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

import { empresa, periciaDeTeste, perito } from './parecer.fixture.js'

// ============================================================
// White-label ponta a ponta: a logo que o perito subiu tem de sair NOS DOIS
// renderizadores do servidor. A pre-visualizacao usa o mesmo criterio pelo
// componente Logo do front — ver src/components/Logo.test.tsx.
//
// O `lerUpload` daqui devolve um PNG de verdade, ao contrario dos outros
// testes de documento, que devolvem buffer vazio e por isso continuam
// exercitando o fallback da arte embutida.
// ============================================================

const PNG = await sharp({
  create: { width: 800, height: 275, channels: 4, background: { r: 0, g: 122, b: 61, alpha: 1 } },
})
  .png()
  .toBuffer()

vi.mock('./armazenamento.js', () => ({
  comoDataUri: async () => null,
  lerUpload: async () => PNG,
}))

const { htmlDoParecer } = await import('./documento-html.js')
const { gerarDocx } = await import('./docx.js')

const comLogo = { ...perito, logoArquivo: 'minha-marca.png' } as Usuario

const documento = {
  id: 'doc-1',
  tipo: 'parecer',
  titulo: 'Parecer Técnico da Reclamada — Insalubridade',
  periciaId: 'per-1',
} as DocumentoGerado

describe('logo do perito no documento', () => {
  it('o HTML do PDF embute a marca do perito, nao a do sistema', async () => {
    const html = await htmlDoParecer(periciaDeTeste(), [empresa], comLogo, 'Parecer')

    expect(html).toContain(`<img class="logo-oficial" src="data:image/png;base64,${PNG.toString('base64')}"`)
    expect(html).toContain('alt="Logo de Dinoel Ribeiro da Silva"')
    // A arte embutida e JPEG: se ela vazasse, apareceria aqui.
    expect(html).not.toContain('src="data:image/jpeg;base64,')
  })

  it('o perito sem logo continua com a arte embutida do sistema', async () => {
    const html = await htmlDoParecer(periciaDeTeste(), [empresa], perito, 'Parecer')

    expect(html).toContain('<img class="logo-oficial" src="data:image/jpeg;base64,')
    expect(html).toContain('D&amp;R Perícia Trabalhista')
  })

  it('o DOCX embute o arquivo da logo, e nao um link para ele', async () => {
    const zip = await JSZip.loadAsync(await gerarDocx(documento, periciaDeTeste(), [empresa], comLogo))
    const midias = Object.keys(zip.files).filter(
      (n) => n.startsWith('word/media/') && !zip.files[n]?.dir,
    )

    // O Word abre o .docx sozinho, sem rede: a imagem tem de estar dentro
    // do pacote. Um `type` errado no ImageRun produziria um cabecalho
    // quebrado que so aparece quando o cliente abre o arquivo.
    expect(midias.some((n) => n.endsWith('.png'))).toBe(true)
    const conteudos = await Promise.all(
      midias.map((n) => zip.file(n)!.async('nodebuffer')),
    )
    expect(conteudos.some((b) => b.equals(PNG))).toBe(true)
  })
})
