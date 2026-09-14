import { describe, expect, it } from 'vitest'

import type { PreenchimentoTecnico } from '@/types'
import { normalizarVarredura, pendenciasVarredura } from './varreduraNormativa'

describe('varredura normativa da perícia', () => {
  it('lista literalmente os anexos 1 a 14 e fixa o Anexo 4 como revogado', () => {
    const resultado = normalizarVarredura({ agentes: [] }, 'insalubridade')

    expect(resultado.nr15.map((item) => item.numero)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14',
    ])
    expect(resultado.nr15.find((item) => item.numero === '4')).toMatchObject({
      tema: 'Revogado',
      status: 'nao_aplicavel',
    })
  })

  it('lista os seis anexos numerados da NR-16 e o anexo sem número', () => {
    const resultado = normalizarVarredura({ agentes: [] }, 'periculosidade')

    expect(resultado.nr16.map((item) => item.numero)).toEqual(['1', '2', '3', '4', '5', '6', '(*)'])
  })

  it('reconhece registros antigos e agrupa subdivisões nos anexos legais', () => {
    const tecnico: Pick<PreenchimentoTecnico, 'agentes'> = {
      agentes: [
        { id: 'a1', nome: 'Vibração', tipo: 'fisico', anexoNr15: 'ANEXO_08_VMB', criterio: 'quantitativo' },
        { id: 'a2', nome: 'Sílica', tipo: 'quimico', anexoNr15: 'ANEXO_12_SILICA', criterio: 'quantitativo' },
        { id: 'a3', nome: 'Inflamáveis', tipo: 'periculosidade', anexoNr16: 'ANEXO_02', criterio: 'qualitativo' },
      ],
    }

    const resultado = normalizarVarredura(tecnico, 'ambas')

    expect(resultado.nr15.find((item) => item.numero === '8')?.status).toBe('exposicao_identificada')
    expect(resultado.nr15.find((item) => item.numero === '12')?.status).toBe('exposicao_identificada')
    expect(resultado.nr16.find((item) => item.numero === '2')?.status).toBe('exposicao_identificada')
    expect(tecnico.agentes).toHaveLength(3)
  })

  it('mantém o Anexo 13-A como complemento fora do contador dos quatorze', () => {
    const resultado = normalizarVarredura({
      agentes: [{ id: 'benzeno', nome: 'Benzeno', tipo: 'quimico', anexoNr15: 'ANEXO_13A', criterio: 'qualitativo' }],
    }, 'insalubridade')

    expect(resultado.nr15).toHaveLength(14)
    expect(resultado.nr15.find((item) => item.numero === '13')?.status).toBe('exposicao_identificada')
    expect(resultado.nr15Complementares).toEqual([
      expect.objectContaining({ anexoId: 'ANEXO_13A', numero: '13-A', status: 'exposicao_identificada' }),
    ])
  })

  it('informa norma, anexo e motivo das decisões pendentes', () => {
    const tecnico = {
      agentes: [],
      varreduraNr15: [{ anexoId: 'ANEXO_01', status: 'exposicao_identificada' as const }],
      varreduraNr16: [{ anexoId: 'ANEXO_02', status: 'exposicao_identificada' as const }],
    }

    const pendencias = pendenciasVarredura(tecnico, 'ambas')

    expect(pendencias).toContainEqual({ norma: 'NR-15', anexo: '1', motivo: 'sem avaliação detalhada' })
    expect(pendencias).toContainEqual({ norma: 'NR-16', anexo: '2', motivo: 'sem avaliação detalhada' })
    expect(pendencias).toContainEqual({ norma: 'NR-15', anexo: '2', motivo: 'não avaliado' })
  })
})
