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
