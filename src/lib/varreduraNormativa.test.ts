import { describe, expect, it } from 'vitest'

import type { PreenchimentoTecnico } from '@/types'
import { atualizarStatusVarredura, CATALOGO_VARREDURA_NR15, normalizarVarredura, pendenciasVarredura } from './varreduraNormativa'

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

  it('grava uma decisão sem apagar agentes nem decisões dos outros anexos', () => {
    const tecnico = {
      agentes: [{ id: 'a1', nome: 'Frio', tipo: 'fisico' as const, anexoNr15: 'ANEXO_09', criterio: 'qualitativo' as const }],
      varreduraNr15: [{ anexoId: 'ANEXO_01', status: 'sem_exposicao' as const }],
    }

    const atualizado = atualizarStatusVarredura(tecnico, 'NR-15', 'ANEXO_02', 'sem_exposicao')

    expect(atualizado.agentes).toEqual(tecnico.agentes)
    expect(atualizado.varreduraNr15).toEqual([
      { anexoId: 'ANEXO_01', status: 'sem_exposicao' },
      { anexoId: 'ANEXO_02', status: 'sem_exposicao' },
    ])
  })

  it('cobra conclusão e eficácia de EPI nas avaliações positivas da NR-15', () => {
    const tecnico = {
      agentes: [{
        id: 'a1', nome: 'Ruído', tipo: 'fisico' as const, criterio: 'quantitativo' as const,
        anexoNr15: 'ANEXO_01', epis: [{ categoria: 'Protetor auditivo', modelo: 'Concha' }],
      }],
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
