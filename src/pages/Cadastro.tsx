import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { CamposSenha } from '@/components/CamposSenha'
import {
  CamposDaEmpresa,
  cadastroParaEnviar,
  EMPRESA_EM_BRANCO,
  problemaNaEmpresa,
  type FormDaEmpresa,
} from '@/components/CamposDaEmpresa'
import * as api from '@/services/api'
import { mensagemDeErro } from '@/services/api'
import { emailValido, problemaNaSenha } from '@/lib/cadastro'

// ============================================================
// Cadastro público — a empresa cliente pede o acesso sozinha.
//
// Os mesmos campos da "Nova licença": CPF ou CNPJ primeiro (o CNPJ traz o
// cadastro da Receita), o CEP antes do endereço, Senha e Repetir senha. A
// conta nasce aguardando aprovação; o titular aprova ou recusa na página
// Licenças, e até lá o login explica que o cadastro está em análise.
// ============================================================

export default function Cadastro() {
  const [empresa, setEmpresa] = useState<FormDaEmpresa>(EMPRESA_EM_BRANCO)
  const [admin, setAdmin] = useState({ nome: '', email: '', senha: '', confirmacao: '' })
  /** Armadilha para robô: escondida de quem usa a tela. */
  const [site, setSite] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  const doAdmin = (chave: keyof typeof admin) => (valor: string) =>
    setAdmin((atual) => ({ ...atual, [chave]: valor }))

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const problema =
      problemaNaEmpresa(empresa) ??
      (!admin.nome.trim() || !admin.email.trim()
        ? 'Informe o seu nome e o e-mail de acesso.'
        : !emailValido(admin.email)
          ? 'E-mail de acesso inválido.'
          : problemaNaSenha(admin.senha, admin.confirmacao))
    if (problema) {
      setErro(problema)
      return
    }

    setOcupado(true)
    setErro(null)
    try {
      await api.cadastroPublico.enviar({
        nome: empresa.nome.trim(),
        documento: empresa.documento.trim() || undefined,
        ...cadastroParaEnviar(empresa, { comVazios: false }),
        admin: { nome: admin.nome.trim(), email: admin.email.trim(), senha: admin.senha },
        ...(site ? { site } : {}),
      })
      setEnviado(true)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível enviar o cadastro.'))
    } finally {
      setOcupado(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-sm">
          <Logo size="lg" />
          <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink-900">Cadastro recebido</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            O cadastro de <strong>{empresa.nome.trim()}</strong> está aguardando a aprovação do
            administrador. Assim que for aprovado, entre com o e-mail{' '}
            <strong className="break-all">{admin.email.trim()}</strong> e a senha que você criou.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
          >
            <ArrowLeft size={15} /> Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Logo size="lg" showTagline />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
          >
            <ArrowLeft size={15} /> Já tenho conta
          </Link>
        </div>

        <form
          onSubmit={enviar}
          noValidate
          className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h1 className="text-[24px] font-bold text-ink-900">Criar conta</h1>
          <p className="mt-1 text-sm text-ink-500">
            Digite o CPF ou CNPJ: com o CNPJ, os dados da empresa vêm da Receita. O acesso é
            liberado depois da aprovação do administrador.
          </p>

          <div className="mt-6">
            <CamposDaEmpresa
              form={empresa}
              onChange={setEmpresa}
              autoBuscar={!empresa.nome.trim()}
              publico
            />
          </div>

          <div className="mt-6 grid gap-4 border-t border-ink-200 pt-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-ink-900">Seu acesso</p>
              <p className="text-[13px] text-ink-500">
                Você será o administrador da conta e poderá cadastrar os demais usuários.
              </p>
            </div>
            <Input
              label="Seu nome"
              required
              autoComplete="name"
              value={admin.nome}
              onChange={(e) => doAdmin('nome')(e.target.value)}
            />
            <Input
              label="E-mail de acesso"
              type="email"
              required
              autoComplete="email"
              value={admin.email}
              onChange={(e) => doAdmin('email')(e.target.value)}
            />
            <div className="sm:col-span-2">
              <CamposSenha
                senha={admin.senha}
                confirmacao={admin.confirmacao}
                onSenha={doAdmin('senha')}
                onConfirmacao={doAdmin('confirmacao')}
              />
            </div>
          </div>

          {/* Fora da tela e fora do Tab: só robô preenche. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Site
              <input
                tabIndex={-1}
                autoComplete="off"
                value={site}
                onChange={(e) => setSite(e.target.value)}
              />
            </label>
          </div>

          {erro && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {erro}
            </div>
          )}

          <Button type="submit" size="lg" className="mt-6 w-full" loading={ocupado}>
            Enviar cadastro
          </Button>
        </form>
      </div>
    </div>
  )
}
