import { describe, expect, it } from 'vitest'

import { comFuncaoPosto, montarApresentacaoAgente, rotuloFuncaoPosto } from './apresentacaoAgente'
import {
  ANALISE_ANEXOS_NR16,
  ANALISE_ATIVIDADES_NR16,
  CRITERIO_QUALITATIVO_NR16,
  LAPSO_TEMPORAL_NR16,
  conclusaoSemRiscoNr16,
} from '@/content/anexosNr16'
import type { AgenteAvaliado } from '@/types'

const ruido: AgenteAvaliado = {
  id: 'ruido-1',
  nome: 'Ruído',
  tipo: 'fisico',
  criterio: 'quantitativo',
  anexoNr15: 'ANEXO_01',
  cas: 'não deve aparecer',
  limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
  valorMedido: '90',
  unidadeMedicao: 'dB(A)',
  grau: 'medio',
  epis: [
    { categoria: 'Proteção auditiva', modelo: 'Protetor CA 11882', marca: 'Marca', validadeCa: '31/12/2028', caUnico: '11882', nivelProtecaoDb: 17, metodoAtenuacao: 'NRRsf' },
    { categoria: 'Proteção auditiva', modelo: 'CA sem nível', marca: 'Marca', caUnico: '00000', nivelProtecaoDb: null },
  ],
}

describe('montarApresentacaoAgente', () => {
  it('omite CAS irrelevante e apresenta cálculo individual de cada proteção auditiva', () => {
    const apresentacao = montarApresentacaoAgente(ruido)

    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'CAS' }))
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Medição registrada', valor: '90 dB(A)' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Equipamento', valor: 'Proteção auditiva' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Descrição', valor: 'Protetor CA 11882' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Validade do CA', valor: '31/12/2028' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Cálculo', valor: '90 - 17 = 73 dB(A)' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Conclusão', valor: 'Proteção eficaz (limite de 85 dB(A))', destaque: 'positivo' })
    expect(apresentacao.protecoes[1]?.linhas).toContainEqual({ rotulo: 'NRRsf', valor: 'Não informado — considerado 0 dB', destaque: 'aviso' })
    expect(apresentacao.protecoes[1]?.linhas).toContainEqual({ rotulo: 'Cálculo', valor: '90 - 0 = 90 dB(A)' })
  })

  it('aplica a mesma lógica ao ruído de impacto, com o limite do Anexo 2', () => {
    const apresentacao = montarApresentacaoAgente({
      ...ruido,
      anexoNr15: 'ANEXO_02',
      nome: 'Ruído de impacto',
      limiteTolerancia: '130 dB(C) (resposta Impacto) ou 120 dB(Linear) (resposta Fast)',
      valorMedido: '135',
      unidadeMedicao: 'dB(C)',
    })

    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'NRRsf', valor: '17 dB' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Cálculo', valor: '135 - 17 = 118 dB(C)' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Conclusão', valor: 'Proteção eficaz (limite de 130 dB(C))', destaque: 'positivo' })
    expect(apresentacao.protecoes[0]?.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Eficácia comprovada' }))
  })

  it('mantém CAS e eficácia manual para agente químico legado', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'quimico-1', nome: 'Acetaldeído', tipo: 'quimico', criterio: 'quantitativo',
      anexoNr15: 'ANEXO_11', cas: '75-07-0', valorMedido: '12.5', unidadeMedicao: 'ppm',
      epis: [{ categoria: 'Proteção respiratória', modelo: 'PFF2', marca: 'Marca', caUnico: '5657' }],
      epiEficaz: true,
    })

    expect(apresentacao.linhas).toContainEqual({ rotulo: 'CAS', valor: '75-07-0' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Eficácia comprovada', valor: 'Sim', destaque: 'positivo' })
  })

  it('vários EPIs no mesmo agente saem um a um — não é privilégio do ruído', () => {
    // O trabalhador recebe respirador e luva pelo mesmo agente químico:
    // o parecer precisa nomear cada CA, senão a defesa de um deles fica
    // sem lastro no documento.
    const apresentacao = montarApresentacaoAgente({
      id: 'quimico-2', nome: 'Hidróxido de sódio', tipo: 'quimico', criterio: 'qualitativo',
      anexoNr15: 'ANEXO_13', cas: '1310-73-2',
      epis: [
        { categoria: 'Proteção respiratória', modelo: 'Respirador PFF2', marca: '3M', caUnico: '5657' },
        { categoria: 'Proteção das mãos', modelo: 'Luva nitrílica', marca: 'Volk', caUnico: '28956' },
      ],
      epiEficaz: true,
    })

    expect(apresentacao.protecoes).toHaveLength(2)
    expect(apresentacao.protecoes[0]?.titulo).toContain('1')
    expect(apresentacao.protecoes[1]?.titulo).toContain('2')
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Descrição', valor: 'Respirador PFF2' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Validade do CA', valor: 'Não informada' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'CA', valor: '5657' })
    expect(apresentacao.protecoes[1]?.linhas).toContainEqual({ rotulo: 'Descrição', valor: 'Luva nitrílica' })
    expect(apresentacao.protecoes[1]?.linhas).toContainEqual({ rotulo: 'CA', valor: '28956' })
  })

  it('sem medição da empresa, não há o que explicar sobre a origem', () => {
    const apresentacao = montarApresentacaoAgente(ruido)

    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Origem da medição' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Base da medição' }))
  })

  it('escreve a fonte do ruído por extenso, não o rótulo do seletor', () => {
    const apresentacao = montarApresentacaoAgente({ ...ruido, fonteRuido: 'ruido_fundo' })

    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Fonte do ruído',
      valor: 'Não há fonte direta de ruído no local. O nível identificado corresponde ao ruído de fundo.',
    })
  })

  it('adota o topo da faixa da empresa e mostra o intervalo inteiro', () => {
    const apresentacao = montarApresentacaoAgente({
      ...ruido,
      valorMedido: undefined,
      origemMedicao: 'empresa',
      medicaoEmpresa: '83',
      medicaoEmpresaAte: '88.5',
      fonteMedicaoEmpresa: 'PGR 2024',
    })

    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Medição registrada', valor: '88,5 dB(A)' })
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Medição da empresa – PGR / Laudos Ocupacionais',
      valor: 'entre 83 e 88,5 dB(A)',
    })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Documento da empresa', valor: 'PGR 2024' })
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Base da medição',
      valor: 'Medição conforme registros apresentados junto ao processo.',
    })
  })

  it('com a do perito adotada, registra a origem sem repetir a faixa descartada', () => {
    const apresentacao = montarApresentacaoAgente({
      ...ruido, medicaoEmpresa: '83', medicaoEmpresaAte: '88.5',
    })

    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Medição registrada', valor: '90 dB(A)' })
    expect(apresentacao.linhas).not.toContainEqual(
      expect.objectContaining({ rotulo: 'Medição da empresa – PGR / Laudos Ocupacionais (não adotada)' }),
    )
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Origem da medição', valor: 'Perito — medição em perícia', destaque: 'aviso',
    })
  })

  it('resume a medição escolhida sem repetir no parecer as alternativas descartadas', () => {
    const apresentacao = montarApresentacaoAgente({
      ...ruido,
      medicaoEmpresa: '83',
      medicaoEmpresaAte: '88.5',
      origemMedicao: 'perito',
    })

    expect(apresentacao.linhas).not.toContainEqual(
      expect.objectContaining({ rotulo: 'Medição da empresa – PGR / Laudos Ocupacionais (não adotada)' }),
    )
    expect(apresentacao.linhas).not.toContainEqual(
      expect.objectContaining({ rotulo: 'Medição do perito (não adotada)' }),
    )
  })

  it('apresenta a terceira alternativa da empresa com o texto aprovado', () => {
    const apresentacao = montarApresentacaoAgente({
      ...ruido,
      tipoMedicaoEmpresa: 'registros_processo',
      fonteMedicaoEmpresa: 'Documentos juntados aos autos',
    } as AgenteAvaliado)

    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Medição da empresa – PGR / Laudos Ocupacionais',
      valor: 'Medição conforme registros apresentados junto ao processo.',
    })
    expect(JSON.stringify(apresentacao)).not.toMatch(/opção adotada/i)
  })

  it('monta a matriz própria da NR-16 sem propriedades da NR-15', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'periculosidade-1',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      atividadeEnquadrada: 'Operação em bomba de abastecimento',
      areaRisco: 'Área de operação da bomba de inflamáveis líquidos',
      exposicaoPericulosidade: 'intermitente',
      resultadoPericulosidade: 'caracterizada',
    } as AgenteAvaliado)

    expect(apresentacao.titulo).toBe('Inflamáveis')
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Anexo NR-16',
      valor: 'Anexo 2 — Atividades e Operações Perigosas com Inflamáveis',
    })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Adicional Pretendido', valor: '30%' })
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Condição ou área de risco',
      valor: 'Área de operação da bomba de inflamáveis líquidos',
    })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Exposição', valor: 'Intermitente' })
    // O item 7 levanta; quem conclui é o item 10. Imprimir o resultado aqui
    // antecipava a conclusão e tornava os dois itens redundantes — foi o
    // próprio perito quem apontou.
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Resultado técnico' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Anexo NR-15' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Grau' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'CAS' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Limite de tolerância' }))
  })

  it('mantém o adicional pretendido no cenário negativo — é o que a parte pede', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'periculosidade-2',
      nome: 'Ausência de atividade ou operação perigosa enquadrável na NR-16',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      analiseAnexos: ANALISE_ANEXOS_NR16,
      exposicaoPericulosidade: 'nao_constatada',
      resultadoPericulosidade: 'nao_caracterizada',
    } as AgenteAvaliado)

    // Os 30% são a pretensão da inicial, não o que o laudo reconhece — por
    // isso o rótulo por extenso, e por isso a linha sai também aqui.
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Adicional Pretendido', valor: '30%' })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Natureza', valor: 'Periculosidade' })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Critério', valor: CRITERIO_QUALITATIVO_NR16 })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Lapso temporal', valor: LAPSO_TEMPORAL_NR16 })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Análise dos Anexos', valor: ANALISE_ANEXOS_NR16 })
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Exposição',
      valor: 'Não constatada exposição a condição de risco que atenda aos critérios normativos de caracterização.',
    })
    // A conclusão é do item 10.
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Resultado técnico' }))
  })

  it('monta o quadro conclusivo do item 10 com as duas linhas do modelo', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'periculosidade-2b',
      nome: 'Ausência de atividade ou operação perigosa enquadrável na NR-16',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      exposicaoPericulosidade: 'nao_constatada',
      resultadoPericulosidade: 'nao_caracterizada',
    } as AgenteAvaliado, { conclusiva: true })

    expect(apresentacao.linhas).toHaveLength(2)
    expect(apresentacao.linhas[0]).toEqual({
      rotulo: 'Condição / Atividades',
      valor: `${ANALISE_ATIVIDADES_NR16}\n${LAPSO_TEMPORAL_NR16}`,
    })
    // Sem anexo escolhido, a conclusão percorre os sete anexos — não basta
    // dizer que nada foi caracterizado.
    expect(apresentacao.linhas[1]).toEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: conclusaoSemRiscoNr16(),
      destaque: 'positivo',
    })
    expect(apresentacao.linhas[1]?.valor).toContain('Todos os anexos foram observados:')
    expect(apresentacao.linhas[1]?.valor).toContain('Anexo 1 – Explosivos')
    expect(apresentacao.linhas[1]?.valor).toContain('Anexo (*) – Radiações ionizantes ou substâncias radioativas')
  })

  it('leva a observação e os EPIs do agente para o quadro do item 10', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'periculosidade-2c',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      resultadoPericulosidade: 'caracterizada',
      observacao: 'Ressalva quanto ao período anterior à reforma do pátio.',
      epis: [{ categoria: 'Luva', modelo: 'Nitrílica NL-30', caUnico: '9111' }],
    } as AgenteAvaliado, { conclusiva: true })

    // A observação entra junto da conclusão que ela comenta, separada por uma
    // linha em branco — não tem outro lugar no laudo onde sair.
    expect(apresentacao.linhas[1]).toEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: 'Periculosidade caracterizada\n\nRessalva quanto ao período anterior à reforma do pátio.',
      destaque: 'negativo',
    })
    // O agente de periculosidade não entra na seção de EPIs: este quadro é o
    // único lugar do laudo onde as proteções dele aparecem.
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Proteções associadas',
      valor: 'Proteção 1: Nitrílica NL-30 — CA 9111',
    })
  })

  it('imprime os pontos de verificação do anexo, na ordem gravada e sem os vazios', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'periculosidade-3',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      areaRisco: 'Bomba de abastecimento no pátio',
      exposicaoPericulosidade: 'permanente',
      resultadoPericulosidade: 'caracterizada',
      detalhesNr16: [
        { id: 'produto', rotulo: 'Produto inflamável ou combustível', valor: 'Óleo diesel S10' },
        { id: 'fds', rotulo: 'Ficha com Dados de Segurança (FDS)', valor: '   ' },
        { id: 'local', rotulo: 'Local da operação', valor: 'Tanque aéreo' },
      ],
    } as AgenteAvaliado)

    const rotulos = apresentacao.linhas.map((linha) => linha.rotulo)
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Produto inflamável ou combustível',
      valor: 'Óleo diesel S10',
    })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Local da operação', valor: 'Tanque aéreo' })
    // Campo em branco não vira linha vazia no meio da tabela.
    expect(rotulos).not.toContain('Ficha com Dados de Segurança (FDS)')
    // Os pontos entram depois da área de risco e antes da exposição.
    expect(rotulos.indexOf('Produto inflamável ou combustível'))
      .toBeGreaterThan(rotulos.indexOf('Condição ou área de risco'))
    expect(rotulos.indexOf('Local da operação')).toBeLessThan(rotulos.indexOf('Exposição'))
  })

  it('deixa a redação própria vencer o seletor, inclusive para o adicional', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'periculosidade-4',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      exposicaoPericulosidade: 'permanente',
      resultadoPericulosidade: 'nao_caracterizada',
      exposicaoPericulosidadeTexto: 'Exposição nas três horas diárias de abastecimento da frota.',
      resultadoPericulosidadeTexto: 'Caracterizada a periculosidade apenas de 2019 a 2022.',
    } as AgenteAvaliado)

    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Exposição',
      valor: 'Exposição nas três horas diárias de abastecimento da frota.',
    })
    expect(apresentacao.linhas).not.toContainEqual({ rotulo: 'Exposição', valor: 'Permanente' })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Adicional Pretendido', valor: '30%' })

    // O resultado escrito à mão vence o seletor — e vence no item 10, que é
    // onde o resultado sai.
    const conclusiva = montarApresentacaoAgente({
      id: 'periculosidade-4',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      exposicaoPericulosidade: 'permanente',
      resultadoPericulosidade: 'nao_caracterizada',
      exposicaoPericulosidadeTexto: 'Exposição nas três horas diárias de abastecimento da frota.',
      resultadoPericulosidadeTexto: 'Caracterizada a periculosidade apenas de 2019 a 2022.',
    } as AgenteAvaliado, { conclusiva: true })

    expect(conclusiva.linhas).toContainEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: 'Caracterizada a periculosidade apenas de 2019 a 2022.',
    })
  })
})

// ============================================================
// O levantamento estruturado da NR-16: anexo → item → atividade → condição e
// área → exposição, com tempo, frequência e relação.
// ============================================================

const postoDeCombustivel: AgenteAvaliado = {
  id: 'nr16-posto',
  nome: 'Inflamáveis',
  tipo: 'periculosidade',
  criterio: 'qualitativo',
  anexoNr16: 'ANEXO_02',
  enquadramentoNr16: 'NR-16, Anexo 2, item 1, alínea m',
  atividadeEnquadrada: 'Abastecimento de veículos com óleo diesel',
  situacaoAreaRisco: 'dentro',
  presencaAreaRisco: 'permanencia',
  delimitacaoAreaRisco: 'Círculo com raio de 7,5 metros com centro no ponto de abastecimento',
  distanciaAreaRisco: '3',
  areaRisco: 'Bomba no pátio de manobras',
  analiseAnexos: 'Análise do perito.',
  exposicaoPericulosidade: 'intermitente',
  tempoExposicaoNr16: '40',
  unidadeTempoExposicaoNr16: 'minutos_dia',
  frequenciaOperacionalNr16: '3',
  periodicidadeOperacionalNr16: 'semana',
  relacaoAtividadeNr16: 'principal',
  resultadoPericulosidade: 'caracterizada',
}

describe('levantamento estruturado da NR-16', () => {
  it('imprime cada dado numa linha, na ordem do raciocínio pericial', () => {
    expect(montarApresentacaoAgente(postoDeCombustivel).linhas).toEqual([
      { rotulo: 'Anexo NR-16', valor: 'Anexo 2 — Atividades e Operações Perigosas com Inflamáveis' },
      { rotulo: 'Natureza', valor: 'Periculosidade' },
      { rotulo: 'Critério', valor: CRITERIO_QUALITATIVO_NR16 },
      { rotulo: 'Lapso temporal', valor: LAPSO_TEMPORAL_NR16 },
      { rotulo: 'Adicional Pretendido', valor: '30%' },
      { rotulo: 'Enquadramento normativo', valor: 'NR-16, Anexo 2, item 1, alínea m' },
      { rotulo: 'Atividade ou operação avaliada', valor: 'Abastecimento de veículos com óleo diesel' },
      {
        rotulo: 'Condição ou área de risco',
        valor: [
          'Atividade exercida dentro da área de risco, com permanência.',
          'Área de risco: Círculo com raio de 7,5 metros com centro no ponto de abastecimento',
          'Distância verificada: 3 metros',
          'Bomba no pátio de manobras',
        ].join('\n'),
      },
      { rotulo: 'Análise dos Anexos', valor: 'Análise do perito.' },
      { rotulo: 'Exposição', valor: 'Intermitente' },
      { rotulo: 'Tempo médio de exposição', valor: '40 minutos por dia' },
      { rotulo: 'Frequência operacional', valor: '3 vezes por semana' },
      { rotulo: 'Relação com a atividade', valor: 'Atividade principal' },
    ])
  })

  it('não cria linha para o que ficou em branco — o laudo antigo sai como antes', () => {
    const rotulos = montarApresentacaoAgente({
      ...postoDeCombustivel,
      enquadramentoNr16: '  ',
      situacaoAreaRisco: undefined,
      presencaAreaRisco: undefined,
      delimitacaoAreaRisco: undefined,
      distanciaAreaRisco: '',
      areaRisco: undefined,
      tempoExposicaoNr16: undefined,
      frequenciaOperacionalNr16: '',
      relacaoAtividadeNr16: undefined,
    }).linhas.map((linha) => linha.rotulo)

    for (const rotulo of [
      'Enquadramento normativo', 'Condição ou área de risco', 'Tempo médio de exposição',
      'Frequência operacional', 'Relação com a atividade',
    ]) {
      expect(rotulos).not.toContain(rotulo)
    }
  })

  it('“Sem enquadramento em Anexo” não imprime linha de anexo e conclui com o rol dos anexos', () => {
    const semEnquadramento: AgenteAvaliado = {
      id: 'nr16-sem',
      nome: 'Ausência de atividade ou operação perigosa enquadrável na NR-16',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'SEM_ENQUADRAMENTO',
      exposicaoPericulosidade: 'nao_constatada',
      resultadoPericulosidade: 'nao_caracterizada',
    }

    expect(montarApresentacaoAgente(semEnquadramento).linhas)
      .not.toContainEqual(expect.objectContaining({ rotulo: 'Anexo NR-16' }))
    expect(montarApresentacaoAgente(semEnquadramento, { conclusiva: true }).linhas[1]).toEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: conclusaoSemRiscoNr16(),
      destaque: 'positivo',
    })
  })

  it('cita o enquadramento na conclusão, e o período na caracterização parcial', () => {
    const conclusao = (agente: AgenteAvaliado) =>
      montarApresentacaoAgente(agente, { conclusiva: true }).linhas[1]

    expect(conclusao(postoDeCombustivel)).toEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: 'Periculosidade caracterizada (NR-16, Anexo 2, item 1, alínea m)',
      destaque: 'negativo',
    })
    expect(conclusao({
      ...postoDeCombustivel,
      resultadoPericulosidade: 'caracterizada_parcial',
      periodoCaracterizacaoNr16: 'de 03/2021 a 06/2022',
    })).toEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: 'Periculosidade caracterizada parcialmente (NR-16, Anexo 2, item 1, alínea m) — de 03/2021 a 06/2022',
      destaque: 'negativo',
    })
    // O período não imprime fora da parcial, mesmo que tenha ficado gravado.
    expect(conclusao({ ...postoDeCombustivel, periodoCaracterizacaoNr16: 'de 03/2021 a 06/2022' })?.valor)
      .toBe('Periculosidade caracterizada (NR-16, Anexo 2, item 1, alínea m)')
    expect(conclusao({ ...postoDeCombustivel, resultadoPericulosidade: 'prejudicada' })).toEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: 'Não foi possível caracterizar a periculosidade, por insuficiência de elementos técnicos.',
      destaque: 'aviso',
    })
  })

  it('dá unidade ao número digitado sozinho e respeita o texto livre', () => {
    const linha = (agente: Partial<AgenteAvaliado>, rotulo: string) =>
      montarApresentacaoAgente({ ...postoDeCombustivel, ...agente }).linhas
        .find((item) => item.rotulo === rotulo)?.valor

    expect(linha({ distanciaAreaRisco: '7.5' }, 'Condição ou área de risco')).toContain('Distância verificada: 7,5 metros')
    expect(linha({ distanciaAreaRisco: '1' }, 'Condição ou área de risco')).toContain('Distância verificada: 1 metro')
    // Ponto de milhar não vira decimal: 1.100 metros não são 1,1 metro.
    expect(linha({ distanciaAreaRisco: '1.100' }, 'Condição ou área de risco')).toContain('Distância verificada: 1.100 metros')
    expect(linha({ distanciaAreaRisco: '1.000' }, 'Condição ou área de risco')).toContain('Distância verificada: 1.000 metros')
    expect(linha({ distanciaAreaRisco: '1.000,5' }, 'Condição ou área de risco'))
      .toContain('Distância verificada: 1.000,5 metros')
    expect(linha({ tempoExposicaoNr16: '1.000,5', unidadeTempoExposicaoNr16: 'minutos_dia' }, 'Tempo médio de exposição'))
      .toBe('1.000,5 minutos por dia')
    expect(linha({ frequenciaOperacionalNr16: '1.000', periodicidadeOperacionalNr16: 'mes' }, 'Frequência operacional'))
      .toBe('1.000 vezes por mês')
    expect(linha({ distanciaAreaRisco: 'junto ao bocal' }, 'Condição ou área de risco'))
      .toContain('Distância verificada: junto ao bocal')

    expect(linha({ tempoExposicaoNr16: '1', unidadeTempoExposicaoNr16: 'horas_dia' }, 'Tempo médio de exposição'))
      .toBe('1 hora por dia')
    expect(linha({ tempoExposicaoNr16: '2 a 3', unidadeTempoExposicaoNr16: 'horas_dia' }, 'Tempo médio de exposição'))
      .toBe('2 a 3 horas por dia')
    // Sem unidade escolhida, o número sai como foi digitado — não se adivinha.
    expect(linha({ tempoExposicaoNr16: '40', unidadeTempoExposicaoNr16: undefined }, 'Tempo médio de exposição'))
      .toBe('40')
    expect(linha({ tempoExposicaoNr16: 'entre 10 e 15 minutos', unidadeTempoExposicaoNr16: 'minutos_dia' }, 'Tempo médio de exposição'))
      .toBe('entre 10 e 15 minutos')

    expect(linha({ frequenciaOperacionalNr16: '1', periodicidadeOperacionalNr16: 'mes' }, 'Frequência operacional'))
      .toBe('1 vez por mês')
    expect(linha({ frequenciaOperacionalNr16: '2', periodicidadeOperacionalNr16: undefined }, 'Frequência operacional'))
      .toBe('2 vezes')
    expect(linha({ frequenciaOperacionalNr16: 'diariamente', periodicidadeOperacionalNr16: 'semana' }, 'Frequência operacional'))
      .toBe('diariamente')
  })

  it('só descreve a presença quando a atividade toca a área de risco', () => {
    const condicao = (agente: Partial<AgenteAvaliado>) =>
      montarApresentacaoAgente({
        ...postoDeCombustivel,
        delimitacaoAreaRisco: undefined,
        distanciaAreaRisco: undefined,
        areaRisco: undefined,
        ...agente,
      }).linhas.find((item) => item.rotulo === 'Condição ou área de risco')?.valor

    expect(condicao({ situacaoAreaRisco: 'fora', presencaAreaRisco: 'permanencia' }))
      .toBe('Atividade exercida fora da área de risco.')
    expect(condicao({ situacaoAreaRisco: 'nao_caracterizada', presencaAreaRisco: 'circulacao' }))
      .toBe('Área de risco não caracterizada.')
    expect(condicao({ situacaoAreaRisco: 'parcialmente_dentro', presencaAreaRisco: 'circulacao' }))
      .toBe('Atividade exercida parcialmente dentro da área de risco, em circulação.')
    expect(condicao({ situacaoAreaRisco: undefined, presencaAreaRisco: 'acesso_eventual' }))
      .toBe('Acesso eventual à área de risco.')
  })

  it('separa as duas hipóteses da Súmula 364 e mantém o texto dos laudos antigos', () => {
    const exposicao = (exposicaoPericulosidade: AgenteAvaliado['exposicaoPericulosidade']) =>
      montarApresentacaoAgente({ ...postoDeCombustivel, exposicaoPericulosidade }).linhas
        .find((item) => item.rotulo === 'Exposição')?.valor

    expect(exposicao('fortuita')).toBe('Eventual, assim considerado o contato fortuito')
    expect(exposicao('tempo_extremamente_reduzido')).toBe('Habitual, por tempo extremamente reduzido')
    expect(exposicao('eventual')).toBe('Eventual ou por tempo extremamente reduzido')
  })
})

// ============================================================
// O mesmo agente, uma vez por função.
//
// O trabalhador teve dois postos no lapso examinado: ruído na prensa e ruído
// na expedição são dois lançamentos, com medição, EPI e conclusão próprios.
// O agente guarda só o id do período; o rótulo é resolvido na hora de
// imprimir, porque renomear a função no item 7.1 tem de alcançar o laudo.
// ============================================================
describe('função e posto do agente', () => {
  const PERIODOS = [
    { id: 'per-prensa', funcao: 'Prensista', setor: 'Estamparia' },
    { id: 'per-expedicao', funcao: 'Auxiliar de expedição' },
    { id: 'per-sem-funcao', funcao: '   ', setor: 'Almoxarifado' },
    { id: 'per-vazio', funcao: '' },
  ]

  it('junta função e setor, e aceita ter só um dos dois', () => {
    expect(rotuloFuncaoPosto(PERIODOS[0])).toBe('Prensista — Estamparia')
    expect(rotuloFuncaoPosto(PERIODOS[1])).toBe('Auxiliar de expedição')
    expect(rotuloFuncaoPosto(PERIODOS[2])).toBe('Almoxarifado')
    expect(rotuloFuncaoPosto(PERIODOS[3])).toBe('')
    expect(rotuloFuncaoPosto(undefined)).toBe('')
  })

  it('resolve o rótulo de cada agente pelo período vinculado', () => {
    const [naPrensa, naExpedicao] = comFuncaoPosto(
      [{ ...ruido, id: 'r1', periodoId: 'per-prensa' }, { ...ruido, id: 'r2', periodoId: 'per-expedicao' }],
      PERIODOS,
    )

    expect(naPrensa?.funcaoPosto).toBe('Prensista — Estamparia')
    expect(naExpedicao?.funcaoPosto).toBe('Auxiliar de expedição')
  })

  it('não inventa rótulo para agente sem vínculo nem para período apagado', () => {
    const [semVinculo, orfao] = comFuncaoPosto(
      [{ ...ruido, id: 'r1' }, { ...ruido, id: 'r2', periodoId: 'per-que-o-perito-apagou' }],
      PERIODOS,
    )

    expect(semVinculo?.funcaoPosto).toBeUndefined()
    expect(orfao?.funcaoPosto).toBeUndefined()
  })

  it('não grava o rótulo no agente — só o devolve resolvido', () => {
    const agente = { ...ruido, periodoId: 'per-prensa' }
    comFuncaoPosto([agente], PERIODOS)

    expect(agente).not.toHaveProperty('funcaoPosto')
  })

  it('abre os três quadros pela função, e só quando há função', () => {
    const nr16 = {
      id: 'nr16', nome: 'Inflamáveis', tipo: 'periculosidade', criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02', resultadoPericulosidade: 'caracterizada',
    } as const
    const funcaoPosto = 'Prensista — Estamparia'
    const primeiraLinha = { rotulo: 'Função / Posto', valor: funcaoPosto }

    // NR-15, quadro do item 7.2.
    expect(montarApresentacaoAgente({ ...ruido, funcaoPosto }).linhas[0]).toEqual(primeiraLinha)
    // NR-16, levantamento do item 7.
    expect(montarApresentacaoAgente({ ...nr16, funcaoPosto }).linhas[0]).toEqual(primeiraLinha)
    // NR-16, quadro conclusivo do item 10.
    expect(montarApresentacaoAgente({ ...nr16, funcaoPosto }, { conclusiva: true }).linhas[0])
      .toEqual(primeiraLinha)
  })

  it('não muda nada no laudo de função única, que é toda perícia gravada até hoje', () => {
    // A linha só existe quando há rótulo. Sem vínculo, o documento sai igual
    // ao de antes — inclusive os registros antigos, que não têm o campo.
    expect(montarApresentacaoAgente(ruido).linhas)
      .toEqual(montarApresentacaoAgente({ ...ruido, funcaoPosto: undefined }).linhas)
    expect(montarApresentacaoAgente(ruido).linhas)
      .not.toContainEqual(expect.objectContaining({ rotulo: 'Função / Posto' }))
  })
})
