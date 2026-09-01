import { describe, expect, it } from 'vitest'

import { decidirSincronizacaoDeFotos } from './fotos-pericia.js'

describe('sincronização de fotos no upsert da perícia', () => {
  it('não remove uploads que ficaram ausentes de um payload atrasado', () => {
    expect(decidirSincronizacaoDeFotos(
      [{ id: 'foto-existente' }, { id: 'foto-enviada-agora' }],
      [{ id: 'foto-existente', legenda: 'Atualizada', ordem: 1 }],
    )).toEqual({
      atualizar: [{ id: 'foto-existente', legenda: 'Atualizada', ordem: 1 }],
      remover: [],
    })
  })
})
