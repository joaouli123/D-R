import type { Pericia } from '@/types'

/** Trecho de horário usado de forma idêntica na prévia e nos documentos. */
export function horarioDaVistoria(
  pericia: Pick<Pericia, 'horaVistoria' | 'horaFimVistoria'>,
): string {
  const inicio = pericia.horaVistoria?.trim()
  const fim = pericia.horaFimVistoria?.trim()
  if (inicio && fim) return `, das ${inicio} às ${fim}`
  if (inicio) return `, com início às ${inicio}`
  if (fim) return `, com término às ${fim}`
  return ''
}
