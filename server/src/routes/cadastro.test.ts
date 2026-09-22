import type { AddressInfo } from 'node:net'
import express from 'express'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// O cadastro público: cria a licença AGUARDANDO aprovação, avisa o titular sem
// travar se o e-mail falhar, ignora robô e segura quem insiste demais.

const { criarLicenca, enviarDocumento } = vi.hoisted(() => ({
  criarLicenca: vi.fn(),
  enviarDocumento: vi.fn(),
}))

vi.mock('../env.js', () => ({ env: { JWT_SECRET: 'x'.repeat(40), ehProducao: false } }))
vi.mock('../prisma.js', () => ({
  prisma: { usuario: { findMany: async () => [{ email: 'dinoel@dr.test' }] } },
}))
vi.mock('../services/email.js', () => ({ emailDisponivel: () => true, enviarDocumento }))
// O corpo aceito é o mesmo da "Nova licença"; aqui basta a regra da senha.
vi.mock('./licencas.js', async () => {
  const { z } = await import('zod')
  return {
    criarLicenca,
    corpoDeCriacao: z.object({
      nome: z.string(),
      documento: z.string().optional(),
      admin: z.object({ nome: z.string(), email: z.string().email(), senha: z.string().min(8) }),
    }),
  }
})

const { criarCadastroRouter } = await import('./cadastro.js')
const { tratarErros } = await import('../erros.js')

const app = express()
app.use(express.json())
app.use('/cadastro', criarCadastroRouter())
app.use(tratarErros)
const servidor = app.listen(0)
afterAll(() => new Promise((ok) => servidor.close(ok)))

async function enviar(corpo: unknown) {
  const r = await fetch(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}/cadastro`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  return { status: r.status, corpo: await r.json() }
}

const pedido = {
  nome: 'Laboratório Alfa',
  documento: '12.345.678/0001-95',
  admin: { nome: 'Ana Alfa', email: 'ana@alfa.test', senha: 'senha-forte-1' },
}

beforeEach(() => {
  criarLicenca.mockReset().mockResolvedValue({ id: 'lic-1', nome: 'Laboratório Alfa', documento: '12.345.678/0001-95' })
  enviarDocumento.mockReset().mockResolvedValue({})
})

describe('cadastro público', () => {
  it('cria a licença aguardando aprovação e avisa o titular', async () => {
    const r = await enviar(pedido)
    expect(r.status).toBe(201)
    expect(r.corpo).toEqual({ aguardandoAprovacao: true })
    expect(criarLicenca).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Laboratório Alfa' }), { aguardando: true })
    expect(enviarDocumento.mock.calls[0]?.[0]).toMatchObject({ para: ['dinoel@dr.test'] })
  })

  it('e-mail fora do ar não derruba o cadastro', async () => {
    enviarDocumento.mockRejectedValue(new Error('smtp'))
    expect((await enviar(pedido)).status).toBe(201)
  })

  it('senha curta é recusada', async () => {
    const r = await enviar({ ...pedido, admin: { ...pedido.admin, senha: '123' } })
    expect(r.status).toBe(422)
    expect(criarLicenca).not.toHaveBeenCalled()
  })

  it('robô que preenche a armadilha não grava nada', async () => {
    expect((await enviar({ ...pedido, site: 'http://spam' })).status).toBe(201)
    expect(criarLicenca).not.toHaveBeenCalled()
  })

  it('mais de 5 pedidos por hora do mesmo IP levam 429', async () => {
    // Os testes acima já gastaram 4 dos 5.
    expect((await enviar(pedido)).status).toBe(201)
    const r = await enviar(pedido)
    expect(r.status).toBe(429)
  })
})
