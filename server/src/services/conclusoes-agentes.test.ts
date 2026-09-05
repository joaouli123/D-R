import { describe, expect, it } from 'vitest'

import { agentesNr15SemConclusao } from './documento-comum'

describe('conclusões individuais das avaliações NR-15', () => {
  it('lista somente agentes NR-15 sem conclusão, identificados ou ausentes', () => {
    expect(agentesNr15SemConclusao({
      agentes: [
        { id: 'a1', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo', observacao: 'Proteção eficaz.' },
        { id: 'a2', nome: 'Frio', tipo: 'fisico', criterio: 'qualitativo', identificadoNaAtividade: false },
        { id: 'a3', nome: 'Inflamáveis', tipo: 'periculosidade', criterio: 'qualitativo' },
      ],
    })).toEqual(['Frio'])
  })

  it('não bloqueia documento exclusivamente de periculosidade por agentes NR-15 antigos', () => {
    expect(agentesNr15SemConclusao({
      agentes: [
        { id: 'a1', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo' },
      ],
    }, 'periculosidade')).toEqual([])
  })
})
