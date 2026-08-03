import { useMemo } from 'react'
import { Download, PieChart, TrendingUp } from 'lucide-react'
import { Badge, Button, Card, CardHeader, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import { downloadTexto } from '@/lib/utils'

// ============================================================
// RELATÓRIOS — produtividade e distribuição do trabalho pericial
// ============================================================

const TIPO_LABEL: Record<string, string> = {
  parecer: 'Parecer Técnico',
  laudo: 'Laudo Técnico',
  quesitos: 'Quesitos',
  manifestacao: 'Manifestação',
  impugnacao: 'Impugnação',
  esclarecimento: 'Esclarecimento',
}

/** Barra horizontal simples — uma cor da marca, rótulo e valor sempre visíveis. */
function BarraLinha({ label, valor, max }: { label: string; valor: number; max: number }) {
  const pct = max > 0 ? (valor / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-[12.5px] text-ink-600">{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded bg-ink-100">
        <div
          className="h-full rounded bg-navy-600 transition-all"
          style={{ width: `${Math.max(pct, valor > 0 ? 6 : 0)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[13px] font-bold tabular-nums text-ink-800">
        {valor}
      </span>
    </div>
  )
}

export default function Relatorios() {
  const { documentos, pericias, empresas, textos, quesitos } = useApp()
  const toast = useToast()

  const porTipo = useMemo(() => {
    const m = new Map<string, number>()
    documentos.forEach((d) => m.set(d.tipo, (m.get(d.tipo) ?? 0) + 1))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [documentos])

  const porModalidade = useMemo(() => {
    const m = new Map<string, number>()
    pericias.forEach((p) => m.set(p.modalidade, (m.get(p.modalidade) ?? 0) + 1))
    return Array.from(m.entries())
  }, [pericias])

  const maxTipo = Math.max(1, ...porTipo.map(([, v]) => v))
  const maxMod = Math.max(1, ...porModalidade.map(([, v]) => v))

  const textosMaisUsados = [...textos].sort((a, b) => b.usos - a.usos).slice(0, 6)

  function exportarCsv() {
    const linhas = [
      'tipo;titulo;processo;reclamante;empresa;status;criado_em;atualizado_em',
      ...documentos.map((d) =>
        [d.tipo, d.titulo, d.numeroProcesso, d.reclamante, d.empresaPrincipal, d.status, d.criadoEm, d.atualizadoEm].join(';'),
      ),
    ].join('\n')
    downloadTexto('relatorio-documentos.csv', linhas, 'text/csv;charset=utf-8')
    toast('Relatório exportado em CSV.')
  }

  const indicadores = [
    { label: 'Perícias cadastradas', valor: pericias.length },
    { label: 'Documentos gerados', valor: documentos.length },
    { label: 'Empresas na base', valor: empresas.length },
    { label: 'Textos na biblioteca', valor: textos.length },
    { label: 'Quesitos disponíveis', valor: quesitos.length },
    {
      label: 'Docs por perícia',
      valor: pericias.length ? (documentos.length / pericias.length).toFixed(1) : '0',
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb="Gestão"
        title="Relatórios"
        description="Produtividade e distribuição do trabalho pericial na plataforma."
        action={
          <Button variant="outline" icon={<Download size={16} />} onClick={exportarCsv}>
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {indicadores.map((i) => (
          <Card key={i.label} className="p-4">
            <p className="text-[11.5px] leading-tight text-ink-500">{i.label}</p>
            <p className="mt-2 text-[26px] font-bold leading-none text-ink-900">{i.valor}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Documentos por tipo" icon={<PieChart size={18} />} />
          <div className="space-y-2.5 p-5">
            {porTipo.map(([tipo, valor]) => (
              <BarraLinha key={tipo} label={TIPO_LABEL[tipo] ?? tipo} valor={valor} max={maxTipo} />
            ))}
            {porTipo.length === 0 && <p className="text-sm text-ink-500">Sem documentos ainda.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Perícias por modalidade" icon={<TrendingUp size={18} />} />
          <div className="space-y-2.5 p-5">
            {porModalidade.map(([mod, valor]) => (
              <BarraLinha
                key={mod}
                label={mod === 'ambas' ? 'Insalubridade + Periculosidade' : mod}
                valor={valor}
                max={maxMod}
              />
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Textos mais reaproveitados"
            subtitle="Módulo F — indica onde a padronização já economiza tempo de redação."
          />
          <div className="divide-y divide-ink-100">
            {textosMaisUsados.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-800">{t.titulo}</span>
                <Badge tone="gray">{t.secao}</Badge>
                <span className="w-16 text-right text-[13px] font-bold tabular-nums text-navy-700">
                  {t.usos} usos
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
