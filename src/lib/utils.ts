export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatDate(iso?: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const date = formatDate(iso)
  const time = iso.includes('T') ? iso.slice(11, 16) : ''
  return time ? `${date} às ${time}` : date
}

export function extenso(iso?: string) {
  if (!iso) return '—'
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} de ${meses[m - 1]} de ${y}`
}

export function maskCNPJ(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskProcesso(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 20)
    .replace(/^(\d{7})(\d)/, '$1-$2')
    .replace(/^(\d{7})-(\d{2})(\d)/, '$1-$2.$3')
    .replace(/^(\d{7})-(\d{2})\.(\d{4})(\d)/, '$1-$2.$3.$4')
    .replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)(\d)/, '$1-$2.$3.$4.$5')
    .replace(/\.(\d{2})(\d{1,4})$/, '.$1.$2')
}

/** Substitui as variáveis {{campo}} dos textos da biblioteca. */
export function interpolar(texto: string, dados: Record<string, string | undefined>) {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => dados[k] ?? `{{${k}}}`)
}

export function contarPalavras(texto: string) {
  return texto.trim() ? texto.trim().split(/\s+/).length : 0
}

export function downloadTexto(nome: string, conteudo: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([conteudo], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]
