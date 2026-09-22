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
  /**
   * Relê os usuários da equipe. A tela de Usuários cadastra, exclui e
   * desativa direto na API (com a árvore de equipes ao lado); quem consome
   * `usuarios` — o responsável pela perícia, por exemplo — precisa acompanhar.
   */
  recarregarUsuarios: () => Promise<void>
  trocarLogo: (id: string, arquivo: File) => Promise<void>
  removerLogo: (id: string) => Promise<void>
  trocarAssinatura: (id: string, arquivo: File) => Promise<void>
  removerAssinatura: (id: string) => Promise<void>

  // Módulo B
  empresas: Empresa[]
  salvarEmpresa: (e: Empresa) => Promise<Empresa>
  removerEmpresa: (id: string) => Promise<void>
  limparEmpresas: (comRascunhos?: boolean) => Promise<api.LimpezaEmpresas>

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
        // Na demonstração o "banco" do mock recomeça a cada recarga: a sessão
        // guardada só vale se o cadastro ainda existe, e o mock volta a agir por ela.
        const sessao =
          API_MODE === 'rest'
            ? await api.auth.eu()
            : usuario && api.retomarSessaoDemo(usuario)
              ? usuario
              : null
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
        const indice = lista.findIndex((x) => x.id === id)
        const removido = lista[indice]
        setter((atual) => atual.filter((x) => x.id !== id))
        try {
          await persistir(id)
        } catch (e) {
          // Devolve só o item que falhou. Restaurar a lista inteira de antes
          // ressuscitaria o que outra exclusão, feita em seguida, já apagou
          // no servidor.
          if (removido) {
            setter((atual) => {
              if (atual.some((x) => x.id === id)) return atual
              // Volta para antes de quem vinha logo depois dele, para não pular de lugar.
              const seguinte = lista.slice(indice + 1).find((x) => atual.some((y) => y.id === x.id))
              const posicao = seguinte ? atual.findIndex((y) => y.id === seguinte.id) : atual.length
              return [...atual.slice(0, posicao), removido, ...atual.slice(posicao)]
            })
          }
          throw e
        }
      }
    }

    /** Substitui o cadastro na listagem e, se for o meu, também na sessão. */
    function adotarUsuario(salvo: Usuario): void {
      setUsuarios((atual) => atual.map((u) => (u.id === salvo.id ? salvo : u)))
      setUsuario((atual) => (atual?.id === salvo.id ? salvo : atual))
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
      recarregarUsuarios: async () => {
        const lista = await api.usuarios.listar()
        setUsuarios(lista)
        // Se o meu próprio cadastro mudou, a sessão acompanha.
        setUsuario((atual) => (atual ? (lista.find((x) => x.id === atual.id) ?? atual) : atual))
      },

      // A logo não passa por salvarUsuario: é arquivo, vai em multipart e
      // quem decide o nome dela no volume é o servidor. Por isso as duas
      // rotas devolvem o cadastro pronto e a tela só o adota — sem
      // atualização otimista, que aqui mostraria uma marca que talvez o
      // servidor tenha recusado (formato ou tamanho).
      trocarLogo: async (id, arquivo) => adotarUsuario(await api.usuarios.enviarLogo(id, arquivo)),
      removerLogo: async (id) => adotarUsuario(await api.usuarios.removerLogo(id)),
      // Mesma regra da logo: quem trata a foto é o servidor, e a tela só
      // mostra a assinatura depois que ele devolve o PNG pronto.
      trocarAssinatura: async (id, arquivo) =>
        adotarUsuario(await api.usuarios.enviarAssinatura(id, arquivo)),
      removerAssinatura: async (id) => adotarUsuario(await api.usuarios.removerAssinatura(id)),

      empresas,
      // Devolve a empresa como o servidor gravou: quem cadastra de
      // dentro da perícia precisa do registro salvo para vinculá-lo
      // como reclamada em seguida.
      salvarEmpresa: upsert(empresas, setEmpresas, api.empresas.salvar),
      removerEmpresa: remover(empresas, setEmpresas, api.empresas.remover),
      // Sem atualização otimista: quem fica na lista é decisão do
      // servidor (empresa citada em processo não sai), então a tela
      // espera a resposta em vez de adivinhar.
      limparEmpresas: async (comRascunhos = false) => {
        const resultado = await api.empresas.limpar(comRascunhos)
        setEmpresas((atual) => atual.filter((e) => resultado.mantidas.some((m) => m.id === e.id)))
        // A limpeza com rascunhos apaga perícias no servidor. Refletir
        // aqui pela mesma regra que o servidor aplicou evita recarregar
        // a lista inteira só para descobrir o que já se sabe.
        if (resultado.rascunhosExcluidos > 0) {
          setPericias((atual) =>
            atual.filter((p) => p.status !== 'rascunho' || p.reclamadas.length === 0),
          )
        }
        return resultado
      },

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
