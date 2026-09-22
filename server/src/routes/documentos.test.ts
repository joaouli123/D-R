import type { AddressInfo } from 'node:net'
import express from 'express'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Roda a rota REAL de documentos (Express de verdade) contra um "banco" em
// memória que respeita o `where` — o que importa aqui é o isolamento por
// licença e o fato de a exclusão sumir com o documento da listagem.

type Doc = { id: string; licencaId: string; titulo: string; anexoExternoArquivo: string | null; atualizadoEm: Date }
const banco = vi.hoisted(() => ({ docs: [] as Doc[] }))

const casa = (d: Doc, where: Partial<Doc>) =>
  Object.entries(where).every(([k, v]) => (d as Record<string, unknown>)[k] === v)

vi.mock('../env.js', () => ({ env: { JWT_SECRET: 'x'.repeat(40), ehProducao: false } }))
vi.mock('../prisma.js', () => ({
  prisma: {
    documentoGerado: {
      findMany: async ({ where }: { where: Partial<Doc> }) => banco.docs.filter((d) => casa(d, where)),
      findFirst: async ({ where }: { where: Partial<Doc> }) => banco.docs.find((d) => casa(d, where)) ?? null,
      delete: async ({ where }: { where: { id: string } }) => {
        banco.docs = banco.docs.filter((d) => d.id !== where.id)
      },
    },
  },
}))
vi.mock('../mappers.js', () => ({ documentoParaApi: (d: Doc) => ({ id: d.id, titulo: d.titulo }) }))
vi.mock('../services/armazenamento.js', () => ({ apagarUpload: async () => undefined, lerUpload: async () => Buffer.alloc(0), uploadPdf: { single: () => (_q: unknown, _r: unknown, n: () => void) => n() } }))
vi.mock('../services/documento-html.js', () => ({ montarHtml: async () => '' }))
vi.mock('../services/docx.js', () => ({ gerarDocx: async () => Buffer.alloc(0) }))
vi.mock('../services/email.js', () => ({ enviarDocumento: async () => undefined }))
vi.mock('../services/pdf.js', () => ({ concatenarPdf: async () => ({ pdf: Buffer.alloc(0) }), gerarPdf: async () => Buffer.alloc(0) }))
// A sessão vem do cabeçalho `x-licenca`: o que se testa é a rota, não o JWT.
vi.mock('../auth.js', () => ({
  exigirSessao: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.usuario = { id: 'u', email: 'u@x', perfil: 'admin', organizacaoId: 'equipe', licencaId: String(req.headers['x-licenca']) } as never
    next()
  },
  sessaoDe: (req: express.Request) => req.usuario,
}))

const { documentosRouter } = await import('./documentos.js')
const { tratarErros } = await import('../erros.js')

const app = express()
app.use(express.json())
app.use('/documentos', documentosRouter)
app.use(tratarErros)
const servidor = app.listen(0)
afterAll(() => new Promise((ok) => servidor.close(ok)))

const chamar = (metodo: string, caminho: string, licenca: string) =>
  fetch(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}${caminho}`, {
    method: metodo,
    headers: { 'x-licenca': licenca },
  })

beforeEach(() => {
  banco.docs = [
    { id: 'd-a1', licencaId: 'licenca-a', titulo: 'Laudo A1', anexoExternoArquivo: null, atualizadoEm: new Date() },
    { id: 'd-a2', licencaId: 'licenca-a', titulo: 'Parecer A2', anexoExternoArquivo: 'anexo.pdf', atualizadoEm: new Date() },
    { id: 'd-b1', licencaId: 'licenca-b', titulo: 'Laudo B1', anexoExternoArquivo: null, atualizadoEm: new Date() },
  ]
})

describe('rota de documentos — exclusão e isolamento por licença', () => {
  it('a licença só lista os próprios documentos', async () => {
    const lista = (await (await chamar('GET', '/documentos', 'licenca-a')).json()) as { id: string }[]
    expect(lista.map((d) => d.id).sort()).toEqual(['d-a1', 'd-a2'])
  })

  it.each(['d-a1', 'd-a2'])('excluir %s responde 204 e o documento some do histórico', async (id) => {
    expect((await chamar('DELETE', `/documentos/${id}`, 'licenca-a')).status).toBe(204)

    const lista = (await (await chamar('GET', '/documentos', 'licenca-a')).json()) as { id: string }[]
    expect(lista.map((d) => d.id)).not.toContain(id)
    expect(banco.docs.some((d) => d.id === id)).toBe(false)
  })

  it('outra licença não exclui nem enxerga o documento: 404, e ele continua no lugar', async () => {
    expect((await chamar('DELETE', '/documentos/d-a1', 'licenca-b')).status).toBe(404)
    expect((await chamar('GET', '/documentos/d-a1', 'licenca-b')).status).toBe(404)
    expect(banco.docs.some((d) => d.id === 'd-a1')).toBe(true)
  })
})
