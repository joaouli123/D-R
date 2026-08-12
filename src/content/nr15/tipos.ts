import type { AgenteAvaliado } from '@/types'

export interface ReferenciaNormativa {
  id: string
  anexoId: string
  label: string
  sinonimos?: readonly string[]
  tipo: AgenteAvaliado['tipo']
  criterio: AgenteAvaliado['criterio']
  limiteTolerancia?: string
  unidadeLimite?: string
  grau?: AgenteAvaliado['grau']
  atividadeEnquadrada?: string
}
