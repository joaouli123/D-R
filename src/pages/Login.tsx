import { useState } from 'react'
import { AlertCircle, LockKeyhole, Mail } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { Logo, SeloCredenciado } from '@/components/Logo'
import { useApp } from '@/store/AppStore'
import { API_MODE } from '@/services/api'
import loginBg from '@/assets/login-vistoria.jpg'

// ============================================================
// MÓDULO A — Acesso e Gestão de Usuários (login)
// ============================================================

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
    <div className="flex min-h-screen">
      {/* Painel esquerdo — identidade visual */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-800 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.70] grayscale"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-900/95 via-brand-800/85 to-brand-900/95" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 60%, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative">
          <Logo size="xl" invert showTagline />
        </div>

        <div className="relative space-y-5">
          <h2 className="text-2xl font-bold leading-snug text-white">
            Elaboração de documentos técnicos
            <br />
            <span className="text-brand-200">com agilidade e precisão.</span>
          </h2>
          <ul className="space-y-2.5 text-[14px] text-white/75">
            {[
              'Parecer e Laudo Técnico Pericial montados automaticamente',
              'Banco de quesitos pré-cadastrados e selecionáveis',
              'Manifestação, impugnação e esclarecimentos com modelos prontos',
              'Biblioteca pessoal de textos técnicos reutilizáveis',
              'Exportação em PDF e formato editável, pronta para assinatura',
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <SeloCredenciado invert />
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
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
                <input type="checkbox" className="h-4 w-4 rounded border-ink-300 accent-brand-700" />
                Manter conectado
              </label>
              <button type="button" className="text-[13px] font-semibold text-brand-700 hover:underline">
                Esqueci a senha
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={carregando}>
              Entrar
            </Button>
          </form>

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
            © 2026 D&amp;R Perícia · Plataforma Inteligente de Perícia Trabalhista
          </p>
        </div>
      </div>
    </div>
  )
}
