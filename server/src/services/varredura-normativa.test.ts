import { describe, expect, it } from 'vitest'

import { CATALOGO_VARREDURA_NR15, normalizarVarredura, pendenciasVarredura } from './varredura-normativa'

describe('varredura normativa no servidor', () => {
  it('repete a sequência legal e a regra de compatibilidade usada pelo editor', () => {
    const tecnico = {
      agentes: [
        { id: 'a1', nome: 'Ruído', tipo: 'fisico', anexoNr15: 'ANEXO_01', criterio: 'quantitativo' },
        { id: 'a2', nome: 'Energia', tipo: 'periculosidade', anexoNr16: 'ANEXO_04', criterio: 'qualitativo' },
      ],
    }

    const resultado = normalizarVarredura(tecnico, 'ambas')

    expect(resultado.nr15).toHaveLength(14)
    expect(resultado.nr15[3]).toMatchObject({ numero: '4', status: 'nao_aplicavel' })
    expect(resultado.nr15[0].status).toBe('exposicao_identificada')
    expect(resultado.nr16.map((item) => item.numero)).toEqual(['1', '2', '3', '4', '5', '6', '(*)'])
    expect(resultado.nr16[3].status).toBe('exposicao_identificada')
  })

  it('não exige a norma que está fora da modalidade', () => {
    const tecnico = { agentes: [] }

    expect(pendenciasVarredura(tecnico, 'insalubridade').some((item) => item.norma === 'NR-16')).toBe(false)
    expect(pendenciasVarredura(tecnico, 'periculosidade').some((item) => item.norma === 'NR-15')).toBe(false)
  })

  it('recusa avaliação positiva sem conclusão e sem eficácia do EPI', () => {
    const tecnico = {
      agentes: [{ id: 'a1', nome: 'Ruído', tipo: 'fisico', anexoNr15: 'ANEXO_01', criterio: 'quantitativo', epis: [{ categoria: 'Protetor', modelo: 'Concha' }] }],
      varreduraNr15: CATALOGO_VARREDURA_NR15
        .filter((item) => item.anexoId !== 'ANEXO_04')
        .map((item) => ({ anexoId: item.anexoId, status: item.anexoId === 'ANEXO_01' ? 'exposicao_identificada' as const : 'sem_exposicao' as const })),
    }

    expect(pendenciasVarredura(tecnico, 'insalubridade')).toEqual(expect.arrayContaining([
      expect.objectContaining({ anexo: '1', motivo: 'sem conclusão individual' }),
      expect.objectContaining({ anexo: '1', motivo: 'sem eficácia do EPI' }),
    ]))
  })
})
