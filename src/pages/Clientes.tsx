import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Building2, MapPin, Pencil, Plus, Search, Trash2, User } from 'lucide-react'
import { Badge, Button, Card, Checkbox, EmptyState, Modal, Select } from '@/components/ui'
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
  const { empresas, removerEmpresa, limparEmpresas, pericias } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [confirmar, setConfirmar] = useState<Empresa | null>(null)
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false)
  const [limpando, setLimpando] = useState(false)
  const [levarRascunhos, setLevarRascunhos] = useState(false)
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

  /**
   * As perícias que seguram algum cadastro. Dizer só "3 empresas serão
   * mantidas" transforma a limpeza em adivinhação: o perito conta as
   * que sobraram e não tem como saber onde elas estão presas. Aqui a
   * tela nomeia o processo, e o nó fica visível.
   */
  const prendendo = useMemo(
    () => pericias.filter((p) => p.reclamadas.some((r) => empresas.some((e) => e.id === r.empresaId))),
    [pericias, empresas],
  )
  const rascunhosPrendendo = prendendo.filter((p) => p.status === 'rascunho')
  const presas = empresas.filter((e) => usosDe(e.id) > 0)

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
   * Apaga os cadastros de teste de uma vez, para começar a operação
   * com a base limpa. Quem está em processo fica — e a tela diz quais
   * ficaram, senão o perito conta as empresas, vê que sobraram e não
   * entende por quê.
   */
  async function limparTudo() {
    setLimpando(true)
    try {
      const { excluidas, rascunhosExcluidos, mantidas } = await limparEmpresas(levarRascunhos)
      setConfirmarLimpeza(false)
      setLevarRascunhos(false)
      const empresasExcluidas = `${excluidas} ${excluidas === 1 ? 'empresa excluída' : 'empresas excluídas'}`
      const comRascunhos = rascunhosExcluidos
        ? `${empresasExcluidas} e ${rascunhosExcluidos} ${rascunhosExcluidos === 1 ? 'rascunho excluído' : 'rascunhos excluídos'}`
        : empresasExcluidas
      if (mantidas.length === 0) {
        toast(`${comRascunhos}.`, 'info')
      } else {
        toast(
          `${comRascunhos}. ` +
            `${mantidas.length} ${mantidas.length === 1 ? 'ficou' : 'ficaram'} por estar em processo: ` +
            mantidas.map((m) => m.razaoSocial).join(', '),
          'info',
        )
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível limpar os cadastros.', 'error')
    } finally {
      setLimpando(false)
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
          <div className="flex flex-wrap gap-2">
            {empresas.length > 0 && (
              <Button
                variant="ghost"
                icon={<Trash2 size={16} />}
                onClick={() => setConfirmarLimpeza(true)}
              >
                Limpar cadastros
              </Button>
            )}
            <Button icon={<Plus size={16} />} onClick={() => setEditando(empresaVazia())}>
              Nova empresa
            </Button>
          </div>
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

      {/* Limpeza da base de testes, antes dos cadastros oficiais. */}
      <Modal
        open={confirmarLimpeza}
        onClose={() => setConfirmarLimpeza(false)}
        title="Limpar cadastros"
        subtitle="Para começar a operação com a base zerada."
        size="sm"
        footer={
          <>
            <Button variant="ghost" disabled={limpando} onClick={() => setConfirmarLimpeza(false)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={limpando} onClick={() => void limparTudo()}>
              {limpando ? 'Limpando…' : 'Apagar cadastros'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Serão apagadas as <strong>{empresas.length}</strong>{' '}
          {empresas.length === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}. Esta ação não pode
          ser desfeita.
        </p>

        {presas.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
            <p>
              {presas.length}{' '}
              {presas.length === 1
                ? 'empresa é reclamada em um processo e será mantida'
                : 'empresas são reclamadas em processos e serão mantidas'}{' '}
              — um parecer já emitido não pode perder a identificação da parte.
            </p>
            <ul className="mt-2 space-y-1">
              {prendendo.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-medium">{p.reclamante || '(sem reclamante)'}</span>
                  <span className="font-mono text-[12px] text-amber-700">
                    {p.numeroProcesso || '(sem número)'}
                  </span>
                  {p.status === 'rascunho' && <Badge tone="amber">Rascunho</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/*
          O nó do começo da operação: as empresas de teste ficam presas a
          perícias de teste. Rascunho não é parecer emitido, então pode
          sair junto — mas por escolha explícita, e nunca perícia em
          andamento, concluída ou entregue.
        */}
        {rascunhosPrendendo.length > 0 && (
          <div className="mt-3 border-t border-ink-100 pt-3">
            <Checkbox
              checked={levarRascunhos}
              disabled={limpando}
              onChange={(evento) => setLevarRascunhos(evento.target.checked)}
              label={
                rascunhosPrendendo.length === 1
                  ? 'Apagar também o rascunho que prende esse cadastro'
                  : `Apagar também os ${rascunhosPrendendo.length} rascunhos que prendem esses cadastros`
              }
              description="Só rascunhos. Perícia em andamento, concluída ou entregue continua intacta, e as empresas que ela cita continuam protegidas."
            />
          </div>
        )}
      </Modal>
    </>
  )
}
