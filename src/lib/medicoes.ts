import type { ReferenciaNormativa, UnidadeMedicao } from '@/content/nr15/tipos'
import type { AgenteAvaliado, OrigemMedicao } from '@/types'

const UNIDADES_MEDICAO: readonly UnidadeMedicao[] = ['ppm', 'mg/m³', '% O₂ em volume']

export const ROTULO_ORIGEM_MEDICAO: Record<OrigemMedicao, string> = {
  perito: 'Avaliação do perito em diligência',
  empresa: 'Avaliação da empresa (PGR / laudo ambiental)',
  nao_informado: 'Não informado pelo perito — adotada a avaliação da empresa',
}

export interface MedicaoAdotada {
  /** O número que vale para o cálculo, já normalizado. Vazio = sem medição. */
  valor: string
  origem: OrigemMedicao
  rotuloOrigem: string
  /** Documento da empresa, quando é dela que veio o número. */
  fonte?: string
  /** As duas medições existem e não batem — o laudo precisa justificar. */
  divergente: boolean
}

/**
 * Qual medição o laudo adota, e o que dizer sobre ela.
 *
 * Espelhado em `server/src/services/documento-comum.ts`
 * (`medicaoAdotadaDocumento`). Os dois precisam mudar juntos, ou a tela
 * conclui uma coisa e o documento entregue ao juízo conclui outra.
 */
export function medicaoAdotada(
  agente: Pick<AgenteAvaliado, 'valorMedido' | 'medicaoEmpresa' | 'fonteMedicaoEmpresa' | 'origemMedicao'>,
): MedicaoAdotada {
  const origem: OrigemMedicao = agente.origemMedicao ?? 'perito'
  const doPerito = agente.valorMedido?.trim() ?? ''
  const daEmpresa = agente.medicaoEmpresa?.trim() ?? ''
  const fonte = agente.fonteMedicaoEmpresa?.trim() || undefined

  const divergente = Boolean(doPerito && daEmpresa && Number(doPerito) !== Number(daEmpresa))
  const rotuloOrigem = ROTULO_ORIGEM_MEDICAO[origem]

  if (origem === 'perito') return { valor: doPerito, origem, rotuloOrigem, divergente }
  return { valor: daEmpresa, origem, rotuloOrigem, fonte, divergente }
}

export function normalizarNumeroMedido(valor: string): string | null {
  const limpo = valor.trim().replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(limpo) ? limpo : null
}

export function unidadesDisponiveis(ref: Pick<ReferenciaNormativa, 'limites'>): UnidadeMedicao[] {
  return Object.keys(ref.limites ?? {}).filter((unidade): unidade is UnidadeMedicao =>
    UNIDADES_MEDICAO.includes(unidade as UnidadeMedicao),
  )
}
