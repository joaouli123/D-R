import { useEffect, useId, useMemo, useRef, useState } from 'react'

import type { ReferenciaNormativa } from '@/content/nr15/tipos'
import { buscarReferencias } from '@/lib/nr15'

const LIMITE_RESULTADOS = 30

interface BuscaNormativaProps<T extends ReferenciaNormativa> {
  itens: readonly T[]
  value: string
  onSelect: (item: T) => void
  placeholder: string
}

export function BuscaNormativa<T extends ReferenciaNormativa>({
  itens,
  value,
  onSelect,
  placeholder,
}: BuscaNormativaProps<T>) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [consulta, setConsulta] = useState('')
  const [aberto, setAberto] = useState(true)
  const [indiceAtivo, setIndiceAtivo] = useState(0)

  useEffect(() => {
    setConsulta('')
    setIndiceAtivo(0)
  }, [itens, value])

  const resultados = useMemo(
    () => buscarReferencias(itens, consulta).slice(0, LIMITE_RESULTADOS),
    [consulta, itens],
  )
  const resultadosPorGrau = useMemo(() => {
    if (!resultados.every((item) => item.anexoId === 'ANEXO_14')) return null

    return resultados.reduce<Record<string, T[]>>((grupos, item) => {
      const grupo = item.grau === 'maximo' ? 'Máximo 40%' : 'Médio 20%'
      grupos[grupo] = [...(grupos[grupo] ?? []), item]
      return grupos
    }, {})
  }, [resultados])

  const selecionar = (item: T) => {
    onSelect(item)
    setConsulta(item.label)
    setAberto(false)
    inputRef.current?.focus()
  }

  const moverAtivo = (direcao: 1 | -1) => {
    if (!resultados.length) return
    setIndiceAtivo((indice) => (indice + direcao + resultados.length) % resultados.length)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        value={consulta}
        role="combobox"
        aria-label={placeholder}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={aberto}
        aria-activedescendant={aberto && resultados[indiceAtivo] ? `${listboxId}-${indiceAtivo}` : undefined}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors hover:border-ink-400 focus:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        onFocus={() => setAberto(true)}
        onChange={(event) => {
          setConsulta(event.target.value)
          setIndiceAtivo(0)
          setAberto(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setAberto(true)
            moverAtivo(1)
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setAberto(true)
            moverAtivo(-1)
          }
          if (event.key === 'Enter' && aberto && resultados[indiceAtivo]) {
            event.preventDefault()
            selecionar(resultados[indiceAtivo])
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setAberto(false)
          }
        }}
      />

      {aberto && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-ink-200 bg-white shadow-sm">
          {resultados.length ? (
            <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {resultadosPorGrau
                ? Object.entries(resultadosPorGrau).map(([grau, itensDoGrau]) => (
                    <li key={grau} role="group" aria-label={`Grau ${grau}`}>
                      <p className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-500">Grau {grau}</p>
                      <ul role="presentation">
                        {itensDoGrau.map((item) => {
                          const indice = resultados.indexOf(item)
                          return <OpcaoNormativa key={item.id} item={item} indice={indice} listboxId={listboxId} selecionada={value === item.id} ativa={indiceAtivo === indice} onSelect={selecionar} />
                        })}
                      </ul>
                    </li>
                  ))
                : resultados.map((item, indice) => (
                    <OpcaoNormativa key={item.id} item={item} indice={indice} listboxId={listboxId} selecionada={value === item.id} ativa={indiceAtivo === indice} onSelect={selecionar} />
                  ))}
            </ul>
          ) : (
            <p role="status" className="px-3 py-3 text-sm text-ink-500">Nenhum item normativo encontrado</p>
          )}
        </div>
      )}
    </div>
  )
}

function OpcaoNormativa<T extends ReferenciaNormativa>({
  item,
  indice,
  listboxId,
  selecionada,
  ativa,
  onSelect,
}: {
  item: T
  indice: number
  listboxId: string
  selecionada: boolean
  ativa: boolean
  onSelect: (item: T) => void
}) {
  return (
    <li
      id={`${listboxId}-${indice}`}
      role="option"
      aria-selected={selecionada}
      className={`cursor-pointer px-3 py-2 text-sm ${ativa ? 'bg-brand-50 text-brand-900' : 'text-ink-800 hover:bg-ink-50'}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item)}
    >
      <p className="font-medium">{item.label}{item.cas ? ` — CAS ${item.cas}` : ''}</p>
      {item.atividadeEnquadrada && <p className="mt-0.5 text-xs text-ink-500">{item.atividadeEnquadrada}</p>}
    </li>
  )
}
