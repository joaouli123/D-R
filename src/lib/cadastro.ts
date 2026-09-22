// ============================================================
// Documentos e contatos de cadastro: CPF, CNPJ, CEP e telefone.
//
// Tudo aqui roda a cada tecla, então as máscaras são progressivas:
// formatam o que já foi digitado, sem inventar separador no fim (quem
// apaga não esbarra num ponto que volta sozinho).
//
// O campo "CPF ou CNPJ" decide o tipo pelo próprio conteúdo: até 11
// dígitos é CPF; passou disso, ou apareceu letra, é CNPJ. A letra vem
// do CNPJ alfanumérico (IN RFB 2.229/2024, emitido desde julho de 2026):
// 12 posições de letras ou números e 2 dígitos verificadores numéricos.
// O cálculo do dígito é o mesmo módulo 11 de sempre, tomando cada
// caractere pelo código ASCII menos 48 — nos números, dá o próprio
// algarismo; "A" vale 17.
// ============================================================

export type TipoDocumentoFiscal = 'cpf' | 'cnpj'

/** Letras e números em maiúsculas: a forma em que o documento se compara. */
export function limparDocumento(valor: string | null | undefined): string {
  return String(valor ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
}

const soDigitos = (valor: string | null | undefined) => String(valor ?? '').replace(/\D/g, '')

/** O que está sendo digitado — `null` com o campo vazio. */
export function tipoDoDocumento(valor: string | null | undefined): TipoDocumentoFiscal | null {
  const limpo = limparDocumento(valor)
  if (!limpo) return null
  return /[A-Z]/.test(limpo) || limpo.length > 11 ? 'cnpj' : 'cpf'
}

/** 12 posições livres (letra ou número) e os 2 verificadores só em número. */
function caracteresDeCnpj(valor: string): string {
  let saida = ''
  for (const caractere of limparDocumento(valor)) {
    if (saida.length >= 14) break
    if (saida.length >= 12 && !/\d/.test(caractere)) continue
    saida += caractere
  }
  return saida
}

/** 00.000.000/0000-00, aceitando letras nas 12 primeiras posições. */
export function mascararCnpj(valor: string): string {
  const s = caracteresDeCnpj(valor)
  let saida = s.slice(0, 2)
  if (s.length > 2) saida += `.${s.slice(2, 5)}`
  if (s.length > 5) saida += `.${s.slice(5, 8)}`
  if (s.length > 8) saida += `/${s.slice(8, 12)}`
  if (s.length > 12) saida += `-${s.slice(12, 14)}`
  return saida
}

/** 000.000.000-00. */
export function mascararCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11)
  let saida = d.slice(0, 3)
  if (d.length > 3) saida += `.${d.slice(3, 6)}`
  if (d.length > 6) saida += `.${d.slice(6, 9)}`
  if (d.length > 9) saida += `-${d.slice(9, 11)}`
  return saida
}

/** A máscara muda sozinha de CPF para CNPJ quando o número passa de 11. */
export function mascararCpfCnpj(valor: string): string {
  return tipoDoDocumento(valor) === 'cnpj' ? mascararCnpj(valor) : mascararCpf(valor)
}

/** Formata o documento já gravado; o que não for CPF nem CNPJ volta como veio. */
export function formatarDocumento(valor: string | null | undefined): string {
  const limpo = limparDocumento(valor)
  if (limpo.length === 11 && /^\d+$/.test(limpo)) return mascararCpf(limpo)
  if (limpo.length === 14) return mascararCnpj(limpo)
  return String(valor ?? '').trim()
}

/** "CPF" ou "CNPJ", para rotular o documento já gravado. */
export function rotuloDoDocumento(valor: string | null | undefined): 'CPF' | 'CNPJ' {
  const limpo = limparDocumento(valor)
  return limpo.length === 11 && /^\d+$/.test(limpo) ? 'CPF' : 'CNPJ'
}

export function cpfValido(valor: string | null | undefined): boolean {
  const d = soDigitos(valor)
  if (d.length !== 11 || limparDocumento(valor).length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (parcial: string) => {
    let soma = 0
    for (let i = 0; i < parcial.length; i++) soma += Number(parcial[i]) * (parcial.length + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10])
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
  if (tipo === 'cpf') return cpfValido(valor)
  if (tipo === 'cnpj') return cnpjValido(valor)
  return false
}

/**
 * A recusa de quem vai salvar — a mesma do servidor —, ou `null` se o
 * documento serve. `aceitarCpf` = o cadastro admite pessoa física.
 */
export function problemaNoDocumento(
  valor: string | null | undefined,
  { aceitarCpf = true }: { aceitarCpf?: boolean } = {},
): string | null {
  const limpo = limparDocumento(valor)
  const tipo = /^\d{11}$/.test(limpo) ? 'CPF' : /^[0-9A-Z]{12}\d{2}$/.test(limpo) ? 'CNPJ' : null
  if (!tipo || (tipo === 'CPF' && !aceitarCpf)) {
    return aceitarCpf
      ? 'Informe um CPF (11 dígitos) ou um CNPJ (14 caracteres).'
      : 'Informe os 14 caracteres do CNPJ.'
  }
  if (!documentoValido(limpo)) {
    return `O ${tipo} ${formatarDocumento(limpo)} não confere no dígito verificador. Confira o número.`
  }
  return null
}

export type TomDaSituacao = 'neutro' | 'ok' | 'aviso' | 'erro'

export interface SituacaoDoDocumento {
  tipo: TipoDocumentoFiscal | null
  /** Já tem todos os caracteres do tipo identificado. */
  completo: boolean
  valido: boolean
  mensagem: string
  tom: TomDaSituacao
}

const faltam = (n: number, de: string) =>
  n === 1 ? `Falta 1 dígito para o ${de}.` : `Faltam ${n} dígitos para o ${de}.`

/**
 * O que dizer embaixo do campo enquanto a pessoa digita. Com `aceitarCpf`,
 * 11 dígitos que não fecham um CPF não são erro ainda: podem ser o começo
 * de um CNPJ.
 */
export function situacaoDoDocumento(
  valor: string | null | undefined,
  { aceitarCpf = true }: { aceitarCpf?: boolean } = {},
): SituacaoDoDocumento {
  const limpo = limparDocumento(valor)
  const tipo: TipoDocumentoFiscal | null = !limpo
    ? null
    : aceitarCpf
      ? tipoDoDocumento(limpo)
      : 'cnpj'

  if (!tipo) return { tipo, completo: false, valido: false, mensagem: '', tom: 'neutro' }

  if (tipo === 'cpf') {
    if (limpo.length < 11) {
      return { tipo, completo: false, valido: false, mensagem: faltam(11 - limpo.length, 'CPF'), tom: 'neutro' }
    }
    return cpfValido(limpo)
      ? { tipo, completo: true, valido: true, mensagem: 'CPF válido.', tom: 'ok' }
      : {
          tipo,
          completo: true,
          valido: false,
          mensagem: 'Não é um CPF válido. Se for CNPJ, continue digitando.',
          tom: 'aviso',
        }
  }

  if (limpo.length < 14) {
    return { tipo, completo: false, valido: false, mensagem: faltam(14 - limpo.length, 'CNPJ'), tom: 'neutro' }
  }
  return cnpjValido(limpo)
    ? { tipo, completo: true, valido: true, mensagem: 'CNPJ válido.', tom: 'ok' }
    : {
        tipo,
        completo: true,
        valido: false,
        mensagem: 'CNPJ inválido: o dígito verificador não confere. Confira o número.',
        tom: 'erro',
      }
}

/** 00000-000. */
export function mascararCep(valor: string): string {
  const d = soDigitos(valor).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export const cepCompleto = (valor: string | null | undefined) => soDigitos(valor).length === 8

/** (00) 0000-0000 no fixo, (00) 00000-0000 no celular. */
export function mascararTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `(${ddd}) ${resto}`
  const corte = resto.length === 9 ? 5 : 4
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}

export function emailValido(valor: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor ?? '').trim())
}

export const TAMANHO_MINIMO_DA_SENHA = 8

/** Por que a senha ainda não serve — `null` quando serve. */
export function problemaNaSenha(senha: string, confirmacao: string): string | null {
  if (senha.length < TAMANHO_MINIMO_DA_SENHA) {
    return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`
  }
  if (senha !== confirmacao) return 'As senhas não conferem. Digite a mesma senha nos dois campos.'
  return null
}
