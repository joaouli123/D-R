import type { ReferenciaNormativa, UnidadeMedicao } from '@/content/nr15/tipos'

export function normalizarNumeroMedido(valor: string): string | null {
  const limpo = valor.trim().replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(limpo) ? limpo : null
}

export function unidadesDisponiveis(ref: Pick<ReferenciaNormativa, 'limites'>): UnidadeMedicao[] {
  return Object.keys(ref.limites ?? {}) as UnidadeMedicao[]
}
