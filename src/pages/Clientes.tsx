import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Building2, MapPin, Pencil, Plus, Search, Trash2, User } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Modal, Select } from '@/components/ui'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { empresaVazia, ModalEmpresa } from '@/components/ModalEmpresa'
import { useApp } from '@/store/AppStore'
import type { Empresa } from '@/types'

// ============================================================
// MÓDULO B — Cadastro de Empresas (reutilizável entre processos)
//
// O formulário em si mora em `ModalEmpresa`: é o mesmo cadastro que a
// perícia abre quando o perito precisa registrar a reclamada na hora.
// ============================================================

export default function Clientes() {
  const { empresas, removerEmpresa, pericias } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [confirmar, setConfirmar] = useState<Empresa | null>(null)
  /** Empresa escolhida no atalho "usar em perícia", e o processo de destino. */
  const [vinculando, setVinculando] = useState<Empresa | null>(null)
  const [destino, setDestino] = useState('')

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q) return empresas
    return empresas.filter((e) =>
      [e.razaoSocial, e.nomeFantasia, e.cnpj, e.cidade].join(' ').toLowerCase().includes(q),
    )
  }, [empresas, busca])

  const usosDe = (id: string) =>
    pericias.filter((p) => p.reclamadas.some((r) => r.empresaId === id)).length

  async function excluir() {
    if (!confirmar) return
    try {
      await removerEmpresa(confirmar.id)
      toast('Empresa excluída.', 'info')
      setConfirmar(null)
    } catch (e) {
      // O servidor recusa excluir empresa citada como reclamada.
      toast(e instanceof Error ? e.message : 'Não foi possível excluir.', 'error')
      setConfirmar(null)
    }
  }

  /**
   * Leva a empresa para a perícia escolhida. Ela chega já selecionada como
   * reclamada porque a escolha foi explícita aqui — o editor de perícia é
   * que nunca escolhe empresa por conta própria.
   */
  function abrirPericia() {
    if (!vinculando) return
    const rota = destino ? `/pericias/${destino}` : '/pericias/nova'
    navigate(`${rota}?empresa=${vinculando.id}`)
  }

  return (
    <>
      <PageHeader
        breadcrumb="Módulo B"
        title="Clientes e Empresas"
        description="Cadastro reutilizável — a empresa é registrada uma única vez e reaproveitada em todos os processos, evitando redigitação."
        action={
          <Button icon={<Plus size={16} />} onClick={() => setEditando(empresaVazia())}>
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
              <Button icon={<Plus size={16} />} onClick={() => setEditando(empresaVazia())}>
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
                <div className="flex flex-wrap justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Briefcase size={14} />}
                    onClick={() => {
                      setVinculando(e)
                      setDestino('')
                    }}
                  >
                    Usar em perícia
                  </Button>
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
      {editando && (
        <ModalEmpresa
          key={editando.id}
          inicial={editando}
          titulo={empresas.some((e) => e.id === editando.id) ? 'Editar empresa' : 'Nova empresa'}
          subtitulo="Os dados abaixo alimentam automaticamente o cabeçalho dos documentos gerados."
          onFechar={() => setEditando(null)}
        />
      )}
      {/* Atalho: da empresa para o processo em que ela é reclamada. */}
      <Modal
        open={!!vinculando}
        onClose={() => setVinculando(null)}
        title="Usar em perícia"
        subtitle="A empresa entra como reclamada no processo escolhido."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVinculando(null)}>
              Cancelar
            </Button>
            <Button onClick={abrirPericia}>Abrir perícia</Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          <strong>{vinculando?.razaoSocial}</strong> será vinculada como reclamada. Escolha o
          processo — ou deixe em nova perícia para começar do zero.
        </p>
        <div className="mt-4">
          <Select label="Processo" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Nova perícia</option>
            {pericias.map((p) => (
              <option key={p.id} value={p.id}>
                {p.numeroProcesso || 'Sem número'} — {p.reclamante || 'sem reclamante'}
                {vinculando && p.reclamadas.some((r) => r.empresaId === vinculando.id)
                  ? ' (já vinculada)'
                  : ''}
              </option>
            ))}
          </Select>
        </div>
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
            <Button variant="danger" onClick={() => void excluir()}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Deseja realmente excluir <strong>{confirmar?.razaoSocial}</strong>?
        </p>
        {confirmar && usosDe(confirmar.id) > 0 && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
            Esta empresa é reclamada em {usosDe(confirmar.id)}{' '}
            {usosDe(confirmar.id) === 1 ? 'processo' : 'processos'} e não poderá ser excluída — um
            parecer já emitido não pode perder a identificação da parte.
          </p>
        )}
      </Modal>
    </>
  )
}
