import type { Pericia } from '@/types'

const CIDADE_COM_UF = /^(.+?)\s*\/\s*[A-Z]{2}$/i

export function cidadeDaVistoria(localVistoria?: string): string {
  const endereco = localVistoria?.trim()
  if (!endereco) return ''

  const segmentos = endereco.split(/\s+[—–]\s+/).map((parte) => parte.trim()).filter(Boolean)
  const ultimo = segmentos[segmentos.length - 1] ?? ''
  return ultimo.match(CIDADE_COM_UF)?.[1]?.trim() ?? ''
}

export function dadosAssinatura(pericia: Pericia): { cidade: string; data: string } {
  return {
    cidade:
      pericia.tecnico.cidadeAssinatura?.trim() ||
      cidadeDaVistoria(pericia.localVistoria) ||
      'Santo André',
    data:
      pericia.tecnico.dataAssinatura?.trim() ||
      pericia.dataVistoria?.trim() ||
      new Date().toISOString().slice(0, 10),
  }
}
