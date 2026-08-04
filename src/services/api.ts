import * as mock from '@/mocks/db'
import type {
  DocumentoGerado,
  Empresa,
  Foto,
  Pericia,
  Quesito,
  SecaoFoto,
  TextoBiblioteca,
  Usuario,
} from '@/types'
import { QUESITOS } from '@/content/quesitos'

// ============================================================
// CAMADA DE API — ponto único de integração com o backend.
//
//   VITE_API_MODE=mock  → dados locais, sem servidor (demonstração)
//   VITE_API_MODE=rest  → API Node/Express em VITE_API_URL
//
// Nenhuma tela conhece o modo em uso.
// ============================================================

const MODE: 'mock' | 'rest' = (import.meta.env.VITE_API_MODE as 'mock' | 'rest') ?? 'mock'
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
