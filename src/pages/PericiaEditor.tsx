import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Camera,
  Check,
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
  SecaoColapsavel,
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
import { FolhasA4 } from '@/components/FolhasA4'
import { AgenteNr15Fields } from '@/components/AgenteNr15Fields'
import { PericulosidadeNr16Fields } from '@/components/PericulosidadeNr16Fields'
import {
  idLinhaVarredura,
  PainelVarreduraNormativa,
  ResumoVarreduraNr16,
} from '@/components/PainelVarreduraNormativa'
import { EficaciaEpiCampo, idCampoEficaciaEpi } from '@/components/EficaciaEpiCampo'
import { ID_PENDENCIAS_EMISSAO, PendenciasEmissao } from '@/components/PendenciasEmissao'
import { camposPendentesAgente, type CampoPendenteAgente } from '@/lib/conclusoesAgentes'
import { rotuloFuncaoPosto } from '@/lib/apresentacaoAgente'
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
  StatusVarredura,
  Usuario,
} from '@/types'
import { ANEXOS_NR15 } from '@/content/anexosNr15'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import { CHAVE_BIBLIOTECA_POR_CAMPO } from '@/content/referenciasParecer'
import {
  CAMPOS_COM_TEXTO_PADRAO,
  patchDeTextosPadrao,
  textosPadraoDaPericia,
  type CampoComTextoPadrao,
} from '@/content/textosPadrao'
import { erroCas } from '@/lib/cas'
import { patchDoProcesso } from '@/lib/consultas'
import {
  LIMITE_FOTOS_POR_ENVIO,
  recusaPorQuantidade,
  recusaPorTamanho,
} from '@/lib/limitesUpload'
import { prepararFotosParaEnvio } from '@/lib/prepararFotos'
import { aplicarAnexo, referenciaNr15PorId } from '@/lib/nr15'
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
import { responsavelDaPericia } from '@/lib/responsavelPericia'
import { comEmpresaVinculada, empresasLivres, opcoesDaLinha } from '@/lib/reclamadas'
import { uid } from '@/lib/utils'
import { camposQuesitosDoLaudo } from '@/lib/quesitosLaudo'
import { honorariosPorExtenso } from '@/lib/honorarios'
import {
  anexoLegalNr15,
  atualizarStatusVarredura,
  mensagemPendencias,
  normalizarVarredura,
  pendenciasVarredura,
  type PendenciaVarredura,
} from '@/lib/varreduraNormativa'

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
  // "Conclusão do laudo" e não "Conclusão": o perito procurou o campo da
  // conclusão nesta etapa e encontrou a do documento inteiro, quando o que
  // ele queria era a conclusão de um agente — que fica na etapa anterior,
  // dentro da avaliação. Os dois campos existem e são diferentes; o rótulo
  // agora diz qual é qual.
  { label: 'Conclusão do laudo', description: 'Módulo D' },
  { label: 'Documento', description: 'Módulos G–I' },
]

// ============================================================
// Estado das avaliações na etapa 3
//
// Retorno do cliente: "ao inserir um anexo e EPI, eles vão ficando na tela,
// está um pouco confuso". Com quatro ou cinco agentes cadastrados a etapa
// virava uma parede de campos, todos abertos ao mesmo tempo.
//
// A regra do que nasce aberto é: o que ainda depende do perito. Avaliação
// pronta chega recolhida, com um resumo de uma linha; o que falta chega
// aberta. Nada é escondido — tudo continua a um clique, e o resumo diz o
// que há dentro sem precisar abrir.
// ============================================================

const RESUMO_RESULTADO_NR16: Record<string, string> = {
  caracterizada: 'periculosidade caracterizada',
  caracterizada_parcial: 'caracterização parcial',
  nao_caracterizada: 'não caracterizada',
  prejudicada: 'não foi possível caracterizar',
}

/** Uma linha que responde, com a avaliação NR-15 fechada: o que falta aqui? */
function resumoNr15(a: AgenteAvaliado): string {
  const epis = a.epis?.length ?? 0
  const pendentes = camposPendentesAgente(a)
  return [
    a.grau ? ROTULOS_GRAU[a.grau] : null,
    epis ? `${epis} EPI${epis > 1 ? 's' : ''}` : null,
    pendentes.includes('observacao') ? 'conclusão pendente' : null,
    pendentes.includes('epiEficaz') ? 'eficácia do EPI pendente' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Avaliação NR-15 que já pode ir ao documento — nasce recolhida. A regra do
 * que falta é a mesma da emissão (`camposPendentesAgente`): o cartão não pode
 * se dizer pronto e a emissão cobrar a eficácia do EPI dele.
 */
function nr15Completa(a: AgenteAvaliado): boolean {
  return Boolean(a.nome?.trim()) && camposPendentesAgente(a).length === 0
}

function resumoNr16(a: AgenteAvaliado): string {
  return [
    a.atividadeEnquadrada?.trim() || a.areaRisco?.trim() || null,
    a.resultadoPericulosidade
      ? RESUMO_RESULTADO_NR16[a.resultadoPericulosidade]
      : a.resultadoPericulosidadeTexto?.trim()
        ? 'resultado em redação própria'
        : 'resultado pendente',
    camposPendentesAgente(a).includes('anexoNr16') ? 'anexo da NR-16 pendente' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Avaliação NR-16 fechada: tem resultado (opção ou redação própria) — e tem
 * anexo da norma quando o resultado afirma o enquadramento, no todo ou em
 * parte.
 *
 * O cenário negativo não precisa de anexo: é o próprio "quando não tem nada".
 * Exigir um deixava a avaliação padrão eternamente aberta como pendência na
 * tela, que foi o que o perito reclamou. Já "Sem enquadramento em Anexo" não
 * conta como anexo para um resultado positivo — caracterizar sem anexo é
 * justamente a contradição que a tela aponta.
 *
 * A regra mora em `camposPendentesAgente`, a mesma que a emissão cobra.
 */
function nr16Completa(a: AgenteAvaliado): boolean {
  return camposPendentesAgente(a).length === 0
}

/** O campo da tela que resolve a pendência — é para ele que "Ir ao campo" leva. */
function idCampoPendente(agenteId: string, campo: CampoPendenteAgente): string {
  return campo === 'epiEficaz' ? idCampoEficaciaEpi(agenteId) : `agente-${agenteId}-${campo}`
}

function idCartaoAgente(agenteId: string): string {
  return `agente-${agenteId}`
}

/**
 * O botão que faz o cartão sumir.
 *
 * Não grava nada — o editor já salva a cada tecla. É o gesto de "terminei
 * este agente", que o perito reconhece do seletor de EPIs: insere, o campo
 * fecha, e o próximo abre limpo. Os vizinhos ficam como estavam.
 */
function BotaoInserirNoLaudo({ onInserir }: { onInserir: () => void }) {
  return (
    <div className="mt-4 flex justify-end border-t border-ink-100 pt-3">
      <Button size="sm" icon={<Check size={14} />} onClick={onInserir}>
        Inserir no laudo
      </Button>
    </div>
  )
}

/**
 * Em qual função este agente foi avaliado.
 *
 * Só aparece quando há período cadastrado na etapa 1 — sem função nenhuma
 * lançada não há o que escolher. Guarda o id, nunca o rótulo: ver
 * `AgenteAvaliado.periodoId`.
 */
function SeletorFuncaoPosto({
  agente,
  periodos,
  onChange,
}: {
  agente: AgenteAvaliado
  periodos: PeriodoFuncao[]
  onChange: (periodoId: string | undefined) => void
}) {
  if (!periodos.length) return null
  return (
    <div className="mb-3">
      <Select
        label="Função / Posto avaliado"
        value={agente.periodoId ?? ''}
        hint="Lance o mesmo agente uma vez por função quando houver mais de um posto no período. Em branco, o agente vale para todo o período avaliado."
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">— todo o período avaliado —</option>
        {periodos.map((periodo) => (
          <option key={periodo.id} value={periodo.id}>
            {rotuloFuncaoPosto(periodo) || 'Período sem função'}
          </option>
        ))}
      </Select>
    </div>
  )
}

// Rótulo da modalidade impresso no título do documento. Espelha
// MODALIDADE_LABEL de server/src/services/documento-comum.ts — os dois
// precisam mudar juntos, senão a prévia e o PDF divergem. Não dá para
// reaproveitar o MODALIDADE de Pericias.tsx: lá o rótulo da listagem usa
// "Insalubridade + Periculosidade", que não é o texto do documento.
const MODALIDADE_TITULO: Record<Pericia['modalidade'], string> = {
  insalubridade: 'Insalubridade',
  periculosidade: 'Periculosidade',
  ambas: 'Insalubridade e Periculosidade',
}

/** Fotos por requisição. Pequeno o bastante para uma rede móvel lenta não cortar o POST. */
const FOTOS_POR_LOTE = 6

// Na ordem em que as fotos saem no documento, com o item entre parênteses:
// é assim que o perito confere se subiu na seção certa. Espelha
// ORDEM_SECAO_FOTO de src/lib/fotosDocumento.ts.
//
// 'epi' não é mais oferecida aqui (pedido do cliente: ficou redundante com
// "Evidências constatadas em perícia"), mas continua em SecaoFoto — fotos já
// enviadas àquela seção seguem aparecendo agrupadas em 'documentos', abaixo.
const SECOES_FOTO: { value: SecaoFoto; label: string }[] = [
  { value: 'ambiente', label: 'Ambiente de trabalho (item 3.1)' },
  { value: 'atividades', label: 'Atividades desenvolvidas (item 6.1)' },
  { value: 'equipamentos', label: 'Equipamentos e máquinas (item 6.2)' },
  { value: 'produtos', label: 'Produtos químicos (item 6.4)' },
  { value: 'documentos', label: 'Evidências constatadas em perícia (item 6.3)' },
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
      riscoAlegadoPericulosidade: '',
      fonteRiscoAlegado: '',
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
  const { usuario, usuarios, empresas, pericias, salvarPericia, salvarDocumento, documentos } = useApp()

  const tipoDoc = (params.get('tipo') as 'parecer' | 'laudo') ?? 'parecer'
  // O cabeçalho chama de "novo" o documento que vai sair, não a perícia: é
  // pelo nome do documento que o perito escolheu o caminho no menu.
  const nomeDocumento = tipoDoc === 'laudo' ? 'Laudo Técnico' : 'Parecer Técnico'
  const original = id ? pericias.find((p) => p.id === id) : undefined

  const [p, setP] = useState<Pericia>(() => original ?? novaPericia(usuario?.id ?? 'usr-1'))
  /** Sempre a versão mais recente — quem espera um upload não pode usar a de antes. */
  const pRef = useRef(p)
  pRef.current = p
  const [passo, setPasso] = useState(0)
  const [titulo, setTitulo] = useState(
    tipoDoc === 'laudo' ? 'Laudo Técnico Pericial' : 'Parecer Técnico da Reclamada',
  )
  const [bibliotecaPara, setBibliotecaPara] = useState<{
    campo?: keyof Pericia['tecnico']
    agenteId?: string
    secao: SecaoTexto
    /** Chave do catálogo — sempre a numeração de “ambas”. */
    referencia?: string
    /** Número que ESTE documento imprime, só para o perito ler. */
    rotuloReferencia?: string
  } | null>(null)
  const [emailAberto, setEmailAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [exportando, setExportando] = useState<'pdf' | 'docx' | null>(null)
  const [enviandoFotos, setEnviandoFotos] = useState(false)
  /** Texto do botão durante o envio: "Preparando…", "Enviando 7 de 20…". */
  const [progressoFotos, setProgressoFotos] = useState<string | null>(null)
  /** Documento já emitido para esta perícia — reemitir atualiza, não duplica. */
  const [documentoId, setDocumentoId] = useState<string | null>(null)
  const [anexo, setAnexo] = useState<string | undefined>()
  /** Cadastro de reclamada aberto de dentro da perícia — null = fechado. */
  const [empresaNova, setEmpresaNova] = useState<Empresa | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  // ------------------------------------------------------------
  // Aberto ou fechado, avaliação por avaliação.
  //
  // Pedido do perito, nestas palavras: "você insere o agente, ele fica na
  // tela; vai inserir outro, a tela vai aumentando... acaba que a tela fica
  // grande. Se desse para o agente sumir depois de inserido no laudo e abrir
  // outra tela para o próximo, igual ao do EPI, aí vai ficar top."
  //
  // O que ele descreveu é o cartão que se recolhe sozinho ao ser inserido, e
  // não sanfona: ele nunca pediu que abrir um feche os outros, e comparar
  // duas avaliações lado a lado é rotina de perícia. Como cada cartão que
  // termina se fecha, a tela para de crescer do mesmo jeito.
  //
  // O estado mora aqui, e não dentro de `SecaoColapsavel`, porque quem fecha
  // é o botão "Inserir no laudo", que está no corpo do cartão. Por isso o
  // componente ganhou modo controlado — ver a decisão 3 no cabeçalho dele.
  //
  // Fechado não é escondido: o cartão recolhido continua mostrando título,
  // resumo, número do item e o aviso de pendência.
  // ------------------------------------------------------------
  const [aberturaAgentes, setAberturaAgentes] = useState<Record<string, boolean>>({})
  const avaliacaoCompleta = (avaliacao: AgenteAvaliado) =>
    avaliacao.tipo === 'periculosidade' ? nr16Completa(avaliacao) : nr15Completa(avaliacao)
  const cartaoAberto = (avaliacao: AgenteAvaliado) =>
    aberturaAgentes[avaliacao.id] ?? !avaliacaoCompleta(avaliacao)
  const definirCartaoAberto = (idAgente: string, aberto: boolean) =>
    setAberturaAgentes((atual) => ({ ...atual, [idAgente]: aberto }))
  /**
   * Para onde levar o perito depois que a tela redesenhar. Não dá para focar
   * na hora do clique: o cartão pode estar fechado, a etapa pode ser outra e a
   * avaliação pode nem existir ainda.
   */
  const [alvoFoco, setAlvoFoco] = useState<string | null>(null)
  const [secaoFotoAtual, setSecaoFotoAtual] = useState<SecaoFoto>('ambiente')
  const [consultandoCep, setConsultandoCep] = useState(false)

  // A perícia do store entra na tela ao carregar e ao trocar de perícia pela
  // rota — depois disso, quem manda é a tela. Adotar TODA mudança do store
  // desfazia o que o perito digitava enquanto uma gravação corria: o upsert
  // troca a perícia da lista na hora do envio e de novo na resposta, e o
  // rollback de uma falha trazia de volta a versão de antes das fotos.
  const adotada = useRef(original?.id)
  useEffect(() => {
    if (!original || adotada.current === original.id) return
    adotada.current = original.id
    setP(original)
  }, [original])

  useEffect(() => {
    if (!alvoFoco || passo !== 2) return
    setAlvoFoco(null)
    const elemento = document.getElementById(alvoFoco)
    if (!elemento) return
    elemento.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    elemento.focus({ preventScroll: true })
  }, [alvoFoco, passo])

  /**
   * Grava o padrão de cada avaliação na primeira vez que ela aparece.
   *
   * O padrão é o de sempre: avaliação incompleta nasce aberta. Mas ele não
   * pode continuar sendo recalculado, ou o cartão se fecharia na cara do
   * perito no instante em que ele terminasse de digitar a conclusão — que é
   * justamente o que torna a avaliação "completa". Congelado aqui, só um
   * clique o muda daí em diante. É a decisão 1 de `SecaoColapsavel`, agora
   * que quem guarda o estado é esta tela.
   *
   * Não reabre nada: id que já está no mapa passa intacto, inclusive depois
   * de gravar, quando a resposta do servidor troca `p` inteiro.
   */
  useEffect(() => {
    setAberturaAgentes((atual) => {
      const novos = p.tecnico.agentes.filter((avaliacao) => !(avaliacao.id in atual))
      if (!novos.length) return atual
      return {
        ...atual,
        ...Object.fromEntries(novos.map((avaliacao) => [avaliacao.id, !avaliacaoCompleta(avaliacao)])),
      }
    })
    // Depende só da lista de agentes: quem entra é id novo, e o resto do
    // formulário mudando não tem por que reabrir cartão nenhum.
  }, [p.tecnico.agentes])

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

  const adicionarAgente = (agente: AgenteAvaliado) => {
    transformarAgentes((agentes) => [...agentes, agente])
    // A tela nova que o perito pediu. O padrão já abriria — está vazia, logo
    // incompleta —, mas dizer aqui deixa a intenção escrita.
    definirCartaoAberto(agente.id, true)
  }

  function marcarVarredura(anexoId: string, status: StatusVarredura) {
    setP((atual) => ({
      ...atual,
      tecnico: atualizarStatusVarredura(atual.tecnico, 'NR-15', anexoId, status),
    }))
  }

  /** "Marcar pendentes como sem exposição": uma gravação só para todos os anexos. */
  function marcarSemExposicao(anexoIds: string[]) {
    setP((atual) => ({
      ...atual,
      tecnico: anexoIds.reduce(
        (tecnico, anexoId) => atualizarStatusVarredura(tecnico, 'NR-15', anexoId, 'sem_exposicao'),
        atual.tecnico,
      ),
    }))
  }

  /**
   * "Avaliação da suposta exposição" num anexo da NR-15: abre a avaliação
   * dele — a que já existe ou uma nova — e devolve o id do que focar, para a
   * tela levar o perito até lá. A NR-16 não passa mais por aqui: o quadro dela
   * sai das próprias avaliações.
   */
  function registrarExposicao(anexoId: string): string {
    marcarVarredura(anexoId, 'exposicao_identificada')

    const existente = p.tecnico.agentes.find((agente) => agente.tipo !== 'periculosidade' && (
      anexoId === 'ANEXO_13A'
        ? agente.anexoNr15 === 'ANEXO_13A'
        : anexoLegalNr15(agente.anexoNr15) === anexoId
    ))
    if (existente) {
      definirCartaoAberto(existente.id, true)
      return idCartaoAgente(existente.id)
    }

    const tipo = anexoId === 'ANEXO_11' || anexoId === 'ANEXO_12' || anexoId === 'ANEXO_13' || anexoId === 'ANEXO_13A'
      ? 'quimico'
      : anexoId === 'ANEXO_14' ? 'biologico' : 'fisico'
    if (ANEXOS_NR15.some((anexo) => anexo.id === anexoId)) {
      const nova = aplicarAnexo({ id: uid('agn'), nome: '', tipo, criterio: 'qualitativo' } as AgenteAvaliado, anexoId)
      adicionarAgente(nova)
      return idCartaoAgente(nova.id)
    }

    // Os anexos 8 e 12 só existem na lista pelos subtipos (VMB/VCI; asbesto,
    // manganês, sílica): a avaliação nasce sem anexo e o perito escolhe. Até
    // lá o anexo segue pendente — e cada clique criava mais uma avaliação em
    // branco. Agora reaproveita a que está esperando a escolha e leva o
    // perito direto ao campo.
    const emBranco = p.tecnico.agentes.find((agente) =>
      agente.tipo === tipo && !agente.anexoNr15 && !agente.nome?.trim())
    const idAvaliacao = emBranco?.id ?? uid('agn')
    if (emBranco) definirCartaoAberto(emBranco.id, true)
    else adicionarAgente({ id: idAvaliacao, nome: '', tipo, criterio: 'qualitativo' } as AgenteAvaliado)
    return `agente-${idAvaliacao}-anexoNr15`
  }

  function novaAvaliacaoNr16(): string {
    const idAvaliacao = uid('ris')
    adicionarAgente({
      id: idAvaliacao, nome: '', tipo: 'periculosidade', criterio: 'qualitativo',
    } as AgenteAvaliado)
    return idAvaliacao
  }

  /** O botão de cada linha da lista de pendências: leva ao lugar que a resolve. */
  function irParaPendencia(pendencia: PendenciaVarredura) {
    setPasso(2)
    if (pendencia.agenteId && pendencia.campo) {
      definirCartaoAberto(pendencia.agenteId, true)
      setAlvoFoco(idCampoPendente(pendencia.agenteId, pendencia.campo))
      return
    }
    if (pendencia.motivo === 'sem avaliação registrada') {
      setAlvoFoco(idCartaoAgente(novaAvaliacaoNr16()))
      return
    }
    if (pendencia.motivo === 'sem avaliação detalhada' && pendencia.norma === 'NR-15' && pendencia.anexoId) {
      setAlvoFoco(registrarExposicao(pendencia.anexoId))
      return
    }
    if (pendencia.anexoId) setAlvoFoco(idLinhaVarredura(pendencia.norma, pendencia.anexoId))
  }

  const atualizarAgente = (
    idAgente: string,
    transformar: (agente: AgenteAvaliado) => AgenteAvaliado,
  ) => transformarAgentes((agentes) =>
    agentes.map((agente) => agente.id === idAgente ? transformar(agente) : agente),
  )

  const removerAgente = (idAgente: string) => {
    transformarAgentes((agentes) => agentes.filter((agente) => agente.id !== idAgente))
    setAberturaAgentes(({ [idAgente]: _removido, ...resto }) => resto)
  }

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

  // Título completo do documento: é o que a prévia mostra, o que fica
  // gravado no histórico e o que o PDF/DOCX imprimem no H1. Vinha com a
  // modalidade crua ("— insalubridade", minúsculo) para modalidade única.
  const tituloDocumento = `${titulo} — ${MODALIDADE_TITULO[p.modalidade]}`

  const docsDaPericia = documentos.filter((d) => d.periciaId === p.id)
  const avaliacoesVisiveis = p.tecnico.agentes.filter((avaliacao) =>
    p.modalidade === 'ambas'
      ? true
      : p.modalidade === 'periculosidade'
        ? avaliacao.tipo === 'periculosidade'
        : avaliacao.tipo !== 'periculosidade',
  )
  const varreduraNormativa = normalizarVarredura(p.tecnico, p.modalidade)
  const pendenciasNormativas = pendenciasVarredura(p.tecnico, p.modalidade)
  // Os renderizadores filtram `t.agentes` inteiro por tipo, não a lista
  // visível do editor — e numeram os subitens do 7.2 pela POSIÇÃO nessa
  // lista. Quem manda no crachá e no hint tem de ser este índice, ou o
  // editor promete um número que o arquivo assinado não usa.
  const agentesNr15Editor = p.tecnico.agentes.filter((avaliacao) => avaliacao.tipo !== 'periculosidade')
  // ------------------------------------------------------------
  // A lista da tela, quebrada por função quando há vínculo.
  //
  // O perito descreveu assim: "pego o ruído aqui como exemplo. Função tal,
  // insiro o ruído, o valor que deu, o EPI; e aí depois tem que inserir o
  // ruído de novo em outra função. Então ele teria que ficar dividido ali
  // naquele campo de onde vão entrar os agentes."
  //
  // Agrupa só a TELA. O documento continua com uma lista corrida, porque a
  // numeração do 7.2 é posicional nos três renderizadores — reagrupar lá
  // renumeraria os subitens e o crachá do editor passaria a prometer um
  // número que o arquivo assinado não usa.
  //
  // Sem nenhum agente vinculado — toda perícia até hoje — não há cabeçalho
  // nenhum e a tela é exatamente a de antes.
  // ------------------------------------------------------------
  const periodosConhecidos = new Set(p.tecnico.periodos.map((periodo) => periodo.id))
  const blocosDeAvaliacao: { rotulo: string | null; agentes: AgenteAvaliado[] }[] =
    avaliacoesVisiveis.some((avaliacao) => avaliacao.periodoId)
      ? [
          ...p.tecnico.periodos
            .map((periodo) => ({
              rotulo: rotuloFuncaoPosto(periodo) || 'Período sem função',
              agentes: avaliacoesVisiveis.filter((avaliacao) => avaliacao.periodoId === periodo.id),
            }))
            .filter((bloco) => bloco.agentes.length > 0),
          // O período pode ter sido apagado na etapa 1 depois de vinculado.
          // O agente órfão continua indo ao documento, então continua à vista.
          ...(() => {
            const soltos = avaliacoesVisiveis.filter(
              (avaliacao) => !avaliacao.periodoId || !periodosConhecidos.has(avaliacao.periodoId),
            )
            return soltos.length ? [{ rotulo: 'Sem função vinculada', agentes: soltos }] : []
          })(),
        ]
      : [{ rotulo: null, agentes: avaliacoesVisiveis }]
  const numeroNr16Editor = p.modalidade === 'ambas' ? '7.3' : '7.2'
  const numeroAnaliseNr16Editor = p.modalidade === 'ambas' ? '10.2' : '10.1'
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
    // A versão mais recente, não a do render que chamou: as fotos salvam
    // depois de esperar a redução no navegador, e a perícia daquele render
    // desfazia a legenda digitada durante o "Preparando…".
    const base = pRef.current
    const agentes = base.tecnico.agentes.map((agente) => {
      const nomeFixo = obterRegraAnexo(agente.anexoNr15)?.agenteFixo
      return nomeFixo ? { ...agente, nome: nomeFixo } : agente
    })
    const atualizado = {
      ...base,
      tecnico: { ...base.tecnico, agentes },
      atualizadoEm: new Date().toISOString().slice(0, 10),
    }
    try {
      const salva = await salvarPericia(atualizado)
      // Editou enquanto gravava: fica a edição, que o próximo salvar leva.
      setP((atual) => (atual === base ? salva : atual))
      if (!silencioso) toast('Rascunho salvo. Você pode continuar depois.')
      return salva
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar o rascunho.', 'error')
      return null
    }
  }

  /**
   * Tira a perícia da fila de pendências quando o documento fica pronto.
   *
   * A perícia nascia "rascunho" e nada, em lugar nenhum, mudava isso: mesmo
   * depois de gerar, exportar e anexar o laudo ela continuava contada como
   * pendente no painel e na aba "Rascunho" da listagem. Era esse o "ele
   * sempre permanece nas pendências" do retorno do cliente.
   *
   * Gerar o documento é o marco que conclui a perícia. Quem já está
   * "entregue" não regride — a entrega é um passo adiante da conclusão.
   */
  async function concluirPericia(salva: Pericia): Promise<void> {
    if (salva.status !== 'rascunho' && salva.status !== 'em_andamento') return
    try {
      const concluida = await salvarPericia({ ...salva, status: 'concluida' })
      // Editou enquanto gravava: fica a edição, já com o status novo — senão
      // o próximo salvar devolvia a perícia a "rascunho".
      setP((atual) => (atual === salva ? concluida : { ...atual, status: concluida.status }))
    } catch {
      // Falhar aqui não pode derrubar a geração do documento, que é o que o
      // perito pediu. O status volta a ser tentado na próxima gravação.
    }
  }

  /** Grava (ou atualiza) o documento no histórico e devolve o id. */
  async function finalizarDocumento(silencioso = false): Promise<string | null> {
    // A mesma regra que a API aplica ao gerar o arquivo (src/lib/varreduraNormativa.ts).
    // O aviso sozinho não bastava — o perito leu o que faltava e ainda não
    // achou onde resolver. Por isso a tela volta à etapa, na lista de
    // pendências, com um botão por item.
    const pendencias = pendenciasVarredura(p.tecnico, p.modalidade)
    if (pendencias.length) {
      setPasso(2)
      toast(mensagemPendencias(pendencias), 'error')
      setAlvoFoco(ID_PENDENCIAS_EMISSAO)
      return null
    }
    const salva = await salvarRascunho(true)
    if (!salva) return null

    const hoje = new Date().toISOString().slice(0, 10)

    try {
      const doc = await salvarDocumento({
        id: documentoId ?? uid('doc'),
        tipo: tipoDoc,
        titulo: tituloDocumento,
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
      await concluirPericia(salva)
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
  /**
   * Recebe um array copiado do <input>, nunca o FileList: o Chromium esvazia
   * o FileList no próprio objeto quando o input é zerado, e a lista chegava
   * vazia ao envio depois do primeiro await — nenhuma foto subia, e a tela
   * ainda dizia "0 foto(s) adicionada(s)" em verde.
   */
  async function adicionarFotos(arquivos: File[], agenteId?: string, nomeAgente?: string) {
    if (!arquivos.length) return
    const secao: SecaoFoto = agenteId ? 'documentos' : secaoFotoAtual
    const rotulo = agenteId
      ? `Medição / avaliação técnica — ${nomeAgente?.trim() || 'agente'}`
      : SECOES_FOTO.find((s) => s.value === secao)?.label

    // A quantidade confere ANTES de tudo: a tela anuncia o teto, e o
    // <input multiple> não o impõe sozinho.
    const recusaQuantidade = recusaPorQuantidade(arquivos)
    if (recusaQuantidade) {
      toast(recusaQuantidade, 'error')
      return
    }

    setEnviandoFotos(true)
    setProgressoFotos('Preparando…')
    try {
      // Foto grande é reduzida e HEIC/BMP vira JPEG aqui mesmo, no
      // navegador. Só o arquivo que não abre é recusado — e sozinho, sem
      // derrubar o lote.
      const { prontos, recusas } = await prepararFotosParaEnvio(arquivos)
      recusas.forEach((recusa) => toast(recusa, 'error'))
      // Garantia de paridade com o multer: nada acima do teto segue adiante.
      const recusaTamanho = recusaPorTamanho(prontos)
      if (recusaTamanho) {
        toast(recusaTamanho, 'error')
        return
      }
      if (!prontos.length) return

      // A perícia precisa existir no banco antes de receber fotos.
      const salva = await salvarRascunho(true)
      if (!salva) return

      // Lotes pequenos: um POST de 30 fotos numa rede móvel lenta pode ser
      // cortado pelo proxy, e aí nenhuma foto sobe. Em lotes, o que já subiu
      // fica, e o perito vê o andamento.
      const novas: Foto[] = []
      let falha: unknown
      for (let inicio = 0; inicio < prontos.length; inicio += FOTOS_POR_LOTE) {
        const lote = prontos.slice(inicio, inicio + FOTOS_POR_LOTE)
        setProgressoFotos(`Enviando ${inicio + lote.length} de ${prontos.length}…`)
        try {
          novas.push(...(await api.fotos.enviar(salva.id, secao, lote, agenteId)))
        } catch (e) {
          falha = e
          break
        }
      }

      if (!novas.length) {
        toast(api.mensagemDeErro(falha, 'Nenhuma foto foi gravada. Tente de novo.'), 'error')
        return
      }

      // O upload persiste o arquivo, mas o POST da perícia é quem mantém a
      // lista de fotos. Sincronizar agora impede que o próximo salvar
      // interprete a imagem recém-enviada como removida. A base é o estado
      // MAIS RECENTE, não o snapshot de antes do envio: uma legenda editada
      // enquanto as fotos subiam não pode ser desfeita.
      const atual = pRef.current.id === salva.id ? pRef.current : salva
      const idsExistentes = new Set(atual.fotos.map((f) => f.id))
      const comFotos = {
        ...atual,
        fotos: [...atual.fotos, ...novas.filter((f) => !idsExistentes.has(f.id))],
      }
      setP(comFotos)

      if (falha) {
        toast(
          `${novas.length} de ${prontos.length} foto(s) enviada(s) em "${rotulo}". ${api.mensagemDeErro(falha, 'As demais falharam.')}`,
          'error',
        )
      } else {
        toast(`${novas.length} foto(s) adicionada(s) em "${rotulo}".`)
      }

      try {
        const sincronizada = await salvarPericia(comFotos)
        setP((atual) => (atual === comFotos ? sincronizada : atual))
      } catch {
        // As fotos JÁ estão gravadas. Dizer "falha ao enviar" aqui faria o
        // perito reenviar e duplicar as imagens.
        toast('As fotos foram gravadas, mas a lista da perícia não foi atualizada. Salve o rascunho antes de sair.', 'error')
      }
    } catch (e) {
      toast(api.mensagemDeErro(e, 'Falha ao enviar as fotos.'), 'error')
    } finally {
      setEnviandoFotos(false)
      setProgressoFotos(null)
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

  function painelFotosDoAgente(agente: AgenteAvaliado) {
    const fotos = p.fotos.filter((foto) => foto.agenteId === agente.id)
    const nome = agente.nome?.trim() || 'agente avaliado'
    const idUpload = `fotos-agente-${agente.id}`
    const idCamera = `camera-agente-${agente.id}`
    const aoSelecionar = (arquivos: FileList | null) => {
      void adicionarFotos(Array.from(arquivos ?? []), agente.id, nome)
    }

    return (
      <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/50 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-800">Fotografias da medição / avaliação</p>
            <p className="text-xs text-ink-500">Ficam vinculadas somente a este agente e saem logo abaixo da tabela correspondente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label htmlFor={idUpload} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-navy-700 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50">
              <ImagePlus size={14} /> Enviar fotos
            </label>
            <input
              id={idUpload}
              aria-label={`Enviar fotos de ${nome}`}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { aoSelecionar(e.target.files); e.target.value = '' }}
            />
            <label htmlFor={idCamera} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-navy-700 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50">
              <Camera size={14} /> Usar câmera
            </label>
            <input
              id={idCamera}
              aria-label={`Capturar foto de ${nome}`}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { aoSelecionar(e.target.files); e.target.value = '' }}
            />
          </div>
        </div>
        {fotos.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {fotos.map((foto) => (
              <div key={foto.id} className="rounded-lg border border-ink-200 bg-white p-2">
                <div className="aspect-[4/3] overflow-hidden rounded bg-ink-100">
                  <img src={foto.url} alt={foto.legenda} className="h-full w-full object-cover" />
                </div>
                <input
                  value={foto.legenda}
                  onChange={(e) => set({
                    fotos: p.fotos.map((item) => item.id === foto.id
                      ? { ...item, legenda: e.target.value }
                      : item),
                  })}
                  placeholder="Legenda da medição"
                  className="mt-2 w-full rounded border border-ink-200 px-2 py-1 text-[12px] focus:border-brand-600"
                />
                <button
                  type="button"
                  onClick={() => void removerFoto(foto)}
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
        breadcrumb={id ? 'Editar perícia' : `Novo ${nomeDocumento}`}
        title={p.numeroProcesso || `Novo ${nomeDocumento}`}
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
          {/*
            Títulos de nível 1 (o 3 e o 7) não têm campo de texto: no documento
            o subitem sobe colado no título, e a ordem é título → subitem →
            texto → foto → legenda da foto (pedido do perito). Por isso a
            lista começa no 3.1: `descricaoEmpresa` continua no modelo por
            causa das perícias já gravadas, mas não é mais editado nem impresso.
          */}
          {(
            [
              { campo: 'apresentacao', secao: 'apresentacao', referencia: undefined, label: 'APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA', rows: 5 },
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
                    : 'Texto oficial da matriz — protegido contra alterações. Para ler inteiro: Biblioteca › Textos oficiais da matriz.'
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
                      onClick={() => setBibliotecaPara({
                        campo: f.campo,
                        secao: f.secao,
                        // Cataloga pela chave canônica; mostra o número impresso.
                        referencia: CHAVE_BIBLIOTECA_POR_CAMPO[f.campo] ?? f.referencia,
                        rotuloReferencia: f.referencia,
                      })}
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
                      onClick={() => novaAvaliacaoNr16()}
                    >
                      Nova avaliação NR-16
                    </Button>
                  )}
                </div>
              }
            />
            <div className="space-y-3 p-5">
              <PendenciasEmissao pendencias={pendenciasNormativas} onIr={irParaPendencia} />
              {p.modalidade !== 'periculosidade' && (
                <PainelVarreduraNormativa
                  norma="NR-15"
                  itens={varreduraNormativa.nr15}
                  pendencias={pendenciasNormativas}
                  onStatusChange={(anexoId, status) => marcarVarredura(anexoId, status)}
                  onExposicao={(anexoId) => setAlvoFoco(registrarExposicao(anexoId))}
                  onMarcarSemExposicao={marcarSemExposicao}
                />
              )}
              {p.modalidade !== 'insalubridade' && (
                <ResumoVarreduraNr16
                  itens={varreduraNormativa.nr16}
                  onRegistrarAvaliacao={p.tecnico.agentes.some((avaliacao) => avaliacao.tipo === 'periculosidade')
                    ? undefined
                    : () => setAlvoFoco(idCartaoAgente(novaAvaliacaoNr16()))}
                />
              )}
              {blocosDeAvaliacao.map((bloco, indiceBloco) => (
                <div key={`${indiceBloco}-${bloco.rotulo ?? ''}`} className="space-y-3">
                {bloco.rotulo && (
                  <h3 className="flex items-center gap-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
                    {bloco.rotulo}
                    <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
                  </h3>
                )}
                {bloco.agentes.map((a) => {
                if (a.tipo === 'periculosidade') {
                  return (
                    <div
                      key={a.id}
                      id={idCartaoAgente(a.id)}
                      tabIndex={-1}
                      className="rounded-lg border border-ink-200 border-l-4 border-l-amber-500 p-3 outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <SecaoColapsavel
                        titulo={a.nome?.trim() || 'Nova avaliação NR-16'}
                        resumo={resumoNr16(a)}
                        aberto={cartaoAberto(a)}
                        onAbertoChange={(aberto) => definirCartaoAberto(a.id, aberto)}
                        acoes={
                          <div className="flex items-center gap-2">
                            {!cartaoAberto(a) && !nr16Completa(a) && (
                              <Badge tone="amber">pendente</Badge>
                            )}
                            {/* O quadro da avaliação NR-16 não tem número próprio:
                                ele sai dentro da tabela do item 7 e como quadro do
                                item 10. O ".2" daqui apontava para o 7.3.2, que é a
                                transcrição do risco alegado — outro campo. */}
                            <Badge tone="navy">Itens {numeroNr16Editor} e {numeroAnaliseNr16Editor}</Badge>
                            <Button
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              icon={<Trash2 size={15} />}
                              onClick={() => removerAgente(a.id)}
                              aria-label="Remover avaliação NR-16"
                            />
                          </div>
                        }
                      >
                        <SeletorFuncaoPosto
                          agente={a}
                          periodos={p.tecnico.periodos}
                          onChange={(periodoId) => atualizarAgente(a.id, (atual) => ({ ...atual, periodoId }))}
                        />
                        <PericulosidadeNr16Fields
                          avaliacao={a}
                          onChange={(avaliacaoAtualizada) => atualizarAgente(a.id, () => avaliacaoAtualizada)}
                        />
                        {painelFotosDoAgente(a)}
                        <BotaoInserirNoLaudo onInserir={() => definirCartaoAberto(a.id, false)} />
                      </SecaoColapsavel>
                    </div>
                  )
                }
                const referenciaNormativaSelecionada = Boolean(a.referenciaNormativaId)
                const regraAnexo = obterRegraAnexo(a.anexoNr15)
                const agenteFixo = Boolean(regraAnexo?.agenteFixo)
                const grauFixo = regraAnexo?.grausPermitidos.length === 1
                const exibeCas = regraAnexo?.exibeCas ?? true
                // O CAS só fica travado quando vem de quem o impõe: a substância
                // do Anexo 11 (a lista traz o número) ou o agente fixo do Anexo
                // 12. As atividades do Anexo 13 não trazem CAS — ali o perito
                // registra o do composto específico, quando houver.
                const casImposto = Boolean(referenciaNr15PorId(a.referenciaNormativaId)?.cas) || Boolean(regraAnexo?.casFixo)
                // O número que sai no documento é posicional (documento-html.ts,
                // docx.ts e DocumentoPreview.tsx usam `indice + 1` sobre a lista
                // dos agentes NR-15).
                const numeroAvaliacao = `7.2.${agentesNr15Editor.findIndex((item) => item.id === a.id) + 1}`
                // Já a Biblioteca cataloga por natureza: REFERENCIAS_PARECER é
                // fixo (7.2.1 Físico, 7.2.2 Químico, 7.2.3 Biológico) e é por ele
                // que o filtro dos textos salvos casa.
                const referenciaBiblioteca = a.tipo === 'biologico'
                  ? '7.2.3'
                  : a.tipo === 'quimico'
                    ? '7.2.2'
                    : '7.2.1'
                return (
                <div
                  key={a.id}
                  id={idCartaoAgente(a.id)}
                  tabIndex={-1}
                  className="rounded-lg border border-ink-200 border-l-4 border-l-navy-700 p-3 outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <SecaoColapsavel
                    titulo={a.nome?.trim() || regraAnexo?.agenteFixo || 'Novo agente NR-15'}
                    resumo={resumoNr15(a)}
                    aberto={cartaoAberto(a)}
                    onAbertoChange={(aberto) => definirCartaoAberto(a.id, aberto)}
                    acoes={
                      <div className="flex shrink-0 items-center gap-2">
                        {!cartaoAberto(a) && !nr15Completa(a) && (
                          <Badge tone="amber">pendente</Badge>
                        )}
                        <Badge tone="navy">Item {numeroAvaliacao}</Badge>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          icon={<Trash2 size={15} />}
                          onClick={() => removerAgente(a.id)}
                          aria-label="Remover agente"
                        />
                      </div>
                    }
                  >
                  <ol aria-label="Fluxo técnico do agente" className="mb-3 mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    <li className="text-navy-700">Agente</li><li aria-hidden="true">→</li><li>Medição</li><li aria-hidden="true">→</li><li>Proteção</li><li aria-hidden="true">→</li><li>Conclusão</li>
                  </ol>
                  <SeletorFuncaoPosto
                    agente={a}
                    periodos={p.tecnico.periodos}
                    onChange={(periodoId) => atualizarAgente(a.id, (atual) => ({ ...atual, periodoId }))}
                  />
                  <div className={`grid gap-3 ${exibeCas
                    ? 'md:grid-cols-[minmax(220px,1.4fr)_minmax(120px,0.65fr)_minmax(230px,1fr)_minmax(130px,0.65fr)]'
                    : 'md:grid-cols-[minmax(240px,1.5fr)_minmax(240px,1fr)_minmax(150px,0.7fr)]'}`}>
                    <Input
                      label="Agente"
                      value={regraAnexo?.agenteFixo ?? a.nome}
                      readOnly={referenciaNormativaSelecionada || agenteFixo}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({ ...atual, nome: e.target.value }))}
                    />
                    {exibeCas && <Input
                      label="CAS"
                      value={a.cas ?? ''}
                      disabled={casImposto}
                      error={casImposto ? undefined : erroCas(a.cas)}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({ ...atual, cas: e.target.value }))}
                    />}
                    <Select
                      id={`agente-${a.id}-anexoNr15`}
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
                  </div>
                  {/* A conclusão subiu para logo abaixo da identificação do
                      agente. Ela ficava no fim do cartão, depois da medição,
                      dos EPIs e de dois blocos de texto normativo — e o
                      perito perguntou "em qual campo insiro o texto da
                      conclusão?". Estava lá, com o mesmo peso visual de tudo
                      o mais, ao fim de uma rolagem longa. Agora é a primeira
                      coisa depois do nome do agente, destacada e marcada
                      como obrigatória. */}
                  <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
                    <Textarea
                      id={idCampoPendente(a.id, 'observacao')}
                      label="Conclusão da avaliação"
                      required
                      rows={4}
                      value={a.observacao ?? ''}
                      onChange={(e) => atualizarAgente(a.id, (atual) => ({
                        ...atual,
                        observacao: e.target.value,
                      }))}
                      placeholder="Registre a conclusão específica deste agente. Campo obrigatório para emitir o documento."
                      hint={`Sai no item ${numeroAvaliacao} do documento, dentro desta avaliação. A conclusão do laudo inteiro é outro campo, na etapa "Conclusão do laudo".`}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<BookOpen size={14} />}
                        aria-label={`Abrir biblioteca da conclusão de ${a.nome || 'agente'}`}
                        onClick={() => setBibliotecaPara({
                          agenteId: a.id,
                          secao: 'conclusao',
                          referencia: referenciaBiblioteca,
                          rotuloReferencia: numeroAvaliacao,
                        })}
                      >
                        Biblioteca
                      </Button>
                    </div>
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
                  {/* Sim ou Não, sem resposta pronta: a caixa de marcar não
                      distinguia "não é eficaz" de "ainda não respondi". */}
                  <EficaciaEpiCampo
                    agente={a}
                    onChange={(epiEficaz) => atualizarAgente(a.id, (atual) => ({ ...atual, epiEficaz }))}
                  />
                  {painelFotosDoAgente(a)}
                  <BotaoInserirNoLaudo onInserir={() => definirCartaoAberto(a.id, false)} />
                  </SecaoColapsavel>
                </div>
              )})}
                </div>
              ))}
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
              subtitle={`Organizadas dentro das seções do documento. Até ${LIMITE_FOTOS_POR_ENVIO} por vez; fotos grandes são reduzidas automaticamente.`}
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
                    {progressoFotos ?? 'Adicionar'}
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
                // Copiar ANTES de zerar: zerar o input esvazia o FileList.
                const arquivos = Array.from(e.target.files ?? [])
                e.target.value = ''
                void adicionarFotos(arquivos)
              }}
            />
            <div className="space-y-6 p-5">
              {p.fotos.some((foto) => foto.agenteId) && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="section-title">Medições e avaliações técnicas</h4>
                    <Badge tone="green">{p.fotos.filter((foto) => foto.agenteId).length}</Badge>
                  </div>
                  <div className="space-y-4">
                    {[...new Set(p.fotos.flatMap((foto) => foto.agenteId ? [foto.agenteId] : []))].map((agenteId) => {
                      const agente = p.tecnico.agentes.find((item) => item.id === agenteId)
                      const fotos = p.fotos.filter((foto) => foto.agenteId === agenteId)
                      return (
                        <div key={agenteId} className="rounded-lg border border-sky-200 bg-sky-50/40 p-3">
                          <p className="mb-2 text-sm font-semibold text-ink-800">
                            {agente?.nome?.trim() || 'Avaliação removida — fotos pendentes de revisão'}
                          </p>
                          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {fotos.map((foto) => (
                              <div key={foto.id} className="rounded-lg border border-ink-200 bg-white p-2">
                                <div className="aspect-[4/3] overflow-hidden rounded bg-ink-100">
                                  <img src={foto.url} alt={foto.legenda} className="h-full w-full object-cover" />
                                </div>
                                <input
                                  value={foto.legenda}
                                  onChange={(e) => set({
                                    fotos: p.fotos.map((item) => item.id === foto.id
                                      ? { ...item, legenda: e.target.value }
                                      : item),
                                  })}
                                  placeholder="Legenda da medição"
                                  className="mt-2 w-full rounded border border-ink-200 px-2 py-1 text-[12px] focus:border-brand-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => void removerFoto(foto)}
                                  className="mt-1.5 flex w-full items-center justify-center gap-1 rounded py-1 text-[11px] text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={12} /> Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {SECOES_FOTO.map((s) => {
                // 'epi' não é mais selecionável (dobrada em 'documentos'),
                // mas fotos legadas enviadas lá continuam visíveis aqui.
                const fotos = p.fotos.filter((f) =>
                  !f.agenteId && (f.secao === s.value || (s.value === 'documentos' && f.secao === 'epi')),
                )
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
              // Transcrição da inicial, e a folha de onde ela saiu. Não tem
              // texto padrão nem sugestão: o que vai aqui é a palavra da parte,
              // e o sistema não escreve pela parte.
              { campo: 'riscoAlegadoPericulosidade', secao: 'analise', referencia: `${numeroNr16Editor}.2`, label: `${numeroNr16Editor}.2. NR-16 — Risco de Periculosidade Alegado pela Parte Reclamante`, rows: 5 },
              { campo: 'notaTecnicaEpis', secao: 'analise', referencia: '8', label: '8. Dos Equipamentos de Proteção Individual (NR-06)', rows: 7 },
              { campo: 'protecoesColetivas', secao: 'analise', referencia: '9', label: '9. Das Proteções Coletivas', rows: 5 },
              // O item 10 não tem mais caixa de texto (pedido do perito,
              // 17/09/2026): ele é montado só com as tabelas dos agentes, e a
              // conclusão de cada um já fecha a tabela dele.
              { campo: 'conclusaoInsalubridade', secao: 'conclusao', referencia: '11', label: '11. NR-15 — Conclusão e Fundamentação', rows: 6 },
              { campo: 'conclusaoPericulosidade', secao: 'conclusao', referencia: p.modalidade === 'ambas' ? '12' : '11', label: p.modalidade === 'ambas' ? '12. NR-16 — Conclusão e Fundamentação' : '11. NR-16 — Conclusão e Fundamentação', rows: 6 },
              { campo: 'respostasQuesitos', secao: 'conclusao', referencia: p.modalidade === 'ambas' ? '13' : '12', label: p.modalidade === 'ambas' ? '13. Respostas aos Quesitos Técnicos' : '12. Respostas aos Quesitos Técnicos', rows: 8 },
              { campo: 'encerramento', secao: 'conclusao', referencia: p.modalidade === 'ambas' ? '14' : '13', label: p.modalidade === 'ambas' ? '14. Encerramento' : '13. Encerramento', rows: 5 },
            ] as const
          ).filter((f) =>
            (f.campo !== 'conclusaoInsalubridade' || p.modalidade !== 'periculosidade') &&
            (f.campo !== 'conclusaoPericulosidade' || p.modalidade !== 'insalubridade') &&
            // O critério da NR-16 acompanha a transcrição e a fonte: os três
            // renderizadores só o imprimem sob `temPericulosidade`, então numa
            // perícia só de insalubridade o card virava um "7.2.1" que colide
            // com o 7.2 da NR-15 e nunca chega ao documento.
            (f.campo !== 'criterioAvaliacaoPericulosidade' || p.modalidade !== 'insalubridade') &&
            (f.campo !== 'riscoAlegadoPericulosidade' || p.modalidade !== 'insalubridade') &&
            // No Laudo, as respostas são separadas por origem logo abaixo.
            // O campo legado continua preservado e visível nos Pareceres.
            (f.campo !== 'respostasQuesitos' || tipoDoc !== 'laudo'),
          ).map((f) => {
            const campoPadrao = campoPadraoDe(f.campo)
            return (
            <Card key={f.campo}>
              <CardHeader
                title={f.label}
                subtitle={campoPadrao
                  ? ehAdministrador
                    ? 'Texto oficial da matriz — edição administrativa habilitada.'
                    : 'Texto oficial da matriz — protegido contra alterações. Para ler inteiro: Biblioteca › Textos oficiais da matriz.'
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
                      onClick={() => setBibliotecaPara({
                        campo: f.campo,
                        secao: f.secao,
                        // Cataloga pela chave canônica; mostra o número impresso.
                        referencia: CHAVE_BIBLIOTECA_POR_CAMPO[f.campo] ?? f.referencia,
                        rotuloReferencia: f.referencia,
                      })}
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
          {tipoDoc === 'laudo' && (
            <Card>
              <CardHeader
                title="Respostas aos Quesitos Técnicos"
                subtitle="Campos opcionais do Laudo Pericial. Mantenha perguntas, respostas, numeração e quebras de linha ao colar o conteúdo dos autos."
                icon={<FileText size={18} />}
              />
              <div className="space-y-5 p-5">
                {camposQuesitosDoLaudo.map((grupo) => (
                  <div key={grupo.campo} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-sm font-semibold text-ink-800" htmlFor={grupo.campo}>
                        {grupo.titulo}
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setT({ [grupo.campo]: 'Não apresentado' })}
                      >
                        Não apresentado
                      </Button>
                    </div>
                    <Textarea
                      id={grupo.campo}
                      rows={8}
                      value={p.tecnico[grupo.campo] ?? ''}
                      onChange={(e) => setT({ [grupo.campo]: e.target.value })}
                      placeholder="Cole as perguntas e registre as respectivas respostas."
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
          {tipoDoc === 'laudo' && (
            <Card>
              <CardHeader
                title="Honorários periciais"
                subtitle="Proposta do perito para o item DOS HONORÁRIOS PERICIAIS do Laudo. O arbitramento final cabe ao Juízo."
                icon={<FileText size={18} />}
              />
              <div className="p-5">
                <Input
                  label="Valor proposto dos honorários (R$)"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={p.tecnico.honorariosPericiaisCentavos == null
                    ? ''
                    : (p.tecnico.honorariosPericiaisCentavos / 100).toFixed(2)}
                  onChange={(e) => {
                    const valor = Number(e.target.value.replace(',', '.'))
                    setT({
                      honorariosPericiaisCentavos: e.target.value && Number.isFinite(valor)
                        ? Math.max(0, Math.round(valor * 100))
                        : undefined,
                    })
                  }}
                  hint={p.tecnico.honorariosPericiaisCentavos
                    ? `Por extenso: ${honorariosPorExtenso(p.tecnico.honorariosPericiaisCentavos)}.`
                    : 'Opcional. A seção não será emitida enquanto o valor estiver vazio.'}
                />
              </div>
            </Card>
          )}
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
            <FolhasA4>
              <DocumentoPreview
                pericia={p}
                empresas={empresas}
                perito={responsavelDaPericia(p, usuarios, usuario)}
                titulo={tituloDocumento}
                tipoDocumento={tipoDoc}
              />
            </FolhasA4>
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
        rotuloReferencia={bibliotecaPara?.rotuloReferencia}
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
