import type { ReferenciaNormativa, UnidadeMedicao } from '@/content/nr15/tipos'
import type { AgenteAvaliado, FonteRuido, OrigemMedicao } from '@/types'

const UNIDADES_MEDICAO: readonly UnidadeMedicao[] = ['ppm', 'mg/m³', '% O₂ em volume']

export const ROTULO_ORIGEM_MEDICAO: Record<OrigemMedicao, string> = {
  perito: 'Perito — medição em perícia',
  empresa: 'Empresa — medição do período avaliado (PGR / laudos ambientais)',
  nao_informado: 'Não informado pelo perito — adotada a medição da empresa',
}

/**
 * A frase que acompanha cada origem no documento. Dizer só de onde veio
 * o número deixa o leitor completar sozinho; a frase diz o que o número
 * é — resultado de perícia ou transcrição do que a empresa juntou.
 */
export const NOTA_ORIGEM_MEDICAO: Record<OrigemMedicao, string> = {
  perito: 'Medição a ser informada no laudo pericial do perito.',
  empresa: 'Medição conforme registros apresentados junto ao processo.',
  nao_informado: 'Medição conforme registros apresentados junto ao processo.',
}

/**
 * De onde vem o ruído do local, com a frase que cada caso põe no
 * documento. Sem nível relevante o laudo precisa dizer por quê —
 * ausência de fonte não é o mesmo que ausência de medição.
 */
export const FONTE_RUIDO: Record<FonteRuido, { rotulo: string; frase: string }> = {
  maquinas: {
    rotulo: 'Máquinas e equipamentos',
    frase: 'Ruído proveniente de máquinas, equipamentos e demais dispositivos existentes no local.',
  },
  ruido_fundo: {
    rotulo: 'Ruído de fundo',
    frase: 'Não há fonte direta de ruído no local. O nível identificado corresponde ao ruído de fundo.',
  },
  administrativa: {
    rotulo: 'Atividade administrativa',
    frase:
      'Não há fonte de ruído relevante. Ambiente destinado a atividades administrativas, sem operação de máquinas ou equipamentos.',
  },
}

export interface MedicaoAdotada {
  /** O número que vale para o cálculo, já normalizado. Vazio = sem medição. */
  valor: string
  origem: OrigemMedicao
  rotuloOrigem: string
  /** A frase que explica a origem no documento. */
  notaOrigem: string
  /** Documento da empresa, quando é dela que veio o número. */
  fonte?: string
  /** A empresa informou faixa, não valor único. `valor` é o topo dela. */
  faixaEmpresa?: { de: string; ate: string }
  /** As duas medições existem e não batem — o laudo precisa justificar. */
  divergente: boolean
}

/** A maior de duas medições, comparadas como número. */
function maior(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  return Number(b) > Number(a) ? b : a
}

/**
 * Qual medição o laudo adota, e o que dizer sobre ela.
 *
 * A medição da empresa pode vir como faixa — o PGR raramente traz um
 * número só para o período inteiro. Quando vem, o laudo adota o topo:
 * é o pior cenário do período, e concluir pelo menor seria concluir
 * por um dia bom que o trabalhador não viveu todos os dias.
 *
 * Espelhado em `server/src/services/documento-comum.ts`
 * (`medicaoAdotadaDocumento`). Os dois precisam mudar juntos, ou a tela
 * conclui uma coisa e o documento entregue ao juízo conclui outra.
 */
export function medicaoAdotada(
  agente: Pick<
    AgenteAvaliado,
    'valorMedido' | 'medicaoEmpresa' | 'medicaoEmpresaAte' | 'fonteMedicaoEmpresa' | 'origemMedicao'
  >,
): MedicaoAdotada {
  const origem: OrigemMedicao = agente.origemMedicao ?? 'perito'
  const doPerito = agente.valorMedido?.trim() ?? ''
  const deEmpresa = agente.medicaoEmpresa?.trim() ?? ''
  const ateEmpresa = agente.medicaoEmpresaAte?.trim() ?? ''
  const daEmpresa = maior(deEmpresa, ateEmpresa)
  const fonte = agente.fonteMedicaoEmpresa?.trim() || undefined
  const faixaEmpresa =
    deEmpresa && ateEmpresa && Number(deEmpresa) !== Number(ateEmpresa)
      ? { de: deEmpresa, ate: ateEmpresa }
      : undefined

  const divergente = Boolean(doPerito && daEmpresa && Number(doPerito) !== Number(daEmpresa))
  const rotuloOrigem = ROTULO_ORIGEM_MEDICAO[origem]
  const notaOrigem = NOTA_ORIGEM_MEDICAO[origem]

  if (origem === 'perito') {
    return { valor: doPerito, origem, rotuloOrigem, notaOrigem, faixaEmpresa, divergente }
  }
  return { valor: daEmpresa, origem, rotuloOrigem, notaOrigem, fonte, faixaEmpresa, divergente }
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
