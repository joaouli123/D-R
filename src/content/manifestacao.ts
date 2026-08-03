import type {
  AgenteManifestacao,
  BlocoTexto,
  ModeloManifestacao,
  PosicionamentoManifestacao,
} from '@/types'

// ============================================================
// MÓDULO L — Manifestação ao Laudo (item 18)
// 18.1 Concordância com o laudo ....... texto padrão pronto
// 18.2 Impugnação ao laudo ............ modelos prontos editáveis
// 18.3 Impugnação ao esclarecimento ... continuação da impugnação
//
// O sistema monta o documento automaticamente a partir do
// agente selecionado (Ruído, Calor, Biológico, Periculosidade).
// ============================================================

export const AGENTES_MANIFESTACAO: {
  value: AgenteManifestacao
  label: string
  norma: string
  descricao: string
}[] = [
  {
    value: 'ruido',
    label: 'Ruído',
    norma: 'NR-15, Anexos 1 e 2 · NHO-01/FUNDACENTRO',
    descricao: 'Avaliação quantitativa por dosimetria, com limite de tolerância variável conforme a jornada.',
  },
  {
    value: 'calor',
    label: 'Calor',
    norma: 'NR-15, Anexo 3 (Portaria SEPRT 1.359/2019) · NHO-06',
    descricao: 'Sobrecarga térmica avaliada por IBUTG, confrontada com a taxa metabólica da atividade.',
  },
  {
    value: 'biologico',
    label: 'Biológico',
    norma: 'NR-15, Anexo 14',
    descricao: 'Avaliação exclusivamente qualitativa, exigindo contato permanente com os agentes listados.',
  },
  {
    value: 'periculosidade',
    label: 'Periculosidade',
    norma: 'NR-16, Anexos 1 a 5',
    descricao: 'Caracterização por exposição a inflamáveis, explosivos, energia elétrica, radiações ou segurança pessoal.',
  },
]

export const POSICIONAMENTOS: {
  value: PosicionamentoManifestacao
  item: string
  label: string
  descricao: string
}[] = [
  {
    value: 'concordancia',
    item: '18.1',
    label: 'Concordância com o laudo',
    descricao: 'Texto padrão pronto — ratifica as conclusões do perito judicial.',
  },
  {
    value: 'impugnacao_laudo',
    item: '18.2',
    label: 'Impugnação ao laudo',
    descricao: 'Modelos prontos e editáveis apontando vícios técnicos e metodológicos.',
  },
  {
    value: 'impugnacao_esclarecimento',
    item: '18.3',
    label: 'Impugnação ao esclarecimento',
    descricao: 'Continuação da impugnação — rebate os esclarecimentos prestados pelo perito.',
  },
]

// ---------- Fundamentação por agente ----------
const FUNDAMENTACAO: Record<AgenteManifestacao, string> = {
  ruido:
    'A avaliação da exposição ocupacional ao ruído contínuo ou intermitente rege-se pelo Anexo 1 da NR-15, aprovada pela Portaria MTb nº 3.214/78, com metodologia detalhada na Norma de Higiene Ocupacional NHO-01 da FUNDACENTRO, adotando-se circuito de compensação "A", resposta lenta (slow), critério de referência de 85 dB(A) para 8 horas e incremento de duplicação de dose q=5.',
  calor:
    'A avaliação da exposição ocupacional ao calor rege-se pelo Anexo 3 da NR-15, com redação dada pela Portaria SEPRT nº 1.359/2019, que adota o Índice de Bulbo Úmido Termômetro de Globo (IBUTG) confrontado com a taxa metabólica (M) da atividade, observada a metodologia da NHO-06 da FUNDACENTRO.',
  biologico:
    'A avaliação da exposição a agentes biológicos rege-se pelo Anexo 14 da NR-15, de natureza exclusivamente qualitativa, exigindo o contato permanente com os agentes e nas atividades taxativamente descritas, não bastando o contato eventual ou a mera possibilidade teórica de exposição.',
  periculosidade:
    'A caracterização da periculosidade rege-se pela NR-16, aprovada pela Portaria MTb nº 3.214/78, e pelo art. 193 da CLT, exigindo a exposição permanente ou intermitente a inflamáveis, explosivos, energia elétrica, radiações ionizantes ou atividades de segurança pessoal ou patrimonial, nos termos dos respectivos anexos.',
}

// ---------- Blocos de crítica técnica por agente (18.2) ----------
const CRITICAS: Record<AgenteManifestacao, { titulo: string; conteudo: string }[]> = {
  ruido: [
    {
      titulo: 'Ausência de identificação do instrumento e do certificado de calibração',
      conteudo:
        'O laudo pericial não identifica o instrumento de medição utilizado, tampouco apresenta o respectivo certificado de calibração vigente emitido por laboratório da RBC/INMETRO. A NHO-01 da FUNDACENTRO condiciona a validade da avaliação à rastreabilidade metrológica do equipamento, de modo que a medição, sem tal comprovação, não possui valor técnico para fins de confronto com o limite de tolerância.',
    },
    {
      titulo: 'Tempo de amostragem insuficiente e não representativo da jornada',
      conteudo:
        'A amostragem realizada não abrangeu período representativo da jornada efetivamente cumprida, deixando de contemplar os ciclos de maior emissão sonora. A NHO-01 exige que a avaliação represente toda a jornada ou, alternativamente, que sejam avaliados todos os grupos homogêneos de exposição com posterior extrapolação fundamentada, o que não se verificou no trabalho pericial.',
    },
    {
      titulo: 'Ausência de aplicação do incremento de duplicação de dose q=5',
      conteudo:
        'Não há demonstração de que o cálculo da dose diária de exposição observou o incremento de duplicação q=5, previsto no Anexo 1 da NR-15, distinto do q=3 adotado pela NHO-01 para fins prevencionistas. A troca de critério altera substancialmente o resultado e compromete a conclusão apresentada.',
    },
    {
      titulo: 'Atenuação de EPI adotada sem comprovação de eficácia real',
      conteudo:
        'O laudo considerou neutralizada a exposição pelo simples fornecimento de protetor auricular, sem apurar o NRRsf do modelo, o Certificado de Aprovação vigente, a efetiva entrega ao longo de todo o período, o treinamento quanto ao uso, a higienização e a fiscalização do uso ininterrupto. Nos termos da Súmula 80 e da Súmula 289 do TST, a mera entrega do equipamento não elide o adicional.',
    },
    {
      titulo: 'Desconsideração do ruído de impacto (Anexo 2 da NR-15)',
      conteudo:
        'O trabalho pericial não avaliou a existência de ruído de impacto, cuja aferição deve ocorrer em circuito de resposta rápida (fast) e compensação linear, com limite de 130 dB(linear), conforme o Anexo 2 da NR-15. A omissão impede conclusão segura sobre a integralidade da exposição sonora.',
    },
  ],
  calor: [
    {
      titulo: 'Medição realizada em condições não representativas',
      conteudo:
        'A avaliação do IBUTG foi realizada em data, horário e condições climáticas que não representam a situação mais crítica de exposição. O Anexo 3 da NR-15 e a NHO-06 exigem que a avaliação contemple a condição mais desfavorável verificável na rotina de trabalho, sob pena de subestimação da sobrecarga térmica.',
    },
    {
      titulo: 'Taxa metabólica atribuída de forma incorreta à atividade',
      conteudo:
        'A taxa metabólica (M) adotada não corresponde às atividades efetivamente desempenhadas, tendo sido enquadrada em faixa inferior à real. Considerando que o limite de tolerância do Anexo 3 é função direta da taxa metabólica, o equívoco no enquadramento conduz a limite de tolerância artificialmente elevado e, por consequência, a conclusão negativa indevida.',
    },
    {
      titulo: 'Ausência de avaliação do ciclo trabalho-descanso',
      conteudo:
        'O laudo não apresenta a média ponderada no tempo do IBUTG e da taxa metabólica ao longo do ciclo de trabalho e descanso, exigida pelo item 3 do Anexo 3 da NR-15 quando há alternância de situações térmicas, o que compromete a validade do resultado apresentado.',
    },
    {
      titulo: 'Não comprovação das pausas para recuperação térmica',
      conteudo:
        'A conclusão pela descaracterização apoia-se em pausas para recuperação térmica que não foram comprovadas documentalmente, tampouco confirmadas na inspeção. Cabia à Reclamada demonstrar a efetiva concessão e a adequação das pausas ao regime previsto na norma.',
    },
    {
      titulo: 'Desconsideração da exposição a fonte de calor radiante',
      conteudo:
        'Não foi considerada a parcela de calor radiante proveniente das fontes existentes no ambiente, aferida pela temperatura de globo, elemento essencial à composição do IBUTG em ambientes internos ou externos com carga solar.',
    },
  ],
  biologico: [
    {
      titulo: 'Confusão entre contato eventual e contato permanente',
      conteudo:
        'O laudo descaracteriza a insalubridade sob o argumento de que o contato seria eventual, sem, contudo, demonstrar a frequência real das atividades. O Anexo 14 da NR-15 exige contato permanente, assim entendido aquele inerente e indissociável da rotina de trabalho, ainda que não ocupe a integralidade da jornada, conforme reiterada jurisprudência.',
    },
    {
      titulo: 'Enquadramento restritivo das atividades descritas no Anexo 14',
      conteudo:
        'A conclusão pericial adota interpretação restritiva do Anexo 14, deixando de considerar que as atividades desempenhadas se equiparam materialmente às hipóteses ali descritas, tanto quanto à natureza do agente quanto quanto à forma de contato verificada na inspeção.',
    },
    {
      titulo: 'Ausência de análise do PGR e do PCMSO quanto ao risco biológico',
      conteudo:
        'O trabalho pericial não analisou o Programa de Gerenciamento de Riscos e o PCMSO da Reclamada, documentos nos quais o próprio empregador reconhece a existência do risco biológico e prescreve medidas de controle específicas — reconhecimento que se mostra incompatível com a conclusão pela inexistência de exposição.',
    },
    {
      titulo: 'Neutralização por EPI em agente biológico sem respaldo técnico',
      conteudo:
        'Afirma-se a neutralização do agente biológico pelo uso de EPI sem qualquer demonstração de eficácia. Em se tratando de agente biológico, a proteção individual reduz a probabilidade de contato, mas não elimina o risco, sendo tecnicamente inadequado afirmar a neutralização integral da exposição.',
    },
    {
      titulo: 'Ausência de vistoria no local efetivo de trabalho',
      conteudo:
        'A conclusão foi construída a partir de local diverso daquele em que o Reclamante efetivamente laborava, ou com base exclusivamente em documentos, sem inspeção presencial capaz de aferir as reais condições de contato com os agentes biológicos.',
    },
  ],
  periculosidade: [
    {
      titulo: 'Delimitação incorreta da área de risco',
      conteudo:
        'O laudo delimitou a área de risco em desacordo com o Anexo 2 da NR-16, deixando de considerar os raios e as faixas de projeção horizontal previstos na norma para os equipamentos e volumes efetivamente existentes no local, o que resultou em exclusão indevida do posto de trabalho do Reclamante.',
    },
    {
      titulo: 'Desconsideração da exposição intermitente',
      conteudo:
        'Adotou-se, indevidamente, a premissa de que a exposição deveria ser permanente e contínua. A Súmula 364, I, do TST e o art. 193 da CLT asseguram o adicional na exposição intermitente, sendo indevida sua exclusão quando o ingresso em área de risco é habitual, ainda que por tempo reduzido.',
    },
    {
      titulo: 'Ausência de apuração do volume de inflamáveis armazenado',
      conteudo:
        'Não foram apurados os volumes efetivamente armazenados de líquidos inflamáveis e gases liquefeitos, dado indispensável ao enquadramento nos quadros do Anexo 2 da NR-16 e à correta definição da área de risco.',
    },
    {
      titulo: 'Enquadramento equivocado quanto ao Sistema Elétrico de Potência',
      conteudo:
        'A análise da exposição a energia elétrica não observou o Anexo 4 da NR-16 e o Decreto nº 93.412/86, deixando de considerar que as atividades eram executadas em proximidade ou sobre instalações integrantes do Sistema Elétrico de Potência, energizadas ou com possibilidade de energização acidental.',
    },
    {
      titulo: 'Abastecimento de veículos analisado sem observância da OJ 385 do TST',
      conteudo:
        'O laudo desconsiderou que o abastecimento de veículos realizado pelo próprio empregado, em bomba situada no interior do estabelecimento, caracteriza permanência em área de risco, nos termos do Anexo 2, item 3, "s", da NR-16 e da Orientação Jurisprudencial 385 da SDI-1 do TST.',
    },
  ],
}

// ---------- Blocos de continuação para a impugnação ao esclarecimento (18.3) ----------
const CRITICAS_ESCLARECIMENTO: { titulo: string; conteudo: string }[] = [
  {
    titulo: 'Esclarecimentos que não enfrentam os pontos impugnados',
    conteudo:
      'Os esclarecimentos prestados limitam-se a reiterar as conclusões já lançadas no laudo, sem enfrentar objetivamente os pontos técnicos suscitados na impugnação anteriormente protocolada. A manifestação, portanto, não supre as omissões apontadas, permanecendo íntegras as razões da impugnação.',
  },
  {
    titulo: 'Persistência da ausência de fundamentação metodológica',
    conteudo:
      'Mesmo após instado, o Sr. Perito não apresentou a memória de cálculo, os certificados de calibração e a descrição da metodologia empregada, elementos sem os quais não é possível submeter o trabalho técnico ao contraditório efetivo, nos termos do art. 473 do CPC.',
  },
  {
    titulo: 'Inovação de fundamento nos esclarecimentos',
    conteudo:
      'Nos esclarecimentos, o Sr. Perito apresenta fundamento diverso daquele constante do laudo original, o que evidencia a fragilidade da conclusão inicial e reabre a necessidade de contraditório específico sobre a nova motivação apresentada.',
  },
  {
    titulo: 'Ausência de resposta a quesitos complementares',
    conteudo:
      'Permanecem sem resposta os quesitos complementares oportunamente formulados, cuja elucidação é essencial ao deslinde da controvérsia técnica, razão pela qual se requer a intimação do Sr. Perito para respondê-los de forma individualizada e fundamentada.',
  },
  {
    titulo: 'Requerimento de nova diligência ou substituição do perito',
    conteudo:
      'Diante da persistência dos vícios apontados, requer-se a realização de nova diligência pericial, com prévia intimação dos assistentes técnicos, ou, subsidiariamente, a nomeação de novo perito, nos termos do art. 468, II, do CPC.',
  },
]

// ---------- Blocos padrão de concordância (18.1) ----------
const CONCORDANCIA: { titulo: string; conteudo: string }[] = [
  {
    titulo: 'Ratificação integral das conclusões periciais',
    conteudo:
      'O Assistente Técnico signatário, após analisar detidamente o laudo pericial acostado aos autos, manifesta sua CONCORDÂNCIA INTEGRAL com as conclusões apresentadas pelo Sr. Perito Judicial, por entendê-las tecnicamente corretas e alinhadas às normas regulamentadoras aplicáveis à espécie.',
  },
  {
    titulo: 'Adequação da metodologia empregada',
    conteudo:
      'A metodologia adotada mostra-se adequada e conforme as normas de higiene ocupacional aplicáveis, tendo o trabalho pericial observado os critérios de amostragem, os instrumentos de medição e os parâmetros normativos exigidos para a hipótese, o que confere confiabilidade ao resultado apurado.',
  },
  {
    titulo: 'Correção do enquadramento normativo',
    conteudo:
      'O enquadramento normativo realizado pelo Sr. Perito Judicial mostra-se correto, tendo sido corretamente identificados o anexo aplicável, o critério de avaliação (qualitativo ou quantitativo) e o grau apurado, em consonância com a Portaria MTb nº 3.214/78 e alterações posteriores.',
  },
  {
    titulo: 'Suficiência da instrução técnica',
    conteudo:
      'A vistoria realizada e os documentos analisados são suficientes à formação do convencimento técnico, tendo o trabalho pericial abordado todos os pontos controvertidos submetidos à apreciação, com respostas claras aos quesitos formulados pelas partes e por este Juízo.',
  },
  {
    titulo: 'Requerimento final de homologação',
    conteudo:
      'Ante o exposto, requer o Assistente Técnico seja o laudo pericial integralmente acolhido e homologado por V. Exa., por refletir com fidelidade as condições ambientais de trabalho constatadas e por observar rigorosamente a legislação de regência.',
  },
]

let bid = 0
const bloco = (
  titulo: string,
  conteudo: string,
  selecionado: boolean,
): BlocoTexto => {
  bid += 1
  return { id: `blc-${bid}`, titulo, conteudo, selecionado, editavel: true }
}

/**
 * Monta automaticamente o modelo de manifestação a partir do agente
 * e do posicionamento selecionados. É esta função que o Módulo L
 * chama quando o usuário clica em "Montar documento".
 */
export function montarModelo(
  agente: AgenteManifestacao,
  posicionamento: PosicionamentoManifestacao,
): ModeloManifestacao {
  const agenteLabel = AGENTES_MANIFESTACAO.find((a) => a.value === agente)!.label


  let fonte: { titulo: string; conteudo: string }[]
  let titulo: string

  if (posicionamento === 'concordancia') {
    fonte = CONCORDANCIA
    titulo = `Manifestação ao Laudo Pericial — Concordância (${agenteLabel})`
  } else if (posicionamento === 'impugnacao_laudo') {
    fonte = CRITICAS[agente]
    titulo = `Impugnação ao Laudo Pericial — ${agenteLabel}`
  } else {
    fonte = [...CRITICAS_ESCLARECIMENTO, ...CRITICAS[agente].slice(0, 2)]
    titulo = `Impugnação aos Esclarecimentos Periciais — ${agenteLabel}`
  }

  return {
    id: `mod-${agente}-${posicionamento}`,
    agente,
    posicionamento,
    titulo,
    fundamentacao: FUNDAMENTACAO[agente],
    // Na concordância todos os blocos já vêm marcados (texto padrão pronto).
    blocos: fonte.map((b) => bloco(b.titulo, b.conteudo, posicionamento === 'concordancia')),
  }
}

export const ENCERRAMENTO_PADRAO: Record<PosicionamentoManifestacao, string> = {
  concordancia:
    'Nestes termos, pede deferimento.',
  impugnacao_laudo:
    'Ante todo o exposto, requer o Assistente Técnico seja acolhida a presente IMPUGNAÇÃO, determinando-se ao Sr. Perito Judicial a prestação de esclarecimentos quanto aos pontos suscitados e, se necessário, a realização de nova diligência, nos termos do art. 477, §2º, do CPC.',
  impugnacao_esclarecimento:
    'Ante todo o exposto, requer o Assistente Técnico seja acolhida a presente IMPUGNAÇÃO AOS ESCLARECIMENTOS, mantendo-se integralmente as razões da impugnação anterior, com a consequente desconsideração das conclusões periciais quanto ao ponto controvertido.',
}
