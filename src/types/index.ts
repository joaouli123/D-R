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
export type ExposicaoPericulosidade = 'permanente' | 'intermitente' | 'eventual' | 'nao_constatada'
export type ResultadoPericulosidade = 'caracterizada' | 'nao_caracterizada' | 'prejudicada'

export interface AgenteAvaliado {
  id: UUID
  nome: string
  tipo: 'quimico' | 'fisico' | 'biologico' | 'periculosidade'
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
  /** Frequência com que o trabalhador se expõe à condição perigosa. */
  exposicaoPericulosidade?: ExposicaoPericulosidade
  /** Resultado da avaliação do enquadramento na NR-16. */
  resultadoPericulosidade?: ResultadoPericulosidade
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
  normasReferencias: string
  equipamentosAnalisados: string
  informacoesLevantadas: string
  divergenciasFaticas?: string
  alegacoesReclamante?: string
  informacoesReclamada?: string
  consideracoesDivergencias?: string
  criterioAvaliacaoPericulosidade?: string
  notaTecnicaEpis?: string
  protecoesColetivas?: string
  analiseTecnica: string
  conclusao: string
  conclusaoInsalubridade?: string
  conclusaoPericulosidade?: string
  respostasQuesitos?: string
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
