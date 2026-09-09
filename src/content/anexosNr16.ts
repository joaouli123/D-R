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

/**
 * Título do quadro quando nada foi enquadrado.
 *
 * Fora daqui o quadro sairia como “Risco de periculosidade não informado”, que
 * o leitor do laudo confunde com falha de preenchimento — e não é: a ausência
 * de enquadramento é a própria conclusão do exame.
 */
export const NOME_PADRAO_SEM_ENQUADRAMENTO =
  'Ausência de atividade ou operação perigosa enquadrável na NR-16'

export const PADRAO_NR16_SEM_ENQUADRAMENTO = {
  atividadeEnquadrada: 'Avaliada a atividade efetivamente desempenhada pelo trabalhador.',
  areaRisco: 'Não identificada condição ou área de risco enquadrável na NR-16 e seus anexos.',
  exposicaoPericulosidade: 'nao_constatada' as const,
  resultadoPericulosidade: 'nao_caracterizada' as const,
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
      'Produção, transporte, processamento e armazenamento de gás liquefeito',
      'Transporte e armazenagem de inflamáveis líquidos e gasosos liquefeitos e de vasilhames vazios não desgaseificados ou decantados',
      'Reabastecimento de aeronaves',
      'Carregamento de navios-tanques, vagões-tanques, caminhões-tanques e enchimento de vasilhames com inflamáveis',
      'Descarga de navios-tanques, vagões-tanques, caminhões-tanques e vasilhames com inflamáveis',
      'Operação e manutenção de navios-tanques, vagões-tanques, caminhões-tanques, bombas e vasilhames com inflamáveis',
      'Desgaseificação, decantação e reparos de vasilhames não desgaseificados ou decantados',
      'Teste de aparelhos de consumo de gás e seus equipamentos',
      'Transporte de inflamáveis líquidos e gasosos liquefeitos em caminhão-tanque',
      'Transporte de vasilhames com inflamável líquido em quantidade total igual ou superior a 200 litros',
      'Transporte de vasilhames com inflamáveis gasosos liquefeitos em quantidade total igual ou superior a 135 quilos',
      'Operação em postos de serviço e bombas de abastecimento de inflamáveis líquidos',
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

// ============================================================
// PONTOS DE VERIFICAÇÃO POR ANEXO (o "cenário 2" do perito)
//
// Cenário 1 — sem agente: o perito clica em "Aplicar texto padrão sem
// enquadramento" e a tabela sai enxuta, só com o que interessa a uma
// avaliação negativa. É o `PADRAO_NR16_SEM_ENQUADRAMENTO` acima.
//
// Cenário 2 — com agente: escolhido o anexo, a tela carrega os pontos que
// aquele risco específico exige examinar, cada um com as opções típicas.
// São campos DESCRITIVOS, do levantamento de fato (item 7.3): registram o
// que foi encontrado, não concluem nada. A conclusão continua sendo do
// perito, no bloco próprio da NR-16.
//
// As opções entram como `datalist`, nunca como lista fechada: onde a
// realidade da díligencia não couber na sugestão, ele escreve por cima.
// ============================================================

export interface CampoAnexoNr16 {
  id: string
  rotulo: string
  /** Sugestões. O campo aceita qualquer texto. */
  opcoes: readonly string[]
}

const CAMPOS_POR_ANEXO_NR16: Record<string, readonly CampoAnexoNr16[]> = {
  ANEXO_01: [
    {
      id: 'produto',
      rotulo: 'Explosivo ou acessório manuseado',
      opcoes: [
        'Explosivo iniciador (espoleta, estopim)',
        'Explosivo de ruptura (dinamite, emulsão, ANFO)',
        'Pólvora ou propelente',
        'Fogos de artifício',
        'Acessório de detonação (cordel detonante, retardo)',
      ],
    },
    {
      id: 'operacao',
      rotulo: 'Fase da operação',
      opcoes: [
        'Armazenamento em paiol',
        'Transporte',
        'Escorva e carregamento',
        'Detonação',
        'Verificação de detonação falhada',
        'Queima ou destruição de material deteriorado',
      ],
    },
    {
      id: 'quantidade',
      rotulo: 'Quantidade e forma de acondicionamento',
      opcoes: [
        'Informada pela reclamada em documento',
        'Estimada na diligência',
        'Não informada pela reclamada',
      ],
    },
    {
      id: 'delimitacao',
      rotulo: 'Delimitação da área de risco',
      opcoes: [
        'Conforme o quadro de distâncias do Anexo 1 da NR-16',
        'Delimitada em projeto ou licença apresentada',
        'Não delimitada pela reclamada',
      ],
    },
  ],
  ANEXO_02: [
    {
      id: 'produto',
      rotulo: 'Produto inflamável ou combustível',
      opcoes: [
        'Óleo diesel S10',
        'Óleo diesel S500',
        'Gasolina',
        'Etanol',
        'Querosene',
        'Gás liquefeito de petróleo (GLP)',
        'Gás natural',
        'Óleo lubrificante',
      ],
    },
    {
      id: 'classificacao',
      rotulo: 'Classificação do produto',
      opcoes: [
        'Líquido inflamável — ponto de fulgor igual ou inferior a 60 ºC',
        'Líquido combustível — ponto de fulgor superior a 60 ºC e igual ou inferior a 93 ºC (item 16.7 da NR-16)',
        'Gás inflamável',
        'Gás liquefeito',
      ],
    },
    {
      id: 'pontoFulgor',
      rotulo: 'Ponto de fulgor indicado na FDS',
      opcoes: [
        'Igual ou inferior a 60 ºC',
        'Superior a 60 ºC e igual ou inferior a 93 ºC',
        'Superior a 93 ºC',
        'Não informado na ficha apresentada',
      ],
    },
    {
      id: 'fds',
      rotulo: 'Ficha com Dados de Segurança (FDS)',
      opcoes: [
        'Apresentada pela reclamada e examinada',
        'Obtida junto ao fabricante do produto',
        'Não apresentada pela reclamada',
      ],
    },
    {
      id: 'quantidade',
      rotulo: 'Quantidade e acondicionamento',
      opcoes: [
        'Vasilhames com inflamável líquido em quantidade total inferior a 200 litros',
        'Vasilhames com inflamável líquido em quantidade total igual ou superior a 200 litros',
        'Vasilhames com gases liquefeitos em quantidade total inferior a 135 quilos',
        'Vasilhames com gases liquefeitos em quantidade total igual ou superior a 135 quilos',
        'Tanque estacionário',
        'Caminhão-tanque',
      ],
    },
    {
      id: 'local',
      rotulo: 'Local da operação',
      opcoes: [
        'Posto de abastecimento próprio',
        'Bomba de abastecimento em pátio',
        'Tanque aéreo',
        'Tanque subterrâneo',
        'Área de armazenagem de vasilhames',
        'Via pública, em transporte',
      ],
    },
  ],
  ANEXO_03: [
    {
      id: 'atividadeSeguranca',
      rotulo: 'Atividade de segurança exercida',
      opcoes: [
        'Vigilância patrimonial',
        'Segurança pessoal',
        'Transporte de valores',
        'Escolta armada',
        'Segurança de eventos',
        'Supervisão ou fiscalização operacional',
        'Telemonitoramento ou telecontrole',
      ],
    },
    {
      id: 'vinculo',
      rotulo: 'Forma de contratação',
      opcoes: [
        'Empregado de empresa de segurança privada',
        'Empregado de empresa com serviço orgânico de segurança',
        'Contratado para outra função, com atribuições de segurança',
      ],
    },
    {
      id: 'habilitacao',
      rotulo: 'Habilitação comprovada nos autos',
      opcoes: [
        'Curso de formação de vigilante comprovado',
        'Empresa autorizada pela Polícia Federal',
        'Sem comprovação apresentada',
      ],
    },
  ],
  ANEXO_04: [
    {
      id: 'sistema',
      rotulo: 'Sistema elétrico em que atua',
      opcoes: [
        'Sistema Elétrico de Potência (SEP)',
        'Sistema Elétrico de Consumo (SEC)',
        'Instalação interna da unidade consumidora',
      ],
    },
    {
      id: 'tensao',
      rotulo: 'Tensão das instalações',
      opcoes: [
        'Alta tensão — acima de 1.000 volts em corrente alternada',
        'Baixa tensão — até 1.000 volts em corrente alternada',
        'Alta e baixa tensão',
      ],
    },
    {
      id: 'condicao',
      rotulo: 'Condição do trabalho',
      opcoes: [
        'Instalações ou equipamentos energizados',
        'Trabalho em proximidade, conforme a NR-10',
        'Instalações desenergizadas com bloqueio e impedimento de reenergização',
      ],
    },
    {
      id: 'nr10',
      rotulo: 'Item 10.2.8 da NR-10 (baixa tensão no SEC)',
      opcoes: [
        'Atendido pela reclamada',
        'Não atendido pela reclamada',
        'Documentação não apresentada',
        'Não aplicável ao caso',
      ],
    },
  ],
  ANEXO_05: [
    {
      id: 'usoMoto',
      rotulo: 'Uso da motocicleta',
      opcoes: [
        'Motocicleta fornecida pela reclamada',
        'Motocicleta própria do trabalhador',
        'Não utilizada motocicleta na função',
      ],
    },
    {
      id: 'via',
      rotulo: 'Via percorrida',
      opcoes: [
        'Vias públicas abertas à circulação',
        'Área interna do estabelecimento',
        'Deslocamento residência-trabalho-residência',
      ],
    },
    {
      id: 'habitualidade',
      rotulo: 'Habitualidade do deslocamento',
      opcoes: [
        'Deslocamento em todos os dias trabalhados',
        'Deslocamento eventual',
        'Não constatado deslocamento laboral em motocicleta',
      ],
    },
  ],
  ANEXO_06: [
    {
      id: 'investidura',
      rotulo: 'Investidura na autoridade de trânsito',
      opcoes: [
        'Agente investido na função pelo órgão de trânsito',
        'Não investido na autoridade de trânsito',
      ],
    },
    {
      id: 'local',
      rotulo: 'Local do exercício',
      opcoes: [
        'Via pública, em operação de trânsito',
        'Atividade administrativa interna',
      ],
    },
  ],
  ANEXO_RADIACOES: [
    {
      id: 'fonte',
      rotulo: 'Fonte ou material radioativo',
      opcoes: [
        'Fonte selada',
        'Fonte não selada',
        'Equipamento emissor de raios X',
        'Material radioativo em transporte',
      ],
    },
    {
      id: 'area',
      rotulo: 'Classificação da área',
      opcoes: ['Área controlada', 'Área supervisionada', 'Área livre'],
    },
    {
      id: 'operacao',
      rotulo: 'Operação realizada',
      opcoes: [
        'Produção ou processamento',
        'Utilização em ensaio ou diagnóstico',
        'Transporte',
        'Guarda ou estocagem',
        'Manutenção em área sujeita a radiação',
      ],
    },
    {
      id: 'monitoracao',
      rotulo: 'Monitoração individual',
      opcoes: [
        'Dosímetro individual fornecido, com registros apresentados',
        'Dosímetro individual fornecido, sem registros apresentados',
        'Sem monitoração individual',
      ],
    },
  ],
}

/**
 * Pontos que aquele anexo específico manda examinar.
 *
 * Lista vazia quando não há anexo escolhido — é o cenário negativo, em que a
 * tabela do laudo sai só com o essencial.
 */
export function camposDoAnexoNr16(id?: string): readonly CampoAnexoNr16[] {
  return (id && CAMPOS_POR_ANEXO_NR16[id]) || []
}

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
    tipoMedicaoEmpresa: _tipoMedicaoEmpresa,
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
    exposicaoPericulosidadeTexto: _exposicaoTexto,
    resultadoPericulosidadeTexto: _resultadoTexto,
    detalhesNr16: _detalhes,
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
