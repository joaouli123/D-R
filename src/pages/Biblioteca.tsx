import { useMemo, useState } from 'react'
import { BookOpen, Copy, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import type { SecaoTexto, TextoBiblioteca } from '@/types'
import { cn, contarPalavras, uid } from '@/lib/utils'

// ============================================================
// MÓDULO F — Biblioteca Pessoal de Textos
//
// Textos técnicos que o perito cadastra e reaproveita entre
// pareceres, com inserção rápida nas seções do documento.
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
  tiposDocumento: [],
  tags: [],
  conteudo: '',
  favorito: false,
  usos: 0,
  criadoEm: new Date().toISOString().slice(0, 10),
})

export default function Biblioteca() {
  const { textos, salvarTexto, removerTexto } = useApp()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [secao, setSecao] = useState<'todas' | SecaoTexto>('todas')
  const [editando, setEditando] = useState<TextoBiblioteca | null>(null)
  const [tagsInput, setTagsInput] = useState('')
  const [salvando, setSalvando] = useState(false)

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return textos
      .filter((t) => secao === 'todas' || t.secao === secao)
      .filter((t) => !q || [t.titulo, t.conteudo, ...t.tags].join(' ').toLowerCase().includes(q))
      .sort((a, b) => Number(b.favorito) - Number(a.favorito) || b.usos - a.usos)
  }, [textos, busca, secao])

  async function salvar() {
    if (!editando) return
    if (!editando.titulo.trim() || !editando.conteudo.trim()) {
      toast('Título e conteúdo são obrigatórios.', 'error')
      return
    }

    setSalvando(true)
    try {
      await salvarTexto({
        ...editando,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      })
      toast('Texto salvo na sua biblioteca.')
      setEditando(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar o texto.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    try {
      await removerTexto(id)
      toast('Texto removido.', 'info')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível remover.', 'error')
    }
  }

  function abrir(t: TextoBiblioteca) {
    setEditando(t)
    setTagsInput(t.tags.join(', '))
  }

  return (
    <>
      <PageHeader
        breadcrumb="Módulo F"
        title="Biblioteca Pessoal de Textos"
        description="Cadastre os trechos que você repete nos pareceres e insira-os com um clique nas seções correspondentes."
        action={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditando(vazio())
              setTagsInput('')
            }}
          >
            Novo texto
          </Button>
        }
      />

      <Card className="mb-4 overflow-hidden">
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
      </Card>

      {lista.length === 0 ? (
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
                    onClick={() => void salvarTexto({ ...t, favorito: !t.favorito })}
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
                    onClick={() => void excluir(t.id)}
                    aria-label="Excluir"
                  />
                </div>
            </Card>
          ))}
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
            <Button variant="ghost" onClick={() => setEditando(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button loading={salvando} onClick={() => void salvar()}>
              Salvar
            </Button>
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
