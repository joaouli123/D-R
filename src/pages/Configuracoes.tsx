import { useState } from 'react'
import { KeyRound, Mail, Plus, Server, ShieldCheck, User, UserCog } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Modal,
  Select,
  Tabs,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { Logo, SeloCredenciado } from '@/components/Logo'
import { useApp } from '@/store/AppStore'
import * as api from '@/services/api'
import { API_MODE } from '@/services/api'
import type { PerfilUsuario, Usuario } from '@/types'
import { formatDateTime, uid } from '@/lib/utils'

// ============================================================
// MÓDULO A — Gestão de Usuários + preferências do sistema
// ============================================================

const PERFIL: Record<PerfilUsuario, { label: string; tone: 'green' | 'navy' | 'gray' }> = {
  admin: { label: 'Administrador', tone: 'green' },
  perito: { label: 'Perito', tone: 'navy' },
  assistente: { label: 'Assistente', tone: 'gray' },
}

export default function Configuracoes() {
  const { usuario, usuarios, salvarUsuario } = useApp()
  const toast = useToast()
  const [aba, setAba] = useState<'perfil' | 'usuarios' | 'documento' | 'sistema'>('perfil')
  const [novo, setNovo] = useState<(Usuario & { senha?: string }) | null>(null)
  const [perfilLocal, setPerfilLocal] = useState<Usuario>(usuario!)
  const [salvando, setSalvando] = useState(false)
  const [senhaAberta, setSenhaAberta] = useState(false)

  const ehAdmin = usuario?.perfil === 'admin'

  async function salvarPerfil() {
    setSalvando(true)
    try {
      await salvarUsuario(perfilLocal)
      toast('Perfil atualizado.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar o perfil.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function cadastrarUsuario() {
    if (!novo?.nome.trim() || !novo.email.trim()) {
      toast('Nome e e-mail são obrigatórios.', 'error')
      return
    }
    if (!novo.senha || novo.senha.length < 8) {
      toast('Defina uma senha inicial com pelo menos 8 caracteres.', 'error')
      return
    }

    setSalvando(true)
    try {
      await salvarUsuario(novo)
      toast('Usuário cadastrado.')
      setNovo(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível cadastrar o usuário.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(u: Usuario) {
    try {
      await salvarUsuario({ ...u, ativo: !u.ativo })
      toast(u.ativo ? 'Usuário desativado.' : 'Usuário ativado.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível alterar o status.', 'error')
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb="Módulo A"
        title="Configurações"
        description="Dados do responsável técnico, usuários autorizados e preferências dos documentos."
      />

      <Card className="mb-4 overflow-hidden">
        <Tabs
          value={aba}
          onChange={setAba}
          tabs={[
            { value: 'perfil', label: 'Meu perfil' },
            { value: 'usuarios', label: 'Usuários', count: usuarios.length },
            { value: 'documento', label: 'Documentos' },
            { value: 'sistema', label: 'Sistema' },
          ]}
        />
      </Card>

      {/* ---------- Perfil ---------- */}
      {aba === 'perfil' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader
              title="Responsável técnico"
              subtitle="Esses dados assinam automaticamente todos os documentos gerados."
              icon={<User size={18} />}
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Input
                label="Nome completo"
                className="sm:col-span-2"
                value={perfilLocal.nome}
                onChange={(e) => setPerfilLocal({ ...perfilLocal, nome: e.target.value })}
              />
              <Input
                label="Titulação"
                value={perfilLocal.titulo ?? ''}
                onChange={(e) => setPerfilLocal({ ...perfilLocal, titulo: e.target.value })}
                placeholder="Engenheiro de Segurança do Trabalho"
              />
              <Input
                label="Registro profissional"
                value={perfilLocal.registroProfissional ?? ''}
                onChange={(e) => setPerfilLocal({ ...perfilLocal, registroProfissional: e.target.value })}
                placeholder="CREA-SP 0000000000"
              />
              <Input
                label="E-mail"
                type="email"
                value={perfilLocal.email}
                onChange={(e) => setPerfilLocal({ ...perfilLocal, email: e.target.value })}
              />
              <Input
                label="Telefone"
                value={perfilLocal.telefone ?? ''}
                onChange={(e) => setPerfilLocal({ ...perfilLocal, telefone: e.target.value })}
              />
              <div className="sm:col-span-2 flex justify-between gap-2 border-t border-ink-100 pt-4">
                <Button variant="outline" icon={<KeyRound size={15} />} onClick={() => setSenhaAberta(true)}>
                  Trocar minha senha
                </Button>
                <Button loading={salvando} onClick={() => void salvarPerfil()}>
                  Salvar alterações
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-6 text-center">
              <Logo size="lg" showTagline />
            </Card>
            <SeloCredenciado className="flex-1" />
          </div>
        </div>
      )}

      {/* ---------- Usuários ---------- */}
      {aba === 'usuarios' && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Usuários autorizados"
            subtitle="Somente usuários ativos conseguem acessar o sistema."
            icon={<UserCog size={18} />}
            action={
              <Button
                size="sm"
                icon={<Plus size={14} />}
                disabled={!ehAdmin}
                title={ehAdmin ? undefined : 'Somente o administrador cadastra usuários.'}
                onClick={() =>
                  setNovo({
                    id: uid('usr'),
                    nome: '',
                    email: '',
                    perfil: 'assistente',
                    ativo: true,
                    senha: '',
                  })
                }
              >
                Novo usuário
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-[11px] uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Usuário</th>
                  <th className="px-3 py-2.5 font-semibold">Perfil</th>
                  <th className="px-3 py-2.5 font-semibold">Registro</th>
                  <th className="px-3 py-2.5 font-semibold">Último acesso</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                          {u.nome.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </span>
                        <div>
                          <p className="font-medium leading-tight text-ink-900">{u.nome}</p>
                          <p className="text-xs text-ink-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={PERFIL[u.perfil].tone}>{PERFIL[u.perfil].label}</Badge>
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-ink-600">
                      {u.registroProfissional ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-ink-500">
                      {formatDateTime(u.ultimoAcesso)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => void alternarAtivo(u)}
                        disabled={!ehAdmin || u.id === usuario?.id}
                        title={
                          u.id === usuario?.id
                            ? 'Você não pode desativar o próprio acesso.'
                            : !ehAdmin
                              ? 'Somente o administrador altera o status.'
                              : undefined
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          u.ativo ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---------- Documentos ---------- */}
      {aba === 'documento' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Preferências de documento" subtitle="Módulo G" />
            <div className="space-y-4 p-5">
              <Select label="Título padrão" defaultValue="parecer">
                <option value="parecer">Parecer Técnico Pericial</option>
                <option value="laudo">Laudo Técnico Pericial</option>
              </Select>
              <Select label="Numeração de seções" defaultValue="numerica">
                <option value="numerica">Numérica (1, 2, 3…)</option>
                <option value="romana">Romana (I, II, III…)</option>
              </Select>
              <Select label="Formato de exportação padrão" defaultValue="pdf">
                <option value="pdf">PDF (pronto para assinatura)</option>
                <option value="docx">DOCX (editável)</option>
                <option value="ambos">Ambos</option>
              </Select>
              <Input label="Local padrão para datar" defaultValue="São Paulo/SP" />
            </div>
          </Card>

          <Card>
            <CardHeader title="Envio por e-mail" subtitle="Módulo I" icon={<Mail size={18} />} />
            <div className="space-y-4 p-5">
              <Input label="Remetente" defaultValue={usuario?.email} />
              <Input label="Responder para" defaultValue={usuario?.email} />
              <Input label="Assinatura do e-mail" defaultValue={`${usuario?.nome} — ${usuario?.registroProfissional ?? ''}`} />
              <div className="rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-2.5 text-[12.5px] text-navy-800">
                O disparo é feito por serviço transacional (Resend ou SendGrid) configurado no
                backend, conforme a proposta.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ---------- Sistema ---------- */}
      {aba === 'sistema' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Ambiente" icon={<Server size={18} />} />
            <dl className="divide-y divide-ink-100 text-[13.5px]">
              {[
                ['Versão do frontend', '1.0.0'],
                ['Modo da API', API_MODE === 'mock' ? 'Mock local (sem backend)' : 'REST'],
                ['Stack prevista', 'React · Node.js/API REST · PostgreSQL'],
                ['Geração de documentos', 'Motor de PDF + exportação DOCX'],
                ['Armazenamento de imagens', 'Upload organizado por seção'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-2.5">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Segurança e LGPD" icon={<ShieldCheck size={18} />} />
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-ink-600">
              <p>
                Os dados de processos judiciais, partes envolvidas e trabalhadores avaliados são
                tratados como dados sensíveis nos termos da LGPD.
              </p>
              <p>
                O acesso é restrito aos usuários autorizados cadastrados nesta tela, com registro de
                último acesso e possibilidade de desativação imediata.
              </p>
              <div className="rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-2.5">
                <p className="font-semibold text-ink-700">Escopo desta fase</p>
                <p className="mt-0.5">
                  Controles técnicos básicos no frontend. A conformidade legal integral (política de
                  privacidade e sigilo processual) é responsabilidade do Contratante, conforme
                  Cláusula 8ª da proposta.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal novo usuário */}
      <Modal
        open={!!novo}
        onClose={() => setNovo(null)}
        title="Novo usuário"
        subtitle="Cadastro e gerenciamento dos usuários autorizados a utilizar o sistema."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNovo(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button loading={salvando} onClick={() => void cadastrarUsuario()}>
              Cadastrar
            </Button>
          </>
        }
      >
        {novo && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome"
              required
              className="sm:col-span-2"
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            />
            <Input
              label="E-mail"
              type="email"
              required
              value={novo.email}
              onChange={(e) => setNovo({ ...novo, email: e.target.value })}
            />
            <Select
              label="Perfil"
              value={novo.perfil}
              onChange={(e) => setNovo({ ...novo, perfil: e.target.value as PerfilUsuario })}
            >
              <option value="admin">Administrador</option>
              <option value="perito">Perito</option>
              <option value="assistente">Assistente</option>
            </Select>
            <Input
              label="Senha inicial"
              type="password"
              required
              className="sm:col-span-2"
              value={novo.senha ?? ''}
              onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
              hint="Mínimo 8 caracteres. O usuário pode trocá-la depois em Meu perfil."
            />
            <Input
              label="Titulação"
              className="sm:col-span-2"
              value={novo.titulo ?? ''}
              onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
            />
            <Input
              label="Registro profissional"
              className="sm:col-span-2"
              value={novo.registroProfissional ?? ''}
              onChange={(e) => setNovo({ ...novo, registroProfissional: e.target.value })}
            />
          </div>
        )}
      </Modal>

      <TrocaDeSenha aberto={senhaAberta} onFechar={() => setSenhaAberta(false)} />
    </>
  )
}

/** Troca da própria senha — o backend valida a senha atual. */
function TrocaDeSenha({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const toast = useToast()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  function fechar() {
    setAtual('')
    setNova('')
    setConfirmacao('')
    onFechar()
  }

  async function trocar() {
    if (nova.length < 8) {
      toast('A nova senha precisa ter pelo menos 8 caracteres.', 'error')
      return
    }
    if (nova !== confirmacao) {
      toast('A confirmação não confere com a nova senha.', 'error')
      return
    }

    setSalvando(true)
    try {
      await api.auth.trocarSenha(atual, nova)
      toast('Senha alterada.')
      fechar()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível trocar a senha.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open={aberto}
      onClose={fechar}
      title="Trocar senha"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={fechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button loading={salvando} onClick={() => void trocar()}>
            Trocar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Senha atual"
          type="password"
          required
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
        />
        <Input
          label="Nova senha"
          type="password"
          required
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          hint="Mínimo 8 caracteres."
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </div>
    </Modal>
  )
}
