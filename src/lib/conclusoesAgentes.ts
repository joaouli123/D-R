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
