// Fonte oficial vigente: Ministério do Trabalho e Emprego.
// https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-16-atualizada-2025-ii.pdf
// Tabela atividades/áreas do Anexo (*), conferida na imagem do texto adotado
// pela Portaria MTE nº 518/2003: http://legistrab.com.br/files/Normas/NR%2016%20Anexo%20sn..pdf
// Consulta: 2026-09-16.
//
// O catálogo guarda a norma, não a interpretação dela. As hipóteses saem com
// a redação oficial — só o "no", "na", "nas" que as encaixava na frase-mãe
// ("as realizadas: na produção…") cai, para a atividade ler sozinha no laudo.
// Erros evidentes de digitação do texto publicado ("denotações falhadas",
// "monitores e radiação") foram corrigidos; escolhas de redação, não — o
// item 4.7 do Anexo (*) diz "Estabilização de instrumentos médico-hospitalares"
// e é assim que fica.
//
// A numeração dos anexos segue a do restante do sistema ("Anexo 2"). A norma
// usa romanos (Anexo II); a referência de cada hipótese é o que a torna
// rastreável, e ela é única dentro do catálogo — é o valor que o agente grava.

export interface HipoteseNr16 {
  /** Única no catálogo. É o que fica gravado em `enquadramentoNr16`. */
  referencia: string
  /** Agrupa as opções na tela (optgroup) e liga a hipótese às áreas de risco. */
  grupo: string
  /** Como a opção aparece na lista: marcador + texto curto. */
  rotulo: string
  /** A atividade como o laudo a escreve. */
  atividade: string
  /** A quem a norma estende o adicional naquela hipótese (coluna "Adicional de 30%"). */
  alcance?: string
  /** A descrição oficial da atividade, quando a norma traz uma (Anexo 3). */
  descricao?: string
}

export interface AreaRiscoNr16 {
  /** A atividade ou o local a que a área se refere. */
  local: string
  /** A delimitação, como a norma a escreve. */
  descricao: string
  referencia: string
  /**
   * Grupos ou referências de hipóteses a que a área se aplica. Ausente, vale
   * para qualquer hipótese do anexo.
   */
  aplicaA?: readonly string[]
}

export interface RegraNr16 {
  texto: string
  referencia: string
}

export interface CatalogoAnexoNr16 {
  /** Ato normativo que dá a redação em vigor. */
  vigencia: string
  hipoteses: readonly HipoteseNr16[]
  areasRisco: readonly AreaRiscoNr16[]
  /** O que a própria norma diz que NÃO caracteriza periculosidade. */
  exclusoes: readonly RegraNr16[]
  /** Condições e ressalvas que o perito precisa ter à vista. */
  notas: readonly RegraNr16[]
}

// ------------------------------------------------------------
// Regras gerais do corpo da NR-16 e da jurisprudência consolidada
// ------------------------------------------------------------

export const SUMULA_364_TST: RegraNr16 = {
  texto:
    'Tem direito ao adicional de periculosidade o empregado exposto permanentemente ou que, de forma '
    + 'intermitente, sujeita-se a condições de risco. Indevido, apenas, quando o contato dá-se de forma '
    + 'eventual, assim considerado o fortuito, ou o que, sendo habitual, dá-se por tempo extremamente reduzido.',
  referencia: 'Súmula nº 364, item I, do TST',
}

export const NOTAS_GERAIS_NR16: readonly RegraNr16[] = [
  {
    texto:
      'O trabalho em condições de periculosidade assegura adicional de 30% sobre o salário, sem os '
      + 'acréscimos de gratificações, prêmios ou participação nos lucros; o empregado pode optar pelo '
      + 'adicional de insalubridade que porventura lhe seja devido.',
    referencia: 'NR-16, itens 16.2 e 16.2.1',
  },
  {
    texto:
      'É responsabilidade do empregador a caracterização ou a descaracterização da periculosidade, mediante '
      + 'laudo técnico elaborado por Médico do Trabalho ou Engenheiro de Segurança do Trabalho, nos termos do '
      + 'artigo 195 da CLT.',
    referencia: 'NR-16, item 16.3',
  },
  {
    texto: 'Todas as áreas de risco previstas na NR-16 devem ser delimitadas, sob responsabilidade do empregador.',
    referencia: 'NR-16, item 16.8',
  },
  SUMULA_364_TST,
]

// ------------------------------------------------------------
// Anexo 1 — Explosivos
// ------------------------------------------------------------

const A1_QUADRO_1 = 'Item 1 — Quadro 1'
const A1_TODOS = 'Todos os trabalhadores nessa atividade.'
const A1_ARMAZENAMENTO = 'NR-16, Anexo 1, item 1 (Quadro 1), alínea a'

function a1(alinea: string, atividade: string, alcance = A1_TODOS): HipoteseNr16 {
  return {
    referencia: `NR-16, Anexo 1, item 1 (Quadro 1), alínea ${alinea}`,
    grupo: A1_QUADRO_1,
    rotulo: `${alinea}) ${atividade}`,
    atividade,
    alcance,
  }
}

function faixaExplosivos(quadro: number, alinea: string, local: string, faixas: [string, string][]): AreaRiscoNr16[] {
  return faixas.map(([quantidade, distancia]) => ({
    local,
    descricao: `${quantidade}: faixa de terreno até a distância máxima de ${distancia}`,
    referencia: `NR-16, Anexo 1, item 3, alínea ${alinea} (Quadro ${quadro})`,
    // As faixas do item 3 são de locais de armazenagem, e só a alínea a do
    // Quadro 1 estende o adicional a quem "permaneça na área de risco". As
    // demais alíneas alcançam só quem executa a atividade.
    aplicaA: [A1_ARMAZENAMENTO],
  }))
}

const ANEXO_1: CatalogoAnexoNr16 = {
  vigencia: 'Redação dada pela Portaria SSMT nº 2, de 02/02/1979.',
  hipoteses: [
    a1('a', 'Armazenamento de explosivos', 'Todos os trabalhadores nessa atividade ou que permaneçam na área de risco.'),
    a1('b', 'Transporte de explosivos'),
    a1('c', 'Operação de escorva dos cartuchos de explosivos'),
    a1('d', 'Operação de carregamento de explosivos'),
    a1('e', 'Detonação'),
    a1('f', 'Verificação de detonações falhadas'),
    a1('g', 'Queima e destruição de explosivos deteriorados'),
    a1('h', 'Operações de manuseio de explosivos'),
  ],
  areasRisco: [
    ...faixaExplosivos(2, 'a',
      'Armazenagem de pólvoras químicas, artifícios pirotécnicos e produtos químicos usados na fabricação de misturas explosivas ou de fogos de artifício',
      [
        ['Até 4.500 kg', '45 metros'],
        ['Mais de 4.500 até 45.000 kg', '90 metros'],
        ['Mais de 45.000 até 90.000 kg', '110 metros'],
        ['Mais de 90.000 até 225.000 kg (quantidade máxima)', '180 metros'],
      ]),
    ...faixaExplosivos(3, 'b', 'Armazenagem de explosivos iniciadores', [
      ['Até 20 kg', '75 metros'],
      ['Mais de 20 até 200 kg', '220 metros'],
      ['Mais de 200 até 900 kg', '300 metros'],
      ['Mais de 900 até 2.200 kg', '370 metros'],
      ['Mais de 2.200 até 4.500 kg', '460 metros'],
      ['Mais de 4.500 até 6.800 kg', '500 metros'],
      ['Mais de 6.800 até 9.000 kg (quantidade máxima)', '530 metros'],
    ]),
    ...faixaExplosivos(4, 'c',
      'Armazenagem de explosivos de ruptura e pólvoras mecânicas (pólvora negra e pólvora chocolate ou parda)',
      [
        ['Até 23 kg', '45 metros'],
        ['Mais de 23 até 45 kg', '75 metros'],
        ['Mais de 45 até 90 kg', '110 metros'],
        ['Mais de 90 até 135 kg', '160 metros'],
        ['Mais de 135 até 180 kg', '200 metros'],
        ['Mais de 180 até 225 kg', '220 metros'],
        ['Mais de 225 até 270 kg', '250 metros'],
        ['Mais de 270 até 300 kg', '265 metros'],
        ['Mais de 300 até 360 kg', '280 metros'],
        ['Mais de 360 até 400 kg', '300 metros'],
        ['Mais de 400 até 450 kg', '310 metros'],
        ['Mais de 450 até 680 kg', '345 metros'],
        ['Mais de 680 até 900 kg', '365 metros'],
        ['Mais de 900 até 1.300 kg', '405 metros'],
        ['Mais de 1.300 até 1.800 kg', '435 metros'],
        ['Mais de 1.800 até 2.200 kg', '460 metros'],
        ['Mais de 2.200 até 2.700 kg', '480 metros'],
        ['Mais de 2.700 até 3.100 kg', '490 metros'],
        ['Mais de 3.100 até 3.600 kg', '510 metros'],
        ['Mais de 3.600 até 4.000 kg', '520 metros'],
        ['Mais de 4.000 até 4.500 kg', '530 metros'],
        ['Mais de 4.500 até 6.800 kg', '570 metros'],
        ['Mais de 6.800 até 9.000 kg', '620 metros'],
        ['Mais de 9.000 até 11.300 kg', '660 metros'],
        ['Mais de 11.300 até 13.600 kg', '700 metros'],
        ['Mais de 13.600 até 18.100 kg', '780 metros'],
        ['Mais de 18.100 até 22.600 kg', '860 metros'],
        ['Mais de 22.600 até 34.000 kg', '1.000 metros'],
        ['Mais de 34.000 até 45.300 kg', '1.100 metros'],
        ['Mais de 45.300 até 68.000 kg', '1.150 metros'],
        ['Mais de 68.000 até 90.700 kg', '1.250 metros'],
        ['Mais de 90.700 até 113.300 kg', '1.350 metros'],
      ]),
  ],
  exclusoes: [],
  notas: [
    {
      texto:
        'São perigosas as atividades com explosivos sujeitos a degradação química ou autocatalítica, ou à '
        + 'ação de agentes exteriores, tais como calor, umidade, faíscas, fogo, fenômenos sísmicos, choque e atritos.',
      referencia: 'NR-16, item 16.5',
    },
    {
      texto:
        'Em depósitos barricados ou entricheirados, as distâncias do Quadro 4 podem ser reduzidas à metade.',
      referencia: 'NR-16, Anexo 1, item 3, alínea d',
    },
    {
      texto:
        'É obrigatória a existência física de delimitação da área de risco — qualquer obstáculo que impeça '
        + 'o ingresso de pessoas não autorizadas.',
      referencia: 'NR-16, Anexo 1, item 3, alínea e',
    },
  ],
}

// ------------------------------------------------------------
// Anexo 2 — Inflamáveis
// ------------------------------------------------------------

const A2_ITEM_1 = 'Item 1 — atividades e operações'
const A2_ITEM_2 = 'Item 2 — serviços e operações compreendidos'
const A2_NESSAS = 'Todos os trabalhadores nessas atividades ou que operam na área de risco.'
const A2_MOTORISTA = 'Motorista e ajudantes.'

function a2(alinea: string, atividade: string, alcance: string, rotulo = atividade): HipoteseNr16 {
  return {
    referencia: `NR-16, Anexo 2, item 1, alínea ${alinea}`,
    grupo: A2_ITEM_1,
    rotulo: `${alinea}) ${rotulo}`,
    atividade,
    alcance,
  }
}

function a2Inciso(inciso: string, alinea: string | null, servico: string, detalhe: string | null): HipoteseNr16 {
  const referencia = `NR-16, Anexo 2, item 2, inciso ${inciso}${alinea ? `, alínea ${alinea}` : ''}`
  const marcador = alinea ? `${inciso}-${alinea})` : `${inciso})`
  return {
    referencia,
    grupo: A2_ITEM_2,
    rotulo: `${marcador} ${detalhe ?? servico}`,
    atividade: detalhe ? `${servico}: ${detalhe}` : servico,
  }
}

const A2_I = 'Serviços de operação e manutenção de embarcações, vagões-tanques, caminhões-tanques, bombas e vasilhames de inflamáveis'
const A2_II = 'Serviços de operação e manutenção de embarcações, vagões-tanques, caminhões-tanques e vasilhames de inflamáveis gasosos liquefeitos'
const A2_III = 'Armazenagem de inflamáveis líquidos, em tanques ou vasilhames'
const A2_IV = 'Armazenagem de inflamáveis gasosos liquefeitos, em tanques ou vasilhames'
const A2_V = 'Operações em postos de serviço e bombas de abastecimento de inflamáveis líquidos'
const A2_VII = 'Enchimento de quaisquer vasilhames (tambores, latas) com inflamáveis líquidos'
const A2_VIII = 'Enchimento de quaisquer vasilhames (cilindros, botijões) com inflamáveis gasosos liquefeitos'

function a2Area(alinea: string, local: string, descricao: string): AreaRiscoNr16 {
  return { local, descricao, referencia: `NR-16, Anexo 2, item 3, alínea ${alinea}` }
}

const ANEXO_2: CatalogoAnexoNr16 = {
  vigencia:
    'Redação da Portaria MTb nº 3.214/1978, com a alínea j do item 1 alterada e o item 4 (subitens 4.1 e 4.2 '
    + 'e Quadro I) incluído pela Portaria MTE nº 545/2000.',
  hipoteses: [
    a2('a', 'Produção, transporte, processamento e armazenamento de gás liquefeito',
      'Na produção, transporte, processamento e armazenamento de gás liquefeito.'),
    a2('b', 'Transporte e armazenagem de inflamáveis líquidos e gasosos liquefeitos e de vasilhames vazios não desgaseificados ou decantados',
      'Todos os trabalhadores da área de operação.'),
    a2('c', 'Postos de reabastecimento de aeronaves', A2_NESSAS),
    a2('d', 'Locais de carregamento de navios-tanques, vagões-tanques e caminhões-tanques e enchimento de vasilhames, com inflamáveis líquidos ou gasosos liquefeitos',
      A2_NESSAS, 'Carregamento de navios, vagões e caminhões-tanques e enchimento de vasilhames'),
    a2('e', 'Locais de descarga de navios-tanques, vagões-tanques e caminhões-tanques com inflamáveis líquidos ou gasosos liquefeitos ou de vasilhames vazios não desgaseificados ou decantados',
      A2_NESSAS, 'Descarga de navios, vagões e caminhões-tanques ou de vasilhames não desgaseificados'),
    a2('f', 'Serviços de operações e manutenção de navios-tanque, vagões-tanques, caminhões-tanques, bombas e vasilhames, com inflamáveis líquidos ou gasosos liquefeitos, ou vazios não desgaseificados ou decantados',
      A2_NESSAS, 'Operação e manutenção de navios, vagões e caminhões-tanques, bombas e vasilhames'),
    a2('g', 'Operações de desgaseificação, decantação e reparos de vasilhames não desgaseificados ou decantados', A2_NESSAS),
    a2('h', 'Operações de testes de aparelhos de consumo do gás e seus equipamentos', A2_NESSAS),
    a2('i', 'Transporte de inflamáveis líquidos e gasosos liquefeitos em caminhão-tanque', A2_MOTORISTA),
    a2('j', 'Transporte de vasilhames (em caminhão de carga), contendo inflamável líquido, em quantidade total igual ou superior a 200 litros, quando não observado o disposto nos subitens 4.1 e 4.2 do Anexo 2',
      A2_MOTORISTA, 'Transporte de vasilhames com inflamável líquido — 200 litros ou mais'),
    a2('l', 'Transporte de vasilhames (em carreta ou caminhão de carga), contendo inflamável gasoso e líquido, em quantidade total igual ou superior a 135 quilos',
      A2_MOTORISTA, 'Transporte de vasilhames com inflamável gasoso e líquido — 135 quilos ou mais'),
    a2('m', 'Operações em postos de serviço e bombas de abastecimento de inflamáveis líquidos',
      'Operador de bomba e trabalhadores que operam na área de risco.'),

    a2Inciso('I', 'a', A2_I, 'atividades de inspeção, calibração, medição, contagem de estoque e colheita de amostra em tanques ou quaisquer vasilhames cheios'),
    a2Inciso('I', 'b', A2_I, 'serviços de vigilância, de arrumação de vasilhames vazios não desgaseificados, de bombas propulsoras em recintos fechados e de superintendência'),
    a2Inciso('I', 'c', A2_I, 'atividades de manutenção, reparos, lavagem, pintura de embarcações, tanques, viaturas de abastecimento e de quaisquer vasilhames cheios de inflamáveis ou vazios, não desgaseificados'),
    a2Inciso('I', 'd', A2_I, 'atividades de desgaseificação e lavagem de embarcações, tanques, viaturas, bombas de abastecimento ou quaisquer vasilhames que tenham contido inflamáveis líquidos'),
    a2Inciso('I', 'e', A2_I, 'quaisquer outras atividades de manutenção ou operação, tais como serviço de almoxarifado, de escritório, de laboratório de inspeção de segurança, de conferência de estoque, de ambulatório médico, de engenharia, de oficinas em geral, de caldeiras, de mecânica, de eletricidade, de soldagem, de enchimento, fechamento e arrumação de quaisquer vasilhames com substâncias consideradas inflamáveis, desde que essas atividades sejam executadas dentro de áreas consideradas perigosas, ad referendum do Ministério do Trabalho'),
    a2Inciso('II', 'a', A2_II, 'atividades de inspeção nos pontos de vazamento eventual no sistema de depósito de distribuição e de medição de tanques pelos processos de escapamento direto'),
    a2Inciso('II', 'b', A2_II, 'serviços de superintendência'),
    a2Inciso('II', 'c', A2_II, 'atividades de manutenção das instalações da frota de caminhões-tanques, executadas dentro da área e em torno dos pontos de escapamento normais ou eventuais'),
    a2Inciso('II', 'd', A2_II, 'atividades de decantação, desgaseificação, lavagem, reparos, pinturas e areação de tanques, cilindros e botijões cheios de GLP'),
    a2Inciso('II', 'e', A2_II, 'quaisquer outras atividades de manutenção ou operações, executadas dentro das áreas consideradas perigosas pelo Ministério do Trabalho'),
    a2Inciso('III', 'a', A2_III, 'quaisquer atividades executadas dentro da bacia de segurança dos tanques'),
    a2Inciso('III', 'b', A2_III, 'arrumação de tambores ou latas ou quaisquer outras atividades executadas dentro do prédio de armazenamento de inflamáveis ou em recintos abertos e com vasilhames cheios de inflamáveis ou não desgaseificados ou decantados'),
    a2Inciso('IV', 'a', A2_IV, 'arrumação de vasilhames ou quaisquer outras atividades executadas dentro do prédio de armazenamento de inflamáveis ou em recintos abertos e com vasilhames cheios de inflamáveis ou vazios não desgaseificados ou decantados'),
    a2Inciso('V', 'a', A2_V, 'atividades ligadas diretamente ao abastecimento de viaturas com motor de explosão'),
    a2Inciso('VI', null, 'Outras atividades, tais como manutenção, lubrificação, lavagem de viaturas, mecânica, eletricidade, escritório de vendas e gerência, ad referendum do Ministério do Trabalho', null),
    a2Inciso('VII', 'a', A2_VII, 'atividades de enchimento, fechamento e arrumação de latas ou caixas com latas'),
    a2Inciso('VIII', 'a', A2_VIII, 'atividades de enchimento, pesagem, inspeção, estiva e arrumação de cilindros ou botijões cheios de GLP'),
    a2Inciso('VIII', 'b', A2_VIII, 'outras atividades executadas dentro da área considerada perigosa, ad referendum do Ministério do Trabalho'),
  ],
  areasRisco: [
    a2Area('a', 'Poços de petróleo em produção de gás', 'círculo com raio de 30 metros, no mínimo, com centro na boca do poço'),
    a2Area('b', 'Unidade de processamento das refinarias', 'faixa de 30 metros de largura, no mínimo, contornando a área de operação'),
    a2Area('c', 'Outros locais de refinaria onde se realizam operações com inflamáveis em estado de volatilização ou possibilidade de volatilização decorrente de falha ou defeito dos sistemas de segurança e fechamento das válvulas', 'faixa de 15 metros de largura, no mínimo, contornando a área de operação'),
    a2Area('d', 'Tanques de inflamáveis líquidos', 'toda a bacia de segurança'),
    a2Area('e', 'Tanques elevados de inflamáveis gasosos', 'círculo com raio de 3 metros com centro nos pontos de vazamento eventual (válvulas, registros, dispositivos de medição por escapamento, gaxetas)'),
    a2Area('f', 'Carga e descarga de inflamáveis líquidos contidos em navios, chatas e batelões', 'afastamento de 15 metros da beira do cais, durante a operação, com extensão correspondente ao comprimento da embarcação'),
    a2Area('g', 'Abastecimento de aeronaves', 'toda a área de operação'),
    a2Area('h', 'Enchimento de vagões-tanques e caminhões-tanques com inflamáveis líquidos', 'círculo com raio de 15 metros com centro nas bocas de enchimento dos tanques'),
    a2Area('i', 'Enchimento de vagões-tanques e caminhões-tanques com inflamáveis gasosos liquefeitos', 'círculo com raio de 7,5 metros com centro nos pontos de vazamento eventual (válvulas e registros)'),
    a2Area('j', 'Enchimento de vasilhames com inflamáveis gasosos liquefeitos', 'círculos com raio de 15 metros com centro nos bicos de enchimento'),
    a2Area('l', 'Enchimento de vasilhames com inflamáveis líquidos, em locais abertos', 'círculo com raio de 7,5 metros com centro nos bicos de enchimento'),
    a2Area('m', 'Enchimento de vasilhames com inflamáveis líquidos, em recinto fechado', 'toda a área interna do recinto'),
    a2Area('n', 'Manutenção de viaturas-tanques, bombas e vasilhames que continham inflamável líquido', 'local de operação, acrescido de faixa de 7,5 metros de largura em torno dos seus pontos externos'),
    a2Area('o', 'Desgaseificação, decantação e reparos de vasilhames não desgaseificados ou decantados, utilizados no transporte de inflamáveis', 'local da operação, acrescido de faixa de 7,5 metros de largura em torno dos seus pontos externos'),
    a2Area('p', 'Testes em aparelhos de consumo de gás e seus equipamentos', 'local da operação, acrescido de faixa de 7,5 metros de largura em torno dos seus pontos extremos'),
    a2Area('q', 'Abastecimento de inflamáveis', 'toda a área de operação, abrangendo, no mínimo, círculo com raio de 7,5 metros com centro no ponto de abastecimento, círculo com raio de 7,5 metros com centro na bomba de abastecimento da viatura e faixa de 7,5 metros de largura para ambos os lados da máquina'),
    a2Area('r', 'Armazenamento de vasilhames com inflamáveis líquidos ou vazios não desgaseificados ou decantados, em locais abertos', 'faixa de 3 metros de largura em torno dos seus pontos externos'),
    a2Area('s', 'Armazenamento de vasilhames com inflamáveis líquidos ou vazios não desgaseificados ou decantados, em recinto fechado', 'toda a área interna do recinto'),
    a2Area('t', 'Carga e descarga de vasilhames com inflamáveis líquidos ou vazios não desgaseificados ou decantados, transportados por navios, chatas ou batelões', 'afastamento de 3 metros da beira do cais, durante a operação, com extensão correspondente ao comprimento da embarcação'),
  ],
  exclusoes: [
    {
      texto:
        'Transporte de inflamáveis em pequenas quantidades: até 200 litros para inflamáveis líquidos e '
        + 'até 135 quilos para inflamáveis gasosos liquefeitos.',
      referencia: 'NR-16, item 16.6',
    },
    {
      texto:
        'As quantidades de inflamáveis contidas nos tanques de consumo próprio dos veículos não são '
        + 'consideradas para efeito da norma.',
      referencia: 'NR-16, item 16.6.1',
    },
    {
      // Redação da Portaria MTE nº 1.418/2024.
      texto:
        'Não se aplica o item 16.6 às quantidades de inflamáveis contidas nos tanques de combustíveis '
        + 'originais de fábrica e suplementares, e àqueles para consumo próprio de veículos de carga e de '
        + 'transporte coletivo de passageiros, de máquinas e de equipamentos, certificados pelo órgão '
        + 'competente, e nos equipamentos de refrigeração de carga.',
      referencia: 'NR-16, item 16.6.1.1',
    },
    {
      texto:
        'Manuseio, armazenagem e transporte de líquidos inflamáveis em embalagens certificadas, simples, '
        + 'compostas ou combinadas, dentro dos limites do Quadro I do anexo, independentemente do número total '
        + 'de embalagens, sempre que obedecidas as Normas Regulamentadoras, a NBR 11564/91 e a legislação sobre '
        + 'produtos perigosos relativa aos meios de transporte utilizados.',
      referencia: 'NR-16, Anexo 2, item 4.1',
    },
    {
      texto:
        'Manuseio, armazenagem e transporte de recipientes de até cinco litros, lacrados na fabricação, '
        + 'contendo líquidos inflamáveis, independentemente do número total de recipientes manuseados, '
        + 'armazenados ou transportados, sempre que obedecidas as Normas Regulamentadoras e a legislação '
        + 'sobre produtos perigosos relativa aos meios de transporte utilizados.',
      referencia: 'NR-16, Anexo 2, item 4.2',
    },
  ],
  notas: [
    {
      texto:
        'Líquido combustível é o que possui ponto de fulgor maior que 60 ºC e inferior ou igual a 93 ºC.',
      referencia: 'NR-16, item 16.7',
    },
    {
      texto:
        'O transporte de vasilhames (em caminhão de carga) contendo inflamável líquido, em quantidade total '
        + 'igual ou superior a 200 litros, só é enquadrado quando não observado o disposto nos subitens 4.1 e '
        + '4.2 do anexo.',
      referencia: 'NR-16, Anexo 2, item 1, alínea j',
    },
    {
      texto:
        'Atividades de apoio: nos incisos I, alínea e, e VIII, alínea b, só se enquadram quando executadas '
        + 'dentro da área considerada perigosa, ad referendum do Ministério do Trabalho; no inciso II, '
        + 'alínea e, quando executadas dentro das áreas consideradas perigosas pelo Ministério do '
        + 'Trabalho; o inciso VI (manutenção, lubrificação, lavagem de viaturas, mecânica, eletricidade, '
        + 'escritório de vendas e gerência) é listado ad referendum do Ministério do Trabalho, sem condição '
        + 'de área no próprio texto.',
      referencia: 'NR-16, Anexo 2, item 2, incisos I-e, II-e, VI e VIII-b',
    },
  ],
}

// ------------------------------------------------------------
// Anexo 3 — Segurança pessoal ou patrimonial
// ------------------------------------------------------------

const A3_QUADRO = 'Item 3 — atividades ou operações'

function a3(atividade: string, descricao: string): HipoteseNr16 {
  return {
    referencia: `NR-16, Anexo 3, item 3 (${atividade})`,
    grupo: A3_QUADRO,
    rotulo: atividade,
    atividade,
    descricao,
  }
}

const ANEXO_3: CatalogoAnexoNr16 = {
  vigencia: 'Aprovado pela Portaria MTE nº 1.885, de 02/12/2013.',
  hipoteses: [
    a3('Vigilância patrimonial', 'Segurança patrimonial e/ou pessoal na preservação do patrimônio em estabelecimentos públicos ou privados e da incolumidade física de pessoas.'),
    a3('Segurança de eventos', 'Segurança patrimonial e/ou pessoal em espaços públicos ou privados, de uso comum do povo.'),
    a3('Segurança nos transportes coletivos', 'Segurança patrimonial e/ou pessoal nos transportes coletivos e em suas respectivas instalações.'),
    a3('Segurança ambiental e florestal', 'Segurança patrimonial e/ou pessoal em áreas de conservação de fauna, flora natural e de reflorestamento.'),
    a3('Transporte de valores', 'Segurança na execução do serviço de transporte de valores.'),
    a3('Escolta armada', 'Segurança no acompanhamento de qualquer tipo de carga ou de valores.'),
    a3('Segurança pessoal', 'Acompanhamento e proteção da integridade física de pessoa ou de grupos.'),
    a3('Supervisão/fiscalização operacional', 'Supervisão e/ou fiscalização direta dos locais de trabalho para acompanhamento e orientação dos vigilantes.'),
    a3('Telemonitoramento/telecontrole', 'Execução de controle e/ou monitoramento de locais, através de sistemas eletrônicos de segurança.'),
  ],
  areasRisco: [],
  exclusoes: [],
  notas: [
    {
      texto:
        'Só é profissional de segurança, para o anexo, o empregado de empresa prestadora de serviço de '
        + 'segurança privada ou de serviço orgânico de segurança privada, devidamente registrada e autorizada '
        + '(a norma cita a Lei nº 7.102/1983, hoje sucedida pelo Estatuto da Segurança Privada, Lei nº 14.967/2024).',
      referencia: 'NR-16, Anexo 3, item 2, alínea a',
    },
    {
      texto:
        'Ou o empregado que exerce segurança patrimonial ou pessoal em instalações metroviárias, ferroviárias, '
        + 'portuárias, rodoviárias, aeroportuárias e de bens públicos, contratado diretamente pela administração '
        + 'pública direta ou indireta.',
      referencia: 'NR-16, Anexo 3, item 2, alínea b',
    },
  ],
}

// ------------------------------------------------------------
// Anexo 4 — Energia elétrica
// ------------------------------------------------------------

const A4_ITEM_1 = 'Item 1 — hipóteses do adicional'
const A4_ITEM_41 = 'Item 4.1 — SEP: redes e linhas aéreas ou subterrâneas'
const A4_ITEM_42 = 'Item 4.2 — SEP: usinas, unidades geradoras, subestações e cabinas'
const A4_QUADRO_III = 'Quadro I, atividade III — ensaios e reparos no SEP'
const A4_QUADRO_IV = 'Quadro I, atividade IV — treinamento no SEP'
const A4_ITEM_1_D = 'NR-16, Anexo 4, item 1, alínea d'

function a4(grupo: string, item: string, alinea: string, atividade: string, rotulo = atividade): HipoteseNr16 {
  return {
    referencia: `NR-16, Anexo 4, item ${item}, alínea ${alinea}`,
    grupo,
    rotulo: `${alinea}) ${rotulo}`,
    atividade,
  }
}

const A4_REDES = 'Construção, operação e manutenção de redes de linhas aéreas ou subterrâneas de alta e baixa tensão integrantes do SEP'
const A4_USINAS = 'Construção, operação e manutenção nas usinas, unidades geradoras, subestações e cabinas de distribuição em operação, integrantes do SEP'

function a4Area(atividade: 'I' | 'II' | 'III' | 'IV', alinea: string, descricao: string, aplicaA: readonly string[]): AreaRiscoNr16 {
  return {
    local: `Quadro I, atividade ${atividade}`,
    descricao,
    referencia: `NR-16, Anexo 4, Quadro I, atividade ${atividade}, área ${alinea}`,
    aplicaA,
  }
}

// O Quadro I só delimita área para o SEP. As alíneas a, b e c do item 1 (alta
// tensão, proximidade, baixa tensão no SEC) remetem à NR-10 e ficam sem lista;
// a alínea d é a porta de entrada do quadro. A atividade IV (treinamento)
// abrange "todas as áreas descritas nos itens anteriores".
const A4_AREAS_I = [A4_ITEM_41, A4_ITEM_1_D, A4_QUADRO_IV]
const A4_AREAS_II = [A4_ITEM_42, A4_ITEM_1_D, A4_QUADRO_IV]
const A4_AREAS_III = [A4_QUADRO_III, A4_ITEM_1_D, A4_QUADRO_IV]

const ANEXO_4: CatalogoAnexoNr16 = {
  vigencia: 'Aprovado pela Portaria MTE nº 1.078, de 16/07/2014.',
  hipoteses: [
    a4(A4_ITEM_1, '1', 'a', 'Atividades ou operações em instalações ou equipamentos elétricos energizados em alta tensão'),
    a4(A4_ITEM_1, '1', 'b', 'Atividades ou operações com trabalho em proximidade, conforme estabelece a NR-10'),
    a4(A4_ITEM_1, '1', 'c',
      'Atividades ou operações em instalações ou equipamentos elétricos energizados em baixa tensão no sistema elétrico de consumo (SEC), no caso de descumprimento do item 10.2.8 e seus subitens da NR-10',
      'Baixa tensão no SEC, com descumprimento do item 10.2.8 da NR-10'),
    a4(A4_ITEM_1, '1', 'd',
      'Atividades ou operações dos trabalhadores das empresas que operam em instalações ou equipamentos integrantes do sistema elétrico de potência (SEP), bem como de suas contratadas, em conformidade com as atividades e respectivas áreas de risco descritas no Quadro I',
      'Instalações ou equipamentos integrantes do SEP (empresas e contratadas), conforme o Quadro I'),

    a4(A4_ITEM_41, '4.1', 'a',
      `${A4_REDES}: montagem, instalação, substituição, conservação, reparos, ensaios e testes de: verificação, inspeção, levantamento, supervisão e fiscalização; fusíveis, condutores, para-raios, postes, torres, chaves, muflas, isoladores, transformadores, capacitores, medidores, reguladores de tensão, religadores, seccionalizadores, carrier (onda portadora via linhas de transmissão), cruzetas, relé e braço de iluminação pública, aparelho de medição gráfica, bases de concreto ou alvenaria de torres, postes e estrutura de sustentação de redes e linhas aéreas e demais componentes das redes aéreas`,
      'Montagem, instalação, substituição, conservação, reparos, ensaios e testes de componentes das redes aéreas'),
    a4(A4_ITEM_41, '4.1', 'b', `${A4_REDES}: corte e poda de árvores`, 'Corte e poda de árvores'),
    a4(A4_ITEM_41, '4.1', 'c', `${A4_REDES}: ligações e cortes de consumidores`, 'Ligações e cortes de consumidores'),
    a4(A4_ITEM_41, '4.1', 'd', `${A4_REDES}: manobras aéreas e subterrâneas de redes e linhas`, 'Manobras aéreas e subterrâneas de redes e linhas'),
    a4(A4_ITEM_41, '4.1', 'e', `${A4_REDES}: manobras em subestação`, 'Manobras em subestação'),
    a4(A4_ITEM_41, '4.1', 'f', `${A4_REDES}: testes de curto em linhas de transmissão`, 'Testes de curto em linhas de transmissão'),
    a4(A4_ITEM_41, '4.1', 'g', `${A4_REDES}: manutenção de fontes de alimentação de sistemas de comunicação`, 'Manutenção de fontes de alimentação de sistemas de comunicação'),
    a4(A4_ITEM_41, '4.1', 'h', `${A4_REDES}: leitura em consumidores de alta tensão`, 'Leitura em consumidores de alta tensão'),
    a4(A4_ITEM_41, '4.1', 'i', `${A4_REDES}: aferição em equipamentos de medição`, 'Aferição em equipamentos de medição'),
    a4(A4_ITEM_41, '4.1', 'j', `${A4_REDES}: medidas de resistências, lançamento e instalação de cabo contrapeso`, 'Medidas de resistências, lançamento e instalação de cabo contrapeso'),
    a4(A4_ITEM_41, '4.1', 'k', `${A4_REDES}: medidas de campo eletromagnético, rádio, interferência e correntes induzidas`, 'Medidas de campo eletromagnético, rádio, interferência e correntes induzidas'),
    a4(A4_ITEM_41, '4.1', 'l', `${A4_REDES}: testes elétricos em instalações de terceiros em faixas de linhas de transmissão (oleodutos, gasodutos etc.)`, 'Testes elétricos em instalações de terceiros em faixas de linhas de transmissão'),
    a4(A4_ITEM_41, '4.1', 'm', `${A4_REDES}: pintura de estruturas e equipamentos`, 'Pintura de estruturas e equipamentos'),
    a4(A4_ITEM_41, '4.1', 'n', `${A4_REDES}: verificação, inspeção, inclusive aérea, fiscalização, levantamento de dados e supervisão de serviços técnicos`, 'Verificação, inspeção (inclusive aérea), fiscalização e supervisão de serviços técnicos'),
    a4(A4_ITEM_41, '4.1', 'o',
      `${A4_REDES}: montagem, instalação, substituição, manutenção e reparos de barramentos, transformadores, disjuntores, chaves e seccionadoras, condensadores, chaves a óleo, transformadores para instrumentos, cabos subterrâneos e subaquáticos, painéis, circuitos elétricos, contatos, muflas e isoladores e demais componentes de redes subterrâneas`,
      'Montagem, instalação, substituição, manutenção e reparos de componentes de redes subterrâneas'),
    a4(A4_ITEM_41, '4.1', 'p', `${A4_REDES}: construção civil, instalação, substituição e limpeza de valas, bancos de dutos, dutos, condutos, canaletas, galerias, túneis, caixas ou poços de inspeção, câmaras`, 'Construção civil, instalação e limpeza de valas, dutos, galerias, túneis e poços de inspeção'),
    a4(A4_ITEM_41, '4.1', 'q', `${A4_REDES}: medição, verificação, ensaios, testes, inspeção, fiscalização, levantamento de dados e supervisões de serviços técnicos`, 'Medição, ensaios, testes, inspeção e supervisão de serviços técnicos'),

    a4(A4_ITEM_42, '4.2', 'a',
      `${A4_USINAS}: montagem, desmontagem, operação e conservação de medidores, relés, chaves, disjuntores e religadoras, caixas de controle, cabos de força, cabos de controle, barramentos, baterias e carregadores, transformadores, sistemas anti-incêndio e de resfriamento, bancos de capacitores, reatores, reguladores, equipamentos eletrônicos, eletromecânicos e eletroeletrônicos, painéis, para-raios, áreas de circulação, estruturas-suporte e demais instalações e equipamentos elétricos`,
      'Montagem, desmontagem, operação e conservação de equipamentos e instalações elétricas'),
    a4(A4_ITEM_42, '4.2', 'b', `${A4_USINAS}: construção de valas de dutos, canaletas, bases de equipamentos, estruturas, condutos e demais instalações`, 'Construção de valas de dutos, canaletas, bases de equipamentos e estruturas'),
    a4(A4_ITEM_42, '4.2', 'c', `${A4_USINAS}: serviços de limpeza, pintura e sinalização de instalações e equipamentos elétricos`, 'Limpeza, pintura e sinalização de instalações e equipamentos elétricos'),
    a4(A4_ITEM_42, '4.2', 'd', `${A4_USINAS}: ensaios, testes, medições, supervisão, fiscalizações e levantamentos de circuitos e equipamentos elétricos, eletrônicos de telecomunicações e telecontrole`, 'Ensaios, testes, medições e supervisão de circuitos e equipamentos'),

    {
      referencia: 'NR-16, Anexo 4, Quadro I, atividade III',
      grupo: A4_QUADRO_III,
      rotulo: 'III) Inspeção, testes, ensaios, calibração, medição e reparos em equipamentos e materiais do SEP',
      atividade:
        'Atividades de inspeção, testes, ensaios, calibração, medição e reparos em equipamentos e materiais '
        + 'elétricos, eletrônicos, eletromecânicos e de segurança individual e coletiva em sistemas elétricos '
        + 'de potência de alta e baixa tensão',
    },
    {
      referencia: 'NR-16, Anexo 4, Quadro I, atividade IV',
      grupo: A4_QUADRO_IV,
      rotulo: 'IV) Treinamento em equipamentos ou instalações integrantes do SEP',
      atividade:
        'Atividades de treinamento em equipamentos ou instalações integrantes do SEP, energizadas ou '
        + 'desenergizadas, mas com possibilidade de energização acidental ou por falha operacional',
    },
  ],
  areasRisco: [
    a4Area('I', 'a', 'estruturas, condutores e equipamentos de linhas aéreas de transmissão, subtransmissão e distribuição, incluindo plataformas e cestos aéreos usados para execução dos trabalhos', A4_AREAS_I),
    a4Area('I', 'b', 'pátio e salas de operação de subestações', A4_AREAS_I),
    a4Area('I', 'c', 'cabines de distribuição', A4_AREAS_I),
    a4Area('I', 'd', 'estruturas, condutores e equipamentos de redes de tração elétrica, incluindo escadas, plataformas e cestos aéreos usados para execução dos trabalhos', A4_AREAS_I),
    a4Area('I', 'e', 'valas, bancos de dutos, canaletas, condutores, recintos internos de caixas, poços de inspeção, câmaras, galerias, túneis, estruturas terminais e aéreas de superfície correspondentes', A4_AREAS_I),
    a4Area('I', 'f', 'áreas submersas em rios, lagos e mares', A4_AREAS_I),
    a4Area('II', 'a', 'pontos de medição e cabinas de distribuição, inclusive de consumidores', A4_AREAS_II),
    a4Area('II', 'b', 'salas de controles, casa de máquinas, barragens de usinas e unidades geradoras', A4_AREAS_II),
    a4Area('II', 'c', 'pátios e salas de operações de subestações, inclusive consumidoras', A4_AREAS_II),
    a4Area('III', 'a', 'áreas das oficinas e laboratórios de testes e manutenção elétrica, eletrônica e eletromecânica onde são executados testes, ensaios, calibração e reparos de equipamentos energizados ou passíveis de energização acidental', A4_AREAS_III),
    a4Area('III', 'b', 'sala de controle e casas de máquinas de usinas e unidades geradoras', A4_AREAS_III),
    a4Area('III', 'c', 'pátios e salas de operação de subestações, inclusive consumidoras', A4_AREAS_III),
    a4Area('III', 'd', 'salas de ensaios elétricos de alta tensão', A4_AREAS_III),
    a4Area('III', 'e', 'sala de controle dos centros de operações', A4_AREAS_III),
    a4Area('IV', 'a', 'todas as áreas descritas para as atividades I, II e III', [A4_QUADRO_IV]),
  ],
  exclusoes: [
    {
      texto:
        'Atividades no sistema elétrico de consumo em instalações ou equipamentos desenergizados e liberados '
        + 'para o trabalho, sem possibilidade de energização acidental, conforme a NR-10.',
      referencia: 'NR-16, Anexo 4, item 2, alínea a',
    },
    {
      texto: 'Atividades em instalações ou equipamentos elétricos alimentados por extra-baixa tensão.',
      referencia: 'NR-16, Anexo 4, item 2, alínea b',
    },
    {
      texto:
        'Atividades ou operações elementares realizadas em baixa tensão, tais como o uso de equipamentos '
        + 'elétricos energizados e os procedimentos de ligar e desligar circuitos elétricos, desde que os '
        + 'materiais e equipamentos elétricos estejam em conformidade com as normas técnicas oficiais '
        + 'estabelecidas pelos órgãos competentes e, na ausência ou omissão destas, as normas internacionais '
        + 'cabíveis.',
      referencia: 'NR-16, Anexo 4, item 2, alínea c',
    },
  ],
  notas: [
    {
      texto:
        'As atividades dos itens 4.1 e 4.2 se enquadram com instalações ou equipamentos energizados, ou '
        + 'desenergizados mas com possibilidade de energização acidental ou por falha operacional.',
      referencia: 'NR-16, Anexo 4, Quadro I, atividades I e II',
    },
    {
      texto:
        'O trabalho intermitente equipara-se à exposição permanente para pagamento integral do adicional nos '
        + 'meses em que houver exposição; excluída a exposição eventual, assim considerado o caso fortuito ou '
        + 'que não faça parte da rotina.',
      referencia: 'NR-16, Anexo 4, item 3',
    },
  ],
}

// ------------------------------------------------------------
// Anexo 5 — Motocicleta
// ------------------------------------------------------------

const ANEXO_5: CatalogoAnexoNr16 = {
  vigencia:
    'Aprovado pela Portaria MTE nº 2.021, de 03/12/2025, em vigor a partir de 03/04/2026. A redação anterior '
    + '(Portaria MTE nº 1.565/2014) consta no texto oficial como anulada por decisão judicial.',
  hipoteses: [
    {
      referencia: 'NR-16, Anexo 5, item 3.1',
      grupo: 'Item 3 — caracterização',
      rotulo: '3.1) Deslocamento laboral em motocicleta em vias abertas à circulação pública',
      atividade: 'Atividades laborais com utilização de motocicleta no deslocamento de trabalhador em vias abertas à circulação pública',
    },
  ],
  areasRisco: [],
  exclusoes: [
    {
      texto: 'Veículos que não necessitem de emplacamento ou que não exijam carteira nacional de habilitação para conduzi-los.',
      referencia: 'NR-16, Anexo 5, item 2.3',
    },
    {
      texto:
        'Deslocamento exclusivamente no percurso entre a residência e o posto de trabalho, e no retorno após a jornada.',
      referencia: 'NR-16, Anexo 5, item 3.2, alínea a',
    },
    {
      texto:
        'Condução exclusivamente em locais privados, vias internas ou vias não abertas à circulação pública, '
        + 'mesmo quando a motocicleta transitar de forma eventual por vias públicas.',
      referencia: 'NR-16, Anexo 5, item 3.2, alínea b',
    },
    {
      texto:
        'Uso exclusivamente em estradas locais destinadas principalmente a dar acesso a propriedades lindeiras '
        + 'ou em caminhos que ligam povoações contíguas.',
      referencia: 'NR-16, Anexo 5, item 3.2, alínea c',
    },
    {
      texto:
        'Uso de forma eventual, assim considerado o fortuito, ou o que, sendo habitual, dá-se por tempo extremamente reduzido.',
      referencia: 'NR-16, Anexo 5, item 3.2, alínea d',
    },
  ],
  notas: [
    {
      texto:
        'Motocicleta é todo veículo automotor de duas rodas, com ou sem side-car, conduzido em posição montada '
        + 'ou sentada (motonetas), nas vias terrestres regidas pelo Código de Trânsito Brasileiro.',
      referencia: 'NR-16, Anexo 5, itens 2.1 e 2.2',
    },
    {
      texto:
        'Para período anterior a 03/04/2026, confira a redação aplicável: a da Portaria MTE nº 1.565/2014 consta como anulada.',
      referencia: 'NR-16, Anexo 5 (vigência)',
    },
  ],
}

// ------------------------------------------------------------
// Anexo 6 — Agentes das autoridades de trânsito
// ------------------------------------------------------------

const ANEXO_6: CatalogoAnexoNr16 = {
  vigencia: 'Inserido pela Portaria MTE nº 1.411, de 22/08/2025.',
  hipoteses: [
    {
      referencia: 'NR-16, Anexo 6, item 3.1',
      grupo: 'Item 3 — caracterização',
      rotulo: '3.1) Agente da autoridade de trânsito exposto a colisões, atropelamentos ou violências',
      atividade:
        'Atividades ou operações realizadas por Agente da Autoridade de Trânsito com exposição ao risco de '
        + 'colisões, atropelamentos ou outras espécies de acidentes ou violências',
    },
  ],
  areasRisco: [],
  exclusoes: [],
  notas: [
    {
      texto:
        'São agentes das autoridades de trânsito os previstos nos conceitos e definições do Anexo I do Código '
        + 'de Trânsito Brasileiro (Lei nº 9.503/1997); nos termos da lei, o anexo se aplica a outras relações jurídicas.',
      referencia: 'NR-16, Anexo 6, itens 2.1.1 e 2.2',
    },
    {
      texto:
        'A exposição a colisões, atropelamentos ou outras espécies de acidentes ou violências deve ser analisada '
        + 'independentemente do local de realização da atividade.',
      referencia: 'NR-16, Anexo 6, item 3.2.1',
    },
  ],
}

// ------------------------------------------------------------
// Anexo (*) — Radiações ionizantes ou substâncias radioativas
// ------------------------------------------------------------

const RAD_1 = 'Item 1 — materiais radioativos'
const RAD_2 = 'Item 2 — reatores nucleares'
const RAD_3 = 'Item 3 — aceleradores de partículas'
const RAD_4 = 'Item 4 — raios X e irradiadores'
const RAD_5 = 'Item 5 — medicina nuclear'
const RAD_6 = 'Item 6 — descomissionamento de instalações'
const RAD_7 = 'Item 7 — descomissionamento de minas e usinas'

function rad(grupo: string, item: string, atividade: string, rotulo = atividade): HipoteseNr16 {
  return {
    referencia: `NR-16, Anexo (*), item ${item}`,
    grupo,
    rotulo: `${item}) ${rotulo}`,
    atividade,
  }
}

function radAreas(grupo: string, item: string, descricoes: string[]): AreaRiscoNr16[] {
  return descricoes.map((descricao) => ({
    local: `Atividades do item ${item}`,
    descricao,
    referencia: `NR-16, Anexo (*), item ${item} (áreas de risco)`,
    aplicaA: [grupo],
  }))
}

const ANEXO_RADIACOES: CatalogoAnexoNr16 = {
  vigencia:
    'Acrescentado pela Portaria MTb nº 3.393/1987 e adotado pela Portaria MTE nº 518/2003; Nota Explicativa '
    + 'inserida pela Portaria MTE nº 595/2015.',
  hipoteses: [
    rad(RAD_1, '1',
      'Produção, utilização, processamento, transporte, guarda, estocagem e manuseio de materiais radioativos, selados e não selados, de estado físico e forma química quaisquer, naturais ou artificiais',
      'Produção, utilização, transporte, guarda e manuseio de materiais radioativos'),
    rad(RAD_1, '1.1', 'Prospecção, mineração, operação, beneficiamento e processamento de minerais radioativos'),
    rad(RAD_1, '1.2', 'Produção, transformação e tratamento de materiais nucleares para o ciclo do combustível nuclear'),
    rad(RAD_1, '1.3', 'Produção de radioisótopos para uso em medicina, agricultura, agropecuária, pesquisa científica e tecnológica'),
    rad(RAD_1, '1.4', 'Produção de fontes radioativas'),
    rad(RAD_1, '1.5', 'Testes, ensaios e calibração de detectores e monitores de radiação com fontes de radiação'),
    rad(RAD_1, '1.6',
      'Descontaminação de superfícies, instrumentos, máquinas, ferramentas, utensílios de laboratório, vestimentas e de quaisquer outras áreas ou bens duráveis contaminados com material radioativo',
      'Descontaminação de superfícies, instrumentos, vestimentas e bens contaminados'),
    rad(RAD_1, '1.7', 'Separação isotópica e processamento radioquímico'),
    rad(RAD_1, '1.8', 'Manuseio, condicionamento, liberação, monitoração, estabilização, inspeção, retenção e deposição de rejeitos radioativos'),

    rad(RAD_2, '2', 'Atividades de operação e manutenção de reatores nucleares'),
    rad(RAD_2, '2.1', 'Montagem, instalação, substituição e inspeção de elementos combustíveis'),
    rad(RAD_2, '2.2',
      'Manutenção de componentes integrantes do reator e dos sistemas hidráulicos, mecânicos e elétricos, irradiados, contaminados ou situados em áreas de radiação',
      'Manutenção de componentes do reator e de sistemas irradiados ou contaminados'),
    rad(RAD_2, '2.3', 'Manuseio de amostras irradiadas'),
    rad(RAD_2, '2.4', 'Experimentos utilizando canais de irradiação'),
    rad(RAD_2, '2.5',
      'Medição de radiação, levantamento de dados radiológicos e nucleares, ensaios, testes, inspeções, fiscalização e supervisão de trabalhos técnicos',
      'Medição de radiação, levantamento de dados, ensaios, inspeções e supervisão'),
    rad(RAD_2, '2.6', 'Segregação, manuseio, tratamento, acondicionamento e armazenamento de rejeitos radioativos'),

    rad(RAD_3, '3', 'Atividades de operação e manutenção de aceleradores de partículas'),
    rad(RAD_3, '3.1', 'Montagem, instalação, substituição e manutenção de componentes irradiados ou contaminados'),
    rad(RAD_3, '3.2', 'Processamento de alvos irradiados'),
    rad(RAD_3, '3.3', 'Experimentos com feixes de partículas'),
    rad(RAD_3, '3.4', 'Medição de radiação, levantamento de dados radiológicos e nucleares, testes, inspeções e supervisão de trabalhos técnicos',
      'Medição de radiação, levantamento de dados, testes, inspeções e supervisão'),
    rad(RAD_3, '3.5', 'Segregação, manuseio, tratamento, acondicionamento e armazenamento de rejeitos radioativos'),

    rad(RAD_4, '4', 'Atividades de operação com aparelhos de raios X, com irradiadores de radiação gama, radiação beta ou radiação de nêutrons',
      'Operação com aparelhos de raios X e irradiadores gama, beta ou de nêutrons'),
    rad(RAD_4, '4.1', 'Diagnóstico médico e odontológico'),
    rad(RAD_4, '4.2', 'Radioterapia'),
    rad(RAD_4, '4.3', 'Radiografia industrial, gamagrafia e neutronradiografia'),
    rad(RAD_4, '4.4', 'Análise de materiais por difratometria'),
    rad(RAD_4, '4.5', 'Testes, ensaios e calibração de detectores e monitores de radiação'),
    rad(RAD_4, '4.6', 'Irradiação de alimentos'),
    rad(RAD_4, '4.7', 'Estabilização de instrumentos médico-hospitalares'),
    rad(RAD_4, '4.8', 'Irradiação de espécimes minerais e biológicos'),
    rad(RAD_4, '4.9', 'Medição de radiação, levantamento de dados radiológicos, ensaios, testes, inspeções, fiscalização de trabalhos técnicos',
      'Medição de radiação, levantamento de dados, ensaios, testes e inspeções'),

    rad(RAD_5, '5', 'Atividades de medicina nuclear'),
    rad(RAD_5, '5.1', 'Manuseio e aplicação de radioisótopos para diagnóstico médico e terapia'),
    rad(RAD_5, '5.2', 'Manuseio de fontes seladas para aplicação em braquiterapia'),
    rad(RAD_5, '5.3', 'Obtenção de dados biológicos de pacientes com radioisótopos incorporados'),
    rad(RAD_5, '5.4', 'Segregação, manuseio, tratamento, acondicionamento e estocagem de rejeitos radioativos'),

    rad(RAD_6, '6', 'Descomissionamento de instalações nucleares e radioativas'),
    rad(RAD_6, '6.1', 'Todas as descontaminações radioativas inerentes ao descomissionamento'),
    rad(RAD_6, '6.2',
      'Gerenciamento dos rejeitos radioativos existentes: tratamento e acondicionamento dos rejeitos líquidos, sólidos, gasosos e aerossóis; transporte e deposição dos mesmos',
      'Gerenciamento dos rejeitos radioativos existentes (tratamento, transporte e deposição)'),

    rad(RAD_7, '7', 'Descomissionamento de minas, moinhos e usinas de tratamento de minerais radioativos'),
  ],
  // A tabela do anexo alinha as áreas às atividades só visualmente, e o
  // alinhamento do texto publicado não é confiável linha a linha. Por isso as
  // áreas ficam presas ao ITEM (1 a 7), não ao subitem: a lista que aparece
  // para "4.3" é a do item 4 inteiro — o perito escolhe a que corresponde.
  areasRisco: [
    ...radAreas(RAD_1, '1', [
      'Minas e depósitos de materiais radioativos',
      'Plantas-piloto e usinas de beneficiamento de minerais radioativos',
      'Outras áreas sujeitas a risco potencial devido às radiações ionizantes',
      'Lixiviação de minerais radioativos para a produção de concentrados de urânio e tório',
      'Purificação de concentrados e conversão em outras formas para uso como combustível nuclear',
      'Produção de fluoretos de urânio para a produção de hexafluoretos e urânio metálico',
      'Instalações para enriquecimento isotópico e reconversão',
      'Fabricação de elemento combustível nuclear',
      'Instalações para armazenamento dos elementos combustíveis usados',
      'Instalações para o retratamento do combustível irradiado',
      'Instalações para o tratamento e deposições, provisórias e finais, dos rejeitos radioativos naturais e artificiais',
      'Laboratórios para a produção de radioisótopos e moléculas marcadas',
      'Instalações para tratamento de material radioativo e confecção de fontes',
      'Laboratórios de testes, ensaios e calibração de fontes, detectores e monitores de radiação, com fontes radioativas',
      'Laboratórios de ensaios para materiais radioativos',
      'Laboratórios de radioquímica',
      'Laboratórios para descontaminação de peças e materiais radioativos',
      'Coleta de rejeitos radioativos em instalações, prédios e em áreas abertas',
      'Lavanderia para roupas contaminadas',
      'Transporte de materiais e rejeitos radioativos, condicionamento, estocagem e sua deposição',
      'Instalações para tratamento, condicionamento, contenção, estabilização, estocagem e deposição de rejeitos radioativos',
      'Instalações para retenção de rejeitos radioativos',
      'Sítios de rejeitos',
      'Instalações para estocagem de produtos radioativos para posterior aproveitamento',
    ]),
    ...radAreas(RAD_2, '2', [
      'Edifícios de reatores',
      'Edifícios de estocagem de combustível',
      'Instalações de tratamento e estocagem de rejeitos radioativos',
      'Instalações para tratamento de água de reatores e separação e contenção de produtos radioativos',
      'Salas de operação de reatores',
      'Salas de amostragem de efluentes radioativos',
      'Laboratórios de medidas de radioativos',
      'Outras áreas sujeitas a risco potencial às radiações ionizantes, passíveis de serem atingidas por dispersão de produtos voláteis',
      'Laboratórios semiquentes e quentes',
      'Minas de urânio e tório',
      'Depósitos de minerais radioativos e produtos do tratamento de minerais radioativos',
      'Coletas de materiais e peças radioativas, materiais contaminados com radioisótopos e águas radioativas',
    ]),
    ...radAreas(RAD_3, '3', [
      'Áreas de irradiação de alvos',
      'Oficinas de manutenção de componentes irradiados ou contaminados',
      'Salas de operação de aceleradores',
      'Laboratórios para tratamento de alvos irradiados e separação de radioisótopos',
      'Laboratórios de testes com radiação e medidas nucleares',
      'Áreas de tratamento e estocagem de rejeitos radioativos',
      'Laboratórios de processamento de alvos irradiados',
    ]),
    ...radAreas(RAD_4, '4', [
      'Salas de irradiação e de operação de aparelhos de raios X e de irradiadores gama, beta ou nêutrons',
      'Laboratórios de testes, ensaios e calibração com as fontes de radiação descritas',
      'Manuseio de fontes',
      'Manuseio do equipamento',
      'Manuseio de fontes e amostras radioativas',
      'Manuseio de fontes e instalações para a irradiação de alimentos',
      'Manuseio de fontes e instalações para a operação',
      'Manuseio de amostras irradiadas',
      'Laboratórios de ensaios e calibração de fontes e materiais radioativos',
    ]),
    ...radAreas(RAD_5, '5', [
      'Sala de diagnósticos e terapia com medicina nuclear',
      'Enfermaria de pacientes sob tratamento com radioisótopos',
      'Enfermaria de pacientes contaminados com radioisótopos em observação e sob tratamento de descontaminação',
      'Área de tratamento e estocagem de rejeitos radioativos',
      'Manuseio de materiais biológicos contendo radioisótopos ou moléculas marcadas',
      'Laboratórios para descontaminação e coleta de rejeitos radioativos',
    ]),
    ...radAreas(RAD_6, '6', [
      'Áreas de instalações nucleares e radioativas contaminadas e com rejeitos',
      'Depósitos provisórios e definitivos de rejeitos radioativos',
      'Instalações para contenção de rejeitos radioativos',
      'Instalações para asfaltamento de rejeitos radioativos',
      'Instalações para cimentação de rejeitos radioativos',
    ]),
    ...radAreas(RAD_7, '7', [
      'Tratamento de rejeitos minerais',
      'Repositório de rejeitos naturais (bacia de contenção de rádio e outros radioisótopos)',
      'Deposição de gangas e rejeitos de mineração',
    ]),
  ],
  exclusoes: [
    {
      texto:
        'Não são perigosas as atividades desenvolvidas em áreas que utilizam equipamentos móveis de raios X '
        + 'para diagnóstico médico.',
      referencia: 'NR-16, Anexo (*), Nota Explicativa, item 1',
    },
    {
      texto:
        'Emergências, centro de tratamento intensivo, sala de recuperação e leitos de internação não são salas '
        + 'de irradiação em razão do uso do equipamento móvel de raios X.',
      referencia: 'NR-16, Anexo (*), Nota Explicativa, item 2',
    },
  ],
  notas: [],
}

/** Indexado pelo id de `ANEXOS_NR16` (src/content/anexosNr16.ts). */
export const CATALOGO_NR16: Readonly<Record<string, CatalogoAnexoNr16>> = {
  ANEXO_01: ANEXO_1,
  ANEXO_02: ANEXO_2,
  ANEXO_03: ANEXO_3,
  ANEXO_04: ANEXO_4,
  ANEXO_05: ANEXO_5,
  ANEXO_06: ANEXO_6,
  ANEXO_RADIACOES,
}

export function catalogoDoAnexoNr16(id?: string): CatalogoAnexoNr16 | undefined {
  return id ? CATALOGO_NR16[id] : undefined
}

/** A hipótese gravada no agente, se o texto ainda casar com uma do catálogo. */
export function hipoteseCorrespondente(agente: {
  anexoNr16?: string
  enquadramentoNr16?: string
}): HipoteseNr16 | undefined {
  const referencia = agente.enquadramentoNr16?.trim()
  if (!referencia) return undefined
  return catalogoDoAnexoNr16(agente.anexoNr16)?.hipoteses.find((hipotese) => hipotese.referencia === referencia)
}

/**
 * As áreas de risco que a norma associa à hipótese escolhida.
 *
 * Sem hipótese, todas as do anexo. Com hipótese, só as ligadas ao grupo dela
 * — e nenhuma quando a norma não delimita área para aquele caso (o SEC do
 * Anexo 4, por exemplo, remete à NR-10). Mostrar ali as áreas do SEP
 * induziria o perito a delimitar pelo quadro errado.
 */
export function areasDaHipoteseNr16(anexoId?: string, hipotese?: HipoteseNr16): readonly AreaRiscoNr16[] {
  const areas = catalogoDoAnexoNr16(anexoId)?.areasRisco ?? []
  if (!hipotese) return areas
  return areas.filter(
    (area) => !area.aplicaA || area.aplicaA.includes(hipotese.grupo) || area.aplicaA.includes(hipotese.referencia),
  )
}

/** "Tanques de inflamáveis líquidos — toda a bacia de segurança (NR-16, Anexo 2, item 3, alínea d)" */
export function textoAreaRiscoNr16(area: AreaRiscoNr16): string {
  return `${area.local} — ${area.descricao} (${area.referencia})`
}
