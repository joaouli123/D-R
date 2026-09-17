import { describe, expect, it } from 'vitest'

import type { PreenchimentoTecnico } from '@/types'
import {
  atualizarStatusVarredura,
  CATALOGO_VARREDURA_NR15,
  descreverAcaoPendencia,
  descreverPendencia,
  exibirQuadroVarredura,
  mensagemPendencias,
  normalizarVarredura,
  pendenciasVarredura,
  resumirPendencias,
  type PendenciaVarredura,
} from './varreduraNormativa'

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

    expect(pendencias).toContainEqual({
      norma: 'NR-15', anexo: '1', anexoId: 'ANEXO_01', tema: 'Ruído contínuo ou intermitente', motivo: 'sem avaliação detalhada',
    })
    expect(pendencias).toContainEqual({
      norma: 'NR-15', anexo: '2', anexoId: 'ANEXO_02', tema: 'Ruído de impacto', motivo: 'não avaliado',
    })
    // O quadro da NR-16 sai das avaliações: um "exposição identificada" do
    // painel antigo, sem avaliação nenhuma, não conta como decisão.
    expect(pendencias).toContainEqual({ norma: 'NR-16', anexo: '', motivo: 'sem avaliação registrada' })
    expect(pendencias.filter((item) => item.norma === 'NR-16')).toHaveLength(1)
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
        id: 'a1', nome: 'Álcalis cáusticos', tipo: 'quimico' as const, criterio: 'qualitativo' as const,
        anexoNr15: 'ANEXO_13', epis: [{ categoria: 'Luva', modelo: 'Nitrílica' }],
      }],
      varreduraNr15: decididosSemExposicao(),
    }

    expect(pendenciasVarredura(tecnico, 'insalubridade')).toEqual([
      expect.objectContaining({ anexo: '13', anexoId: 'ANEXO_13', motivo: 'sem conclusão individual', agenteId: 'a1', campo: 'observacao' }),
      expect.objectContaining({ anexo: '13', anexoId: 'ANEXO_13', motivo: 'sem eficácia do EPI', agenteId: 'a1', campo: 'epiEficaz' }),
    ])
  })

  it('não cobra eficácia do EPI no ruído — era o bloqueio que o perito não conseguia resolver', () => {
    // A tela não mostra a pergunta no ruído (a eficácia sai do NRRsf), mas a
    // emissão cobrava "NR-15, Anexo 1: sem eficácia do EPI" mesmo assim.
    const tecnico = {
      agentes: [{
        id: 'a1', nome: 'Ruído', tipo: 'fisico' as const, criterio: 'quantitativo' as const,
        anexoNr15: 'ANEXO_01', epis: [{ categoria: 'Protetor auditivo', modelo: 'Concha' }],
        observacao: 'Exposição abaixo do limite com a atenuação do protetor.',
      }],
      varreduraNr15: decididosSemExposicao(),
    }

    expect(pendenciasVarredura(tecnico, 'insalubridade')).toEqual([])
  })

  it('aceita "Não" como resposta da eficácia do EPI e dispensa a pergunta sem EPI ou sem exposição', () => {
    const base = {
      id: 'a1', nome: 'Álcalis', tipo: 'quimico' as const, criterio: 'qualitativo' as const,
      anexoNr15: 'ANEXO_13', observacao: 'Conclusão.',
    }
    const pendenciasCom = (agente: Record<string, unknown>) =>
      pendenciasVarredura({ agentes: [{ ...base, ...agente }], varreduraNr15: decididosSemExposicao() }, 'insalubridade')

    expect(pendenciasCom({ epis: [{ categoria: 'Luva' }], epiEficaz: false })).toEqual([])
    expect(pendenciasCom({ epis: [{ categoria: 'Luva' }], epiEficaz: true })).toEqual([])
    expect(pendenciasCom({ epis: [] })).toEqual([])
    expect(pendenciasCom({ epis: [{ categoria: 'Luva' }], identificadoNaAtividade: false })).toEqual([])
  })

  it('deriva o quadro da NR-16 das avaliações de periculosidade', () => {
    const agentes = [{
      id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade' as const, criterio: 'qualitativo' as const,
      anexoNr16: 'ANEXO_02', resultadoPericulosidade: 'nao_caracterizada' as const,
    }]

    const concluida = normalizarVarredura({ agentes }, 'periculosidade').nr16
    expect(concluida.find((item) => item.anexoId === 'ANEXO_02')).toMatchObject({ status: 'exposicao_identificada', temAvaliacao: true })
    expect(concluida.filter((item) => item.anexoId !== 'ANEXO_02').every((item) => item.status === 'sem_exposicao')).toBe(true)
    expect(pendenciasVarredura({ agentes }, 'periculosidade')).toEqual([])

    // Sem resultado ainda: os demais anexos seguem pendentes, e a pendência
    // aponta a avaliação — não sete anexos soltos.
    const semResultado = [{ ...agentes[0], resultadoPericulosidade: undefined }]
    expect(normalizarVarredura({ agentes: semResultado }, 'periculosidade').nr16
      .filter((item) => item.anexoId !== 'ANEXO_02').every((item) => item.status === 'nao_avaliado')).toBe(true)
    expect(pendenciasVarredura({ agentes: semResultado }, 'periculosidade')).toEqual([
      expect.objectContaining({ norma: 'NR-16', anexo: '2', motivo: 'sem conclusão individual', agenteId: 'r1', campo: 'resultadoPericulosidade' }),
    ])

    // Decisão "Sem exposição" gravada antes continua valendo.
    const gravada = normalizarVarredura({ agentes: [], varreduraNr16: [{ anexoId: 'ANEXO_01', status: 'sem_exposicao' }] }, 'periculosidade')
    expect(gravada.nr16[0].status).toBe('sem_exposicao')
  })

  it('cobra o anexo da NR-16 de quem caracteriza a periculosidade', () => {
    const agentes = [{
      id: 'r1', nome: 'Periculosidade', tipo: 'periculosidade' as const, criterio: 'qualitativo' as const,
      resultadoPericulosidade: 'caracterizada' as const,
    }]

    expect(pendenciasVarredura({ agentes }, 'periculosidade')).toEqual([
      { norma: 'NR-16', anexo: '', motivo: 'sem anexo da NR-16', agenteId: 'r1', agenteNome: 'Periculosidade', campo: 'anexoNr16' },
    ])
  })

  it('imprime o quadro da NR-16 quando há avaliação, mesmo sem registro gravado', () => {
    expect(exibirQuadroVarredura({ agentes: [] })).toEqual({ nr15: false, nr16: false })
    expect(exibirQuadroVarredura({
      agentes: [{ id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade', criterio: 'qualitativo' }],
    })).toEqual({ nr15: false, nr16: true })
    expect(exibirQuadroVarredura({ agentes: [], varreduraNr15: [{ anexoId: 'ANEXO_01', status: 'sem_exposicao' }] }))
      .toEqual({ nr15: true, nr16: false })
  })

  it('escreve o aviso dizendo onde está a pendência e o que fazer', () => {
    const epi: PendenciaVarredura = {
      norma: 'NR-15', anexo: '13', anexoId: 'ANEXO_13', tema: 'Agentes químicos',
      motivo: 'sem eficácia do EPI', agenteId: 'a1', agenteNome: 'Álcalis', campo: 'epiEficaz',
    }
    const semDecisao = (anexo: string): PendenciaVarredura => ({ norma: 'NR-15', anexo, motivo: 'não avaliado' })

    expect(descreverPendencia(epi)).toBe('NR-15, Álcalis (Anexo 13): informe se o EPI é eficaz')
    expect(descreverAcaoPendencia(epi)).toBe('Álcalis (Anexo 13) — informe se o EPI é eficaz')
    expect(descreverPendencia({ norma: 'NR-16', anexo: '', motivo: 'sem avaliação registrada' }))
      .toBe('NR-16: nenhuma avaliação de periculosidade registrada')

    expect(resumirPendencias([semDecisao('2'), semDecisao('3'), epi]))
      .toBe('NR-15, anexos sem decisão: 2, 3; NR-15, Álcalis (Anexo 13): informe se o EPI é eficaz')
    expect(mensagemPendencias([epi])).toBe('Há pendências para emitir o documento: NR-15, Álcalis (Anexo 13): informe se o EPI é eficaz.')

    const oito = Array.from({ length: 8 }, (_, indice) => ({ ...epi, agenteId: `a${indice}`, agenteNome: `A${indice}` }))
    expect(resumirPendencias(oito)).toMatch(/; e mais 2$/)
  })
})

function decididosSemExposicao() {
  return CATALOGO_VARREDURA_NR15
    .filter((item) => item.anexoId !== 'ANEXO_04')
    .map((item) => ({ anexoId: item.anexoId, status: 'sem_exposicao' as const }))
}
