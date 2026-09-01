import type { SecaoTexto, TextoBiblioteca, TipoDocumento } from '@/types'

const compararReferencia = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

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
    referencia?: 'todas' | string
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
        !filtros.referencia ||
        filtros.referencia === 'todas' ||
        texto.referencia === filtros.referencia,
    )
    .filter(
      (texto) =>
        !busca ||
        [texto.referencia, texto.titulo, texto.conteudo, ...texto.tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(busca),
    )
    .sort((a, b) => {
      const porFavorito = Number(b.favorito) - Number(a.favorito)
      if (porFavorito) return porFavorito
      if (a.referencia && b.referencia) {
        const porReferencia = compararReferencia.compare(a.referencia, b.referencia)
        if (porReferencia) return porReferencia
      } else if (a.referencia) return -1
      else if (b.referencia) return 1
      return b.usos - a.usos
    })
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
  referencia?: string,
): boolean {
  const tipos = tiposDe(texto)
  const tipoCompativel = !tipo || !tipos.length || tipos.includes(tipo)
  const secaoCompativel = !secao || texto.secao === secao || texto.secao === 'generico'
  const referenciaCompativel = !referencia || !texto.referencia || texto.referencia === referencia
  return tipoCompativel && secaoCompativel && referenciaCompativel
}
