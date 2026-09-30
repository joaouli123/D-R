// ============================================================
// Dados básicos do processo a partir do número CNJ.
//
// A fonte é a API Pública do DataJud (CNJ), que espelha o que os
// tribunais publicam: número, classe, assuntos, órgão julgador, data
// de ajuizamento e movimentação. É consulta pública — a chave de
// acesso é publicada pelo próprio CNJ no wiki da API.
//
// O que ela NÃO traz: os nomes das partes. Reclamante e reclamadas
// continuam sendo digitados pelo perito, e a resposta diz isso em
// voz alta para ninguém ficar esperando o campo preencher sozinho.
//
// Um mesmo número costuma voltar duas vezes, uma por grau (G1 e G2).
// Para a perícia interessa o G1: é a vara que designou a diligência.
// O G2 vai junto, como conferência, porque saber que existe recurso
// muda o prazo com que o perito trabalha.
// ============================================================

import { ErroHttp } from '../../erros.js'
import { buscarJson, criarCache, FonteIndisponivel, type OpcoesBusca } from './fonte.js'
import { municipioPorCodigo } from './ibge.js'

const URL_BASE = 'https://api-publica.datajud.cnj.jus.br'

export interface InstanciaProcesso {
  grau: string | null
  grauRotulo: string
  orgao: string | null
  classe: string | null
  dataAjuizamento: string | null
  ultimaAtualizacao: string | null
  assuntos: string[]
}

export interface DadosProcesso {
  numeroProcesso: string
  numeroFormatado: string
  tribunal: string | null
  grau: string | null
  grauRotulo: string
  vara: string | null
  comarca: string | null
  classe: string | null
  assuntos: string[]
  dataAjuizamento: string | null
  instancias: InstanciaProcesso[]
  consultadoEm: string
  fonte: string
  aviso: string
}

export const AVISO_PARTES =
  'A base pública do CNJ publica a tramitação, mas não os nomes das partes — reclamante e reclamadas continuam sendo preenchidos por você.'

/** Só os dígitos, e apenas se forem os 20 do padrão CNJ. */
export function normalizarNumeroProcesso(bruto: string): string | null {
  const digitos = (bruto ?? '').replace(/\D/g, '')
  return digitos.length === 20 ? digitos : null
}

export interface PartesDoNumero {
  sequencial: string
  dv: string
  ano: string
  segmento: string
  tribunal: string
  origem: string
}

/** NNNNNNN-DD.AAAA.J.TR.OOOO (Resolução CNJ 65/2008). */
export function partesDoNumero(numero: string): PartesDoNumero | null {
  const s = normalizarNumeroProcesso(numero)
  if (!s) return null
  return {
    sequencial: s.slice(0, 7),
    dv: s.slice(7, 9),
    ano: s.slice(9, 13),
    segmento: s.slice(13, 14),
    tribunal: s.slice(14, 16),
    origem: s.slice(16, 20),
  }
}

/** Dígito verificador do número CNJ: módulo 97, base 10 (ISO 7064). */
export function digitoVerificadorCnj(numero: string): string | null {
  const p = partesDoNumero(numero)
  if (!p) return null
  const base = BigInt(`${p.sequencial}${p.ano}${p.segmento}${p.tribunal}${p.origem}00`)
  return String(98n - (base % 97n)).padStart(2, '0')
}

export function numeroCnjValido(numero: string): boolean {
  const p = partesDoNumero(numero)
  return !!p && digitoVerificadorCnj(numero) === p.dv
}

export function formatarNumeroCnj(numero: string): string {
  const p = partesDoNumero(numero)
  if (!p) return numero
  return `${p.sequencial}-${p.dv}.${p.ano}.${p.segmento}.${p.tribunal}.${p.origem}`
}

/**
 * UF de cada Região da Justiça do Trabalho.
 *
 * Serve só de rede de segurança para a comarca quando o IBGE não
 * responde. As regiões que abrangem mais de um estado ficam de fora
 * de propósito: chutar a UF errada num laudo é pior do que omitir.
 */
const UF_POR_REGIAO_TRT: Record<string, string> = {
  '01': 'RJ', '02': 'SP', '03': 'MG', '04': 'RS', '05': 'BA', '06': 'PE',
  '07': 'CE', '09': 'PR', '12': 'SC', '13': 'PB', '15': 'SP', '16': 'MA',
  '17': 'ES', '18': 'GO', '19': 'AL', '20': 'SE', '21': 'RN', '22': 'PI',
  '23': 'MT', '24': 'MS',
}

export interface IndiceDataJud {
  alias: string
  tribunal: string
}

/**
 * Índice do DataJud correspondente ao número.
 *
 * Cobre o que esta ferramenta usa: Justiça do Trabalho (o caso de
 * todo laudo de insalubridade) e Justiça Federal. Fora disso devolve
 * null, e a tela diz que ali é preenchimento manual — melhor do que
 * inventar um índice e receber um erro de banco do CNJ.
 */
export function indiceDataJud(numero: string): IndiceDataJud | null {
  const p = partesDoNumero(numero)
  if (!p) return null

  const regiao = Number(p.tribunal)

  if (p.segmento === '5') {
    if (p.tribunal === '00') return { alias: 'api_publica_tst', tribunal: 'TST' }
    if (regiao >= 1 && regiao <= 24) {
      return { alias: `api_publica_trt${regiao}`, tribunal: `TRT${regiao}` }
    }
    return null
  }

  if (p.segmento === '4' && regiao >= 1 && regiao <= 6) {
    return { alias: `api_publica_trf${regiao}`, tribunal: `TRF${regiao}` }
  }

  return null
}

const ROTULOS_GRAU: Record<string, string> = {
  G1: '1º grau',
  G2: '2º grau',
  JE: 'Juizado Especial',
  TR: 'Turma Recursal',
  TRU: 'Turma Regional de Uniformização',
  TNU: 'Turma Nacional de Uniformização',
  SUP: 'Instância superior',
}

export function rotuloDoGrau(grau: unknown): string {
  const chave = String(grau ?? '').toUpperCase()
  return ROTULOS_GRAU[chave] ?? (chave || 'Grau não informado')
}

/**
 * O CNJ usa dois formatos de data: "20220223165523" e ISO completo.
 * Só a parte do dia interessa aqui.
 */
export function dataDoCnj(bruto: unknown): string | null {
  const valor = String(bruto ?? '').trim()
  if (!valor) return null

  const compacta = valor.match(/^(\d{4})(\d{2})(\d{2})/)
  if (compacta) return `${compacta[1]}-${compacta[2]}-${compacta[3]}`

  const iso = valor.match(/^(\d{4}-\d{2}-\d{2})/)
  return iso ? (iso[1] ?? null) : null
}

const texto = (valor: unknown): string | null => {
  const limpo = typeof valor === 'string' ? valor.trim() : valor == null ? '' : String(valor).trim()
  return limpo ? limpo : null
}

interface FonteHit {
  tribunal?: unknown
  grau?: unknown
  numeroProcesso?: unknown
  dataAjuizamento?: unknown
  dataHoraUltimaAtualizacao?: unknown
  classe?: { nome?: unknown }
  orgaoJulgador?: { nome?: unknown; codigoMunicipioIBGE?: unknown }
  assuntos?: { nome?: unknown }[]
}

function instanciaDe(fonte: FonteHit): InstanciaProcesso {
  return {
    grau: texto(fonte.grau),
    grauRotulo: rotuloDoGrau(fonte.grau),
    orgao: texto(fonte.orgaoJulgador?.nome),
    classe: texto(fonte.classe?.nome),
    dataAjuizamento: dataDoCnj(fonte.dataAjuizamento),
    ultimaAtualizacao: dataDoCnj(fonte.dataHoraUltimaAtualizacao),
    assuntos: (fonte.assuntos ?? []).map((a) => texto(a?.nome)).filter((n): n is string => !!n),
  }
}

/** Ordena os graus do mais baixo para o mais alto — G1 primeiro. */
function ordemDoGrau(grau: string | null): number {
  const posicao = ['G1', 'JE', 'G2', 'TR', 'TRU', 'TNU', 'SUP'].indexOf((grau ?? '').toUpperCase())
  return posicao < 0 ? 99 : posicao
}

/**
 * Cidade que dá nome à vara, quando o IBGE não respondeu.
 * "2ª Vara do Trabalho de São Paulo" → "São Paulo".
 */
export function cidadeDoOrgao(orgao: string | null): string | null {
  if (!orgao) return null
  const casada = orgao.match(/\bde\s+(.+)$/i)
  const cidade = casada?.[1]?.trim()
  return cidade && cidade.length > 1 ? cidade : null
}

export interface OpcoesMapa {
  municipio?: { nome: string; uf: string | null } | null
  ufDoTribunal?: string | null
  agora?: () => Date
}

export function mapearProcesso(
  hits: unknown[],
  numero: string,
  opcoes: OpcoesMapa = {},
): DadosProcesso | null {
  const fontes = hits
    .map((hit) => (hit as { _source?: FonteHit })?._source)
    .filter((fonte): fonte is FonteHit => !!fonte && typeof fonte === 'object')

  if (!fontes.length) return null

  // Grau mais baixo primeiro: é a vara do processo que designou a
  // perícia, e é dela que saem vara e comarca.
  const ordenadas = fontes
    .slice()
    .sort((a, b) => ordemDoGrau(texto(a.grau)) - ordemDoGrau(texto(b.grau)))
  const instancias = ordenadas.map(instanciaDe)
  const principal = ordenadas[0] as FonteHit
  const resumo = instancias[0] as InstanciaProcesso

  const cidade = opcoes.municipio?.nome ?? cidadeDoOrgao(resumo.orgao)
  const uf = opcoes.municipio?.uf ?? opcoes.ufDoTribunal ?? null

  return {
    numeroProcesso: numero,
    numeroFormatado: formatarNumeroCnj(numero),
    tribunal: texto(principal.tribunal),
    grau: resumo.grau,
    grauRotulo: resumo.grauRotulo,
    vara: resumo.orgao,
    comarca: cidade ? (uf ? `${cidade}/${uf}` : cidade) : null,
    classe: resumo.classe,
    assuntos: resumo.assuntos,
    dataAjuizamento: resumo.dataAjuizamento,
    instancias,
    consultadoEm: (opcoes.agora?.() ?? new Date()).toISOString(),
    fonte: 'DataJud — API Pública do CNJ',
    aviso: AVISO_PARTES,
  }
}

const cache = criarCache<DadosProcesso>(60 * 60 * 1000)

// ============================================================
// Espera longa sem prender o navegador.
//
// A base do CNJ passou a responder em 20, 30, às vezes 40 segundos,
// e a devolver 429 quando insiste. Uma requisição HTTP presa todo
// esse tempo não sobrevive: o proxy na frente corta antes e o perito
// recebe um 504 cru, sem nem a explicação do que houve.
//
// Então a busca virou trabalho de fundo. A requisição espera alguns
// segundos; se o CNJ não respondeu até lá, ela devolve "ainda
// buscando" e vai embora — mas a busca continua correndo aqui no
// servidor, insistindo por até dois minutos. A tela volta para
// perguntar de tempos em tempos e, quando o dado chega, avisa o
// perito. Ninguém fica olhando spinner, e ninguém perde a consulta.
// ============================================================

/** Pausa antes de cada tentativa. A primeira sai na hora. */
const PAUSAS_ENTRE_TENTATIVAS = [0, 3_000, 8_000, 15_000]

/** Teto de cada ida ao CNJ. Generoso: quem espera é o servidor. */
const TEMPO_POR_TENTATIVA_MS = 30_000

/** Quanto a requisição HTTP espera antes de dizer "ainda buscando". */
const ESPERA_HTTP_MS = 8_000

/** Por quanto tempo a falha fica guardada para a tela vir buscá-la. */
const VALIDADE_DA_FALHA_MS = 30_000

interface Trabalho {
  promessa: Promise<DadosProcesso>
  desde: number
  terminou: boolean
  falha?: unknown
}

const trabalhos = new Map<string, Trabalho>()

const dormir = (ms: number): Promise<void> =>
  new Promise((resolver) => {
    const relogio = setTimeout(resolver, ms)
    relogio.unref?.()
  })

/** Só faz sentido insistir em lentidão e limite de requisições. */
function valeOutraTentativa(erro: unknown): boolean {
  return erro instanceof ErroHttp && (erro.status === 504 || erro.status === 503)
}

export interface ResultadoPronto {
  estado: 'pronto'
  dados: DadosProcesso
}

export interface ResultadoBuscando {
  estado: 'buscando'
  numeroProcesso: string
  numeroFormatado: string
  desde: string
  aviso: string
}

export type ResultadoProcesso = ResultadoPronto | ResultadoBuscando

export const AVISO_BUSCANDO =
  'A base pública do CNJ está lenta agora. Continuamos consultando aqui no servidor e avisamos assim que os dados chegarem — pode seguir preenchendo o resto.'

export interface OpcoesConsultaProcesso extends Pick<OpcoesBusca, 'buscar' | 'tempoLimiteMs'> {
  chave: string
  agora?: () => Date
  /** Quanto a requisição espera antes de devolver "ainda buscando". */
  esperaMs?: number
  /** Só para os testes: substitui a pausa entre tentativas. */
  dormir?: (ms: number) => Promise<void>
}

/** Uma ida ao CNJ. Traduz o que vier em erro com endereço certo. */
async function buscarNoCnj(
  numero: string,
  indice: IndiceDataJud,
  opcoes: OpcoesConsultaProcesso,
): Promise<DadosProcesso> {
  const { status, corpo } = await buscarJson(`${URL_BASE}/${indice.alias}/_search`, {
    metodo: 'POST',
    corpo: { size: 10, query: { match: { numeroProcesso: numero } } },
    cabecalhos: { Authorization: `APIKey ${opcoes.chave}` },
    fonte: 'A consulta pública de processos do CNJ',
    tempoLimiteMs: opcoes.tempoLimiteMs ?? TEMPO_POR_TENTATIVA_MS,
    ...(opcoes.buscar ? { buscar: opcoes.buscar } : {}),
  }).catch((erro: unknown) => {
    if (erro instanceof FonteIndisponivel) {
      throw new ErroHttp(
        504,
        `${erro.message} Tente de novo em instantes ou preencha vara e comarca à mão.`,
      )
    }
    throw erro
  })

  if (status === 401 || status === 403) {
    // Acontece: o CNJ troca a chave pública de tempos em tempos e
    // avisa só no wiki. Dizer isso por extenso poupa meia hora de
    // caça ao erro — e a variável de ambiente resolve sem novo deploy.
    throw new ErroHttp(
      502,
      'A chave pública do DataJud foi recusada pelo CNJ — provavelmente ela mudou. Atualize DATAJUD_API_KEY com a chave publicada no wiki da API Pública. Enquanto isso, preencha vara e comarca à mão.',
    )
  }
  if (status === 404) {
    throw new ErroHttp(
      502,
      `O CNJ não publica a base do ${indice.tribunal} nesta API. Preencha vara e comarca à mão.`,
    )
  }
  if (status === 429) {
    // 503 e não 502: é passageiro, e é o status que manda insistir.
    throw new ErroHttp(
      503,
      'A consulta pública do CNJ está limitando as buscas neste momento. Tente de novo em alguns instantes.',
    )
  }
  if (status !== 200 || !corpo || typeof corpo !== 'object') {
    throw new ErroHttp(
      502,
      `A consulta pública do CNJ respondeu de forma inesperada (HTTP ${status}). Preencha vara e comarca à mão.`,
    )
  }

  // O Elasticsearch do CNJ responde 200 mesmo quando parte dos
  // fragmentos do índice não foi consultada (fila de busca cheia, o
  // tal "es_rejected_execution_exception"). Nesses 200 a lista de
  // resultados é incompleta — e um processo que morava no fragmento
  // que falhou simplesmente não aparece. Sem olhar para isto, a tela
  // diria com toda a confiança "processo não encontrado" para um
  // processo que existe. Num laudo, errado com convicção é pior do
  // que indisponível.
  const busca = corpo as {
    hits?: { hits?: unknown[] }
    _shards?: { failed?: number; total?: number }
  }
  const fragmentosFalhos = busca._shards?.failed ?? 0
  const hits = (busca.hits?.hits ?? []) as unknown[]
  const primeiroOrgao = (hits[0] as { _source?: FonteHit } | undefined)?._source?.orgaoJulgador

  const municipio = await municipioPorCodigo(primeiroOrgao?.codigoMunicipioIBGE as number | undefined, {
    ...(opcoes.buscar ? { buscar: opcoes.buscar } : {}),
  })

  // A tabela de UF só vale para a Justiça do Trabalho: no número de
  // um TRF o mesmo "02" quer dizer outra coisa.
  const partes = partesDoNumero(numero)
  const dados = mapearProcesso(hits, numero, {
    municipio,
    ufDoTribunal: partes?.segmento === '5' ? (UF_POR_REGIAO_TRT[partes.tribunal] ?? null) : null,
    ...(opcoes.agora ? { agora: opcoes.agora } : {}),
  })

  if (!dados) {
    // Veio vazio e a busca foi parcial: não dá para afirmar que o
    // processo não existe. 503 porque é passageiro — é o status que
    // faz `insistir()` tentar de novo.
    if (fragmentosFalhos > 0) {
      throw new ErroHttp(
        503,
        `A base pública do ${indice.tribunal} respondeu pela metade — parte do índice não foi consultada. Tente de novo em alguns instantes.`,
      )
    }
    throw new ErroHttp(
      404,
      `O processo ${formatarNumeroCnj(numero)} não foi encontrado na base pública do ${indice.tribunal}. Pode estar em segredo de justiça, ter sido distribuído há poucos dias ou tramitar em outro tribunal.`,
    )
  }

  return dados
}

/**
 * A busca de fundo: tenta, e tenta de novo enquanto o motivo da falha
 * for lentidão ou limite de requisições. "Não encontrado" e chave
 * recusada saem na primeira — insistir neles só gastaria a cota.
 */
async function insistir(
  numero: string,
  indice: IndiceDataJud,
  opcoes: OpcoesConsultaProcesso,
): Promise<DadosProcesso> {
  const pausar = opcoes.dormir ?? dormir
  let ultima: unknown = new ErroHttp(504, 'A consulta pública do CNJ não respondeu.')

  for (const pausa of PAUSAS_ENTRE_TENTATIVAS) {
    if (pausa) await pausar(pausa)
    try {
      return await buscarNoCnj(numero, indice, opcoes)
    } catch (erro) {
      ultima = erro
      if (!valeOutraTentativa(erro)) throw erro
    }
  }

  throw ultima
}

/** Põe a busca para correr e cuida do que fazer quando ela terminar. */
function iniciar(numero: string, indice: IndiceDataJud, opcoes: OpcoesConsultaProcesso): Trabalho {
  const trabalho: Trabalho = {
    promessa: insistir(numero, indice, opcoes),
    desde: Date.now(),
    terminou: false,
  }
  trabalhos.set(numero, trabalho)

  // Este par de handlers existe também para que uma falha que chegue
  // depois de a requisição ter ido embora não vire rejeição sem dono
  // — o que derruba o processo do Node.
  trabalho.promessa.then(
    (dados) => {
      trabalho.terminou = true
      cache.gravar(numero, dados)
      if (trabalhos.get(numero) === trabalho) trabalhos.delete(numero)
    },
    (erro: unknown) => {
      trabalho.terminou = true
      trabalho.falha = erro
      // A falha espera um pouco pela tela, que volta para perguntar.
      const relogio = setTimeout(() => {
        if (trabalhos.get(numero) === trabalho) trabalhos.delete(numero)
      }, VALIDADE_DA_FALHA_MS)
      relogio.unref?.()
    },
  )

  return trabalho
}

/**
 * Dados do processo, ou o aviso de que a busca continua correndo.
 *
 * Chamar de novo com o mesmo número não abre uma segunda busca: a
 * tela que volta para perguntar cai no mesmo trabalho já em curso.
 */
export async function consultarProcesso(
  bruto: string,
  opcoes: OpcoesConsultaProcesso,
): Promise<ResultadoProcesso> {
  const numero = normalizarNumeroProcesso(bruto)
  if (!numero) throw new ErroHttp(422, 'Informe os 20 dígitos do número do processo.')

  if (!numeroCnjValido(numero)) {
    throw new ErroHttp(
      422,
      `O número ${formatarNumeroCnj(numero)} não passa na checagem do dígito verificador do CNJ. Confira os números digitados.`,
    )
  }

  const indice = indiceDataJud(numero)
  if (!indice) {
    throw new ErroHttp(
      422,
      'A consulta automática cobre a Justiça do Trabalho (TRTs e TST) e a Justiça Federal (TRFs). Para os demais tribunais, preencha vara e comarca à mão.',
    )
  }

  const emCache = cache.ler(numero)
  if (emCache) return { estado: 'pronto', dados: emCache }

  const existente = trabalhos.get(numero)

  // Busca que já terminou mal: a tela veio buscar o motivo. Entrega
  // o erro uma vez e limpa, para que a próxima tentativa seja nova.
  if (existente?.terminou && existente.falha) {
    trabalhos.delete(numero)
    throw existente.falha
  }

  const trabalho = existente ?? iniciar(numero, indice, opcoes)

  let relogio: ReturnType<typeof setTimeout> | undefined
  const espera = new Promise<null>((resolver) => {
    relogio = setTimeout(() => resolver(null), opcoes.esperaMs ?? ESPERA_HTTP_MS)
    relogio.unref?.()
  })

  try {
    const dados = await Promise.race([trabalho.promessa, espera])
    if (dados) return { estado: 'pronto', dados }
  } finally {
    clearTimeout(relogio)
  }

  return {
    estado: 'buscando',
    numeroProcesso: numero,
    numeroFormatado: formatarNumeroCnj(numero),
    desde: new Date(trabalho.desde).toISOString(),
    aviso: AVISO_BUSCANDO,
  }
}

/** Só para os testes. */
export function limparCacheDeProcessos(): void {
  cache.limpar()
  trabalhos.clear()
}
