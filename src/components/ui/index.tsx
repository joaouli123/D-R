import React, { createContext, useContext, useEffect, useState } from 'react'
import { AlertTriangle, Check, Info, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Design System — D&R Perícia
// ============================================================

// ---------------- Button ----------------
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
    secondary: 'bg-navy-600 text-white hover:bg-navy-700',
    outline: 'border border-brand-700 text-brand-700 bg-white hover:bg-brand-50',
    ghost: 'text-ink-600 hover:bg-ink-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-[15px]',
  }
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ---------------- Card ----------------
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="text-navy-700 mt-0.5 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h3 className="font-bold text-ink-900 truncate">{title}</h3>
          {subtitle && <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ---------------- Inputs ----------------
type FieldProps = { label?: string; hint?: string; error?: string; required?: boolean }

function FieldWrap({
  label,
  hint,
  error,
  required,
  children,
}: FieldProps & { children: React.ReactNode }) {
  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}
    </div>
  )
}

const inputBase =
  'w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-600 hover:border-ink-400 disabled:bg-ink-50 disabled:text-ink-400'

export function Input({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required}>
      <input
        className={cn(inputBase, 'h-10', error && 'border-red-500', className)}
        {...props}
      />
    </FieldWrap>
  )
}

export function Textarea({
  label,
  hint,
  error,
  required,
  className,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required}>
      <textarea
        rows={rows}
        className={cn(inputBase, 'py-2.5 leading-relaxed resize-y', error && 'border-red-500', className)}
        {...props}
      />
    </FieldWrap>
  )
}

export function Select({
  label,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required}>
      <select className={cn(inputBase, 'h-10 pr-8', error && 'border-red-500', className)} {...props}>
        {children}
      </select>
    </FieldWrap>
  )
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: string }) {
  return (
    <label className={cn('flex items-start gap-2.5 cursor-pointer group', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-700 focus:ring-brand-500 cursor-pointer accent-brand-700"
        {...props}
      />
      <span className="min-w-0">
        <span className="text-sm text-ink-800 group-hover:text-ink-900">{label}</span>
        {description && <span className="block text-xs text-ink-500 mt-0.5">{description}</span>}
      </span>
    </label>
  )
}

// ---------------- Badge ----------------
const badgeTones = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  navy: 'bg-navy-50 text-navy-700 border-navy-200',
  gray: 'bg-ink-100 text-ink-600 border-ink-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
}
export type BadgeTone = keyof typeof badgeTones

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ---------------- Tabs ----------------
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-ink-200">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
            value === t.value ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span
              className={cn(
                'ml-2 rounded-full px-1.5 py-0.5 text-[11px]',
                value === t.value ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500',
              )}
            >
              {t.count}
            </span>
          )}
          {value === t.value && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-700 rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          'relative w-full rounded-xl bg-white shadow-pop animate-fade-in my-auto',
          sizes[size],
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-bold text-ink-900">{title}</h3>
            {subtitle && <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3.5 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- Empty state ----------------
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400">
          {icon}
        </div>
      )}
      <h4 className="font-semibold text-ink-800">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------------- Stepper ----------------
export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: { label: string; description?: string }[]
  current: number
  onSelect?: (i: number) => void
}) {
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s.label} className="flex-1 min-w-[130px]">
            <button
              onClick={() => onSelect?.(i)}
              disabled={!onSelect}
              className={cn(
                'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                active && 'border-brand-600 bg-brand-50',
                done && 'border-brand-200 bg-white',
                !active && !done && 'border-ink-200 bg-white',
                onSelect && 'hover:border-brand-400',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    active && 'bg-brand-700 text-white',
                    done && 'bg-brand-100 text-brand-700',
                    !active && !done && 'bg-ink-100 text-ink-500',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-[13px] font-semibold truncate',
                    active ? 'text-brand-800' : 'text-ink-600',
                  )}
                >
                  {s.label}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------- Toast ----------------
type Toast = { id: number; msg: string; tone: 'success' | 'error' | 'info' }
const ToastCtx = createContext<(msg: string, tone?: Toast['tone']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = (msg: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }

  const icons = {
    success: <Check size={16} />,
    error: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  }
  const tones = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-navy-600 text-white',
  }

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-pop animate-fade-in max-w-sm',
              tones[t.tone],
            )}
          >
            {icons[t.tone]}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ---------------- Skeleton / loader ----------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink-200', className)} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20 text-ink-400">
      <Loader2 size={26} className="animate-spin" />
    </div>
  )
}
