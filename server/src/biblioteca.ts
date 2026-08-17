import { z } from 'zod'

export const TIPOS_DOCUMENTO_BIBLIOTECA = [
  'parecer',
  'laudo',
  'quesitos',
  'manifestacao',
  'impugnacao',
  'esclarecimento',
] as const

export type TipoDocumentoBiblioteca = (typeof TIPOS_DOCUMENTO_BIBLIOTECA)[number]

export function normalizarTiposDocumento(
  tipos: readonly TipoDocumentoBiblioteca[],
): TipoDocumentoBiblioteca[] {
  return [...new Set(tipos)]
}

export const tiposDocumentoSchema = z
  .array(z.enum(TIPOS_DOCUMENTO_BIBLIOTECA))
  .max(TIPOS_DOCUMENTO_BIBLIOTECA.length)
  .default([])
  .transform(normalizarTiposDocumento)
