import { useState } from 'react'
import { FileDown, Plus, Printer, ScrollText, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Input, Select, Textarea, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { Logo } from '@/components/Logo'
import { useApp } from '@/store/AppStore'
import { AGENTES_MANIFESTACAO } from '@/content/manifestacao'
import type { AgenteManifestacao } from '@/types'
import { extenso, uid } from '@/lib/utils'

// ============================================================
// ESCLARECIMENTOS TÉCNICOS (item 18.3 — mesma lógica da
// impugnação: extensão do Parecer Técnico com argumentação
// pontual sobre os quesitos suscitados).
// ============================================================

interface Ponto {
  id: string
  origem: 'juizo' | 'reclamante' | 'reclamada'
  questionamento: string
  resposta: string
}

const RESPOSTAS_PADRAO: Record<AgenteManifestacao, string> = {
  ruido:
    'Reitera-se que a avaliação da exposição ao ruído observou integralmente o Anexo 1 da NR-15 e a NHO-01 da FUNDACENTRO, tendo sido adotados circuito de compensação "A", resposta lenta, critério de referência de 85 dB(A) e incremento de duplicação q=5. A memória de cálculo e o certificado de calibração do instrumento encontram-se anexos, não subsistindo a alegação de vício metodológico.',
  calor:
    'Esclarece-se que a avaliação da sobrecarga térmica foi realizada pelo IBUTG, nos termos do Anexo 3 da NR-15 com redação da Portaria SEPRT nº 1.359/2019, com enquadramento da taxa metabólica compatível com as atividades efetivamente desempenhadas e medição realizada na condição mais desfavorável verificada na rotina de trabalho.',
  biologico:
    'Esclarece-se que a caracterização do agente biológico decorre de avaliação exclusivamente qualitativa, nos termos do Anexo 14 da NR-15, tendo sido constatado contato permanente e inerente à rotina de trabalho com os agentes descritos na norma, circunstância confirmada tanto na inspeção quanto na documentação apresentada pela Reclamada.',
  periculosidade:
    'Esclarece-se que a delimitação da área de risco observou rigorosamente os quadros e as distâncias do Anexo 2 da NR-16, considerando os volumes efetivamente armazenados no local. Registre-se ainda que, nos termos da Súmula 364, I, do C. TST, o ingresso habitual em área de risco caracteriza a periculosidade ainda que a exposição seja intermitente.',
}

export default function Esclarecimento() {
  const { pericias, empresaPorId, usuario, salvarDocumento } = useApp()
  const toast = useToast()

  const [periciaId, setPericiaId] = useState(pericias[0]?.id ?? '')
  const [agente, setAgente] = useState<AgenteManifestacao>('ruido')
  const [referencia, setReferencia] = useState('')
  const [introducao, setIntroducao] = useState(
    'O signatário, Perito nomeado nos autos em epígrafe, tendo sido intimado a prestar esclarecimentos acerca do laudo pericial anteriormente apresentado, vem, respeitosamente, manifestar-se nos seguintes termos, ratificando integralmente a metodologia empregada e as conclusões técnicas ali lançadas, salvo quanto aos pontos expressamente retificados adiante.',
  )
  const [pontos, setPontos] = useState<Ponto[]>([
    { id: uid('pt'), origem: 'juizo', questionamento: '', resposta: '' },
  ])
  const [conclusao, setConclusao] = useState(
    'Ante o exposto, o signatário RATIFICA integralmente as conclusões constantes do laudo pericial, esclarecendo os pontos suscitados na forma acima, e coloca-se novamente à disposição deste MM. Juízo para eventuais complementações.',
  )

  const pericia = pericias.find((p) => p.id === periciaId)
  const empresa = pericia
    ? empresaPorId(pericia.reclamadas.find((r) => r.principal)?.empresaId ?? '')
    : undefined

  function preencherAutomatico() {
    setPontos((ps) =>
      ps.map((p) => (p.resposta.trim() ? p : { ...p, resposta: RESPOSTAS_PADRAO[agente] })),
    )
    toast('Respostas padrão carregadas para os pontos em branco.')
  }

  function salvar() {
    salvarDocumento({
      id: uid('doc'),
      tipo: 'esclarecimento',
      titulo: `Esclarecimentos Técnicos — ${AGENTES_MANIFESTACAO.find((a) => a.value === agente)?.label}`,
      periciaId: periciaId || '—',
      numeroProcesso: pericia?.numeroProcesso ?? '—',
      reclamante: pericia?.reclamante ?? '—',
      empresaPrincipal: empresa?.nomeFantasia ?? empresa?.razaoSocial ?? '—',
      status: 'finalizado',
      criadoEm: new Date().toISOString().slice(0, 10),
      atualizadoEm: new Date().toISOString().slice(0, 10),
    })
    toast('Esclarecimentos salvos no histórico.')
  }

  const ORIGEM_LABEL = {
    juizo: 'Do MM. Juízo',
    reclamante: 'Do Reclamante',
    reclamada: 'Da Reclamada',
  }

  return (
    <>
      <PageHeader
        breadcrumb="Item 18.3"
        title="Esclarecimentos Técnicos"
        description="Extensão do Parecer Técnico — responde pontualmente aos questionamentos do Juízo e das partes, mantendo os dados do mesmo caso."
        action={
          <>
            <Button variant="outline" icon={<FileDown size={16} />} onClick={salvar}>
              Salvar
            </Button>
            <Button icon={<Printer size={16} />} onClick={() => window.print()}>
              Gerar PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="space-y-3 no-print lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
          <Card>
            <CardHeader title="Identificação" icon={<ScrollText size={18} />} />
            <div className="space-y-4 p-4">
              <Select label="Processo" value={periciaId} onChange={(e) => setPericiaId(e.target.value)}>
                <option value="">— sem vínculo —</option>
                {pericias.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.numeroProcesso} — {p.reclamante}
                  </option>
                ))}
              </Select>
              <Select
                label="Agente objeto do esclarecimento"
                value={agente}
                onChange={(e) => setAgente(e.target.value as AgenteManifestacao)}
              >
                {AGENTES_MANIFESTACAO.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Referência (ID do laudo / petição)"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ex.: Id. 4a7b2c1 — manifestação da reclamada"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Introdução" />
            <div className="p-4">
              <Textarea rows={5} className="text-[12.5px]" value={introducao} onChange={(e) => setIntroducao(e.target.value)} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Pontos a esclarecer"
              subtitle={`${pontos.length} questionamento(s)`}
              action={
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" icon={<Sparkles size={14} />} onClick={preencherAutomatico}>
                    Preencher
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Plus size={14} />}
                    onClick={() =>
                      setPontos((p) => [...p, { id: uid('pt'), origem: 'juizo', questionamento: '', resposta: '' }])
                    }
                  >
                    Novo
                  </Button>
                </div>
              }
            />
            <div className="space-y-3 p-4">
              {pontos.map((pt, i) => (
                <div key={pt.id} className="rounded-lg border border-ink-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge tone="navy">Ponto {i + 1}</Badge>
                    <div className="flex items-center gap-2">
                      <select
                        value={pt.origem}
                        onChange={(e) =>
                          setPontos((v) =>
                            v.map((x) => (x.id === pt.id ? { ...x, origem: e.target.value as Ponto['origem'] } : x)),
                          )
                        }
                        className="h-7 rounded border border-ink-300 px-2 text-[12px]"
                      >
                        <option value="juizo">Do Juízo</option>
                        <option value="reclamante">Do Reclamante</option>
                        <option value="reclamada">Da Reclamada</option>
                      </select>
                      <button
                        onClick={() => setPontos((v) => v.filter((x) => x.id !== pt.id))}
                        className="text-red-600 hover:opacity-70"
                        aria-label="Remover ponto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    label="Questionamento"
                    rows={2}
                    className="text-[12.5px]"
                    value={pt.questionamento}
                    onChange={(e) =>
                      setPontos((v) => v.map((x) => (x.id === pt.id ? { ...x, questionamento: e.target.value } : x)))
                    }
                  />
                  <Textarea
                    label="Esclarecimento"
                    rows={4}
                    className="mt-2 text-[12.5px]"
                    value={pt.resposta}
                    onChange={(e) =>
                      setPontos((v) => v.map((x) => (x.id === pt.id ? { ...x, resposta: e.target.value } : x)))
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Conclusão" />
            <div className="p-4">
              <Textarea rows={4} className="text-[12.5px]" value={conclusao} onChange={(e) => setConclusao(e.target.value)} />
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="overflow-x-auto rounded-xl bg-ink-100 p-4 lg:p-6">
          <article className="doc-sheet mx-auto w-full max-w-[820px] bg-white px-10 py-12 shadow-card print-area sm:px-14">
            <header className="mb-8 border-b-2 border-brand-700 pb-5 text-center">
              <Logo size="lg" />
              <p className="mt-3 text-[9pt] font-bold uppercase tracking-[0.2em] text-navy-600">
                Plataforma Inteligente de Perícia Trabalhista
              </p>
            </header>

            <h1>Esclarecimentos Técnicos</h1>

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
                      <td>{AGENTES_MANIFESTACAO.find((a) => a.value === agente)?.label}</td>
                    </tr>
                    {referencia && (
                      <tr>
                        <th>Referência</th>
                        <td>{referencia}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            <h2>I — Da Intimação</h2>
            <p>{introducao}</p>

            <h2>II — Dos Esclarecimentos Prestados</h2>
            {pontos.map((pt, i) => (
              <div key={pt.id} className="mb-5">
                <h3>
                  {i + 1}. Questionamento {ORIGEM_LABEL[pt.origem]}
                </h3>
                <p className="italic">{pt.questionamento || '[questionamento não informado]'}</p>
                <p>
                  <strong>Esclarecimento: </strong>
                  {pt.resposta || '[esclarecimento não preenchido]'}
                </p>
              </div>
            ))}

            <h2>III — Conclusão</h2>
            <p>{conclusao}</p>

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
    </>
  )
}
