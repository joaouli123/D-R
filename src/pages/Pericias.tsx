import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Plus, Scale, Search, Trash2, User } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Modal, Tabs, useToast } from '@/components/ui'
import type { BadgeTone } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import type { Pericia, StatusPericia } from '@/types'
import { formatDate } from '@/lib/utils'

// ============================================================
// MÓDULO C — Listagem de Perícias
// ============================================================

const STATUS: Record<StatusPericia, { label: string; tone: BadgeTone }> = {
  rascunho: { label: 'Rascunho', tone: 'amber' },
  em_andamento: { label: 'Em andamento', tone: 'navy' },
  concluida: { label: 'Concluída', tone: 'green' },
  entregue: { label: 'Entregue', tone: 'gray' },
}

const MODALIDADE: Record<Pericia['modalidade'], string> = {
  insalubridade: 'Insalubridade',
  periculosidade: 'Periculosidade',
  ambas: 'Insalubridade + Periculosidade',
}

export default function Pericias() {
  const { pericias, empresaPorId, removerPericia } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [aba, setAba] = useState<'todas' | StatusPericia>('todas')
  const [busca, setBusca] = useState('')
  const [confirmar, setConfirmar] = useState<Pericia | null>(null)

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return pericias.filter((p) => {
      const okAba = aba === 'todas' || p.status === aba
      const okBusca =
        !q ||
        [p.numeroProcesso, p.reclamante, p.vara, p.funcaoReclamante ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q)
      return okAba && okBusca
    })
  }, [pericias, aba, busca])

  const contar = (s: StatusPericia) => pericias.filter((p) => p.status === s).length

  return (
    <>
      <PageHeader
        breadcrumb="Módulos C · D · E"
        title="Perícias"
        description="Cadastro de processo, participantes, vistoria, preenchimento técnico e fotografias."
        action={
          <Button icon={<Plus size={16} />} onClick={() => navigate('/pericias/nova')}>
            Nova perícia
          </Button>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <Tabs
          value={aba}
          onChange={setAba}
          tabs={[
            { value: 'todas', label: 'Todas', count: pericias.length },
            { value: 'em_andamento', label: 'Em andamento', count: contar('em_andamento') },
            { value: 'rascunho', label: 'Rascunhos', count: contar('rascunho') },
            { value: 'concluida', label: 'Concluídas', count: contar('concluida') },
          ]}
        />
        <div className="relative p-3">
          <Search size={16} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número do processo, reclamante ou vara…"
            className="h-10 w-full rounded-lg border border-ink-300 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-brand-600"
          />
        </div>
      </Card>

      {filtradas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Scale size={22} />}
            title="Nenhuma perícia encontrada"
            description="Cadastre uma nova perícia para iniciar o preenchimento técnico."
            action={
              <Button icon={<Plus size={16} />} onClick={() => navigate('/pericias/nova')}>
                Nova perícia
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((p) => {
            const principal = p.reclamadas.find((r) => r.principal)
            const empresa = principal ? empresaPorId(principal.empresaId) : undefined
            return (
              <Card
                key={p.id}
                className="cursor-pointer p-4 transition-shadow hover:shadow-pop"
                onClick={() => navigate(`/pericias/${p.id}`)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-navy-700">
                        {p.numeroProcesso}
                      </span>
                      <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                      <Badge tone="gray">{MODALIDADE[p.modalidade]}</Badge>
                      {p.reclamadas.length > 1 && (
                        <Badge tone="navy">{p.reclamadas.length} reclamadas</Badge>
                      )}
                    </div>

                    <h3 className="mt-2 font-semibold text-ink-900">{p.reclamante}</h3>
                    <p className="text-[13px] text-ink-500">
                      {p.funcaoReclamante} · {empresa?.nomeFantasia ?? empresa?.razaoSocial ?? '—'}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
                      <span className="flex items-center gap-1.5">
                        <Scale size={13} /> {p.vara}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={13} /> Vistoria: {formatDate(p.dataVistoria)}
                        {p.horaVistoria && p.horaFimVistoria
                          ? ` das ${p.horaVistoria} às ${p.horaFimVistoria}`
                          : p.horaVistoria
                            ? ` com início às ${p.horaVistoria}`
                            : p.horaFimVistoria
                              ? ` com término às ${p.horaFimVistoria}`
                              : ''}
                      </span>
                      {p.localVistoria && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={13} /> {p.localVistoria}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <User size={13} /> {p.participantes.length} participantes
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-right text-xs text-ink-400 sm:block">
                      Atualizada em
                      <br />
                      {formatDate(p.atualizadoEm)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      icon={<Trash2 size={14} />}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setConfirmar(p)
                      }}
                      aria-label="Excluir perícia"
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        title="Excluir perícia"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmar) removerPericia(confirmar.id)
                toast('Perícia excluída.', 'info')
                setConfirmar(null)
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Excluir a perícia do processo <strong>{confirmar?.numeroProcesso}</strong>? Documentos já
          gerados permanecem no histórico.
        </p>
      </Modal>
    </>
  )
}
