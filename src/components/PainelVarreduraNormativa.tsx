import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react'

import { Button } from '@/components/ui'
import type { AnexoVarredura } from '@/lib/varreduraNormativa'
import type { StatusVarredura } from '@/types'

interface Props {
  norma: 'NR-15' | 'NR-16'
  itens: AnexoVarredura[]
  onStatusChange: (anexoId: string, status: StatusVarredura) => void
  onExposicao: (anexoId: string) => void
}

const ROTULO_STATUS: Record<StatusVarredura, string> = {
  nao_avaliado: 'Pendente',
  sem_exposicao: 'Sem exposição',
  exposicao_identificada: 'Exposição identificada',
  nao_aplicavel: 'Revogado — não aplicável',
}

export function PainelVarreduraNormativa({ norma, itens, onStatusChange, onExposicao }: Props) {
  const avaliados = itens.filter((item) => item.status !== 'nao_avaliado').length

  return (
    <section aria-label={`Varredura dos anexos da ${norma}`} className="rounded-xl border border-ink-200 bg-ink-50/70 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink-900">Varredura obrigatória da {norma}</h3>
          <p className="mt-0.5 text-xs text-ink-500">Avalie todos os anexos antes de emitir o documento.</p>
        </div>
        <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold text-navy-800">
          {avaliados} de {itens.length} anexos avaliados
        </span>
      </div>

      <div className="grid gap-2">
        {itens.map((item) => {
          const resolvido = item.status !== 'nao_avaliado'
          const fixo = item.status === 'nao_aplicavel'
          return (
            <div key={item.anexoId} className="grid gap-3 rounded-lg border border-ink-200 bg-white p-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-start gap-2.5">
                {fixo ? <MinusCircle size={17} className="mt-0.5 shrink-0 text-ink-400" /> : resolvido ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-700" /> : <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">Anexo {item.numero} — {item.tema}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{ROTULO_STATUS[item.status]}</p>
                </div>
              </div>
              {!fixo && (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    size="sm"
                    variant={item.status === 'sem_exposicao' ? 'primary' : 'outline'}
                    aria-label={`Anexo ${item.numero} — ${item.tema}: Sem exposição`}
                    disabled={item.temAvaliacao}
                    title={item.temAvaliacao ? 'Remova as avaliações detalhadas deste anexo antes de marcar sem exposição.' : undefined}
                    onClick={() => onStatusChange(item.anexoId, 'sem_exposicao')}
                  >
                    Sem exposição
                  </Button>
                  <Button
                    size="sm"
                    variant={item.status === 'exposicao_identificada' ? 'secondary' : 'outline'}
                    aria-label={`Anexo ${item.numero} — ${item.tema}: Exposição identificada`}
                    onClick={() => onExposicao(item.anexoId)}
                  >
                    Exposição identificada
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
