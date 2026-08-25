import type { AgenteAvaliado } from '@/types'

/**
 * Matriz vigente da NR-16.
 *
 * Fonte oficial consultada em 24/08/2026:
 * https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-16-atualizada-2025-ii.pdf
 * Última modificação normativa indicada pelo MTE: Portaria MTE nº 2.021/2025.
 */
export interface AnexoNr16Info {
  id: string
  label: string
  risco: string
  atividadesSugeridas: string[]
}

export const ANEXOS_NR16: AnexoNr16Info[] = [
  {
    id: 'ANEXO_01',
    label: 'Anexo 1 — Atividades e Operações Perigosas com Explosivos',
    risco: 'Explosivos',
    atividadesSugeridas: [
      'Armazenamento de explosivos',
      'Transporte de explosivos',
      'Operação de escorva de cartuchos',
      'Carregamento de explosivos',
      'Detonação',
      'Verificação de detonações falhadas',
      'Queima e destruição de explosivos deteriorados',
      'Manuseio de explosivos',
    ],
  },
  {
    id: 'ANEXO_02',
    label: 'Anexo 2 — Atividades e Operações Perigosas com Inflamáveis',
    risco: 'Inflamáveis',
    atividadesSugeridas: [
      'Produção, transporte, processamento ou armazenamento de gás liquefeito',
      'Transporte e armazenagem de inflamáveis líquidos e gasosos liquefeitos',
      'Carregamento ou descarga de inflamáveis',
      'Operação ou manutenção de tanques, bombas e vasilhames',
      'Operação em postos de serviço e bombas de abastecimento',
      'Teste de aparelhos de consumo de gás e seus equipamentos',
    ],
  },
  {
    id: 'ANEXO_03',
    label: 'Anexo 3 — Segurança Pessoal ou Patrimonial',
    risco: 'Roubos ou outras espécies de violência física',
    atividadesSugeridas: [
      'Vigilância patrimonial',
      'Segurança de eventos',
      'Segurança nos transportes coletivos',
      'Segurança ambiental e florestal',
      'Transporte de valores',
      'Escolta armada',
      'Segurança pessoal',
      'Supervisão ou fiscalização operacional',
      'Telemonitoramento ou telecontrole',
    ],
  },
  {
    id: 'ANEXO_04',
    label: 'Anexo 4 — Atividades e Operações Perigosas com Energia Elétrica',
    risco: 'Energia elétrica',
    atividadesSugeridas: [
      'Trabalho em instalações ou equipamentos energizados em alta tensão',
      'Trabalho em proximidade, conforme a NR-10',
      'Trabalho em baixa tensão no SEC sem atendimento ao item 10.2.8 da NR-10',
      'Atividade em instalações ou equipamentos integrantes do SEP',
    ],
  },
  {
    id: 'ANEXO_05',
    label: 'Anexo 5 — Atividades Perigosas em Motocicleta',
    risco: 'Motocicleta',
    atividadesSugeridas: [
      'Deslocamento laboral em motocicleta por vias abertas à circulação pública',
    ],
  },
  {
    id: 'ANEXO_06',
    label: 'Anexo 6 — Agentes das Autoridades de Trânsito',
    risco: 'Colisões, atropelamentos ou outras espécies de acidentes ou violências',
    atividadesSugeridas: [
      'Atividade profissional de agente da autoridade de trânsito com exposição ao risco',
    ],
  },
  {
    id: 'ANEXO_RADIACOES',
    label: 'Anexo sem número — Radiações Ionizantes ou Substâncias Radioativas',
    risco: 'Radiações ionizantes ou substâncias radioativas',
    atividadesSugeridas: [
      'Produção, utilização, processamento, transporte, guarda, estocagem ou manuseio de material radioativo',
      'Operação ou manutenção em área sujeita a risco por radiações ionizantes',
    ],
  },
]

export function anexoNr16PorId(id?: string): AnexoNr16Info | undefined {
  return ANEXOS_NR16.find((anexo) => anexo.id === id)
}

export function labelAnexoNr16(id?: string): string {
  if (!id) return ''
  return anexoNr16PorId(id)?.label ?? id
}

export function aplicarAnexoNr16(agente: AgenteAvaliado, id: string): AgenteAvaliado {
  const anexo = anexoNr16PorId(id)
  const {
    anexoNr15: _anexoNr15,
    cas: _cas,
    referenciaNormativaId: _referencia,
    unidadeLimite: _unidadeLimite,
    limiteTolerancia: _limite,
    medido: _medido,
    valorMedido: _valorMedido,
    medicaoEmpresa: _medicaoEmpresa,
    medicaoEmpresaAte: _medicaoEmpresaAte,
    fonteMedicaoEmpresa: _fonteEmpresa,
    origemMedicao: _origem,
    fonteRuido: _fonteRuido,
    unidadeMedicao: _unidadeMedicao,
    grau: _grau,
    epiEficaz: _epiEficaz,
    epis: _epis,
    atividadeEnquadrada: _atividade,
    areaRisco: _area,
    exposicaoPericulosidade: _exposicao,
    resultadoPericulosidade: _resultado,
    ...base
  } = agente

  return {
    ...base,
    nome: anexo?.risco ?? '',
    tipo: 'periculosidade',
    criterio: 'qualitativo',
    ...(anexo ? { anexoNr16: anexo.id } : {}),
  }
}
