import type { ReferenciaNormativa, UnidadeMedicao } from '@/content/nr15/tipos'

const UNIDADES_MEDICAO: readonly UnidadeMedicao[] = ['ppm', 'mg/m³', '% O₂ em volume']

export function normalizarNumeroMedido(valor: string): string | null {
  const limpo = valor.trim().replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(limpo) ? limpo : null
}

export function unidadesDisponiveis(ref: Pick<ReferenciaNormativa, 'limites'>): UnidadeMedicao[] {
  return Object.keys(ref.limites ?? {}).filter((unidade): unidade is UnidadeMedicao =>
    UNIDADES_MEDICAO.includes(unidade as UnidadeMedicao),
  )
}
