import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  ChevronDown,
  FileText,
  FileSearch,
  Files,
  Fingerprint,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  ScrollText,
  ShieldAlert,
  Settings,
  X,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { BuscaGlobal } from '@/components/BuscaGlobal'
import { useApp } from '@/store/AppStore'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Início', icon: LayoutGrid, end: true },
  { to: '/clientes', label: 'Cadastrar Empresa', icon: Building2 },
  { to: '/pericias/nova?tipo=parecer', label: 'Gerar Parecer Técnico Pericial', icon: FileText },
  { to: '/pericias/nova?tipo=laudo', label: 'Gerar Laudo Técnico Pericial', icon: Files },
  { to: '/quesitos', label: 'Elaborar Quesitos Técnicos', icon: HelpCircle },
  { to: '/manifestacao/concordancia', label: 'Elaborar Manifestação sobre o Laudo', icon: ScrollText },
  { to: '/manifestacao/impugnacao_laudo', label: 'Elaborar Impugnação ao Laudo', icon: ShieldAlert },
  { to: '/esclarecimentos', label: 'Elaborar Esclarecimentos Técnicos', icon: FileSearch },
  { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
]

const NAV_FOOTER = [
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/ajuda', label: 'Ajuda', icon: HelpCircle },
]

const EM_DESENVOLVIMENTO = [
  { label: 'Gerar PGR', icon: FileText },
  { label: 'Gerar Laudo de Insalubridade', icon: FileText },
  { label: 'Gerar Laudo de Periculosidade', icon: FileText },
  { label: 'Gerar LTCAT', icon: FileText },
  { label: 'Entrega de EPIs por biometria/facial', icon: Fingerprint },
]

export function AppLayout() {
  const { usuario, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)

  const iniciais = (usuario?.nome ?? 'DR')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const linkClass = (destino: string) => ({ isActive }: { isActive: boolean }) => {
    const [pathname, search = ''] = destino.split('?')
    const ativo = search
      ? location.pathname === pathname && location.search === `?${search}`
      : isActive
    return (
    cn(
      'flex items-start gap-3 rounded-lg border-l-[3px] px-2.5 py-2 text-[13px] font-medium leading-4 transition-colors',
      ativo
        ? 'border-brand-400 bg-brand-600/20 text-white font-semibold'
        : 'border-transparent text-white/65 hover:bg-white/10 hover:text-white',
    ))
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col bg-navy-900 transition-transform lg:translate-x-0 no-print',
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

        <nav aria-label="Navegação principal" className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass(to)} onClick={() => setMenuAberto(false)}>
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="my-3 border-t border-white/10" />

          {NAV_FOOTER.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass(to)} onClick={() => setMenuAberto(false)}>
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}

          <section aria-label="Em desenvolvimento" className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Em desenvolvimento
            </p>
            <div className="space-y-1">
              {EM_DESENVOLVIMENTO.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-start gap-3 rounded-lg border-l-[3px] border-transparent px-2.5 py-2 text-left text-[12.5px] leading-4 text-white/35"
                >
                  <Icon size={16} className="mt-px shrink-0" strokeWidth={1.8} />
                  <span className="min-w-0 flex-1">{label}</span>{' '}
                  <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35">
                    Em breve
                  </span>
                </button>
              ))}
            </div>
          </section>
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
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[292px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 lg:px-6 no-print">
          <button
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div className="hidden min-w-0 shrink-0 md:block">
            <p className="text-[13px] font-semibold text-ink-800">
              Elaboração de Documentos Técnicos
            </p>
            <p className="text-xs text-ink-500">com agilidade e precisão</p>
          </div>

          <BuscaGlobal />

          <div className="relative ml-auto sm:ml-0">
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
