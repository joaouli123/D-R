import { useState } from 'react'
import { cn } from '@/lib/utils'
import logoOficial from '@/assets/logo-dr-oficial.jpeg'

/** Alt fixo da arte embutida — o teste de marca depende dele. */
export const LOGO_PADRAO_ALT =
  'D&R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional'

/** O mínimo que a marca precisa saber sobre o dono dela. */
export interface DonoDaMarca {
  nome?: string | null
  logoUrl?: string | null
}

/**
 * A marca impressa no app e no cabeçalho dos documentos.
 *
 * White-label: quando `perito` já subiu uma logo (Configurações › Meu perfil),
 * é ela que sai — no menu, na pré-visualização, no PDF e no DOCX. A arte da
 * D&R deixou de ser "a logo do sistema" e virou a logo de UM perito; o que
 * sobra aqui é o fallback de quem ainda não subiu nada, e as telas sem sessão
 * (login e splash), que não têm perito para consultar.
 *
 * A arte embutida continua sendo usada inteira, sem remontar a marca com
 * texto e sem filtro que altere as cores dela. As dimensões intrínsecas só
 * acompanham essa arte: a logo de outro perito tem proporção própria e
 * declarar 1600x549 nela reservaria uma caixa errada durante o carregamento.
 */
export function Logo({
  size = 'md',
  className,
  perito,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  invert?: boolean
  showTagline?: boolean
  className?: string
  perito?: DonoDaMarca | null
}) {
  const sizes = {
    sm: 'w-[190px]',
    md: 'w-[250px]',
    lg: 'w-[340px]',
    xl: 'w-[520px]',
  }

  // Logo do perito que não carrega (link expirado, arquivo removido do volume)
  // cai na arte padrão em vez de deixar o ícone de imagem quebrada no
  // documento. Guarda a URL que falhou: se o perito trocar a logo, a nova é
  // tentada de novo.
  const [falhou, setFalhou] = useState<string | null>(null)
  const informada = perito?.logoUrl?.trim()
  const propria = informada && informada !== falhou ? informada : undefined
  const alt = propria
    ? `Logo de ${perito?.nome?.trim() || 'perito responsável'}`
    : LOGO_PADRAO_ALT

  return (
    <div className={cn('inline-flex max-w-full items-center justify-center overflow-hidden rounded bg-white p-1', sizes[size], className)}>
      <img
        src={propria || logoOficial}
        alt={alt}
        {...(propria ? {} : { width: 1600, height: 549 })}
        onError={propria ? () => setFalhou(propria) : undefined}
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
