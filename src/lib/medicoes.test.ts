import { describe, expect, it } from 'vitest'

import { normalizarNumeroMedido, unidadesDisponiveis } from './medicoes'
import { SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'

describe('medições estruturadas', () => {
  it('separa unidades disponíveis sem converter valores', () => {
    expect(unidadesDisponiveis({ limites: { ppm: '78', 'mg/m³': '140' } })).toEqual(['ppm', 'mg/m³'])
  })

  it('disponibiliza o limite de oxigênio dos asfixiantes simples sem conversão', () => {
    const acetileno = SUBSTANCIAS_ANEXO_11.find(item => item.label === 'Acetileno')

    expect(acetileno).toBeDefined()
    expect(unidadesDisponiveis(acetileno!)).toEqual(['% O₂ em volume'])
  })

  it('normaliza decimal com vírgula e rejeita valor não numérico', () => {
    expect(normalizarNumeroMedido(' 12,5 ')).toBe('12.5')
    expect(normalizarNumeroMedido('doze')).toBeNull()
  })
})
