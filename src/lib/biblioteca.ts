import type { SecaoTexto, TextoBiblioteca, TipoDocumento } from '@/types'

export type BibliotecaAtiva = 'todas' | 'geral' | TipoDocumento

export const BIBLIOTECAS_DOCUMENTO: ReadonlyArray<{
  value: TipoDocumento
  label: string
  curto: string
}> = [
  { value: 'parecer', label: 'Parecer Técnico Pericial', curto: 'Parecer' },
  { value: 'laudo', label: 'Laudo Técnico Pericial', curto: 'Laudo' },
  { value: 'quesitos', label: 'Quesitos Técnicos', curto: 'Quesitos' },
  { value: 'manifestacao', label: 'Manifestação ao Laudo', curto: 'Manifestação' },
  { value: 'impugnacao', label: 'Impugnação de Laudos', curto: 'Impugnação' },
  {
    value: 'esclarecimento',
    label: 'Esclarecimentos Técnicos',
    curto: 'Esclarecimentos',
  },
]

const tiposDe = (texto: TextoBiblioteca): TipoDocumento[] => texto.tiposDocumento ?? []

export function filtrarTextosBiblioteca(
  textos: TextoBiblioteca[],
  filtros: {
    biblioteca: BibliotecaAtiva
    secao?: 'todas' | SecaoTexto
    busca?: string
  },
): TextoBiblioteca[] {
  const busca = filtros.busca?.toLowerCase().trim() ?? ''

  return textos
    .filter((texto) => {
      const tipos = tiposDe(texto)
      if (filtros.biblioteca === 'todas') return true
      if (filtros.biblioteca === 'geral') return tipos.length === 0
      return tipos.includes(filtros.biblioteca)
    })
    .filter(
      (texto) =>
        !filtros.secao || filtros.secao === 'todas' || texto.secao === filtros.secao,
    )
    .filter(
      (texto) =>
        !busca ||
        [texto.titulo, texto.conteudo, ...texto.tags].join(' ').toLowerCase().includes(busca),
    )
    .sort((a, b) => Number(b.favorito) - Number(a.favorito) || b.usos - a.usos)
}

export function contarTextosBiblioteca(
  textos: TextoBiblioteca[],
): Record<BibliotecaAtiva, number> {
  const contagens = Object.fromEntries(
    ['todas', 'geral', ...BIBLIOTECAS_DOCUMENTO.map((item) => item.value)].map((tipo) => [
      tipo,
      0,
    ]),
  ) as Record<BibliotecaAtiva, number>

  contagens.todas = textos.length
  textos.forEach((texto) => {
    const tipos = tiposDe(texto)
    if (!tipos.length) contagens.geral += 1
    tipos.forEach((tipo) => {
      contagens[tipo] += 1
    })
  })

  return contagens
}

export function tiposIniciaisNovoTexto(biblioteca: BibliotecaAtiva): TipoDocumento[] {
  return biblioteca === 'todas' || biblioteca === 'geral' ? [] : [biblioteca]
}

export function alternarTipoDocumento(
  atuais: TipoDocumento[],
  tipo: TipoDocumento,
): TipoDocumento[] {
  return atuais.includes(tipo) ? atuais.filter((item) => item !== tipo) : [...atuais, tipo]
}

export function textoDisponivelNoContexto(
  texto: TextoBiblioteca,
  tipo?: TipoDocumento,
  secao?: SecaoTexto,
): boolean {
  const tipos = tiposDe(texto)
  const tipoCompativel = !tipo || !tipos.length || tipos.includes(tipo)
  const secaoCompativel = !secao || texto.secao === secao || texto.secao === 'generico'
  return tipoCompativel && secaoCompativel
}
