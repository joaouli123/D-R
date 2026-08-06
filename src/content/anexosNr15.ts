// ============================================================
// Anexos da NR-15, usados no cadastro de agentes e riscos
// avaliados (Módulo D — Preenchimento Técnico).
//
// Portaria MTb nº 3.214/78.
//
// Quinta otimização — Injeção Automática de Dados: ao selecionar
// um Anexo no seletor, o sistema preenche automaticamente
// Natureza, Grau de Insalubridade, Critério e Limite de
// Tolerância. Campos "Estáticos" ficam bloqueados para edição
// (valor fixo em lei); "Editáveis" trazem um valor de referência
// ou um placeholder e continuam abertos para o perito ajustar ao
// caso concreto. O campo "Valor medido" nunca é tocado pela
// injeção — é sempre preenchimento manual.
// ============================================================

import type { AgenteAvaliado } from '@/types'

export interface AnexoNr15Info {
  id: string
  /** Texto exibido no seletor. */
  label: string
  tipo: AgenteAvaliado['tipo']
  /** Ausente = varia conforme o caso (o perito escolhe o grau). */
  grau?: AgenteAvaliado['grau']
  criterio: AgenteAvaliado['criterio']
  /** Texto injetado no campo "Limite de tolerância". */
  limiteTolerancia: string
  /** false = campo bloqueado (valor fixo em lei, não editável). */
  limiteEditavel: boolean
  /** Dica mostrada abaixo do campo Limite quando ele fica editável/dinâmico. */
  dica?: string
}

export const ANEXOS_NR15: AnexoNr15Info[] = [
  {
    id: 'ANEXO_01',
    label: 'Anexo 1 — Ruído Contínuo ou Intermitente',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'quantitativo',
    limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_02',
    label: 'Anexo 2 — Ruído de Impacto',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'quantitativo',
    limiteTolerancia: '130 dB(C) (resposta Impacto) ou 120 dB(Linear) (resposta Fast)',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_03',
    label: 'Anexo 3 — Exposição ao Calor',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'quantitativo',
    limiteTolerancia: '',
    limiteEditavel: true,
    dica: 'Inserir limite IBUTG em °C conforme taxa metabólica e Quadro 1 do Anexo 3.',
  },
  {
    id: 'ANEXO_05',
    label: 'Anexo 5 — Radiações Ionizantes',
    tipo: 'fisico',
    grau: 'maximo',
    criterio: 'quantitativo',
    limiteTolerancia: 'Dose efetiva de 20 mSv/ano (média em 5 anos, máx. 50 mSv em um ano) — CNEN-NE-3.01',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_07',
    label: 'Anexo 7 — Radiações Não Ionizantes',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'qualitativo',
    limiteTolerancia: 'Não aplicável (constatação por inspeção no local de trabalho)',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_08_VMB',
    label: 'Anexo 8 — Vibrações em Mãos e Braços (VMB)',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'quantitativo',
    limiteTolerancia: 'aren = 5,0 m/s²',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_08_VCI',
    label: 'Anexo 8 — Vibrações de Corpo Inteiro (VCI)',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'quantitativo',
    limiteTolerancia: 'aren = 1,1 m/s² ou VDVR = 21,0 m/s¹˙⁷⁵',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_09',
    label: 'Anexo 9 — Frio',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'qualitativo',
    limiteTolerancia: 'Não aplicável (inspeção no local de trabalho / zonas climáticas do MAPA)',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_10',
    label: 'Anexo 10 — Umidade',
    tipo: 'fisico',
    grau: 'medio',
    criterio: 'qualitativo',
    limiteTolerancia: 'Não aplicável (inspeção no local de trabalho em operações alagadas ou encharcadas)',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_11',
    label: 'Anexo 11 — Agentes Químicos com Limite',
    tipo: 'quimico',
    criterio: 'quantitativo',
    limiteTolerancia: '',
    limiteEditavel: true,
    dica: 'Dinâmico conforme a substância (Quadro 1 do Anexo 11), em ppm ou mg/m³. Consulte pelo nome ou pelo número CAS.',
  },
  {
    id: 'ANEXO_12_ASBESTO',
    label: 'Anexo 12 — Poeiras Minerais: Asbesto/Amianto',
    tipo: 'quimico',
    grau: 'maximo',
    criterio: 'quantitativo',
    limiteTolerancia: '2,0 fibras/cm³',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_12_MANGANES',
    label: 'Anexo 12 — Poeiras Minerais: Manganês',
    tipo: 'quimico',
    grau: 'maximo',
    criterio: 'quantitativo',
    limiteTolerancia: '5,0 mg/m³',
    limiteEditavel: false,
  },
  {
    id: 'ANEXO_12_SILICA',
    label: 'Anexo 12 — Poeiras Minerais: Sílica Livre Cristalizada',
    tipo: 'quimico',
    grau: 'maximo',
    criterio: 'quantitativo',
    limiteTolerancia: 'Poeira Respirável: 8 / (%SiO2 + 2) mg/m³ | Poeira Total: 24 / (%SiO2 + 3) mg/m³',
    limiteEditavel: true,
    dica: 'Fórmula do Anexo 12 — substitua %SiO2 pelo teor medido em laboratório.',
  },
  {
    id: 'ANEXO_13',
    label: 'Anexo 13 — Agentes Químicos (Atividades)',
    tipo: 'quimico',
    criterio: 'qualitativo',
    limiteTolerancia: 'Não aplicável (análise qualitativa por inspeção da operação prevista no Anexo 13)',
    limiteEditavel: false,
    dica: 'Grau varia conforme a atividade (10%, 20% ou 40%) — selecione abaixo.',
  },
  {
    id: 'ANEXO_14',
    label: 'Anexo 14 — Agentes Biológicos',
    tipo: 'biologico',
    criterio: 'qualitativo',
    limiteTolerancia: 'Não aplicável (contato permanente com agentes biológicos conforme rol do Anexo 14)',
    limiteEditavel: false,
    dica: 'Grau varia conforme o agente (Médio 20% ou Máximo 40%) — selecione abaixo.',
  },
  // Anexos sem regra de injeção mapeada na especificação — permanecem
  // de preenchimento manual, como já era o comportamento anterior.
  {
    id: 'ANEXO_06',
    label: 'Anexo 6 — Trabalho sob Condições Hiperbáricas',
    tipo: 'fisico',
    criterio: 'nao_aplicavel',
    limiteTolerancia: '',
    limiteEditavel: true,
  },
  {
    id: 'ANEXO_13A',
    label: 'Anexo 13-A — Benzeno',
    tipo: 'quimico',
    criterio: 'nao_aplicavel',
    limiteTolerancia: '',
    limiteEditavel: true,
  },
]

export function anexoNr15PorId(id: string | undefined): AnexoNr15Info | undefined {
  return ANEXOS_NR15.find((a) => a.id === id)
}

/** Rótulo legível para exibição (nos documentos, tabelas etc.) — aceita id novo ou texto livre legado. */
export function labelAnexoNr15(id: string | undefined): string {
  if (!id) return ''
  return anexoNr15PorId(id)?.label ?? id
}
