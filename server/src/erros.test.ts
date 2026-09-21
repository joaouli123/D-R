import { Prisma } from '@prisma/client'
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
    expect(visto.corpo?.erro).toContain('3 MB')
  })

  it('a logo grande demais recebe o mesmo teto da foto', () => {
    // "limite tudo em 3mb qlq imagem do sistema" — a logo tinha um 4 fixo
    // no meio do multer e ninguem conferia.
    const visto = tratar(new multer.MulterError('LIMIT_FILE_SIZE', 'logo'))
    expect(visto.status).toBe(413)
    expect(visto.corpo?.erro).toContain('3 MB')
  })

  it('a imagem nao acompanha UPLOAD_MAX_MB, so o anexo em PDF acompanha', () => {
    // O mock acima poe UPLOAD_MAX_MB em 15: se a imagem voltasse a seguir o
    // ambiente, esta mensagem diria 15 MB de novo.
    expect(tratar(new multer.MulterError('LIMIT_FILE_SIZE', 'fotos')).corpo?.erro)
      .not.toContain('15 MB')
    expect(tratar(new multer.MulterError('LIMIT_FILE_SIZE', 'anexo')).corpo?.erro)
      .toContain('60 MB')
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

// ============================================================
// Duplicidade (P2002). O CNPJ da empresa é único POR EQUIPE, então o índice é
// (organizacaoId, cnpj) e o `target` do Prisma traz os dois. A mensagem não
// pode entregar o nome interno "organizacaoId" ao usuário.
// ============================================================

function duplicidade(target: unknown) {
  return tratar(
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'teste',
      meta: { target },
    }),
  )
}

describe('tratarErros — duplicidade (P2002)', () => {
  it('CNPJ repetido na mesma equipe diz "CNPJ" e não vaza organizacaoId', () => {
    const visto = duplicidade(['organizacaoId', 'cnpj'])

    expect(visto.status).toBe(409)
    expect(visto.corpo?.erro).toBe('Já existe um cadastro com este CNPJ.')
  })

  it('e-mail repetido diz "e-mail"', () => {
    expect(duplicidade(['email']).corpo?.erro).toBe('Já existe um cadastro com este e-mail.')
  })

  it('campo desconhecido aparece como veio', () => {
    expect(duplicidade(['chave']).corpo?.erro).toBe('Já existe um cadastro com este chave.')
  })

  it('sem lista de campos (nome da restrição, ou nada) cai no genérico', () => {
    expect(duplicidade('Empresa_organizacaoId_cnpj_key').corpo?.erro).toBe(
      'Já existe um cadastro com este registro.',
    )
    expect(duplicidade(undefined).corpo?.erro).toBe('Já existe um cadastro com este registro.')
    expect(duplicidade(['organizacaoId']).corpo?.erro).toBe('Já existe um cadastro com este registro.')
  })
})
