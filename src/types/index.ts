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
  admissao?: string
  demissao?: string
  reclamadas: Reclamada[]
  participantes: Participante[]
  dataVistoria?: string
  horaVistoria?: string
  localVistoria?: string
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

export interface AgenteAvaliado {
  id: UUID
  nome: string
  tipo: 'quimico' | 'fisico' | 'biologico' | 'periculosidade'
  cas?: string
  anexoNr15?: string // Anexo 1, 3, 11, 12, 13, 13-A, 14...
  referenciaNormativaId?: string
  atividadeEnquadrada?: string
  unidadeLimite?: string
  limiteTolerancia?: string
  medido?: string
  valorMedido?: string
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
  atividadesFuncoes: string
  periodos: PeriodoFuncao[]
  agentes: AgenteAvaliado[]
  normasReferencias: string
  equipamentosAnalisados: string
  informacoesLevantadas: string
  analiseTecnica: string
  conclusao: string
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
