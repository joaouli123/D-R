import { useEffect, useState } from 'react'
import { BadgeCheck, Check, EyeOff, Pencil, Plus, Power, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, Input, Modal, PageLoader, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { CamposSenha } from '@/components/CamposSenha'
import {
  CamposDaEmpresa,
  cadastroParaEnviar,
  EMPRESA_EM_BRANCO,
  formDaLicenca,
  problemaNaEmpresa,
  type FormDaEmpresa,
} from '@/components/CamposDaEmpresa'
import * as api from '@/services/api'
import { mensagemDeErro } from '@/services/api'
import type { Licenca } from '@/types'
import { emailValido, formatarDocumento, problemaNaSenha, rotuloDoDocumento } from '@/lib/cadastro'
import { cn, formatDate } from '@/lib/utils'

// ============================================================
// Licenças — só o perito titular (administrador da equipe principal)
//
// Cada licença é uma empresa cliente com usuários, equipes, empresas, perícias
// e documentos próprios, isolados das demais. Aqui o titular abre a licença
// junto com o primeiro administrador dela, renomeia, suspende e — enquanto não
// houver trabalho dentro — exclui. Esta tela mostra QUANTO há em cada licença,
// nunca O QUE há.
// ============================================================

type Dialogo =
  | { tipo: 'criar' }
  | { tipo: 'editar'; licenca: Licenca }
  | { tipo: 'suspender'; licenca: Licenca }
  | { tipo: 'excluir'; licenca: Licenca }

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Empresas, perícias e documentos: o que impede a exclusão. */
const temTrabalho = (l: Licenca) => l.empresas + l.pericias + l.documentos > 0

export default function Licencas() {
  const toast = useToast()
  const [licencas, setLicencas] = useState<Licenca[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [reativando, setReativando] = useState<string | null>(null)

  async function atualizar() {
    try {
      setLicencas(await api.licencas.listar())
      setErro(null)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar as licenças.'))
    }
  }

  useEffect(() => {
    void atualizar()
  }, [])

  function fechar() {
    setDialogo(null)
  }

  async function concluir(mensagem: string) {
    setDialogo(null)
    toast(mensagem)
    await atualizar()
  }

  async function reativar(l: Licenca) {
    setReativando(l.id)
    try {
      await api.licencas.atualizar(l.id, { ativa: true })
      toast(
        l.aguardandoAprovacao
          ? `Cadastro de ${l.nome} aprovado. O administrador dela já pode entrar.`
          : `A licença ${l.nome} foi reativada e os usuários dela já podem entrar.`,
      )
      await atualizar()
    } catch (e) {
      toast(
        mensagemDeErro(
          e,
          l.aguardandoAprovacao
            ? 'Não foi possível aprovar o cadastro.'
            : 'Não foi possível reativar a licença.',
        ),
        'error',
      )
    } finally {
      setReativando(null)
    }
  }

  const ativas = licencas?.filter((l) => l.ativa).length ?? 0
  const aguardando = licencas?.filter((l) => l.aguardandoAprovacao).length ?? 0
  // Quem espera aprovação vem primeiro: é o que pede ação.
  const emOrdem = licencas && [
    ...licencas.filter((l) => l.aguardandoAprovacao),
    ...licencas.filter((l) => !l.aguardandoAprovacao),
  ]

  return (
    <>
      <PageHeader
        breadcrumb="Administração"
        title="Licenças"
        description="As empresas clientes da plataforma. Cada uma com os próprios usuários, equipes e trabalho."
        action={
          <Button icon={<Plus size={16} />} onClick={() => setDialogo({ tipo: 'criar' })}>
            Nova licença
          </Button>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50 px-4 py-3.5 text-[13px] leading-relaxed text-navy-800">
        <EyeOff size={18} className="mt-0.5 shrink-0 text-navy-600" />
        <p>
          <strong>Cada licença trabalha isolada.</strong> Empresas, perícias e documentos de uma
          licença não aparecem para nenhuma outra — nem para você. Aqui você vê só{' '}
          <strong>quanto</strong> há em cada uma. Os acessos dela (usuários e equipes) ficam com o
          administrador da licença, e você também os alcança em Usuários e equipes.
        </p>
      </div>

      {erro && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{erro}</span>
          <Button size="sm" variant="outline" onClick={() => void atualizar()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {licencas === null ? (
        !erro && <PageLoader />
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-500">
            {plural(licencas.length, 'licença', 'licenças')} · {plural(ativas, 'ativa', 'ativas')}
            {aguardando > 0 && (
              <strong className="text-amber-700">
                {' '}
                ·{' '}
                {plural(
                  aguardando,
                  'cadastro aguardando aprovação',
                  'cadastros aguardando aprovação',
                )}
              </strong>
            )}
          </p>

          {(emOrdem ?? []).map((l) => (
            <CartaoLicenca
              key={l.id}
              licenca={l}
              reativando={reativando === l.id}
              onEditar={() => setDialogo({ tipo: 'editar', licenca: l })}
              onSuspender={() => setDialogo({ tipo: 'suspender', licenca: l })}
              onReativar={() => void reativar(l)}
              onExcluir={() => setDialogo({ tipo: 'excluir', licenca: l })}
            />
          ))}
        </div>
      )}

      {dialogo?.tipo === 'criar' && <ModalCriar onFechar={fechar} onConcluido={concluir} />}
      {dialogo?.tipo === 'editar' && (
        <ModalEditar licenca={dialogo.licenca} onFechar={fechar} onConcluido={concluir} />
      )}
      {dialogo?.tipo === 'suspender' && (
        <ModalSuspender licenca={dialogo.licenca} onFechar={fechar} onConcluido={concluir} />
      )}
      {dialogo?.tipo === 'excluir' && (
        <ModalExcluir
          licenca={dialogo.licenca}
          onFechar={fechar}
          onConcluido={concluir}
          onSuspender={() => setDialogo({ tipo: 'suspender', licenca: dialogo.licenca })}
        />
      )}
    </>
  )
}

// ---------------- Cartão de uma licença ----------------

function CartaoLicenca({
  licenca: l,
  reativando,
  onEditar,
  onSuspender,
  onReativar,
  onExcluir,
}: {
  licenca: Licenca
  reativando: boolean
  onEditar: () => void
  onSuspender: () => void
  onReativar: () => void
  onExcluir: () => void
}) {
  const numeros: Array<[string, number]> = [
    ['Equipes', l.equipes],
    ['Usuários', l.usuarios],
    ['Empresas', l.empresas],
    ['Perícias', l.pericias],
    ['Documentos', l.documentos],
  ]
  const local = [l.cidade, l.uf].filter(Boolean).join('/')

  return (
    <Card
      className={cn(
        'overflow-hidden',
        l.aguardandoAprovacao
          ? 'border-l-4 border-l-amber-400'
          : !l.ativa && 'border-l-4 border-l-red-300',
      )}
      role="region"
      aria-label={`Licença ${l.nome}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <BadgeCheck
            size={18}
            className={cn('mt-0.5 shrink-0', l.ativa ? 'text-navy-700' : 'text-ink-400')}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn('font-bold', l.ativa ? 'text-ink-900' : 'text-ink-500')}>
                {l.nome}
              </h3>
              {l.principal && (
                <span title="A sua licença. Não pode ser suspensa nem excluída.">
                  <Badge tone="navy">Principal</Badge>
                </span>
              )}
              {l.aguardandoAprovacao ? (
                <Badge tone="amber">Aguardando aprovação</Badge>
              ) : (
                <Badge tone={l.ativa ? 'green' : 'red'}>{l.ativa ? 'Ativa' : 'Suspensa'}</Badge>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {l.documento
                ? `${rotuloDoDocumento(l.documento)} ${formatarDocumento(l.documento)} · `
                : ''}
              {local ? `${local} · ` : ''}
              {l.aguardandoAprovacao ? 'Cadastrou-se em' : 'Criada em'} {formatDate(l.criadoEm)}
            </p>
          </div>
        </div>

        {l.aguardandoAprovacao ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={<Check size={14} />} loading={reativando} onClick={onReativar}>
              Aprovar
            </Button>
            <Button size="sm" variant="outline" icon={<X size={14} />} onClick={onExcluir}>
              Recusar
            </Button>
            <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={onEditar}>
              Editar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" icon={<Pencil size={14} />} onClick={onEditar}>
              Editar
            </Button>
            {!l.principal &&
              (l.ativa ? (
                <Button size="sm" variant="ghost" icon={<Power size={14} />} onClick={onSuspender}>
                  Suspender
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Power size={14} />}
                  loading={reativando}
                  onClick={onReativar}
                >
                  Reativar
                </Button>
              ))}
            {!l.principal && (
              <button
                type="button"
                aria-label={`Excluir a licença ${l.nome}`}
                title={`Excluir a licença ${l.nome}`}
                onClick={onExcluir}
                className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_minmax(0,1fr)]">
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {numeros.map(([rotulo, n]) => (
            <div key={rotulo} className="rounded-lg bg-ink-50 px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-ink-500">{rotulo}</dt>
              <dd className="text-lg font-bold tabular-nums text-ink-900">{n}</dd>
            </div>
          ))}
        </dl>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Administradores
          </p>
          {l.administradores.length === 0 ? (
            <p className="mt-1 text-[13px] text-ink-500">Nenhum administrador cadastrado.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-[13px]">
              {l.administradores.map((a) => (
                <li key={a.id} className={cn('break-all', !a.ativo && 'text-ink-400')}>
                  <span className={cn('font-medium', a.ativo ? 'text-ink-800' : 'text-ink-500')}>
                    {a.nome}
                  </span>{' '}
                  · {a.email}
                  {!a.ativo && ' (inativo)'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}

/** Erro do servidor dentro do diálogo — o toast some rápido e fica atrás do modal. */
function AvisoDeErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null
  return (
    <p
      role="alert"
      className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
    >
      {mensagem}
    </p>
  )
}

// ---------------- Nova licença ----------------

function ModalCriar({
  onFechar,
  onConcluido,
}: {
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [empresa, setEmpresa] = useState<FormDaEmpresa>(EMPRESA_EM_BRANCO)
  const [admin, setAdmin] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmacao: '',
  })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const doAdmin = (chave: keyof typeof admin) => (valor: string) =>
    setAdmin((atual) => ({ ...atual, [chave]: valor }))

  async function criar() {
    const problema =
      problemaNaEmpresa(empresa) ??
      (!admin.nome.trim() || !admin.email.trim()
        ? 'Informe o nome e o e-mail do administrador da licença.'
        : !emailValido(admin.email)
          ? 'E-mail do administrador inválido.'
          : problemaNaSenha(admin.senha, admin.confirmacao))
    if (problema) {
      setErro(problema)
      return
    }

    setOcupado(true)
    setErro(null)
    try {
      await api.licencas.criar({
        nome: empresa.nome.trim(),
        documento: empresa.documento.trim() || undefined,
        ...cadastroParaEnviar(empresa, { comVazios: false }),
        admin: {
          nome: admin.nome.trim(),
          email: admin.email.trim(),
          senha: admin.senha,
        },
      })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível criar a licença.'))
      setOcupado(false)
      return
    }
    await onConcluido(
      `Licença ${empresa.nome.trim()} criada. Repasse o e-mail e a senha a ${admin.nome.trim()}.`,
    )
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="lg"
      title="Nova licença"
      subtitle="Uma empresa cliente, com acesso e trabalho isolados das demais."
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={() => void criar()}>
            Criar licença
          </Button>
        </>
      }
    >
      <CamposDaEmpresa form={empresa} onChange={setEmpresa} autoBuscar={!empresa.nome.trim()} />

      <div className="mt-4 grid gap-4 border-t border-ink-200 pt-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-ink-900">Primeiro administrador</p>
          <p className="text-[13px] text-ink-500">
            Entra com este e-mail e cadastra os demais usuários e equipes da licença.
          </p>
        </div>
        <Input
          label="Nome"
          required
          value={admin.nome}
          onChange={(e) => doAdmin('nome')(e.target.value)}
        />
        <Input
          label="E-mail de acesso"
          type="email"
          required
          autoComplete="off"
          value={admin.email}
          onChange={(e) => doAdmin('email')(e.target.value)}
        />
        <div className="sm:col-span-2">
          <CamposSenha
            rotulo="Senha inicial"
            senha={admin.senha}
            confirmacao={admin.confirmacao}
            onSenha={doAdmin('senha')}
            onConfirmacao={doAdmin('confirmacao')}
            hint="A pessoa pode trocar depois em Configurações › Meu perfil."
          />
        </div>
      </div>
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}

// ---------------- Editar ----------------

function ModalEditar({
  licenca,
  onFechar,
  onConcluido,
}: {
  licenca: Licenca
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [empresa, setEmpresa] = useState<FormDaEmpresa>(() => formDaLicenca(licenca))
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    const problema = problemaNaEmpresa(empresa, licenca.documento)
    if (problema) {
      setErro(problema)
      return
    }
    setOcupado(true)
    setErro(null)
    try {
      await api.licencas.atualizar(licenca.id, {
        nome: empresa.nome.trim(),
        documento: empresa.documento.trim(),
        ...cadastroParaEnviar(empresa, { comVazios: true }),
      })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar a licença.'))
      setOcupado(false)
      return
    }
    await onConcluido('Licença atualizada.')
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="lg"
      title="Editar licença"
      subtitle={licenca.nome}
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={() => void salvar()}>
            Salvar
          </Button>
        </>
      }
    >
      <CamposDaEmpresa
        form={empresa}
        onChange={setEmpresa}
        autoBuscar={!empresa.nome.trim()}
        hintDoNome="A equipe de entrada acompanha o nome novo, se ainda tiver o antigo."
      />
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}

// ---------------- Suspender ----------------

function ModalSuspender({
  licenca,
  onFechar,
  onConcluido,
}: {
  licenca: Licenca
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function suspender() {
    setOcupado(true)
    setErro(null)
    try {
      await api.licencas.atualizar(licenca.id, { ativa: false })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível suspender a licença.'))
      setOcupado(false)
      return
    }
    await onConcluido(`A licença ${licenca.nome} foi suspensa e vale agora.`)
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="sm"
      title="Suspender licença"
      subtitle={licenca.nome}
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button variant="danger" loading={ocupado} onClick={() => void suspender()}>
            Suspender
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-[13.5px] leading-relaxed text-ink-700">
        <p>
          {licenca.usuarios === 0
            ? 'Ninguém desta licença consegue entrar enquanto ela estiver suspensa.'
            : `${plural(licenca.usuarios, 'usuário perde', 'usuários perdem')} o acesso na hora — quem estiver dentro é desconectado.`}
        </p>
        <p className="text-ink-500">Nada é apagado. Dá para reativar quando quiser.</p>
      </div>
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}

// ---------------- Excluir ----------------

function ModalExcluir({
  licenca,
  onFechar,
  onConcluido,
  onSuspender,
}: {
  licenca: Licenca
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
  onSuspender: () => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const bloqueada = temTrabalho(licenca)
  const recusa = !!licenca.aguardandoAprovacao

  async function excluir() {
    setOcupado(true)
    setErro(null)
    try {
      await api.licencas.excluir(licenca.id)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível excluir a licença.'))
      setOcupado(false)
      return
    }
    await onConcluido(
      recusa
        ? `Cadastro de ${licenca.nome} recusado e apagado.`
        : `Licença ${licenca.nome} excluída.`,
    )
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="sm"
      title={recusa ? 'Recusar cadastro' : 'Excluir licença'}
      subtitle={licenca.nome}
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          {licenca.ativa && (
            <Button variant="outline" disabled={ocupado} onClick={onSuspender}>
              Suspender em vez de excluir
            </Button>
          )}
          {!bloqueada && (
            <Button variant="danger" loading={ocupado} onClick={() => void excluir()}>
              {recusa ? 'Recusar e apagar' : 'Excluir licença'}
            </Button>
          )}
        </>
      }
    >
      {bloqueada ? (
        <p className="text-[13.5px] leading-relaxed text-ink-700">
          A licença tem {plural(licenca.empresas, 'empresa', 'empresas')},{' '}
          {plural(licenca.pericias, 'perícia', 'perícias')} e{' '}
          {plural(licenca.documentos, 'documento', 'documentos')} e não pode ser excluída — o
          trabalho de um cliente não some por um clique. Para tirar o acesso sem perder nada,
          suspenda a licença.
        </p>
      ) : (
        <div className="space-y-3 text-[13.5px] leading-relaxed text-ink-700">
          <p>
            A licença não tem trabalho cadastrado. Ela será apagada de vez junto com{' '}
            <strong>
              {plural(licenca.equipes, 'equipe', 'equipes')} e{' '}
              {plural(licenca.usuarios, 'usuário', 'usuários')}
            </strong>
            .
          </p>
          <p className="text-ink-500">Se só quer tirar o acesso, prefira suspender.</p>
        </div>
      )}
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}
