import { readFileSync } from 'node:fs'

/** Arte oficial aprovada pelo cliente, compartilhada entre PDF e DOCX. */
export const LOGO_OFICIAL_JPEG = readFileSync(
  new URL('../../assets/logo-dr-oficial.jpeg', import.meta.url),
)

export const LOGO_OFICIAL_DATA_URI =
  `data:image/jpeg;base64,${LOGO_OFICIAL_JPEG.toString('base64')}`

export const LOGO_OFICIAL_ALT =
  'Logo oficial D&R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional'
