import { useMemo, useState } from 'react'
import { Building2, MapPin, Pencil, Plus, Search, Trash2, User } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import type { Empresa } from '@/types'
import { maskCNPJ, uid, UFS } from '@/lib/utils'

// ============================================================
// MÓDULO B — Cadastro de Empresas (reutilizável entre processos)
// ============================================================

const vazia = (): Empresa => ({
  id: uid('emp'),
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  cnae: '',
  grauRisco: '3',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: 'SP',
  cep: '',
  contatoNome: '',
  contatoEmail: '',
  contatoTelefone: '',
  ramoAtividade: '',
  criadoEm: new Date().toISOString().slice(0, 10),
})

export default function Clientes() {
  const { empresas, salvarEmpresa, removerEmpresa, pericias } = useApp()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [confirmar, setConfirmar] = useState<Empresa | null>(null)

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q) return empresas
    return empresas.filter((e) =>
      [e.razaoSocial, e.nomeFantasia, e.cnpj, e.cidade].join(' ').toLowerCase().includes(q),
    )
  }, [empresas, busca])

  const usosDe = (id: string) =>
    pericias.filter((p) => p.reclamadas.some((r) => r.empresaId === id)).length

  function salvar() {
    if (!editando) return
    if (!editando.razaoSocial.trim() || !editando.cnpj.trim()) {
      toast('Razão social e CNPJ são obrigatórios.', 'error')
      return
    }
    salvarEmpresa(editando)
    toast('Empresa salva. Já pode ser reutilizada em qualquer processo.')
    setEditando(null)
  }

  const set = (patch: Partial<Empresa>) => setEditando((e) => (e ? { ...e, ...patch } : e))

  return (
    <>
      <PageHeader
        breadcrumb="Módulo B"
        title="Clientes e Empresas"
        description="Cadastro reutilizável — a empresa é registrada uma única vez e reaproveitada em todos os processos, evitando redigitação."
        action={
          <Button icon={<Plus size={16} />} onClick={() => setEditando(vazia())}>
            Nova empresa
          </Button>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por razão social, CNPJ ou cidade…"
          className="h-10 w-full rounded-lg border border-ink-300 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-brand-600"
        />
      </div>

      {filtradas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 size={22} />}
            title="Nenhuma empresa encontrada"
            description="Cadastre a primeira empresa para reutilizá-la nos processos."
            action={
              <Button icon={<Plus size={16} />} onClick={() => setEditando(vazia())}>
                Nova empresa
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((e) => (
            <Card key={e.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <Building2 size={19} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold leading-tight text-ink-900">
                    {e.nomeFantasia || e.razaoSocial}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-ink-500">{e.razaoSocial}</p>
                </div>
              </div>

              <dl className="mt-3 space-y-1.5 text-[13px]">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-ink-400">CNPJ</dt>
                  <dd className="font-mono text-[12px] text-ink-700">{e.cnpj}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-ink-400">CNAE</dt>
                  <dd className="text-ink-700">
                    {e.cnae || '—'}{' '}
                    {e.grauRisco && <Badge tone="gray">Grau {e.grauRisco}</Badge>}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 pt-0.5 text-ink-400">
                    <MapPin size={13} className="inline" />
                  </dt>
                  <dd className="text-ink-700">
                    {e.endereco}
                    {e.numero ? `, ${e.numero}` : ''} — {e.cidade}/{e.uf}
                  </dd>
                </div>
                {e.contatoNome && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 pt-0.5 text-ink-400">
                      <User size={13} className="inline" />
                    </dt>
                    <dd className="truncate text-ink-700">{e.contatoNome}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <Badge tone={usosDe(e.id) ? 'green' : 'gray'}>
                  {usosDe(e.id)} {usosDe(e.id) === 1 ? 'processo' : 'processos'}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditando(e)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    icon={<Trash2 size={14} />}
                    onClick={() => setConfirmar(e)}
                    aria-label="Excluir"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando && empresas.some((e) => e.id === editando.id) ? 'Editar empresa' : 'Nova empresa'}
        subtitle="Os dados abaixo alimentam automaticamente o cabeçalho dos documentos gerados."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>Salvar empresa</Button>
          </>
        }
      >
        {editando && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Razão social"
                required
                value={editando.razaoSocial}
                onChange={(e) => set({ razaoSocial: e.target.value })}
              />
              <Input
                label="Nome fantasia"
                value={editando.nomeFantasia}
                onChange={(e) => set({ nomeFantasia: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="CNPJ"
                required
                value={editando.cnpj}
                onChange={(e) => set({ cnpj: maskCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
              />
              <Input
                label="CNAE"
                value={editando.cnae}
                onChange={(e) => set({ cnae: e.target.value })}
                placeholder="00.00-0-00"
              />
              <Select
                label="Grau de risco"
                value={editando.grauRisco}
                onChange={(e) => set({ grauRisco: e.target.value as Empresa['grauRisco'] })}
                hint="Conforme NR-04"
              >
                <option value="1">Grau 1</option>
                <option value="2">Grau 2</option>
                <option value="3">Grau 3</option>
                <option value="4">Grau 4</option>
              </Select>
            </div>

            <Input
              label="Ramo de atividade"
              value={editando.ramoAtividade}
              onChange={(e) => set({ ramoAtividade: e.target.value })}
              hint="Texto reaproveitado na seção 'Descrição da Empresa' do parecer."
            />

            <div className="border-t border-ink-100 pt-4">
              <p className="section-title mb-3">Endereço</p>
              <div className="grid gap-4 sm:grid-cols-6">
                <Input
                  label="Logradouro"
                  className="sm:col-span-4"
                  value={editando.endereco}
                  onChange={(e) => set({ endereco: e.target.value })}
                />
                <Input
                  label="Número"
                  value={editando.numero}
                  onChange={(e) => set({ numero: e.target.value })}
                />
                <Input label="CEP" value={editando.cep} onChange={(e) => set({ cep: e.target.value })} />
                <Input
                  label="Bairro"
                  className="sm:col-span-2"
                  value={editando.bairro}
                  onChange={(e) => set({ bairro: e.target.value })}
                />
                <Input
                  label="Cidade"
                  className="sm:col-span-3"
                  value={editando.cidade}
                  onChange={(e) => set({ cidade: e.target.value })}
                />
                <Select label="UF" value={editando.uf} onChange={(e) => set({ uf: e.target.value })}>
                  {UFS.map((uf) => (
                    <option key={uf}>{uf}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="border-t border-ink-100 pt-4">
              <p className="section-title mb-3">Contato</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Responsável"
                  value={editando.contatoNome}
                  onChange={(e) => set({ contatoNome: e.target.value })}
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={editando.contatoEmail}
                  onChange={(e) => set({ contatoEmail: e.target.value })}
                />
                <Input
                  label="Telefone"
                  value={editando.contatoTelefone}
                  onChange={(e) => set({ contatoTelefone: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        title="Excluir empresa"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmar) removerEmpresa(confirmar.id)
                toast('Empresa excluída.', 'info')
                setConfirmar(null)
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Deseja realmente excluir <strong>{confirmar?.razaoSocial}</strong>? Os processos já
          vinculados manterão o histórico.
        </p>
      </Modal>
    </>
  )
}
