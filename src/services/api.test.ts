import { describe, expect, it } from 'vitest'

import { mensagemDeErro, urlDeUpload } from './api'

// ============================================================
// O caminho da foto ate a tela.
//
// A API devolve `/uploads/<arquivo>` — relativo, sem host. Em producao ela
// vive sob `/api` no mesmo dominio, entao quem monta o endereco final e o
// front. Sem o prefixo, `/uploads/...` cai no index.html do proprio site e
// o perito ve um retangulo vazio no lugar da fotografia — foi exatamente
// isso que ele descreveu como "as fotos nao subiram".
//
// A contraparte no servidor esta em server/src/mappers.test.ts.
// ============================================================

describe('urlDeUpload', () => {
  it('prefixa o caminho relativo com a base da API', () => {
    expect(urlDeUpload('/uploads/abc.jpg')).toBe('/api/uploads/abc.jpg')
  })

  it('nao mexe em URL absoluta — resposta antiga da API continua abrindo', () => {
    expect(urlDeUpload('https://exemplo.test/uploads/abc.jpg')).toBe(
      'https://exemplo.test/uploads/abc.jpg',
    )
  })

  it('nao mexe em blob: — e o que o modo de demonstracao produz', () => {
    expect(urlDeUpload('blob:http://localhost/9f1')).toBe('blob:http://localhost/9f1')
  })

  it('nao confunde outro caminho da API com upload', () => {
    expect(urlDeUpload('/pericias/1')).toBe('/pericias/1')
  })
})

describe('mensagemDeErro', () => {
  it('cai no texto padrao quando o erro nao tem mensagem', () => {
    expect(mensagemDeErro({ qualquer: 'coisa' }, 'Falha ao enviar as fotos.')).toBe(
      'Falha ao enviar as fotos.',
    )
  })

  it('usa a mensagem de um Error comum', () => {
    expect(mensagemDeErro(new Error('sem rede'), 'padrao')).toBe('sem rede')
  })
})
