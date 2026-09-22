import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Building2,
  HardHat,
  LockKeyhole,
  Mail,
  Scale,
  type LucideIcon,
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { Logo, SeloCredenciado } from '@/components/Logo'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/AppStore'
import { API_MODE } from '@/services/api'
import loginBg from '@/assets/login-vistoria.jpg'

// ============================================================
// MÓDULO A — Acesso e Gestão de Usuários (login)
// ============================================================

/**
 * Os três públicos da plataforma, com o texto que o perito escreveu em 18/09.
 *
 * Ícone do lucide no lugar do emoji do original (⚖️ 🦺 🏢): o menu acabou de
 * trocar emoji por ícone de interface justamente porque a arte do emoji muda
 * de sistema para sistema, e a tela de entrada é a primeira coisa que um
 * cliente novo vê.
 *
 * `emDesenvolvimento` marca o que ainda não existe no sistema (SST e
 * Empresas: PGR, LTCAT, laudos, entrega de EPI por biometria — os mesmos
 * itens que o menu lista como "Em breve"). Decisão do perito em 18/09:
 * anunciar como vitrine do que vem, mas sinalizado, para a tela de entrada
 * não prometer o que a conta ainda não entrega.
 */
const PUBLICOS: {
  titulo: string
  icone: LucideIcon
  itens: string[]
  emDesenvolvimento?: boolean
}[] = [
  {
    titulo: 'Para Peritos e Assistentes Técnicos',
    icone: Scale,
    itens: [
      'Cadastro de empresas e busca de processos',
      'Laudos e Pareceres Técnicos Periciais',
      'Quesitos estratégicos',
      'Manifestações, Impugnações e Esclarecimentos',
      'EPIs diretamente da base oficial do Ministério do Trabalho',
      'Biblioteca técnica e exportação em PDF/editável',
    ],
  },
  {
    titulo: 'Para Engenheiros e Técnicos de Segurança',
    icone: HardHat,
    itens: ['PGR', 'Laudo de Insalubridade', 'Laudo de Periculosidade', 'LTCAT'],
    emDesenvolvimento: true,
  },
  {
    titulo: 'Para Empresas',
    icone: Building2,
    itens: [
      'Gestão de SST',
      'Registro e controle eletrônico de entrega de EPIs aos colaboradores com assinatura biométrica ou facial',
    ],
    emDesenvolvimento: true,
  },
]

export default function Login() {
  const { login } = useApp()
  const [email, setEmail] = useState(API_MODE === 'mock' ? 'dinoel@drpericiaelite.com.br' : '')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-shell flex min-h-screen">
      {/* Painel esquerdo — identidade visual */}
      <div
        data-testid="login-brand-panel"
        className="login-brand-panel relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-800 p-12 lg:flex"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.70] grayscale"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-900/95 via-brand-800/85 to-brand-900/95" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 60%, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative">
          <Logo size="xl" invert showTagline className="login-brand-logo" />
        </div>

        <div className="login-brand-content relative my-6 min-h-0 flex-1 space-y-5 pr-1">
          <div className="login-brand-intro space-y-2">
            <h2 className="text-2xl font-bold leading-snug text-white">
              Precisão, fundamentação e praticidade
              <br />
              <span className="text-brand-200">em um só lugar.</span>
            </h2>
            <p className="text-[13.5px] leading-relaxed text-white/75">
              Uma plataforma completa, com soluções específicas para Peritos e Assistentes Técnicos,
              Profissionais de SST e Empresas.
            </p>
          </div>

          <div className="login-audiences space-y-4">
            {PUBLICOS.map(({ titulo, icone: Icone, itens, emDesenvolvimento }) => (
              <section key={titulo} className="login-audience-section">
                <h3 className="login-audience-title mb-1.5 flex flex-wrap items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-brand-200">
                  <Icone size={15} strokeWidth={2} aria-hidden="true" />
                  {titulo}
                  {emDesenvolvimento && (
                    // Mesma pílula do menu ("Em breve"), para o visitante ler a
                    // mesma promessa nos dois lugares.
                    <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-wide text-white/55">
                      Em desenvolvimento
                    </span>
                  )}
                </h3>
                <ul
                  className={cn(
                    'login-audience-list space-y-1 text-[13px] leading-snug',
                    emDesenvolvimento ? 'text-white/50' : 'text-white/75',
                  )}
                >
                  {itens.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span
                        className={cn(
                          'mt-[7px] h-1 w-1 shrink-0 rounded-full',
                          emDesenvolvimento ? 'bg-white/30' : 'bg-brand-300',
                        )}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="login-brand-footer text-[12.5px] leading-relaxed text-white/60">
            DR Perícias Trabalhista — tecnologia para trabalhar com mais agilidade, precisão e
            segurança.
          </p>
        </div>

        <div className="relative shrink-0">
          <SeloCredenciado invert className="login-credential-seal" />
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div
        data-testid="login-form-panel"
        className="login-form-panel flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2"
      >
        <div className="login-form-card w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" showTagline />
          </div>

          <h1 className="text-[26px] font-bold text-ink-900">Acessar o sistema</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Área restrita aos profissionais autorizados.
          </p>

          <form onSubmit={entrar} className="mt-7 space-y-4">
            <div className="relative">
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                className="pl-9"
                required
              />
              <Mail size={16} className="absolute left-3 top-[34px] text-ink-400" />
            </div>

            <div className="relative">
              <Input
                label="Senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                required
              />
              <LockKeyhole size={16} className="absolute left-3 top-[34px] text-ink-400" />
            </div>

            {erro && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {erro}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink-300 accent-brand-700"
                />
                Manter conectado
              </label>
              <button
                type="button"
                className="text-[13px] font-semibold text-brand-700 hover:underline"
              >
                Esqueci a senha
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={carregando}>
              Entrar
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-600">
            Não tem conta?{' '}
            <Link to="/cadastro" className="font-semibold text-brand-700 hover:underline">
              Cadastre sua empresa
            </Link>
          </p>

          {API_MODE === 'mock' && (
            <div className="mt-6 rounded-lg border border-dashed border-ink-300 bg-ink-50 px-4 py-3 text-[12px] text-ink-500">
              <p className="font-semibold text-ink-700">Ambiente de demonstração</p>
              <p className="mt-0.5">
                Use <span className="font-mono text-ink-800">dinoel@drpericiaelite.com.br</span> com
                qualquer senha de 4+ caracteres.
              </p>
            </div>
          )}

          <p className="mt-8 text-center text-[11px] text-ink-400">
            © 2026 DR Perícias Trabalhista
          </p>
        </div>
      </div>
    </div>
  )
}
