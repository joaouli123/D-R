import type { Participante } from '../types'

export const PAPEIS: { value: Participante['papel']; label: string; atuacao: string }[] = [
  { value: 'reclamante', label: 'Reclamante', atuacao: 'Apresentação das suas alegações.' },
  { value: 'parte_reclamante_ausente', label: 'Parte reclamante ausente', atuacao: 'A parte reclamante não compareceu para a apresentação de suas alegações.' },
  { value: 'engenheiro_assistente_reclamante', label: 'Eng. Segurança do Trabalho - Assistente Técnico', atuacao: 'Acompanhamento Técnico – Reclamante' },
  { value: 'tecnico_assistente_reclamante', label: 'Téc. Segurança do Trabalho - Assistente Técnico', atuacao: 'Acompanhamento Técnico – Reclamante' },
  { value: 'advogado_reclamante', label: 'Advogado (a)', atuacao: 'Representante Jurídico - Reclamante.' },
  { value: 'engenheiro_assistente_reclamada', label: 'Eng. Segurança do Trabalho - Assistente Técnico', atuacao: 'Acompanhamento Técnico – Reclamada' },
  { value: 'tecnico_assistente_reclamada', label: 'Téc. Segurança do Trabalho - Assistente Técnico', atuacao: 'Acompanhamento Técnico – Reclamada' },
  { value: 'advogado_reclamada', label: 'Advogado (a)', atuacao: 'Representante Jurídico - Reclamada.' },
  { value: 'preposto', label: 'Preposto', atuacao: 'Representação da Reclamada, prestação de esclarecimentos e narrativa da defesa' },
  { value: 'engenheiro_sst_empresa', label: 'Eng. Segurança do Trabalho', atuacao: 'Representação do Departamento de SST da empresa' },
  { value: 'tecnico_sst_empresa', label: 'Téc. Segurança do Trabalho', atuacao: 'Representação do Departamento de SST da empresa' },
  { value: 'gestor_lideranca', label: 'Gestor Imediato / Liderança', atuacao: 'Esclarecimentos sobre atividades habituais, eventuais e demais aspectos da rotina de trabalho' },
  { value: 'representante_setorial', label: 'Representante Setorial', atuacao: 'Acompanhamento e esclarecimentos pertinentes ao setor.' },
  { value: 'recursos_humanos', label: 'Recursos Humanos', atuacao: 'Acompanhamento e esclarecimentos pertinentes à área administrativa.' },
  { value: 'perito_judicial', label: 'Perito Judicial do Trabalho', atuacao: 'Condução da diligência pericial' },
  { value: 'auxiliar_perito', label: 'Auxiliar do Perito', atuacao: 'Auxílio e suporte ao Perito' },
  { value: 'paradigma', label: 'Paradigma', atuacao: 'Demonstração das atividades exercidas' },
  { value: 'entrevistado', label: 'Entrevistado', atuacao: 'Prestação de informações complementares' },
]

const LEGADOS: Partial<Record<Participante['papel'], { label: string; atuacao: string }>> = {
  assistente_reclamante: { label: 'Assistente Técnico do Reclamante', atuacao: 'Acompanhamento Técnico – Reclamante' },
  assistente_reclamada: { label: 'Assistente Técnico da Reclamada', atuacao: 'Acompanhamento Técnico – Reclamada' },
  acompanhante: { label: 'Participante Autorizado', atuacao: 'Pessoa autorizada pelo juiz para acompanhar na diligência.' },
}

export function dadosPapel(papel: Participante['papel']) {
  return PAPEIS.find((item) => item.value === papel) ?? LEGADOS[papel] ?? { label: papel, atuacao: '—' }
}

const PAPEIS_RECLAMANTE = new Set<Participante['papel']>([
  'reclamante',
  'parte_reclamante_ausente',
  'engenheiro_assistente_reclamante',
  'tecnico_assistente_reclamante',
  'assistente_reclamante',
  'advogado_reclamante',
])

const PAPEIS_RECLAMADA = new Set<Participante['papel']>([
  'engenheiro_assistente_reclamada',
  'tecnico_assistente_reclamada',
  'assistente_reclamada',
  'advogado_reclamada',
  'preposto',
  'engenheiro_sst_empresa',
  'tecnico_sst_empresa',
  'gestor_lideranca',
  'representante_setorial',
  'recursos_humanos',
])

export type GrupoParticipante =
  | 'reclamante'
  | 'reclamada_principal'
  | 'reclamadas_envolvidas'
  | 'outros'

export interface OpcaoPapelParticipante {
  value: Participante['papel']
  label: string
}

/**
 * Opções aprovadas para cada botão "Adicionar". O vínculo com o grupo fica
 * explícito aqui para que um advogado da Reclamante não possa virar, por
 * engano, preposto da Reclamada sem trocar de grupo.
 */
export const PAPEIS_POR_GRUPO: Record<GrupoParticipante, readonly OpcaoPapelParticipante[]> = {
  reclamante: [
    { value: 'reclamante', label: 'Reclamante' },
    { value: 'parte_reclamante_ausente', label: 'Parte reclamante ausente' },
    { value: 'advogado_reclamante', label: 'Advogado (a)' },
    { value: 'assistente_reclamante', label: 'Assistente Técnico (a)' },
  ],
  reclamada_principal: [
    { value: 'advogado_reclamada', label: 'Advogado (a)' },
    { value: 'engenheiro_sst_empresa', label: 'Eng. Segurança do Trabalho' },
    { value: 'engenheiro_assistente_reclamada', label: 'Eng. Segurança do Trabalho - Assistente Técnico' },
    { value: 'tecnico_assistente_reclamada', label: 'Téc. Segurança do Trabalho - Assistente Técnico' },
    { value: 'preposto', label: 'Preposto' },
    { value: 'gestor_lideranca', label: 'Gestor(a) Imediato(a) / Liderança' },
    { value: 'representante_setorial', label: 'Representante Setorial' },
    { value: 'recursos_humanos', label: 'Recursos Humanos' },
  ],
  reclamadas_envolvidas: [
    { value: 'advogado_reclamada', label: 'Advogado (a)' },
    { value: 'engenheiro_sst_empresa', label: 'Eng. Segurança do Trabalho' },
    { value: 'engenheiro_assistente_reclamada', label: 'Eng. Segurança do Trabalho - Assistente Técnico' },
    { value: 'tecnico_assistente_reclamada', label: 'Téc. Segurança do Trabalho - Assistente Técnico' },
    { value: 'preposto', label: 'Preposto' },
    { value: 'gestor_lideranca', label: 'Gestor(a) Imediato(a) / Liderança' },
    { value: 'representante_setorial', label: 'Representante Setorial' },
    { value: 'recursos_humanos', label: 'Recursos Humanos' },
  ],
  outros: [
    { value: 'perito_judicial', label: 'Perito Judicial' },
    { value: 'auxiliar_perito', label: 'Auxiliar do Perito' },
    { value: 'paradigma', label: 'Paradigma' },
    { value: 'entrevistado', label: 'Entrevistado' },
    { value: 'acompanhante', label: 'Participante Autorizado' },
  ],
}

export const TEXTO_AUSENCIA_RECLAMANTE =
  'A parte reclamante não compareceu para a apresentação de suas alegações.'

export function participanteAusente(participante: Participante): boolean {
  return participante.papel === 'parte_reclamante_ausente'
}

export function primeiroNomeEmpresa(razaoSocial?: string | null): string {
  return razaoSocial?.trim().split(/\s+/)[0] ?? ''
}

export function qualificacaoParticipante(participante: Participante, razaoSocial?: string | null): string {
  const qualificacao = dadosPapel(participante.papel).label
  const empresa = primeiroNomeEmpresa(razaoSocial)
  return empresa ? `${qualificacao}, ${empresa}` : qualificacao
}

/** Mantém um papel legado visível até o usuário escolher uma opção atual. */
export function papeisDoGrupo(
  grupo: GrupoParticipante,
  papelAtual?: Participante['papel'],
): readonly OpcaoPapelParticipante[] {
  const aprovados = PAPEIS_POR_GRUPO[grupo]
  if (!papelAtual || aprovados.some((item) => item.value === papelAtual)) return aprovados
  return [...aprovados, { value: papelAtual, label: `${dadosPapel(papelAtual).label} (cadastro anterior)` }]
}

/**
 * Localiza a parte representada sem perder participantes antigos, que
 * foram salvos antes de existir vínculo explícito com a empresa.
 */
export function grupoDoParticipante(
  participante: Participante,
  empresaPrincipalId?: string,
): GrupoParticipante {
  if (PAPEIS_RECLAMANTE.has(participante.papel)) return 'reclamante'
  if (participante.empresaId) {
    return participante.empresaId === empresaPrincipalId
      ? 'reclamada_principal'
      : 'reclamadas_envolvidas'
  }
  if (PAPEIS_RECLAMADA.has(participante.papel) && empresaPrincipalId) return 'reclamada_principal'
  return 'outros'
}
