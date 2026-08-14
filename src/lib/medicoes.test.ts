import { describe, expect, it } from 'vitest'

import { normalizarNumeroMedido, unidadesDisponiveis } from './medicoes'

describe('medições estruturadas', () => {
  it('separa unidades disponíveis sem converter valores', () => {
    expect(unidadesDisponiveis({ limites: { ppm: '78', 'mg/m³': '140' } })).toEqual(['ppm', 'mg/m³'])
  })

  it('normaliza decimal com vírgula e rejeita valor não numérico', () => {
    expect(normalizarNumeroMedido(' 12,5 ')).toBe('12.5')
    expect(normalizarNumeroMedido('doze')).toBeNull()
  })
})
