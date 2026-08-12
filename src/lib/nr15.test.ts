import { describe, expect, it } from 'vitest'

import { ATIVIDADES_ANEXO_13, ATIVIDADES_ANEXO_14, SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import type { ReferenciaNormativa } from '@/content/nr15/tipos'
import { aplicarAnexo, aplicarReferencia, buscarReferencias, normalizarBuscaNr15 } from './nr15'

describe('bases normativas oficiais da NR-15', () => {
  it('mantem o Quadro 1 do Anexo 11 completo e aplicavel', () => {
    expect(SUBSTANCIAS_ANEXO_11.length).toBeGreaterThan(100)
    expect(SUBSTANCIAS_ANEXO_11.every(x => x.id && x.label && x.limiteTolerancia && x.grau)).toBe(true)
  })

  it('preserva os graus previstos para as atividades do Anexo 13', () => {
    expect(ATIVIDADES_ANEXO_13.some(x => x.grau === 'minimo')).toBe(true)
    expect(ATIVIDADES_ANEXO_13.some(x => x.grau === 'maximo')).toBe(true)
  })

  it('restringe as atividades do Anexo 14 aos graus medio e maximo', () => {
    expect(new Set(ATIVIDADES_ANEXO_14.map(x => x.grau))).toEqual(new Set(['medio', 'maximo']))
  })
})

describe('normalizarBuscaNr15', () => {
  it('normaliza acentos e letras maiusculas para busca normativa', () => {
    expect(normalizarBuscaNr15('Ácido Nítrico')).toBe('acido nitrico')
  })
})

describe('buscarReferencias', () => {
  it('encontra referencias por texto normalizado no rotulo e sinonimos', () => {
    const referencias: ReferenciaNormativa[] = [
      {
        id: 'ANEXO_11_ACIDO_NITRICO',
        anexoId: 'ANEXO_11',
        label: 'Ácido Nítrico',
        sinonimos: ['aqua fortis'],
        tipo: 'quimico',
        criterio: 'quantitativo',
        limiteTolerancia: '2 ppm',
        unidadeLimite: 'ppm',
        grau: 'medio',
      },
      {
        id: 'ANEXO_11_ACETONA',
        anexoId: 'ANEXO_11',
        label: 'Acetona',
        tipo: 'quimico',
        criterio: 'quantitativo',
        limiteTolerancia: '780 ppm',
        unidadeLimite: 'ppm',
        grau: 'medio',
      },
    ]

    expect(buscarReferencias(referencias, 'AQUA FORTIS')).toEqual([referencias[0]])
  })
})

describe('aplicarAnexo', () => {
  it('preserva medicao, EPI e observacao ao trocar para o Anexo 7', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Legado',
      tipo: 'quimico',
      criterio: 'quantitativo',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    }, 'ANEXO_07')).toMatchObject({
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
      tipo: 'fisico',
      criterio: 'qualitativo',
    })
  })

  it('remove apenas referencias normativas incompatíveis com o novo anexo', () => {
    const agente = aplicarAnexo({
      id: 'a1',
      nome: 'Ácido Nítrico',
      tipo: 'quimico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_11',
      referenciaNormativaId: 'ANEXO_11_ACIDO_NITRICO',
      atividadeEnquadrada: 'Exposição a ácido nítrico',
      unidadeLimite: 'ppm',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    }, 'ANEXO_14')

    expect(agente).not.toHaveProperty('referenciaNormativaId')
    expect(agente).not.toHaveProperty('atividadeEnquadrada')
    expect(agente).not.toHaveProperty('unidadeLimite')
    expect(agente).toMatchObject({
      anexoNr15: 'ANEXO_14',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    })
  })
})

describe('aplicarReferencia', () => {
  it('injeta somente os campos derivados da referencia normativa', () => {
    const referencia: ReferenciaNormativa = {
      id: 'ANEXO_11_ACIDO_NITRICO',
      anexoId: 'ANEXO_11',
      label: 'Ácido Nítrico',
      tipo: 'quimico',
      criterio: 'quantitativo',
      limiteTolerancia: '2 ppm',
      unidadeLimite: 'ppm',
      grau: 'medio',
    }

    expect(aplicarReferencia({
      id: 'a1',
      nome: 'Legado',
      tipo: 'quimico',
      criterio: 'quantitativo',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    }, referencia)).toMatchObject({
      anexoNr15: 'ANEXO_11',
      referenciaNormativaId: 'ANEXO_11_ACIDO_NITRICO',
      nome: 'Ácido Nítrico',
      tipo: 'quimico',
      criterio: 'quantitativo',
      limiteTolerancia: '2 ppm',
      unidadeLimite: 'ppm',
      grau: 'medio',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    })
  })
})
