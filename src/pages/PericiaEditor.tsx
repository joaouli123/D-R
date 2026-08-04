import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Camera,
  FileDown,
  FileText,
  ImagePlus,
  Mail,
  Paperclip,
  Plus,
  Printer,
  Save,
  Trash2,
  Users,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Input,
  Modal,
  Select,
  Stepper,
  Textarea,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { BibliotecaDrawer } from '@/components/BibliotecaDrawer'
import { DocumentoPreview } from '@/components/DocumentoPreview'
import { useApp } from '@/store/AppStore'
import * as api from '@/services/api'
import type {
  AgenteAvaliado,
  Foto,
  Participante,
  Pericia,
  PeriodoFuncao,
  SecaoFoto,
  SecaoTexto,
  Usuario,
} from '@/types'
import { ANEXOS_NR15 } from '@/content/anexosNr15'
import { maskProcesso, uid } from '@/lib/utils'

// ============================================================
// MÓDULOS C · D · E · F · G · H · I
// Cadastro de perícia → preenchimento técnico → fotos →
// conclusão → geração, exportação e envio do documento.
// ============================================================

const PASSOS = [
  { label: 'Processo', description: 'Módulo C' },
  { label: 'Preenchimento', description: 'Módulo D' },
  { label: 'Agentes', description: 'Módulo D' },
  { label: 'Fotografias', description: 'Módulo E' },
  { label: 'Conclusão', description: 'Módulo D' },
  { label: 'Documento', description: 'Módulos G–I' },
]

const SECOES_FOTO: { value: SecaoFoto; label: string }[] = [
  { value: 'ambiente', label: 'Ambiente de trabalho' },
  { value: 'atividades', label: 'Atividades desenvolvidas' },
  { value: 'equipamentos', label: 'Equipamentos e máquinas' },
  { value: 'epi', label: 'EPIs utilizados' },
  { value: 'produtos', label: 'Produtos químicos' },
  { value: 'documentos', label: 'Documentos apresentados' },
]

const PAPEIS: { value: Participante['papel']; label: string }[] = [
  { value: 'perito_judicial', label: 'Perito Judicial' },
  { value: 'assistente_reclamante', label: 'Assistente Técnico do Reclamante' },
  { value: 'assistente_reclamada', label: 'Assistente Técnico da Reclamada' },
  { value: 'advogado_reclamante', label: 'Advogado do Reclamante' },
  { value: 'advogado_reclamada', label: 'Advogado da Reclamada' },
  { value: 'preposto', label: 'Preposto' },
  { value: 'acompanhante', label: 'Acompanhante' },
]

function novaPericia(responsavelId: string): Pericia {
  const hoje = new Date().toISOString().slice(0, 10)
  return {
    id: uid('per'),
    numeroProcesso: '',
    vara: '',
    comarca: '',
    reclamante: '',
    cpfReclamante: '',
    funcaoReclamante: '',
    admissao: '',
    demissao: '',
    reclamadas: [],
    participantes: [],
    dataVistoria: '',
    horaVistoria: '',
    localVistoria: '',
    modalidade: 'insalubridade',
    status: 'rascunho',
    responsavelId,
    criadoEm: hoje,
    atualizadoEm: hoje,
    tecnico: {
      apresentacao: '',
      enderecamento: '',
      objetivoPericia: '',
      descricaoEmpresa: '',
      descricaoAmbiente: '',
      atividadesFuncoes: '',
      periodos: [],
      agentes: [],
      normasReferencias:
        'Portaria MTb nº 3.214/78 — NR-15 (Atividades e Operações Insalubres) e NR-16 (Atividades e Operações Perigosas); NHO-01 e NHO-06 da FUNDACENTRO; NR-06 (EPI); NR-09 (Avaliação e Controle das Exposições Ocupacionais).',
      equipamentosAnalisados: '',
      informacoesLevantadas: '',
      analiseTecnica: '',
      conclusao: '',
      observacoesAdicionais: '',
    },
    fotos: [],
  }
}

export default function PericiaEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { usuario, empresas, pericias, salvarPericia, salvarDocumento, documentos } = useApp()

  const tipoDoc = (params.get('tipo') as 'parecer' | 'laudo') ?? 'parecer'
  const original = id ? pericias.find((p) => p.id === id) : undefined

  const [p, setP] = useState<Pericia>(() => original ?? novaPericia(usuario?.id ?? 'usr-1'))
  const [passo, setPasso] = useState(0)
  const [titulo, setTitulo] = useState(
    tipoDoc === 'laudo' ? 'Laudo Técnico Pericial' : 'Parecer Técnico Pericial',
  )
  const [bibliotecaPara, setBibliotecaPara] = useState<{
    campo: keyof Pericia['tecnico']
    secao: SecaoTexto
  } | null>(null)
  const [emailAberto, setEmailAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [exportando, setExportando] = useState<'pdf' | 'docx' | null>(null)
  const [enviandoFotos, setEnviandoFotos] = useState(false)
  /** Documento já emitido para esta perícia — reemitir atualiza, não duplica. */
  const [documentoId, setDocumentoId] = useState<string | null>(null)
  const [anexo, setAnexo] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  const [secaoFotoAtual, setSecaoFotoAtual] = useState<SecaoFoto>('ambiente')

  useEffect(() => {
    if (original) setP(original)
  }, [original])

  const set = (patch: Partial<Pericia>) => setP((v) => ({ ...v, ...patch }))
  const setT = (patch: Partial<Pericia['tecnico']>) =>
    setP((v) => ({ ...v, tecnico: { ...v.tecnico, ...patch } }))

  const empresaPrincipal = useMemo(
    () => empresas.find((e) => e.id === p.reclamadas.find((r) => r.principal)?.empresaId),
    [empresas, p.reclamadas],
  )

  const docsDaPericia = documentos.filter((d) => d.periciaId === p.id)

  // Reabrir uma perícia já documentada continua o mesmo documento.
  useEffect(() => {
    if (documentoId) return
    const existente = docsDaPericia.find((d) => d.tipo === tipoDoc)
    if (existente) {
      setDocumentoId(existente.id)
      setAnexo(existente.anexoExternoNome)
    }
  }, [docsDaPericia, documentoId, tipoDoc])

  async function salvarRascunho(silencioso = false): Promise<Pericia | null> {
    const atualizado = { ...p, atualizadoEm: new Date().toISOString().slice(0, 10) }
    try {
      const salva = await salvarPericia(atualizado)
      setP(salva)
      if (!silencioso) toast('Rascunho salvo. Você pode continuar depois.')
      return salva
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar o rascunho.', 'error')
      return null
    }
  }

  /** Grava (ou atualiza) o documento no histórico e devolve o id. */
  async function finalizarDocumento(silencioso = false): Promise<string | null> {
    const salva = await salvarRascunho(true)
    if (!salva) return null

    const hoje = new Date().toISOString().slice(0, 10)
    const modalidade =
      p.modalidade === 'ambas' ? 'Insalubridade e Periculosidade' : p.modalidade

    try {
      const doc = await salvarDocumento({
        id: documentoId ?? uid('doc'),
        tipo: tipoDoc,
        titulo: `${titulo} — ${modalidade}`,
        periciaId: salva.id,
        numeroProcesso: p.numeroProcesso || '—',
        reclamante: p.reclamante || '—',
        empresaPrincipal: empresaPrincipal?.nomeFantasia ?? empresaPrincipal?.razaoSocial ?? '—',
        status: 'finalizado',
        anexoExternoNome: anexo,
        criadoEm: hoje,
        atualizadoEm: hoje,
      })

      setDocumentoId(doc.id)
      if (!silencioso) {
        toast(
          documentoId
            ? 'Documento atualizado no histórico.'
            : 'Documento gerado e adicionado ao histórico.',
        )
      }
      return doc.id
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar o documento.', 'error')
      return null
    }
  }

  /**
   * Módulo H — o arquivo vem pronto do servidor. O documento é
   * gravado antes, porque a exportação parte do que está no banco.
   */
  async function exportar(formato: 'pdf' | 'docx') {
    if (api.API_MODE !== 'rest') {
      // Sem backend resta a impressão do navegador.
      if (formato === 'pdf') window.print()
      else toast('A exportação em DOCX exige o backend ativo.', 'info')
      return
    }

    setExportando(formato)
    try {
      const docId = await finalizarDocumento(true)
      if (!docId) return

      const { blob, nome } =
        formato === 'pdf'
          ? await api.documentos.gerarPdf(docId)
          : await api.documentos.gerarDocx(docId)

      api.salvarArquivo(blob, nome)
      toast(`${formato.toUpperCase()} gerado.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : `Falha ao gerar o ${formato.toUpperCase()}.`, 'error')
    } finally {
      setExportando(null)
    }
  }

  // ---------- Fotos (Módulo E) ----------
  async function adicionarFotos(files: FileList | null) {
    if (!files?.length) return
    const rotulo = SECOES_FOTO.find((s) => s.value === secaoFotoAtual)?.label

    setEnviandoFotos(true)
    try {
      // A perícia precisa existir no banco antes de receber fotos.
      const salva = await salvarRascunho(true)
      if (!salva) return

      const novas = await api.fotos.enviar(salva.id, secaoFotoAtual, files)
      setP((v) => ({ ...v, fotos: [...v.fotos, ...novas] }))
      toast(`${novas.length} foto(s) adicionada(s) em "${rotulo}".`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Falha ao enviar as fotos.', 'error')
    } finally {
      setEnviandoFotos(false)
    }
  }

  async function removerFoto(foto: Foto) {
    const anterior = p.fotos
    setP((v) => ({ ...v, fotos: v.fotos.filter((x) => x.id !== foto.id) }))
    try {
      await api.fotos.remover(p.id, foto.id)
    } catch (e) {
      setP((v) => ({ ...v, fotos: anterior }))
      toast(e instanceof Error ? e.message : 'Falha ao remover a foto.', 'error')
    }
  }

  /** Módulo H — anexo em PDF, concatenado ao final na geração. */
  async function anexarPdf(arquivo: File) {
    if (api.API_MODE !== 'rest') {
      setAnexo(arquivo.name)
      toast('Sem backend o anexo é apenas indicado no documento.', 'info')
      return
    }

    try {
      const docId = await finalizarDocumento(true)
      if (!docId) return

      const doc = await api.documentos.anexar(docId, arquivo)
      setAnexo(doc.anexoExternoNome)
      toast('PDF anexado — será concatenado ao final do documento.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Falha ao anexar o PDF.', 'error')
    }
  }

  async function removerAnexo() {
    if (documentoId && api.API_MODE === 'rest') {
      try {
        await api.documentos.removerAnexo(documentoId)
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Falha ao remover o anexo.', 'error')
        return
      }
    }
    setAnexo(undefined)
  }

  return (
    <>
      <PageHeader
        breadcrumb={id ? 'Editar perícia' : 'Nova perícia'}
        title={p.numeroProcesso || 'Nova perícia'}
        description={p.reclamante ? `${p.reclamante} · ${p.vara}` : 'Preencha os dados do processo para começar.'}
        action={
          <>
            <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/pericias')}>
              Voltar
            </Button>
            <Button variant="outline" icon={<Save size={16} />} onClick={() => void salvarRascunho()}>
              Salvar rascunho
            </Button>
          </>
        }
      />

      <div className="mb-5">
        <Stepper steps={PASSOS} current={passo} onSelect={setPasso} />
      </div>

      {/* ============ PASSO 0 — PROCESSO (Módulo C) ============ */}
      {passo === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Dados do processo" icon={<FileText size={18} />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Input
                label="Número do processo"
                required
                value={p.numeroProcesso}
                onChange={(e) => set({ numeroProcesso: maskProcesso(e.target.value) })}
                placeholder="0000000-00.0000.0.00.0000"
              />
              <Input
                label="Vara do Trabalho"
                required
                value={p.vara}
                onChange={(e) => set({ vara: e.target.value })}
                placeholder="71ª Vara do Trabalho de São Paulo"
              />
              <Input
                label="Comarca / Localidade"
                value={p.comarca}
                onChange={(e) => set({ comarca: e.target.value })}
                placeholder="São Paulo/SP"
              />
              <Select
                label="Modalidade da perícia"
                value={p.modalidade}
                onChange={(e) => set({ modalidade: e.target.value as Pericia['modalidade'] })}
                hint="Organiza o documento conforme a modalidade escolhida."
              >
                <option value="insalubridade">Insalubridade</option>
                <option value="periculosidade">Periculosidade</option>
                <option value="ambas">Insalubridade e Periculosidade</option>
              </Select>
            </div>
          </Card>

          <Card>
            <CardHeader title="Trabalhador avaliado" icon={<Users size={18} />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Nome do reclamante"
                required
                className="lg:col-span-2"
                value={p.reclamante}
                onChange={(e) => set({ reclamante: e.target.value })}
              />
              <Input
                label="CPF"
                value={p.cpfReclamante}
                onChange={(e) => set({ cpfReclamante: e.target.value })}
              />
              <Input
                label="Função"
                value={p.funcaoReclamante}
                onChange={(e) => set({ funcaoReclamante: e.target.value })}
              />
              <Input
                label="Admissão"
                type="date"
                value={p.admissao}
                onChange={(e) => set({ admissao: e.target.value })}
              />
              <Input
                label="Demissão"
                type="date"
                value={p.demissao}
                onChange={(e) => set({ demissao: e.target.value })}
                hint="Deixe vazio se o contrato está ativo."
              />
            </div>
          </Card>

          {/* Reclamadas ilimitadas */}
          <Card>
            <CardHeader
              title="Empresas reclamadas"
              subtitle="Sem limite de quantidade — selecione empresas já cadastradas (Módulo B)."
              icon={<Building2 size={18} />}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    set({
                      reclamadas: [
                        ...p.reclamadas,
                        {
                          id: uid('rec'),
                          empresaId: empresas[0]?.id ?? '',
                          principal: p.reclamadas.length === 0,
                        },
                      ],
                    })
                  }
                >
                  Adicionar
                </Button>
              }
            />
            <div className="space-y-3 p-5">
              {p.reclamadas.length === 0 && (
                <p className="text-sm text-ink-500">
                  Nenhuma reclamada vinculada. Clique em <strong>Adicionar</strong> para vincular.
                </p>
              )}
              {p.reclamadas.map((r, i) => (
                <div key={r.id} className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-200 p-3">
                  <Select
                    label={`Reclamada ${i + 1}`}
                    className="min-w-[240px] flex-1"
                    value={r.empresaId}
                    onChange={(e) =>
                      set({
                        reclamadas: p.reclamadas.map((x) =>
                          x.id === r.id ? { ...x, empresaId: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    <option value="">— selecione —</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.razaoSocial}
                      </option>
                    ))}
                  </Select>
                  <div className="pb-2">
                    <Checkbox
                      label="Principal"
                      checked={r.principal}
                      onChange={() =>
                        set({
                          reclamadas: p.reclamadas.map((x) => ({ ...x, principal: x.id === r.id })),
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-1 text-red-600 hover:bg-red-50"
                    icon={<Trash2 size={14} />}
                    onClick={() => set({ reclamadas: p.reclamadas.filter((x) => x.id !== r.id) })}
                    aria-label="Remover reclamada"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Participantes */}
          <Card>
            <CardHeader
              title="Participantes da perícia"
              subtitle="Perito judicial, assistentes técnicos, advogados e demais presentes."
              icon={<Users size={18} />}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    set({
                      participantes: [
                        ...p.participantes,
                        { id: uid('par'), nome: '', papel: 'assistente_reclamante' },
                      ],
                    })
                  }
                >
                  Adicionar
                </Button>
              }
            />
            <div className="space-y-3 p-5">
              {p.participantes.map((pt) => (
                <div key={pt.id} className="grid gap-3 rounded-lg border border-ink-200 p-3 sm:grid-cols-[1fr_1fr_150px_auto]">
                  <Input
                    label="Nome"
                    value={pt.nome}
                    onChange={(e) =>
                      set({
                        participantes: p.participantes.map((x) =>
                          x.id === pt.id ? { ...x, nome: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Select
                    label="Qualificação"
                    value={pt.papel}
                    onChange={(e) =>
                      set({
                        participantes: p.participantes.map((x) =>
                          x.id === pt.id ? { ...x, papel: e.target.value as Participante['papel'] } : x,
                        ),
                      })
                    }
                  >
                    {PAPEIS.map((pp) => (
                      <option key={pp.value} value={pp.value}>
                        {pp.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Registro"
                    placeholder="OAB / CREA"
                    value={pt.registro ?? ''}
                    onChange={(e) =>
                      set({
                        participantes: p.participantes.map((x) =>
                          x.id === pt.id ? { ...x, registro: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    className="mb-1 self-end text-red-600 hover:bg-red-50"
                    icon={<Trash2 size={15} />}
                    onClick={() =>
                      set({ participantes: p.participantes.filter((x) => x.id !== pt.id) })
                    }
                    aria-label="Remover participante"
                  />
                </div>
              ))}
              {p.participantes.length === 0 && (
                <p className="text-sm text-ink-500">Nenhum participante cadastrado.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Vistoria" icon={<Camera size={18} />} />
            <div className="grid gap-4 p-5 sm:grid-cols-4">
              <Input
                label="Data da vistoria"
                type="date"
                value={p.dataVistoria}
                onChange={(e) => set({ dataVistoria: e.target.value })}
              />
              <Input
                label="Horário"
                type="time"
                value={p.horaVistoria}
                onChange={(e) => set({ horaVistoria: e.target.value })}
              />
              <Input
                label="Local da vistoria"
                className="sm:col-span-2"
                value={p.localVistoria}
                onChange={(e) => set({ localVistoria: e.target.value })}
                placeholder="Endereço onde a diligência foi realizada"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ============ PASSO 1 — PREENCHIMENTO TÉCNICO (Módulo D) ============ */}
      {passo === 1 && (
        <div className="space-y-4">
          {(
            [
              { campo: 'apresentacao', secao: 'apresentacao', label: 'Apresentação do documento', rows: 5 },
              { campo: 'enderecamento', secao: 'generico', label: 'Endereçamento', rows: 3 },
              { campo: 'objetivoPericia', secao: 'objetivo', label: 'Objetivo da perícia', rows: 4 },
              { campo: 'descricaoEmpresa', secao: 'empresa', label: 'Descrição da empresa', rows: 5 },
              { campo: 'descricaoAmbiente', secao: 'ambiente', label: 'Descrição do ambiente de trabalho', rows: 6 },
              { campo: 'atividadesFuncoes', secao: 'atividades', label: 'Atividades e funções exercidas', rows: 6 },
            ] as const
          ).map((f) => (
            <Card key={f.campo}>
              <CardHeader
                title={f.label}
                icon={<FileText size={18} />}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<BookOpen size={14} />}
                    onClick={() => setBibliotecaPara({ campo: f.campo, secao: f.secao })}
                  >
                    Biblioteca
                  </Button>
                }
              />
              <div className="p-5">
                <Textarea
                  rows={f.rows}
                  value={p.tecnico[f.campo] as string}
                  onChange={(e) => setT({ [f.campo]: e.target.value } as never)}
                  placeholder="Digite ou insira um texto da sua biblioteca pessoal…"
                />
              </div>
            </Card>
          ))}

          {/* Períodos por função */}
          <Card>
            <CardHeader
              title="Períodos trabalhados por função"
              subtitle="Detalha a evolução das funções ao longo do contrato."
              icon={<Users size={18} />}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    setT({
                      periodos: [
                        ...p.tecnico.periodos,
                        { id: uid('prd'), funcao: '', inicio: '', fim: '', setor: '', descricaoAtividades: '' },
                      ] as PeriodoFuncao[],
                    })
                  }
                >
                  Adicionar período
                </Button>
              }
            />
            <div className="space-y-3 p-5">
              {p.tecnico.periodos.map((pr) => (
                <div key={pr.id} className="rounded-lg border border-ink-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_150px_150px_auto]">
                    <Input
                      label="Função"
                      value={pr.funcao}
                      onChange={(e) =>
                        setT({
                          periodos: p.tecnico.periodos.map((x) =>
                            x.id === pr.id ? { ...x, funcao: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      label="Setor"
                      value={pr.setor ?? ''}
                      onChange={(e) =>
                        setT({
                          periodos: p.tecnico.periodos.map((x) =>
                            x.id === pr.id ? { ...x, setor: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      label="Início"
                      type="date"
                      value={pr.inicio}
                      onChange={(e) =>
                        setT({
                          periodos: p.tecnico.periodos.map((x) =>
                            x.id === pr.id ? { ...x, inicio: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      label="Fim"
                      type="date"
                      value={pr.fim ?? ''}
                      onChange={(e) =>
                        setT({
                          periodos: p.tecnico.periodos.map((x) =>
                            x.id === pr.id ? { ...x, fim: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      className="mb-1 self-end text-red-600 hover:bg-red-50"
                      icon={<Trash2 size={15} />}
                      onClick={() =>
                        setT({ periodos: p.tecnico.periodos.filter((x) => x.id !== pr.id) })
                      }
                      aria-label="Remover período"
                    />
                  </div>
                  <Textarea
                    className="mt-3"
                    rows={2}
                    label="Atividades do período"
                    value={pr.descricaoAtividades ?? ''}
                    onChange={(e) =>
                      setT({
                        periodos: p.tecnico.periodos.map((x) =>
                          x.id === pr.id ? { ...x, descricaoAtividades: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              {p.tecnico.periodos.length === 0 && (
                <p className="text-sm text-ink-500">Nenhum período cadastrado.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ============ PASSO 2 — AGENTES ============ */}
      {passo === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Agentes e riscos avaliados"
              subtitle="Cadastre os agentes identificados e o respectivo enquadramento normativo."
              icon={<FileText size={18} />}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    setT({
                      agentes: [
                        ...p.tecnico.agentes,
                        {
                          id: uid('agn'),
                          nome: '',
                          tipo: 'quimico',
                          criterio: 'qualitativo',
                          grau: 'medio',
                        } as AgenteAvaliado,
                      ],
                    })
                  }
                >
                  Novo agente
                </Button>
              }
            />
            <div className="space-y-3 p-5">
              {p.tecnico.agentes.map((a) => (
                <div key={a.id} className="rounded-lg border border-ink-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-[1.4fr_120px_130px_130px_auto]">
                    <Input
                      label="Agente"
                      value={a.nome}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id ? { ...x, nome: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      label="CAS"
                      value={a.cas ?? ''}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id ? { ...x, cas: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Select
                      label="Anexo NR-15"
                      value={a.anexoNr15 ?? ''}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id ? { ...x, anexoNr15: e.target.value } : x,
                          ),
                        })
                      }
                    >
                      <option value="">—</option>
                      {ANEXOS_NR15.map((an) => (
                        <option key={an} value={an}>
                          {an}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Grau"
                      value={a.grau ?? ''}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id ? { ...x, grau: e.target.value as AgenteAvaliado['grau'] } : x,
                          ),
                        })
                      }
                    >
                      <option value="minimo">Mínimo 10%</option>
                      <option value="medio">Médio 20%</option>
                      <option value="maximo">Máximo 40%</option>
                      <option value="nao_caracterizado">Não caracterizado</option>
                    </Select>
                    <Button
                      variant="ghost"
                      className="mb-1 self-end text-red-600 hover:bg-red-50"
                      icon={<Trash2 size={15} />}
                      onClick={() => setT({ agentes: p.tecnico.agentes.filter((x) => x.id !== a.id) })}
                      aria-label="Remover agente"
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <Select
                      label="Natureza"
                      value={a.tipo}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id ? { ...x, tipo: e.target.value as AgenteAvaliado['tipo'] } : x,
                          ),
                        })
                      }
                    >
                      <option value="quimico">Químico</option>
                      <option value="fisico">Físico</option>
                      <option value="biologico">Biológico</option>
                      <option value="periculosidade">Periculosidade</option>
                    </Select>
                    <Select
                      label="Critério"
                      value={a.criterio}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id
                              ? { ...x, criterio: e.target.value as AgenteAvaliado['criterio'] }
                              : x,
                          ),
                        })
                      }
                    >
                      <option value="qualitativo">Qualitativo</option>
                      <option value="quantitativo">Quantitativo</option>
                      <option value="nao_aplicavel">Não aplicável</option>
                    </Select>
                    <Input
                      label="Limite de tolerância"
                      value={a.limiteTolerancia ?? ''}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id ? { ...x, limiteTolerancia: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      label="Valor medido"
                      value={a.medido ?? ''}
                      onChange={(e) =>
                        setT({
                          agentes: p.tecnico.agentes.map((x) =>
                            x.id === a.id ? { ...x, medido: e.target.value } : x,
                          ),
                        })
                      }
                      hint="Vazio = sem quantificação"
                    />
                  </div>
                </div>
              ))}
              {p.tecnico.agentes.length === 0 && (
                <p className="text-sm text-ink-500">Nenhum agente cadastrado.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ============ PASSO 3 — FOTOGRAFIAS (Módulo E) ============ */}
      {passo === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Relatório fotográfico"
              subtitle="As fotos são organizadas dentro das seções correspondentes do documento."
              icon={<Camera size={18} />}
              action={
                <div className="flex gap-2">
                  <Select
                    value={secaoFotoAtual}
                    onChange={(e) => setSecaoFotoAtual(e.target.value as SecaoFoto)}
                    className="h-8 text-[13px]"
                  >
                    {SECOES_FOTO.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    icon={<ImagePlus size={14} />}
                    loading={enviandoFotos}
                    onClick={() => fotoRef.current?.click()}
                  >
                    Adicionar
                  </Button>
                </div>
              }
            />
            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void adicionarFotos(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="space-y-6 p-5">
              {SECOES_FOTO.map((s) => {
                const fotos = p.fotos.filter((f) => f.secao === s.value)
                return (
                  <div key={s.value}>
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="section-title">{s.label}</h4>
                      <Badge tone={fotos.length ? 'green' : 'gray'}>{fotos.length}</Badge>
                    </div>
                    {fotos.length === 0 ? (
                      <p className="text-[13px] text-ink-400">Nenhuma foto nesta seção.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {fotos.map((f) => (
                          <div key={f.id} className="rounded-lg border border-ink-200 p-2">
                            <div className="aspect-[4/3] overflow-hidden rounded bg-ink-100">
                              <img src={f.url} alt={f.legenda} className="h-full w-full object-cover" />
                            </div>
                            <input
                              value={f.legenda}
                              onChange={(e) =>
                                set({
                                  fotos: p.fotos.map((x) =>
                                    x.id === f.id ? { ...x, legenda: e.target.value } : x,
                                  ),
                                })
                              }
                              placeholder="Legenda da figura"
                              className="mt-2 w-full rounded border border-ink-200 px-2 py-1 text-[12px] focus:border-brand-600"
                            />
                            <button
                              onClick={() => void removerFoto(f)}
                              className="mt-1.5 flex w-full items-center justify-center gap-1 rounded py-1 text-[11px] text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={12} /> Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ============ PASSO 4 — CONCLUSÃO ============ */}
      {passo === 4 && (
        <div className="space-y-4">
          {(
            [
              { campo: 'normasReferencias', secao: 'generico', label: 'Normas e referências utilizadas', rows: 4 },
              { campo: 'equipamentosAnalisados', secao: 'generico', label: 'Equipamentos e procedimentos analisados', rows: 4 },
              { campo: 'informacoesLevantadas', secao: 'generico', label: 'Informações levantadas na vistoria', rows: 5 },
              { campo: 'analiseTecnica', secao: 'analise', label: 'Análise técnica', rows: 8 },
              { campo: 'conclusao', secao: 'conclusao', label: 'Conclusão', rows: 6 },
              { campo: 'observacoesAdicionais', secao: 'generico', label: 'Observações adicionais', rows: 3 },
            ] as const
          ).map((f) => (
            <Card key={f.campo}>
              <CardHeader
                title={f.label}
                icon={<FileText size={18} />}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<BookOpen size={14} />}
                    onClick={() => setBibliotecaPara({ campo: f.campo, secao: f.secao })}
                  >
                    Biblioteca
                  </Button>
                }
              />
              <div className="p-5">
                <Textarea
                  rows={f.rows}
                  value={p.tecnico[f.campo] as string}
                  onChange={(e) => setT({ [f.campo]: e.target.value } as never)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ============ PASSO 5 — DOCUMENTO (Módulos G/H/I) ============ */}
      {passo === 5 && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4 no-print">
            <Card>
              <CardHeader title="Título do documento" subtitle="Módulo G" icon={<FileText size={18} />} />
              <div className="space-y-3 p-5">
                <Select value={titulo} onChange={(e) => setTitulo(e.target.value)}>
                  <option>Parecer Técnico Pericial</option>
                  <option>Laudo Técnico Pericial</option>
                  <option>Parecer Técnico de Assistente</option>
                </Select>
                <p className="hint">
                  O mesmo conteúdo pode ser emitido como parecer ou laudo, conforme sua preferência.
                </p>
              </div>
            </Card>

            <Card>
              <CardHeader title="Anexo externo" subtitle="Módulo H" icon={<Paperclip size={18} />} />
              <div className="p-5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void anexarPdf(f)
                    e.target.value = ''
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  icon={<Paperclip size={15} />}
                  onClick={() => fileRef.current?.click()}
                >
                  Anexar PDF externo
                </Button>
                {anexo && (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2">
                    <span className="truncate text-[12.5px] text-navy-800">{anexo}</span>
                    <button onClick={() => void removerAnexo()} className="text-red-600" aria-label="Remover anexo">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                <p className="hint mt-2">Ex.: laudo complementar de dosimetria, ART, FISPQ.</p>
              </div>
            </Card>

            <Card>
              <CardHeader title="Exportar e enviar" subtitle="Módulos H e I" icon={<FileDown size={18} />} />
              <div className="space-y-2 p-5">
                <Button
                  className="w-full"
                  icon={<Printer size={15} />}
                  loading={exportando === 'pdf'}
                  onClick={() => void exportar('pdf')}
                >
                  Gerar PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  icon={<FileDown size={15} />}
                  loading={exportando === 'docx'}
                  onClick={() => void exportar('docx')}
                >
                  Exportar editável (DOCX)
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  icon={<Mail size={15} />}
                  onClick={() => setEmailAberto(true)}
                >
                  Enviar por e-mail
                </Button>
                <div className="border-t border-ink-100 pt-2">
                  <Button
                    variant="ghost"
                    className="w-full"
                    icon={<Save size={15} />}
                    onClick={() => void finalizarDocumento()}
                  >
                    Finalizar e salvar no histórico
                  </Button>
                </div>
              </div>
            </Card>

            {docsDaPericia.length > 0 && (
              <Card>
                <CardHeader title="Documentos desta perícia" subtitle="Módulo J" />
                <ul className="divide-y divide-ink-100">
                  {docsDaPericia.map((d) => (
                    <li key={d.id} className="px-5 py-2.5 text-[13px]">
                      <p className="font-medium text-ink-800">{d.titulo}</p>
                      <p className="text-xs text-ink-500">{d.atualizadoEm}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl bg-ink-100 p-4 lg:p-6">
            <DocumentoPreview pericia={p} empresas={empresas} perito={usuario} titulo={titulo} />
            {anexo && (
              <div className="mx-auto mt-4 max-w-[820px] rounded-lg border-2 border-dashed border-ink-300 bg-white px-6 py-8 text-center no-print">
                <Paperclip size={20} className="mx-auto mb-2 text-ink-400" />
                <p className="text-sm font-semibold text-ink-700">Anexo externo</p>
                <p className="text-[13px] text-ink-500">{anexo}</p>
                <p className="mt-1 text-xs text-ink-400">
                  Será concatenado ao final do PDF gerado pelo servidor.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="mt-6 flex items-center justify-between gap-3 no-print">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={16} />}
          onClick={() => setPasso((s) => Math.max(0, s - 1))}
          disabled={passo === 0}
        >
          Anterior
        </Button>
        <span className="text-[13px] text-ink-500">
          Passo {passo + 1} de {PASSOS.length} — {PASSOS[passo].label}
        </span>
        {passo < PASSOS.length - 1 ? (
          <Button
            icon={<ArrowRight size={16} />}
            onClick={() => {
              void salvarRascunho(true)
              setPasso((s) => s + 1)
            }}
          >
            Próximo
          </Button>
        ) : (
          <Button icon={<Save size={16} />} onClick={() => void finalizarDocumento()}>
            Finalizar documento
          </Button>
        )}
      </div>

      {/* Módulo F */}
      <BibliotecaDrawer
        open={!!bibliotecaPara}
        onClose={() => setBibliotecaPara(null)}
        secao={bibliotecaPara?.secao}
        onInserir={(conteudo) => {
          if (!bibliotecaPara) return
          const atual = (p.tecnico[bibliotecaPara.campo] as string) ?? ''
          setT({ [bibliotecaPara.campo]: atual ? `${atual}\n\n${conteudo}` : conteudo } as never)
          toast('Texto inserido na seção.')
        }}
      />

      {/* Módulo I */}
      <EnvioPorEmail
        aberto={emailAberto}
        onFechar={() => setEmailAberto(false)}
        enviando={enviando}
        titulo={titulo}
        pericia={p}
        perito={usuario}
        anexo={anexo}
        onEnviar={async (dados) => {
          setEnviando(true)
          try {
            const docId = await finalizarDocumento(true)
            if (!docId) return
            await api.documentos.enviarEmail(docId, dados)
            toast(`Documento enviado para ${dados.para}.`)
            setEmailAberto(false)
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Falha ao enviar o e-mail.', 'error')
          } finally {
            setEnviando(false)
          }
        }}
      />
    </>
  )
}

// ============================================================
// MÓDULO I — Envio por e-mail.
// Componente à parte porque os campos precisam de estado próprio:
// na versão anterior eles usavam defaultValue e o que era digitado
// nunca chegava à chamada de envio.
// ============================================================

interface DadosEmail {
  para: string
  copia: string
  assunto: string
  mensagem: string
}

function EnvioPorEmail({
  aberto,
  onFechar,
  onEnviar,
  enviando,
  titulo,
  pericia,
  perito,
  anexo,
}: {
  aberto: boolean
  onFechar: () => void
  onEnviar: (dados: DadosEmail) => Promise<void>
  enviando: boolean
  titulo: string
  pericia: Pericia
  perito?: Usuario | null
  anexo?: string
}) {
  const assuntoPadrao = `${titulo} — Processo ${pericia.numeroProcesso}`
  const mensagemPadrao =
    `Excelentíssimo(a) Senhor(a) Juiz(a),\n\n` +
    `Segue anexo o ${titulo.toLowerCase()} referente ao processo nº ${pericia.numeroProcesso}, ` +
    `reclamante ${pericia.reclamante}.\n\nRespeitosamente,\n` +
    `${perito?.nome ?? ''}\n${perito?.registroProfissional ?? ''}`

  const [dados, setDados] = useState<DadosEmail>({
    para: '',
    copia: '',
    assunto: assuntoPadrao,
    mensagem: mensagemPadrao,
  })
  const [erro, setErro] = useState('')

  // Reabrir o modal recompõe assunto e mensagem com os dados atuais
  // do processo, preservando o que o perito já tinha escrito.
  useEffect(() => {
    if (!aberto) return
    setErro('')
    setDados((d) => ({
      ...d,
      assunto: d.assunto.trim() ? d.assunto : assuntoPadrao,
      mensagem: d.mensagem.trim() ? d.mensagem : mensagemPadrao,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  const set = (patch: Partial<DadosEmail>) => setDados((d) => ({ ...d, ...patch }))

  function enviar() {
    if (!dados.para.trim()) {
      setErro('Informe ao menos um destinatário.')
      return
    }
    if (!dados.assunto.trim()) {
      setErro('Informe o assunto.')
      return
    }
    setErro('')
    void onEnviar(dados)
  }

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title="Enviar documento por e-mail"
      subtitle="O PDF é gerado no servidor e anexado automaticamente — sem precisar baixar."
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button loading={enviando} onClick={enviar}>
            Enviar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Para"
          required
          value={dados.para}
          onChange={(e) => set({ para: e.target.value })}
          placeholder="vara00@trt2.jus.br"
          hint="Vários destinatários: separe por vírgula."
          error={erro && !dados.para.trim() ? erro : undefined}
        />
        <Input
          label="Cópia (Cc)"
          value={dados.copia}
          onChange={(e) => set({ copia: e.target.value })}
          placeholder="opcional"
        />
        <Input
          label="Assunto"
          required
          value={dados.assunto}
          onChange={(e) => set({ assunto: e.target.value })}
        />
        <Textarea
          label="Mensagem"
          rows={7}
          value={dados.mensagem}
          onChange={(e) => set({ mensagem: e.target.value })}
        />
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-[13px] text-ink-600">
          <Paperclip size={15} />
          {titulo.replace(/\s/g, '_')}.pdf {anexo && `(com ${anexo} ao final)`}
        </div>
        {erro && dados.para.trim() && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {erro}
          </p>
        )}
      </div>
    </Modal>
  )
}
