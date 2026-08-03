import { useState } from 'react'
import { CalendarDays, Clock, MapPin, Plus } from 'lucide-react'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import type { BadgeTone } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { AGENDA } from '@/mocks/db'
import { cn, formatDate } from '@/lib/utils'

const TIPO: Record<string, { label: string; tone: BadgeTone; dot: string }> = {
  vistoria: { label: 'Vistoria', tone: 'green', dot: 'bg-brand-600' },
  prazo: { label: 'Prazo', tone: 'red', dot: 'bg-red-500' },
  audiencia: { label: 'Audiência', tone: 'navy', dot: 'bg-navy-600' },
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function Calendario() {
  const hoje = new Date('2026-07-27')
  const [mes, setMes] = useState(7)
  const ano = 2026

  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const celulas = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

  const eventosDoDia = (dia: number) =>
    AGENDA.filter((a) => a.data === `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`)

  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  return (
    <>
      <PageHeader
        breadcrumb="Agenda"
        title="Calendário"
        description="Vistorias, prazos processuais e audiências vinculados às suas perícias."
        action={<Button icon={<Plus size={16} />}>Novo compromisso</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title={`${MESES[mes - 1]} de ${ano}`}
            icon={<CalendarDays size={18} />}
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setMes((m) => Math.max(1, m - 1))}>
                  ‹
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMes((m) => Math.min(12, m + 1))}>
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
                const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() + 1
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
            {AGENDA.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink-800">{a.titulo}</p>
                  <Badge tone={TIPO[a.tipo].tone}>{TIPO[a.tipo].label}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                  <CalendarDays size={12} /> {formatDate(a.data)} às {a.hora}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                  <MapPin size={12} /> {a.local}
                </p>
                <p className="mt-1 font-mono text-[11px] text-ink-400">{a.processo}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
