// ============================================================
// Cliente HTTP do portal CAEPI (caepi.trabalho.gov.br).
//
// O portal é um ASP.NET WebForms antigo. Nada aqui é REST: tudo sai
// de postback com __VIEWSTATE. As três armadilhas encontradas:
//
//  1. sem User-Agent de navegador o portal devolve HTTP 403;
//  2. o .csv.gz vem com ~750 KB de HTML colado depois do fim do
//     membro gzip — o gunzip precisa tolerar lixo no final;
//  3. os três combos do formulário exigem o valor sentinela literal
//     "*******Selecione*******". Mandar "0" derruba o event validation
//     com "Invalid postback or callback argument".
//
// A ficha individual é a única fonte do NRRsf: ele NÃO existe no CSV.
// ============================================================

import { Readable } from 'node:stream'
import { descomprimirCsvCaepi } from './arquivo.js'

export const URL_CONSULTA = 'https://caepi.trabalho.gov.br/internet/ConsultaCAInternet.aspx'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const SENTINELA_COMBO = '*******Selecione*******'
const PREFIXO = 'ctl00$PlaceHolderConteudo$'
const PAINEL = 'ctl00$PlaceHolderConteudo$panel'

/** Campos ocultos do WebForms que precisam voltar em todo postback. */
interface CamposOcultos {
  __VIEWSTATE: string
  __VIEWSTATEGENERATOR: string
  __EVENTVALIDATION: string
}

export class ErroPortalCaepi extends Error {
  readonly status?: number

  constructor(mensagem: string, status?: number) {
    super(mensagem)
    this.name = 'ErroPortalCaepi'
    this.status = status
  }
}

/**
 * O portal fica atrás do Cloudflare, que às vezes responde com o
 * desafio "Just a moment..." em vez da página. É um teste de
 * navegador: exige executar JavaScript, e nenhum cliente HTTP passa.
 *
 * Quando isso acontece não há o que tentar do lado do servidor — o
 * caminho é baixar o .csv.gz pelo navegador e apontar a
 * sincronização para o arquivo local, que é suportado de origem.
 */
export class ErroDesafioCloudflare extends ErroPortalCaepi {
  constructor() {
    super(
      'O portal do MTE está exigindo verificação de navegador (Cloudflare). ' +
        'A sincronização automática não consegue passar por essa checagem. ' +
        'Baixe o arquivo em https://caepi.trabalho.gov.br/internet/ConsultaCAInternet.aspx ' +
        '("Baixar tabela completa") e rode: npm run sync:caepi -- --arquivo caminho/RelatorioCA.csv.gz',
      403,
    )
    this.name = 'ErroDesafioCloudflare'
  }
}

/** Reconhece o interstício do Cloudflare pelo corpo da resposta. */
export function ehDesafioCloudflare(status: number, corpo: string): boolean {
  if (status !== 403 && status !== 503) return false
  return /Just a moment|challenges\.cloudflare\.com|cf-browser-verification|__cf_chl/i.test(corpo)
}

/** Guarda os cookies de sessão entre os postbacks encadeados. */
class Sessao {
  private cookies = new Map<string, string>()

  guardar(resposta: Response): void {
    const cabecalhos = resposta.headers.getSetCookie?.() ?? []
    for (const bruto of cabecalhos) {
      const par = bruto.split(';')[0]
      const igual = par?.indexOf('=') ?? -1
      if (par && igual > 0) this.cookies.set(par.slice(0, igual), par.slice(igual + 1))
    }
  }

  get cabecalho(): string {
    return [...this.cookies].map(([nome, valor]) => `${nome}=${valor}`).join('; ')
  }
}

function extrairOculto(html: string, nome: string): string {
  const casado = new RegExp(`id="${nome}"[^>]*value="([^"]*)"`).exec(html)
  return casado?.[1] ?? ''
}

function lerCamposOcultos(html: string): CamposOcultos {
  return {
    __VIEWSTATE: extrairOculto(html, '__VIEWSTATE'),
    __VIEWSTATEGENERATOR: extrairOculto(html, '__VIEWSTATEGENERATOR'),
    __EVENTVALIDATION: extrairOculto(html, '__EVENTVALIDATION'),
  }
}

/**
 * A resposta de um postback assíncrono vem como segmentos
 * `tamanho|tipo|id|conteudo|`. Os campos ocultos renovados vêm nos
 * segmentos `hiddenField` e são obrigatórios no postback seguinte.
 */
export function lerDelta(texto: string): { campos: CamposOcultos; paineis: string[] } {
  const campos: Record<string, string> = {}
  const paineis: string[] = []
  let i = 0

  while (i < texto.length) {
    const casado = /^(\d+)\|/.exec(texto.slice(i, i + 12))
    if (!casado?.[1]) break
    const tamanho = Number(casado[1])
    let cursor = i + casado[0].length

    const fimTipo = texto.indexOf('|', cursor)
    if (fimTipo < 0) break
    const tipo = texto.slice(cursor, fimTipo)

    const fimId = texto.indexOf('|', fimTipo + 1)
    if (fimId < 0) break
    const id = texto.slice(fimTipo + 1, fimId)

    const conteudo = texto.slice(fimId + 1, fimId + 1 + tamanho)
    if (tipo === 'hiddenField') campos[id] = conteudo
    else if (tipo === 'updatePanel') paineis.push(conteudo)

    i = fimId + 1 + tamanho + 1
  }

  return {
    campos: {
      __VIEWSTATE: campos.__VIEWSTATE ?? '',
      __VIEWSTATEGENERATOR: campos.__VIEWSTATEGENERATOR ?? '',
      __EVENTVALIDATION: campos.__EVENTVALIDATION ?? '',
    },
    paineis,
  }
}

function camposBase(ocultos: CamposOcultos, alvo: string, numeroCa: string): URLSearchParams {
  const corpo = new URLSearchParams()
  corpo.set('ctl00$ScriptManager1', `${PAINEL}|${alvo}`)
  corpo.set('__EVENTTARGET', '')
  corpo.set('__EVENTARGUMENT', '')
  corpo.set('__VIEWSTATE', ocultos.__VIEWSTATE)
  corpo.set('__VIEWSTATEGENERATOR', ocultos.__VIEWSTATEGENERATOR)
  corpo.set('__EVENTVALIDATION', ocultos.__EVENTVALIDATION)
  corpo.set(`${PREFIXO}txtNumeroCA`, numeroCa)
  corpo.set(`${PREFIXO}cboEquipamento`, SENTINELA_COMBO)
  corpo.set(`${PREFIXO}cboFabricante`, SENTINELA_COMBO)
  corpo.set(`${PREFIXO}cboTipoProtecao`, SENTINELA_COMBO)
  return corpo
}

async function abrirFormulario(sessao: Sessao, sinal?: AbortSignal): Promise<string> {
  const resposta = await fetch(URL_CONSULTA, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: sinal ?? null,
  })
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '')
    if (ehDesafioCloudflare(resposta.status, corpo)) throw new ErroDesafioCloudflare()
    throw new ErroPortalCaepi(`Falha ao abrir a consulta do CAEPI.`, resposta.status)
  }
  sessao.guardar(resposta)
  return resposta.text()
}

async function postar(sessao: Sessao, corpo: URLSearchParams, sinal?: AbortSignal): Promise<string> {
  const resposta = await fetch(URL_CONSULTA, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'X-MicrosoftAjax': 'Delta=true',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: URL_CONSULTA,
      ...(sessao.cabecalho ? { Cookie: sessao.cabecalho } : {}),
    },
    body: corpo.toString(),
    signal: sinal ?? null,
  })
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '')
    if (ehDesafioCloudflare(resposta.status, corpo)) throw new ErroDesafioCloudflare()
    throw new ErroPortalCaepi('Postback do CAEPI recusado.', resposta.status)
  }
  sessao.guardar(resposta)
  return resposta.text()
}

// ---------------- Base completa (CSV) ----------------

/**
 * Baixa o export completo e devolve um stream de texto já
 * descompactado, linha a linha — nunca o arquivo inteiro em memória.
 */
export async function baixarBaseCaepi(sinal?: AbortSignal): Promise<NodeJS.ReadableStream> {
  const sessao = new Sessao()
  const html = await abrirFormulario(sessao, sinal)
  const ocultos = lerCamposOcultos(html)

  const corpo = new URLSearchParams()
  corpo.set('__EVENTTARGET', `${PREFIXO}LinkButton1`)
  corpo.set('__EVENTARGUMENT', '')
  corpo.set('__VIEWSTATE', ocultos.__VIEWSTATE)
  corpo.set('__VIEWSTATEGENERATOR', ocultos.__VIEWSTATEGENERATOR)
  corpo.set('__EVENTVALIDATION', ocultos.__EVENTVALIDATION)
  corpo.set(`${PREFIXO}txtNumeroCA`, '')
  corpo.set(`${PREFIXO}cboEquipamento`, SENTINELA_COMBO)
  corpo.set(`${PREFIXO}cboFabricante`, SENTINELA_COMBO)
  corpo.set(`${PREFIXO}cboTipoProtecao`, SENTINELA_COMBO)

  const resposta = await fetch(URL_CONSULTA, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      Referer: URL_CONSULTA,
      ...(sessao.cabecalho ? { Cookie: sessao.cabecalho } : {}),
    },
    body: corpo.toString(),
    signal: sinal ?? null,
  })

  if (!resposta.ok) {
    const corpoErro = await resposta.text().catch(() => '')
    if (ehDesafioCloudflare(resposta.status, corpoErro)) throw new ErroDesafioCloudflare()
    throw new ErroPortalCaepi('O MTE recusou o download da base.', resposta.status)
  }
  if (!resposta.body) throw new ErroPortalCaepi('O MTE devolveu o download vazio.')

  const disposicao = resposta.headers.get('content-disposition') ?? ''
  if (!/\.csv\.gz/i.test(disposicao)) {
    throw new ErroPortalCaepi(
      `O MTE não devolveu o arquivo esperado (content-disposition: "${disposicao}"). O layout do portal pode ter mudado.`,
    )
  }

  // Mesmo descompressor do upload e dos scripts: o HTML que o portal
  // cola depois do gzip precisa ser ignorado sem engolir o arquivo.
  return descomprimirCsvCaepi(
    Readable.fromWeb(resposta.body as Parameters<typeof Readable.fromWeb>[0]),
    true,
  )
}

// ---------------- Ficha individual (NRRsf) ----------------

/** Bandas de oitava, na ordem em que o portal renderiza os campos. */
export const BANDAS_HZ = [125, 250, 500, 1000, 2000, 3150, 4000, 6300, 8000] as const

export interface FichaCa {
  numeroCa: string
  /** Última coluna da Tabela de Atenuação. Só existe para protetor auditivo. */
  nrrsfBruto: string | null
  /** Atenuação por banda de oitava, em dB. Chave = frequência. */
  bandas: Record<string, string>
  validadeBruta: string | null
  situacaoBruta: string | null
  equipamento: string | null
  referencia: string | null
}

function extrairSpan(html: string, id: string): string | null {
  const casado = new RegExp(`<span id="PlaceHolderConteudo_${id}"[^>]*>([\\s\\S]*?)</span>`).exec(html)
  if (!casado?.[1]) return null
  const texto = casado[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, codigo: string) => String.fromCharCode(Number(codigo)))
    .replace(/\s+/g, ' ')
    .trim()
  return texto || null
}

/** Lê a ficha já baixada. Separado do fetch para poder testar com HTML salvo. */
export function extrairFicha(html: string, numeroCa: string): FichaCa {
  const bandas: Record<string, string> = {}
  BANDAS_HZ.forEach((frequencia, indice) => {
    const valor = extrairSpan(html, `lblNRAtenuacao${indice + 1}`)
    if (valor) bandas[String(frequencia)] = valor
  })

  return {
    numeroCa,
    // lblNRAtenuacao10 é a coluna NRRsf da Tabela de Atenuação
    nrrsfBruto: extrairSpan(html, 'lblNRAtenuacao10'),
    bandas,
    validadeBruta: extrairSpan(html, 'lblDTValidade'),
    situacaoBruta: extrairSpan(html, 'SituacaoCA')?.replace(/^Situação:\s*/i, '') ?? null,
    equipamento: extrairSpan(html, 'lblNOEquipamento'),
    referencia: extrairSpan(html, 'lblDSReferencia'),
  }
}

/**
 * Consulta a ficha completa de um CA — dois postbacks encadeados.
 *
 * O segundo usa o __VIEWSTATE renovado que voltou no delta do
 * primeiro; reaproveitar o original devolve HTTP 500.
 */
export async function buscarFicha(numeroCa: string, sinal?: AbortSignal): Promise<FichaCa | null> {
  const sessao = new Sessao()
  const html = await abrirFormulario(sessao, sinal)

  // 1) consultar pelo número do CA
  const consulta = camposBase(lerCamposOcultos(html), `${PREFIXO}btnConsultar`, numeroCa)
  consulta.set(`${PREFIXO}btnConsultar`, 'Consultar')
  consulta.set('__ASYNCPOST', 'true')
  const respostaConsulta = await postar(sessao, consulta, sinal)

  if (/\|error\|/.test(respostaConsulta.slice(0, 200))) {
    throw new ErroPortalCaepi(`O portal recusou a consulta do CA ${numeroCa}.`)
  }
  // CA inexistente: a grade não é renderizada
  if (!respostaConsulta.includes('btnDetalhar')) return null

  // 2) abrir a ficha (botão-imagem exige os sufixos .x/.y)
  const botao = `${PREFIXO}grdListaResultado$ctl02$btnDetalhar`
  const detalhe = camposBase(lerDelta(respostaConsulta).campos, botao, numeroCa)
  detalhe.set(`${botao}.x`, '8')
  detalhe.set(`${botao}.y`, '8')
  detalhe.set('__ASYNCPOST', 'true')
  const respostaDetalhe = await postar(sessao, detalhe, sinal)

  if (/\|error\|/.test(respostaDetalhe.slice(0, 200))) {
    throw new ErroPortalCaepi(`O portal recusou a ficha do CA ${numeroCa}.`)
  }

  return extrairFicha(respostaDetalhe, numeroCa)
}
