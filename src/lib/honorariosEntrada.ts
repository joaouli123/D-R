import { HONORARIOS_MAXIMO_CENTAVOS, formatarHonorarios } from './honorarios'

export type EntradaHonorarios = { centavos: number | undefined } | { erro: string }

const ERRO_FORMATO = 'Use apenas números, por exemplo 2.500,00.'
const ERRO_LIMITE = `O valor não pode passar de ${formatarHonorarios(HONORARIOS_MAXIMO_CENTAVOS)}.`

const MILHARES_BRASILEIROS = /^\d{1,3}(\.\d{3})+$/

// Lê o que o perito digitou ou colou no campo de honorários, do jeito que se
// escreve dinheiro no Brasil: "3500", "3.500", "3.500,00", "R$ 2.500,50".
// Ponto seguido de exatamente três dígitos é separador de milhar ("1.000" é
// mil reais); ponto com um ou dois dígitos é decimal ("2500.5").
export function interpretarEntradaHonorarios(bruto: string): EntradaHonorarios {
  const texto = bruto.replace(/R\$/gi, '').replace(/\s/g, '')
  if (texto === '') return { centavos: undefined }
  if (!/^[\d.,]+$/.test(texto)) return { erro: ERRO_FORMATO }

  let inteiro: string
  let fracao = ''
  const partesPorVirgula = texto.split(',')
  if (partesPorVirgula.length > 2) return { erro: ERRO_FORMATO }

  if (partesPorVirgula.length === 2) {
    const [esquerda, direita] = partesPorVirgula as [string, string]
    if (!(/^\d*$/.test(esquerda) || MILHARES_BRASILEIROS.test(esquerda)) || !/^\d{0,2}$/.test(direita)) {
      return { erro: ERRO_FORMATO }
    }
    inteiro = esquerda.replace(/\./g, '')
    fracao = direita
  } else if (texto.includes('.')) {
    if (MILHARES_BRASILEIROS.test(texto)) {
      inteiro = texto.replace(/\./g, '')
    } else if (/^\d+\.\d{1,2}$/.test(texto)) {
      const [parteInteira, parteFracao] = texto.split('.') as [string, string]
      inteiro = parteInteira
      fracao = parteFracao
    } else {
      return { erro: ERRO_FORMATO }
    }
  } else {
    inteiro = texto
  }

  const reais = inteiro.replace(/^0+(?=\d)/, '')
  // Mais de nove dígitos já passa do teto; sai antes de virar número grande.
  if (reais.length > 9) return { erro: ERRO_LIMITE }
  const total = Number(reais || '0') * 100 + Number(fracao.padEnd(2, '0') || '0')
  if (total > HONORARIOS_MAXIMO_CENTAVOS) return { erro: ERRO_LIMITE }
  return { centavos: total }
}

// Como o valor guardado aparece no campo (o "R$" fica no rótulo).
export function textoDoCampoHonorarios(centavos: number | undefined): string {
  if (!centavos) return ''
  return formatarHonorarios(centavos).replace(/^R\$\s/, '')
}
