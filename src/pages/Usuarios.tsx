import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  KeyRound,
  Pencil,
  Power,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Badge, Button, Card, Input, Modal, PageLoader, Select, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import * as api from '@/services/api'
import { ErroApi, mensagemDeErro } from '@/services/api'
import type { UsuarioParaSalvar } from '@/services/api'
import type { Equipe, PerfilUsuario, Usuario } from '@/types'
import { PERFIL, iniciaisDe } from '@/lib/perfis'
import { cn, formatDateTime } from '@/lib/utils'

// ============================================================
// Usuários e equipes — só o administrador
//
// Cada equipe (empresa, laboratório parceiro) trabalha isolada: empresas,
// perícias e documentos ficam com quem os criou. O administrador gere os
// ACESSOS da própria equipe e das que estão abaixo dela na hierarquia — cria,
// edita, troca a senha, desativa e exclui —, mas não lê o trabalho delas.
// ============================================================

/** O que está aberto na tela; `null` = nenhum diálogo. */
type Dialogo =
  | { tipo: 'usuario'; equipe: Equipe; editando?: Usuario }
  | { tipo: 'senha'; alvo: Usuario }
  | { tipo: 'excluir-usuario'; equipe: Equipe; alvo: Usuario }
  | { tipo: 'equipe'; editando?: Equipe; paiInicial?: string }
  | { tipo: 'excluir-equipe'; equipe: Equipe }

/** Corpo do POST /usuarios para um cadastro que já existe, com o que mudou por cima. */
function paraSalvar(u: Usuario, mudancas: Partial<UsuarioParaSalvar> = {}): UsuarioParaSalvar {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    titulo: u.titulo,
    registroProfissional: u.registroProfissional,
    telefone: u.telefone,
    ativo: u.ativo,
    organizacaoId: u.organizacaoId,
    ...mudancas,
  }
}

export default function Usuarios() {
  const { usuario, recarregarUsuarios } = useApp()
  const toast = useToast()
  const [arvore, setArvore] = useState<Equipe[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [alternando, setAlternando] = useState<string | null>(null)

  /**
   * Relê a árvore e a lista que o resto do app usa (o responsável da perícia,
   * por exemplo, sai da lista de usuários da própria equipe).
   */
  async function atualizar() {
    try {
      const [nova] = await Promise.all([api.equipes.listar(), recarregarUsuarios()])
      setArvore(nova)
      setErro(null)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar as equipes.'))
    }
  }

  // Só na abertura: `recarregarUsuarios` muda de identidade a cada mudança do
  // store e, como dependência, faria esta tela recarregar sem parar.
  useEffect(() => {
    void atualizar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fechar() {
    setDialogo(null)
  }

  async function concluir(mensagem: string) {
    setDialogo(null)
    toast(mensagem)
    await atualizar()
  }

  async function alternarAtivo(u: Usuario) {
    setAlternando(u.id)
    try {
      await api.usuarios.salvar(paraSalvar(u, { ativo: !u.ativo }))
      toast(
        u.ativo
          ? `O acesso de ${u.nome} foi desativado e vale agora.`
          : `O acesso de ${u.nome} foi reativado e já pode entrar.`,
      )
      await atualizar()
    } catch (e) {
      toast(mensagemDeErro(e, 'Não foi possível alterar o acesso.'), 'error')
    } finally {
      setAlternando(null)
    }
  }

  const propria = arvore?.find((e) => e.propria)
  const totalUsuarios = arvore?.reduce((soma, e) => soma + e.usuarios.length, 0) ?? 0

  return (
    <>
      <PageHeader
        breadcrumb="Administração"
        title="Usuários e equipes"
        description="Crie e gerencie os acessos da sua equipe e das equipes abaixo dela."
        action={
          <Button
            variant="outline"
            icon={<Building2 size={16} />}
            disabled={!propria}
            onClick={() => setDialogo({ tipo: 'equipe', paiInicial: propria?.id })}
          >
            Nova equipe
          </Button>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50 px-4 py-3.5 text-[13px] leading-relaxed text-navy-800">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-navy-600" />
        <p>
          <strong>Cada equipe trabalha isolada.</strong> Empresas, perícias e documentos ficam só
          com a equipe que os criou — nem a equipe acima enxerga. Aqui você gere apenas os{' '}
          <strong>acessos</strong>: cria, edita, troca a senha, desativa e exclui usuários da sua
          equipe e das equipes abaixo dela.
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

      {arvore === null ? (
        !erro && <PageLoader />
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-500">
            {arvore.length} {arvore.length === 1 ? 'equipe' : 'equipes'} · {totalUsuarios}{' '}
            {totalUsuarios === 1 ? 'usuário' : 'usuários'}
          </p>

          {arvore.map((equipe) => (
            <CartaoEquipe
              key={equipe.id}
              equipe={equipe}
              meuId={usuario?.id}
              alternando={alternando}
              onNovoUsuario={() => setDialogo({ tipo: 'usuario', equipe })}
              onEditarUsuario={(u) => setDialogo({ tipo: 'usuario', equipe, editando: u })}
              onSenha={(u) => setDialogo({ tipo: 'senha', alvo: u })}
              onAlternar={(u) => void alternarAtivo(u)}
              onExcluirUsuario={(u) => setDialogo({ tipo: 'excluir-usuario', equipe, alvo: u })}
              onNovaEquipe={() => setDialogo({ tipo: 'equipe', paiInicial: equipe.id })}
              onRenomear={() => setDialogo({ tipo: 'equipe', editando: equipe })}
              onExcluirEquipe={() => setDialogo({ tipo: 'excluir-equipe', equipe })}
            />
          ))}
        </div>
      )}

      {dialogo?.tipo === 'usuario' && (
        <ModalUsuario
          equipe={dialogo.equipe}
          editando={dialogo.editando}
          ehEuMesmo={dialogo.editando?.id === usuario?.id}
          onFechar={fechar}
          onConcluido={concluir}
        />
      )}
      {dialogo?.tipo === 'senha' && (
        <ModalSenha alvo={dialogo.alvo} onFechar={fechar} onConcluido={concluir} />
      )}
      {dialogo?.tipo === 'excluir-usuario' && (
        <ModalExcluirUsuario
          equipe={dialogo.equipe}
          alvo={dialogo.alvo}
          onFechar={fechar}
          onConcluido={concluir}
        />
      )}
      {dialogo?.tipo === 'equipe' && arvore && (
        <ModalEquipe
          arvore={arvore}
          editando={dialogo.editando}
          paiInicial={dialogo.paiInicial}
          onFechar={fechar}
          onConcluido={concluir}
        />
      )}
      {dialogo?.tipo === 'excluir-equipe' && (
        <ModalExcluirEquipe equipe={dialogo.equipe} onFechar={fechar} onConcluido={concluir} />
      )}
    </>
  )
}

// ---------------- Cartão de uma equipe ----------------

function CartaoEquipe({
  equipe,
  meuId,
  alternando,
  onNovoUsuario,
  onEditarUsuario,
  onSenha,
  onAlternar,
  onExcluirUsuario,
  onNovaEquipe,
  onRenomear,
  onExcluirEquipe,
}: {
  equipe: Equipe
  meuId?: string
  alternando: string | null
  onNovoUsuario: () => void
  onEditarUsuario: (u: Usuario) => void
  onSenha: (u: Usuario) => void
  onAlternar: (u: Usuario) => void
  onExcluirUsuario: (u: Usuario) => void
  onNovaEquipe: () => void
  onRenomear: () => void
  onExcluirEquipe: () => void
}) {
  const ativos = equipe.usuarios.filter((u) => u.ativo).length

  return (
    <Card
      className={cn('overflow-hidden', equipe.nivel > 0 && 'border-l-4 border-l-navy-300')}
      // O recuo acompanha a profundidade, mas para no terceiro nível para a
      // tabela não ficar espremida em tela estreita.
      style={{ marginLeft: Math.min(equipe.nivel, 3) * 16 }}
      role="region"
      aria-label={`Equipe ${equipe.nome}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <Building2 size={18} className="mt-0.5 shrink-0 text-navy-700" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-ink-900">{equipe.nome}</h3>
              {equipe.propria && <Badge tone="green">Sua equipe</Badge>}
              {equipe.principal && (
                <span title="Única equipe que altera as bases compartilhadas (CAEPI e quesitos globais).">
                  <Badge tone="navy">Equipe principal</Badge>
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {equipe.usuarios.length} {equipe.usuarios.length === 1 ? 'usuário' : 'usuários'}
              {equipe.usuarios.length > 0 && ` · ${ativos} ${ativos === 1 ? 'ativo' : 'ativos'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={<UserPlus size={14} />} onClick={onNovoUsuario}>
            Novo usuário
          </Button>
          <Button size="sm" variant="outline" icon={<Building2 size={14} />} onClick={onNovaEquipe}>
            Criar equipe abaixo
          </Button>
          <AcaoIcone rotulo={`Renomear a equipe ${equipe.nome}`} onClick={onRenomear}>
            <Pencil size={15} />
          </AcaoIcone>
          {equipe.podeExcluir && (
            <AcaoIcone rotulo={`Excluir a equipe ${equipe.nome}`} perigo onClick={onExcluirEquipe}>
              <Trash2 size={15} />
            </AcaoIcone>
          )}
        </div>
      </div>

      {equipe.usuarios.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-500">
          Nenhum usuário nesta equipe ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          {/* Perfil e status caem para baixo do e-mail em tela estreita e "Último
              acesso" só cabe de `xl` para cima; as ações nunca saem da tela. */}
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left text-[11px] uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold sm:px-5">Usuário</th>
                <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Perfil</th>
                <th className="hidden px-3 py-2.5 font-semibold xl:table-cell">Último acesso</th>
                <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Status</th>
                <th className="w-px whitespace-nowrap px-3 py-2.5 text-right font-semibold sm:px-5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {equipe.usuarios.map((u) => {
                const euMesmo = u.id === meuId
                return (
                  <tr key={u.id} className={cn('hover:bg-ink-50/70', !u.ativo && 'text-ink-400')}>
                    <td className="px-3 py-3 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                            u.ativo ? 'bg-brand-700' : 'bg-ink-300',
                          )}
                        >
                          {iniciaisDe(u.nome)}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'font-medium leading-tight',
                              u.ativo ? 'text-ink-900' : 'text-ink-500',
                            )}
                          >
                            {u.nome}
                            {euMesmo && <span className="ml-1.5 text-xs text-ink-400">(você)</span>}
                          </p>
                          <p className="break-all text-xs text-ink-500">{u.email}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1 md:hidden">
                            <Badge tone={PERFIL[u.perfil].tone}>{PERFIL[u.perfil].label}</Badge>
                            <Badge tone={u.ativo ? 'green' : 'gray'}>
                              {u.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <Badge tone={PERFIL[u.perfil].tone}>{PERFIL[u.perfil].label}</Badge>
                    </td>
                    <td className="hidden px-3 py-3 text-[12.5px] text-ink-500 xl:table-cell">
                      {formatDateTime(u.ultimoAcesso)}
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <Badge tone={u.ativo ? 'green' : 'gray'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="w-px whitespace-nowrap px-3 py-3 sm:px-5">
                      <div className="flex items-center justify-end gap-0.5">
                        <AcaoIcone rotulo={`Editar ${u.nome}`} onClick={() => onEditarUsuario(u)}>
                          <Pencil size={15} />
                        </AcaoIcone>
                        <AcaoIcone
                          rotulo={`Trocar a senha de ${u.nome}`}
                          onClick={() => onSenha(u)}
                        >
                          <KeyRound size={15} />
                        </AcaoIcone>
                        <AcaoIcone
                          rotulo={u.ativo ? `Desativar ${u.nome}` : `Reativar ${u.nome}`}
                          dica={
                            euMesmo
                              ? 'Você não pode desativar o próprio acesso.'
                              : u.ativo
                                ? `Desativar ${u.nome}`
                                : `Reativar ${u.nome}`
                          }
                          disabled={euMesmo || alternando === u.id}
                          onClick={() => onAlternar(u)}
                        >
                          <Power size={15} />
                        </AcaoIcone>
                        <AcaoIcone
                          rotulo={`Excluir ${u.nome}`}
                          dica={euMesmo ? 'Você não pode excluir o próprio usuário.' : undefined}
                          perigo
                          disabled={euMesmo}
                          onClick={() => onExcluirUsuario(u)}
                        >
                          <Trash2 size={15} />
                        </AcaoIcone>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/** Botão de ícone. O `rotulo` é o nome para leitor de tela; `dica` é o balão (por padrão, o mesmo). */
function AcaoIcone({
  rotulo,
  dica,
  perigo,
  disabled,
  onClick,
  children,
}: {
  rotulo: string
  dica?: string
  perigo?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={dica ?? rotulo}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        perigo
          ? 'text-red-600 hover:bg-red-50'
          : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800',
      )}
    >
      {children}
    </button>
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

// ---------------- Criar / editar usuário ----------------

function ModalUsuario({
  equipe,
  editando,
  ehEuMesmo,
  onFechar,
  onConcluido,
}: {
  equipe: Equipe
  editando?: Usuario
  ehEuMesmo: boolean
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [form, setForm] = useState({
    nome: editando?.nome ?? '',
    email: editando?.email ?? '',
    // Quem nasce sem escolha é assistente: o perfil de menos poder.
    perfil: (editando?.perfil ?? 'assistente') as PerfilUsuario,
    senha: '',
    titulo: editando?.titulo ?? '',
    registroProfissional: editando?.registroProfissional ?? '',
    telefone: editando?.telefone ?? '',
  })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const campo =
    <K extends keyof typeof form>(chave: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((atual) => ({ ...atual, [chave]: e.target.value }))

  async function salvar() {
    if (!form.nome.trim() || !form.email.trim()) {
      setErro('Nome e e-mail são obrigatórios.')
      return
    }
    if (!editando && form.senha.length < 8) {
      setErro('Defina uma senha inicial com pelo menos 8 caracteres.')
      return
    }

    setOcupado(true)
    setErro(null)
    try {
      await api.usuarios.salvar({
        ...(editando ? { id: editando.id } : { senha: form.senha }),
        nome: form.nome.trim(),
        email: form.email.trim(),
        perfil: form.perfil,
        titulo: form.titulo.trim() || undefined,
        registroProfissional: form.registroProfissional.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        ativo: editando?.ativo ?? true,
        // Na criação define a equipe do usuário; na edição o servidor só
        // aceita a que ele já tem.
        organizacaoId: editando?.organizacaoId ?? equipe.id,
      })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o usuário.'))
      setOcupado(false)
      return
    }
    await onConcluido(
      editando ? 'Cadastro atualizado.' : `O cadastro de ${form.nome.trim()} foi criado.`,
    )
  }

  return (
    <Modal
      open
      onClose={onFechar}
      title={editando ? 'Editar usuário' : 'Novo usuário'}
      subtitle={
        editando
          ? `Equipe ${equipe.nome}. O usuário não muda de equipe depois de criado.`
          : `Será criado na equipe ${equipe.nome} e só enxerga o trabalho dela.`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={() => void salvar()}>
            {editando ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Nome" required value={form.nome} onChange={campo('nome')} />
        </div>
        <Input
          label="E-mail"
          type="email"
          required
          autoComplete="off"
          value={form.email}
          onChange={campo('email')}
        />
        <Select
          label="Perfil"
          value={form.perfil}
          disabled={ehEuMesmo}
          onChange={campo('perfil')}
          hint={
            ehEuMesmo
              ? 'Você não pode alterar o próprio perfil. Peça a outro administrador.'
              : PERFIL[form.perfil].descricao
          }
        >
          {(Object.keys(PERFIL) as PerfilUsuario[]).map((p) => (
            <option key={p} value={p}>
              {PERFIL[p].label}
            </option>
          ))}
        </Select>
        {!editando && (
          <div className="sm:col-span-2">
            <Input
              label="Senha inicial"
              type="password"
              required
              autoComplete="new-password"
              value={form.senha}
              onChange={campo('senha')}
              hint="Mínimo 8 caracteres. Repasse à pessoa por um canal seguro — ela pode trocar depois em Configurações › Meu perfil."
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <Input
            label="Títulos / qualificações profissionais"
            value={form.titulo}
            onChange={campo('titulo')}
          />
        </div>
        <Input
          label="Registro profissional (CREA / CONFEA / MTE)"
          value={form.registroProfissional}
          onChange={campo('registroProfissional')}
        />
        <Input label="Telefone" value={form.telefone} onChange={campo('telefone')} />
      </div>
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}

// ---------------- Trocar a senha de outra pessoa ----------------

function ModalSenha({
  alvo,
  onFechar,
  onConcluido,
}: {
  alvo: Usuario
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function trocar() {
    if (nova.length < 8) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (nova !== confirmacao) {
      setErro('A confirmação não confere com a nova senha.')
      return
    }

    setOcupado(true)
    setErro(null)
    try {
      await api.usuarios.redefinirSenha(alvo.id, nova)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível trocar a senha.'))
      setOcupado(false)
      return
    }
    await onConcluido(`Senha de ${alvo.nome} alterada.`)
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="sm"
      title="Trocar senha"
      subtitle={`${alvo.nome} · ${alvo.email}`}
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={() => void trocar()}>
            Trocar senha
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nova senha"
          type="password"
          required
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          hint="Mínimo 8 caracteres."
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          required
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        <p className="text-xs text-ink-500">
          A senha antiga deixa de valer na hora. Repasse a nova por um canal seguro e peça que a
          pessoa a troque em Configurações › Meu perfil.
        </p>
      </div>
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}

// ---------------- Excluir usuário ----------------

/**
 * Excluir é definitivo, e quem responde por perícias ou documentos não sai sem
 * deixar o trabalho com alguém — a assinatura dos documentos é de quem responde. O servidor
 * é quem sabe se há trabalho: a tela tenta excluir e, se a resposta for 409,
 * passa a perguntar quem assume. Para só tirar o acesso, o caminho é desativar.
 */
function ModalExcluirUsuario({
  equipe,
  alvo,
  onFechar,
  onConcluido,
}: {
  equipe: Equipe
  alvo: Usuario
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [etapa, setEtapa] = useState<'confirmar' | 'repassar'>('confirmar')
  const [aviso409, setAviso409] = useState('')
  const [herdeiro, setHerdeiro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Só quem está ativo, é da mesma equipe e não é o próprio alvo pode herdar.
  const candidatos = equipe.usuarios.filter((u) => u.ativo && u.id !== alvo.id)
  const repassando = etapa === 'repassar'

  async function excluir() {
    setOcupado(true)
    setErro(null)
    try {
      await api.usuarios.excluir(alvo.id, repassando ? herdeiro : undefined)
    } catch (e) {
      if (!repassando && e instanceof ErroApi && e.status === 409) {
        setAviso409(e.message)
        setEtapa('repassar')
      } else {
        setErro(mensagemDeErro(e, 'Não foi possível excluir o usuário.'))
      }
      setOcupado(false)
      return
    }
    await onConcluido(`O cadastro de ${alvo.nome} foi excluído.`)
  }

  async function desativar() {
    setOcupado(true)
    setErro(null)
    try {
      await api.usuarios.salvar(paraSalvar(alvo, { ativo: false }))
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível desativar o usuário.'))
      setOcupado(false)
      return
    }
    await onConcluido(`O acesso de ${alvo.nome} foi desativado e vale agora.`)
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="sm"
      title="Excluir usuário"
      subtitle={`${alvo.nome} · ${alvo.email}`}
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          {alvo.ativo && (
            <Button variant="outline" disabled={ocupado} onClick={() => void desativar()}>
              Desativar em vez de excluir
            </Button>
          )}
          {(!repassando || candidatos.length > 0) && (
            <Button
              variant="danger"
              loading={ocupado}
              disabled={repassando && !herdeiro}
              onClick={() => void excluir()}
            >
              {repassando ? 'Excluir e repassar' : 'Excluir'}
            </Button>
          )}
        </>
      }
    >
      {repassando ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{aviso409}</p>
          </div>
          {candidatos.length > 0 ? (
            <Select
              label="Quem assume esse trabalho"
              required
              value={herdeiro}
              onChange={(e) => setHerdeiro(e.target.value)}
              hint="As perícias e os documentos passam para a pessoa escolhida — a assinatura deles também."
            >
              <option value="">Escolha…</option>
              {candidatos.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({PERFIL[u.perfil].label})
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-[13px] text-ink-600">
              Não há outro usuário ativo nesta equipe para assumir o trabalho. Cadastre alguém antes
              ou, se só quer tirar o acesso, desative este usuário.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-[13.5px] leading-relaxed text-ink-700">
          <p>
            <strong>{alvo.nome}</strong> perde o acesso e o cadastro é apagado de vez, junto com os
            textos e quesitos pessoais desse cadastro.
          </p>
          <p className="text-ink-500">
            Se só quer que a pessoa pare de entrar, prefira desativar: dá para reativar depois.
          </p>
        </div>
      )}
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}

// ---------------- Criar / renomear equipe ----------------

function ModalEquipe({
  arvore,
  editando,
  paiInicial,
  onFechar,
  onConcluido,
}: {
  arvore: Equipe[]
  editando?: Equipe
  paiInicial?: string
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [nome, setNome] = useState(editando?.nome ?? '')
  const [paiId, setPaiId] = useState(paiInicial ?? arvore[0]?.id ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (nome.trim().length < 2) {
      setErro('Informe o nome da equipe.')
      return
    }

    setOcupado(true)
    setErro(null)
    try {
      if (editando) await api.equipes.renomear(editando.id, nome.trim())
      else await api.equipes.criar(nome.trim(), paiId || undefined)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar a equipe.'))
      setOcupado(false)
      return
    }
    await onConcluido(editando ? 'Equipe renomeada.' : `Equipe ${nome.trim()} criada.`)
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="sm"
      title={editando ? 'Renomear equipe' : 'Nova equipe'}
      subtitle={
        editando
          ? undefined
          : 'Uma empresa ou laboratório com acesso próprio, isolado das demais equipes.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={() => void salvar()}>
            {editando ? 'Salvar' : 'Criar equipe'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome da equipe ou empresa"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        {!editando && (
          <Select
            label="Fica abaixo de"
            value={paiId}
            onChange={(e) => setPaiId(e.target.value)}
            hint="Quem está acima gere os acessos da nova equipe, mas não lê o trabalho dela."
          >
            {arvore.map((e) => (
              <option key={e.id} value={e.id}>
                {`${'— '.repeat(e.nivel)}${e.nome}`}
              </option>
            ))}
          </Select>
        )}
      </div>
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}

// ---------------- Excluir equipe ----------------

function ModalExcluirEquipe({
  equipe,
  onFechar,
  onConcluido,
}: {
  equipe: Equipe
  onFechar: () => void
  onConcluido: (mensagem: string) => Promise<void>
}) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function excluir() {
    setOcupado(true)
    setErro(null)
    try {
      await api.equipes.excluir(equipe.id)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível excluir a equipe.'))
      setOcupado(false)
      return
    }
    await onConcluido(`Equipe ${equipe.nome} excluída.`)
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="sm"
      title="Excluir equipe"
      subtitle={equipe.nome}
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button variant="danger" loading={ocupado} onClick={() => void excluir()}>
            Excluir equipe
          </Button>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-ink-700">
        A equipe está vazia — sem usuários, sem trabalho e sem equipes abaixo — e será apagada de
        vez.
      </p>
      <AvisoDeErro mensagem={erro} />
    </Modal>
  )
}
