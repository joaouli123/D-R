import { useMemo, useState } from 'react'
import { BookOpen, Copy, FlaskConical, Pencil, Plus, Scale, Search, Star, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Select,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import { AGENTES_QUIMICOS, ANEXOS_NR15, ANEXOS_NR16, CONSIDERACOES_QUALITATIVAS } from '@/content/agentesQuimicos'
import type { SecaoTexto, TextoBiblioteca } from '@/types'
import { cn, contarPalavras, uid } from '@/lib/utils'

// ============================================================
// MÓDULO F — Biblioteca Pessoal de Textos
// + Biblioteca Técnica (agentes químicos, anexos NR-15/NR-16)
// ============================================================

const SECOES: { value: SecaoTexto; label: string }[] = [
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'objetivo', label: 'Objetivo' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'ambiente', label: 'Ambiente' },
  { value: 'atividades', label: 'Atividades' },
  { value: 'analise', label: 'Análise técnica' },
  { value: 'conclusao', label: 'Conclusão' },
  { value: 'manifestacao', label: 'Manifestação' },
  { value: 'impugnacao', label: 'Impugnação' },
  { value: 'esclarecimento', label: 'Esclarecimento' },
  { value: 'generico', label: 'Genérico' },
]

const vazio = (): TextoBiblioteca => ({
  id: uid('txt'),
  titulo: '',
  secao: 'generico',
  tags: [],
  conteudo: '',
  favorito: false,
  usos: 0,
  criadoEm: new Date().toISOString().slice(0, 10),
})

export default function Biblioteca() {
  const { textos, salvarTexto, removerTexto } = useApp()
  const toast = useToast()
  const [aba, setAba] = useState<'textos' | 'quimicos' | 'normas'>('textos')
  const [busca, setBusca] = useState('')
  const [secao, setSecao] = useState<'todas' | SecaoTexto>('todas')
  const [editando, setEditando] = useState<TextoBiblioteca | null>(null)
  const [tagsInput, setTagsInput] = useState('')

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return textos
      .filter((t) => secao === 'todas' || t.secao === secao)
      .filter((t) => !q || [t.titulo, t.conteudo, ...t.tags].join(' ').toLowerCase().includes(q))
      .sort((a, b) => Number(b.favorito) - Number(a.favorito) || b.usos - a.usos)
  }, [textos, busca, secao])

  function salvar() {
    if (!editando) return
    if (!editando.titulo.trim() || !editando.conteudo.trim()) {
      toast('Título e conteúdo são obrigatórios.', 'error')
      return
    }
    salvarTexto({
      ...editando,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    })
    toast('Texto salvo na sua biblioteca.')
    setEditando(null)
  }

  function abrir(t: TextoBiblioteca) {
    setEditando(t)
    setTagsInput(t.tags.join(', '))
  }

  return (
    <>
      <PageHeader
        breadcrumb="Módulo F"
        title="Biblioteca"
        description="Seus textos técnicos reutilizáveis e a base normativa de consulta rápida."
        action={
          aba === 'textos' && (
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditando(vazio())
                setTagsInput('')
              }}
            >
              Novo texto
            </Button>
          )
        }
      />

      <Card className="mb-4 overflow-hidden">
        <Tabs
          value={aba}
          onChange={setAba}
          tabs={[
            { value: 'textos', label: 'Meus textos', count: textos.length },
            { value: 'quimicos', label: 'Agentes químicos', count: AGENTES_QUIMICOS.length },
            { value: 'normas', label: 'Anexos NR-15 / NR-16' },
          ]}
        />
        {aba === 'textos' && (
          <div className="grid gap-3 p-3 sm:grid-cols-[1fr_200px]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar texto, tag ou conteúdo…"
                className="h-10 w-full rounded-lg border border-ink-300 pl-9 pr-3 text-sm focus:border-brand-600"
              />
            </div>
            <Select value={secao} onChange={(e) => setSecao(e.target.value as typeof secao)}>
              <option value="todas">Todas as seções</option>
              {SECOES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {/* ---------- Meus textos ---------- */}
      {aba === 'textos' &&
        (lista.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen size={22} />}
              title="Nenhum texto encontrado"
              description="Cadastre trechos que você repete nos pareceres para inseri-los com um clique."
            />
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {lista.map((t) => (
              <Card key={t.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight text-ink-900">{t.titulo}</h3>
                  <button
                    onClick={() => salvarTexto({ ...t, favorito: !t.favorito })}
                    aria-label="Favoritar"
                  >
                    <Star
                      size={16}
                      className={cn(t.favorito ? 'fill-amber-400 text-amber-400' : 'text-ink-300')}
                    />
                  </button>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge tone="green">{SECOES.find((s) => s.value === t.secao)?.label}</Badge>
                  <Badge tone="gray">{t.usos} usos</Badge>
                  <Badge tone="navy">{contarPalavras(t.conteudo)} palavras</Badge>
                </div>
                <p className="line-clamp-4 flex-1 text-[13px] leading-relaxed text-ink-600">
                  {t.conteudo}
                </p>
                {t.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <span key={tag} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-end gap-1 border-t border-ink-100 pt-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Copy size={14} />}
                    onClick={() => {
                      navigator.clipboard?.writeText(t.conteudo)
                      toast('Texto copiado.')
                    }}
                  >
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => abrir(t)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    icon={<Trash2 size={14} />}
                    onClick={() => {
                      removerTexto(t.id)
                      toast('Texto removido.', 'info')
                    }}
                    aria-label="Excluir"
                  />
                </div>
              </Card>
            ))}
          </div>
        ))}

      {/* ---------- Agentes químicos ---------- */}
      {aba === 'quimicos' && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="Quadro comparativo — NR-15"
              subtitle="Enquadramento por número CAS, conforme FDS/FISPQ e cruzamento com a LINACH."
              icon={<FlaskConical size={18} />}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead className="border-b border-ink-200 bg-ink-50 text-left text-[11px] uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">CAS</th>
                    <th className="px-3 py-2.5 font-semibold">Agente</th>
                    <th className="px-3 py-2.5 font-semibold">Anexo 11 (LT)</th>
                    <th className="px-3 py-2.5 font-semibold">Pele</th>
                    <th className="px-3 py-2.5 font-semibold">Anexo 13</th>
                    <th className="px-3 py-2.5 font-semibold">Anexo 13-A</th>
                    <th className="px-4 py-2.5 font-semibold">Grau previsto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {AGENTES_QUIMICOS.map((a) => (
                    <tr key={a.cas} className="align-top hover:bg-ink-50/70">
                      <td className="px-4 py-3 font-mono text-[12px] text-navy-700">{a.cas}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-ink-900">{a.nome}</p>
                        {a.nomeIngles && <p className="text-[11px] italic text-ink-400">{a.nomeIngles}</p>}
                      </td>
                      <td className="px-3 py-3 text-ink-700">
                        {a.anexo11 ? (
                          <>
                            {a.ltPpm}
                            <br />
                            <span className="text-[11px] text-ink-500">{a.ltMgM3}</span>
                          </>
                        ) : (
                          <span className="text-ink-400">Não possui</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {a.pele ? <Badge tone="amber">Sim</Badge> : <span className="text-ink-400">Não</span>}
                      </td>
                      <td className="px-3 py-3">
                        {a.anexo13 ? <Badge tone="green">Sim</Badge> : <span className="text-ink-400">Não</span>}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-ink-600">{a.anexo13A}</td>
                      <td className="px-4 py-3 font-medium text-ink-800">{a.grauPrevisto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {AGENTES_QUIMICOS.map((a) => (
              <Card key={a.cas} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-ink-900">{a.nome}</h3>
                    <p className="font-mono text-[11px] text-ink-500">CAS {a.cas}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Copy size={14} />}
                    onClick={() => {
                      navigator.clipboard?.writeText(a.resumo)
                      toast('Texto técnico copiado.')
                    }}
                    aria-label="Copiar"
                  />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{a.resumo}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="section-title">Considerações técnicas — avaliação qualitativa</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => {
                  navigator.clipboard?.writeText(CONSIDERACOES_QUALITATIVAS)
                  toast('Considerações copiadas.')
                }}
              >
                Copiar
              </Button>
            </div>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-600">
              {CONSIDERACOES_QUALITATIVAS}
            </p>
          </Card>
        </div>
      )}

      {/* ---------- Anexos normativos ---------- */}
      {aba === 'normas' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader title="NR-15 — Insalubridade" subtitle="Portaria MTb nº 3.214/78" icon={<Scale size={18} />} />
            <table className="w-full text-[13px]">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-[11px] uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Anexo</th>
                  <th className="px-3 py-2 font-semibold">Agente</th>
                  <th className="px-3 py-2 font-semibold">Critério</th>
                  <th className="px-4 py-2 font-semibold">Grau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ANEXOS_NR15.map((a) => (
                  <tr key={a.anexo} className="hover:bg-ink-50/70">
                    <td className="px-4 py-2 font-semibold text-navy-700">{a.anexo}</td>
                    <td className="px-3 py-2 text-ink-700">{a.titulo}</td>
                    <td className="px-3 py-2">
                      <Badge tone={a.criterio === 'Qualitativo' ? 'green' : 'navy'}>{a.criterio}</Badge>
                    </td>
                    <td className="px-4 py-2 text-ink-600">{a.grau}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="NR-16 — Periculosidade" subtitle="Adicional de 30% sobre o salário-base" icon={<Scale size={18} />} />
            <table className="w-full text-[13px]">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-[11px] uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Anexo</th>
                  <th className="px-3 py-2 font-semibold">Atividade</th>
                  <th className="px-4 py-2 font-semibold">Adicional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ANEXOS_NR16.map((a) => (
                  <tr key={a.anexo} className="hover:bg-ink-50/70">
                    <td className="px-4 py-2 font-semibold text-navy-700">{a.anexo}</td>
                    <td className="px-3 py-2 text-ink-700">{a.titulo}</td>
                    <td className="px-4 py-2">
                      <Badge tone="amber">{a.adicional}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Modal de texto */}
      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando && textos.some((t) => t.id === editando.id) ? 'Editar texto' : 'Novo texto'}
        subtitle="Use {{variavel}} para campos preenchidos automaticamente pelo processo."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>Salvar</Button>
          </>
        }
      >
        {editando && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Input
                label="Título"
                required
                value={editando.titulo}
                onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
              />
              <Select
                label="Seção"
                value={editando.secao}
                onChange={(e) => setEditando({ ...editando, secao: e.target.value as SecaoTexto })}
              >
                {SECOES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="insalubridade, anexo 13, epi"
              hint="Separadas por vírgula — facilitam a busca na inserção rápida."
            />
            <Textarea
              label="Conteúdo"
              required
              rows={12}
              value={editando.conteudo}
              onChange={(e) => setEditando({ ...editando, conteudo: e.target.value })}
              hint={`${contarPalavras(editando.conteudo)} palavras`}
            />
          </div>
        )}
      </Modal>
    </>
  )
}
