import * as mock from '@/mocks/db'
import type {
  DocumentoGerado,
  Empresa,
  Pericia,
  Quesito,
  TextoBiblioteca,
  Usuario,
} from '@/types'
import { QUESITOS } from '@/content/quesitos'

// ============================================================
// CAMADA DE API — ponto único de integração com o backend.
//
// Hoje: MODE = 'mock' (dados locais, sem servidor).
// Amanhã: MODE = 'rest' + VITE_API_URL apontando para a
// API Node/Express. Nenhuma tela precisa ser alterada.
// ============================================================

const MODE: 'mock' | 'rest' = (import.meta.env.VITE_API_MODE as 'mock' | 'rest') ?? 'mock'
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const LATENCIA = 220 // simula rede, para exercitar os estados de carregamento

function delay<T>(data: T, ms = LATENCIA): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} — ${res.statusText}`)
  return res.json() as Promise<T>
}

// ---------------- Módulo A — Acesso ----------------
export const auth = {
  async login(email: string, senha: string): Promise<Usuario> {
    if (MODE === 'rest') return http<Usuario>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) })
    const usuario = mock.USUARIOS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.ativo)
    if (!usuario || senha.length < 4) {
      await delay(null, 400)
      throw new Error('E-mail ou senha inválidos.')
    }
    return delay(usuario, 500)
  },
  async logout(): Promise<void> {
    if (MODE === 'rest') return http('/auth/logout', { method: 'POST' })
    return delay(undefined, 120)
  },
}

export const usuarios = {
  listar: () => (MODE === 'rest' ? http<Usuario[]>('/usuarios') : delay(mock.USUARIOS)),
  salvar: (u: Usuario) =>
    MODE === 'rest' ? http<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(u) }) : delay(u),
}

// ---------------- Módulo B — Empresas ----------------
export const empresas = {
  listar: () => (MODE === 'rest' ? http<Empresa[]>('/empresas') : delay(mock.EMPRESAS)),
  salvar: (e: Empresa) =>
    MODE === 'rest' ? http<Empresa>('/empresas', { method: 'POST', body: JSON.stringify(e) }) : delay(e),
  remover: (id: string) =>
    MODE === 'rest' ? http<void>(`/empresas/${id}`, { method: 'DELETE' }) : delay(undefined),
}

// ---------------- Módulo C/D/E — Perícias ----------------
export const pericias = {
  listar: () => (MODE === 'rest' ? http<Pericia[]>('/pericias') : delay(mock.PERICIAS)),
  obter: (id: string) =>
    MODE === 'rest' ? http<Pericia>(`/pericias/${id}`) : delay(mock.PERICIAS.find((p) => p.id === id)!),
  salvar: (p: Pericia) =>
    MODE === 'rest' ? http<Pericia>('/pericias', { method: 'POST', body: JSON.stringify(p) }) : delay(p),
  remover: (id: string) =>
    MODE === 'rest' ? http<void>(`/pericias/${id}`, { method: 'DELETE' }) : delay(undefined),
}

// ---------------- Módulo F — Biblioteca de textos ----------------
export const biblioteca = {
  listar: () => (MODE === 'rest' ? http<TextoBiblioteca[]>('/textos') : delay(mock.TEXTOS)),
  salvar: (t: TextoBiblioteca) =>
    MODE === 'rest' ? http<TextoBiblioteca>('/textos', { method: 'POST', body: JSON.stringify(t) }) : delay(t),
  remover: (id: string) =>
    MODE === 'rest' ? http<void>(`/textos/${id}`, { method: 'DELETE' }) : delay(undefined),
}

// ---------------- Módulo K — Quesitos ----------------
export const quesitos = {
  listar: () => (MODE === 'rest' ? http<Quesito[]>('/quesitos') : delay(QUESITOS)),
  salvar: (q: Quesito) =>
    MODE === 'rest' ? http<Quesito>('/quesitos', { method: 'POST', body: JSON.stringify(q) }) : delay(q),
}

// ---------------- Módulos G/H/I/J — Documentos ----------------
export const documentos = {
  listar: () => (MODE === 'rest' ? http<DocumentoGerado[]>('/documentos') : delay(mock.DOCUMENTOS)),
  salvar: (d: DocumentoGerado) =>
    MODE === 'rest' ? http<DocumentoGerado>('/documentos', { method: 'POST', body: JSON.stringify(d) }) : delay(d),
  remover: (id: string) =>
    MODE === 'rest' ? http<void>(`/documentos/${id}`, { method: 'DELETE' }) : delay(undefined),

  /** Módulo H — geração do PDF no servidor. No modo mock usa a impressão do navegador. */
  async gerarPdf(documentoId: string): Promise<{ url: string }> {
    if (MODE === 'rest') return http<{ url: string }>(`/documentos/${documentoId}/pdf`, { method: 'POST' })
    return delay({ url: 'about:blank' }, 700)
  },

  /** Módulo H — exportação em formato editável (DOCX). */
  async gerarDocx(documentoId: string): Promise<{ url: string }> {
    if (MODE === 'rest') return http<{ url: string }>(`/documentos/${documentoId}/docx`, { method: 'POST' })
    return delay({ url: 'about:blank' }, 700)
  },

  /** Módulo I — envio por e-mail (Resend/SendGrid no backend). */
  async enviarEmail(documentoId: string, para: string, assunto: string, mensagem: string) {
    if (MODE === 'rest')
      return http<{ ok: true }>(`/documentos/${documentoId}/email`, {
        method: 'POST',
        body: JSON.stringify({ para, assunto, mensagem }),
      })
    return delay({ ok: true } as const, 900)
  },
}

export const agenda = {
  listar: () => (MODE === 'rest' ? http<typeof mock.AGENDA>('/agenda') : delay(mock.AGENDA)),
}

export const modelos = {
  listar: () => (MODE === 'rest' ? http<typeof mock.MODELOS_DOC>('/modelos') : delay(mock.MODELOS_DOC)),
}

export const API_MODE = MODE
