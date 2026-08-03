import { useNavigate } from 'react-router-dom'
import { Copy, FileStack, Layers, Pencil, Plus, Upload } from 'lucide-react'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { MODELOS_DOC } from '@/mocks/db'
import { formatDate } from '@/lib/utils'

// ============================================================
// MODELOS — estrutura dos documentos gerados (Módulo H)
// ============================================================

const DESTINO: Record<string, string> = {
  parecer: '/pericias/nova?tipo=parecer',
  laudo: '/pericias/nova?tipo=laudo',
  quesitos: '/quesitos',
  manifestacao: '/manifestacao/concordancia',
  impugnacao: '/manifestacao/impugnacao_laudo',
  esclarecimento: '/esclarecimentos',
}

const TONE: Record<string, 'green' | 'navy' | 'amber' | 'gray'> = {
  parecer: 'green',
  laudo: 'green',
  quesitos: 'navy',
  manifestacao: 'navy',
  impugnacao: 'amber',
  esclarecimento: 'gray',
}

export default function Modelos() {
  const navigate = useNavigate()
  const toast = useToast()

  return (
    <>
      <PageHeader
        breadcrumb="Módulo H"
        title="Modelos de Documento"
        description="Estruturas base usadas na montagem automática — seguem fielmente o modelo em Word e a identidade visual aprovados."
        action={
          <>
            <Button variant="outline" icon={<Upload size={16} />} onClick={() => toast('Importação de .docx tratada pelo backend.', 'info')}>
              Importar .docx
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => toast('Novo modelo — disponível na fase de backend.', 'info')}>
              Novo modelo
            </Button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {MODELOS_DOC.map((m) => (
          <Card key={m.id} className="flex flex-col p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                <FileStack size={19} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-tight text-ink-900">{m.nome}</h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={TONE[m.tipo]}>{m.tipo}</Badge>
                  <Badge tone="gray">
                    <Layers size={9} /> {m.secoes} seções
                  </Badge>
                </div>
              </div>
            </div>

            <p className="mt-3 flex-1 text-[12.5px] text-ink-500">
              Atualizado em {formatDate(m.atualizado)} · cabeçalho D&amp;R, numeração automática de
              seções e bloco de assinatura do responsável técnico.
            </p>

            <div className="mt-3 flex justify-end gap-1 border-t border-ink-100 pt-3">
              <Button
                variant="ghost"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => toast('Modelo duplicado.')}
              >
                Duplicar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil size={14} />}
                onClick={() => toast('Edição de modelo — fase de backend.', 'info')}
              >
                Editar
              </Button>
              <Button size="sm" onClick={() => navigate(DESTINO[m.tipo] ?? '/')}>
                Usar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
