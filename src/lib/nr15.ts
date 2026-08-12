import type { ReferenciaNormativa } from '@/content/nr15/tipos'
import { anexoNr15PorId } from '@/content/anexosNr15'
import type { AgenteAvaliado } from '@/types'

export function normalizarBuscaNr15(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function buscarReferencias<T extends ReferenciaNormativa>(
  itens: readonly T[],
  consulta: string,
): T[] {
  const termoNormalizado = normalizarBuscaNr15(consulta)

  if (!termoNormalizado) return [...itens]

  return itens.filter((item) => [item.label, ...(item.sinonimos ?? [])]
    .some((texto) => normalizarBuscaNr15(texto).includes(termoNormalizado)))
}

export function aplicarAnexo(agente: AgenteAvaliado, anexoId: string): AgenteAvaliado {
  const anexo = anexoNr15PorId(anexoId)
  const mudouAnexo = agente.anexoNr15 !== anexoId
  const { referenciaNormativaId, atividadeEnquadrada, unidadeLimite, ...agenteSemReferencia } = agente
  const base = mudouAnexo ? agenteSemReferencia : agente

  if (!anexo) return { ...base, anexoNr15: anexoId }

  const { grau, ...anexoSemGrau } = anexo

  return {
    ...base,
    anexoNr15: anexo.id,
    tipo: anexoSemGrau.tipo,
    criterio: anexoSemGrau.criterio,
    limiteTolerancia: anexoSemGrau.limiteTolerancia,
    ...(grau ? { grau } : { grau: undefined }),
  }
}

export function aplicarReferencia(
  agente: AgenteAvaliado,
  referencia: ReferenciaNormativa,
): AgenteAvaliado {
  const agenteComAnexo = aplicarAnexo(agente, referencia.anexoId)

  return {
    ...agenteComAnexo,
    anexoNr15: referencia.anexoId,
    referenciaNormativaId: referencia.id,
    nome: referencia.label,
    tipo: referencia.tipo,
    criterio: referencia.criterio,
    limiteTolerancia: referencia.limiteTolerancia,
    unidadeLimite: referencia.unidadeLimite,
    grau: referencia.grau,
    atividadeEnquadrada: referencia.atividadeEnquadrada,
  }
}
