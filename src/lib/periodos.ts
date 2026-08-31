/** Converte uma atividade por linha em itens limpos para a prévia do laudo. */
export function atividadesDoPeriodo(texto?: string | null): string[] {
  if (!texto?.trim()) return []
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ''))
    .filter(Boolean)
}
