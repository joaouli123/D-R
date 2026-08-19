import { anexoNr15PorId } from '@/content/anexosNr15'
import type { AgenteAvaliado } from '@/types'

import type { UnidadeMedicao } from './tipos'

export type CalculoAnexoNr15 = 'nenhum' | 'comparacao_limite' | 'ruido_nrrsf'

export interface RegraAnexoNr15 {
  agenteFixo?: string
  tipoFixo?: AgenteAvaliado['tipo']
  criterioFixo?: AgenteAvaliado['criterio']
  limiteFixo?: string
  grausPermitidos: readonly NonNullable<AgenteAvaliado['grau']>[]
  unidades: readonly UnidadeMedicao[]
  unidadePadrao?: UnidadeMedicao
  exibeCas: boolean
  exibeMedicao: boolean
  calculo: CalculoAnexoNr15
  categoriaProtecao?: string
}

const GRAUS_VARIAVEIS = ['minimo', 'medio', 'maximo'] as const

const REGRAS_ESPECIFICAS: Record<string, Partial<RegraAnexoNr15>> = {
  ANEXO_01: {
    agenteFixo: 'Ruído contínuo ou intermitente',
    grausPermitidos: ['medio'],
    unidades: ['dB(A)'],
    unidadePadrao: 'dB(A)',
    exibeCas: false,
    exibeMedicao: true,
    calculo: 'ruido_nrrsf',
    categoriaProtecao: 'Proteção auditiva',
  },
  ANEXO_02: { agenteFixo: 'Ruído de impacto', unidades: ['dB(C)', 'dB(Linear)'], unidadePadrao: 'dB(C)' },
  ANEXO_03: { agenteFixo: 'Calor', unidades: ['IBUTG °C'], unidadePadrao: 'IBUTG °C' },
  ANEXO_05: { agenteFixo: 'Radiações ionizantes', unidades: ['mSv/ano'], unidadePadrao: 'mSv/ano' },
  ANEXO_07: { agenteFixo: 'Radiações não ionizantes', exibeMedicao: false },
  ANEXO_08_VMB: { agenteFixo: 'Vibração em mãos e braços', unidades: ['m/s²'], unidadePadrao: 'm/s²' },
  ANEXO_08_VCI: { agenteFixo: 'Vibração de corpo inteiro', unidades: ['m/s²', 'm/s¹·⁷⁵'], unidadePadrao: 'm/s²' },
  ANEXO_09: { agenteFixo: 'Frio', exibeMedicao: false },
  ANEXO_10: { agenteFixo: 'Umidade', exibeMedicao: false },
  ANEXO_11: { unidades: ['ppm', 'mg/m³', '% O₂ em volume'], exibeCas: true },
  ANEXO_12_ASBESTO: { agenteFixo: 'Asbesto/Amianto', unidades: ['fibras/cm³'], unidadePadrao: 'fibras/cm³' },
  ANEXO_12_MANGANES: { agenteFixo: 'Manganês', unidades: ['mg/m³'], unidadePadrao: 'mg/m³' },
  ANEXO_12_SILICA: { agenteFixo: 'Sílica livre cristalizada', unidades: ['mg/m³'], unidadePadrao: 'mg/m³' },
  ANEXO_13: { exibeMedicao: false },
  ANEXO_14: { grausPermitidos: ['medio', 'maximo'], exibeMedicao: false },
}

export function obterRegraAnexo(anexoId: string | undefined): RegraAnexoNr15 | undefined {
  const anexo = anexoNr15PorId(anexoId)
  if (!anexo) return undefined

  const especifica = REGRAS_ESPECIFICAS[anexo.id] ?? {}
  const quantitativo = anexo.criterio === 'quantitativo'

  return {
    tipoFixo: anexo.tipo,
    criterioFixo: anexo.criterio,
    limiteFixo: anexo.limiteEditavel ? undefined : anexo.limiteTolerancia,
    grausPermitidos: anexo.grau ? [anexo.grau] : GRAUS_VARIAVEIS,
    unidades: [],
    exibeCas: false,
    exibeMedicao: quantitativo,
    calculo: quantitativo ? 'comparacao_limite' : 'nenhum',
    ...especifica,
  }
}

export function camposDoAnexo(anexoId: string | undefined) {
  const regra = obterRegraAnexo(anexoId)
  return {
    cas: regra?.exibeCas ?? true,
    medicao: regra?.exibeMedicao ?? true,
  }
}
