import { cn } from '@/lib/utils'

/**
 * Marca D&R Perícia.
 * "D" e "R" na cor de marca (azul), "&" em tom neutro, tarja "PERÍCIA" abaixo.
 */
export function Logo({
  size = 'md',
  invert = false,
  showTagline = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  invert?: boolean
  showTagline?: boolean
  className?: string
}) {
  const sizes = {
    sm: { mark: 'text-[19px]', rule: 'text-[7px] tracking-[0.34em]', gap: 'gap-0' },
    md: { mark: 'text-[26px]', rule: 'text-[8px] tracking-[0.36em]', gap: 'gap-0.5' },
    lg: { mark: 'text-[44px]', rule: 'text-[11px] tracking-[0.42em]', gap: 'gap-1' },
    xl: { mark: 'text-[64px]', rule: 'text-[15px] tracking-[0.44em]', gap: 'gap-1.5' },
  }
  const s = sizes[size]
  const primary = invert ? 'text-white' : 'text-brand-700'
  const dark = invert ? 'text-white/80' : 'text-ink-900'
  const rule = invert ? 'text-white/90' : 'text-brand-700'

  return (
    <div className={cn('flex flex-col items-center leading-none', s.gap, className)}>
      <div className={cn('font-extrabold tracking-tight', s.mark)}>
        <span className={primary}>D</span>
        <span className={dark}>&amp;</span>
        <span className={primary}>R</span>
      </div>
      <div className={cn('flex items-center gap-1.5 font-bold uppercase', s.rule, rule)}>
        <span className={cn('h-px w-3', invert ? 'bg-white/60' : 'bg-brand-700')} />
        Perícia
        <span className={cn('h-px w-3', invert ? 'bg-white/60' : 'bg-brand-700')} />
      </div>
      {showTagline && (
        <p
          className={cn(
            'mt-3 text-center text-[11px] font-bold uppercase tracking-[0.18em]',
            invert ? 'text-white/70' : 'text-navy-600',
          )}
        >
          Plataforma Inteligente de Perícia Trabalhista
        </p>
      )}
    </div>
  )
}

/** Selo de credenciamento profissional (rodapé do login). */
export function SeloCredenciado({
  invert = false,
  className,
}: {
  invert?: boolean
  className?: string
}) {
  const items = [
    { sigla: 'CREA-SP', texto: 'Conselho Regional de Engenharia e Agronomia de São Paulo' },
    { sigla: 'CONFEA', texto: 'Conselho Federal de Engenharia e Agronomia' },
    { sigla: 'MTE', texto: 'Ministério do Trabalho e Emprego' },
  ]
  return (
    <div
      className={cn(
        'flex flex-col justify-center rounded-xl border-2 px-5 py-4',
        invert ? 'border-white/25' : 'border-navy-600/25',
        className,
      )}
    >
      <p
        className={cn(
          'mb-3 text-center text-[10px] font-bold uppercase tracking-[0.28em]',
          invert ? 'text-white/70' : 'text-navy-600',
        )}
      >
        Profissional Credenciado
      </p>
      <div className="grid grid-cols-3 divide-x divide-current/10">
        {items.map((i) => (
          <div key={i.sigla} className="px-2 text-center">
            <p className={cn('text-[13px] font-extrabold', invert ? 'text-white' : 'text-navy-700')}>
              {i.sigla}
            </p>
            <p className={cn('mt-0.5 text-[9px] leading-tight', invert ? 'text-white/60' : 'text-ink-500')}>
              {i.texto}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
