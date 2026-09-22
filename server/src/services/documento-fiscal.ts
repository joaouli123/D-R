// ============================================================
// CPF e CNPJ — a mesma regra da tela (src/lib/cadastro.ts), do lado de cá.
//
// O CNPJ pode ser alfanumérico (IN RFB 2.229/2024, emitido desde julho de
// 2026): 12 posições de letras ou números e 2 dígitos verificadores
// numéricos. O módulo 11 é o de sempre, com cada caractere valendo o código
// ASCII menos 48 — nos algarismos dá o próprio número; "A" vale 17.
// ============================================================

export type TipoDocumentoFiscal = 'cpf' | 'cnpj'

/** Letras e números em maiúsculas: a forma em que o documento se compara. */
export function limparDocumento(valor: string | null | undefined): string {
  return String(valor ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
}

/** `null` quando não tem cara nem de CPF nem de CNPJ. */
export function tipoDoDocumento(valor: string | null | undefined): TipoDocumentoFiscal | null {
  const s = limparDocumento(valor)
  if (/^\d{11}$/.test(s)) return 'cpf'
  if (/^[0-9A-Z]{12}\d{2}$/.test(s)) return 'cnpj'
  return null
}

export function cpfValido(valor: string | null | undefined): boolean {
  const s = limparDocumento(valor)
  if (!/^\d{11}$/.test(s) || /^(\d)\1{10}$/.test(s)) return false
  const digito = (parcial: string) => {
    let soma = 0
    for (let i = 0; i < parcial.length; i++) soma += Number(parcial[i]) * (parcial.length + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(s.slice(0, 9)) === Number(s[9]) && digito(s.slice(0, 10)) === Number(s[10])
}

export function cnpjValido(valor: string | null | undefined): boolean {
  const s = limparDocumento(valor)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(s) || /^(.)\1{13}$/.test(s)) return false
  const digito = (parcial: string) => {
    let soma = 0
    let peso = parcial.length - 7
    for (const caractere of parcial) {
      soma += (caractere.charCodeAt(0) - 48) * peso--
      if (peso < 2) peso = 9
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const base = s.slice(0, 12)
  return digito(base) === Number(s[12]) && digito(base + s[12]) === Number(s[13])
}

export function documentoValido(valor: string | null | undefined): boolean {
  const tipo = tipoDoDocumento(valor)
  return tipo === 'cpf' ? cpfValido(valor) : tipo === 'cnpj' ? cnpjValido(valor) : false
}

/** 000.000.000-00 ou 00.000.000/0000-00; o resto volta como veio. */
export function formatarDocumento(valor: string | null | undefined): string {
  const s = limparDocumento(valor)
  const tipo = tipoDoDocumento(s)
  if (tipo === 'cpf') return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
  if (tipo === 'cnpj') {
    return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
  }
  return String(valor ?? '').trim()
}

/** "CPF" ou "CNPJ", para rotular o documento nos textos. */
export function rotuloDoDocumento(valor: string | null | undefined): 'CPF' | 'CNPJ' {
  return tipoDoDocumento(valor) === 'cpf' ? 'CPF' : 'CNPJ'
}

/**
 * A recusa pronta para o usuário, ou `null` se o documento serve.
 * `aceitarCpf` = o cadastro admite pessoa física.
 */
export function problemaNoDocumento(
  valor: string,
  { aceitarCpf = true }: { aceitarCpf?: boolean } = {},
): string | null {
  const tipo = tipoDoDocumento(valor)
  if (!tipo || (tipo === 'cpf' && !aceitarCpf)) {
    return aceitarCpf
      ? 'Informe um CPF (11 dígitos) ou um CNPJ (14 caracteres).'
      : 'Informe os 14 caracteres do CNPJ.'
  }
  if (!documentoValido(valor)) {
    return `O ${tipo === 'cpf' ? 'CPF' : 'CNPJ'} ${formatarDocumento(valor)} não confere no dígito verificador. Confira o número.`
  }
  return null
}
