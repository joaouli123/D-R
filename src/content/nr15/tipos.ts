import type { AgenteAvaliado } from '@/types'

export type UnidadeMedicao = 'ppm' | 'mg/m³' | '% O₂ em volume'

export type LimitesPorUnidade = Partial<Record<UnidadeMedicao, string>>

export interface ReferenciaNormativa {
  id: string
  anexoId: string
  label: string
  sinonimos?: readonly string[]
  cas?: string
  limites?: LimitesPorUnidade
  categoriaProtecao?: string
  tipo: AgenteAvaliado['tipo']
  criterio: AgenteAvaliado['criterio']
  limiteTolerancia?: string
  unidadeLimite?: string
  grau?: AgenteAvaliado['grau']
  atividadeEnquadrada?: string
}
