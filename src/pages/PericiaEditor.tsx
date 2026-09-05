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
  RotateCcw,
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
import { BuscaProcesso } from '@/components/BuscaProcesso'
import type { OrigemConsulta } from '@/components/BuscaCnpj'
import { DocumentoPreview } from '@/components/DocumentoPreview'
import { AgenteNr15Fields } from '@/components/AgenteNr15Fields'
import { PericulosidadeNr16Fields } from '@/components/PericulosidadeNr16Fields'
import { EpiSelector } from '@/components/EpiSelector'
import { empresaVazia, ModalEmpresa } from '@/components/ModalEmpresa'
import { useApp } from '@/store/AppStore'
import * as api from '@/services/api'
import type { DadosProcesso } from '@/services/api'
import type {
  AgenteAvaliado,
  Empresa,
  Foto,
  Participante,
  Pericia,
  PeriodoFuncao,
  SecaoFoto,
  SecaoTexto,
  Usuario,
} from '@/types'
import { ANEXOS_NR15 } from '@/content/anexosNr15'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import {
  CAMPOS_COM_TEXTO_PADRAO,
  patchDeTextosPadrao,
  textosPadraoDaPericia,
  type CampoComTextoPadrao,
} from '@/content/textosPadrao'
import { patchDoProcesso } from '@/lib/consultas'
import { aplicarAnexo, usaAtenuacaoRuido } from '@/lib/nr15'
import {
  dadosPapel,
  grupoDoParticipante,
  participanteAusente,
  papeisDoGrupo,
  PAPEIS_POR_GRUPO,
  TEXTO_AUSENCIA_RECLAMANTE,
  type GrupoParticipante,
} from '@/lib/participantes'
import { intervaloDoPeriodo, periodoAvaliacaoEmpresa } from '@/lib/periodoAvaliacao'
import { dadosAssinatura } from '@/lib/assinaturaDocumento'
import { comEmpresaVinculada, empresasLivres, opcoesDaLinha } from '@/lib/reclamadas'
import { uid } from '@/lib/utils'

const ROTULOS_GRAU: Record<NonNullable<AgenteAvaliado['grau']>, string> = {
  minimo: 'Mínimo 10%',
  medio: 'Médio 20%',
  maximo: 'Máximo 40%',
  nao_caracterizado: 'Não caracterizado',
}

// ============================================================
// MÓDULOS C · D · E · F · G · H · I
// Cadastro de perícia → preenchimento técnico → fotos →
// conclusão → geração, exportação e envio do documento.
// ============================================================

const PASSOS = [
  { label: 'Processo', description: 'Módulo C' },
  { label: 'Preenchimento', description: 'Módulo D' },
  // "e EPIs" no rótulo porque é ali que o perito associa o equipamento —
  // o nome antigo escondia metade da etapa. Curto porque a trilha do
  // topo trunca o que não cabe.
  { label: 'Avaliações e EPIs', description: 'Módulo D' },
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
    dataAjuizamento: '',
    admissao: '',
    demissao: '',
    reclamadas: [],
    participantes: [],
    dataVistoria: '',
    horaVistoria: '',
    horaFimVistoria: '',
    cepVistoria: '',
    localVistoria: '',
    numeroVistoria: '',
    setorVistoriado: '',
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
      descricaoPostoTrabalho: '',
      maquinasFerramentas: '',
      produtosUtilizados: '',
      atividadesFuncoes: '',
      periodos: [],
      agentes: [],
      // Apresentação, objeto, normas, metodologia e encerramento nascem
      // vazios e são preenchidos pelo efeito de textos padrão, que
      // conhece a modalidade, o perito e as partes. Ver
      // `src/content/textosPadrao.ts`.
      normasReferencias: '',
      equipamentosAnalisados: '',
      informacoesLevantadas: '',
      divergenciasFaticas: '',
      alegacoesReclamante: '',
      informacoesReclamada: '',
      consideracoesDivergencias: '',
      criterioAvaliacaoPericulosidade: '',
      notaTecnicaEpis: '',
      protecoesColetivas: '',
      analiseTecnica: '',
      conclusao: '',
      conclusaoInsalubridade: '',
      conclusaoPericulosidade: '',
      respostasQuesitos: '',
      encerramento: '',
      observacoesAdicionais: '',
    },
    fotos: [],
  }
}

/**
 * O período que a empresa precisa cobrir com PGR e laudos ambientais.
 *
 * Sai calculado em vez de digitado porque a conta é sempre a mesma e o
 * erro nela é caro: pedir o documento de um ano prescrito, ou deixar de
 * pedir o do primeiro ano que conta. Aparece só quando há data de
 * ajuizamento — antes disso não há o que calcular.
 */
function PeriodoAvaliado({ pericia }: { pericia: Pericia }) {
  const periodo = periodoAvaliacaoEmpresa(pericia)
  if (!periodo) return null

  return (
    <div
      className={`sm:col-span-2 lg:col-span-4 rounded-lg border px-3 py-2.5 ${
        periodo.foraDoPrazo ? 'border-amber-200 bg-amber-50' : 'border-ink-200 bg-ink-50'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-700">
        Período de avaliação da empresa
      </p>
      <p className="mt-1 text-sm font-medium text-ink-900">{intervaloDoPeriodo(periodo)}</p>
    </div>
  )
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
    tipoDoc === 'laudo' ? 'Laudo Técnico Pericial' : 'Parecer Técnico da Reclamada',
  )
  const [bibliotecaPara, setBibliotecaPara] = useState<{
    campo?: keyof Pericia['tecnico']
    agenteId?: string
    secao: SecaoTexto
    referencia?: string
  } | null>(null)
  const [emailAberto, setEmailAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [exportando, setExportando] = useState<'pdf' | 'docx' | null>(null)
  const [enviandoFotos, setEnviandoFotos] = useState(false)
  /** Documento já emitido para esta perícia — reemitir atualiza, não duplica. */
  const [documentoId, setDocumentoId] = useState<string | null>(null)
  const [anexo, setAnexo] = useState<string | undefined>()
  /** Cadastro de reclamada aberto de dentro da perícia — null = fechado. */
  const [empresaNova, setEmpresaNova] = useState<Empresa | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  const [secaoFotoAtual, setSecaoFotoAtual] = useState<SecaoFoto>('ambiente')
  const [consultandoCep, setConsultandoCep] = useState(false)

  useEffect(() => {
    if (original) setP(original)
  }, [original])

  /**
   * Empresa vinda do atalho "usar em perícia" (Módulo B). Só entra depois
   * que a perícia existente carregou — antes disso o efeito acima ainda
   * vai sobrescrever o estado com o que veio do servidor.
   */
  const empresaDoAtalho = params.get('empresa')
  const atalhoAplicado = useRef(false)
  useEffect(() => {
    if (!empresaDoAtalho || atalhoAplicado.current) return
    if (id && !original) return
    if (!empresas.some((e) => e.id === empresaDoAtalho)) return
    atalhoAplicado.current = true
    setP((v) => ({
      ...v,
      reclamadas: comEmpresaVinculada(v.reclamadas, empresaDoAtalho, uid('rec')),
    }))
  }, [empresaDoAtalho, empresas, id, original])

  const set = (patch: Partial<Pericia>) => setP((v) => ({ ...v, ...patch }))

  /**
   * O que a base pública do CNJ devolveu sobre o processo. O patch é
   * calculado dentro do updater porque a busca automática só preenche
   * campo vazio — e o "vazio" que vale é o do estado no momento em que
   * a resposta chegou, não o de quando a consulta saiu.
   */
  function aplicarDadosDoProcesso(dados: DadosProcesso, origem: OrigemConsulta) {
    setP((atual) => ({
      ...atual,
      ...patchDoProcesso(atual, dados, { sobrescrever: origem === 'manual' }),
    }))
    toast(
      origem === 'manual'
        ? 'Vara, comarca e data de ajuizamento atualizadas com os dados do CNJ.'
        : 'Vara, comarca e data de ajuizamento preenchidas pela base pública do CNJ.',
    )
  }

  async function buscarCepDaVistoria() {
    const cep = p.cepVistoria?.replace(/\D/g, '') ?? ''
    if (cep.length !== 8) {
      toast('Informe os 8 dígitos do CEP da vistoria.', 'error')
      return
    }

    setConsultandoCep(true)
    try {
      const dados = await api.consultas.cep(cep)
      set({ cepVistoria: dados.cep, localVistoria: dados.enderecoCompleto })
      toast('Endereço da vistoria preenchido pela consulta de CEP.')
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : 'Não foi possível consultar o CEP.', 'error')
    } finally {
      setConsultandoCep(false)
    }
  }

  const setT = (patch: Partial<Pericia['tecnico']>) =>
    setP((v) => ({ ...v, tecnico: { ...v.tecnico, ...patch } }))

  /** Atualizações simultâneas do CAEPI não podem recolocar o estado antigo de outro agente. */
  const transformarAgentes = (
    transformar: (agentes: AgenteAvaliado[]) => AgenteAvaliado[],
  ) => setP((v) => ({
    ...v,
    tecnico: { ...v.tecnico, agentes: transformar(v.tecnico.agentes) },
  }))

  const adicionarAgente = (agente: AgenteAvaliado) =>
    transformarAgentes((agentes) => [...agentes, agente])

  const atualizarAgente = (
    idAgente: string,
    transformar: (agente: AgenteAvaliado) => AgenteAvaliado,
  ) => transformarAgentes((agentes) =>
    agentes.map((agente) => agente.id === idAgente ? transformar(agente) : agente),
  )

  const removerAgente = (idAgente: string) =>
    transformarAgentes((agentes) => agentes.filter((agente) => agente.id !== idAgente))

  const empresaPrincipal = useMemo(
    () => empresas.find((e) => e.id === p.reclamadas.find((r) => r.principal)?.empresaId),
    [empresas, p.reclamadas],
  )

  const livres = useMemo(() => empresasLivres(empresas, p.reclamadas), [empresas, p.reclamadas])

  /**
   * Textos padrão: o perito não redige de novo, a cada processo, aquilo
   * que é igual em todo laudo. Enquanto ele não editar o campo, o texto
   * acompanha os dados da perícia — trocar a modalidade para
   * "periculosidade" reescreve o objeto e as normas na hora. A matriz é
   * fixa para usuários comuns; o administrador pode personalizá-la.
   */
  const ehAdministrador = usuario?.perfil === 'admin'
  const padroesAplicados = useRef<Partial<Record<CampoComTextoPadrao, string>>>({})
  useEffect(() => {
    const padroes = textosPadraoDaPericia(p, usuario, empresaPrincipal)
    const patch = ehAdministrador
      ? patchDeTextosPadrao(p.tecnico, padroes, padroesAplicados.current)
      : Object.fromEntries(
          CAMPOS_COM_TEXTO_PADRAO
            .filter((campo) => p.tecnico[campo] !== padroes[campo])
            .map((campo) => [campo, padroes[campo]]),
        ) as Partial<Record<CampoComTextoPadrao, string>>
    padroesAplicados.current = padroes
    if (Object.keys(patch).length) setT(patch)
  }, [p, usuario, empresaPrincipal, ehAdministrador])

  /** O campo, quando ele é um dos que têm texto padrão; senão, null. */
  const campoPadraoDe = (campo: string): CampoComTextoPadrao | null =>
    (CAMPOS_COM_TEXTO_PADRAO as readonly string[]).includes(campo) ? (campo as CampoComTextoPadrao) : null

  /** Devolve o campo ao texto padrão e volta a mantê-lo sincronizado. */
  function restaurarTextoPadrao(campo: CampoComTextoPadrao) {
    const padrao = textosPadraoDaPericia(p, usuario, empresaPrincipal)[campo]
    padroesAplicados.current = { ...padroesAplicados.current, [campo]: padrao }
    setT({ [campo]: padrao } as never)
    toast('Texto padrão restaurado neste campo.')
  }

  const docsDaPericia = documentos.filter((d) => d.periciaId === p.id)
  const avaliacoesVisiveis = p.tecnico.agentes.filter((avaliacao) =>
    p.modalidade === 'ambas'
      ? true
      : p.modalidade === 'periculosidade'
        ? avaliacao.tipo === 'periculosidade'
        : avaliacao.tipo !== 'periculosidade',
  )
  const numeroNr16Editor = p.modalidade === 'ambas' ? '7.3' : '7.2'
  const numeroDivergenciasEditor = p.modalidade === 'ambas' ? '7.4' : '7.3'
  const numeroConsideracoesEditor = p.modalidade === 'ambas' ? '7.5' : '7.4'
  const vinculoPrincipal = p.reclamadas.find((item) => item.principal)
  const vinculosEnvolvidos = p.reclamadas.filter((item) => !item.principal && item.empresaId)
  const nomeDaEmpresa = (empresaId?: string) =>
    empresas.find((empresa) => empresa.id === empresaId)?.razaoSocial
  const gruposParticipantes: {
    chave: GrupoParticipante
    titulo: string
    descricao: string
    empresaId?: string
    desabilitado?: boolean
  }[] = [
    {
      chave: 'reclamante',
      titulo: 'Parte Reclamante',
      descricao: 'Reclamante, advogado(a) e assistente técnico(a).',
    },
    {
      chave: 'reclamada_principal',
      titulo: 'Parte Reclamada Principal',
      descricao: nomeDaEmpresa(vinculoPrincipal?.empresaId) ?? 'Defina uma reclamada principal para adicionar participantes.',
      empresaId: vinculoPrincipal?.empresaId,
      desabilitado: !vinculoPrincipal?.empresaId,
    },
    {
      chave: 'reclamadas_envolvidas',
      titulo: 'Parte Reclamada Envolvida no Processo',
      descricao: vinculosEnvolvidos
        .map((item) => nomeDaEmpresa(item.empresaId))
        .filter(Boolean)
        .join(' • ') || 'Adicione outra empresa reclamada para vincular seus representantes.',
      empresaId: vinculosEnvolvidos[0]?.empresaId,
      desabilitado: vinculosEnvolvidos.length === 0,
    },
    {
      chave: 'outros',
      titulo: 'Perícia / Juízo — Demais Participantes',
      descricao: 'Perito, auxiliar, paradigma, entrevistado e participante autorizado.',
    },
  ]

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
    const agentes = p.tecnico.agentes.map((agente) => {
      const nomeFixo = obterRegraAnexo(agente.anexoNr15)?.agenteFixo
      return nomeFixo ? { ...agente, nome: nomeFixo } : agente
    })
    const atualizado = {
      ...p,
      tecnico: { ...p.tecnico, agentes },
      atualizadoEm: new Date().toISOString().slice(0, 10),
    }
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
    const semConclusao = p.tecnico.agentes.filter(
      (agente) => agente.tipo !== 'periculosidade' && !agente.observacao?.trim(),
    )
    if (semConclusao.length) {
      const nomes = semConclusao.map((agente) => agente.nome.trim() || 'agente sem nome').join(', ')
      setPasso(2)
      toast(`Preencha a conclusão da avaliação: ${nomes}.`, 'error')
      return null
    }
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
      // O upload persiste o arquivo, mas o POST da perícia é quem mantém
      // a lista de fotos. Sincronizar agora impede que o próximo salvar
      // interprete a imagem recém-enviada como removida.
      const comFotos = {
        ...salva,
        fotos: [...salva.fotos, ...novas],
      }
      setP(comFotos)
      const sincronizada = await salvarPericia(comFotos)
      setP(sincronizada)
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
            <CardHeader title="Dados do processo" subtitle="Referência no documento: item 1" icon={<FileText size={18} />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <BuscaProcesso
                className="sm:col-span-2"
                valor={p.numeroProcesso}
                onChange={(numeroProcesso) => set({ numeroProcesso })}
                onDados={aplicarDadosDoProcesso}
                autoBuscar={!p.vara.trim()}
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
              <Input
                label="Ajuizamento da ação"
                type="date"
                value={p.dataAjuizamento ?? ''}
                onChange={(e) => set({ dataAjuizamento: e.target.value })}
                hint="Vem da consulta ao CNJ. Define o período que a empresa precisa cobrir."
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
                label="Função Inicial"
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
              <PeriodoAvaliado pericia={p} />
            </div>
          </Card>

          {/* Reclamadas ilimitadas */}
          <Card>
            <CardHeader
              title="Empresas reclamadas"
              subtitle="Sem limite de quantidade — selecione empresas já cadastradas (Módulo B) ou cadastre uma na hora."
              icon={<Building2 size={18} />}
              action={
                <div className="flex flex-wrap justify-end gap-2">
                  {/* Empresa que ainda não existe no Módulo B: cadastra aqui e
                      já entra vinculada — quem descobriu a reclamada durante a
                      diligência não precisa sair do processo e voltar. */}
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Building2 size={14} />}
                    onClick={() => setEmpresaNova(empresaVazia())}
                  >
                    Cadastrar empresa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Plus size={14} />}
                    disabled={livres.length === 0}
                    onClick={() =>
                      set({
                        reclamadas: [
                          ...p.reclamadas,
                          {
                            id: uid('rec'),
                            // Em branco de propósito. Dizer que uma empresa é
                            // reclamada neste processo é decisão do perito, não
                            // consequência de ter clicado em "Adicionar".
                            empresaId: '',
                            principal: p.reclamadas.length === 0,
                          },
                        ],
                      })
                    }
                  >
                    Adicionar
                  </Button>
                </div>
              }
            />
            <div className="space-y-3 p-5">
              {p.reclamadas.length === 0 && (
                <p className="text-sm text-ink-500">
                  Nenhuma reclamada vinculada. Clique em <strong>Adicionar</strong> para escolher uma
                  empresa já cadastrada, ou em <strong>Cadastrar empresa</strong> — a nova entra
                  vinculada direto neste processo.
                </p>
              )}
              {p.reclamadas.map((r, i) => (
                <div key={r.id} className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-200 p-3">
                  <Select
                    label={`Reclamada ${i + 1}`}
                    className="min-w-[240px] flex-1"
                    value={r.empresaId}
                    onChange={(e) => {
                      const novaEmpresaId = e.target.value
                      set({
                        reclamadas: p.reclamadas.map((x) =>
                          x.id === r.id ? { ...x, empresaId: novaEmpresaId } : x,
                        ),
                        participantes: p.participantes.map((participante) =>
                          participante.empresaId === r.empresaId
                            ? { ...participante, empresaId: novaEmpresaId || undefined }
                            : participante,
                        ),
                      })
                    }}
                  >
                    <option value="">— selecione —</option>
                    {opcoesDaLinha(empresas, p.reclamadas, r).map((e) => (
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
                    onClick={() =>
                      set({
                        reclamadas: p.reclamadas.filter((x) => x.id !== r.id),
                        participantes: p.participantes.map((participante) =>
                          participante.empresaId === r.empresaId
                            ? { ...participante, empresaId: undefined }
                            : participante,
                        ),
                      })
                    }
                    aria-label="Remover reclamada"
                  />
                </div>
              ))}
            </div>
          </Card>

          {empresaNova && (
            <ModalEmpresa
              key={empresaNova.id}
              inicial={empresaNova}
              titulo="Nova empresa reclamada"
              subtitulo="A empresa é salva no cadastro (Módulo B) e já entra vinculada a este processo."
              onFechar={() => setEmpresaNova(null)}
              onSalvo={(salva) =>
                set({ reclamadas: comEmpresaVinculada(p.reclamadas, salva.id, uid('rec')) })
              }
            />
          )}

          {/* Participantes — cada parte tem seu próprio botão e grupo. */}
          <Card>
            <CardHeader
              title="Participantes da perícia"
              subtitle="Item 2 — organizados pela parte ou empresa que representam."
              icon={<Users size={18} />}
            />
            <div className="space-y-5 p-5">
              {gruposParticipantes.map((grupo) => {
                const principalId = vinculoPrincipal?.empresaId
                const participantes = p.participantes.filter(
                  (participante) => grupoDoParticipante(participante, principalId) === grupo.chave,
                )
                const tituloId = `grupo-participantes-${grupo.chave}`
                return (
                  <section
                    key={grupo.chave}
                    aria-labelledby={tituloId}
                    className="rounded-lg border border-ink-200 bg-ink-50/60 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 id={tituloId} className="font-semibold text-ink-900">{grupo.titulo}</h4>
                        <p className="text-xs text-ink-500">{grupo.descricao}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Plus size={14} />}
                        disabled={grupo.desabilitado}
                        aria-label={`Adicionar participante em ${grupo.titulo}`}
                        onClick={() =>
                          set({
                            participantes: [
                              ...p.participantes,
                              {
                                id: uid('par'),
                                nome: '',
                                papel: PAPEIS_POR_GRUPO[grupo.chave][0]!.value,
                                empresaId: grupo.empresaId,
                              },
                            ],
                          })
                        }
                      >
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {participantes.map((pt) => (
                        <div
                          key={pt.id}
                          className={`grid gap-3 rounded-lg border border-ink-200 bg-white p-3 ${grupo.chave === 'reclamadas_envolvidas'
                            ? 'md:grid-cols-2 xl:grid-cols-[0.9fr_1fr_1fr_1.25fr_auto]'
                            : 'sm:grid-cols-[1fr_1fr_1.25fr_auto]'}`}
                        >
                          {grupo.chave === 'reclamadas_envolvidas' && (
                            <Select
                              label="Empresa representada"
                              value={pt.empresaId ?? grupo.empresaId ?? ''}
                              onChange={(e) =>
                                set({
                                  participantes: p.participantes.map((x) =>
                                    x.id === pt.id ? { ...x, empresaId: e.target.value || undefined } : x,
                                  ),
                                })
                              }
                            >
                              {vinculosEnvolvidos.map((reclamada, indice) => (
                                <option key={reclamada.id} value={reclamada.empresaId}>
                                  {indice + 2}ª Reclamada — {nomeDaEmpresa(reclamada.empresaId) ?? 'Empresa não identificada'}
                                </option>
                              ))}
                            </Select>
                          )}
                          {participanteAusente(pt) ? (
                            <div className="sm:col-span-1">
                              <span className="mb-1.5 block text-sm font-medium text-ink-700">Registro</span>
                              <div className="flex min-h-10 items-center rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-800">
                                {TEXTO_AUSENCIA_RECLAMANTE}
                              </div>
                            </div>
                          ) : (
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
                          )}
                          <Select
                            label="Qualificação"
                            value={pt.papel}
                            onChange={(e) =>
                              set({
                                participantes: p.participantes.map((x) =>
                                  x.id === pt.id ? {
                                    ...x,
                                    papel: e.target.value as Participante['papel'],
                                    nome: e.target.value === 'parte_reclamante_ausente' ? '' : x.nome,
                                  } : x,
                                ),
                              })
                            }
                          >
                            {papeisDoGrupo(grupo.chave, pt.papel).map((pp) => (
                              <option key={pp.value} value={pp.value}>{pp.label}</option>
                            ))}
                          </Select>
                          {!participanteAusente(pt) && (
                            <div>
                              <span className="mb-1.5 block text-sm font-medium text-ink-700">Atuação no ato</span>
                              <div className="flex min-h-10 items-center rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700">
                                {dadosPapel(pt.papel).atuacao}
                              </div>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            className="mb-1 self-end text-red-600 hover:bg-red-50"
                            icon={<Trash2 size={15} />}
                            onClick={() => set({ participantes: p.participantes.filter((x) => x.id !== pt.id) })}
                            aria-label="Remover participante"
                          />
                        </div>
                      ))}
                      {!participantes.length && (
                        <p className="text-sm text-ink-500">Nenhum participante neste grupo.</p>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Vistoria" subtitle="Referência no documento: item 2" icon={<Camera size={18} />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                label="Data da vistoria"
                type="date"
                value={p.dataVistoria}
                onChange={(e) => set({ dataVistoria: e.target.value })}
              />
              <Input
                label="Horário de início da perícia"
                type="time"
                value={p.horaVistoria}
                onChange={(e) => set({ horaVistoria: e.target.value })}
              />
              <Input
                label="Horário de término da perícia"
                type="time"
                value={p.horaFimVistoria ?? ''}
                onChange={(e) => set({ horaFimVistoria: e.target.value })}
              />
              <Input
                label="CEP da vistoria"
                value={p.cepVistoria ?? ''}
                onChange={(e) => set({ cepVistoria: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void buscarCepDaVistoria()
                  }
                }}
                placeholder="00000-000"
                maxLength={9}
              />
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={consultandoCep}
                  onClick={() => void buscarCepDaVistoria()}
                >
                  {consultandoCep ? 'Consultando...' : 'Buscar CEP'}
                </Button>
              </div>
              <Input
                label="Endereço completo da vistoria"
                className="sm:col-span-2"
                value={p.localVistoria}
                onChange={(e) => set({ localVistoria: e.target.value })}
                placeholder="Logradouro — bairro — cidade/UF"
                hint="Preenchido pelo CEP e editável para acrescentar complemento."
              />
              <Input
                label="Número"
                value={p.numeroVistoria ?? ''}
                onChange={(e) => set({ numeroVistoria: e.target.value })}
                placeholder="Ex.: 125 ou s/n"
              />
              <Input
                label="Setor / local vistoriado"
                value={p.setorVistoriado ?? ''}
                onChange={(e) => set({ setorVistoriado: e.target.value })}
                placeholder="Ex.: Setor de solda"
                hint="Informe manualmente: o CEP não identifica o setor interno da empresa."
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
              { campo: 'apresentacao', secao: 'apresentacao', referencia: undefined, label: 'APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA', rows: 5 },
              { campo: 'descricaoEmpresa', secao: 'empresa', referencia: '3', label: '3. Descrição das Instalações da Reclamada', rows: 5 },
              { campo: 'descricaoAmbiente', secao: 'ambiente', referencia: '3.1', label: '3.1. Instalações Físicas', rows: 6 },
              { campo: 'descricaoPostoTrabalho', secao: 'ambiente', referencia: '6.1', label: '6.1. Descrição do Posto de Trabalho', rows: 6 },
              { campo: 'maquinasFerramentas', secao: 'atividades', referencia: '6.2', label: '6.2. Máquinas, Ferramentas e Equipamentos Utilizados', rows: 5 },
              { campo: 'produtosUtilizados', secao: 'atividades', referencia: '6.4', label: '6.4. Produtos Utilizados Habitualmente nas Atividades', rows: 5 },
              { campo: 'atividadesFuncoes', secao: 'atividades', referencia: '7.1', label: '7.1. Atividades Efetivamente Exercidas', rows: 6 },
            ] as const
          ).map((f) => {
            const campoPadrao = campoPadraoDe(f.campo)
            return (
            <Card key={f.campo}>
              <CardHeader
                title={f.label}
                subtitle={campoPadrao
                  ? ehAdministrador
                    ? 'Texto oficial da matriz — edição administrativa habilitada.'
                    : 'Texto oficial da matriz — protegido contra alterações durante o preenchimento.'
                  : undefined}
                icon={<FileText size={18} />}
                action={
                  <div className="flex flex-wrap gap-2">
                    {campoPadrao && ehAdministrador && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<RotateCcw size={14} />}
                        onClick={() => restaurarTextoPadrao(campoPadrao)}
                      >
                        Texto padrão
                      </Button>
                    )}
                    {(!campoPadrao || ehAdministrador) && <Button
                      size="sm"
                      variant="outline"
                      icon={<BookOpen size={14} />}
                      aria-label={f.referencia ? `Abrir biblioteca do item ${f.referencia}` : 'Abrir biblioteca da apresentação'}
                      onClick={() => setBibliotecaPara({ campo: f.campo, secao: f.secao, referencia: f.referencia })}
                    >
                      Biblioteca
                    </Button>}
                  </div>
                }
              />
              <div className="p-5">
                <Textarea
                  rows={f.rows}
                  value={(p.tecnico[f.campo] as string | undefined) ?? ''}
                  readOnly={Boolean(campoPadrao && !ehAdministrador)}
                  onChange={(e) => setT({ [f.campo]: e.target.value } as never)}
                  placeholder="Digite ou insira um texto da sua biblioteca pessoal…"
                />
              </div>
            </Card>
            )
          })}

          {/* Períodos por função */}
          <Card>
            <CardHeader
              title="7.1. Períodos trabalhados por função"
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
                    rows={4}
                    label="Atividades do período"
                    hint="Informe uma atividade por linha; o documento monta a lista automaticamente."
                    placeholder={'Ex.:\nOperou a máquina impressora.\nAnalisou os clichês antes da impressão.'}
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
              title={p.modalidade === 'ambas'
                ? 'Avaliações NR-15 (item 7.2) e NR-16 (item 7.3)'
                : p.modalidade === 'insalubridade'
                  ? '7.2. Avaliação da Exposição Ocupacional — NR-15'
                  : `${numeroNr16Editor}. Avaliação das Atividades e Operações Perigosas — NR-16`}
              subtitle="A modalidade escolhida no processo define as matrizes NR-15 e NR-16 exibidas nesta etapa."
              icon={<FileText size={18} />}
              action={
                <div className="flex flex-wrap gap-2">
                  {p.modalidade !== 'periculosidade' && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Plus size={14} />}
                      onClick={() => adicionarAgente({
                        id: uid('agn'), nome: '', tipo: 'quimico', criterio: 'qualitativo', grau: 'medio',
                      } as AgenteAvaliado)}
                    >
                      Novo agente NR-15
                    </Button>
                  )}
                  {p.modalidade !== 'insalubridade' && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Plus size={14} />}
                      onClick={() => adicionarAgente({
                        id: uid('ris'), nome: '', tipo: 'periculosidade', criterio: 'qualitativo',
                      } as AgenteAvaliado)}
                    >
                      Nova avaliação NR-16
                    </Button>
                  )}
                </div>
              }
            />
            <div className="space-y-3 p-5">
              {avaliacoesVisiveis.map((a) => {
                if (a.tipo === 'periculosidade') {
                  return (
                    <div key={a.id} className="rounded-lg border border-ink-200 border-l-4 border-l-amber-500 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <ol aria-label="Fluxo técnico da periculosidade" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                          <li className="text-amber-700">Risco</li><li aria-hidden="true">→</li><li>Enquadramento</li><li aria-hidden="true">→</li><li>Conclusão</li>
                        </ol>
                        <Badge tone="navy">Item {numeroNr16Editor}.2</Badge>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          icon={<Trash2 size={15} />}
                          onClick={() => removerAgente(a.id)}
                          aria-label="Remover avaliação NR-16"
                        />
                      </div>
                      <PericulosidadeNr16Fields
                        avaliacao={a}
                        onChange={(avaliacaoAtualizada) => atualizarAgente(a.id, () => avaliacaoAtualizada)}
                      />
                    </div>
                  )
                }
                const referenciaNormativaSelecionada = Boolean(a.referenciaNormativaId)
                const regraAnexo = obterRegraAnexo(a.anexoNr15)
                const agenteFixo = Boolean(regraAnexo?.agenteFixo)
                const grauFixo = regraAnexo?.grausPermitidos.length === 1
                const exibeCas = regraAnexo?.exibeCas ?? true
                const referenciaAvaliacao = a.tipo === 'biologico'
                  ? '7.2.3'
                  : a.tipo === 'quimico'
                    ? '7.2.2'
                    : '7.2.1'
                return (
                <div key={a.id} className="rounded-lg border border-ink-200 border-l-4 border-l-navy-700 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <ol aria-label="Fluxo técnico do agente" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      <li className="text-navy-700">Agente</li><li aria-hidden="true">→</li><li>Medição</li><li aria-hidden="true">→</li><li>Proteção</li>
                    </ol>
                    <Badge tone="navy">Item {referenciaAvaliacao}</Badge>
                  </div>
                  <div className={`grid gap-3 ${exibeCas
                    ? 'md:grid-cols-[minmax(220px,1.4fr)_minmax(120px,0.65fr)_minmax(230px,1fr)_minmax(130px,0.65fr)_auto]'
                    : 'md:grid-cols-[minmax(240px,1.5fr)_minmax(240px,1fr)_minmax(150px,0.7fr)_auto]'}`}>
                    <Input
                      label="Agente"
                      value={regraAnexo?.agenteFixo ?? a.nome}
                      readOnly={referenciaNormativaSelecionada || agenteFixo}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({ ...atual, nome: e.target.value }))}
                    />
                    {exibeCas && <Input
                      label="CAS"
                      value={a.cas ?? ''}
                      disabled={referenciaNormativaSelecionada || Boolean(regraAnexo?.casFixo)}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({ ...atual, cas: e.target.value }))}
                    />}
                    <Select
                      label="Anexo NR-15"
                      value={a.anexoNr15 ?? ''}
                      onChange={(e) => atualizarAgente(a.id, (atual) => aplicarAnexo(atual, e.target.value))}
                    >
                      <option value="">—</option>
                      {ANEXOS_NR15.map((an) => (
                        <option key={an.id} value={an.id}>
                          {an.label}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Grau"
                      value={a.grau ?? ''}
                      disabled={referenciaNormativaSelecionada || grauFixo}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({
                        ...atual,
                        grau: e.target.value as AgenteAvaliado['grau'],
                      }))}
                    >
                      <option value="">— selecione —</option>
                      {(regraAnexo?.grausPermitidos ?? ['minimo', 'medio', 'maximo', 'nao_caracterizado']).map((grau) => (
                        <option key={grau} value={grau}>{ROTULOS_GRAU[grau]}</option>
                      ))}
                    </Select>
                    <Button
                      variant="ghost"
                      className="mb-1 self-end text-red-600 hover:bg-red-50"
                      icon={<Trash2 size={15} />}
                      onClick={() => removerAgente(a.id)}
                      aria-label="Remover agente"
                    />
                  </div>
                  <AgenteNr15Fields
                    agente={a}
                    onChange={(agenteAtualizado) => atualizarAgente(a.id, () => agenteAtualizado)}
                  />
                  <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50/60 p-3">
                    <Checkbox
                      label="Agente identificado na atividade"
                      description="Desmarque quando o agente não estiver presente; o documento mostrará somente o título e a conclusão."
                      checked={a.identificadoNaAtividade !== false}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({
                        ...atual,
                        identificadoNaAtividade: e.target.checked,
                      }))}
                    />
                  </div>
                  <div className="mt-3">
                    <Textarea
                      label="Conclusão da avaliação"
                      rows={4}
                      value={a.observacao ?? ''}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({
                        ...atual,
                        observacao: e.target.value,
                      }))}
                      placeholder="Registre a conclusão específica deste agente. Campo obrigatório para emitir o documento."
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<BookOpen size={14} />}
                        aria-label={`Abrir biblioteca da conclusão de ${a.nome || 'agente'}`}
                        onClick={() => setBibliotecaPara({ agenteId: a.id, secao: 'conclusao', referencia: referenciaAvaliacao })}
                      >
                        Biblioteca
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Select
                      label="Natureza"
                      value={a.tipo}
                      disabled={referenciaNormativaSelecionada || Boolean(regraAnexo?.tipoFixo)}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({
                        ...atual,
                        tipo: e.target.value as AgenteAvaliado['tipo'],
                      }))}
                    >
                      <option value="quimico">Químico</option>
                      <option value="fisico">Físico</option>
                      <option value="biologico">Biológico</option>
                    </Select>
                    <Select
                      label="Critério"
                      value={a.criterio}
                      disabled={referenciaNormativaSelecionada || Boolean(regraAnexo?.criterioFixo)}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({
                        ...atual,
                        criterio: e.target.value as AgenteAvaliado['criterio'],
                      }))}
                    >
                      <option value="qualitativo">Qualitativo</option>
                      <option value="quantitativo">Quantitativo</option>
                      <option value="nao_aplicavel">Não aplicável</option>
                    </Select>
                  </div>
                  <EpiSelector
                    agente={a}
                    dataReferencia={p.dataVistoria}
                    onChange={(agenteAtualizado) => atualizarAgente(a.id, () => agenteAtualizado)}
                  />
                  {/* No ruído a conclusão sai do cálculo, não de um
                      checkbox — vale para o Anexo 1 e para o 2. */}
                  {!usaAtenuacaoRuido(a) && (
                    <div className="mt-3">
                      <Checkbox
                        className="rounded-md px-1 py-1 focus-within:ring-2 focus-within:ring-brand-600"
                        label="EPI comprovadamente eficaz para este agente"
                        description="Adicionar equipamento não altera automaticamente esta conclusão técnica."
                        checked={a.epiEficaz ?? false}
                        onChange={(e) => atualizarAgente(a.id, (atual) => ({ ...atual, epiEficaz: e.target.checked }))}
                      />
                      {/* O enquadramento destes anexos é por atividade, e há
                          quem sustente que aí o EPI não conta. A lei permite
                          contar; quem decide é o perito, então a base fica à
                          vista de quem marca. */}
                      <p className="mt-1.5 rounded-md border border-ink-200 bg-ink-50/70 px-2.5 py-2 text-[11px] leading-4 text-ink-600">
                        NR-15, item 15.4.1: a insalubridade é eliminada ou neutralizada “a) com a
                        adoção de medidas de ordem geral que conservem o ambiente de trabalho dentro
                        dos limites de tolerância; b) com a utilização de equipamento de proteção
                        individual”. No mesmo sentido, o art. 191, I e II, da CLT.
                      </p>
                    </div>
                  )}
                </div>
              )})}
              {avaliacoesVisiveis.length === 0 && (
                <p className="text-sm text-ink-500">Nenhuma avaliação cadastrada para a modalidade selecionada.</p>
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
              title="5.1.3. Registro fotográfico e evidências"
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
              { campo: 'normasReferencias', secao: 'generico', referencia: '4', label: '4. Critérios Técnicos para Avaliação Pericial', rows: 4 },
              { campo: 'equipamentosAnalisados', secao: 'generico', referencia: '5', label: '5. Metodologia de Avaliação', rows: 4 },
              { campo: 'informacoesLevantadas', secao: 'generico', referencia: '6.3', label: '6.3. Constatações da Vistoria Pericial', rows: 5 },
              { campo: 'divergenciasFaticas', secao: 'generico', referencia: numeroDivergenciasEditor, label: `${numeroDivergenciasEditor}. Divergências Fáticas — resumo geral (opcional)`, rows: 4 },
              { campo: 'alegacoesReclamante', secao: 'generico', referencia: `${numeroDivergenciasEditor}.1`, label: `${numeroDivergenciasEditor}.1. Alegações do Reclamante`, rows: 5 },
              { campo: 'informacoesReclamada', secao: 'generico', referencia: `${numeroDivergenciasEditor}.2`, label: `${numeroDivergenciasEditor}.2. Informações prestadas pela Reclamada`, rows: 5 },
              { campo: 'consideracoesDivergencias', secao: 'analise', referencia: numeroConsideracoesEditor, label: `${numeroConsideracoesEditor}. Considerações sobre as Divergências Fáticas`, rows: 6 },
              { campo: 'criterioAvaliacaoPericulosidade', secao: 'analise', referencia: `${numeroNr16Editor}.1`, label: `${numeroNr16Editor}.1. NR-16 — Critério de Avaliação`, rows: 4 },
              { campo: 'notaTecnicaEpis', secao: 'analise', referencia: '8', label: '8. Dos Equipamentos de Proteção Individual (NR-06)', rows: 7 },
              { campo: 'protecoesColetivas', secao: 'analise', referencia: '9', label: '9. Das Proteções Coletivas', rows: 5 },
              {
                campo: 'analiseTecnica',
                secao: 'analise',
                referencia: '10',
                label: p.modalidade === 'insalubridade'
                  ? '10. Análise Técnica dos Agentes'
                  : p.modalidade === 'periculosidade'
                    ? '10. Análise Técnica das Atividades e Riscos'
                    : '10. Análise Técnica dos Agentes, Atividades e Riscos',
                rows: 8,
              },
              { campo: 'conclusaoInsalubridade', secao: 'conclusao', referencia: '11', label: '11. NR-15 — Conclusão e Fundamentação', rows: 6 },
              { campo: 'conclusaoPericulosidade', secao: 'conclusao', referencia: p.modalidade === 'ambas' ? '12' : '11', label: p.modalidade === 'ambas' ? '12. NR-16 — Conclusão e Fundamentação' : '11. NR-16 — Conclusão e Fundamentação', rows: 6 },
              { campo: 'respostasQuesitos', secao: 'conclusao', referencia: p.modalidade === 'ambas' ? '13' : '12', label: p.modalidade === 'ambas' ? '13. Respostas aos Quesitos Técnicos' : '12. Respostas aos Quesitos Técnicos', rows: 8 },
              { campo: 'encerramento', secao: 'conclusao', referencia: p.modalidade === 'ambas' ? '14' : '13', label: p.modalidade === 'ambas' ? '14. Encerramento' : '13. Encerramento', rows: 5 },
            ] as const
          ).filter((f) =>
            (f.campo !== 'conclusaoInsalubridade' || p.modalidade !== 'periculosidade') &&
            (f.campo !== 'conclusaoPericulosidade' || p.modalidade !== 'insalubridade'),
          ).map((f) => {
            const campoPadrao = campoPadraoDe(f.campo)
            return (
            <Card key={f.campo}>
              <CardHeader
                title={f.label}
                subtitle={campoPadrao
                  ? ehAdministrador
                    ? 'Texto oficial da matriz — edição administrativa habilitada.'
                    : 'Texto oficial da matriz — protegido contra alterações durante o preenchimento.'
                  : undefined}
                icon={<FileText size={18} />}
                action={
                  <div className="flex flex-wrap gap-2">
                    {campoPadrao && ehAdministrador && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<RotateCcw size={14} />}
                        onClick={() => restaurarTextoPadrao(campoPadrao)}
                      >
                        Texto padrão
                      </Button>
                    )}
                    {(!campoPadrao || ehAdministrador) && <Button
                      size="sm"
                      variant="outline"
                      icon={<BookOpen size={14} />}
                      aria-label={`Abrir biblioteca do item ${f.referencia}`}
                      onClick={() => setBibliotecaPara({ campo: f.campo, secao: f.secao, referencia: f.referencia })}
                    >
                      Biblioteca
                    </Button>}
                  </div>
                }
              />
              <div className="p-5">
                <Textarea
                  rows={f.rows}
                  value={(p.tecnico[f.campo] as string | undefined) ?? ''}
                  readOnly={Boolean(campoPadrao && !ehAdministrador)}
                  onChange={(e) => setT({ [f.campo]: e.target.value } as never)}
                />
              </div>
            </Card>
            )
          })}
        </div>
      )}

      {/* ============ PASSO 5 — DOCUMENTO (Módulos G/H/I) ============ */}
      {passo === 5 && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4 no-print">
            <Card>
              <CardHeader title="Data e local da assinatura" subtitle="Fecho do documento" />
              <div className="grid gap-3 p-5">
                <Input
                  label="Data da assinatura"
                  type="date"
                  value={p.tecnico.dataAssinatura ?? dadosAssinatura(p).data}
                  onChange={(e) => setT({ dataAssinatura: e.target.value })}
                />
                <Input
                  label="Cidade da assinatura"
                  value={p.tecnico.cidadeAssinatura ?? dadosAssinatura(p).cidade}
                  onChange={(e) => setT({ cidadeAssinatura: e.target.value })}
                  placeholder="Santo André"
                  hint="Por padrão, usa a cidade e a data da vistoria. Ambos podem ser alterados."
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Título do documento" subtitle="Módulo G" icon={<FileText size={18} />} />
              <div className="space-y-3 p-5">
                <Select value={titulo} onChange={(e) => setTitulo(e.target.value)}>
                  <option>Parecer Técnico da Reclamada</option>
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
        tipoDocumento={tipoDoc}
        referencia={bibliotecaPara?.referencia}
        onInserir={(conteudo) => {
          if (!bibliotecaPara) return
          if (bibliotecaPara.agenteId) {
            atualizarAgente(bibliotecaPara.agenteId, (agente) => ({
              ...agente,
              observacao: agente.observacao?.trim() ? `${agente.observacao}\n\n${conteudo}` : conteudo,
            }))
            toast('Texto inserido na conclusão do agente.')
            return
          }
          if (!bibliotecaPara.campo) return
          if (!ehAdministrador && campoPadraoDe(bibliotecaPara.campo)) return
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
