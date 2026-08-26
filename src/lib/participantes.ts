import type { Participante } from '../types'

export const PAPEIS: { value: Participante['papel']; label: string; atuacao: string }[] = [
  { value: 'reclamante', label: 'Reclamante', atuacao: 'Apresentação das suas alegações.' },
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
  { value: 'perito_judicial', label: 'Perito Judicial do Trabalho', atuacao: 'Condução da diligência pericial' },
  { value: 'auxiliar_perito', label: 'Auxiliar do Perito', atuacao: 'Auxílio e suporte ao Perito' },
  { value: 'paradigma', label: 'Paradigma', atuacao: 'Demonstração das atividades exercidas' },
  { value: 'entrevistado', label: 'Entrevistado', atuacao: 'Prestação de informações complementares' },
]

const LEGADOS: Partial<Record<Participante['papel'], { label: string; atuacao: string }>> = {
  assistente_reclamante: { label: 'Assistente Técnico do Reclamante', atuacao: 'Acompanhamento Técnico – Reclamante' },
  assistente_reclamada: { label: 'Assistente Técnico da Reclamada', atuacao: 'Acompanhamento Técnico – Reclamada' },
  acompanhante: { label: 'Acompanhante', atuacao: 'Prestação de informações complementares' },
}

export function dadosPapel(papel: Participante['papel']) {
  return PAPEIS.find((item) => item.value === papel) ?? LEGADOS[papel] ?? { label: papel, atuacao: '—' }
}
