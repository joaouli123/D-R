import { cn } from '@/lib/utils'
import logoOficial from '@/assets/logo-dr-oficial.jpeg'

/**
 * Marca oficial aprovada da D&R Perícia Trabalhista.
 *
 * A arte já contém símbolo, nome e assinatura institucional. Por isso ela
 * nunca é remontada com texto nem recebe filtros que alterem suas cores.
 */
export function Logo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  invert?: boolean
  showTagline?: boolean
  className?: string
}) {
  const sizes = {
    sm: 'w-[190px]',
    md: 'w-[250px]',
    lg: 'w-[340px]',
    xl: 'w-[520px]',
  }

  return (
    <div className={cn('inline-flex max-w-full items-center justify-center overflow-hidden rounded bg-white p-1', sizes[size], className)}>
      <img
        src={logoOficial}
        alt="D&R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional"
        width={1600}
        height={549}
        className="h-auto w-full max-w-full object-contain"
      />
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
