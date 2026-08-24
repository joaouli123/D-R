import * as mock from '@/mocks/db'
import type {
  DocumentoGerado,
  EpiSelecionado,
  Empresa,
  Foto,
  Pericia,
  Quesito,
  SecaoFoto,
  TextoBiblioteca,
  Usuario,
} from '@/types'
import { QUESITOS } from '@/content/quesitos'
import { formatDate } from '@/lib/utils'

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

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
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
      return http<Usuario>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      })
    }
    const usuario = mock.USUARIOS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.ativo)
    if (!usuario || senha.length < 4) {
      await delay(null, 400)
      throw new ErroApi(401, 'E-mail ou senha inválidos.')
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
      return await http<Usuario>('/auth/eu')
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

export const usuarios = {
  listar: () => (ehRest ? http<Usuario[]>('/usuarios') : delay(mock.USUARIOS)),
  salvar: (u: Usuario & { senha?: string }) =>
    ehRest ? http<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(u) }) : delay(u),
  redefinirSenha: (id: string, nova: string) =>
    ehRest
      ? http<void>(`/usuarios/${id}/senha`, { method: 'POST', body: JSON.stringify({ nova }) })
      : delay(undefined),
}

// ---------------- Módulo B — Empresas ----------------
export const empresas = {
  listar: () => (ehRest ? http<Empresa[]>('/empresas') : delay(mock.EMPRESAS)),
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
  listar: () => (ehRest ? http<Pericia[]>('/pericias') : delay(mock.PERICIAS)),
  obter: (id: string) =>
    ehRest ? http<Pericia>(`/pericias/${id}`) : delay(mock.PERICIAS.find((p) => p.id === id)!),
  salvar: (p: Pericia) =>
    ehRest ? http<Pericia>('/pericias', { method: 'POST', body: JSON.stringify(p) }) : delay(p),
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
  async cnpj(numero: string): Promise<DadosCnpj> {
    if (!ehRest) {
      await delay(null, 200)
      throw new ErroApi(503, CONSULTA_SEM_BACKEND)
    }
    return http<DadosCnpj>(`/consultas/cnpj/${encodeURIComponent(numero.replace(/\D/g, ''))}`)
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
  async enviar(periciaId: string, secao: SecaoFoto, arquivos: FileList | File[]): Promise<Foto[]> {
    const lista = Array.from(arquivos)
    if (!lista.length) return []

    if (!ehRest) {
      return delay(
        lista.map((f, i) => ({
          id: `fot-${Math.random().toString(36).slice(2, 9)}`,
          secao,
          url: URL.createObjectURL(f),
          legenda: f.name.replace(/\.[^.]+$/, ''),
          ordem: i + 1,
        })),
        400,
      )
    }

    const form = new FormData()
    form.append('secao', secao)
    lista.forEach((f) => form.append('fotos', f))

    return http<Foto[]>(`/pericias/${periciaId}/fotos`, { method: 'POST', body: form })
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
  listar: () => (ehRest ? http<DocumentoGerado[]>('/documentos') : delay(mock.DOCUMENTOS)),
  obter: (id: string) =>
    ehRest
      ? http<DocumentoGerado>(`/documentos/${id}`)
      : delay(mock.DOCUMENTOS.find((d) => d.id === id)!),
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
