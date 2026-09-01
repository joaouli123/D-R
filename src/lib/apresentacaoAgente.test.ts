import { describe, expect, it } from 'vitest'

import { montarApresentacaoAgente } from './apresentacaoAgente'
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
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Adicional', valor: '30%' })
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Condição ou área de risco',
      valor: 'Área de operação da bomba de inflamáveis líquidos',
    })
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Exposição', valor: 'Intermitente' })
    expect(apresentacao.linhas).toContainEqual({
      rotulo: 'Resultado técnico',
      valor: 'Periculosidade caracterizada',
      destaque: 'negativo',
    })
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Anexo NR-15' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Grau' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'CAS' }))
    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Limite de tolerância' }))
  })
})
