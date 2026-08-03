import { useMemo, useState } from 'react'
import {
  CheckCheck,
  FileDown,
  HelpCircle,
  ListChecks,
  Plus,
  Printer,
  Search,
  Star,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
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
import { Logo } from '@/components/Logo'
import { useApp } from '@/store/AppStore'
import { ORIGENS_QUESITO, TEMAS_QUESITO } from '@/content/quesitos'
import type { Quesito, QuesitoSelecionado } from '@/types'
import { cn, extenso, interpolar, uid } from '@/lib/utils'

// ============================================================
// MÓDULO K — QUESITOS TÉCNICOS (item 17)
//
// Fluxo: cadastrar → selecionar → responder → exportar.
// O banco já vem pré-preenchido; o perito seleciona os
// aplicáveis ao caso, edita as respostas e gera o documento.
// ============================================================

type Etapa = 'selecionar' | 'responder' | 'documento'

export default function Quesitos() {
  const { quesitos, salvarQuesito, pericias, empresaPorId, usuario, salvarDocumento } = useApp()
  const toast = useToast()

  const [etapa, setEtapa] = useState<Etapa>('selecionar')
  const [periciaId, setPericiaId] = useState(pericias[0]?.id ?? '')
  const [tema, setTema] = useState<'todos' | Quesito['tema']>('todos')
  const [origem, setOrigem] = useState<'todas' | Quesito['origem']>('todas')
  const [busca, setBusca] = useState('')
  const [selecionados, setSelecionados] = useState<QuesitoSelecionado[]>([])
  const [novoAberto, setNovoAberto] = useState(false)
  const [novo, setNovo] = useState<Partial<Quesito>>({ tema: 'gerais', origem: 'proprio' })

  const pericia = pericias.find((p) => p.id === periciaId)
  const empresa = pericia
    ? empresaPorId(pericia.reclamadas.find((r) => r.principal)?.empresaId ?? '')
    : undefined

  const dadosCaso = useMemo(
    () => ({
      funcao: pericia?.funcaoReclamante ?? '{{funcao}}',
      admissao: pericia?.admissao ?? '{{admissao}}',
      demissao: pericia?.demissao ?? '{{demissao}}',
      dataVistoria: pericia?.dataVistoria ?? '{{dataVistoria}}',
      horaVistoria: pericia?.horaVistoria ?? '{{horaVistoria}}',
      localVistoria: pericia?.localVistoria ?? '{{localVistoria}}',
    }),
    [pericia],
  )

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return quesitos
      .filter((x) => tema === 'todos' || x.tema === tema)
      .filter((x) => origem === 'todas' || x.origem === origem)
      .filter((x) => !q || [x.pergunta, x.codigo].join(' ').toLowerCase().includes(q))
      .sort((a, b) => Number(b.favorito) - Number(a.favorito))
  }, [quesitos, tema, origem, busca])

  const estaSelecionado = (id: string) => selecionados.some((s) => s.quesitoId === id)

  function alternar(q: Quesito) {
    setSelecionados((s) =>
      estaSelecionado(q.id)
        ? s.filter((x) => x.quesitoId !== q.id).map((x, i) => ({ ...x, ordem: i + 1 }))
        : [
            ...s,
            {
              quesitoId: q.id,
              ordem: s.length + 1,
              pergunta: q.pergunta,
              resposta: interpolar(q.respostaPadrao ?? '', dadosCaso),
            },
          ],
    )
  }

  function selecionarTodosDoFiltro() {
    const novos = lista.filter((q) => !estaSelecionado(q.id))
    setSelecionados((s) => [
      ...s,
      ...novos.map((q, i) => ({
        quesitoId: q.id,
        ordem: s.length + i + 1,
        pergunta: q.pergunta,
        resposta: interpolar(q.respostaPadrao ?? '', dadosCaso),
      })),
    ])
    toast(`${novos.length} quesito(s) adicionado(s).`)
  }

  function criarQuesito() {
    if (!novo.pergunta?.trim()) {
      toast('Digite a pergunta do quesito.', 'error')
      return
    }
    const q: Quesito = {
      id: uid('qst'),
      codigo: `PER-${String(quesitos.length + 1).padStart(3, '0')}`,
      tema: novo.tema as Quesito['tema'],
      origem: novo.origem as Quesito['origem'],
      pergunta: novo.pergunta.trim(),
      respostaPadrao: novo.respostaPadrao ?? '',
      favorito: false,
      usos: 0,
      personalizado: true,
    }
    salvarQuesito(q)
    setNovo({ tema: 'gerais', origem: 'proprio' })
    setNovoAberto(false)
    toast('Quesito cadastrado na sua base.')
  }

  function exportar() {
    selecionados.forEach((s) => {
      const q = quesitos.find((x) => x.id === s.quesitoId)
      if (q) salvarQuesito({ ...q, usos: q.usos + 1 })
    })
    salvarDocumento({
      id: uid('doc'),
      tipo: 'quesitos',
      titulo: `Quesitos Técnicos — ${selecionados.length} quesitos`,
      periciaId: periciaId || '—',
      numeroProcesso: pericia?.numeroProcesso ?? '—',
      reclamante: pericia?.reclamante ?? '—',
      empresaPrincipal: empresa?.nomeFantasia ?? empresa?.razaoSocial ?? '—',
      status: 'finalizado',
      criadoEm: new Date().toISOString().slice(0, 10),
      atualizadoEm: new Date().toISOString().slice(0, 10),
    })
    toast('Quesitos exportados e salvos no histórico.')
  }

  const semResposta = selecionados.filter((s) => !s.resposta.trim()).length

  return (
    <>
      <PageHeader
        breadcrumb="Módulo K · Item 17"
        title="Quesitos Técnicos"
        description="Banco de quesitos pré-cadastrados: selecione os aplicáveis ao caso, responda, edite livremente e exporte o documento."
        action={
          <>
            <Button variant="outline" icon={<Plus size={16} />} onClick={() => setNovoAberto(true)}>
              Novo quesito
            </Button>
            {selecionados.length > 0 && etapa === 'selecionar' && (
              <Button icon={<ListChecks size={16} />} onClick={() => setEtapa('responder')}>
                Responder ({selecionados.length})
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <Tabs
          value={etapa}
          onChange={setEtapa}
          tabs={[
            { value: 'selecionar', label: '1. Selecionar', count: selecionados.length },
            { value: 'responder', label: '2. Responder' },
            { value: 'documento', label: '3. Documento' },
          ]}
        />
        <div className="grid gap-3 p-3 sm:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar quesito por texto ou código…"
              className="h-10 w-full rounded-lg border border-ink-300 pl-9 pr-3 text-sm focus:border-brand-600"
            />
          </div>
          <Select value={tema} onChange={(e) => setTema(e.target.value as typeof tema)}>
            <option value="todos">Todos os temas</option>
            {TEMAS_QUESITO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select value={origem} onChange={(e) => setOrigem(e.target.value as typeof origem)}>
            <option value="todas">Todas as origens</option>
            {ORIGENS_QUESITO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* -------- ETAPA 1 — SELECIONAR -------- */}
      {etapa === 'selecionar' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[13px] text-ink-500">
                {lista.length} quesito(s) no filtro atual
              </p>
              <Button size="sm" variant="ghost" icon={<CheckCheck size={14} />} onClick={selecionarTodosDoFiltro}>
                Selecionar todos do filtro
              </Button>
            </div>

            {lista.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<HelpCircle size={22} />}
                  title="Nenhum quesito encontrado"
                  description="Ajuste os filtros ou cadastre um novo quesito na sua base."
                />
              </Card>
            ) : (
              lista.map((q) => {
                const ativo = estaSelecionado(q.id)
                return (
                  <button
                    key={q.id}
                    onClick={() => alternar(q)}
                    className={cn(
                      'w-full rounded-xl border bg-white p-4 text-left transition-colors',
                      ativo ? 'border-brand-600 bg-brand-50/60' : 'border-ink-200 hover:border-brand-300',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        readOnly
                        checked={ativo}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 accent-brand-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-navy-700">{q.codigo}</span>
                          <Badge tone="gray">
                            {TEMAS_QUESITO.find((t) => t.value === q.tema)?.label}
                          </Badge>
                          <Badge tone="navy">
                            {ORIGENS_QUESITO.find((o) => o.value === q.origem)?.label}
                          </Badge>
                          {q.personalizado && <Badge tone="green">Personalizado</Badge>}
                          {q.usos > 0 && <Badge tone="amber">{q.usos} usos</Badge>}
                        </div>
                        <p className="text-[13.5px] leading-relaxed text-ink-800">{q.pergunta}</p>
                        {q.respostaPadrao && (
                          <p className="mt-1.5 line-clamp-2 border-l-2 border-ink-200 pl-2.5 text-[12.5px] italic leading-relaxed text-ink-500">
                            {q.respostaPadrao}
                          </p>
                        )}
                      </div>
                      <Star
                        size={15}
                        className={cn(
                          'mt-0.5 shrink-0',
                          q.favorito ? 'fill-amber-400 text-amber-400' : 'text-ink-300',
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          salvarQuesito({ ...q, favorito: !q.favorito })
                        }}
                      />
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Painel lateral — selecionados */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardHeader
                title={`Selecionados (${selecionados.length})`}
                subtitle="Arraste a ordem no passo seguinte."
                icon={<ListChecks size={18} />}
              />
              <div className="p-4">
                <Select
                  label="Vincular ao processo"
                  value={periciaId}
                  onChange={(e) => setPericiaId(e.target.value)}
                  hint="As variáveis do caso são preenchidas automaticamente."
                >
                  <option value="">— sem vínculo —</option>
                  {pericias.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.numeroProcesso} — {p.reclamante}
                    </option>
                  ))}
                </Select>

                {selecionados.length === 0 ? (
                  <p className="mt-4 text-[13px] text-ink-400">
                    Nenhum quesito selecionado ainda.
                  </p>
                ) : (
                  <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
                    {selecionados.map((s) => (
                      <li
                        key={s.quesitoId}
                        className="flex items-start gap-2 rounded-lg bg-ink-50 px-2.5 py-2 text-[12px]"
                      >
                        <span className="font-bold text-navy-700">{s.ordem}.</span>
                        <span className="line-clamp-2 flex-1 text-ink-600">{s.pergunta}</span>
                        <button
                          onClick={() =>
                            setSelecionados((v) =>
                              v
                                .filter((x) => x.quesitoId !== s.quesitoId)
                                .map((x, i) => ({ ...x, ordem: i + 1 })),
                            )
                          }
                          className="shrink-0 text-ink-400 hover:text-red-600"
                          aria-label="Remover"
                        >
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  className="mt-4 w-full"
                  disabled={!selecionados.length}
                  onClick={() => setEtapa('responder')}
                >
                  Responder quesitos
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* -------- ETAPA 2 — RESPONDER -------- */}
      {etapa === 'responder' && (
        <div className="space-y-3">
          {selecionados.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ListChecks size={22} />}
                title="Nenhum quesito selecionado"
                description="Volte ao passo 1 e selecione os quesitos aplicáveis ao caso."
                action={<Button onClick={() => setEtapa('selecionar')}>Selecionar quesitos</Button>}
              />
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-navy-200 bg-navy-50 px-4 py-2.5 text-[13px] text-navy-800">
                <span>
                  <strong>{selecionados.length}</strong> quesitos ·{' '}
                  {semResposta > 0 ? (
                    <span className="text-amber-700">{semResposta} sem resposta</span>
                  ) : (
                    <span className="text-brand-700">todos respondidos</span>
                  )}
                </span>
                <Button size="sm" icon={<Wand2 size={14} />} onClick={() => setEtapa('documento')}>
                  Montar documento
                </Button>
              </div>

              {selecionados.map((s, i) => (
                <Card key={s.quesitoId} className="p-4">
                  <div className="mb-2 flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[12px] font-bold text-white">
                      {i + 1}
                    </span>
                    <Textarea
                      rows={2}
                      className="flex-1 font-medium"
                      value={s.pergunta}
                      onChange={(e) =>
                        setSelecionados((v) =>
                          v.map((x) =>
                            x.quesitoId === s.quesitoId ? { ...x, pergunta: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      icon={<Trash2 size={14} />}
                      onClick={() =>
                        setSelecionados((v) =>
                          v
                            .filter((x) => x.quesitoId !== s.quesitoId)
                            .map((x, k) => ({ ...x, ordem: k + 1 })),
                        )
                      }
                      aria-label="Remover quesito"
                    />
                  </div>
                  <div className="pl-9">
                    <Textarea
                      label="Resposta"
                      rows={4}
                      value={s.resposta}
                      onChange={(e) =>
                        setSelecionados((v) =>
                          v.map((x) =>
                            x.quesitoId === s.quesitoId ? { ...x, resposta: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="Digite a resposta técnica…"
                      hint="As variáveis {{campo}} são substituídas pelos dados do processo vinculado."
                    />
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* -------- ETAPA 3 — DOCUMENTO -------- */}
      {etapa === 'documento' && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3 no-print">
            <Card>
              <CardHeader title="Exportar" icon={<FileDown size={18} />} />
              <div className="space-y-2 p-4">
                <Button className="w-full" icon={<Printer size={15} />} onClick={() => window.print()}>
                  Gerar PDF
                </Button>
                <Button variant="outline" className="w-full" icon={<FileDown size={15} />} onClick={exportar}>
                  Salvar no histórico
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setEtapa('responder')}>
                  Voltar e editar
                </Button>
              </div>
            </Card>
            <div className="rounded-lg border border-ink-200 bg-white p-4 text-[12.5px] text-ink-500">
              <p className="font-semibold text-ink-700">Resumo</p>
              <p className="mt-1">{selecionados.length} quesitos respondidos</p>
              <p>{pericia ? `Processo ${pericia.numeroProcesso}` : 'Sem vínculo com processo'}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl bg-ink-100 p-4 lg:p-6">
            <article className="doc-sheet mx-auto w-full max-w-[820px] bg-white px-10 py-12 shadow-card print-area sm:px-14">
              <header className="mb-10 border-b-2 border-brand-700 pb-5 text-center">
                <Logo size="lg" />
                <p className="mt-3 text-[9pt] font-bold uppercase tracking-[0.2em] text-navy-600">
                  Plataforma Inteligente de Perícia Trabalhista
                </p>
              </header>

              <h1>Quesitos Técnicos</h1>

              {pericia && (
                <table>
                  <tbody>
                    <tr>
                      <th className="w-[30%]">Processo nº</th>
                      <td>{pericia.numeroProcesso}</td>
                    </tr>
                    <tr>
                      <th>Vara</th>
                      <td>{pericia.vara}</td>
                    </tr>
                    <tr>
                      <th>Reclamante</th>
                      <td>{pericia.reclamante}</td>
                    </tr>
                    <tr>
                      <th>Reclamada</th>
                      <td>{empresa?.razaoSocial ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              <h2>Quesitos e Respostas</h2>
              {selecionados.map((s, i) => (
                <div key={s.quesitoId} className="mb-5">
                  <p className="no-indent font-bold">
                    {i + 1}. {s.pergunta}
                  </p>
                  <p className="mt-1">
                    <strong>Resposta: </strong>
                    {s.resposta || '[resposta não preenchida]'}
                  </p>
                </div>
              ))}

              <p className="mt-10 no-indent text-center">
                {pericia?.comarca ?? 'São Paulo/SP'}, {extenso(new Date().toISOString().slice(0, 10))}.
              </p>

              <div className="mt-14 text-center">
                <div className="mx-auto w-72 border-t border-ink-800 pt-1.5">
                  <p className="no-indent font-bold">{usuario?.nome}</p>
                  <p className="no-indent text-[10pt]">{usuario?.titulo}</p>
                  <p className="no-indent text-[10pt]">{usuario?.registroProfissional}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* Modal — cadastrar novo quesito */}
      <Modal
        open={novoAberto}
        onClose={() => setNovoAberto(false)}
        title="Cadastrar quesito"
        subtitle="O quesito fica salvo na sua base e pode ser reutilizado em qualquer processo."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNovoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={criarQuesito}>Cadastrar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tema"
              value={novo.tema}
              onChange={(e) => setNovo((n) => ({ ...n, tema: e.target.value as Quesito['tema'] }))}
            >
              {TEMAS_QUESITO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select
              label="Origem"
              value={novo.origem}
              onChange={(e) => setNovo((n) => ({ ...n, origem: e.target.value as Quesito['origem'] }))}
            >
              {ORIGENS_QUESITO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Pergunta"
            required
            rows={3}
            value={novo.pergunta ?? ''}
            onChange={(e) => setNovo((n) => ({ ...n, pergunta: e.target.value }))}
          />
          <Textarea
            label="Resposta padrão (opcional)"
            rows={4}
            value={novo.respostaPadrao ?? ''}
            onChange={(e) => setNovo((n) => ({ ...n, respostaPadrao: e.target.value }))}
            hint="Use {{funcao}}, {{admissao}}, {{dataVistoria}} para preenchimento automático."
          />
          <Input label="Código" value="gerado automaticamente" disabled />
        </div>
      </Modal>
    </>
  )
}
