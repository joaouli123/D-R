// ATENÇÃO: esta cópia e `server/src/services/honorarios.ts` precisam ser
// idênticas (há um teste de paridade). A prévia usa a do front; o PDF e o
// DOCX usam a da API.

// R$ 100.000.000,00 — teto aceito pela API e pelo campo da tela.
export const HONORARIOS_MAXIMO_CENTAVOS = 10_000_000_000

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ateNovecentos(valor: number): string {
  if (valor === 100) return 'cem'
  const centena = Math.floor(valor / 100)
  const resto = valor % 100
  const partes: string[] = []
  if (centena) partes.push(CENTENAS[centena]!)
  if (resto >= 10 && resto <= 19) partes.push(DEZ_A_DEZENOVE[resto - 10]!)
  else {
    const dezena = Math.floor(resto / 10)
    const unidade = resto % 10
    if (dezena) partes.push(DEZENAS[dezena]!)
    if (unidade) partes.push(UNIDADES[unidade]!)
  }
  return partes.join(' e ')
}

function inteiroPorExtenso(valor: number): string {
  if (valor === 0) return 'zero'
  const grupos = [
    { valor: Math.floor(valor / 1_000_000_000) % 1_000, singular: 'um bilhão', plural: 'bilhões' },
    { valor: Math.floor(valor / 1_000_000) % 1_000, singular: 'um milhão', plural: 'milhões' },
    { valor: Math.floor(valor / 1_000) % 1_000, singular: 'mil', plural: 'mil' },
    { valor: valor % 1_000, singular: '', plural: '' },
  ].filter((grupo) => grupo.valor > 0)

  return grupos
    .map((grupo, indice) => {
      const texto = grupo.valor === 1 && grupo.singular ? grupo.singular : `${ateNovecentos(grupo.valor)}${grupo.plural ? ` ${grupo.plural}` : ''}`
      if (indice === 0) return texto
      // O "e" só liga o último grupo, e só quando ele é menor que cem ou uma
      // centena redonda ("mil e vinte", "dois mil e quinhentos"); nos demais
      // casos vai vírgula ("mil, duzentos e trinta e quatro").
      const ultimo = indice === grupos.length - 1
      const liga = ultimo && (grupo.valor < 100 || grupo.valor % 100 === 0) ? ' e ' : ', '
      return `${liga}${texto}`
    })
    .join('')
}

// Valor inválido (NaN, negativo, infinito) vira zero; acima do teto, fica no
// teto — assim o número e o extenso do documento sempre contam a mesma coisa.
function normalizarCentavos(centavos: number): number {
  if (!Number.isFinite(centavos)) return 0
  return Math.min(HONORARIOS_MAXIMO_CENTAVOS, Math.max(0, Math.round(centavos)))
}

export function formatarHonorarios(centavos: number): string {
  const total = normalizarCentavos(centavos)
  const reais = String(Math.floor(total / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${reais},${String(total % 100).padStart(2, '0')}`
}

export function honorariosPorExtenso(centavos: number): string {
  const total = normalizarCentavos(centavos)
  const reais = Math.floor(total / 100)
  const centavosRestantes = total % 100
  const partes: string[] = []
  if (reais) {
    // "de reais" só quando o total é milhão exato ("dois milhões de reais");
    // com resto continua "um milhão e quinhentos mil reais".
    const moeda = reais === 1 ? 'real' : reais % 1_000_000 === 0 ? 'de reais' : 'reais'
    partes.push(`${inteiroPorExtenso(reais)} ${moeda}`)
  }
  if (centavosRestantes) partes.push(`${inteiroPorExtenso(centavosRestantes)} ${centavosRestantes === 1 ? 'centavo' : 'centavos'}`)
  return partes.join(' e ') || 'zero reais'
}

export function textoHonorariosPericiais(centavos: number): string {
  return `Considerando a natureza, a complexidade e a responsabilidade técnica do trabalho realizado, incluindo diligência, análise dos elementos constantes dos autos e elaboração do Laudo Técnico Pericial, requer o Perito o arbitramento de seus honorários em ${formatarHonorarios(centavos)} (${honorariosPorExtenso(centavos)}).\n\nO valor tem como referência o Regulamento de Honorários para Avaliações e Perícias de Engenharia do IBAPE/SP, especialmente o Art. 4º, que trata da estimativa e do arbitramento dos honorários nas perícias judiciais, e o Art. 5º, acrescido das despesas diretas previstas no regulamento.`
}

// No laudo revisado pelo cliente, "DOS HONORÁRIOS PERICIAIS" entra depois do
// encerramento e antes do "Diante do exposto…", que é o parágrafo que fecha o
// documento, logo acima da data e da assinatura. Esta função tira esse
// parágrafo final do texto do encerramento para o documento poder colocá-lo
// depois dos honorários. Se o texto foi reescrito e não termina assim, ou se o
// "Diante do exposto" é tudo o que há, devolve o texto intacto.
export function separarFechoDoEncerramento(texto?: string | null): { corpo: string; fecho: string } {
  const original = texto ?? ''
  const paragrafos = original
    .split(/\n{2,}/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean)
  const ultimo = paragrafos[paragrafos.length - 1]
  if (paragrafos.length > 1 && ultimo && /^diante do exposto\b/i.test(ultimo)) {
    return { corpo: paragrafos.slice(0, -1).join('\n\n'), fecho: ultimo }
  }
  return { corpo: original, fecho: '' }
}
