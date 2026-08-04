import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, FileText, Scale, Search, X } from 'lucide-react'
import { useApp } from '@/store/AppStore'
import { cn, formatDate } from '@/lib/utils'

// ============================================================
// Busca global — encontra processo, reclamante, empresa ou
// documento de qualquer tela.
//
// Existe porque o caminho até uma perícia salva não era óbvio:
// quem preenchia um parecer e saía da tela precisava lembrar em
// qual menu ele estava. Aqui basta o nome do reclamante.
// ============================================================

type Tipo = 'pericia' | 'empresa' | 'documento'

interface Resultado {
  id: string
  tipo: Tipo
  titulo: string
  subtitulo: string
  detalhe?: string
  destino: string
}

const ROTULO: Record<Tipo, string> = {
  pericia: 'Perícias',
  empresa: 'Empresas',
  documento: 'Documentos',
}

const ICONE: Record<Tipo, typeof Scale> = {
  pericia: Scale,
  empresa: Building2,
  documento: FileText,
}

/** Ignora acentos e caixa: "kanashiro" acha "KANASHIRO". */
const normalizar = (v: string): string =>
  v
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

/** Só os dígitos, para casar número de processo e CNPJ digitados de qualquer jeito. */
const digitos = (v: string): string => v.replace(/\D/g, '')

const LIMITE_POR_TIPO = 5

export function BuscaGlobal() {
  const { pericias, empresas, documentos, empresaPorId } = useApp()
  const navigate = useNavigate()

  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [indice, setIndice] = useState(0)
  const campoRef = useRef<HTMLInputElement>(null)
  const caixaRef = useRef<HTMLDivElement>(null)

  const resultados = useMemo<Resultado[]>(() => {
    const q = normalizar(termo.trim())
    if (q.length < 2) return []

    const qDigitos = digitos(termo)
    const casa = (...campos: (string | undefined)[]) => {
      const alvo = normalizar(campos.filter(Boolean).join(' '))
      if (alvo.includes(q)) return true
      // Número de processo e CNPJ: compara só os dígitos, então
      // "1000457" encontra "1000457-64.2026.5.02.0473".
      return qDigitos.length >= 3 && digitos(alvo).includes(qDigitos)
    }

    const achados: Resultado[] = []

    for (const p of pericias) {
      if (!casa(p.numeroProcesso, p.reclamante, p.vara, p.comarca, p.funcaoReclamante)) continue
      const empresa = empresaPorId(p.reclamadas.find((r) => r.principal)?.empresaId ?? '')
      achados.push({
        id: p.id,
        tipo: 'pericia',
        titulo: p.reclamante || '(sem reclamante)',
        subtitulo: p.numeroProcesso || '(sem número de processo)',
        detalhe: [
          p.status === 'rascunho'
            ? 'Rascunho'
            : p.status === 'em_andamento'
              ? 'Em andamento'
              : p.status === 'concluida'
                ? 'Concluída'
                : 'Entregue',
          empresa?.nomeFantasia ?? empresa?.razaoSocial,
          `atualizada em ${formatDate(p.atualizadoEm)}`,
        ]
          .filter(Boolean)
          .join(' · '),
        destino: `/pericias/${p.id}`,
      })
    }

    for (const e of empresas) {
      if (!casa(e.razaoSocial, e.nomeFantasia, e.cnpj, e.cidade)) continue
      achados.push({
        id: e.id,
        tipo: 'empresa',
        titulo: e.nomeFantasia || e.razaoSocial,
        subtitulo: e.cnpj,
        detalhe: `${e.cidade}/${e.uf}`,
        destino: '/clientes',
      })
    }

    for (const d of documentos) {
      if (!casa(d.titulo, d.numeroProcesso, d.reclamante, d.empresaPrincipal)) continue
      achados.push({
        id: d.id,
        tipo: 'documento',
        titulo: d.titulo,
        subtitulo: `${d.reclamante} · ${d.numeroProcesso}`,
        detalhe: `atualizado em ${formatDate(d.atualizadoEm)}`,
        destino: '/documentos',
      })
    }

    // Perícias primeiro: é o que mais se procura no meio de um trabalho.
    const ordem: Tipo[] = ['pericia', 'empresa', 'documento']
    return ordem.flatMap((t) => achados.filter((a) => a.tipo === t).slice(0, LIMITE_POR_TIPO))
  }, [termo, pericias, empresas, documentos, empresaPorId])

  useEffect(() => setIndice(0), [termo])

  // Ctrl+K / Cmd+K abre a busca de qualquer tela.
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        campoRef.current?.focus()
        setAberto(true)
      }
    }
    document.addEventListener('keydown', atalho)
    return () => document.removeEventListener('keydown', atalho)
  }, [])

  // Clique fora fecha.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  function abrir(r: Resultado) {
    navigate(r.destino)
    setTermo('')
    setAberto(false)
    campoRef.current?.blur()
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAberto(false)
      campoRef.current?.blur()
      return
    }
    if (!resultados.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndice((i) => (i + 1) % resultados.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndice((i) => (i - 1 + resultados.length) % resultados.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const alvo = resultados[indice]
      if (alvo) abrir(alvo)
    }
  }

  const mostrarPainel = aberto && termo.trim().length >= 2
  let tipoAnterior: Tipo | null = null

  return (
    <div ref={caixaRef} className="relative ml-auto hidden max-w-sm flex-1 sm:block">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        ref={campoRef}
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={teclado}
        placeholder="Buscar processo, reclamante, empresa…"
        aria-label="Busca global"
        className="h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-8 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:bg-white"
      />
      {termo ? (
        <button
          onClick={() => {
            setTermo('')
            campoRef.current?.focus()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"
          aria-label="Limpar busca"
        >
          <X size={14} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-400 lg:block">
          Ctrl K
        </kbd>
      )}

      {mostrarPainel && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-[70vh] overflow-y-auto rounded-xl border border-ink-200 bg-white py-1.5 shadow-pop animate-fade-in">
          {resultados.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-500">
              Nada encontrado para <strong className="text-ink-700">{termo}</strong>.
            </p>
          ) : (
            resultados.map((r, i) => {
              const Icone = ICONE[r.tipo]
              const novoGrupo = r.tipo !== tipoAnterior
              tipoAnterior = r.tipo
              return (
                <div key={`${r.tipo}-${r.id}`}>
                  {novoGrupo && (
                    <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-ink-400">
                      {ROTULO[r.tipo]}
                    </p>
                  )}
                  <button
                    onClick={() => abrir(r)}
                    onMouseEnter={() => setIndice(i)}
                    className={cn(
                      'flex w-full items-start gap-2.5 px-4 py-2 text-left',
                      i === indice ? 'bg-brand-50' : 'hover:bg-ink-50',
                    )}
                  >
                    <span className="mt-0.5 shrink-0 text-navy-700">
                      <Icone size={15} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink-900">
                        {r.titulo}
                      </span>
                      <span className="block truncate font-mono text-[11.5px] text-ink-500">
                        {r.subtitulo}
                      </span>
                      {r.detalhe && (
                        <span className="block truncate text-[11.5px] text-ink-400">{r.detalhe}</span>
                      )}
                    </span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
