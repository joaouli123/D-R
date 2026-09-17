import { describe, expect, it } from 'vitest'

import {
  CATALOGO_VARREDURA_NR15,
  exibirQuadroVarredura,
  mensagemPendencias,
  normalizarVarredura,
  pendenciasVarredura,
} from './varredura-normativa'
import * as front from '../../../src/lib/varreduraNormativa'

const decididosSemExposicao = () => CATALOGO_VARREDURA_NR15
  .filter((item) => item.anexoId !== 'ANEXO_04')
  .map((item) => ({ anexoId: item.anexoId, status: 'sem_exposicao' as const }))

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
      agentes: [{ id: 'a1', nome: 'Álcalis', tipo: 'quimico', anexoNr15: 'ANEXO_13', criterio: 'qualitativo', epis: [{ categoria: 'Luva', modelo: 'Nitrílica' }] }],
      varreduraNr15: decididosSemExposicao(),
    }

    expect(pendenciasVarredura(tecnico, 'insalubridade')).toEqual([
      expect.objectContaining({ anexo: '13', motivo: 'sem conclusão individual', campo: 'observacao' }),
      expect.objectContaining({ anexo: '13', motivo: 'sem eficácia do EPI', campo: 'epiEficaz' }),
    ])
  })

  it('não recusa o ruído por falta de eficácia do EPI — a atenuação sai do NRRsf', () => {
    // O bloqueio relatado pelo perito: "NR-15, Anexo 1: sem eficácia do EPI",
    // num campo que a tela nem mostra no ruído.
    const tecnico = {
      agentes: [{
        id: 'a1', nome: 'Ruído', tipo: 'fisico', anexoNr15: 'ANEXO_01', criterio: 'quantitativo',
        epis: [{ categoria: 'Protetor', modelo: 'Concha' }], observacao: 'Abaixo do limite com o protetor.',
      }],
      varreduraNr15: decididosSemExposicao(),
    }

    expect(pendenciasVarredura(tecnico, 'insalubridade')).toEqual([])
  })

  it('diz que falta escolher o subtipo nos anexos 8 e 12', () => {
    const tecnico = {
      agentes: [],
      varreduraNr15: [{ anexoId: 'ANEXO_08', status: 'exposicao_identificada' as const }, { anexoId: 'ANEXO_12', status: 'exposicao_identificada' as const }],
    }

    const mensagem = mensagemPendencias(pendenciasVarredura(tecnico, 'insalubridade'))
    expect(mensagem).toContain('NR-15, Anexo 8 (Vibrações): escolha o tipo de vibração (mãos e braços ou corpo inteiro)')
    expect(mensagem).toContain('NR-15, Anexo 12 (Poeiras minerais): escolha a poeira (asbesto, manganês ou sílica)')
  })

  it('cobra o anexo da NR-16 quando o resultado está só na redação própria', () => {
    // A redação própria vence o resultado escolhido no documento; sem o anexo,
    // o quadro dizia "Sem exposição" em todos os anexos, contradizendo o texto.
    const semAnexo = { agentes: [{ id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade', resultadoPericulosidadeTexto: 'Caracterizada.' }] }
    expect(pendenciasVarredura(semAnexo, 'periculosidade')).toEqual([
      expect.objectContaining({ norma: 'NR-16', motivo: 'sem anexo da NR-16', agenteId: 'r1', campo: 'anexoNr16' }),
    ])

    const semEnquadramento = { agentes: [{ ...semAnexo.agentes[0], anexoNr16: 'SEM_ENQUADRAMENTO' }] }
    expect(pendenciasVarredura(semEnquadramento, 'periculosidade')).toEqual([])
  })

  it('ignora o "exposição identificada" gravado pelo painel antigo da NR-16', () => {
    const tecnico = { agentes: [], varreduraNr16: [{ anexoId: 'ANEXO_02', status: 'exposicao_identificada' as const }] }

    expect(normalizarVarredura(tecnico, 'periculosidade').nr16[1].status).toBe('nao_avaliado')
    expect(pendenciasVarredura(tecnico, 'periculosidade')).toEqual([
      { norma: 'NR-16', anexo: '', motivo: 'sem avaliação registrada' },
    ])
    expect(mensagemPendencias(pendenciasVarredura(tecnico, 'periculosidade')))
      .toBe('Há pendências para emitir o documento: NR-16: nenhuma avaliação de periculosidade registrada.')
  })
})

// ============================================================
// A tela mostra as pendências e a API recusa a emissão: se as duas cópias
// divergem, o perito vê "nenhuma pendência" e a API recusa mesmo assim — ou
// o contrário. Os mesmos casos passam pelas duas.
// ============================================================

const EPI = [{ categoria: 'Luva', modelo: 'Nitrílica' }]

const CASOS: { nome: string; tecnico: Record<string, unknown>; modalidade: string }[] = [
  { nome: 'laudo em branco, ambas', tecnico: { agentes: [] }, modalidade: 'ambas' },
  {
    nome: 'ruído com EPI e conclusão',
    tecnico: {
      agentes: [{ id: 'a1', nome: 'Ruído', tipo: 'fisico', anexoNr15: 'ANEXO_01', epis: EPI, observacao: 'Ok.' }],
      varreduraNr15: decididosSemExposicao(),
    },
    modalidade: 'insalubridade',
  },
  {
    nome: 'ruído de impacto com EPI, sem conclusão',
    tecnico: { agentes: [{ id: 'a1', nome: 'Impacto', tipo: 'fisico', anexoNr15: 'ANEXO_02', epis: EPI }] },
    modalidade: 'insalubridade',
  },
  {
    nome: 'químico com EPI sem resposta',
    tecnico: { agentes: [{ id: 'a1', nome: 'Álcalis', tipo: 'quimico', anexoNr15: 'ANEXO_13', epis: EPI, observacao: 'Ok.' }] },
    modalidade: 'insalubridade',
  },
  {
    nome: 'químico com EPI respondido "Não"',
    tecnico: { agentes: [{ id: 'a1', nome: 'Álcalis', tipo: 'quimico', anexoNr15: 'ANEXO_13', epis: EPI, epiEficaz: false, observacao: 'Ok.' }] },
    modalidade: 'insalubridade',
  },
  {
    nome: 'agente ausente da atividade com EPI',
    tecnico: { agentes: [{ id: 'a1', nome: 'Frio', tipo: 'fisico', anexoNr15: 'ANEXO_09', epis: EPI, identificadoNaAtividade: false }] },
    modalidade: 'insalubridade',
  },
  {
    nome: 'vibração em subdivisão do Anexo 8 e benzeno no 13-A',
    tecnico: {
      agentes: [
        { id: 'a1', nome: 'VMB', tipo: 'fisico', anexoNr15: 'ANEXO_08_VMB', observacao: 'Ok.' },
        { id: 'a2', nome: 'Benzeno', tipo: 'quimico', anexoNr15: 'ANEXO_13A' },
      ],
      varreduraNr15: [{ anexoId: 'ANEXO_03', status: 'exposicao_identificada' }],
    },
    modalidade: 'insalubridade',
  },
  {
    nome: 'Anexo 8 com exposição e sem subtipo escolhido',
    tecnico: {
      agentes: [{ id: 'a1', nome: '', tipo: 'fisico', criterio: 'qualitativo' }],
      varreduraNr15: [{ anexoId: 'ANEXO_08', status: 'exposicao_identificada' }, { anexoId: 'ANEXO_12', status: 'exposicao_identificada' }],
    },
    modalidade: 'insalubridade',
  },
  {
    nome: 'agente NR-15 sem anexo',
    tecnico: { agentes: [{ id: 'a1', nome: '', tipo: 'biologico' }] },
    modalidade: 'insalubridade',
  },
  {
    nome: 'periculosidade caracterizada sem anexo',
    tecnico: { agentes: [{ id: 'r1', nome: 'Risco', tipo: 'periculosidade', resultadoPericulosidade: 'caracterizada' }] },
    modalidade: 'periculosidade',
  },
  {
    nome: 'periculosidade com anexo e sem resultado',
    tecnico: { agentes: [{ id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade', anexoNr16: 'ANEXO_02' }] },
    modalidade: 'periculosidade',
  },
  {
    nome: 'periculosidade concluída com resultado em texto e decisão antiga gravada',
    tecnico: {
      agentes: [{ id: 'r1', nome: 'Elétrica', tipo: 'periculosidade', anexoNr16: 'ANEXO_04', resultadoPericulosidadeTexto: 'Caracterizada.' }],
      varreduraNr16: [{ anexoId: 'ANEXO_01', status: 'exposicao_identificada' }, { anexoId: 'ANEXO_02', status: 'nao_aplicavel' }],
    },
    modalidade: 'ambas',
  },
  {
    nome: 'periculosidade com redação própria e sem anexo',
    tecnico: { agentes: [{ id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade', resultadoPericulosidadeTexto: 'Não caracterizada.' }] },
    modalidade: 'periculosidade',
  },
  {
    nome: 'periculosidade com redação própria e "Sem enquadramento"',
    tecnico: { agentes: [{ id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade', anexoNr16: 'SEM_ENQUADRAMENTO', resultadoPericulosidadeTexto: 'Não caracterizada.' }] },
    modalidade: 'periculosidade',
  },
  {
    nome: 'periculosidade prejudicada sem anexo',
    tecnico: { agentes: [{ id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade', resultadoPericulosidade: 'prejudicada' }] },
    modalidade: 'periculosidade',
  },
  {
    nome: 'periculosidade prejudicada com anexo',
    tecnico: { agentes: [{ id: 'r1', nome: 'Inflamáveis', tipo: 'periculosidade', anexoNr16: 'ANEXO_02', resultadoPericulosidade: 'prejudicada' }] },
    modalidade: 'ambas',
  },
  {
    nome: 'modalidade periculosidade ignora agentes NR-15 herdados',
    tecnico: { agentes: [{ id: 'a1', nome: 'Ruído', tipo: 'fisico', anexoNr15: 'ANEXO_01', epis: EPI }] },
    modalidade: 'periculosidade',
  },
]

describe('paridade da varredura entre a API e o editor', () => {
  it.each(CASOS)('mesmo quadro e mesmas pendências: $nome', ({ tecnico, modalidade }) => {
    const daApi = pendenciasVarredura(tecnico as never, modalidade)
    const doEditor = front.pendenciasVarredura(tecnico as never, modalidade)

    expect(daApi).toEqual(doEditor)
    expect(mensagemPendencias(daApi)).toBe(front.mensagemPendencias(doEditor))
    expect(normalizarVarredura(tecnico as never, modalidade)).toEqual(front.normalizarVarredura(tecnico as never, modalidade))
    expect(exibirQuadroVarredura(tecnico as never)).toEqual(front.exibirQuadroVarredura(tecnico as never))
  })
})
