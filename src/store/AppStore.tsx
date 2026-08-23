import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '@/services/api'
import { API_MODE, ErroApi } from '@/services/api'
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
  salvarUsuario: (u: Usuario & { senha?: string }) => Promise<void>

  // Módulo B
  empresas: Empresa[]
  salvarEmpresa: (e: Empresa) => Promise<Empresa>
  removerEmpresa: (id: string) => Promise<void>

  // Módulos C/D/E
  pericias: Pericia[]
  salvarPericia: (p: Pericia) => Promise<Pericia>
  removerPericia: (id: string) => Promise<void>

  // Módulo F
  textos: TextoBiblioteca[]
  salvarTexto: (t: TextoBiblioteca) => Promise<void>
  removerTexto: (id: string) => Promise<void>

  // Módulo K
  quesitos: Quesito[]
  salvarQuesito: (q: Quesito) => Promise<void>

  // Módulos G/H/I/J
  documentos: DocumentoGerado[]
  salvarDocumento: (d: DocumentoGerado) => Promise<DocumentoGerado>
  removerDocumento: (id: string) => Promise<void>

  carregando: boolean
  /** Falha ao carregar os dados iniciais — a tela oferece "tentar de novo". */
  erroCarregamento: string | null
  recarregar: () => void

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
 * No modo REST a sessão vive num cookie httpOnly e é restaurada em
 * GET /auth/eu — o navegador nunca vê o token. O sessionStorage só
 * é usado na demonstração sem backend.
 */
function lerSessaoLocal(): Usuario | null {
  if (API_MODE === 'rest') return null
  try {
    const raw = sessionStorage.getItem(SESSAO_KEY)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

const mensagem = (e: unknown, padrao: string): string =>
  e instanceof ErroApi ? e.message : e instanceof Error ? e.message : padrao

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(lerSessaoLocal)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [pericias, setPericias] = useState<Pericia[]>([])
  const [textos, setTextos] = useState<TextoBiblioteca[]>([])
  const [quesitos, setQuesitos] = useState<Quesito[]>([])
  const [documentos, setDocumentos] = useState<DocumentoGerado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  const recarregar = useCallback(() => setTentativa((n) => n + 1), [])

  useEffect(() => {
    let vivo = true

    async function carregar() {
      setCarregando(true)
      setErroCarregamento(null)

      try {
        // No modo REST a sessão precisa ser confirmada antes de
        // pedir os dados — sem ela toda chamada responderia 401.
        const sessao = API_MODE === 'rest' ? await api.auth.eu() : usuario
        if (!vivo) return

        setUsuario(sessao)

        if (!sessao) {
          setCarregando(false)
          return
        }

        const [u, e, p, t, q, d] = await Promise.all([
          api.usuarios.listar(),
          api.empresas.listar(),
          api.pericias.listar(),
          api.biblioteca.listar(),
          api.quesitos.listar(),
          api.documentos.listar(),
        ])
        if (!vivo) return

        setUsuarios(u)
        setEmpresas(e)
        setPericias(p)
        setTextos(t)
        setQuesitos(q)
        setDocumentos(d)
      } catch (erro) {
        if (!vivo) return
        // 401 no meio do carregamento = sessão caiu: volta ao login
        // em vez de mostrar erro.
        if (erro instanceof ErroApi && erro.sessaoExpirada) {
          setUsuario(null)
        } else {
          setErroCarregamento(mensagem(erro, 'Não foi possível carregar os dados.'))
        }
      } finally {
        if (vivo) setCarregando(false)
      }
    }

    void carregar()
    return () => {
      vivo = false
    }
    // `usuario` fora das dependências de propósito: relogar dispara
    // o carregamento por `tentativa`, não por mudança de sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa])

  const login = useCallback(async (email: string, senha: string) => {
    const u = await api.auth.login(email, senha)
    if (API_MODE !== 'rest') {
      try {
        sessionStorage.setItem(SESSAO_KEY, JSON.stringify(u))
      } catch {
        /* modo privado sem storage — a sessão vale apenas em memória */
      }
    }
    setUsuario(u)
    setTentativa((n) => n + 1) // recarrega os dados já autenticado
  }, [])

  const logout = useCallback(() => {
    void api.auth.logout().catch(() => undefined)
    try {
      sessionStorage.removeItem(SESSAO_KEY)
    } catch {
      /* ignora */
    }
    setUsuario(null)
    setUsuarios([])
    setEmpresas([])
    setPericias([])
    setTextos([])
    setQuesitos([])
    setDocumentos([])
  }, [])

  const value = useMemo<AppState>(() => {
    /**
     * Aplica na tela, persiste e reconcilia com o que o servidor
     * devolveu. Se a chamada falhar, o estado volta ao que era —
     * sem rollback a tela mostraria um dado que não existe no banco.
     */
    function upsert<T extends { id: string }>(
      lista: T[],
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      persistir: (item: T) => Promise<T>,
    ) {
      return async (item: T): Promise<T> => {
        const anterior = lista
        setter((atual) => {
          const i = atual.findIndex((x) => x.id === item.id)
          if (i === -1) return [item, ...atual]
          const copia = [...atual]
          copia[i] = item
          return copia
        })

        try {
          const salvo = await persistir(item)
          if (salvo) {
            setter((atual) => atual.map((x) => (x.id === item.id ? salvo : x)))
            return salvo
          }
          return item
        } catch (e) {
          setter(anterior)
          throw e
        }
      }
    }

    function remover<T extends { id: string }>(
      lista: T[],
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      persistir: (id: string) => Promise<unknown>,
    ) {
      return async (id: string): Promise<void> => {
        const anterior = lista
        setter((atual) => atual.filter((x) => x.id !== id))
        try {
          await persistir(id)
        } catch (e) {
          setter(anterior)
          throw e
        }
      }
    }

    return {
      usuario,
      usuarios,
      login,
      logout,
      salvarUsuario: async (u) => {
        await upsert(usuarios, setUsuarios, api.usuarios.salvar)(u)
        // Editar o próprio cadastro precisa refletir no cabeçalho
        // e na assinatura dos documentos.
        if (u.id === usuario?.id) setUsuario((atual) => (atual ? { ...atual, ...u } : atual))
      },

      empresas,
      // Devolve a empresa como o servidor gravou: quem cadastra de
      // dentro da perícia precisa do registro salvo para vinculá-lo
      // como reclamada em seguida.
      salvarEmpresa: upsert(empresas, setEmpresas, api.empresas.salvar),
      removerEmpresa: remover(empresas, setEmpresas, api.empresas.remover),

      pericias,
      salvarPericia: upsert(pericias, setPericias, api.pericias.salvar),
      removerPericia: remover(pericias, setPericias, api.pericias.remover),

      textos,
      salvarTexto: async (t) => {
        await upsert(textos, setTextos, api.biblioteca.salvar)(t)
      },
      removerTexto: remover(textos, setTextos, api.biblioteca.remover),

      quesitos,
      salvarQuesito: async (q) => {
        await upsert(quesitos, setQuesitos, api.quesitos.salvar)(q)
      },

      documentos,
      salvarDocumento: upsert(documentos, setDocumentos, api.documentos.salvar),
      removerDocumento: remover(documentos, setDocumentos, api.documentos.remover),

      carregando,
      erroCarregamento,
      recarregar,
      empresaPorId: (id) => empresas.find((e) => e.id === id),
      periciaPorId: (id) => pericias.find((p) => p.id === id),
    }
  }, [
    usuario,
    usuarios,
    empresas,
    pericias,
    textos,
    quesitos,
    documentos,
    carregando,
    erroCarregamento,
    login,
    logout,
    recarregar,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
