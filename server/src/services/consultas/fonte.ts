// ============================================================
// Ida às fontes públicas (Receita Federal via BrasilAPI, CNJ, IBGE).
//
// Três cuidados valem para todas elas:
//
//   · identificação honesta no User-Agent — a BrasilAPI recusa
//     requisição sem agente (HTTP 403 "Forbidden"), e um agente
//     identificado é o que permite ao mantenedor da fonte falar com
//     a gente se o nosso uso pesar. Nada de fingir navegador;
//   · tempo limite curto — do outro lado da chamada tem um perito
//     parado na tela esperando o campo preencher. Meio minuto preso
//     num serviço que caiu é pior do que dizer "não respondeu,
//     preencha à mão";
//   · cache em memória — o mesmo CNPJ e o mesmo processo são
//     consultados várias vezes seguidas enquanto o cadastro é
//     conferido, e a fonte pública não tem por que pagar por isso.
//
// Este módulo não conhece Express: quem transforma falha de fonte em
// resposta HTTP é a rota.
// ============================================================

/** Identificação enviada às fontes públicas. */
export const AGENTE = 'D&R Pericia Elite/1.0 (+https://drpericiatrabalhista.com.br)'

export interface RespostaFonte {
  status: number
  corpo: unknown
  /** Corpo cru, útil quando a fonte responde texto em vez de JSON. */
  texto: string
}

/** A fonte não respondeu: rede, tempo limite ou erro interno dela. */
export class FonteIndisponivel extends Error {
  constructor(
    readonly fonte: string,
    readonly causa: string,
  ) {
    super(`${fonte} não respondeu (${causa}).`)
    this.name = 'FonteIndisponivel'
  }
}

export interface OpcoesBusca {
  metodo?: 'GET' | 'POST'
  corpo?: unknown
  cabecalhos?: Record<string, string>
  tempoLimiteMs?: number
  /** Nome da fonte para a mensagem de erro. */
  fonte?: string
  buscar?: typeof fetch
}

/**
 * GET/POST em JSON com tempo limite. Devolve a resposta mesmo em
 * status de erro — quem chama decide o que 404 e 429 significam.
 */
export async function buscarJson(url: string, opcoes: OpcoesBusca = {}): Promise<RespostaFonte> {
  const {
    metodo = 'GET',
    corpo,
    cabecalhos = {},
    tempoLimiteMs = 12_000,
    fonte = 'A consulta pública',
    buscar = fetch,
  } = opcoes

  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), tempoLimiteMs)

  try {
    const resposta = await buscar(url, {
      method: metodo,
      headers: {
        'User-Agent': AGENTE,
        Accept: 'application/json',
        ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...cabecalhos,
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      signal: controle.signal,
    })

    const texto = await resposta.text()
    let dados: unknown = null
    try {
      dados = texto ? JSON.parse(texto) : null
    } catch {
      /* fonte respondeu algo que não é JSON — fica só com o texto */
    }

    return { status: resposta.status, corpo: dados, texto }
  } catch (erro) {
    const causa =
      erro instanceof Error && erro.name === 'AbortError'
        ? `sem resposta em ${Math.round(tempoLimiteMs / 1000)}s`
        : erro instanceof Error
          ? erro.message
          : String(erro)
    throw new FonteIndisponivel(fonte, causa)
  } finally {
    clearTimeout(relogio)
  }
}

export interface Cache<T> {
  ler(chave: string): T | undefined
  gravar(chave: string, valor: T): void
  limpar(): void
}

/**
 * Cache simples com validade e teto de tamanho.
 *
 * Sem persistência de propósito: o dado é público, muda pouco e um
 * reinício da API custa apenas uma nova ida à fonte.
 */
export function criarCache<T>(
  ttlMs: number,
  tamanhoMaximo = 500,
  agora: () => number = Date.now,
): Cache<T> {
  const itens = new Map<string, { valor: T; expiraEm: number }>()

  return {
    ler(chave) {
      const item = itens.get(chave)
      if (!item) return undefined
      if (item.expiraEm <= agora()) {
        itens.delete(chave)
        return undefined
      }
      return item.valor
    },
    gravar(chave, valor) {
      // Descarta o mais antigo quando estoura — é cache, não banco.
      if (itens.size >= tamanhoMaximo) {
        const primeiro = itens.keys().next()
        if (!primeiro.done) itens.delete(primeiro.value)
      }
      itens.set(chave, { valor, expiraEm: agora() + ttlMs })
    },
    limpar() {
      itens.clear()
    },
  }
}
