// Espelha agentesNr15SemConclusao de server/src/services/documento-comum.ts.
// Os dois precisam mudar juntos.
//
// O front e a API são projetos TypeScript separados (o servidor tem rootDir
// próprio e o alias "@" do Vite só enxerga ./src), então a convenção do repo
// é duplicar e travar a paridade num teste — ver src/lib/listasDocumento.ts.
//
// Por que virou função compartilhada: a mesma pendência era calculada duas
// vezes, com regras diferentes. A API já ignorava as avaliações NR-15 quando
// o processo é só de periculosidade; o editor, não. O que o perito via era
// uma pendência impossível de resolver — o documento se recusava a fechar
// cobrando a conclusão de um agente que a própria modalidade do processo
// tinha tirado da tela.

import { SEM_ENQUADRAMENTO_NR16, temAnexoNr16Valido } from '@/content/anexosNr16'
import { usaAtenuacaoRuido } from './nr15'

/** Só o que decide a pendência. Aceita o agente do front e o do documento. */
export interface AgenteComConclusao {
  nome?: string | null
  tipo?: string | null
  observacao?: string | null
}

/** Avaliações NR-15 sempre precisam levar sua conclusão individual ao documento. */
export function agentesNr15SemConclusao(
  tecnico?: { agentes?: AgenteComConclusao[] } | null,
  modalidade?: string | null,
): string[] {
  if (modalidade === 'periculosidade') return []

  return (tecnico?.agentes ?? [])
    .filter((agente) => agente.tipo !== 'periculosidade' && !agente.observacao?.trim())
    .map((agente) => agente.nome?.trim() || 'Agente sem identificação')
}

/**
 * O bloco "Conclusão" só existe quando há o que escrever nele.
 *
 * A regra tem duas metades. Avaliação de periculosidade nunca leva conclusão
 * individual: a NR-16 conclui no bloco próprio, mais abaixo. E avaliação
 * NR-15 sem texto também não: o título sozinho, pendurado no fim do quadro,
 * era o que o perito via como pendência dentro do documento pronto — um
 * "Conclusão" seguido de nada, impossível de distinguir de uma falha do
 * gerador. Quando há conclusão de verdade, agentesNr15SemConclusao já
 * garantiu que ela estava preenchida antes de o arquivo ser emitido.
 *
 * Os três renderizadores (pré-visualização, PDF e DOCX) chamam esta mesma
 * regra — é o que os mantém idênticos.
 */
export function agenteExibeConclusao(agente: AgenteComConclusao): boolean {
  return agente.tipo !== 'periculosidade' && Boolean(agente.observacao?.trim())
}

// ============================================================
// O que falta em UMA avaliação para ela poder ir ao documento.
//
// Nasceu do retorno do perito: "a parte de agentes x EPIs está boa, mas o
// preenchimento ainda gera certa dificuldade" — e o aviso que travou a
// emissão foi "NR-15, Anexo 1: sem eficácia do EPI". O Anexo 1 é ruído, e no
// ruído a eficácia sai da conta medição − NRRsf: a tela nem mostrava a
// pergunta. A emissão cobrava um campo que o perito não tinha onde preencher.
//
// A regra agora é uma só, por avaliação, e a tela, a lista de pendências e a
// API a leem daqui (espelho em server/src/services/documento-comum.ts).
// ============================================================

/** O campo da tela que resolve a pendência — a lista de pendências leva o perito até ele. */
export type CampoPendenteAgente = 'observacao' | 'epiEficaz' | 'resultadoPericulosidade' | 'anexoNr16'

export interface AgenteComPendencias extends AgenteComConclusao {
  anexoNr15?: string | null
  anexoNr16?: string | null
  identificadoNaAtividade?: boolean | null
  epis?: readonly unknown[] | null
  epiEficaz?: boolean | null
  resultadoPericulosidade?: string | null
  resultadoPericulosidadeTexto?: string | null
}

/**
 * A pergunta "o EPI é eficaz?" só existe quando o documento imprime a
 * resposta: avaliação NR-15, com EPI, com o agente presente na atividade e
 * fora do ruído (Anexos 1 e 2), em que a conclusão vem do cálculo.
 */
export function exigeEficaciaEpi(agente: AgenteComPendencias): boolean {
  if (agente.tipo === 'periculosidade') return false
  if (!agente.epis?.length) return false
  if (agente.identificadoNaAtividade === false) return false
  return !usaAtenuacaoRuido({ anexoNr15: agente.anexoNr15 ?? undefined })
}

/**
 * O quadro da NR-16 sai das avaliações: o anexo da avaliação vira "Avaliação
 * da suposta exposição" e os demais, "Sem exposição". Sem anexo, nenhum
 * anexo sairia como avaliado — e o quadro diria "Sem exposição" em todos.
 * - caracterizar exige o anexo do enquadramento;
 * - a redação própria vence o resultado escolhido e pode dizer qualquer
 *   coisa: exige o anexo ou "Sem enquadramento", para o quadro não contradizer
 *   um texto que caracteriza a periculosidade;
 * - "prejudicada" também exige o anexo ou "Sem enquadramento".
 */
function faltaAnexoNr16(agente: AgenteComPendencias): boolean {
  if (temAnexoNr16Valido({ anexoNr16: agente.anexoNr16 ?? undefined })) return false
  const caracteriza = agente.resultadoPericulosidade === 'caracterizada'
    || agente.resultadoPericulosidade === 'caracterizada_parcial'
  if (caracteriza) return true
  if (agente.anexoNr16 === SEM_ENQUADRAMENTO_NR16) return false
  // "Prejudicada" também não é "Sem risco": sem o anexo examinado, o quadro
  // imprimiria "Sem exposição" em todos os anexos.
  return agente.resultadoPericulosidade === 'prejudicada' || Boolean(agente.resultadoPericulosidadeTexto?.trim())
}

export function camposPendentesAgente(agente: AgenteComPendencias): CampoPendenteAgente[] {
  const campos: CampoPendenteAgente[] = []
  if (agente.tipo === 'periculosidade') {
    if (!agente.resultadoPericulosidade && !agente.resultadoPericulosidadeTexto?.trim()) {
      campos.push('resultadoPericulosidade')
    }
    if (faltaAnexoNr16(agente)) campos.push('anexoNr16')
    return campos
  }
  if (!agente.observacao?.trim()) campos.push('observacao')
  if (exigeEficaciaEpi(agente) && typeof agente.epiEficaz !== 'boolean') campos.push('epiEficaz')
  return campos
}
