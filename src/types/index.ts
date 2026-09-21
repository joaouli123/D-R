// ============================================================
// D&R Perícia — Modelo de dados (frontend)
// Espelha o escopo da Proposta Comercial v1.1 (Módulos A–J)
// + Módulo K (Quesitos) e Módulo L (Manifestação/Impugnação/Esclarecimento)
// ============================================================

import type { UnidadeMedicao } from '@/content/nr15/tipos'

export type UUID = string

// ---------- Módulo A — Acesso e Gestão de Usuários ----------
export type PerfilUsuario = 'admin' | 'perito' | 'assistente'

export interface Usuario {
  id: UUID
  nome: string
  email: string
  perfil: PerfilUsuario
  registroProfissional?: string // ex.: CREA-SP 5063...
  titulo?: string // ex.: Engenheiro de Segurança do Trabalho
  telefone?: string
  /**
   * Logo do próprio perito, já resolvida contra a base da API.
   *
   * White-label: cada um assina o app e os documentos com a marca dele
   * (Configurações › Meu perfil). Ausente = usa a arte embutida do sistema.
   */
  logoUrl?: string
  /**
   * Assinatura manuscrita do perito: PNG com fundo transparente, já tratado
   * pelo servidor a partir da foto da assinatura em papel. Ausente = os
   * documentos saem com a linha em branco, para assinar à mão.
   */
  assinaturaUrl?: string
  ativo: boolean
  ultimoAcesso?: string
}

// ---------- Módulo B — Cadastro de Empresas ----------
export interface Empresa {
  id: UUID
  razaoSocial: string
  nomeFantasia?: string
  cnpj: string
  cnae?: string
  /** Grau da classe CNAE conforme o Anexo I da NR-04. */
  grauRisco?: '1' | '2' | '3' | '4'
  endereco: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade: string
  uf: string
  cep?: string
  contatoNome?: string
  contatoEmail?: string
  contatoTelefone?: string
  ramoAtividade?: string
  criadoEm: string
}

// ---------- Módulo C — Cadastro de Processo e Perícia ----------
export type ModalidadePericia = 'insalubridade' | 'periculosidade' | 'ambas'
export type TipoDocumento =
  | 'parecer'
  | 'laudo'
  | 'quesitos'
  | 'manifestacao'
  | 'impugnacao'
  | 'esclarecimento'

export type StatusPericia = 'rascunho' | 'em_andamento' | 'concluida' | 'entregue'

export interface Participante {
  id: UUID
  nome: string
  /** Empresa reclamada que este participante representa, quando aplicável. */
  empresaId?: UUID
  papel:
    | 'perito_judicial'
    | 'reclamante'
    | 'parte_reclamante_ausente'
    | 'engenheiro_assistente_reclamante'
    | 'tecnico_assistente_reclamante'
    | 'assistente_reclamante'
    | 'engenheiro_assistente_reclamada'
    | 'tecnico_assistente_reclamada'
    | 'assistente_reclamada'
    | 'advogado_reclamante'
    | 'advogado_reclamada'
    | 'preposto'
    | 'engenheiro_sst_empresa'
    | 'tecnico_sst_empresa'
    | 'gestor_lideranca'
    | 'representante_setorial'
    | 'recursos_humanos'
    | 'auxiliar_perito'
    | 'paradigma'
    | 'entrevistado'
    | 'acompanhante'
  registro?: string // OAB / CREA
  contato?: string
}

export interface Reclamada {
  id: UUID
  empresaId: UUID
  principal: boolean
}

export interface Pericia {
  id: UUID
  numeroProcesso: string
  vara: string
  comarca: string
  reclamante: string
  cpfReclamante?: string
  funcaoReclamante?: string
  /**
   * Quando a ação foi ajuizada. Vem da consulta pública do CNJ e é o
   * marco de onde se conta a janela de cinco anos que a empresa
   * precisa cobrir com PGR e laudos ambientais.
   */
  dataAjuizamento?: string
  admissao?: string
  demissao?: string
  reclamadas: Reclamada[]
  participantes: Participante[]
  dataVistoria?: string
  horaVistoria?: string
  /** Horário em que a diligência pericial foi encerrada. */
  horaFimVistoria?: string
  cepVistoria?: string
  localVistoria?: string
  numeroVistoria?: string
  setorVistoriado?: string
  modalidade: ModalidadePericia
  status: StatusPericia
  responsavelId: UUID
  criadoEm: string
  atualizadoEm: string
  // Módulo D — preenchimento técnico
  tecnico: PreenchimentoTecnico
  // Módulo E — fotografias
  fotos: Foto[]
}

// ---------- Módulo D — Preenchimento Técnico ----------
export interface EpiSelecionado {
  catalogoId?: string
  categoria: string
  modelo: string
  marca?: string
  validadeCa?: string
  caUnico?: string
  caPecaFacial?: string
  caFiltroCartucho?: string
  nivelProtecaoDb?: number | null
  metodoAtenuacao?: 'NRRsf' | null
  observacao?: string
}

/**
 * De onde veio o número que o laudo adota.
 *
 * O caso concreto: a empresa mediu 83 dB(A) no PGR e o perito mediu
 * 88,41 dB(A) na diligência. As duas medições existem, divergem, e o
 * documento precisa dizer qual prevaleceu e por quê — não escolher em
 * silêncio.
 *
 * `nao_informado` é o perito que não mediu: resta a avaliação da
 * empresa, e o laudo registra isso em vez de fingir uma medição.
 */
export type OrigemMedicao = 'perito' | 'empresa' | 'nao_informado'
export type TipoMedicaoEmpresa = 'valor' | 'faixa' | 'registros_processo'

/**
 * De onde vem o ruído do local avaliado.
 *
 * Sem isso, o laudo que mede 58 dB(A) num escritório fica igual ao que
 * mede 58 dB(A) ao lado de uma prensa desligada no dia da diligência —
 * e a conclusão sobre habitualidade depende justamente dessa diferença.
 */
export type FonteRuido = 'maquinas' | 'ruido_fundo' | 'administrativa'
/**
 * Frequência da exposição à condição perigosa.
 *
 * `fortuita` e `tempo_extremamente_reduzido` são as duas hipóteses da Súmula
 * 364 do TST que afastam o adicional, e por isso são opções separadas.
 * `eventual` é o valor antigo, que juntava as duas numa só; continua aceito
 * para não reescrever laudo já gravado, mas a tela não o oferece mais.
 */
export type ExposicaoPericulosidade =
  | 'permanente'
  | 'intermitente'
  | 'fortuita'
  | 'tempo_extremamente_reduzido'
  | 'eventual'
  | 'nao_constatada'
export type ResultadoPericulosidade = 'caracterizada' | 'caracterizada_parcial' | 'nao_caracterizada' | 'prejudicada'
/** Onde o trabalhador estava em relação à área de risco delimitada pela norma. */
export type SituacaoAreaRisco = 'dentro' | 'parcialmente_dentro' | 'fora' | 'nao_caracterizada'
/**
 * Como o trabalhador ocupa a área de risco (quando está nela), ou como se
 * justifica não estar (quando a situação é 'fora').
 */
export type PresencaAreaRisco =
  | 'permanencia'
  | 'circulacao'
  | 'acesso_eventual'
  | 'fora_sem_procedimento'
  | 'fora_com_procedimento'
  | 'acesso_nao_autorizado_sem_procedimento'
  | 'acesso_nao_autorizado_com_procedimento'
export type UnidadeTempoExposicaoNr16 = 'minutos_dia' | 'horas_dia'
export type PeriodicidadeOperacionalNr16 = 'dia' | 'semana' | 'mes'
/** Peso da atividade perigosa na rotina da função. */
export type RelacaoAtividadeNr16 = 'principal' | 'secundaria' | 'complementar'

/**
 * Um ponto de verificação do anexo da NR-16, do jeito que foi respondido.
 *
 * O rótulo viaja junto com o valor de propósito: o catálogo de campos pode ser
 * reescrito amanhã, e um laudo já emitido não pode mudar de texto por causa
 * disso. Quem edita regrava o rótulo vigente a cada alteração.
 */
export interface DetalheNr16 {
  id: string
  rotulo: string
  valor: string
}

export type StatusVarredura = 'nao_avaliado' | 'sem_exposicao' | 'exposicao_identificada' | 'nao_aplicavel'

export interface ItemVarreduraNormativa {
  anexoId: string
  status: StatusVarredura
  conclusao?: string
}

export interface AgenteAvaliado {
  id: UUID
  nome: string
  tipo: 'quimico' | 'fisico' | 'biologico' | 'periculosidade'
  /**
   * Período de trabalho — função e posto — em que este agente foi avaliado.
   *
   * O mesmo agente entra mais de uma vez na mesma perícia quando o
   * trabalhador teve duas funções no lapso examinado: ruído na prensa e
   * ruído na expedição são dois lançamentos, cada um com sua medição, seu
   * EPI e sua conclusão. É este campo que os separa.
   *
   * Guarda o id do período, não o rótulo. Se o perito renomear a função no
   * item 7.1, o laudo tem de acompanhar — é documento assinado, e um rótulo
   * copiado envelheceria calado. Quem resolve o texto na hora de imprimir é
   * `comFuncaoPosto`, em src/lib/apresentacaoAgente.ts.
   *
   * Opcional, e continua sendo: perícia de função única não escolhe nada, e
   * registro antigo nenhum tem o campo.
   */
  periodoId?: string
  /** Ausente nos registros antigos equivale a true. */
  identificadoNaAtividade?: boolean
  cas?: string
  anexoNr15?: string // Anexo 1, 3, 11, 12, 13, 13-A, 14...
  /** Anexo próprio da NR-16. Não reutiliza o seletor da NR-15. */
  anexoNr16?: string
  referenciaNormativaId?: string
  atividadeEnquadrada?: string
  unidadeLimite?: string
  limiteTolerancia?: string
  medido?: string
  /** Medição do perito na diligência. */
  valorMedido?: string
  /** Medição da empresa (PGR, laudo ambiental). Início da faixa, se houver. */
  medicaoEmpresa?: string
  /** Fim da faixa, quando a medição da empresa variou. O laudo adota a maior. */
  medicaoEmpresaAte?: string
  /** Como a medição apresentada pela empresa deve aparecer no documento. */
  tipoMedicaoEmpresa?: TipoMedicaoEmpresa
  /** Documento de onde saiu a medição da empresa. Ex.: "PGR 2024". */
  fonteMedicaoEmpresa?: string
  /** Fonte do ruído no local. Só para os Anexos 1 e 2 da NR-15. */
  fonteRuido?: FonteRuido
  /** Condição ou delimitação da área de risco examinada na NR-16. */
  areaRisco?: string
  /**
   * O que o exame fez com os anexos da NR-16.
   *
   * Separado de `areaRisco` de propósito: um diz o que foi encontrado no
   * local, o outro diz contra o que aquilo foi confrontado. É esta linha que
   * sustenta a conclusão negativa — sem ela o laudo nega o enquadramento sem
   * dizer o que examinou.
   */
  analiseAnexos?: string
  /** Frequência com que o trabalhador se expõe à condição perigosa. */
  exposicaoPericulosidade?: ExposicaoPericulosidade
  /** Resultado da avaliação do enquadramento na NR-16. */
  resultadoPericulosidade?: ResultadoPericulosidade
  /**
   * Redação própria da exposição. Quando preenchida, vence a opção do seletor
   * nos três renderizadores: a lista fechada resolve o caso comum e este campo
   * resolve o que a lista não previu.
   */
  exposicaoPericulosidadeTexto?: string
  /** Redação própria do resultado técnico. Vence `resultadoPericulosidade`. */
  resultadoPericulosidadeTexto?: string
  /** Pontos de verificação do anexo da NR-16, na ordem em que serão impressos. */
  detalhesNr16?: DetalheNr16[]
  /**
   * Dispositivo da NR-16 em que a atividade se enquadra, por extenso.
   * Ex.: "NR-16, Anexo 2, item 1, alínea m". Texto livre porque a citação
   * sugerida pelo catálogo é só ponto de partida — o perito a ajusta.
   */
  enquadramentoNr16?: string
  situacaoAreaRisco?: SituacaoAreaRisco
  presencaAreaRisco?: PresencaAreaRisco
  /** Área de risco adotada, como a norma a descreve. */
  delimitacaoAreaRisco?: string
  /** Distância medida ou estimada até a fonte de risco. Ex.: "4,5 m do bico". */
  distanciaAreaRisco?: string
  /** Tempo médio de exposição, só o número (ou faixa) digitado pelo perito. */
  tempoExposicaoNr16?: string
  unidadeTempoExposicaoNr16?: UnidadeTempoExposicaoNr16
  /** Quantas vezes a operação perigosa acontece por período. */
  frequenciaOperacionalNr16?: string
  periodicidadeOperacionalNr16?: PeriodicidadeOperacionalNr16
  relacaoAtividadeNr16?: RelacaoAtividadeNr16
  /**
   * Período ou atividade a que se restringe a caracterização parcial.
   * Só é impresso quando o resultado é `caracterizada_parcial`.
   */
  periodoCaracterizacaoNr16?: string
  /** Qual das duas o laudo adota. Ausente = perito, como sempre foi. */
  origemMedicao?: OrigemMedicao
  unidadeMedicao?: UnidadeMedicao
  epis?: EpiSelecionado[]
  criterio: 'qualitativo' | 'quantitativo' | 'nao_aplicavel'
  grau?: 'minimo' | 'medio' | 'maximo' | 'nao_caracterizado'
  epiEficaz?: boolean
  observacao?: string
}

export interface PeriodoFuncao {
  id: UUID
  funcao: string
  inicio: string
  fim?: string
  setor?: string
  descricaoAtividades?: string
}

export interface PreenchimentoTecnico {
  apresentacao: string
  enderecamento: string
  objetivoPericia: string
  descricaoEmpresa: string
  descricaoAmbiente: string
  descricaoPostoTrabalho?: string
  maquinasFerramentas?: string
  produtosUtilizados?: string
  atividadesFuncoes: string
  periodos: PeriodoFuncao[]
  agentes: AgenteAvaliado[]
  varreduraNr15?: ItemVarreduraNormativa[]
  varreduraNr16?: ItemVarreduraNormativa[]
  normasReferencias: string
  equipamentosAnalisados: string
  informacoesLevantadas: string
  divergenciasFaticas?: string
  alegacoesReclamante?: string
  informacoesReclamada?: string
  consideracoesDivergencias?: string
  criterioAvaliacaoPericulosidade?: string
  /**
   * Item 7.3.2 — o risco que a parte Reclamante alegou, nas palavras dela.
   *
   * Transcrição da inicial, não texto do perito: o laudo precisa registrar o
   * que foi alegado antes de examinar se procede. Por isso vem com a fonte
   * ao lado, e por isso o sistema não sugere redação nenhuma aqui.
   */
  riscoAlegadoPericulosidade?: string
  /** De onde saiu a transcrição acima. Ex.: "Inicial do processo — Fls.: 8". */
  fonteRiscoAlegado?: string
  notaTecnicaEpis?: string
  protecoesColetivas?: string
  analiseTecnica: string
  conclusao: string
  conclusaoInsalubridade?: string
  conclusaoPericulosidade?: string
  respostasQuesitos?: string
  /** Respostas do laudo separadas pela origem processual dos quesitos. */
  quesitosJuizo?: string
  quesitosReclamante?: string
  quesitosReclamada?: string
  /** Proposta de honorários em centavos, sem ambiguidade de separador decimal. */
  honorariosPericiaisCentavos?: number
  encerramento?: string
  /** Data escolhida para o fecho e a assinatura do documento. */
  dataAssinatura?: string
  /** Cidade escolhida para o fecho; sem valor, usa a cidade da vistoria. */
  cidadeAssinatura?: string
  observacoesAdicionais: string
}

// ---------- Módulo E — Fotografias ----------
export type SecaoFoto =
  | 'ambiente'
  | 'atividades'
  | 'equipamentos'
  | 'epi'
  | 'produtos'
  | 'documentos'

export interface Foto {
  id: UUID
  secao: SecaoFoto
  /** Avaliação técnica comprovada pela imagem; ausente nas fotos gerais e legadas. */
  agenteId?: UUID
  url: string
  legenda: string
  ordem: number
}

// ---------- Módulo F — Biblioteca Pessoal de Textos ----------
export type SecaoTexto =
  | 'apresentacao'
  | 'objetivo'
  | 'empresa'
  | 'ambiente'
  | 'atividades'
  | 'analise'
  | 'conclusao'
  | 'manifestacao'
  | 'impugnacao'
  | 'esclarecimento'
  | 'generico'

export interface TextoBiblioteca {
  id: UUID
  titulo: string
  /** Item/subitem do parecer em que este trecho deve ser inserido. */
  referencia?: string
  secao: SecaoTexto
  tiposDocumento: TipoDocumento[]
  tags: string[]
  conteudo: string
  favorito: boolean
  usos: number
  criadoEm: string
}

// ---------- Módulos G/H/J — Documentos gerados ----------
/**
 * Estado editável de cada tipo de documento — é o que permite
 * reabrir um documento do histórico e continuar de onde parou,
 * e o que o servidor usa para remontar o PDF anos depois.
 */
export interface ConteudoQuesitos {
  quesitos: { pergunta: string; resposta: string }[]
}

export interface ConteudoManifestacao {
  agente: AgenteManifestacao
  posicionamento: PosicionamentoManifestacao
  fundamentacao: string
  blocos: { titulo: string; conteudo: string }[]
  encerramento: string
}

export interface ConteudoEsclarecimento {
  agente: AgenteManifestacao
  referencia?: string
  introducao: string
  pontos: { origem: 'juizo' | 'reclamante' | 'reclamada'; questionamento: string; resposta: string }[]
  conclusao: string
}

export type ConteudoDocumento =
  | ConteudoQuesitos
  | ConteudoManifestacao
  | ConteudoEsclarecimento

export interface DocumentoGerado {
  id: UUID
  tipo: TipoDocumento
  titulo: string
  periciaId: UUID
  numeroProcesso: string
  reclamante: string
  empresaPrincipal: string
  status: 'rascunho' | 'finalizado' | 'enviado'
  anexoExternoNome?: string
  criadoEm: string
  atualizadoEm: string
  enviadoPara?: string
  /** Parecer e laudo montam a partir da própria perícia; os demais guardam aqui. */
  conteudo?: ConteudoDocumento
}

// ---------- Módulo K — Quesitos (item 17) ----------
export type TemaQuesito =
  | 'gerais'
  | 'insalubridade'
  | 'periculosidade'
  | 'ruido'
  | 'calor'
  | 'quimicos'
  | 'biologicos'
  | 'epi'
  | 'ergonomia'
  | 'eletricidade'
  | 'inflamaveis'

export type OrigemQuesito = 'juizo' | 'reclamante' | 'reclamada' | 'proprio'

export interface Quesito {
  id: UUID
  codigo: string
  tema: TemaQuesito
  origem: OrigemQuesito
  pergunta: string
  respostaPadrao?: string
  favorito: boolean
  usos: number
  personalizado: boolean
}

export interface QuesitoSelecionado {
  quesitoId: UUID
  ordem: number
  pergunta: string
  resposta: string
}

// ---------- Módulo L — Manifestação / Impugnação / Esclarecimento (item 18) ----------
export type AgenteManifestacao = 'ruido' | 'calor' | 'biologico' | 'periculosidade'

export type PosicionamentoManifestacao =
  | 'concordancia' // 18.1
  | 'impugnacao_laudo' // 18.2
  | 'impugnacao_esclarecimento' // 18.3

export interface BlocoTexto {
  id: UUID
  titulo: string
  conteudo: string
  selecionado: boolean
  editavel: boolean
}

export interface ModeloManifestacao {
  id: UUID
  agente: AgenteManifestacao
  posicionamento: PosicionamentoManifestacao
  titulo: string
  fundamentacao: string
  blocos: BlocoTexto[]
}
