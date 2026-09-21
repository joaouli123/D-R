// Espelha ORDEM_SECAO_FOTO e fotosEmOrdemDeDocumento de
// server/src/services/documento-comum.ts. Os dois precisam mudar juntos:
// a prévia, o PDF e o DOCX numeram as fotografias com esta mesma sequência,
// e a paridade é travada em server/src/services/fotos-ordem.test.ts.
//
// O front e a API são projetos TypeScript separados (o alias "@" do Vite só
// enxerga ./src), então a convenção do repo é duplicar com este aviso — ver
// src/lib/listasDocumento.ts e src/lib/periodoAvaliacao.ts.

/**
 * Ordem em que as seções de fotografia aparecem NO DOCUMENTO:
 * ambiente (3.1), atividades (6.1), equipamentos (6.2), documentos (6.3) e
 * produtos (6.4).
 *
 * 'epi' não é mais oferecida no editor (dobrada em 'documentos', pedido do
 * cliente), mas compartilha o mesmo número aqui: fotos já gravadas naquela
 * seção continuam saindo junto das evidências do 6.3, em vez de sumir do
 * documento.
 *
 * Não é a ordem de SECOES_FOTO do editor (src/pages/PericiaEditor.tsx), que
 * agrupa por afinidade para quem está enviando as fotos.
 */
export const ORDEM_SECAO_FOTO: Record<string, number> = {
  ambiente: 0,
  atividades: 1,
  equipamentos: 2,
  documentos: 3,
  epi: 3,
  produtos: 4,
}

/**
 * Ordena as fotos na sequência em que elas saem no documento e não pela
 * coluna `ordem` sozinha: até a correção de server/src/routes/fotos.ts o
 * contador de `ordem` era por seção, então fotos de seções diferentes
 * empatam nas perícias já gravadas e a legenda "Fotografia N" saía fora de
 * sequência. O desempate final pelo id mantém o resultado estável.
 */
export function fotosEmOrdemDeDocumento<T extends { secao: string; ordem: number; id: string }>(
  fotos: readonly T[],
): T[] {
  return [...fotos].sort(
    (a, b) =>
      ((ORDEM_SECAO_FOTO[a.secao] ?? 99) - (ORDEM_SECAO_FOTO[b.secao] ?? 99)) ||
      a.ordem - b.ordem ||
      a.id.localeCompare(b.id),
  )
}

/**
 * Fotos que realmente saem no documento, na ordem em que saem, e o número
 * ("Fotografia N") de cada uma.
 *
 * - `secoes`: fotos sem agente, de seção conhecida (3.1, 6.1 a 6.4), na ordem
 *   do documento.
 * - `porAgente`: fotos ligadas a um agente, no item 10, na ordem em que os
 *   quadros dos agentes saem em `agentesImpressos`. Laudo e Parecer imprimem
 *   fotos por agente do mesmo jeito. Foto de agente removido ou fora
 *   da modalidade não entra.
 *
 * O número conta só o que sai, de 1 a N, sem buraco: a prévia, o PDF e o DOCX
 * usam este mesmo resultado. As fotos de agente numeram depois das das seções
 * porque o item 10 vem depois do 6.4, mesmo que sejam gravadas em 'documentos'.
 */
export function fotosImpressasEmOrdem<
  T extends { id: string; secao: string; ordem: number; agenteId?: string | null },
>(
  fotos: readonly T[],
  agentesImpressos: readonly string[],
): { secoes: T[]; porAgente: Map<string, T[]>; numeroDaFoto: Map<string, number> } {
  const secoes = fotosEmOrdemDeDocumento(
    fotos.filter(
      (foto) => !foto.agenteId && Object.prototype.hasOwnProperty.call(ORDEM_SECAO_FOTO, foto.secao),
    ),
  )
  const porAgente = new Map<string, T[]>()
  for (const agenteId of agentesImpressos) {
    if (porAgente.has(agenteId)) continue
    const doAgente = fotos
      .filter((foto) => foto.agenteId === agenteId)
      .sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))
    if (doAgente.length) porAgente.set(agenteId, doAgente)
  }
  const numeroDaFoto = new Map<string, number>()
  for (const foto of [...secoes, ...[...porAgente.values()].flat()]) {
    numeroDaFoto.set(foto.id, numeroDaFoto.size + 1)
  }
  return { secoes, porAgente, numeroDaFoto }
}
