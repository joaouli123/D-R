// ============================================================
// Nome oficial do município a partir do código do IBGE.
//
// Duas consultas precisam disto: o CNPJ (a Receita devolve o
// município em caixa alta e sem acento — "SAO PAULO") e o processo
// (o CNJ devolve só o código do município do órgão julgador).
//
// A tabela do IBGE praticamente não muda, então o cache é longo e a
// falha é silenciosa: sem o nome bonito o cadastro segue com o que a
// fonte original deu, em vez de o campo ficar vazio.
// ============================================================

import { buscarJson, criarCache, type OpcoesBusca } from './fonte.js'

const URL_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios'

export interface Municipio {
  codigo: number
  nome: string
  uf: string | null
}

const cache = criarCache<Municipio>(30 * 24 * 60 * 60 * 1000, 5_000)

interface UfIbge {
  sigla?: string
}

/**
 * A sigla da UF fica em lugares diferentes conforme a versão do
 * registro: municípios antigos trazem microrregião/mesorregião,
 * os mais novos só a região imediata.
 */
function ufDe(registro: Record<string, unknown>): string | null {
  const caminhos: unknown[] = [
    (registro.microrregiao as { mesorregiao?: { UF?: UfIbge } } | undefined)?.mesorregiao?.UF,
    (registro['regiao-imediata'] as { 'regiao-intermediaria'?: { UF?: UfIbge } } | undefined)?.[
      'regiao-intermediaria'
    ]?.UF,
    registro.UF,
  ]

  for (const candidato of caminhos) {
    const sigla = (candidato as UfIbge | undefined)?.sigla
    if (typeof sigla === 'string' && sigla.length === 2) return sigla.toUpperCase()
  }
  return null
}

/** Devolve null quando o IBGE não conhece o código ou não responde. */
export async function municipioPorCodigo(
  codigo: number | string | null | undefined,
  opcoes: Pick<OpcoesBusca, 'buscar' | 'tempoLimiteMs'> = {},
): Promise<Municipio | null> {
  const numero = Number(codigo)
  if (!Number.isInteger(numero) || numero <= 0) return null

  const emCache = cache.ler(String(numero))
  if (emCache) return emCache

  try {
    const { status, corpo } = await buscarJson(`${URL_BASE}/${numero}`, {
      fonte: 'A tabela de municípios do IBGE',
      tempoLimiteMs: opcoes.tempoLimiteMs ?? 8_000,
      ...(opcoes.buscar ? { buscar: opcoes.buscar } : {}),
    })

    if (status !== 200 || !corpo || typeof corpo !== 'object') return null

    const registro = corpo as Record<string, unknown>
    const nome = typeof registro.nome === 'string' ? registro.nome : null
    if (!nome) return null

    const municipio: Municipio = { codigo: numero, nome, uf: ufDe(registro) }
    cache.gravar(String(numero), municipio)
    return municipio
  } catch {
    // IBGE fora do ar não pode derrubar a consulta principal.
    return null
  }
}

/** Só para os testes: zera o cache entre cenários. */
export function limparCacheDeMunicipios(): void {
  cache.limpar()
}
