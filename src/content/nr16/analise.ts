import { ANALISE_ANEXOS_NR16, anexoNr16PorId, linhaAnexoNr16, temAnexoNr16Valido } from '@/content/anexosNr16'
import {
  EXPOSICAO_PERICULOSIDADE,
  fraseSituacaoAreaRiscoNr16,
  textoDistanciaAreaRiscoNr16,
  textoFrequenciaOperacionalNr16,
  textoRelacaoAtividadeNr16,
  textoTempoExposicaoNr16,
} from '@/lib/apresentacaoAgente'
import type { AgenteAvaliado } from '@/types'

/** Tira o ponto final para a frase poder continuar. */
function semPontoFinal(texto: string): string {
  return texto.trim().replace(/[.;:]+$/, '')
}

/** "a", "a e b", "a, b e c". */
function juntar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}

/**
 * A "Análise dos Anexos" escrita a partir do que a tela já registrou.
 *
 * É um ponto de partida editável, não um campo calculado: o botão preenche, e
 * o perito reescreve o que quiser. Por isso só junta dados — anexo, item da
 * norma, atividade, área, distância, exposição —, na ordem em que o laudo os
 * apresenta. O resultado fica de fora de propósito: a análise é o exame, a
 * conclusão é do item 10, e repetir uma na outra obrigaria o perito a mudar
 * dois textos toda vez que revisse a conclusão.
 *
 * Sem anexo da norma (ou em "Sem enquadramento") volta o texto padrão do
 * cenário negativo, que diz contra o que as atividades foram confrontadas.
 */
export function gerarAnaliseNr16(agente: AgenteAvaliado): string {
  const anexo = anexoNr16PorId(agente.anexoNr16)
  if (!anexo) return ANALISE_ANEXOS_NR16

  const enquadramento = agente.enquadramentoNr16?.trim()
  const atividade = agente.atividadeEnquadrada?.trim()
  const delimitacao = agente.delimitacaoAreaRisco?.trim()
  const distancia = textoDistanciaAreaRiscoNr16(agente)
  const exposicao = agente.exposicaoPericulosidadeTexto?.trim()
    || (agente.exposicaoPericulosidade ? EXPOSICAO_PERICULOSIDADE[agente.exposicaoPericulosidade] : '')
  const tempo = textoTempoExposicaoNr16(agente)
  const frequencia = textoFrequenciaOperacionalNr16(agente)
  const relacao = textoRelacaoAtividadeNr16(agente)

  const complementosExposicao = [
    tempo ? `tempo médio de ${tempo}` : '',
    frequencia ? `frequência de ${frequencia}` : '',
  ].filter(Boolean)
  const fraseExposicao = exposicao
    ? `Exposição: ${semPontoFinal(exposicao)}${complementosExposicao.length ? `, com ${juntar(complementosExposicao)}` : ''}.`
    : complementosExposicao.length
      ? `Exposição com ${juntar(complementosExposicao)}.`
      : ''

  return [
    `A atividade efetivamente exercida foi confrontada com o ${linhaAnexoNr16(anexo)} da NR-16`
      + `${enquadramento ? `, no enquadramento ${semPontoFinal(enquadramento)}` : ''}.`,
    atividade ? `Atividade avaliada: ${semPontoFinal(atividade)}.` : '',
    fraseSituacaoAreaRiscoNr16(agente),
    delimitacao ? `Área de risco considerada: ${semPontoFinal(delimitacao)}.` : '',
    distancia ? `Distância verificada: ${semPontoFinal(distancia)}.` : '',
    fraseExposicao,
    relacao ? `Relação com as atividades do trabalhador: ${relacao.toLowerCase()}.` : '',
  ].filter(Boolean).join(' ')
}

/**
 * Combinações que o laudo não sustenta, apontadas enquanto o perito preenche.
 *
 * Nenhuma bloqueia nada: o caso concreto pode justificar o que a regra geral
 * estranha, e a redação própria existe para isso. O aviso só garante que a
 * contradição foi vista antes de o laudo sair.
 */
export function alertasNr16(agente: AgenteAvaliado): string[] {
  const caracteriza = agente.resultadoPericulosidade === 'caracterizada'
    || agente.resultadoPericulosidade === 'caracterizada_parcial'
  const alertas: string[] = []

  if (caracteriza && !temAnexoNr16Valido(agente)) {
    alertas.push('O resultado caracteriza a periculosidade, mas nenhum anexo da NR-16 foi escolhido na etapa 1.')
  }
  if (caracteriza && !agente.exposicaoPericulosidadeTexto?.trim()) {
    if (
      agente.exposicaoPericulosidade === 'fortuita'
      || agente.exposicaoPericulosidade === 'eventual'
      || agente.exposicaoPericulosidade === 'tempo_extremamente_reduzido'
    ) {
      alertas.push(
        'A exposição registrada é das que a Súmula 364 do TST exclui do adicional, mas o resultado caracteriza a periculosidade.',
      )
    }
    if (agente.exposicaoPericulosidade === 'nao_constatada') {
      alertas.push('A exposição foi registrada como não constatada, mas o resultado caracteriza a periculosidade.')
    }
  }
  if (caracteriza && (agente.situacaoAreaRisco === 'fora' || agente.situacaoAreaRisco === 'nao_caracterizada')) {
    alertas.push('A atividade foi registrada fora de área de risco caracterizada, mas o resultado caracteriza a periculosidade.')
  }
  if (agente.resultadoPericulosidade === 'caracterizada_parcial' && !agente.periodoCaracterizacaoNr16?.trim()
    && !agente.resultadoPericulosidadeTexto?.trim()) {
    alertas.push('Na caracterização parcial, informe o período ou a atividade a que ela se restringe.')
  }
  return alertas
}
