import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

// ============================================================
// A sondagem de escrita no volume de uploads.
//
// O mkdir sozinho nao provava nada: num volume montado somente-leitura, ou
// montado por cima de /app/uploads com outro dono, ele passa e so o
// primeiro upload real descobre o problema — na frente do perito. Daqui
// sai o campo `uploads` de GET /saude, que responde de fora, com um curl,
// a pergunta "por que a foto nao sobe".
// ============================================================

const raiz = path.join(os.tmpdir(), 'dr-uploads-teste')

async function carregar(dir: string) {
  vi.resetModules()
  vi.doMock('../env.js', () => ({ env: { UPLOAD_DIR: dir, UPLOAD_MAX_MB: 15 } }))
  return import('./armazenamento.js')
}

afterEach(async () => {
  vi.doUnmock('../env.js')
  await fs.rm(raiz, { recursive: true, force: true })
})

describe('estadoDosUploads', () => {
  it('cria a pasta e confirma que da para gravar', async () => {
    const dir = path.join(raiz, 'ok')
    const { estadoDosUploads } = await carregar(dir)

    const estado = await estadoDosUploads()

    expect(estado.gravavel).toBe(true)
    expect(estado.arquivos).toBe(0)
    expect(estado.erro).toBeUndefined()
    expect(path.resolve(estado.pasta)).toBe(path.resolve(dir))
  })

  it('conta as fotos ja gravadas e ignora a propria sonda', async () => {
    const dir = path.join(raiz, 'com-fotos')
    const { estadoDosUploads } = await carregar(dir)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'a.jpg'), 'x')
    await fs.writeFile(path.join(dir, 'b.jpg'), 'x')
    await fs.writeFile(path.join(dir, '.oculto'), 'x')

    expect((await estadoDosUploads()).arquivos).toBe(2)
  })

  it('volume sem escrita aparece como gravavel:false, com o motivo', async () => {
    // Um ARQUIVO no lugar da pasta: e o que mais se parece, num teste, com
    // a montagem errada que o Coolify pode entregar.
    const ocupado = path.join(raiz, 'arquivo')
    await fs.mkdir(raiz, { recursive: true })
    await fs.writeFile(ocupado, 'nao sou pasta')
    const { estadoDosUploads } = await carregar(path.join(ocupado, 'uploads'))

    const estado = await estadoDosUploads()

    expect(estado.gravavel).toBe(false)
    expect(estado.arquivos).toBe(0)
    expect(estado.erro).toBeTruthy()
  })

  it('prepararArmazenamento nao derruba a API quando o volume esta ruim', async () => {
    const ocupado = path.join(raiz, 'arquivo2')
    await fs.mkdir(raiz, { recursive: true })
    await fs.writeFile(ocupado, 'nao sou pasta')
    const { prepararArmazenamento } = await carregar(path.join(ocupado, 'uploads'))
    const registrado = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Sem fotos o perito ainda consegue trabalhar; sem API, nao. Quem chama
    // e o bootstrap, que faz process.exit(1) em qualquer excecao.
    await expect(prepararArmazenamento()).resolves.toBeUndefined()
    expect(registrado).toHaveBeenCalled()
    expect(String(registrado.mock.calls[0]?.[0])).toContain('/app/uploads')

    registrado.mockRestore()
  })
})
