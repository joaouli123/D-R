import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { periciaParaApi, urlDaFoto } from './mappers.js'

// ============================================================
// A URL publica da fotografia.
//
// Ela sai RELATIVA: `/uploads/<arquivo>`. Quem completa e o front, contra a
// mesma base que ja usa para as chamadas REST (`urlDeUpload`, em
// src/services/api.ts — testado em src/services/api.test.ts).
//
// Ate aqui o prefixo vinha de API_PUBLIC_URL. Faltando a variavel no painel
// do Coolify, toda foto saia como http://localhost:3333/uploads/... : o
// upload gravava, a imagem nao aparecia, e o perito lia isso como "a foto
// nao subiu". Este teste existe para o prefixo nunca mais depender de
// configuracao.
// ============================================================

describe('urlDaFoto', () => {
  it('devolve caminho relativo, sem host', () => {
    expect(urlDaFoto('a1b2.jpg')).toBe('/uploads/a1b2.jpg')
  })

  it('nao depende de API_PUBLIC_URL', () => {
    const antes = process.env.API_PUBLIC_URL
    process.env.API_PUBLIC_URL = 'https://outro-dominio.test'
    try {
      expect(urlDaFoto('a1b2.jpg')).toBe('/uploads/a1b2.jpg')
    } finally {
      if (antes === undefined) delete process.env.API_PUBLIC_URL
      else process.env.API_PUBLIC_URL = antes
    }
  })

  it('escapa o nome do arquivo', () => {
    expect(urlDaFoto('a b.jpg')).toBe('/uploads/a%20b.jpg')
  })

  it('combina com o prefixo do front no endereco que a producao serve', () => {
    // `/api` e a base da API no navegador (BASE_URL de src/services/api.ts),
    // e /api/uploads/... e o caminho que o Caddy do Coolify entrega — o
    // mesmo que responde 404 do Express, e nao o index.html do site.
    expect(`/api${urlDaFoto('a1b2.jpg')}`).toBe('/api/uploads/a1b2.jpg')
  })

  it('mantem o aviso de espelhamento nos dois arquivos', () => {
    const caminho = (relativo: string) => fileURLToPath(new URL(relativo, import.meta.url))
    expect(readFileSync(caminho('./mappers.ts'), 'utf8')).toContain(
      'urlDeUpload` em src/services/api.ts',
    )
    expect(readFileSync(caminho('../../src/services/api.ts'), 'utf8')).toContain(
      'A API devolve `/uploads/<arquivo>`',
    )
  })
})

describe('periciaParaApi', () => {
  it('devolve o vinculo opcional entre fotografia e agente', () => {
    const pericia = {
      id: 'per-1', numeroProcesso: '', vara: '', comarca: '', reclamante: '',
      modalidade: 'insalubridade', status: 'rascunho', responsavelId: 'usr-1',
      criadoEm: new Date('2026-09-21T12:00:00.000Z'),
      atualizadoEm: new Date('2026-09-21T12:00:00.000Z'),
      tecnico: {}, reclamadas: [], participantes: [],
      fotos: [{
        id: 'foto-1', periciaId: 'per-1', agenteId: 'ag-ruido', secao: 'documentos',
        arquivo: 'ruido.jpg', legenda: 'Dosímetro', ordem: 1,
        criadoEm: new Date('2026-09-21T12:00:00.000Z'),
      }],
    }

    expect(periciaParaApi(pericia as never).fotos[0]).toMatchObject({ agenteId: 'ag-ruido' })
  })
})
