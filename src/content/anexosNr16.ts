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
  /** Como o anexo é chamado no corpo do documento: "1"…"6" e "(*)". */
  numero: string
  label: string
  /** Nome curto do assunto, o que nomeia o subitem do item 10. */
  assunto: string
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

/**
 * O critério, por extenso, como o perito quer ler na tabela.
 *
 * "Qualitativo" sozinho não diz o que foi feito; a frase inteira diz — e é a
 * mesma que abre a linha "Condição / Atividades" da análise do item 10.
 */
export const ANALISE_ATIVIDADES_NR16 =
  'Análise das atividades, inspeção nos locais de trabalho e adjacentes'

export const CRITERIO_QUALITATIVO_NR16 = `Qualitativo – ${ANALISE_ATIVIDADES_NR16}`

/** Período abrangido pelo exame. */
export const LAPSO_TEMPORAL_NR16 = 'Análise de todo o período válido para inspeção pericial'

/**
 * O que a perícia fez com os anexos — os examinou todos, não só o alegado.
 *
 * É o que sustenta a conclusão negativa: sem esta linha, o laudo afirma que
 * não há enquadramento sem dizer contra o que a atividade foi confrontada.
 */
export const ANALISE_ANEXOS_NR16 =
  'Foram avaliados os anexos pertinentes da NR-16, considerando as atividades desenvolvidas, '
  + 'as condições de trabalho, os locais e áreas adjacentes, bem como os respectivos critérios '
  + 'técnicos e normativos estabelecidos em cada anexo.'

export const PADRAO_NR16_SEM_ENQUADRAMENTO = {
  atividadeEnquadrada: 'Avaliada a atividade efetivamente desempenhada pela parte Reclamante.',
  analiseAnexos: ANALISE_ANEXOS_NR16,
  exposicaoPericulosidade: 'nao_constatada' as const,
  resultadoPericulosidade: 'nao_caracterizada' as const,
}

export const ANEXOS_NR16: AnexoNr16Info[] = [
  {
    id: 'ANEXO_01',
    numero: '1',
    assunto: 'Explosivos',
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
    numero: '2',
    assunto: 'Inflamáveis',
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
    numero: '3',
    assunto: 'Segurança pessoal ou patrimonial',
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
    numero: '4',
    assunto: 'Energia elétrica',
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
    numero: '5',
    assunto: 'Motocicleta',
    label: 'Anexo 5 — Atividades Perigosas em Motocicleta',
    risco: 'Motocicleta',
    atividadesSugeridas: [
      'Deslocamento laboral em motocicleta por vias abertas à circulação pública',
    ],
  },
  {
    id: 'ANEXO_06',
    numero: '6',
    assunto: 'Agentes das autoridades de trânsito',
    label: 'Anexo 6 — Agentes das Autoridades de Trânsito',
    risco: 'Colisões, atropelamentos ou outras espécies de acidentes ou violências',
    atividadesSugeridas: [
      'Atividade profissional de agente da autoridade de trânsito com exposição ao risco',
    ],
  },
  {
    id: 'ANEXO_RADIACOES',
    numero: '(*)',
    assunto: 'Radiações ionizantes ou substâncias radioativas',
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

/**
 * O agente aponta mesmo para um anexo da NR-16?
 *
 * Não basta `anexoNr16` estar preenchido: as perícias antigas guardavam o
 * rótulo ("Anexo 2") onde hoje vai o id ("ANEXO_02"). Um valor desses não
 * casa com anexo nenhum, e é `quadrosNr16DoItem10` quem o recolhe no quadro
 * "Sem Risco" — a conclusão precisa concordar com esse título e imprimir o
 * rol, ou o quadro diz uma coisa no cabeçalho e outra no corpo.
 */
export function temAnexoNr16Valido(agente: { anexoNr16?: string }): boolean {
  return ANEXOS_NR16.some((anexo) => anexo.id === agente.anexoNr16)
}

/** "Anexo 2 – Inflamáveis" — como o anexo aparece dentro do texto. */
export function linhaAnexoNr16(anexo: AnexoNr16Info): string {
  return `Anexo ${anexo.numero} – ${anexo.assunto}`
}

/**
 * Como o anexo nomeia um subitem numerado.
 *
 * Serve dois lugares: o título do quadro do item 10 e o índice da
 * Biblioteca (`referenciasParecer.ts`). Em nenhum dos dois o rótulo repete
 * "Anexo 2" — no índice porque o número do subitem acompanha o do anexo
 * (10.2.2 → Anexo 2); no item 10 porque o assunto ("Inflamáveis") já é como
 * a norma é citada. A exceção é o anexo sem número: ali o "(*)" precisa
 * aparecer, ou o leitor toma o subitem por "Anexo 7", que não existe na
 * norma. Dentro da tabela quem escreve é `linhaAnexoNr16`, com o "Anexo N –"
 * por extenso.
 */
export function itemListaAnexoNr16(anexo: AnexoNr16Info): string {
  return anexo.numero === '(*)' ? `Anexo (*) – ${anexo.assunto}` : anexo.assunto
}

/**
 * Conclusão do quadro "Sem Risco" do item 10.
 *
 * Sai montada da lista viva de anexos: se a NR-16 ganhar um anexo, ele entra
 * aqui sozinho. Uma lista digitada à mão envelheceria em silêncio, e o laudo
 * afirmaria ter observado todos os anexos sem ter observado o novo.
 */
export function conclusaoSemRiscoNr16(): string {
  return [
    'Não foi caracterizada periculosidade, por ausência de enquadramento das atividades e '
      + 'condições de trabalho nos critérios técnicos e normativos aplicáveis.',
    ['Todos os anexos foram observados:', ...ANEXOS_NR16.map((anexo) => `\u2022 ${linhaAnexoNr16(anexo)};`)]
      .join('\n'),
    'Inaplicáveis às atividades e condições de trabalho do Reclamante, não havendo enquadramento '
      + 'nas hipóteses de caracterização de periculosidade.',
  ].join('\n\n')
}

/**
 * Os subitens do item 10 para a NR-16 — um por agente avaliado.
 *
 * O perito riscou do modelo a lista solta dos sete anexos que saía aqui, um
 * subitem para cada: o rol dos anexos observados pertence ao corpo do
 * quadro, na célula “Resultado técnico / Conclusão” — é `conclusaoSemRiscoNr16`
 * quem o imprime. Nas palavras dele, “ele só deve aparecer dentro da tabela”.
 *
 * Retirada a lista, a numeração passa a ser sequencial. Numerar pelo anexo
 * deixaria buraco: uma perícia com um só agente de Inflamáveis abriria o
 * item 10 em “10.2.2”, com o 10.2.1 em lugar nenhum. A ordem continua sendo
 * a dos anexos da NR-16, e o cenário negativo — agente sem anexo escolhido —
 * fecha a sequência como “Sem Risco”.
 */
export function quadrosNr16DoItem10<A extends { nome?: string; anexoNr16?: string }>(
  agentes: A[],
  prefixo: string,
): { numero: string; titulo: string; agente: A }[] {
  const comSufixo = (base: string, lista: A[], agente: A, indice: number) =>
    lista.length > 1 ? `${base} (${agente.nome?.trim() || `Risco ${indice + 1}`})` : base

  const avaliados: { titulo: string; agente: A }[] = []
  ANEXOS_NR16.forEach((anexo) => {
    const doAnexo = agentes.filter((agente) => agente.anexoNr16 === anexo.id)
    doAnexo.forEach((agente, i) => {
      // Mesmo rótulo do rol de anexos: sem isso o sétimo anexo perde o
      // "(*)" justamente no quadro em que foi avaliado, e o leitor toma o
      // subitem por "Anexo 7", que a norma não tem.
      const base = `${itemListaAnexoNr16(anexo)} – Avaliação, Resultado e Conclusão`
      avaliados.push({ titulo: comSufixo(base, doAnexo, agente, i), agente })
    })
  })

  // Sobra tudo o que não entrou em anexo nenhum — e não só quem está sem
  // anexo. Agente gravado com valor que não é id de anexo (as perícias
  // antigas guardavam "Anexo 2") não casava com nada e sumia do item 10 sem
  // aviso; agora ele cai aqui.
  const colocados = new Set(avaliados.map((quadro) => quadro.agente))
  const semAnexo = agentes.filter((agente) => !colocados.has(agente))
  semAnexo.forEach((agente, i) => {
    const base = 'Sem Risco – Avaliação, Resultado e Conclusão'
    avaliados.push({ titulo: comSufixo(base, semAnexo, agente, i), agente })
  })

  return avaliados.map((quadro, indice) => ({ numero: `${prefixo}.${indice + 1}`, ...quadro }))
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
    analiseAnexos: _analiseAnexos,
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
