import { useMemo, useState } from 'react'
import { BookOpen, Search, Star } from 'lucide-react'
import { Badge, Button, Modal } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { SecaoTexto, TipoDocumento } from '@/types'
import { textoDisponivelNoContexto } from '@/lib/biblioteca'
import { cn } from '@/lib/utils'

// ============================================================
// MÓDULO F — Inserção rápida de textos da Biblioteca Pessoal
// ============================================================

export function BibliotecaDrawer({
  open,
  onClose,
  secao,
  tipoDocumento,
  referencia,
  onInserir,
}: {
  open: boolean
  onClose: () => void
  secao?: SecaoTexto
  tipoDocumento?: TipoDocumento
  referencia?: string
  onInserir: (conteudo: string) => void
}) {
  const { textos, salvarTexto } = useApp()
  const [busca, setBusca] = useState('')
  const [apenasContexto, setApenasContexto] = useState(true)
  const [selecionados, setSelecionados] = useState<string[]>([])

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return textos
      .filter((t) =>
        apenasContexto ? textoDisponivelNoContexto(t, tipoDocumento, secao, referencia) : true,
      )
      .filter((t) => !q || [t.referencia, t.titulo, t.conteudo, ...t.tags].filter(Boolean).join(' ').toLowerCase().includes(q))
      .sort((a, b) => Number(b.favorito) - Number(a.favorito) || b.usos - a.usos)
  }, [textos, busca, apenasContexto, tipoDocumento, secao, referencia])

  const rotuloContexto = tipoDocumento
    ? secao
      ? 'Somente para este documento e seção'
      : 'Somente para este documento'
    : 'Somente desta seção'

  function inserir() {
    const escolhidos = textos.filter((t) => selecionados.includes(t.id))
    if (!escolhidos.length) return

    // O texto entra na hora; a contagem de uso é secundária e uma
    // falha nela não deve impedir a inserção.
    escolhidos.forEach((t) => {
      void salvarTexto({ ...t, usos: t.usos + 1 }).catch(() => undefined)
    })

    onInserir(escolhidos.map((t) => t.conteudo).join('\n\n'))
    setSelecionados([])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Biblioteca Pessoal de Textos"
      subtitle="Selecione os trechos que deseja inserir nesta seção do documento."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={inserir} disabled={!selecionados.length}>
            Inserir {selecionados.length > 0 && `(${selecionados.length})`}
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar texto ou tag…"
            className="h-9 w-full rounded-lg border border-ink-300 pl-9 pr-3 text-sm focus:border-brand-600"
          />
        </div>
        {(tipoDocumento || secao) && (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-600">
            <input
              type="checkbox"
              checked={apenasContexto}
              onChange={(e) => setApenasContexto(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 accent-brand-700"
            />
            {rotuloContexto}
          </label>
        )}
      </div>

      {referencia && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-800">
          <span className="font-semibold">Destino no documento</span>
          <Badge tone="navy">Item {referencia}</Badge>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-500">
          <BookOpen size={22} className="mx-auto mb-2 text-ink-300" />
          Nenhum texto encontrado. Cadastre trechos em <strong>Biblioteca</strong>.
        </div>
      ) : (
        <ul className="space-y-2">
          {lista.map((t) => {
            const ativo = selecionados.includes(t.id)
            return (
              <li key={t.id}>
                <button
                  onClick={() =>
                    setSelecionados((s) => (ativo ? s.filter((x) => x !== t.id) : [...s, t.id]))
                  }
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    ativo ? 'border-brand-600 bg-brand-50' : 'border-ink-200 hover:border-brand-300',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      readOnly
                      checked={ativo}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 accent-brand-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold text-ink-900">{t.titulo}</span>
                        {t.referencia && <Badge tone="navy">Item {t.referencia}</Badge>}
                        {t.favorito && <Star size={12} className="fill-amber-400 text-amber-400" />}
                        <Badge tone="gray">{t.usos} usos</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">
                        {t.conteudo}
                      </p>
                      {t.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {t.tags.map((tag) => (
                            <span key={tag} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
