import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  HelpCircle,
  Mail,
  MessageSquareText,
  Paperclip,
  Plus,
  ScrollText,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Modal, Select, Tabs, useToast } from '@/components/ui'
import type { BadgeTone } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import type { DocumentoGerado, TipoDocumento } from '@/types'
import { formatDate } from '@/lib/utils'

// ============================================================
// MÓDULO J — Histórico de Pareceres e Documentos
// ============================================================

const TIPOS: Record<TipoDocumento, { label: string; icon: typeof FileText; tone: BadgeTone }> = {
  parecer: { label: 'Parecer Técnico', icon: FileText, tone: 'green' },
  laudo: { label: 'Laudo Técnico', icon: FileCheck2, tone: 'green' },
  quesitos: { label: 'Quesitos', icon: HelpCircle, tone: 'navy' },
  manifestacao: { label: 'Manifestação', icon: MessageSquareText, tone: 'navy' },
  impugnacao: { label: 'Impugnação', icon: ShieldAlert, tone: 'amber' },
  esclarecimento: { label: 'Esclarecimento', icon: ScrollText, tone: 'gray' },
}

export default function Documentos() {
  const { documentos, removerDocumento } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [aba, setAba] = useState<'todos' | TipoDocumento>('todos')
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<'todos' | DocumentoGerado['status']>('todos')
  const [confirmar, setConfirmar] = useState<DocumentoGerado | null>(null)
  const [enviar, setEnviar] = useState<DocumentoGerado | null>(null)

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return documentos
      .filter((d) => aba === 'todos' || d.tipo === aba)
      .filter((d) => status === 'todos' || d.status === status)
      .filter(
        (d) =>
          !q ||
          [d.titulo, d.numeroProcesso, d.reclamante, d.empresaPrincipal]
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
  }, [documentos, aba, status, busca])

  const contar = (t: TipoDocumento) => documentos.filter((d) => d.tipo === t).length

  return (
    <>
      <PageHeader
        breadcrumb="Módulo J"
        title="Documentos"
        description="Histórico completo — localize, visualize, edite e reenvie qualquer documento já elaborado."
        action={
          <Button icon={<Plus size={16} />} onClick={() => navigate('/pericias/nova')}>
            Novo documento
          </Button>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <Tabs
          value={aba}
          onChange={setAba}
          tabs={[
            { value: 'todos', label: 'Todos', count: documentos.length },
            { value: 'parecer', label: 'Pareceres', count: contar('parecer') },
            { value: 'laudo', label: 'Laudos', count: contar('laudo') },
            { value: 'quesitos', label: 'Quesitos', count: contar('quesitos') },
            { value: 'manifestacao', label: 'Manifestações', count: contar('manifestacao') },
            { value: 'impugnacao', label: 'Impugnações', count: contar('impugnacao') },
            { value: 'esclarecimento', label: 'Esclarecimentos', count: contar('esclarecimento') },
          ]}
        />
        <div className="grid gap-3 p-3 sm:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, processo, reclamante ou empresa…"
              className="h-10 w-full rounded-lg border border-ink-300 pl-9 pr-3 text-sm focus:border-brand-600"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="todos">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="finalizado">Finalizado</option>
            <option value="enviado">Enviado</option>
          </Select>
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={22} />}
            title="Nenhum documento encontrado"
            description="Ajuste os filtros ou gere um novo documento a partir de uma perícia."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-[12px] uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Documento</th>
                  <th className="px-3 py-2.5 font-semibold">Processo</th>
                  <th className="px-3 py-2.5 font-semibold">Reclamante</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Atualizado</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtrados.map((d) => {
                  const T = TIPOS[d.tipo]
                  return (
                    <tr key={d.id} className="hover:bg-ink-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-navy-700">
                            <T.icon size={17} strokeWidth={1.9} />
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium leading-tight text-ink-900">{d.titulo}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge tone={T.tone}>{T.label}</Badge>
                              {d.anexoExternoNome && (
                                <Badge tone="gray">
                                  <Paperclip size={9} /> anexo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[12px] text-ink-600">{d.numeroProcesso}</td>
                      <td className="px-3 py-3 text-ink-700">
                        <p className="leading-tight">{d.reclamante}</p>
                        <p className="text-xs text-ink-400">{d.empresaPrincipal}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          tone={d.status === 'rascunho' ? 'amber' : d.status === 'enviado' ? 'navy' : 'green'}
                        >
                          {d.status === 'rascunho' ? 'Rascunho' : d.status === 'enviado' ? 'Enviado' : 'Finalizado'}
                        </Badge>
                        {d.enviadoPara && (
                          <p className="mt-1 text-[11px] text-ink-400">{d.enviadoPara}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[13px] text-ink-500">{formatDate(d.atualizadoEm)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye size={14} />}
                            onClick={() => navigate(`/pericias/${d.periciaId}`)}
                            aria-label="Visualizar"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<FileDown size={14} />}
                            onClick={() => toast('PDF gerado.', 'info')}
                            aria-label="Baixar"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Mail size={14} />}
                            onClick={() => setEnviar(d)}
                            aria-label="Enviar"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            icon={<Trash2 size={14} />}
                            onClick={() => setConfirmar(d)}
                            aria-label="Excluir"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        title="Excluir documento"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmar) removerDocumento(confirmar.id)
                toast('Documento excluído.', 'info')
                setConfirmar(null)
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Excluir <strong>{confirmar?.titulo}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <Modal
        open={!!enviar}
        onClose={() => setEnviar(null)}
        title="Reenviar documento"
        subtitle={enviar?.titulo}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEnviar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast('Documento enviado por e-mail.')
                setEnviar(null)
              }}
            >
              Enviar
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-600">
          O PDF é anexado automaticamente ao e-mail — Módulo I da proposta.
        </p>
        <input
          type="email"
          placeholder="destinatario@trt2.jus.br"
          className="h-10 w-full rounded-lg border border-ink-300 px-3 text-sm focus:border-brand-600"
        />
      </Modal>
    </>
  )
}
