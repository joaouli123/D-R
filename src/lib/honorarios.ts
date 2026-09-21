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
  const partes: { texto: string; valor: number }[] = []
  const milhoes = Math.floor(valor / 1_000_000)
  const milhares = Math.floor((valor % 1_000_000) / 1_000)
  const unidades = valor % 1_000
  if (milhoes) partes.push({ texto: milhoes === 1 ? 'um milhão' : `${ateNovecentos(milhoes)} milhões`, valor: milhoes })
  if (milhares) partes.push({ texto: milhares === 1 ? 'mil' : `${ateNovecentos(milhares)} mil`, valor: milhares })
  if (unidades) partes.push({ texto: ateNovecentos(unidades), valor: unidades })
  return partes.map((parte, indice) => {
    if (indice === 0) return parte.texto
    const anterior = partes[indice - 1]!
    return `${parte.valor < 100 || parte.valor % 100 === 0 || anterior.valor === 1 ? ' e ' : ', '}${parte.texto}`
  }).join('')
}

export function formatarHonorarios(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
    .replace(/\u00a0/g, ' ')
}

export function honorariosPorExtenso(centavos: number): string {
  const normalizado = Math.max(0, Math.round(centavos))
  const reais = Math.floor(normalizado / 100)
  const centavosRestantes = normalizado % 100
  const partes: string[] = []
  if (reais) partes.push(`${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`)
  if (centavosRestantes) partes.push(`${inteiroPorExtenso(centavosRestantes)} ${centavosRestantes === 1 ? 'centavo' : 'centavos'}`)
  return partes.join(' e ') || 'zero reais'
}

export function textoHonorariosPericiais(centavos: number): string {
  return `Considerando a natureza, a complexidade e a responsabilidade técnica do trabalho realizado, incluindo diligência, análise dos elementos constantes dos autos e elaboração do Laudo Técnico Pericial, requer o Perito o arbitramento de seus honorários em ${formatarHonorarios(centavos)} (${honorariosPorExtenso(centavos)}).\n\nO valor tem como referência o Regulamento de Honorários para Avaliações e Perícias de Engenharia do IBAPE/SP, especialmente o Art. 4º, que trata da estimativa e do arbitramento dos honorários nas perícias judiciais, e o Art. 5º, acrescido das despesas diretas previstas no regulamento.`
}
