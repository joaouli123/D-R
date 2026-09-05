// ============================================================
// Número CAS (Chemical Abstracts Service).
//
// Formato: 2 a 7 dígitos, hífen, 2 dígitos, hífen, 1 dígito verificador.
// O verificador é a soma dos dígitos do corpo, pesados da direita para a
// esquerda (1, 2, 3…), módulo 10. Manganês, 7439-96-5:
//   6·1 + 9·2 + 9·3 + 3·4 + 4·5 + 7·6 = 125 → 5.
//
// O sistema não inventa CAS: o do Anexo 11 vem da lista oficial e o do
// Anexo 12 é fixo. Este validador serve ao CAS digitado à mão — atividade
// do Anexo 13 com composto específico, agente sem referência — onde um
// dígito trocado passa despercebido até a busca na base voltar vazia.
// ============================================================

export const FORMATO_CAS = /^(\d{2,7})-(\d{2})-(\d)$/

// Enquanto o perito digita, "7439-9" não é erro: é um CAS pela metade. Só
// se reclama do formato quando o texto já não pode virar um CAS.
const CAS_PARCIAL = /^\d{0,7}(-(\d{0,2}(-\d?)?)?)?$/
const TRES_BLOCOS = /^\d*-\d*-\d+$/

/** Estrutura NNNNNNN-NN-N, sem conferir o dígito verificador. */
export function formatoCas(valor: string | undefined): boolean {
  return FORMATO_CAS.test((valor ?? '').trim())
}

/** Formato correto e dígito verificador conferindo. */
export function casValido(valor: string | undefined): boolean {
  const partes = (valor ?? '').trim().match(FORMATO_CAS)
  if (!partes) return false
  const corpo = `${partes[1]}${partes[2]}`.split('').reverse().map(Number)
  const soma = corpo.reduce((total, digito, indice) => total + digito * (indice + 1), 0)
  return soma % 10 === Number(partes[3])
}

/**
 * Mensagem para o campo, ou nada. Vazio nunca é erro — o CAS é opcional —
 * e o aviso não bloqueia o registro: o perito pode estar copiando um
 * número de rótulo que ele mesmo vai conferir na base.
 */
export function erroCas(valor: string | undefined): string | undefined {
  const numero = (valor ?? '').trim()
  if (!numero || casValido(numero)) return undefined
  if (formatoCas(numero)) return 'Dígito verificador não confere — confira o número na fonte.'
  if (!TRES_BLOCOS.test(numero) && CAS_PARCIAL.test(numero)) return undefined
  return 'Formato esperado: 0000000-00-0 (2 a 7 dígitos, 2 dígitos e o verificador).'
}
