import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  ChevronDown,
  FileText,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  Scale,
  Settings,
  X,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useApp } from '@/store/AppStore'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Início', icon: LayoutGrid, end: true },
  { to: '/pericias', label: 'Perícias', icon: Scale },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/clientes', label: 'Clientes', icon: Building2 },
  { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
]

const NAV_FOOTER = [
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/ajuda', label: 'Ajuda', icon: HelpCircle },
]

export function AppLayout() {
  const { usuario, logout } = useApp()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)

  const iniciais = (usuario?.nome ?? 'DR')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg border-l-[3px] px-2.5 py-2 text-[13.5px] font-medium transition-colors',
      isActive
        ? 'border-brand-400 bg-brand-600/20 text-white font-semibold'
        : 'border-transparent text-white/65 hover:bg-white/10 hover:text-white',
    )

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col bg-navy-900 transition-transform lg:translate-x-0 no-print',
          menuAberto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <Logo size="sm" invert />
          <button
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setMenuAberto(false)}>
              <Icon size={17} strokeWidth={1.9} />
              {label}
            </NavLink>
          ))}

          <div className="my-3 border-t border-white/10" />

          {NAV_FOOTER.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass} onClick={() => setMenuAberto(false)}>
              <Icon size={17} strokeWidth={1.9} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Versão 1.0</p>
          <p className="mt-0.5 text-[11px] text-white/50">Plataforma Inteligente de Perícia</p>
        </div>
      </aside>

      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden no-print"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* ---------- Conteúdo ---------- */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[236px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 lg:px-6 no-print">
          <button
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div className="hidden min-w-0 flex-1 md:block">
            <p className="text-[13px] font-semibold text-ink-800">
              Elaboração de Documentos Técnicos
            </p>
            <p className="text-xs text-ink-500">com agilidade e precisão</p>
          </div>

          <div className="relative ml-auto">
            <button
              onClick={() => setPerfilAberto((v) => !v)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-ink-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-[12px] font-bold text-white">
                {iniciais}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-semibold leading-tight text-ink-800">
                  {usuario?.nome.split(' ').slice(0, 2).join(' ')}
                </span>
                <span className="block text-[11px] leading-tight text-ink-500">
                  {usuario?.registroProfissional ?? usuario?.perfil}
                </span>
              </span>
              <ChevronDown size={15} className="text-ink-400" />
            </button>

            {perfilAberto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPerfilAberto(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-ink-200 bg-white py-1.5 shadow-pop animate-fade-in">
                  <div className="border-b border-ink-100 px-4 py-2.5">
                    <p className="text-sm font-semibold text-ink-900">{usuario?.nome}</p>
                    <p className="text-xs text-ink-500">{usuario?.email}</p>
                    {usuario?.titulo && (
                      <p className="mt-1 text-[11px] text-brand-700">{usuario.titulo}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPerfilAberto(false)
                      navigate('/configuracoes')
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <Settings size={15} /> Configurações
                  </button>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={15} /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Cabeçalho padrão de página. */
export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  breadcrumb?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 no-print">
      <div className="min-w-0">
        {breadcrumb && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-navy-600">
            {breadcrumb}
          </p>
        )}
        <h1 className="font-display text-[24px] font-semibold leading-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  )
}
