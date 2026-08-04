import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CircleAlert,
  FileCheck2,
  FileText,
  HelpCircle,
  History,
  MessageSquareText,
  Plus,
  ScrollText,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { useApp } from '@/store/AppStore'
import { formatDate } from '@/lib/utils'

// ============================================================
// INÍCIO — replica a tela de referência do Contratante:
// os 6 tipos de documento como atalhos principais.
// ============================================================

const DOCUMENTOS_MENU = [
  {
    to: '/pericias/nova?tipo=parecer',
    icon: FileText,
    titulo: 'Parecer Técnico Pericial',
    desc: 'Documento completo com vistoria, agentes, fotos e conclusão.',
    modulo: 'Módulos C–H',
  },
  {
    to: '/pericias/nova?tipo=laudo',
    icon: FileCheck2,
    titulo: 'Laudo Técnico Pericial',
    desc: 'Mesma estrutura do parecer, com título de laudo judicial.',
    modulo: 'Módulos C–H',
  },
  {
    to: '/quesitos',
    icon: HelpCircle,
    titulo: 'Quesitos Técnicos',
    desc: 'Selecione quesitos pré-cadastrados, responda e exporte.',
    modulo: 'Módulo K',
  },
  {
    to: '/manifestacao/concordancia',
    icon: MessageSquareText,
    titulo: 'Manifestação ao Laudo',
    desc: 'Folha única com texto padrão de concordância pronto.',
    modulo: 'Item 18.1',
  },
  {
    to: '/manifestacao/impugnacao_laudo',
    icon: ShieldAlert,
    titulo: 'Impugnações de Laudos',
    desc: 'Modelos prontos e editáveis por agente avaliado.',
    modulo: 'Item 18.2',
  },
  {
    to: '/esclarecimentos',
    icon: ScrollText,
    titulo: 'Esclarecimentos Técnicos',
    desc: 'Extensão do parecer para responder ao Juízo e às partes.',
    modulo: 'Item 18.3',
  },
]

export default function Inicio() {
  const { usuario, pericias, documentos, empresas } = useApp()
  const navigate = useNavigate()

  const emAndamento = pericias.filter((p) => p.status === 'em_andamento').length
  const rascunhos = documentos.filter((d) => d.status === 'rascunho').length
  const finalizados = documentos.filter((d) => d.status !== 'rascunho').length

  const stats = [
    { label: 'Perícias em andamento', valor: emAndamento, icon: TrendingUp, tone: 'text-brand-700 bg-brand-50' },
    { label: 'Documentos gerados', valor: documentos.length, icon: FileText, tone: 'text-navy-600 bg-navy-50' },
    { label: 'Rascunhos pendentes', valor: rascunhos, icon: CircleAlert, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Empresas cadastradas', valor: empresas.length, icon: FileCheck2, tone: 'text-ink-700 bg-ink-100' },
  ]

  const recentes = [...documentos]
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    .slice(0, 5)

  /**
   * Perícias que ainda não foram concluídas, da mais recente para
   * a mais antiga. Sem isto, quem salvava um rascunho e saía da
   * tela não tinha no painel nenhum caminho de volta — só atalhos
   * para começar do zero.
   */
  const emAberto = [...pericias]
    .filter((p) => p.status === 'rascunho' || p.status === 'em_andamento')
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    .slice(0, 5)

  return (
    <>
      <PageHeader
        breadcrumb="Painel"
        title={`Bem-vindo, ${usuario?.nome.split(' ')[0]}`}
        description="Elaboração de documentos técnicos com agilidade e precisão."
        action={
          <Button icon={<Plus size={16} />} onClick={() => navigate('/pericias/nova')}>
            Nova perícia
          </Button>
        }
      />

      {/* Indicadores */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-medium leading-tight text-ink-500">{s.label}</p>
                <p className="mt-2 text-[28px] font-bold leading-none text-ink-900">{s.valor}</p>
              </div>
              <span className={`rounded-lg p-2 ${s.tone}`}>
                <s.icon size={18} strokeWidth={2} />
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Retomada — o caminho de volta para o trabalho salvo */}
      {emAberto.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader
            title="Continuar de onde parou"
            subtitle="Perícias salvas que ainda não foram concluídas"
            icon={<History size={19} />}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/pericias')}>
                Ver todas
              </Button>
            }
          />
          <div className="divide-y divide-ink-100">
            {emAberto.map((p) => (
              <Link
                key={p.id}
                to={`/pericias/${p.id}`}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">
                      {p.reclamante || '(sem reclamante)'}
                    </span>
                    <Badge tone={p.status === 'rascunho' ? 'amber' : 'navy'}>
                      {p.status === 'rascunho' ? 'Rascunho' : 'Em andamento'}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block font-mono text-[12.5px] text-ink-500">
                    {p.numeroProcesso || '(sem número de processo)'}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-400">
                    Salva em {formatDate(p.atualizadoEm)}
                  </span>
                </span>
                <span className="hidden shrink-0 text-[13px] font-semibold text-brand-700 sm:block">
                  Continuar
                </span>
                <ArrowRight
                  size={17}
                  className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
                />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Atalhos de documentos — reproduz a tela de referência */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader
          title="Elaboração de Documentos Técnicos"
          subtitle="Escolha o tipo de documento para iniciar"
          icon={<FileText size={19} />}
        />
        <div className="divide-y divide-ink-100">
          {DOCUMENTOS_MENU.map((d) => (
            <Link
              key={d.titulo}
              to={d.to}
              className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-brand-700 transition-colors group-hover:border-brand-300 group-hover:bg-brand-50">
                <d.icon size={19} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-900">{d.titulo}</span>
                  <Badge tone="gray">{d.modulo}</Badge>
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-500">{d.desc}</span>
              </span>
              <ArrowRight
                size={17}
                className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
              />
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-4">
        {/* Documentos recentes — Módulo J */}
        <Card>
          <CardHeader
            title="Documentos recentes"
            subtitle={`${finalizados} finalizados · ${rascunhos} em rascunho`}
            icon={<FileCheck2 size={18} />}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/documentos')}>
                Ver todos
              </Button>
            }
          />
          <div className="divide-y divide-ink-100">
            {recentes.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink-800">{d.titulo}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {d.numeroProcesso} · {d.reclamante}
                  </p>
                </div>
                <Badge
                  tone={d.status === 'rascunho' ? 'amber' : d.status === 'enviado' ? 'navy' : 'green'}
                >
                  {d.status === 'rascunho' ? 'Rascunho' : d.status === 'enviado' ? 'Enviado' : 'Finalizado'}
                </Badge>
                <span className="hidden w-20 shrink-0 text-right text-xs text-ink-400 sm:block">
                  {formatDate(d.atualizadoEm)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
