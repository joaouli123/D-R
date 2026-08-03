import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '@/services/api'
import type {
  DocumentoGerado,
  Empresa,
  Pericia,
  Quesito,
  TextoBiblioteca,
  Usuario,
} from '@/types'

interface AppState {
  // Módulo A
  usuario: Usuario | null
  usuarios: Usuario[]
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  salvarUsuario: (u: Usuario) => void

  // Módulo B
  empresas: Empresa[]
  salvarEmpresa: (e: Empresa) => void
  removerEmpresa: (id: string) => void

  // Módulos C/D/E
  pericias: Pericia[]
  salvarPericia: (p: Pericia) => void
  removerPericia: (id: string) => void

  // Módulo F
  textos: TextoBiblioteca[]
  salvarTexto: (t: TextoBiblioteca) => void
  removerTexto: (id: string) => void

  // Módulo K
  quesitos: Quesito[]
  salvarQuesito: (q: Quesito) => void

  // Módulos G/H/I/J
  documentos: DocumentoGerado[]
  salvarDocumento: (d: DocumentoGerado) => void
  removerDocumento: (id: string) => void

  carregando: boolean
  empresaPorId: (id: string) => Empresa | undefined
  periciaPorId: (id: string) => Pericia | undefined
}

const Ctx = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>')
  return ctx
}

const SESSAO_KEY = 'dr-pericia-elite:sessao'

/**
 * Sessão da aba (sessionStorage): sobrevive a refresh e navegação direta
 * por URL, mas é descartada ao fechar a aba. Ao plugar o backend, o token
 * httpOnly do servidor assume este papel.
 */
function lerSessao(): Usuario | null {
  try {
    const raw = sessionStorage.getItem(SESSAO_KEY)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(lerSessao)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [pericias, setPericias] = useState<Pericia[]>([])
  const [textos, setTextos] = useState<TextoBiblioteca[]>([])
  const [quesitos, setQuesitos] = useState<Quesito[]>([])
  const [documentos, setDocumentos] = useState<DocumentoGerado[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    Promise.all([
      api.usuarios.listar(),
      api.empresas.listar(),
      api.pericias.listar(),
      api.biblioteca.listar(),
      api.quesitos.listar(),
      api.documentos.listar(),
    ]).then(([u, e, p, t, q, d]) => {
      if (!vivo) return
      setUsuarios(u)
      setEmpresas(e)
      setPericias(p)
      setTextos(t)
      setQuesitos(q)
      setDocumentos(d)
      setCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    const u = await api.auth.login(email, senha)
    try {
      sessionStorage.setItem(SESSAO_KEY, JSON.stringify(u))
    } catch {
      /* modo privado sem storage — a sessão vale apenas em memória */
    }
    setUsuario(u)
  }, [])

  const logout = useCallback(() => {
    api.auth.logout()
    try {
      sessionStorage.removeItem(SESSAO_KEY)
    } catch {
      /* ignora */
    }
    setUsuario(null)
  }, [])

  const upsert = <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    (item: T) =>
      setter((list) => {
        const i = list.findIndex((x) => x.id === item.id)
        if (i === -1) return [item, ...list]
        const copy = [...list]
        copy[i] = item
        return copy
      })

  const remove = <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    (id: string) => setter((list) => list.filter((x) => x.id !== id))

  const value = useMemo<AppState>(
    () => ({
      usuario,
      usuarios,
      login,
      logout,
      salvarUsuario: (u) => {
        upsert(setUsuarios)(u)
        api.usuarios.salvar(u)
      },
      empresas,
      salvarEmpresa: (e) => {
        upsert(setEmpresas)(e)
        api.empresas.salvar(e)
      },
      removerEmpresa: (id) => {
        remove(setEmpresas)(id)
        api.empresas.remover(id)
      },
      pericias,
      salvarPericia: (p) => {
        upsert(setPericias)(p)
        api.pericias.salvar(p)
      },
      removerPericia: (id) => {
        remove(setPericias)(id)
        api.pericias.remover(id)
      },
      textos,
      salvarTexto: (t) => {
        upsert(setTextos)(t)
        api.biblioteca.salvar(t)
      },
      removerTexto: (id) => {
        remove(setTextos)(id)
        api.biblioteca.remover(id)
      },
      quesitos,
      salvarQuesito: (q) => {
        upsert(setQuesitos)(q)
        api.quesitos.salvar(q)
      },
      documentos,
      salvarDocumento: (d) => {
        upsert(setDocumentos)(d)
        api.documentos.salvar(d)
      },
      removerDocumento: (id) => {
        remove(setDocumentos)(id)
        api.documentos.remover(id)
      },
      carregando,
      empresaPorId: (id) => empresas.find((e) => e.id === id),
      periciaPorId: (id) => pericias.find((p) => p.id === id),
    }),
    [usuario, usuarios, empresas, pericias, textos, quesitos, documentos, carregando, login, logout],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
