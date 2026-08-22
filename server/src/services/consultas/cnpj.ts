// ============================================================
// Cadastro da empresa a partir do CNPJ.
//
// A fonte é a BrasilAPI, que republica o cadastro aberto da Receita
// Federal — sem chave, sem cadastro, sem custo. É a mesma base que o
// perito consultaria à mão antes de digitar razão social e endereço.
//
// O texto vem da Receita como está registrado lá: caixa alta e sem
// acento. Fica assim de propósito — é a forma oficial, e é ela que
// tem de aparecer na qualificação das partes do laudo. A única
// exceção é a cidade, trocada pelo nome do IBGE ("São Paulo" no
// lugar de "SAO PAULO"), porque esse campo vira "Cidade/UF" no
// cabeçalho e na comarca.
//
// Nada aqui decide grau de risco: o grau vem da NR-04 e depende do
// CNAE *principal da atividade avaliada*, o que é leitura do perito,
// não dedução automática de cadastro.
// ============================================================

import { ErroHttp } from '../../erros.js'
import { buscarJson, criarCache, FonteIndisponivel, type OpcoesBusca } from './fonte.js'
import { municipioPorCodigo } from './ibge.js'

const URL_BASE = 'https://brasilapi.com.br/api/cnpj/v1'

export interface DadosCnpj {
  cnpj: string
  cnpjFormatado: string
  razaoSocial: string
  nomeFantasia: string | null
  situacao: string | null
  situacaoDesde: string | null
  cnae: string | null
  cnaeDescricao: string | null
  naturezaJuridica: string | null
  porte: string | null
  abertura: string | null
  endereco: string
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string
  uf: string
  cep: string | null
  telefone: string | null
  email: string | null
  consultadoEm: string
  fonte: string
}

/** Só os dígitos, e apenas se forem 14. */
export function normalizarCnpj(bruto: string): string | null {
  const digitos = (bruto ?? '').replace(/\D/g, '')
  return digitos.length === 14 ? digitos : null
}

/**
 * Dígito verificador do CNPJ (módulo 11).
 *
 * Vale a checagem antes de sair pela rede: um dígito trocado na
 * digitação vira "CNPJ não encontrado", mensagem que faz o perito
 * desconfiar da ferramenta em vez de conferir o número.
 */
export function cnpjValido(numero: string): boolean {
  const s = normalizarCnpj(numero)
  if (!s || /^(\d)\1{13}$/.test(s)) return false

  const digito = (parcial: string): number => {
    let soma = 0
    let peso = parcial.length - 7
    for (const caractere of parcial) {
      soma += Number(caractere) * peso--
      if (peso < 2) peso = 9
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const base = s.slice(0, 12)
  return digito(base) === Number(s[12]) && digito(base + s[12]) === Number(s[13])
}

export function formatarCnpj(numero: string): string {
  const s = normalizarCnpj(numero)
  if (!s) return numero
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}

/** 9430800 → "94.30-8-00", no formato que a tela do cadastro já usa. */
export function formatarCnae(bruto: unknown): string | null {
  const digitos = String(bruto ?? '').replace(/\D/g, '')
  if (digitos.length !== 7) return null
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 4)}-${digitos.slice(4, 5)}-${digitos.slice(5)}`
}

export function formatarCep(bruto: unknown): string | null {
  const digitos = String(bruto ?? '').replace(/\D/g, '')
  if (digitos.length !== 8) return null
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}

/** "1123851939" → "(11) 2385-1939"; celular com 9 dígitos também. */
export function formatarTelefone(bruto: unknown): string | null {
  const digitos = String(bruto ?? '').replace(/\D/g, '')
  if (digitos.length !== 10 && digitos.length !== 11) return null
  const ddd = digitos.slice(0, 2)
  const resto = digitos.slice(2)
  const corte = resto.length - 4
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}

const texto = (valor: unknown): string | null => {
  const limpo = typeof valor === 'string' ? valor.trim() : valor == null ? '' : String(valor).trim()
  return limpo ? limpo : null
}

/**
 * Junta tipo e nome do logradouro. A Receita guarda os dois separados
 * ("AVENIDA" + "PAULISTA"), mas alguns registros já trazem o tipo
 * embutido — daí a checagem antes de repetir a palavra.
 */
export function montarLogradouro(tipo: unknown, logradouro: unknown): string {
  const nome = texto(logradouro) ?? ''
  const prefixo = texto(tipo)
  if (!prefixo) return nome
  if (!nome) return prefixo
  return nome.toUpperCase().startsWith(prefixo.toUpperCase()) ? nome : `${prefixo} ${nome}`
}

/** Traduz a resposta da BrasilAPI para o que o cadastro de empresa usa. */
export function mapearCnpj(
  bruto: unknown,
  extras: { cidade?: string | null; agora?: () => Date } = {},
): DadosCnpj {
  const d = (bruto ?? {}) as Record<string, unknown>
  const numero = normalizarCnpj(String(d.cnpj ?? '')) ?? ''

  return {
    cnpj: numero,
    cnpjFormatado: formatarCnpj(numero),
    razaoSocial: texto(d.razao_social) ?? '',
    nomeFantasia: texto(d.nome_fantasia),
    situacao: texto(d.descricao_situacao_cadastral),
    situacaoDesde: texto(d.data_situacao_cadastral),
    cnae: formatarCnae(d.cnae_fiscal),
    cnaeDescricao: texto(d.cnae_fiscal_descricao),
    naturezaJuridica: texto(d.natureza_juridica),
    porte: texto(d.porte),
    abertura: texto(d.data_inicio_atividade),
    endereco: montarLogradouro(d.descricao_tipo_de_logradouro, d.logradouro),
    numero: texto(d.numero),
    complemento: texto(d.complemento),
    bairro: texto(d.bairro),
    cidade: texto(extras.cidade) ?? texto(d.municipio) ?? '',
    uf: (texto(d.uf) ?? '').toUpperCase(),
    cep: formatarCep(d.cep),
    telefone: formatarTelefone(d.ddd_telefone_1),
    email: texto(d.email)?.toLowerCase() ?? null,
    consultadoEm: (extras.agora?.() ?? new Date()).toISOString(),
    fonte: 'Receita Federal (via BrasilAPI)',
  }
}

const cache = criarCache<DadosCnpj>(6 * 60 * 60 * 1000)

export interface OpcoesConsultaCnpj extends Pick<OpcoesBusca, 'buscar' | 'tempoLimiteMs'> {
  agora?: () => Date
}

export async function consultarCnpj(bruto: string, opcoes: OpcoesConsultaCnpj = {}): Promise<DadosCnpj> {
  const numero = normalizarCnpj(bruto)
  if (!numero) throw new ErroHttp(422, 'Informe os 14 dígitos do CNPJ.')
  if (!cnpjValido(numero)) {
    throw new ErroHttp(
      422,
      `O CNPJ ${formatarCnpj(numero)} não passa na checagem do dígito verificador. Confira os números digitados.`,
    )
  }

  const emCache = cache.ler(numero)
  if (emCache) return emCache

  const { status, corpo } = await buscarJson(`${URL_BASE}/${numero}`, {
    fonte: 'A consulta pública de CNPJ',
    tempoLimiteMs: opcoes.tempoLimiteMs ?? 12_000,
    ...(opcoes.buscar ? { buscar: opcoes.buscar } : {}),
  }).catch((erro: unknown) => {
    if (erro instanceof FonteIndisponivel) {
      throw new ErroHttp(
        504,
        `${erro.message} Tente de novo em instantes ou preencha os dados da empresa à mão.`,
      )
    }
    throw erro
  })

  if (status === 404) {
    throw new ErroHttp(
      404,
      `CNPJ ${formatarCnpj(numero)} não consta no cadastro público da Receita Federal. Confira o número ou preencha à mão.`,
    )
  }
  if (status === 429) {
    throw new ErroHttp(
      503,
      'A consulta pública de CNPJ está limitando as buscas neste momento. Tente de novo em alguns instantes.',
    )
  }
  if (status !== 200 || !corpo || typeof corpo !== 'object') {
    throw new ErroHttp(
      502,
      `A consulta pública de CNPJ respondeu de forma inesperada (HTTP ${status}). Preencha os dados à mão.`,
    )
  }

  // Nome do município pelo IBGE — só para trocar "SAO PAULO" por
  // "São Paulo". Se o IBGE não responder, fica o texto da Receita.
  const municipio = await municipioPorCodigo(
    (corpo as Record<string, unknown>).codigo_municipio_ibge as number | undefined,
    { ...(opcoes.buscar ? { buscar: opcoes.buscar } : {}) },
  )

  const dados = mapearCnpj(corpo, {
    ...(municipio?.nome ? { cidade: municipio.nome } : {}),
    ...(opcoes.agora ? { agora: opcoes.agora } : {}),
  })

  if (!dados.razaoSocial) {
    throw new ErroHttp(502, 'A consulta pública de CNPJ respondeu sem a razão social. Preencha à mão.')
  }

  cache.gravar(numero, dados)
  return dados
}

/** Só para os testes. */
export function limparCacheDeCnpj(): void {
  cache.limpar()
}
