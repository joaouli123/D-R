import { describe, expect, it } from 'vitest'

import { alertasNr16, gerarAnaliseNr16 } from './analise'
import { ANALISE_ANEXOS_NR16, SEM_ENQUADRAMENTO_NR16 } from '@/content/anexosNr16'
import type { AgenteAvaliado } from '@/types'

const base: AgenteAvaliado = {
  id: 'nr16-1',
  nome: 'Inflamáveis',
  tipo: 'periculosidade',
  criterio: 'qualitativo',
}

const postoDeCombustivel: AgenteAvaliado = {
  ...base,
  anexoNr16: 'ANEXO_02',
  enquadramentoNr16: 'NR-16, Anexo 2, item 1, alínea m',
  atividadeEnquadrada: 'Abastecimento de veículos com óleo diesel.',
  situacaoAreaRisco: 'dentro',
  presencaAreaRisco: 'permanencia',
  delimitacaoAreaRisco: 'Círculo com raio de 7,5 metros com centro no ponto de abastecimento',
  distanciaAreaRisco: '3',
  exposicaoPericulosidade: 'intermitente',
  tempoExposicaoNr16: '40',
  unidadeTempoExposicaoNr16: 'minutos_dia',
  frequenciaOperacionalNr16: '3',
  periodicidadeOperacionalNr16: 'semana',
  relacaoAtividadeNr16: 'principal',
}

describe('gerarAnaliseNr16', () => {
  it('sem anexo da norma devolve o texto padrão do cenário negativo', () => {
    expect(gerarAnaliseNr16(base)).toBe(ANALISE_ANEXOS_NR16)
    expect(gerarAnaliseNr16({ ...postoDeCombustivel, anexoNr16: SEM_ENQUADRAMENTO_NR16 })).toBe(ANALISE_ANEXOS_NR16)
    // Rótulo antigo gravado à mão não é anexo que a análise possa citar.
    expect(gerarAnaliseNr16({ ...base, anexoNr16: 'Anexo 2' })).toBe(ANALISE_ANEXOS_NR16)
  })

  it('junta os dados na ordem do laudo — e deixa o resultado de fora', () => {
    expect(gerarAnaliseNr16({ ...postoDeCombustivel, resultadoPericulosidade: 'caracterizada' })).toBe([
      'A atividade efetivamente exercida foi confrontada com o Anexo 2 – Inflamáveis da NR-16,'
        + ' no enquadramento NR-16, Anexo 2, item 1, alínea m.',
      'Atividade avaliada: Abastecimento de veículos com óleo diesel.',
      'Atividade exercida dentro da área de risco, com permanência.',
      'Área de risco considerada: Círculo com raio de 7,5 metros com centro no ponto de abastecimento.',
      'Distância verificada: 3 metros.',
      'Exposição: Intermitente, com tempo médio de 40 minutos por dia e frequência de 3 vezes por semana.',
      'Relação com as atividades do trabalhador: atividade principal.',
    ].join(' '))
  })

  it('com só o anexo, fica só a frase do confronto', () => {
    expect(gerarAnaliseNr16({ ...base, anexoNr16: 'ANEXO_04' }))
      .toBe('A atividade efetivamente exercida foi confrontada com o Anexo 4 – Energia elétrica da NR-16.')
  })

  it('monta a exposição com o que houver: complemento sem opção, redação própria no lugar da opção', () => {
    const soTempo = gerarAnaliseNr16({
      ...base,
      anexoNr16: 'ANEXO_02',
      tempoExposicaoNr16: '1',
      unidadeTempoExposicaoNr16: 'horas_dia',
    })
    expect(soTempo).toContain('Exposição com tempo médio de 1 hora por dia.')

    const redacaoPropria = gerarAnaliseNr16({
      ...postoDeCombustivel,
      exposicaoPericulosidadeTexto: 'Habitual, durante as descargas do caminhão-tanque.',
      tempoExposicaoNr16: '',
      frequenciaOperacionalNr16: 'entre duas e três descargas por semana',
    })
    expect(redacaoPropria).toContain(
      'Exposição: Habitual, durante as descargas do caminhão-tanque, com frequência de entre duas e três descargas por semana.',
    )
    expect(redacaoPropria).not.toContain('Intermitente')
  })

  it('não repete a presença quando a atividade é fora da área', () => {
    const fora = gerarAnaliseNr16({ ...postoDeCombustivel, situacaoAreaRisco: 'fora' })
    expect(fora).toContain('Atividade exercida fora da área de risco.')
    expect(fora).not.toContain('permanência')
  })
})

describe('alertasNr16', () => {
  it('não aponta nada numa avaliação coerente', () => {
    expect(alertasNr16(base)).toEqual([])
    expect(alertasNr16({ ...postoDeCombustivel, resultadoPericulosidade: 'caracterizada' })).toEqual([])
    expect(alertasNr16({
      ...base,
      anexoNr16: SEM_ENQUADRAMENTO_NR16,
      exposicaoPericulosidade: 'nao_constatada',
      situacaoAreaRisco: 'fora',
      resultadoPericulosidade: 'nao_caracterizada',
    })).toEqual([])
  })

  it('aponta caracterização sem anexo — inclusive com “Sem enquadramento” escolhido', () => {
    const aviso = 'O resultado caracteriza a periculosidade, mas nenhum anexo da NR-16 foi escolhido na etapa 1.'
    expect(alertasNr16({ ...base, resultadoPericulosidade: 'caracterizada' })).toEqual([aviso])
    expect(alertasNr16({ ...base, anexoNr16: SEM_ENQUADRAMENTO_NR16, resultadoPericulosidade: 'caracterizada' }))
      .toEqual([aviso])
  })

  it('aponta exposição que a Súmula 364 exclui, salvo quando o perito a redigiu', () => {
    const aviso = 'A exposição registrada é das que a Súmula 364 do TST exclui do adicional, mas o resultado caracteriza a periculosidade.'
    for (const exposicaoPericulosidade of ['fortuita', 'eventual', 'tempo_extremamente_reduzido'] as const) {
      expect(alertasNr16({ ...postoDeCombustivel, exposicaoPericulosidade, resultadoPericulosidade: 'caracterizada' }))
        .toEqual([aviso])
    }
    expect(alertasNr16({
      ...postoDeCombustivel,
      exposicaoPericulosidade: 'fortuita',
      exposicaoPericulosidadeTexto: 'Habitual, embora breve a cada abastecimento.',
      resultadoPericulosidade: 'caracterizada',
    })).toEqual([])
    // Não caracterizar com exposição fortuita é justamente o que a súmula manda.
    expect(alertasNr16({ ...postoDeCombustivel, exposicaoPericulosidade: 'fortuita', resultadoPericulosidade: 'nao_caracterizada' }))
      .toEqual([])
  })

  it('aponta exposição não constatada e atividade fora da área num resultado positivo', () => {
    expect(alertasNr16({
      ...postoDeCombustivel,
      exposicaoPericulosidade: 'nao_constatada',
      situacaoAreaRisco: 'nao_caracterizada',
      resultadoPericulosidade: 'caracterizada',
    })).toEqual([
      'A exposição foi registrada como não constatada, mas o resultado caracteriza a periculosidade.',
      'A atividade foi registrada fora de área de risco caracterizada, mas o resultado caracteriza a periculosidade.',
    ])
  })

  it('na caracterização parcial, pede o período até ele — ou a redação própria — existir', () => {
    const aviso = 'Na caracterização parcial, informe o período ou a atividade a que ela se restringe.'
    const parcial: AgenteAvaliado = { ...postoDeCombustivel, resultadoPericulosidade: 'caracterizada_parcial' }
    expect(alertasNr16(parcial)).toEqual([aviso])
    expect(alertasNr16({ ...parcial, periodoCaracterizacaoNr16: '   ' })).toEqual([aviso])
    expect(alertasNr16({ ...parcial, periodoCaracterizacaoNr16: 'de 03/2021 a 06/2022' })).toEqual([])
    expect(alertasNr16({ ...parcial, resultadoPericulosidadeTexto: 'Caracterizada apenas no período de 2021.' }))
      .toEqual([])
  })
})
