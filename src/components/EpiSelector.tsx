import { useEffect, useId, useRef, useState } from 'react'
import { Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'

import { Button, Input } from '@/components/ui'
import * as api from '@/services/api'
import type { AgenteAvaliado, EpiSelecionado } from '@/types'

interface EpiSelectorProps {
  agente: AgenteAvaliado
  onChange: (agente: AgenteAvaliado) => void
}

interface FormularioManual {
  categoria: string
  modelo: string
  marca: string
  caUnico: string
  caPecaFacial: string
  caFiltroCartucho: string
}

const MANUAL_VAZIO: FormularioManual = {
  categoria: '',
  modelo: '',
  marca: '',
  caUnico: '',
  caPecaFacial: '',
  caFiltroCartucho: '',
}

const FOCO_VISIVEL = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2'

function anexoParaApi(anexoNr15?: string): string | undefined {
  if (!anexoNr15) return undefined
  const numero = /^ANEXO_(\d+)(?:_([A-Z]))?$/.exec(anexoNr15)
  if (!numero) return undefined
  return `Anexo ${Number(numero[1])}${numero[2] ? `-${numero[2]}` : ''}`
}

function descricaoCas(epi: {
  caUnico?: string | null
  caPecaFacial?: string | null
  caFiltroCartucho?: string | null
}) {
  return [
    epi.caUnico && `CA único: ${epi.caUnico}`,
    epi.caPecaFacial && `CA peça facial: ${epi.caPecaFacial}`,
    epi.caFiltroCartucho && `CA cartucho/filtro: ${epi.caFiltroCartucho}`,
  ].filter((texto): texto is string => Boolean(texto))
}

export function EpiSelector({ agente, onChange }: EpiSelectorProps) {
  const tituloId = useId()
  const [consulta, setConsulta] = useState('')
  const [catalogo, setCatalogo] = useState<api.EpiCatalogo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [manual, setManual] = useState<FormularioManual>(MANUAL_VAZIO)
  const [erroManual, setErroManual] = useState('')
  const requisicaoAtual = useRef(0)
  const selecionados = agente.epis ?? []
  const limiteAtingido = selecionados.length >= 10

  async function carregar(q = '', sinal?: AbortSignal) {
    const requisicao = ++requisicaoAtual.current
    setCarregando(true)
    setErro('')
    try {
      const anexo = anexoParaApi(agente.anexoNr15)
      const itens = await api.epis.listar({
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(anexo ? { anexo } : {}),
      })
      if (!sinal?.aborted && requisicao === requisicaoAtual.current) setCatalogo(itens)
    } catch {
      if (!sinal?.aborted && requisicao === requisicaoAtual.current) {
        setCatalogo([])
        setErro('Não foi possível carregar o catálogo. Pesquise novamente ou informe o EPI manualmente.')
      }
    } finally {
      if (!sinal?.aborted && requisicao === requisicaoAtual.current) setCarregando(false)
    }
  }

  useEffect(() => {
    const controle = new AbortController()
    void carregar('', controle.signal)
    return () => {
      controle.abort()
      requisicaoAtual.current += 1
    }
  }, [agente.anexoNr15])

  function adicionar(epi: EpiSelecionado) {
    if (limiteAtingido) return
    onChange({ ...agente, epis: [...selecionados, epi] })
  }

  function adicionarManual() {
    const categoria = manual.categoria.trim()
    const modelo = manual.modelo.trim()
    const marca = manual.marca.trim()
    if (!categoria || !modelo || !marca) {
      setErroManual('Preencha categoria, modelo e marca para adicionar o EPI manual.')
      return
    }

    adicionar({
      categoria,
      modelo,
      marca,
      ...(manual.caUnico.trim() ? { caUnico: manual.caUnico.trim() } : {}),
      ...(manual.caPecaFacial.trim() ? { caPecaFacial: manual.caPecaFacial.trim() } : {}),
      ...(manual.caFiltroCartucho.trim() ? { caFiltroCartucho: manual.caFiltroCartucho.trim() } : {}),
    })
    setManual(MANUAL_VAZIO)
    setErroManual('')
  }

  return (
    <section aria-labelledby={tituloId} className="mt-3 rounded-lg border border-navy-100 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 rounded-md bg-navy-50 p-1.5 text-navy-700" aria-hidden="true">
          <ShieldCheck size={16} />
        </div>
        <div className="min-w-0">
          <h4 id={tituloId} className="text-sm font-semibold text-ink-900">Proteção associada</h4>
          <p className="mt-0.5 text-xs leading-5 text-ink-500">
            Selecione o equipamento usado. A eficácia é registrada separadamente.
          </p>
        </div>
      </div>

      {selecionados.length > 0 && (
        <ul aria-label="EPIs associados" className="mt-3 space-y-2">
          {selecionados.map((epi, indice) => (
            <li key={`${epi.catalogoId ?? 'manual'}-${indice}`} className="flex flex-col gap-2 rounded-md border border-brand-100 bg-brand-50/50 p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{epi.modelo}</p>
                <p className="text-xs text-ink-600">{epi.marca} · {epi.categoria}</p>
                {descricaoCas(epi).map((ca) => <p key={ca} className="text-xs text-ink-500">{ca}</p>)}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`self-start text-red-700 hover:bg-red-50 sm:self-center ${FOCO_VISIVEL}`}
                icon={<Trash2 size={14} />}
                aria-label={`Remover ${epi.modelo}`}
                onClick={() => onChange({ ...agente, epis: selecionados.filter((_, item) => item !== indice) })}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(evento) => {
          evento.preventDefault()
          void carregar(consulta)
        }}
      >
        <input
          type="search"
          value={consulta}
          aria-label="Pesquisar EPI, marca ou CA"
          placeholder="Pesquisar modelo, marca ou CA"
          className={`h-9 min-w-0 flex-1 rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 hover:border-ink-400 ${FOCO_VISIVEL}`}
          onChange={(evento) => setConsulta(evento.target.value)}
        />
        <Button type="submit" size="sm" variant="outline" className={FOCO_VISIVEL} icon={<Search size={14} />}>
          Pesquisar EPI
        </Button>
      </form>

      {erro && <p role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">{erro}</p>}
      {carregando ? (
        <p role="status" className="mt-3 text-xs text-ink-500">Carregando sugestões de EPI…</p>
      ) : catalogo.length ? (
        <ul aria-label="Sugestões de EPI" className="mt-3 grid gap-2 lg:grid-cols-2">
          {catalogo.map((item) => {
            const jaAdicionado = selecionados.some((epi) => epi.catalogoId === item.id)
            const snapshot = api.snapshotEpi(item)
            return (
              <li key={item.id} className="flex flex-col justify-between gap-2 rounded-md border border-ink-200 bg-ink-50/60 p-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{item.modelo}</p>
                  <p className="text-xs text-ink-600">{item.marca} · {snapshot.categoria}</p>
                  {descricaoCas(item).map((ca) => <p key={ca} className="text-xs text-ink-500">{ca}</p>)}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`self-start ${FOCO_VISIVEL}`}
                  icon={<Plus size={14} />}
                  disabled={jaAdicionado || limiteAtingido}
                  aria-label={jaAdicionado ? `${item.modelo} já adicionado` : `Adicionar ${item.modelo}`}
                  onClick={() => adicionar(snapshot)}
                >
                  {jaAdicionado ? 'Adicionado' : 'Adicionar'}
                </Button>
              </li>
            )
          })}
        </ul>
      ) : !erro ? (
        <p role="status" className="mt-3 text-xs text-ink-500">Nenhum EPI sugerido para este agente.</p>
      ) : null}

      <details className="mt-3 rounded-md border border-dashed border-ink-300 bg-ink-50/40 p-2.5">
        <summary className={`cursor-pointer text-xs font-semibold text-brand-800 ${FOCO_VISIVEL}`}>
          Informar EPI manualmente
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Input aria-label="Categoria do EPI" placeholder="Categoria" value={manual.categoria} onChange={(evento) => setManual({ ...manual, categoria: evento.target.value })} />
          <Input aria-label="Modelo do EPI" placeholder="Modelo" value={manual.modelo} onChange={(evento) => setManual({ ...manual, modelo: evento.target.value })} />
          <Input aria-label="Marca do EPI" placeholder="Marca" value={manual.marca} onChange={(evento) => setManual({ ...manual, marca: evento.target.value })} />
          <Input aria-label="CA único" placeholder="CA único" value={manual.caUnico} onChange={(evento) => setManual({ ...manual, caUnico: evento.target.value })} />
          <Input aria-label="CA da peça facial" placeholder="CA da peça facial" value={manual.caPecaFacial} onChange={(evento) => setManual({ ...manual, caPecaFacial: evento.target.value })} />
          <Input aria-label="CA do cartucho ou filtro" placeholder="CA do cartucho/filtro" value={manual.caFiltroCartucho} onChange={(evento) => setManual({ ...manual, caFiltroCartucho: evento.target.value })} />
        </div>
        {erroManual && <p role="alert" className="mt-2 text-xs text-red-700">{erroManual}</p>}
        <Button type="button" size="sm" className={`mt-3 ${FOCO_VISIVEL}`} disabled={limiteAtingido} onClick={adicionarManual}>
          Adicionar EPI manual
        </Button>
      </details>

      {limiteAtingido && <p role="alert" className="mt-2 text-xs text-amber-800">Limite de 10 EPIs por agente atingido.</p>}
    </section>
  )
}
