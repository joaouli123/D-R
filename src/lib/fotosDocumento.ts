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
 * ambiente (3.1), atividades (6.1), equipamentos (6.2), produtos (6.4),
 * documentos (fim do 7) e epi (8).
 *
 * Não é a ordem de SECOES_FOTO do editor (src/pages/PericiaEditor.tsx), que
 * agrupa por afinidade para quem está enviando as fotos.
 */
export const ORDEM_SECAO_FOTO: Record<string, number> = {
  ambiente: 0,
  atividades: 1,
  equipamentos: 2,
  produtos: 3,
  documentos: 4,
  epi: 5,
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
