import { ErroHttp } from '../../erros.js'
import { buscarJson, criarCache, FonteIndisponivel, type OpcoesBusca } from './fonte.js'
import { formatarCep } from './cnpj.js'

const URL_BASE = 'https://brasilapi.com.br/api/cep/v2'

export interface DadosCep {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  enderecoCompleto: string
  fonte: string
}

const texto = (valor: unknown): string =>
  typeof valor === 'string' ? valor.trim() : valor == null ? '' : String(valor).trim()

export function normalizarCep(bruto: string): string | null {
  const digitos = (bruto ?? '').replace(/\D/g, '')
  return digitos.length === 8 ? digitos : null
}

export function mapearCep(bruto: unknown): DadosCep {
  const d = (bruto ?? {}) as Record<string, unknown>
  const cep = formatarCep(d.cep) ?? ''
  const logradouro = texto(d.street)
  const bairro = texto(d.neighborhood)
  const cidade = texto(d.city)
  const uf = texto(d.state).toUpperCase()
  const enderecoCompleto = [logradouro, bairro, [cidade, uf].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(' — ')

  return {
    cep,
    logradouro,
    bairro,
    cidade,
    uf,
    enderecoCompleto,
    fonte: 'BrasilAPI (bases públicas de CEP)',
  }
}

const cache = criarCache<DadosCep>(24 * 60 * 60 * 1000)

export interface OpcoesConsultaCep extends Pick<OpcoesBusca, 'buscar' | 'tempoLimiteMs'> {}

export async function consultarCep(bruto: string, opcoes: OpcoesConsultaCep = {}): Promise<DadosCep> {
  const numero = normalizarCep(bruto)
  if (!numero) throw new ErroHttp(422, 'Informe os 8 dígitos do CEP.')

  const emCache = cache.ler(numero)
  if (emCache) return emCache

  const { status, corpo } = await buscarJson(`${URL_BASE}/${numero}`, {
    fonte: 'A consulta pública de CEP',
    tempoLimiteMs: opcoes.tempoLimiteMs ?? 10_000,
    ...(opcoes.buscar ? { buscar: opcoes.buscar } : {}),
  }).catch((erro: unknown) => {
    if (erro instanceof FonteIndisponivel) {
      throw new ErroHttp(504, `${erro.message} Tente novamente ou preencha o endereço à mão.`)
    }
    throw erro
  })

  if (status === 404) {
    throw new ErroHttp(404, `CEP ${formatarCep(numero)} não encontrado. Confira o número ou preencha o endereço à mão.`)
  }
  if (status === 429) throw new ErroHttp(503, 'A consulta de CEP atingiu o limite temporário. Tente novamente em instantes.')
  if (status < 200 || status >= 300) throw new ErroHttp(502, 'A fonte pública de CEP respondeu de forma inesperada. Preencha o endereço à mão.')

  const dados = mapearCep(corpo)
  if (!dados.cidade || !dados.uf) throw new ErroHttp(502, 'A fonte pública não devolveu um endereço completo. Preencha o endereço à mão.')

  cache.gravar(numero, dados)
  return dados
}

export function limparCacheDeCep(): void {
  cache.limpar()
}
