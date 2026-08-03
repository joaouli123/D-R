import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Gavel, Plus, Search } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Select } from '@/components/ui'
import type { BadgeTone } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import type { StatusPericia } from '@/types'
import { formatDate } from '@/lib/utils'

// ============================================================
// Visão por processo judicial (Módulo C — consulta)
// ============================================================

const STATUS: Record<StatusPericia, { label: string; tone: BadgeTone }> = {
  rascunho: { label: 'Rascunho', tone: 'amber' },
  em_andamento: { label: 'Em andamento', tone: 'navy' },
  concluida: { label: 'Concluída', tone: 'green' },
  entregue: { label: 'Entregue', tone: 'gray' },
}

export default function Processos() {
  const { pericias, documentos, empresaPorId } = useApp()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [vara, setVara] = useState('todas')

  const varas = useMemo(() => Array.from(new Set(pericias.map((p) => p.vara))).sort(), [pericias])

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return pericias
      .filter((p) => vara === 'todas' || p.vara === vara)
      .filter(
        (p) => !q || [p.numeroProcesso, p.reclamante, p.comarca].join(' ').toLowerCase().includes(q),
      )
  }, [pericias, busca, vara])

  return (
    <>
      <PageHeader
        breadcrumb="Módulo C"
        title="Processos"
        description="Visão consolidada por processo judicial, com os documentos vinculados a cada um."
        action={
          <Button icon={<Plus size={16} />} onClick={() => navigate('/pericias/nova')}>
            Novo processo
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 p-3 sm:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número, reclamante ou comarca…"
              className="h-10 w-full rounded-lg border border-ink-300 pl-9 pr-3 text-sm focus:border-brand-600"
            />
          </div>
          <Select value={vara} onChange={(e) => setVara(e.target.value)}>
            <option value="todas">Todas as varas</option>
            {varas.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {lista.length === 0 ? (
        <Card>
          <EmptyState icon={<Gavel size={22} />} title="Nenhum processo encontrado" />
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => {
            const docs = documentos.filter((d) => d.periciaId === p.id)
            const empresa = empresaPorId(p.reclamadas.find((r) => r.principal)?.empresaId ?? '')
            return (
              <Card key={p.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-navy-700">
                        {p.numeroProcesso}
                      </span>
                      <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                    </div>
                    <p className="mt-1.5 text-[13px] text-ink-600">
                      {p.vara} · {p.comarca}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-500">
                      <strong className="text-ink-700">{p.reclamante}</strong> ×{' '}
                      {empresa?.razaoSocial ?? '—'}
                      {p.reclamadas.length > 1 && ` (+${p.reclamadas.length - 1})`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ExternalLink size={14} />}
                    onClick={() => navigate(`/pericias/${p.id}`)}
                  >
                    Abrir perícia
                  </Button>
                </div>

                {docs.length > 0 && (
                  <div className="mt-3 border-t border-ink-100 pt-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                      Documentos vinculados ({docs.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {docs.map((d) => (
                        <span
                          key={d.id}
                          className="rounded-lg border border-ink-200 px-2.5 py-1 text-[12px] text-ink-600"
                        >
                          {d.titulo} · {formatDate(d.atualizadoEm)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
