export interface FotoPersistida {
  id: string
}

export interface FotoRecebida {
  id: string
  legenda: string
  ordem: number
}

/**
 * O upload e a exclusão têm rotas próprias. O upsert da perícia só pode
 * atualizar metadados: um formulário atrasado nunca deve apagar um arquivo
 * recém-enviado por outra requisição.
 */
export function decidirSincronizacaoDeFotos(
  existentes: FotoPersistida[],
  recebidas: FotoRecebida[],
): { atualizar: FotoRecebida[]; remover: string[] } {
  const idsExistentes = new Set(existentes.map((foto) => foto.id))
  return {
    atualizar: recebidas.filter((foto) => idsExistentes.has(foto.id)),
    remover: [],
  }
}
