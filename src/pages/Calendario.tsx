import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, MapPin, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Input, Modal, Select, useToast } from '@/components/ui'
import type { BadgeTone } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import * as api from '@/services/api'
import type { Compromisso } from '@/services/api'
import { cn, formatDate } from '@/lib/utils'

const TIPO: Record<string, { label: string; tone: BadgeTone; dot: string }> = {
  vistoria: { label: 'Vistoria', tone: 'green', dot: 'bg-brand-600' },
  prazo: { label: 'Prazo', tone: 'red', dot: 'bg-red-500' },
  audiencia: { label: 'Audiência', tone: 'navy', dot: 'bg-navy-600' },
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const novoCompromisso = (): Omit<Compromisso, 'id'> & { id?: string } => ({
  data: new Date().toISOString().slice(0, 10),
  hora: '09:00',
  titulo: '',
  local: '',
  processo: '',
  tipo: 'vistoria',
})

export default function Calendario() {
  const { pericias } = useApp()
  const toast = useToast()

  const hoje = useMemo(() => new Date(), [])
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())

  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<(Omit<Compromisso, 'id'> & { id?: string }) | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    api.agenda
      .listar()
      .then((lista) => vivo && setCompromissos(lista))
      .catch((e) =>
        vivo && toast(e instanceof Error ? e.message : 'Falha ao carregar a agenda.', 'error'),
      )
      .finally(() => vivo && setCarregando(false))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const celulas = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

  const eventosDoDia = (dia: number) =>
    compromissos.filter(
      (a) => a.data === `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    )

  /** Da data de hoje em diante — a agenda serve para o que vem. */
  const proximos = useMemo(() => {
    const limite = new Date().toISOString().slice(0, 10)
    return compromissos.filter((c) => c.data >= limite).slice(0, 12)
  }, [compromissos])

  function mudarMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1)
    setMes(d.getMonth() + 1)
    setAno(d.getFullYear())
  }

  async function salvar() {
    if (!editando) return
    if (!editando.titulo.trim()) {
      toast('Informe o título do compromisso.', 'error')
      return
    }

    setSalvando(true)
    try {
      const salvo = await api.agenda.salvar(editando)
      setCompromissos((lista) => {
        const i = lista.findIndex((c) => c.id === salvo.id)
        if (i === -1) return [...lista, salvo].sort((a, b) => a.data.localeCompare(b.data))
        const copia = [...lista]
        copia[i] = salvo
        return copia
      })
      setEditando(null)
      toast('Compromisso salvo.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Falha ao salvar o compromisso.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string) {
    const anterior = compromissos
    setCompromissos((lista) => lista.filter((c) => c.id !== id))
    try {
      await api.agenda.remover(id)
      toast('Compromisso removido.', 'info')
    } catch (e) {
      setCompromissos(anterior)
      toast(e instanceof Error ? e.message : 'Falha ao remover.', 'error')
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb="Agenda"
        title="Calendário"
        description="Vistorias, prazos processuais e audiências vinculados às suas perícias."
        action={
          <Button icon={<Plus size={16} />} onClick={() => setEditando(novoCompromisso())}>
            Novo compromisso
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title={`${MESES[mes - 1]} de ${ano}`}
            icon={<CalendarDays size={18} />}
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
                  ‹
                </Button>
                <Button size="sm" variant="ghost" onClick={() => mudarMes(1)} aria-label="Próximo mês">
                  ›
                </Button>
              </div>
            }
          />
          <div className="p-4">
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DIAS.map((d) => (
                <div key={d} className="py-1.5 text-center text-[11px] font-bold uppercase text-ink-400">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((dia, i) => {
                if (dia === null) return <div key={`v-${i}`} />
                const evs = eventosDoDia(dia)
                const isHoje =
                  dia === hoje.getDate() &&
                  mes === hoje.getMonth() + 1 &&
                  ano === hoje.getFullYear()
                return (
                  <div
                    key={dia}
                    className={cn(
                      'min-h-[76px] rounded-lg border p-1.5 transition-colors',
                      isHoje ? 'border-brand-600 bg-brand-50' : 'border-ink-100 hover:border-ink-300',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[12px] font-semibold',
                        isHoje ? 'text-brand-700' : 'text-ink-600',
                      )}
                    >
                      {dia}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {evs.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-1 truncate rounded bg-ink-50 px-1 py-0.5 text-[10px] text-ink-600"
                          title={e.titulo}
                        >
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TIPO[e.tipo].dot)} />
                          <span className="truncate">{e.titulo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        <Card className="lg:sticky lg:top-20 lg:self-start">
          <CardHeader title="Próximos compromissos" icon={<Clock size={18} />} />
          <div className="divide-y divide-ink-100">
            {carregando && <p className="px-5 py-4 text-[13px] text-ink-400">Carregando…</p>}
            {!carregando && proximos.length === 0 && (
              <p className="px-5 py-4 text-[13px] text-ink-400">
                Nenhum compromisso agendado. Use <strong>Novo compromisso</strong> para incluir uma
                vistoria ou um prazo.
              </p>
            )}
            {proximos.map((a) => (
              <div key={a.id} className="group px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setEditando(a)}
                    className="text-left text-[13.5px] font-semibold text-ink-800 hover:text-brand-700"
                  >
                    {a.titulo}
                  </button>
                  <Badge tone={TIPO[a.tipo]?.tone ?? 'gray'}>{TIPO[a.tipo]?.label ?? a.tipo}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                  <CalendarDays size={12} /> {formatDate(a.data)}
                  {a.hora && ` às ${a.hora}`}
                </p>
                {a.local && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                    <MapPin size={12} /> {a.local}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-ink-400">{a.processo}</span>
                  <button
                    onClick={() => void remover(a.id)}
                    className="text-ink-300 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    aria-label="Remover compromisso"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando?.id ? 'Editar compromisso' : 'Novo compromisso'}
        subtitle="Vincule ao processo para localizar o compromisso pela perícia."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditando(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button loading={salvando} onClick={() => void salvar()}>
              Salvar
            </Button>
          </>
        }
      >
        {editando && (
          <div className="space-y-4">
            <Input
              label="Título"
              required
              value={editando.titulo}
              onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
              placeholder="Vistoria — Ferrante Metais"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Data"
                type="date"
                required
                value={editando.data}
                onChange={(e) => setEditando({ ...editando, data: e.target.value })}
              />
              <Input
                label="Horário"
                type="time"
                value={editando.hora}
                onChange={(e) => setEditando({ ...editando, hora: e.target.value })}
              />
              <Select
                label="Tipo"
                value={editando.tipo}
                onChange={(e) =>
                  setEditando({ ...editando, tipo: e.target.value as Compromisso['tipo'] })
                }
              >
                <option value="vistoria">Vistoria</option>
                <option value="prazo">Prazo</option>
                <option value="audiencia">Audiência</option>
              </Select>
            </div>
            <Input
              label="Local"
              value={editando.local}
              onChange={(e) => setEditando({ ...editando, local: e.target.value })}
              placeholder="Cajamar/SP ou 71ª VT São Paulo"
            />
            <Select
              label="Processo vinculado"
              value={editando.processo}
              onChange={(e) => setEditando({ ...editando, processo: e.target.value })}
            >
              <option value="">— sem vínculo —</option>
              {pericias.map((p) => (
                <option key={p.id} value={p.numeroProcesso}>
                  {p.numeroProcesso} — {p.reclamante}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Modal>
    </>
  )
}
