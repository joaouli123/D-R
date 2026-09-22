import * as mock from '@/mocks/db'
import type {
  CadastroDaLicenca,
  DocumentoGerado,
  EpiSelecionado,
  Empresa,
  Equipe,
  Foto,
  Licenca,
  Pericia,
  Quesito,
  SecaoFoto,
  TextoBiblioteca,
  Usuario,
} from '@/types'
import { QUESITOS } from '@/content/quesitos'
import { formatDate, uid } from '@/lib/utils'
import {
  emailValido,
  formatarDocumento,
  limparDocumento,
  problemaNoDocumento,
  rotuloDoDocumento,
} from '@/lib/cadastro'

// ============================================================
// CAMADA DE API — ponto único de integração com o backend.
//
//   VITE_API_MODE=mock  → dados locais, sem servidor (demonstração)
//   VITE_API_MODE=rest  → API Node/Express em VITE_API_URL
//
// Sem a variável, o padrão vem do tipo de build: produção fala com a
// API real, desenvolvimento segue nos dados locais. O padrão não é
// apenas conveniência — as variáveis do Vite são congeladas no build, e
// a API do Coolify não permite marcar uma variável como build-time
// (só o painel permite). Deixar o default no código mantém o deploy
// reproduzível, sem depender de configuração feita à mão.
//
// BASE_URL relativo por padrão: a API é servida no mesmo domínio, sob
// /api, então não há CORS nem endereço fixo por ambiente.
//
// Nenhuma tela conhece o modo em uso.
// ============================================================

const MODE: 'mock' | 'rest' =
  (import.meta.env.VITE_API_MODE as 'mock' | 'rest' | undefined) ??
  (import.meta.env.PROD ? 'rest' : 'mock')
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

const LATENCIA = 220 // simula rede, para exercitar os estados de carregamento

function delay<T>(data: T, ms = LATENCIA): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

/** Erro de API já com a mensagem que o backend escreveu para o usuário. */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly detalhes?: unknown,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }

  /** 401 — a sessão caiu e o usuário precisa entrar de novo. */
  get sessaoExpirada() {
    return this.status === 401
  }
}

interface RespostaErro {
  erro?: string
  detalhes?: { campo: string; problema: string }[]
}

/** Transforma a resposta de erro do backend em algo exibível na tela. */
async function lancarErro(res: Response): Promise<never> {
  let corpo: RespostaErro = {}
  try {
    corpo = (await res.json()) as RespostaErro
  } catch {
    /* resposta sem JSON — fica só com o status */
  }

  const validacao = corpo.detalhes
    ?.map((d) => (d.campo ? `${d.campo}: ${d.problema}` : d.problema))
    .join(' · ')

  throw new ErroApi(
    res.status,
    corpo.erro ?? `Falha na comunicação com o servidor (${res.status}).`,
    validacao,
  )
}

/**
 * Teto de espera de uma requisição.
 *
 * `fetch` sem sinal de aborto espera PARA SEMPRE: se a conexão fica pendurada
 * (celular trocando de rede, proxy que segura o corpo), a tela roda o spinner
 * indefinidamente e o `finally` que o desliga nunca chega. Foi o que o perito
 * relatou no envio da assinatura em 18/09 — "fica processando infinitamente".
 * Com o teto, a espera vira um erro que a tela sabe mostrar.
 *
 * O envio de arquivo tem um teto maior: subir uma foto por 4G é lento, e
 * derrubar o upload de quem está no meio dele seria pior que esperar.
 */
const TEMPO_LIMITE_MS = 45_000
const TEMPO_LIMITE_ENVIO_MS = 150_000

function comTempoLimite(ms: number, init?: RequestInit): RequestInit {
  // Respeita um sinal que já venha de fora, e sai de lado onde
  // `AbortSignal.timeout` não existe (jsdom dos testes, navegador antigo).
  if (init?.signal || typeof AbortSignal?.timeout !== 'function') return init ?? {}
  return { ...init, signal: AbortSignal.timeout(ms) }
}

/** Distingue "demorou demais" de "a rede caiu" — a saída do perito é outra. */
function ehEsperaEstourada(erro: unknown): boolean {
  return erro instanceof DOMException && (erro.name === 'TimeoutError' || erro.name === 'AbortError')
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  const envioDeArquivo = init?.body instanceof FormData
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...comTempoLimite(envioDeArquivo ? TEMPO_LIMITE_ENVIO_MS : TEMPO_LIMITE_MS, init),
      headers: {
        ...(envioDeArquivo ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers ?? {}),
      },
    })
  } catch (erro) {
    if (ehEsperaEstourada(erro)) {
      throw new ErroApi(
        0,
        envioDeArquivo
          ? 'O envio demorou demais e foi interrompido. Verifique a conexão e tente de novo — se a foto for muito grande, use uma mais leve.'
          : 'O servidor demorou demais para responder. Tente de novo em instantes.',
      )
    }
    // fetch só rejeita quando a rede falha ou o CORS bloqueia.
    throw new ErroApi(0, 'Não foi possível falar com o servidor. Verifique sua conexão.')
  }

  if (!res.ok) await lancarErro(res)
  if (res.status === 204) return undefined as T

  return (await res.json()) as T
}

/** Baixa um binário (PDF/DOCX) e devolve o Blob com o nome sugerido. */
async function baixar(path: string, init?: RequestInit): Promise<{ blob: Blob; nome: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    ...init,
  })
  if (!res.ok) await lancarErro(res)

  const disposicao = res.headers.get('Content-Disposition') ?? ''
  const nome = /filename="([^"]+)"/.exec(disposicao)?.[1] ?? 'documento'

  return { blob: await res.blob(), nome }
}

const ehRest = MODE === 'rest'

/**
 * Resolve o caminho de um arquivo servido pela API (as fotos da vistoria).
 *
 * A API devolve `/uploads/<arquivo>` — relativo, sem host. Quem completa e
 * o front, contra a MESMA base que ele usa para as chamadas REST: em
 * producao a API vive sob `/api` no mesmo dominio, entao a foto esta em
 * `/api/uploads/<arquivo>`; sem o prefixo, `/uploads/...` cai no
 * index.html do proprio site e a imagem aparece quebrada.
 *
 * URLs absolutas (`http…`) e `blob:` do modo mock passam intactas — isso
 * mantem o app funcionando com respostas antigas, de antes de a API passar
 * a devolver o caminho relativo.
 */
export function urlDeUpload(url: string): string {
  return url.startsWith('/uploads/') ? `${BASE_URL.replace(/\/$/, '')}${url}` : url
}

/**
 * Mensagem de erro pronta para a tela, ja com o detalhe que o backend
 * mandou junto. O `detalhes` costuma ser a parte acionavel ("legenda:
 * obrigatoria"); descartar isso deixava o perito com "Dados invalidos." e
 * nada mais.
 */
export function mensagemDeErro(e: unknown, padrao: string): string {
  if (e instanceof ErroApi) {
    const detalhe = typeof e.detalhes === 'string' ? e.detalhes : ''
    return detalhe ? `${e.message} — ${detalhe}` : e.message
  }
  return e instanceof Error ? e.message : padrao
}

/** Aplica `urlDeUpload` em todas as fotos de uma pericia. */
function comFotosResolvidas(p: Pericia): Pericia {
  return { ...p, fotos: p.fotos.map((f) => ({ ...f, url: urlDeUpload(f.url) })) }
}

/**
 * Resolve a logo e a assinatura do perito pelo mesmo caminho das fotos.
 *
 * O `logoUrl` (e o `assinaturaUrl`) chega relativo (`/uploads/<arquivo>`) e
 * precisa do prefixo da API para virar `<img src>` — sem isso ele cai no
 * index.html do site e o perito vê a marca quebrada. Passa por AQUI toda
 * resposta que traz usuário: login, sessão restaurada, listagem e as rotas
 * da logo e da assinatura.
 */
function comLogoResolvida<T extends { logoUrl?: string; assinaturaUrl?: string }>(u: T): T {
  return {
    ...u,
    ...(u.logoUrl ? { logoUrl: urlDeUpload(u.logoUrl) } : {}),
    ...(u.assinaturaUrl ? { assinaturaUrl: urlDeUpload(u.assinaturaUrl) } : {}),
  }
}

export interface AplicacaoEpiCatalogo {
  anexo: string
  categoria: string
}

export interface EpiCatalogo {
  id: string
  chave: string
  modelo: string
  marca: string
  caUnico: string | null
  caPecaFacial: string | null
  caFiltroCartucho: string | null
  nivelProtecaoDb?: number | null
  metodoAtenuacao?: 'NRRsf' | null
  observacao: string | null
  ativo: boolean
  aplicacoes: AplicacaoEpiCatalogo[]
}

interface FiltrosEpi {
  q?: string
  categoria?: string
  anexo?: string
}

function parametrosEpi(filtros: FiltrosEpi): string {
  const parametros = new URLSearchParams()
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) parametros.set(chave, valor)
  })
  const consulta = parametros.toString()
  return consulta ? `?${consulta}` : ''
}

export const epis = {
  listar: (filtros: FiltrosEpi = {}) =>
    ehRest
      ? http<EpiCatalogo[]>(`/epis${parametrosEpi(filtros)}`)
      : delay([] as EpiCatalogo[]),
}

export function snapshotEpi(item: EpiCatalogo): EpiSelecionado {
  const aplicacao = item.aplicacoes[0]
  return {
    catalogoId: item.id,
    categoria: aplicacao?.categoria ?? 'Proteção respiratória',
    modelo: item.modelo,
    marca: item.marca,
    ...(item.caUnico ? { caUnico: item.caUnico } : {}),
    ...(item.caPecaFacial ? { caPecaFacial: item.caPecaFacial } : {}),
    ...(item.caFiltroCartucho ? { caFiltroCartucho: item.caFiltroCartucho } : {}),
    nivelProtecaoDb: item.nivelProtecaoDb ?? null,
    metodoAtenuacao: item.metodoAtenuacao ?? null,
    ...(item.observacao ? { observacao: item.observacao } : {}),
  }
}

// ---------------- Módulo L — Espelho oficial do CAEPI ----------------
//
// Toda resposta traz `dataReferencia` e o parecer de validade NAQUELA
// data — nunca "está válido hoje". A perícia examina um período
// passado: um CA vencido em 2024 valia normalmente em 2022, e é isso
// que precisa ir para o laudo.

export type FonteNrrsf = 'CAEPI' | 'PERITO'

export interface ValidadeNaData {
  situacao: string
  valido: boolean
  /** Frase pronta para o laudo, já com a data avaliada por extenso. */
  motivo: string
  /** A base não publica a data da decisão de cancelamento/suspensão. */
  incerto: boolean
}

export interface HomologacaoCa {
  numeroCa: string
  processo: string
  dataValidade: string | null
  situacao: string
  equipamento: string
  descricao: string | null
  marca: string | null
  referencia: string | null
  cor: string | null
  cnpj: string | null
  razaoSocial: string | null
  natureza: string | null
  aprovadoParaLaudo: string | null
  restricaoLaudo: string | null
  observacaoLaudo: string | null
  normas: string[]
  categoria: string
  anexos: string[]
  exigeNrrsf: boolean
  /** Tipo de equipamento que o MTE marcou como layout descontinuado. */
  descontinuado: boolean
  validade: ValidadeNaData
}

export interface AtenuacaoCa {
  nrrsfDb: number | null
  fonte: FonteNrrsf
  bandas: Record<string, string> | null
  observacao: string | null
  fichaConsultadaEm: string | null
}

/**
 * O que a API fez para achar o NRRsf nesta consulta. O valor só existe
 * na ficha individual do MTE, e o portal fica atrás do Cloudflare — daí
 * a diferença entre "a ficha não publica o número" e "o portal recusou".
 */
export type EstadoBuscaNrrsf =
  | 'ja_tinha'
  | 'encontrado'
  | 'sem_valor_na_ficha'
  | 'ca_inexistente'
  | 'portal_bloqueado'
  | 'falhou'

export interface FichaCa {
  numeroCa: string
  dataReferencia: string
  exigeNrrsf: boolean
  /** Null quando não é protetor auditivo: aí não há NRRsf a procurar. */
  buscaNrrsf: EstadoBuscaNrrsf | null
  /** O CA foi renovado com validades diferentes — muda a resposta do laudo. */
  temHistorico: boolean
  vigente: HomologacaoCa | null
  homologacoes: HomologacaoCa[]
  atenuacao: AtenuacaoCa | null
}

export interface ResultadoCa extends HomologacaoCa {
  nrrsfDb: number | null
  fonteNrrsf: FonteNrrsf | null
}

export interface StatusCaepi {
  ultimaSincronizacao: {
    iniciadoEm: string
    concluidoEm: string | null
    status: string
    origem: string
    registrosLidos: number
    registrosNovos: number
    registrosAtualizados: number
    fichasConsultadas: number
    erro: string | null
  } | null
  totais: {
    homologacoes: number
    cas: number
    validosHoje: number
    protetoresAuditivos: number
    comNrrsf: number
    nrrsfDoPerito: number
  }
  /**
   * Varredura de fundo que busca o NRRsf no portal do MTE.
   * Opcional porque o front pode subir antes da API que a introduziu.
   */
  colheitaNrrsf?: {
    ligada: boolean
    rodando: boolean
    ultima: {
      pendentes: number
      consultadas: number
      comNrrsf: number
      falhas: number
      motivo: 'concluida' | 'portal_bloqueado' | 'muitas_falhas' | 'teto_da_rodada' | 'cancelada'
      terminadaEm: string
    } | null
    proximaEm: string | null
  } | null
}

export interface ResultadoImportacaoCaepi {
  id: string
  linhasLidas: number
  registros: number
  novos: number
  atualizados: number
  linhasIgnoradas: number
}

interface FiltrosCa {
  q?: string
  numero?: string
  categoria?: string
  anexo?: string
  auditivo?: boolean
  descontinuados?: boolean
  /** Data da perícia (aaaa-mm-dd). Sem ela, a referência é hoje. */
  em?: string
  limite?: number
  buscarNrrsf?: 'forcar'
}

const CAEPI_SEM_BACKEND = 'A consulta ao CAEPI exige o backend ativo. Informe o EPI manualmente.'

function parametrosCa(filtros: FiltrosCa): string {
  const parametros = new URLSearchParams()
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === '' || valor === false) continue
    parametros.set(chave, valor === true ? '1' : String(valor))
  }
  const consulta = parametros.toString()
  return consulta ? `?${consulta}` : ''
}

export const caepi = {
  /**
   * Ficha de um CA na data da perícia. Devolve null quando o número não
   * consta na base: isso é resposta, não falha — o perito segue pelo
   * cadastro manual.
   *
   * Sendo protetor auditivo sem NRRsf gravado, a API busca a ficha do
   * MTE na hora. `forcarNrrsf` é o perito pedindo de novo depois de o
   * portal ter recusado — ignora a pausa automática.
   */
  async consultar(
    numeroCa: string,
    em?: string,
    opcoes: { forcarNrrsf?: boolean } = {},
  ): Promise<FichaCa | null> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CAEPI_SEM_BACKEND)
    }
    const filtros: FiltrosCa = { ...(em ? { em } : {}), ...(opcoes.forcarNrrsf ? { buscarNrrsf: 'forcar' as const } : {}) }
    try {
      return await http<FichaCa>(`/caepi/cas/${encodeURIComponent(numeroCa)}${parametrosCa(filtros)}`)
    } catch (e) {
      if (e instanceof ErroApi && e.status === 404) return null
      throw e
    }
  },

  async buscar(filtros: FiltrosCa = {}) {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CAEPI_SEM_BACKEND)
    }
    return http<{ dataReferencia: string; total: number; itens: ResultadoCa[] }>(
      `/caepi/cas${parametrosCa(filtros)}`,
    )
  },

  /**
   * NRRsf conferido pelo perito — o único dado do módulo que ele
   * preenche. Grava com fonte PERITO, que é o que impede a atualização
   * do MTE de sobrescrever. `null` apaga (erro de digitação acontece).
   */
  async salvarNrrsf(numeroCa: string, dados: { nrrsfDb: number | null; observacao?: string | null }) {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CAEPI_SEM_BACKEND)
    }
    return http<{
      numeroCa: string
      nrrsfDb: number | null
      fonte: FonteNrrsf
      observacao: string | null
      atualizadoEm: string
    }>(`/caepi/cas/${encodeURIComponent(numeroCa)}/atenuacao`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    })
  },

  /** Null no modo demonstração: não há espelho local para relatar. */
  async status(): Promise<StatusCaepi | null> {
    if (!ehRest) return null
    return http<StatusCaepi>('/caepi/status')
  },

  /**
   * Sobe o arquivo do portal do MTE e refaz o espelho.
   *
   * O arquivo vai cru no corpo, sem multipart: são ~21 MB e não há
   * outro campo para mandar junto. O nome vai na query porque é ele
   * que diz ao servidor se o conteúdo está comprimido.
   *
   * Restrito a admin — a checagem que vale é a do servidor.
   */
  async importar(arquivo: File): Promise<ResultadoImportacaoCaepi> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CAEPI_SEM_BACKEND)
    }
    return http<ResultadoImportacaoCaepi>(`/caepi/importar?nome=${encodeURIComponent(arquivo.name)}`, {
      method: 'POST',
      body: arquivo,
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  },
}

/** Converte a ficha oficial no EPI que vai para o laudo. */
export function snapshotCa(
  ficha: FichaCa,
  campoCa: 'caUnico' | 'caPecaFacial' | 'caFiltroCartucho' = 'caUnico',
): EpiSelecionado {
  const registro = ficha.vigente ?? ficha.homologacoes[0]
  const nrrsfDb = ficha.atenuacao?.nrrsfDb ?? null
  const numero = { [campoCa]: ficha.numeroCa } as Pick<
    EpiSelecionado,
    'caUnico' | 'caPecaFacial' | 'caFiltroCartucho'
  >

  return {
    categoria: registro?.equipamento ?? 'Equipamento',
    modelo: registro?.descricao || registro?.referencia || registro?.equipamento || '',
    ...(registro?.marca ? { marca: registro.marca } : {}),
    ...(registro?.dataValidade ? { validadeCa: formatDate(registro.dataValidade) } : {}),
    ...numero,
    nivelProtecaoDb: nrrsfDb,
    metodoAtenuacao: nrrsfDb == null ? null : 'NRRsf',
    // Restrição do laudo do CA é informação que precisa aparecer no
    // documento — é ela que limita para que o EPI foi aprovado.
    ...(registro?.restricaoLaudo ? { observacao: registro.restricaoLaudo } : {}),
  }
}

// ---------------- Módulo A — Acesso ----------------
export const auth = {
  async login(email: string, senha: string): Promise<Usuario> {
    if (ehRest) {
      return comLogoResolvida(
        await http<Usuario>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, senha }),
        }),
      )
    }
    const usuario = mock.USUARIOS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.ativo)
    if (!usuario || senha.length < 4) {
      await delay(null, 400)
      throw new ErroApi(401, 'E-mail ou senha inválidos.')
    }
    const licencaDoLogin = licencaMockDaEquipe(usuario.organizacaoId ?? mock.EQUIPE_PRINCIPAL_ID)
    if (licencaDoLogin.aguardandoAprovacao) {
      await delay(null, 400)
      throw new ErroApi(403, CADASTRO_AGUARDANDO)
    }
    if (!licencaDoLogin.ativa) {
      await delay(null, 400)
      throw new ErroApi(403, 'A licença desta conta está suspensa. Procure o administrador.')
    }
    sessaoMock = {
      usuarioId: usuario.id,
      equipeId: usuario.organizacaoId ?? mock.EQUIPE_PRINCIPAL_ID,
    }
    return delay(usuario, 500)
  },

  async logout(): Promise<void> {
    if (ehRest) return http('/auth/logout', { method: 'POST' })
    return delay(undefined, 120)
  },

  /**
   * Restaura a sessão a partir do cookie httpOnly. Devolve null
   * quando não há sessão — não é erro, é o estado deslogado.
   */
  async eu(): Promise<Usuario | null> {
    if (!ehRest) return null
    try {
      return comLogoResolvida(await http<Usuario>('/auth/eu'))
    } catch (e) {
      if (e instanceof ErroApi && e.sessaoExpirada) return null
      throw e
    }
  },

  async trocarSenha(atual: string, nova: string): Promise<void> {
    if (!ehRest) return delay(undefined, 300)
    return http('/auth/senha', { method: 'POST', body: JSON.stringify({ atual, nova }) })
  },
}

/**
 * O que a tela manda ao cadastrar ou editar um usuário.
 *
 * `id` ausente (ou desconhecido) = cadastro novo; `senha` só vale nele;
 * `organizacaoId` só vale nele também — depois de criado o usuário não troca de
 * equipe (o servidor responde 422 se tentarem).
 */
export type UsuarioParaSalvar = Omit<Usuario, 'id'> & { id?: string; senha?: string }

export const usuarios = {
  /**
   * Os usuários da PRÓPRIA licença — todas as equipes dela dividem o trabalho,
   * então o responsável de uma perícia pode vir de qualquer uma. A árvore que o
   * administrador gere é `equipes.listar`.
   */
  listar: () =>
    ehRest
      ? http<Usuario[]>('/usuarios').then((l) => l.map(comLogoResolvida))
      : delay(usuariosDaLicencaMock(licencaDaSessaoMock().id)),
  salvar: (u: UsuarioParaSalvar) =>
    ehRest
      ? http<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(u) }).then(comLogoResolvida)
      : delay(null).then(() => salvarUsuarioMock(u)),
  /** O administrador redefine a senha de alguém do seu alcance. */
  redefinirSenha: (id: string, nova: string) =>
    ehRest
      ? http<void>(`/usuarios/${id}/senha`, { method: 'POST', body: JSON.stringify({ nova }) })
      : delay(null).then(() => redefinirSenhaMock(id, nova)),
  /**
   * Exclui de vez. Quem é responsável por perícias ou documentos só sai se o
   * trabalho for repassado (`transferirPara`, alguém ATIVO da mesma licença);
   * sem isso o servidor responde 409 com a contagem — é o sinal de a tela
   * perguntar quem assume. Para só tirar o acesso, o caminho é desativar.
   */
  excluir: (id: string, transferirPara?: string) =>
    ehRest
      ? http<void>(
          `/usuarios/${id}${transferirPara ? `?transferirPara=${encodeURIComponent(transferirPara)}` : ''}`,
          { method: 'DELETE' },
        )
      : delay(null).then(() => excluirUsuarioMock(id, transferirPara)),

  /**
   * Sobe a logo do perito (white-label).
   *
   * Vai em multipart porque é arquivo, e não pelo `salvar`: quem decide o
   * nome dentro do volume é o servidor. A resposta é o cadastro já
   * atualizado — é dela que a tela tira o novo `logoUrl`.
   */
  async enviarLogo(id: string, arquivo: File): Promise<Usuario> {
    if (!ehRest) throw new ErroApi(503, 'Trocar a logo exige o backend ativo.')
    const form = new FormData()
    form.append('logo', arquivo)
    return comLogoResolvida(
      await http<Usuario>(`/usuarios/${id}/logo`, { method: 'POST', body: form }),
    )
  },

  /** Volta o perito para a arte embutida do sistema. */
  async removerLogo(id: string): Promise<Usuario> {
    if (!ehRest) throw new ErroApi(503, 'Trocar a logo exige o backend ativo.')
    return comLogoResolvida(await http<Usuario>(`/usuarios/${id}/logo`, { method: 'DELETE' }))
  },

  /**
   * Sobe a FOTO da assinatura feita em papel. O servidor recorta, tira o
   * fundo e grava só o traço; a resposta traz o `assinaturaUrl` desse PNG.
   */
  async enviarAssinatura(id: string, arquivo: File): Promise<Usuario> {
    if (!ehRest) throw new ErroApi(503, 'Enviar a assinatura exige o backend ativo.')
    const form = new FormData()
    form.append('assinatura', arquivo)
    return comLogoResolvida(
      await http<Usuario>(`/usuarios/${id}/assinatura`, { method: 'POST', body: form }),
    )
  },

  /** Os documentos voltam a sair com a linha em branco, para assinar à mão. */
  async removerAssinatura(id: string): Promise<Usuario> {
    if (!ehRest) throw new ErroApi(503, 'Remover a assinatura exige o backend ativo.')
    return comLogoResolvida(await http<Usuario>(`/usuarios/${id}/assinatura`, { method: 'DELETE' }))
  },
}

/**
 * Equipes — a hierarquia de organizações (só o administrador).
 *
 * `listar` devolve a árvore visível para quem consulta — a própria equipe e as
 * de baixo, já em ordem de exibição, cada uma com seus usuários. O
 * administrador gere os ACESSOS delas (criar, editar, desativar, trocar senha,
 * excluir); o trabalho (empresas, perícias, documentos) é da licença e só quem
 * é dela o lê — mesmo que a equipe de outra licença esteja na árvore.
 */
export const equipes = {
  listar: (): Promise<Equipe[]> =>
    ehRest
      ? http<Equipe[]>('/equipes').then((l) => l.map(comUsuariosResolvidos))
      : delay(null).then(() => structuredClone(arvoreMock())),
  /** Sem `paiId`, a equipe nasce logo abaixo da de quem cria. */
  criar: (nome: string, paiId?: string): Promise<Equipe> =>
    ehRest
      ? http<Equipe>('/equipes', {
          method: 'POST',
          body: JSON.stringify({ nome, ...(paiId ? { paiId } : {}) }),
        }).then(comUsuariosResolvidos)
      : delay(null).then(() => criarEquipeMock(nome, paiId)),
  renomear: (id: string, nome: string): Promise<Equipe> =>
    ehRest
      ? http<Equipe>(`/equipes/${id}`, { method: 'PATCH', body: JSON.stringify({ nome }) }).then(
          comUsuariosResolvidos,
        )
      : delay(null).then(() => renomearEquipeMock(id, nome)),
  /**
   * Só uma equipe VAZIA (sem gente, sem trabalho, sem equipes filhas), nunca a
   * própria e nunca a que abre uma licença — essa sai pela página Licenças.
   */
  excluir: (id: string): Promise<void> =>
    ehRest
      ? http<void>(`/equipes/${id}`, { method: 'DELETE' })
      : delay(null).then(() => excluirEquipeMock(id)),
}

/** O que a tela manda ao criar uma licença: a empresa e o primeiro administrador dela. */
export interface LicencaParaCriar extends CadastroDaLicenca {
  nome: string
  documento?: string
  admin: { nome: string; email: string; senha: string }
}

/** Campo que não vai fica como está; o que vai vazio é apagado. */
export type LicencaParaEditar = Partial<Pick<Licenca, 'nome' | 'documento' | 'ativa'>> & CadastroDaLicenca

const CAMPOS_DE_CADASTRO = [
  'nomeFantasia',
  'email',
  'telefone',
  'cep',
  'endereco',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
] as const satisfies ReadonlyArray<keyof CadastroDaLicenca>

/**
 * Licenças — as empresas clientes da plataforma. Só o administrador da equipe
 * principal (o perito titular); o servidor confere de novo.
 */
export const licencas = {
  listar: (): Promise<Licenca[]> =>
    ehRest ? http<Licenca[]>('/licencas') : delay(null).then(() => licencasMock()),
  /** Cria a licença, a equipe de entrada dela e o primeiro administrador — tudo ou nada. */
  criar: (dados: LicencaParaCriar): Promise<Licenca> =>
    ehRest
      ? http<Licenca>('/licencas', { method: 'POST', body: JSON.stringify(dados) })
      : delay(null).then(() => criarLicencaMock(dados)),
  /** Renomeia, troca o documento, suspende ou reativa. */
  atualizar: (id: string, dados: LicencaParaEditar): Promise<Licenca> =>
    ehRest
      ? http<Licenca>(`/licencas/${id}`, { method: 'PATCH', body: JSON.stringify(dados) })
      : delay(null).then(() => atualizarLicencaMock(id, dados)),
  /** Só sem empresas, perícias ou documentos; equipes e usuários saem junto. */
  excluir: (id: string): Promise<void> =>
    ehRest
      ? http<void>(`/licencas/${id}`, { method: 'DELETE' })
      : delay(null).then(() => excluirLicencaMock(id)),
}

export const CADASTRO_AGUARDANDO =
  'Seu cadastro foi recebido e está aguardando a aprovação do administrador. Você receberá acesso assim que ele for aprovado.'

/**
 * Cadastro público, sem login: a empresa pede a licença e o titular aprova
 * depois na página Licenças. As consultas de CNPJ e CEP daqui são as abertas.
 */
export const cadastroPublico = {
  enviar: (dados: LicencaParaCriar & { site?: string }): Promise<{ aguardandoAprovacao: true }> =>
    ehRest
      ? http<{ aguardandoAprovacao: true }>('/cadastro', { method: 'POST', body: JSON.stringify(dados) })
      : delay(null).then(() => {
          criarLicencaMock(dados, { aguardando: true })
          return { aguardandoAprovacao: true as const }
        }),
  async cnpj(numero: string): Promise<DadosCnpj> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CONSULTA_SEM_BACKEND)
    }
    return http<DadosCnpj>(`/cadastro/cnpj/${encodeURIComponent(limparDocumento(numero))}`)
  },
  async cep(numero: string): Promise<DadosCep> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CONSULTA_SEM_BACKEND)
    }
    return http<DadosCep>(`/cadastro/cep/${encodeURIComponent(numero.replace(/\D/g, ''))}`)
  },
}

function comUsuariosResolvidos(e: Equipe): Equipe {
  return { ...e, usuarios: e.usuarios.map(comLogoResolvida) }
}

// ---------------- Equipes e usuários: demonstração sem backend ----------------
//
// O que o servidor faz de verdade (alcance pela hierarquia, e-mail único, o
// trabalho de quem sai indo para outra pessoa) fica reproduzido aqui em
// pequeno — o bastante para percorrer a tela inteira sem API. Quem "entrou" no
// login define de que equipe são as listas.

let sessaoMock = { usuarioId: 'usr-1', equipeId: mock.EQUIPE_PRINCIPAL_ID }

/**
 * Demonstração: recoloca a sessão de exemplo de quem já estava logado antes de a
 * página recarregar (o AppStore guarda o usuário no sessionStorage, mas o "banco"
 * do mock volta ao início). Sem isso a tela mostraria uma pessoa e as chamadas
 * responderiam como o Dinoel. `false` quando o cadastro não existe mais.
 */
export function retomarSessaoDemo(u: Pick<Usuario, 'id'>): boolean {
  const existente = mock.USUARIOS.find((x) => x.id === u.id && x.ativo)
  if (!existente) return false
  sessaoMock = {
    usuarioId: existente.id,
    equipeId: existente.organizacaoId ?? mock.EQUIPE_PRINCIPAL_ID,
  }
  return true
}

function licencaMockDaEquipe(equipeId: string): mock.LicencaMock {
  const equipe = mock.EQUIPES.find((e) => e.id === equipeId)
  return (
    mock.LICENCAS.find((l) => l.id === equipe?.licencaId) ??
    mock.LICENCAS.find((l) => l.id === mock.LICENCA_PRINCIPAL_ID)!
  )
}

const licencaDaSessaoMock = () => licencaMockDaEquipe(sessaoMock.equipeId)

/**
 * O conteúdo de exemplo (empresas, perícias e documentos) pertence à licença
 * principal. Quem entra por outra licença começa com a casa vazia — o mesmo
 * isolamento que o servidor aplica por `licencaId`.
 */
function conteudoDaEquipeMock<T>(itens: T[]): T[] {
  return licencaDaSessaoMock().id === mock.LICENCA_PRINCIPAL_ID ? itens : []
}

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, 'pt-BR')

function usuariosDaEquipeMock(equipeId: string): Usuario[] {
  return mock.USUARIOS.filter((u) => u.organizacaoId === equipeId).sort(porNome)
}

function equipesDaLicencaMock(licencaId: string): mock.EquipeMock[] {
  return mock.EQUIPES.filter((e) => e.licencaId === licencaId)
}

function usuariosDaLicencaMock(licencaId: string): Usuario[] {
  const ids = new Set(equipesDaLicencaMock(licencaId).map((e) => e.id))
  return mock.USUARIOS.filter((u) => ids.has(u.organizacaoId ?? '')).sort(porNome)
}

/** A equipe da sessão e todas as de baixo. */
function equipesAlcancadasMock(): string[] {
  const ids = [sessaoMock.equipeId]
  for (let i = 0; i < ids.length; i++) {
    for (const e of mock.EQUIPES) if (e.paiId === ids[i]) ids.push(e.id)
  }
  return ids
}

function arvoreMock(): Equipe[] {
  const saida: Equipe[] = []

  const visitar = (id: string, nivel: number) => {
    const equipe = mock.EQUIPES.find((e) => e.id === id)
    if (!equipe) return
    const filhas = mock.EQUIPES.filter((e) => e.paiId === id).sort(porNome)
    const usuarios = usuariosDaEquipeMock(id)
    const mae = mock.EQUIPES.find((e) => e.id === equipe.paiId)
    const inicioDaLicenca = !!mae && mae.licencaId !== equipe.licencaId

    saida.push({
      id,
      nome: equipe.nome,
      licencaId: equipe.licencaId,
      licencaNome: licencaMockDaEquipe(id).nome,
      inicioDaLicenca,
      // A mãe da equipe da sessão fica fora do alcance: não a revelamos.
      paiId: nivel === 0 ? null : equipe.paiId,
      nivel,
      propria: id === sessaoMock.equipeId,
      principal: id === mock.EQUIPE_PRINCIPAL_ID,
      podeExcluir:
        id !== sessaoMock.equipeId && !inicioDaLicenca && filhas.length === 0 && usuarios.length === 0,
      usuarios,
    })
    filhas.forEach((f) => visitar(f.id, nivel + 1))
  }

  visitar(sessaoMock.equipeId, 0)
  return saida
}

function equipeMockDoAlcance(id: string): mock.EquipeMock {
  const equipe = mock.EQUIPES.find((e) => e.id === id)
  if (!equipe || !equipesAlcancadasMock().includes(id)) {
    throw new ErroApi(404, 'Equipe não encontrada.')
  }
  return equipe
}

function equipeMockComoNo(id: string): Equipe {
  const no = arvoreMock().find((e) => e.id === id)
  if (!no) throw new ErroApi(404, 'Equipe não encontrada.')
  // Cópia, como a resposta de uma API: quem recebe não pode mexer no "banco".
  return structuredClone(no)
}

function nomeDeEquipeValido(nome: string): string {
  const limpo = nome.trim()
  if (limpo.length < 2) throw new ErroApi(422, 'Informe o nome da equipe.')
  return limpo
}

function criarEquipeMock(nome: string, paiId?: string): Equipe {
  const limpo = nomeDeEquipeValido(nome)
  const pai = equipeMockDoAlcance(paiId ?? sessaoMock.equipeId)
  const criada = { id: uid('eqp'), nome: limpo, paiId: pai.id, licencaId: pai.licencaId }
  mock.EQUIPES.push(criada)
  return equipeMockComoNo(criada.id)
}

function renomearEquipeMock(id: string, nome: string): Equipe {
  const equipe = equipeMockDoAlcance(id)
  equipe.nome = nomeDeEquipeValido(nome)
  return equipeMockComoNo(id)
}

function excluirEquipeMock(id: string): void {
  const equipe = equipeMockDoAlcance(id)
  if (equipe.id === sessaoMock.equipeId) {
    throw new ErroApi(400, 'Você não pode excluir a própria equipe.')
  }
  const mae = mock.EQUIPES.find((e) => e.id === equipe.paiId)
  if (mae && mae.licencaId !== equipe.licencaId) {
    throw new ErroApi(
      409,
      'Esta é a equipe principal de uma licença. Para removê-la, exclua a licença na página Licenças.',
    )
  }
  if (mock.EQUIPES.some((e) => e.paiId === id)) {
    throw new ErroApi(409, 'Esta equipe tem equipes abaixo dela. Exclua-as primeiro.')
  }
  if (usuariosDaEquipeMock(id).length > 0) {
    throw new ErroApi(
      409,
      'Esta equipe ainda tem usuários. Exclua-os (ou desative-os, para só tirar o acesso) antes.',
    )
  }
  mock.EQUIPES.splice(mock.EQUIPES.indexOf(equipe), 1)
}

/** Carrega o usuário-alvo; o que está fora do alcance é tratado como inexistente. */
function usuarioMockDoAlcance(id: string): Usuario {
  const alvo = mock.USUARIOS.find((u) => u.id === id)
  if (!alvo || !equipesAlcancadasMock().includes(alvo.organizacaoId ?? '')) {
    throw new ErroApi(404, 'Usuário não encontrado.')
  }
  return alvo
}

function salvarUsuarioMock(dados: UsuarioParaSalvar): Usuario {
  const { senha, id, ...campos } = dados
  const email = dados.email.trim().toLowerCase()
  const existente = id ? mock.USUARIOS.find((u) => u.id === id) : undefined

  if (mock.USUARIOS.some((u) => u.id !== existente?.id && u.email.toLowerCase() === email)) {
    throw new ErroApi(409, 'Já existe um usuário com este e-mail.')
  }

  if (existente) {
    const alvo = usuarioMockDoAlcance(existente.id)
    if (dados.organizacaoId && dados.organizacaoId !== alvo.organizacaoId) {
      throw new ErroApi(422, 'Um usuário não muda de equipe depois de criado.')
    }
    if (alvo.id === sessaoMock.usuarioId && (!dados.ativo || dados.perfil !== 'admin')) {
      throw new ErroApi(
        400,
        'Você não pode remover o próprio acesso de administrador. Peça a outro administrador.',
      )
    }
    Object.assign(alvo, campos, {
      email,
      organizacaoId: alvo.organizacaoId,
      equipePrincipal: alvo.equipePrincipal,
    })
    return structuredClone(alvo)
  }

  if (!senha || senha.length < 8) {
    throw new ErroApi(422, 'Informe uma senha inicial de pelo menos 8 caracteres.')
  }
  const organizacaoId = dados.organizacaoId ?? sessaoMock.equipeId
  if (!equipesAlcancadasMock().includes(organizacaoId)) {
    throw new ErroApi(
      403,
      'Você só pode cadastrar usuários na sua equipe ou nas equipes abaixo dela.',
    )
  }

  const criado: Usuario = {
    ...campos,
    id: uid('usr'),
    email,
    organizacaoId,
    equipePrincipal: organizacaoId === mock.EQUIPE_PRINCIPAL_ID,
  }
  mock.USUARIOS.push(criado)
  return structuredClone(criado)
}

function redefinirSenhaMock(id: string, nova: string): void {
  usuarioMockDoAlcance(id)
  if (nova.length < 8) throw new ErroApi(422, 'A senha deve ter pelo menos 8 caracteres.')
}

function excluirUsuarioMock(id: string, transferirPara?: string): void {
  const alvo = usuarioMockDoAlcance(id)
  if (alvo.id === sessaoMock.usuarioId) {
    throw new ErroApi(400, 'Você não pode excluir o próprio usuário. Peça a outro administrador.')
  }

  const pericias = mock.PERICIAS.filter((p) => p.responsavelId === alvo.id)
  if (pericias.length > 0) {
    if (!transferirPara) {
      throw new ErroApi(
        409,
        `${alvo.nome} é responsável por ${pericias.length} ${pericias.length === 1 ? 'perícia' : 'perícias'} ` +
          'e 0 documentos. Escolha quem assume esse trabalho ou, se só quer tirar o acesso, desative o usuário.',
      )
    }
    const daLicenca = usuariosDaLicencaMock(licencaMockDaEquipe(alvo.organizacaoId ?? '').id)
    const herdeiro = daLicenca.find((u) => u.id === transferirPara && u.ativo && u.id !== alvo.id)
    if (!herdeiro) {
      throw new ErroApi(
        422,
        'Escolha, para assumir o trabalho, outro usuário ATIVO da mesma licença.',
      )
    }
    for (const p of pericias) p.responsavelId = herdeiro.id
  }

  mock.USUARIOS.splice(mock.USUARIOS.indexOf(alvo), 1)
}

// ---------------- Licenças: demonstração sem backend ----------------

function licencaMockComoApi(l: mock.LicencaMock): Licenca {
  const equipes = equipesDaLicencaMock(l.id)
  const usuarios = usuariosDaLicencaMock(l.id)
  const principal = l.id === mock.LICENCA_PRINCIPAL_ID
  const entrada = principal
    ? equipes.find((e) => e.id === mock.EQUIPE_PRINCIPAL_ID)
    : equipes.find((e) => e.paiId === mock.EQUIPE_PRINCIPAL_ID)
  return structuredClone({
    id: l.id,
    nome: l.nome,
    documento: l.documento,
    ...Object.fromEntries(CAMPOS_DE_CADASTRO.map((campo) => [campo, l[campo]])),
    ativa: l.ativa,
    aguardandoAprovacao: !!l.aguardandoAprovacao,
    principal,
    criadoEm: l.criadoEm,
    equipePrincipalId: entrada?.id,
    equipes: equipes.length,
    usuarios: usuarios.length,
    // O conteúdo de exemplo é todo da licença principal.
    empresas: principal ? mock.EMPRESAS.length : 0,
    pericias: principal ? mock.PERICIAS.length : 0,
    documentos: principal ? mock.DOCUMENTOS.length : 0,
    administradores: usuarios
      .filter((u) => u.perfil === 'admin')
      .map(({ id, nome, email, ativo }) => ({ id, nome, email, ativo })),
  })
}

function exigirTitularMock(): void {
  const eu = mock.USUARIOS.find((u) => u.id === sessaoMock.usuarioId)
  if (sessaoMock.equipeId !== mock.EQUIPE_PRINCIPAL_ID || eu?.perfil !== 'admin') {
    throw new ErroApi(403, 'Esta ação é restrita à equipe principal.')
  }
}

function licencaMockExistente(id: string): mock.LicencaMock {
  const licenca = mock.LICENCAS.find((l) => l.id === id)
  if (!licenca) throw new ErroApi(404, 'Licença não encontrada.')
  return licenca
}

/** O mesmo que o servidor faz com o contato e o endereço: vazio some, UF em maiúsculas. */
function cadastroConferidoMock(d: CadastroDaLicenca): CadastroDaLicenca {
  const email = d.email?.trim()
  if (email && !emailValido(email)) throw new ErroApi(422, 'E-mail da empresa inválido.')
  const uf = d.uf?.trim()
  if (uf && !/^[A-Za-z]{2}$/.test(uf)) throw new ErroApi(422, 'UF deve ter 2 letras.')
  const conferido: CadastroDaLicenca = {}
  for (const campo of CAMPOS_DE_CADASTRO) {
    if (!(campo in d)) continue
    const valor = d[campo]?.trim() || undefined
    conferido[campo] = campo === 'uf' ? valor?.toUpperCase() : valor
  }
  return conferido
}

/** Dígito verificador e duplicidade, como no servidor; o que não mudou passa. */
function documentoConferidoMock(documento: string | undefined, atual?: mock.LicencaMock): string | undefined {
  const limpo = limparDocumento(documento)
  if (!limpo) return undefined
  if (atual?.documento && limparDocumento(atual.documento) === limpo) return atual.documento
  const problema = problemaNoDocumento(limpo)
  if (problema) throw new ErroApi(422, problema)
  const repetida = mock.LICENCAS.find((l) => l !== atual && limparDocumento(l.documento) === limpo)
  if (repetida) {
    throw new ErroApi(
      409,
      `O ${rotuloDoDocumento(limpo)} ${formatarDocumento(limpo)} já é da licença "${repetida.nome}".`,
    )
  }
  return formatarDocumento(limpo)
}

function licencasMock(): Licenca[] {
  exigirTitularMock()
  return mock.LICENCAS.map(licencaMockComoApi)
}

function criarLicencaMock(d: LicencaParaCriar, { aguardando = false } = {}): Licenca {
  if (!aguardando) exigirTitularMock()
  const nome = d.nome.trim()
  const email = d.admin.email.trim().toLowerCase()
  if (nome.length < 2) throw new ErroApi(422, 'Informe o nome da empresa.')
  if (!d.admin.nome.trim()) throw new ErroApi(422, 'Informe o nome do administrador.')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ErroApi(422, 'E-mail do administrador inválido.')
  if (d.admin.senha.length < 8) {
    throw new ErroApi(422, 'A senha do administrador deve ter pelo menos 8 caracteres.')
  }
  if (mock.USUARIOS.some((u) => u.email.toLowerCase() === email)) {
    throw new ErroApi(409, 'Já existe um usuário com este e-mail. Use outro para o administrador.')
  }
  const cadastro = cadastroConferidoMock(d)
  const documento = documentoConferidoMock(d.documento)

  const licenca: mock.LicencaMock = {
    id: uid('lic'),
    nome,
    documento,
    ...cadastro,
    ativa: !aguardando,
    aguardandoAprovacao: aguardando,
    criadoEm: new Date().toISOString(),
  }
  const equipe = { id: uid('eqp'), nome, paiId: mock.EQUIPE_PRINCIPAL_ID, licencaId: licenca.id }
  mock.LICENCAS.push(licenca)
  mock.EQUIPES.push(equipe)
  mock.USUARIOS.push({
    id: uid('usr'),
    nome: d.admin.nome.trim(),
    email,
    perfil: 'admin',
    ativo: true,
    organizacaoId: equipe.id,
    equipePrincipal: false,
  })
  return licencaMockComoApi(licenca)
}

function atualizarLicencaMock(id: string, d: LicencaParaEditar): Licenca {
  exigirTitularMock()
  const licenca = licencaMockExistente(id)
  if (licenca.id === mock.LICENCA_PRINCIPAL_ID && d.ativa === false) {
    throw new ErroApi(400, 'A licença principal não pode ser suspensa.')
  }
  const cadastro = cadastroConferidoMock(d)
  const documento = 'documento' in d ? documentoConferidoMock(d.documento, licenca) : licenca.documento
  if (d.nome !== undefined) {
    const nome = d.nome.trim()
    if (nome.length < 2) throw new ErroApi(422, 'Informe o nome da empresa.')
    // A equipe de entrada acompanha o nome, se ainda tiver o antigo.
    const entradaId = licencaMockComoApi(licenca).equipePrincipalId
    const entrada = mock.EQUIPES.find((e) => e.id === entradaId)
    if (entrada && entrada.nome === licenca.nome) entrada.nome = nome
    licenca.nome = nome
  }
  licenca.documento = documento
  Object.assign(licenca, cadastro)
  if (d.ativa !== undefined) licenca.ativa = d.ativa
  if (d.ativa === true) licenca.aguardandoAprovacao = false
  return licencaMockComoApi(licenca)
}

function excluirLicencaMock(id: string): void {
  exigirTitularMock()
  const licenca = licencaMockExistente(id)
  const atual = licencaMockComoApi(licenca)
  if (atual.principal) throw new ErroApi(400, 'A licença principal não pode ser excluída.')
  if (atual.empresas + atual.pericias + atual.documentos > 0) {
    throw new ErroApi(
      409,
      `A licença "${licenca.nome}" tem trabalho cadastrado e não pode ser excluída. ` +
        'Para tirar o acesso sem perder nada, suspenda a licença.',
    )
  }
  const equipes = new Set(equipesDaLicencaMock(id).map((e) => e.id))
  for (let i = mock.USUARIOS.length - 1; i >= 0; i--) {
    if (equipes.has(mock.USUARIOS[i]!.organizacaoId ?? '')) mock.USUARIOS.splice(i, 1)
  }
  for (let i = mock.EQUIPES.length - 1; i >= 0; i--) {
    if (equipes.has(mock.EQUIPES[i]!.id)) mock.EQUIPES.splice(i, 1)
  }
  mock.LICENCAS.splice(mock.LICENCAS.indexOf(licenca), 1)
}

// ---------------- Módulo B — Empresas ----------------
export const empresas = {
  listar: () =>
    ehRest ? http<Empresa[]>('/empresas') : delay(conteudoDaEquipeMock(mock.EMPRESAS)),
  salvar: (e: Empresa) =>
    ehRest ? http<Empresa>('/empresas', { method: 'POST', body: JSON.stringify(e) }) : delay(e),
  remover: (id: string) =>
    ehRest ? http<void>(`/empresas/${id}`, { method: 'DELETE' }) : delay(undefined),
  /**
   * Limpa os cadastros de teste. Empresa citada em processo é mantida,
   * a menos que `comRascunhos` leve junto os rascunhos que a prendem.
   */
  limpar: (comRascunhos = false) =>
    ehRest
      ? http<LimpezaEmpresas>(`/empresas${comRascunhos ? '?rascunhos=1' : ''}`, { method: 'DELETE' })
      : delay({ excluidas: 0, rascunhosExcluidos: 0, mantidas: [] }),
}

export interface LimpezaEmpresas {
  excluidas: number
  rascunhosExcluidos: number
  mantidas: { id: string; razaoSocial: string; cnpj: string; processos: number }[]
}

// ---------------- Módulo C/D/E — Perícias ----------------
export const pericias = {
  listar: () =>
    ehRest
      ? http<Pericia[]>('/pericias').then((l) => l.map(comFotosResolvidas))
      : delay(conteudoDaEquipeMock(mock.PERICIAS)),
  obter: (id: string) =>
    ehRest
      ? http<Pericia>(`/pericias/${id}`).then(comFotosResolvidas)
      : delay(conteudoDaEquipeMock(mock.PERICIAS).find((p) => p.id === id)!),
  salvar: (p: Pericia) =>
    ehRest
      ? http<Pericia>('/pericias', { method: 'POST', body: JSON.stringify(p) }).then(
          comFotosResolvidas,
        )
      : delay(p),
  remover: (id: string) =>
    ehRest ? http<void>(`/pericias/${id}`, { method: 'DELETE' }) : delay(undefined),
}

// ---------------- Preenchimento por fontes públicas ----------------

export interface DadosCnpj {
  cnpj: string
  cnpjFormatado: string
  razaoSocial: string
  nomeFantasia: string | null
  situacao: string | null
  situacaoDesde: string | null
  cnae: string | null
  cnaeDescricao: string | null
  /** Grau do Anexo I da NR-04 para a classe do CNAE — null se o CNAE não veio. */
  grauRisco: '1' | '2' | '3' | '4' | null
  /** A classe que deu o grau ("53.10-5"), para o perito conferir a premissa. */
  grauRiscoClasse: string | null
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

export interface DadosCep {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  enderecoCompleto: string
  fonte: string
}

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

const CONSULTA_SEM_BACKEND =
  'O preenchimento automático exige o backend ativo. Digite os dados normalmente.'

/**
 * Consultas às bases públicas — cadastro da Receita pelo CNPJ e
 * tramitação do CNJ pelo número do processo. Quem sai à rede é o
 * servidor; a tela só recebe o resultado já traduzido.
 */
export const consultas = {
  async cep(numero: string): Promise<DadosCep> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CONSULTA_SEM_BACKEND)
    }
    return http<DadosCep>(`/consultas/cep/${encodeURIComponent(numero.replace(/\D/g, ''))}`)
  },

  async cnpj(numero: string): Promise<DadosCnpj> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CONSULTA_SEM_BACKEND)
    }
    // Letras também: o CNPJ alfanumérico.
    return http<DadosCnpj>(`/consultas/cnpj/${encodeURIComponent(limparDocumento(numero))}`)
  },

  async processo(numero: string): Promise<DadosProcesso> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CONSULTA_SEM_BACKEND)
    }
    return http<DadosProcesso>(`/consultas/processo/${encodeURIComponent(numero.replace(/\D/g, ''))}`)
  },
}

// ---------------- Módulo E — Fotografias ----------------
export const fotos = {
  /**
   * Envia as imagens ao servidor e devolve as fotos já persistidas.
   * No modo mock cai em blob URLs, que não sobrevivem ao reload.
   */
  async enviar(
    periciaId: string,
    secao: SecaoFoto,
    arquivos: File[],
    agenteId?: string,
  ): Promise<Foto[]> {
    // Recebe um array, nunca o FileList do <input>: o Chromium esvazia o
    // FileList no próprio objeto quando o input é zerado, e a lista chegava
    // aqui vazia depois do primeiro await. Lista vazia é erro, não sucesso —
    // devolver [] em silêncio mostrou "0 foto(s) adicionada(s)" em verde.
    const lista = [...arquivos]
    if (!lista.length) throw new Error('Nenhuma imagem chegou ao envio. Escolha as fotos de novo.')

    if (!ehRest) {
      return delay(
        lista.map((f, i) => ({
          id: `fot-${Math.random().toString(36).slice(2, 9)}`,
          secao,
          url: URL.createObjectURL(f),
          legenda: f.name.replace(/\.[^.]+$/, ''),
          ordem: i + 1,
          agenteId,
        })),
        400,
      )
    }

    const form = new FormData()
    form.append('secao', secao)
    if (agenteId) form.append('agenteId', agenteId)
    lista.forEach((f) => form.append('fotos', f))

    const enviadas = await http<Foto[]>(`/pericias/${periciaId}/fotos`, {
      method: 'POST',
      body: form,
    })
    return enviadas.map((f) => ({ ...f, url: urlDeUpload(f.url) }))
  },

  remover: (periciaId: string, fotoId: string) =>
    ehRest
      ? http<void>(`/pericias/${periciaId}/fotos/${fotoId}`, { method: 'DELETE' })
      : delay(undefined, 100),
}

// ---------------- Módulo F — Biblioteca de textos ----------------
export const biblioteca = {
  listar: () => (ehRest ? http<TextoBiblioteca[]>('/textos') : delay(mock.TEXTOS)),
  salvar: (t: TextoBiblioteca) =>
    ehRest ? http<TextoBiblioteca>('/textos', { method: 'POST', body: JSON.stringify(t) }) : delay(t),
  remover: (id: string) =>
    ehRest ? http<void>(`/textos/${id}`, { method: 'DELETE' }) : delay(undefined),
  /** Contabiliza o reaproveitamento do texto (alimenta os Relatórios). */
  registrarUso: (id: string) =>
    ehRest ? http<void>(`/textos/${id}/uso`, { method: 'POST' }) : delay(undefined, 50),
}

// ---------------- Módulo K — Quesitos ----------------
export const quesitos = {
  listar: () => (ehRest ? http<Quesito[]>('/quesitos') : delay(QUESITOS)),
  salvar: (q: Quesito) =>
    ehRest ? http<Quesito>('/quesitos', { method: 'POST', body: JSON.stringify(q) }) : delay(q),
  remover: (id: string) =>
    ehRest ? http<void>(`/quesitos/${id}`, { method: 'DELETE' }) : delay(undefined),
}

// ---------------- Módulos G/H/I/J — Documentos ----------------
export const documentos = {
  listar: () =>
    ehRest
      ? http<DocumentoGerado[]>('/documentos')
      : delay(conteudoDaEquipeMock(mock.DOCUMENTOS)),
  obter: (id: string) =>
    ehRest
      ? http<DocumentoGerado>(`/documentos/${id}`)
      : delay(conteudoDaEquipeMock(mock.DOCUMENTOS).find((d) => d.id === id)!),
  salvar: (d: DocumentoGerado) =>
    ehRest
      ? http<DocumentoGerado>('/documentos', { method: 'POST', body: JSON.stringify(d) })
      : delay(d),
  remover: (id: string) =>
    ehRest ? http<void>(`/documentos/${id}`, { method: 'DELETE' }) : delay(undefined),

  /** Módulo H — anexa o PDF externo, concatenado ao final na geração. */
  async anexar(documentoId: string, arquivo: File): Promise<DocumentoGerado> {
    if (!ehRest) throw new ErroApi(503, 'O anexo em PDF exige o backend ativo.')
    const form = new FormData()
    form.append('anexo', arquivo)
    return http<DocumentoGerado>(`/documentos/${documentoId}/anexo`, { method: 'POST', body: form })
  },

  removerAnexo: (documentoId: string) =>
    ehRest
      ? http<DocumentoGerado>(`/documentos/${documentoId}/anexo`, { method: 'DELETE' })
      : delay(undefined as never),

  /** Módulo H — PDF gerado no servidor, pronto para assinatura. */
  gerarPdf: (documentoId: string) => baixar(`/documentos/${documentoId}/pdf`),

  /** Módulo H — versão editável em DOCX. */
  gerarDocx: (documentoId: string) => baixar(`/documentos/${documentoId}/docx`),

  /** Módulo I — envio com o PDF anexado automaticamente. */
  async enviarEmail(
    documentoId: string,
    dados: { para: string; copia?: string; assunto: string; mensagem: string },
  ): Promise<{ ok: true; documento?: DocumentoGerado }> {
    if (!ehRest) {
      await delay(null, 900)
      throw new ErroApi(503, 'O envio por e-mail exige o backend ativo.')
    }
    return http(`/documentos/${documentoId}/email`, {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  },
}

export const API_MODE = MODE

/** Dispara o download de um Blob já baixado da API. */
export function salvarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  // Revogar de imediato cancela o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
