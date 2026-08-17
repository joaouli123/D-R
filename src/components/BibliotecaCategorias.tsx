import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  FileCheck2,
  FileText,
  HelpCircle,
  LibraryBig,
  MessageSquareText,
  ScrollText,
  ShieldAlert,
} from 'lucide-react'
import {
  BIBLIOTECAS_DOCUMENTO,
  type BibliotecaAtiva,
} from '@/lib/biblioteca'
import { cn } from '@/lib/utils'

const ICONES: Record<BibliotecaAtiva, LucideIcon> = {
  todas: LibraryBig,
  parecer: FileText,
  laudo: FileCheck2,
  quesitos: HelpCircle,
  manifestacao: MessageSquareText,
  impugnacao: ShieldAlert,
  esclarecimento: ScrollText,
  geral: BookOpen,
}

const ITENS: ReadonlyArray<{
  value: BibliotecaAtiva
  label: string
  curto: string
}> = [
  { value: 'todas', label: 'Todos os textos', curto: 'Todos' },
  ...BIBLIOTECAS_DOCUMENTO,
  { value: 'geral', label: 'Uso geral', curto: 'Uso geral' },
]

const quantidade = (valor: number): string => `${valor} ${valor === 1 ? 'texto' : 'textos'}`

export function BibliotecaCategorias({
  ativa,
  contagens,
  onChange,
}: {
  ativa: BibliotecaAtiva
  contagens: Record<BibliotecaAtiva, number>
  onChange: (biblioteca: BibliotecaAtiva) => void
}) {
  return (
    <nav aria-label="Bibliotecas por documento" className="overflow-x-auto scroll-smooth motion-reduce:scroll-auto">
      <div className="flex min-w-max gap-2 p-3">
        {ITENS.map((item) => {
          const Icone = ICONES[item.value]
          const selecionada = ativa === item.value
          const total = contagens[item.value]

          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={selecionada}
              aria-label={`${item.label}: ${quantidade(total)}`}
              onClick={() => onChange(item.value)}
              className={cn(
                'relative min-w-[148px] overflow-hidden rounded-xl border px-3 py-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                selecionada
                  ? 'border-navy-700 bg-navy-800 text-white shadow-card'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50/60',
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg',
                    selecionada ? 'bg-white/10 text-brand-200' : 'bg-navy-50 text-navy-700',
                  )}
                >
                  <Icone size={17} aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                    selecionada ? 'bg-white/10 text-white' : 'bg-ink-100 text-ink-600',
                  )}
                >
                  {total}
                </span>
              </span>
              <span className="mt-2 block text-[13px] font-semibold leading-tight">{item.curto}</span>
              {selecionada && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-brand-400" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
