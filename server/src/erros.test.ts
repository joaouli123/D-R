import type { Response } from 'express'
import multer from 'multer'
import { describe, expect, it, vi } from 'vitest'

// env.js chama process.exit(1) sem DATABASE_URL — nao da para importa-lo
// num teste unitario. So o limite de upload interessa aqui.
vi.mock('./env.js', () => ({ env: { UPLOAD_MAX_MB: 15, ehProducao: true } }))

const { tratarErros } = await import('./erros.js')

// ============================================================
// Falha de upload tem de chegar ao perito com nome e sobrenome.
//
// Antes destas ramificacoes, qualquer erro do multer caia no 500 generico
// ("Erro interno do servidor.", sem detalhes em producao). Na tela era uma
// caixa vermelha identica a de servidor fora do ar — o perito nao tinha
// como saber que bastava reduzir a foto.
// ============================================================

function capturar() {
  const visto: { status?: number; corpo?: { erro?: string } } = {}
  const res = {
    status(s: number) {
      visto.status = s
      return res
    },
    json(c: { erro?: string }) {
      visto.corpo = c
      return res
    },
  }
  return { res: res as unknown as Response, visto }
}

function tratar(erro: unknown) {
  const { res, visto } = capturar()
  tratarErros(erro, {} as never, res, () => {})
  return visto
}

describe('tratarErros — envio de arquivos', () => {
  it('foto acima do limite vira 413 dizendo o limite', () => {
    const visto = tratar(new multer.MulterError('LIMIT_FILE_SIZE', 'fotos'))
    expect(visto.status).toBe(413)
    expect(visto.corpo?.erro).toContain('15 MB')
  })

  it('o limite do anexo em PDF e quatro vezes o da foto', () => {
    const visto = tratar(new multer.MulterError('LIMIT_FILE_SIZE', 'anexo'))
    expect(visto.corpo?.erro).toContain('60 MB')
  })

  it('fotos demais de uma vez vira 400 explicando o maximo', () => {
    const visto = tratar(new multer.MulterError('LIMIT_FILE_COUNT', 'fotos'))
    expect(visto.status).toBe(400)
    expect(visto.corpo?.erro).toContain('30')
  })

  it('campo inesperado orienta a atualizar a pagina', () => {
    const visto = tratar(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'fotos'))
    expect(visto.status).toBe(400)
    expect(visto.corpo?.erro).toMatch(/atualize a pagina/i)
  })

  it('corpo JSON grande demais vira 413, e nao 500 mudo', () => {
    const visto = tratar(Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
    }))
    expect(visto.status).toBe(413)
    expect(visto.corpo?.erro).toMatch(/grandes demais/i)
  })
})
