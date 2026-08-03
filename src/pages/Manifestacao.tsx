import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  FileDown,
  MessageSquareText,
  Printer,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Thermometer,
  Volume2,
  Zap,
  Biohazard,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { Logo } from '@/components/Logo'
import { useApp } from '@/store/AppStore'
import * as api from '@/services/api'
import {
  AGENTES_MANIFESTACAO,
  ENCERRAMENTO_PADRAO,
  POSICIONAMENTOS,
  montarModelo,
} from '@/content/manifestacao'
import type { AgenteManifestacao, ModeloManifestacao, PosicionamentoManifestacao } from '@/types'
import { cn, extenso, uid } from '@/lib/utils'

// ============================================================
// MÓDULO L — MANIFESTAÇÃO AO LAUDO (item 18)
//
// Seleciona o agente (Ruído · Calor · Biológico · Periculosidade)
// e o posicionamento — o sistema monta o documento automaticamente.
//   18.1 Concordância com o laudo (texto padrão pronto)
//   18.2 Impugnação ao laudo (modelos prontos editáveis)
//   18.3 Impugnação ao esclarecimento (continuação da impugnação)
// ============================================================

const ICONES: Record<AgenteManifestacao, typeof Volume2> = {
  ruido: Volume2,
  calor: Thermometer,
  biologico: Biohazard,
  periculosidade: Zap,
}

export default function Manifestacao() {
  const { posicionamento: posParam } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { pericias, empresaPorId, usuario, salvarDocumento } = useApp()

  const [agente, setAgente] = useState<AgenteManifestacao | null>(null)
  const [posicionamento, setPosicionamento] = useState<PosicionamentoManifestacao>(
    (posParam as PosicionamentoManifestacao) ?? 'concordancia',
  )
  const [periciaId, setPericiaId] = useState(pericias[0]?.id ?? '')
  const [modelo, setModelo] = useState<ModeloManifestacao | null>(null)
  const [encerramento, setEncerramento] = useState('')
  const [montado, setMontado] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  /** Salvar de novo atualiza o mesmo documento em vez de duplicar. */
  const [documentoId, setDocumentoId] = useState<string | null>(null)

  useEffect(() => {
    if (posParam) setPosicionamento(posParam as PosicionamentoManifestacao)
  }, [posParam])

  const pericia = pericias.find((p) => p.id === periciaId)
  const empresa = pericia
    ? empresaPorId(pericia.reclamadas.find((r) => r.principal)?.empresaId ?? '')
    : undefined

  const posInfo = POSICIONAMENTOS.find((p) => p.value === posicionamento)!

  function montar() {
    if (!agente) {
      toast('Selecione o agente avaliado.', 'error')
      return
    }
    const m = montarModelo(agente, posicionamento)
    setModelo(m)
    setEncerramento(ENCERRAMENTO_PADRAO[posicionamento])
    setMontado(true)
    toast(
      posicionamento === 'concordancia'
        ? 'Texto padrão carregado — o documento já está pronto.'
        : 'Modelos carregados. Selecione e edite os argumentos.',
    )
  }

  const blocosAtivos = useMemo(
    () => modelo?.blocos.filter((b) => b.selecionado) ?? [],
    [modelo],
  )

  /**
   * Grava o documento com os argumentos selecionados dentro — é o
   * que permite reabrir a impugnação e continuar de onde parou.
   */
  async function salvar(silencioso = false): Promise<string | null> {
    if (!modelo || !agente) return null

    const hoje = new Date().toISOString().slice(0, 10)
    try {
      const doc = await salvarDocumento({
        id: documentoId ?? uid('doc'),
        tipo: posicionamento === 'concordancia' ? 'manifestacao' : 'impugnacao',
        titulo: modelo.titulo,
        periciaId: periciaId || '—',
        numeroProcesso: pericia?.numeroProcesso ?? '—',
        reclamante: pericia?.reclamante ?? '—',
        empresaPrincipal: empresa?.nomeFantasia ?? empresa?.razaoSocial ?? '—',
        status: 'finalizado',
        conteudo: {
          agente,
          posicionamento,
          fundamentacao: modelo.fundamentacao,
          blocos: blocosAtivos.map((b) => ({ titulo: b.titulo, conteudo: b.conteudo })),
          encerramento,
        },
        criadoEm: hoje,
        atualizadoEm: hoje,
      })

      setDocumentoId(doc.id)
      if (!silencioso) toast('Documento salvo no histórico.')
      return doc.id
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar o documento.', 'error')
      return null
    }
  }

  /** Módulo H — PDF montado no servidor. */
  async function gerarPdf() {
    if (api.API_MODE !== 'rest') {
      window.print()
      return
    }

    setGerandoPdf(true)
    try {
      const docId = await salvar(true)
      if (!docId) return
      const { blob, nome } = await api.documentos.gerarPdf(docId)
      api.salvarArquivo(blob, nome)
      toast('PDF gerado.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Falha ao gerar o PDF.', 'error')
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={`Módulo L · Item ${posInfo.item}`}
        title={posInfo.label}
        description={posInfo.descricao}
        action={
          montado && (
            <>
              <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={() => setMontado(false)}>
                Refazer
              </Button>
              <Button variant="outline" icon={<Save size={16} />} onClick={() => void salvar()}>
                Salvar
              </Button>
              <Button icon={<Printer size={16} />} loading={gerandoPdf} onClick={() => void gerarPdf()}>
                Gerar PDF
              </Button>
            </>
          )
        }
      />

      {/* ---------- Configuração ---------- */}
      {!montado && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="1. Posicionamento"
              subtitle="Define a natureza do documento a ser produzido."
              icon={<MessageSquareText size={18} />}
            />
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {POSICIONAMENTOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPosicionamento(p.value)
                    navigate(`/manifestacao/${p.value}`, { replace: true })
                  }}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    posicionamento === p.value
                      ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                      : 'border-ink-200 hover:border-brand-300',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Badge tone={posicionamento === p.value ? 'green' : 'gray'}>Item {p.item}</Badge>
                    {posicionamento === p.value && <Check size={16} className="text-brand-700" />}
                  </div>
                  <p className="mt-2 font-semibold text-ink-900">{p.label}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{p.descricao}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="2. Agente avaliado"
              subtitle="O sistema monta o documento automaticamente conforme o agente selecionado."
              icon={<ShieldAlert size={18} />}
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {AGENTES_MANIFESTACAO.map((a) => {
                const Icone = ICONES[a.value]
                const ativo = agente === a.value
                return (
                  <button
                    key={a.value}
                    onClick={() => setAgente(a.value)}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-colors',
                      ativo ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-ink-200 hover:border-brand-300',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        ativo ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-500',
                      )}
                    >
                      <Icone size={19} strokeWidth={1.9} />
                    </span>
                    <p className="mt-3 font-semibold text-ink-900">{a.label}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-navy-700">{a.norma}</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{a.descricao}</p>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="3. Processo vinculado" subtitle="Os dados do caso alimentam o cabeçalho." />
            <div className="p-5">
              <Select value={periciaId} onChange={(e) => setPericiaId(e.target.value)}>
                <option value="">— sem vínculo —</option>
                {pericias.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.numeroProcesso} — {p.reclamante}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" icon={<Sparkles size={17} />} onClick={montar} disabled={!agente}>
              Montar documento automaticamente
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Edição + Preview ---------- */}
      {montado && modelo && (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3 no-print lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
            <Card>
              <CardHeader
                title="Argumentos"
                subtitle={`${blocosAtivos.length} de ${modelo.blocos.length} selecionados`}
                icon={<MessageSquareText size={18} />}
              />
              <div className="space-y-3 p-4">
                {modelo.blocos.map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      b.selecionado ? 'border-brand-400 bg-brand-50/50' : 'border-ink-200',
                    )}
                  >
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={b.selecionado}
                        onChange={() =>
                          setModelo({
                            ...modelo,
                            blocos: modelo.blocos.map((x) =>
                              x.id === b.id ? { ...x, selecionado: !x.selecionado } : x,
                            ),
                          })
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-brand-700"
                      />
                      <span className="text-[13px] font-semibold text-ink-800">{b.titulo}</span>
                    </label>
                    {b.selecionado && (
                      <Textarea
                        className="mt-2 text-[12.5px]"
                        rows={5}
                        value={b.conteudo}
                        onChange={(e) =>
                          setModelo({
                            ...modelo,
                            blocos: modelo.blocos.map((x) =>
                              x.id === b.id ? { ...x, conteudo: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Fundamentação legal" />
              <div className="p-4">
                <Textarea
                  rows={5}
                  className="text-[12.5px]"
                  value={modelo.fundamentacao}
                  onChange={(e) => setModelo({ ...modelo, fundamentacao: e.target.value })}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Encerramento / requerimento" />
              <div className="p-4">
                <Textarea
                  rows={4}
                  className="text-[12.5px]"
                  value={encerramento}
                  onChange={(e) => setEncerramento(e.target.value)}
                />
              </div>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                icon={<FileDown size={15} />}
                onClick={() => void salvar()}
              >
                Salvar
              </Button>
              <Button
                className="flex-1"
                icon={<Printer size={15} />}
                loading={gerandoPdf}
                onClick={() => void gerarPdf()}
              >
                Gerar PDF
              </Button>
            </div>
          </div>

          {/* Preview — folha única */}
          <div className="overflow-x-auto rounded-xl bg-ink-100 p-4 lg:p-6">
            <article className="doc-sheet mx-auto w-full max-w-[820px] bg-white px-10 py-12 shadow-card print-area sm:px-14">
              <header className="mb-8 border-b-2 border-brand-700 pb-5 text-center">
                <Logo size="lg" />
                <p className="mt-3 text-[9pt] font-bold uppercase tracking-[0.2em] text-navy-600">
                  Plataforma Inteligente de Perícia Trabalhista
                </p>
              </header>

              <h1>{modelo.titulo}</h1>

              {pericia && (
                <>
                  <p className="no-indent font-bold">
                    EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO
                  </p>
                  <p className="no-indent mb-5 font-bold uppercase">{pericia.vara}</p>

                  <table>
                    <tbody>
                      <tr>
                        <th className="w-[30%]">Processo nº</th>
                        <td>{pericia.numeroProcesso}</td>
                      </tr>
                      <tr>
                        <th>Reclamante</th>
                        <td>{pericia.reclamante}</td>
                      </tr>
                      <tr>
                        <th>Reclamada</th>
                        <td>{empresa?.razaoSocial ?? '—'}</td>
                      </tr>
                      <tr>
                        <th>Agente objeto</th>
                        <td>{AGENTES_MANIFESTACAO.find((a) => a.value === modelo.agente)?.label}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2>I — Fundamentação Técnica</h2>
              <p>{modelo.fundamentacao}</p>

              <h2>
                II —{' '}
                {posicionamento === 'concordancia'
                  ? 'Razões da Concordância'
                  : 'Razões da Impugnação'}
              </h2>
              {blocosAtivos.length === 0 ? (
                <p className="italic text-ink-400">[Selecione ao menos um argumento]</p>
              ) : (
                blocosAtivos.map((b, i) => (
                  <div key={b.id} className="mb-4">
                    <h3>
                      {i + 1}. {b.titulo}
                    </h3>
                    <p>{b.conteudo}</p>
                  </div>
                ))
              )}

              <h2>III — Requerimento</h2>
              <p>{encerramento}</p>

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
    </>
  )
}
