import type { OrigemQuesito, TemaQuesito } from '@prisma/client'

// ============================================================
// Banco de quesitos pré-cadastrados (Módulo K — item 17).
//
// Depois do primeiro seed o banco passa a ser a fonte de verdade:
// o perito favorita, edita respostas e cadastra os próprios. Este
// arquivo só reconstrói a base inicial.
// ============================================================

export interface QuesitoBase {
  codigo: string
  tema: TemaQuesito
  origem: OrigemQuesito
  pergunta: string
  respostaPadrao: string
}

let seq = 0
const q = (
  tema: TemaQuesito,
  origem: OrigemQuesito,
  pergunta: string,
  respostaPadrao = '',
): QuesitoBase => {
  seq += 1
  return {
    codigo: `${tema.slice(0, 3).toUpperCase()}-${String(seq).padStart(3, '0')}`,
    tema,
    origem,
    pergunta,
    respostaPadrao,
  }
}

export const QUESITOS_BASE: QuesitoBase[] = [
  // ---------------- GERAIS / JUÍZO ----------------
  q('gerais', 'juizo', 'Queira o Sr. Perito informar a função exercida pelo Reclamante, descrevendo detalhadamente as atividades efetivamente desempenhadas.',
    'O Reclamante exerceu a função de {{funcao}}, no período de {{admissao}} a {{demissao}}, desenvolvendo as atividades descritas no item "Atividades e Funções Exercidas" do presente documento.'),
  q('gerais', 'juizo', 'Queira o Sr. Perito descrever o local de trabalho do Reclamante, informando suas dimensões, ventilação, iluminação e demais características ambientais.',
    'O ambiente de trabalho foi descrito no item "Descrição do Ambiente de Trabalho", conforme constatado na vistoria realizada em {{dataVistoria}}.'),
  q('gerais', 'juizo', 'Informe o Sr. Perito quais agentes nocivos o Reclamante esteve exposto durante o pacto laboral, indicando a natureza (física, química ou biológica).',
    'Os agentes identificados encontram-se relacionados no quadro de "Agentes e Riscos Avaliados", com a respectiva classificação quanto à natureza e ao enquadramento na NR-15.'),
  q('gerais', 'juizo', 'Esclareça o Sr. Perito se a exposição aos agentes nocivos se dava de forma habitual e permanente, intermitente ou eventual.',
    'A exposição verificada ocorria de forma {{habitualidade}}, considerando a jornada e a rotina de trabalho apuradas na vistoria e confirmadas pelas partes.'),
  q('gerais', 'juizo', 'Queira o Sr. Perito informar a data, o horário e os participantes da vistoria realizada.',
    'A vistoria foi realizada em {{dataVistoria}}, às {{horaVistoria}}, no endereço {{localVistoria}}, com a presença dos participantes relacionados no preâmbulo do documento.'),
  q('gerais', 'juizo', 'Informe o Sr. Perito se houve alteração no ambiente ou nos processos produtivos entre o período laborado e a data da vistoria (perícia por similaridade).',
    'Conforme apurado, {{alteracaoAmbiente}}. Quando constatada alteração relevante, a avaliação foi realizada por paradigma/similaridade, com base em declarações das partes e documentos apresentados.'),

  // ---------------- INSALUBRIDADE ----------------
  q('insalubridade', 'juizo', 'Diga o Sr. Perito se as atividades desenvolvidas pelo Reclamante são consideradas insalubres nos termos da NR-15 da Portaria MTb nº 3.214/78.',
    'Sim/Não. Com base nos elementos técnicos apurados, as atividades {{caracterizacao}} enquadramento no Anexo {{anexo}} da NR-15, aprovada pela Portaria MTb nº 3.214/78.'),
  q('insalubridade', 'juizo', 'Em caso positivo, informe o Sr. Perito o grau de insalubridade apurado (mínimo — 10%, médio — 20% ou máximo — 40%) e o respectivo anexo da NR-15.',
    'Apurou-se insalubridade em grau {{grau}}, com fundamento no Anexo {{anexo}} da NR-15, correspondente ao percentual de {{percentual}} sobre a base de cálculo a ser fixada por V. Exa.'),
  q('insalubridade', 'juizo', 'Esclareça o Sr. Perito se a caracterização decorre de avaliação quantitativa (com medição) ou qualitativa (inspeção no local de trabalho).',
    'A caracterização decorre de avaliação {{criterio}}. Nos casos de critério qualitativo, a NR-15 dispensa a quantificação, bastando a constatação da atividade descrita no anexo correspondente.'),
  q('insalubridade', 'reclamada', 'Informe o Sr. Perito se a Reclamada fornecia Equipamentos de Proteção Individual (EPI) adequados ao risco, com Certificado de Aprovação (CA) válido.',
    'Conforme documentação apresentada ({{documentos}}), {{fornecimentoEpi}}. Registra-se que o simples fornecimento não elide a insalubridade, sendo necessária a comprovação de entrega, treinamento, higienização, substituição periódica e efetiva fiscalização do uso, nos termos da Súmula 289 do TST.'),
  q('insalubridade', 'reclamada', 'Diga o Sr. Perito se o EPI fornecido era eficaz para neutralizar ou eliminar a nocividade do agente, nos termos da Súmula 80 do TST.',
    'Tecnicamente, {{eficaciaEpi}}. A eficácia depende da adequação do EPI ao agente específico, do uso ininterrupto durante toda a exposição e da manutenção de suas condições de conservação.'),
  q('insalubridade', 'reclamante', 'Informe o Sr. Perito se havia fornecimento de vestiário, local para higienização e troca de uniformes contaminados.',
    'Constatou-se {{condicaoHigienizacao}}, conforme verificado na vistoria e registrado no relatório fotográfico.'),
  q('insalubridade', 'juizo', 'Queira o Sr. Perito informar a base de cálculo técnica utilizada e o período de exposição a ser considerado.',
    'A base de cálculo é matéria de direito, a ser fixada por V. Exa. Tecnicamente, o período de exposição corresponde a {{periodoExposicao}}.'),

  // ---------------- RUÍDO ----------------
  q('ruido', 'juizo', 'Informe o Sr. Perito o nível de ruído a que estava exposto o Reclamante e a metodologia de medição utilizada.',
    'A avaliação foi realizada com {{instrumento}}, calibrado conforme certificado nº {{certificado}}, utilizando circuito de compensação "A", resposta lenta (slow), critério de referência 85 dB(A), nível limiar 80 dB(A) e incremento de duplicação q=5, nos termos do Anexo 1 da NR-15 e da NHO-01 da FUNDACENTRO.'),
  q('ruido', 'juizo', 'Diga o Sr. Perito se o nível de ruído apurado ultrapassa o limite de tolerância previsto no Anexo 1 da NR-15 para a jornada praticada.',
    'O nível equivalente apurado foi de {{nivelApurado}} dB(A) para jornada de {{jornada}} horas, sendo o limite de tolerância de {{limite}} dB(A). Portanto, {{conclusaoRuido}}.'),
  q('ruido', 'reclamada', 'Informe o Sr. Perito se o protetor auricular fornecido possuía atenuação (NRRsf) suficiente para reduzir a exposição a níveis inferiores ao limite de tolerância.',
    'O protetor {{modeloProtetor}} (CA {{ca}}) possui NRRsf de {{nrrsf}} dB. Aplicada a atenuação ao nível apurado, obtém-se exposição de {{nivelAtenuado}} dB(A), de modo que o EPI {{eficaciaProtetor}}.'),
  q('ruido', 'juizo', 'Esclareça o Sr. Perito se havia ruído de impacto no ambiente, nos termos do Anexo 2 da NR-15.',
    'Quanto ao ruído de impacto, {{ruidoImpacto}}, avaliado em circuito de resposta rápida (fast) e compensação linear, com limite de 130 dB(linear).'),

  // ---------------- CALOR ----------------
  q('calor', 'juizo', 'Informe o Sr. Perito se o Reclamante estava exposto a calor excessivo nos termos do Anexo 3 da NR-15.',
    'A avaliação de sobrecarga térmica foi realizada pelo Índice de Bulbo Úmido Termômetro de Globo (IBUTG), conforme Anexo 3 da NR-15 (redação da Portaria SEPRT nº 1.359/2019) e NHO-06 da FUNDACENTRO.'),
  q('calor', 'juizo', 'Queira o Sr. Perito informar o valor de IBUTG apurado, a taxa metabólica da atividade e o limite de tolerância aplicável.',
    'Apurou-se IBUTG de {{ibutg}} °C, com taxa metabólica (M) de {{taxaMetabolica}} W para a atividade de {{atividade}}, resultando em limite de tolerância de {{ltCalor}} °C. Logo, {{conclusaoCalor}}.'),
  q('calor', 'reclamada', 'Informe o Sr. Perito se eram concedidas pausas para recuperação térmica e se havia fornecimento de água potável e local para descanso.',
    'Constatou-se {{pausasTermicas}}, bem como {{aguaPotavel}}, conforme verificado na vistoria.'),

  // ---------------- AGENTES QUÍMICOS ----------------
  q('quimicos', 'juizo', 'Informe o Sr. Perito quais produtos químicos eram manipulados pelo Reclamante, com os respectivos números CAS.',
    'Foram identificados os produtos relacionados no quadro de agentes químicos, com base nas FDS/FISPQ apresentadas pela Reclamada, contendo denominação, número CAS e composição.'),
  q('quimicos', 'juizo', 'Diga o Sr. Perito se os agentes químicos identificados possuem Limite de Tolerância fixado no Anexo 11 da NR-15.',
    'Conforme quadro comparativo, {{agentesComLt}} possuem Limite de Tolerância no Anexo 11 da NR-15, enquanto {{agentesSemLt}} não possuem LT específico, sujeitando-se à análise qualitativa do Anexo 13.'),
  q('quimicos', 'juizo', 'Esclareça o Sr. Perito se houve realização de avaliação quantitativa das concentrações ambientais dos agentes químicos.',
    'Não foram realizadas medições das concentrações ambientais, inexistindo elementos técnicos que permitam comparar a exposição ocupacional aos Limites de Tolerância da NR-15. Resta, portanto, prejudicada qualquer conclusão fundada em critério quantitativo, permanecendo a análise no critério qualitativo do Anexo 13.'),
  q('quimicos', 'juizo', 'Informe o Sr. Perito se algum dos agentes identificados consta da LINACH — Lista Nacional de Agentes Cancerígenos para Humanos.',
    'Realizado o cruzamento com a LINACH (Portaria Interministerial MTE/MS/MPS nº 9/2014), verificou-se {{resultadoLinach}}. O enquadramento no Grupo 1 repercute no art. 68, §4º, do Decreto nº 3.048/99, quanto à aposentadoria especial.'),
  q('quimicos', 'reclamada', 'Informe o Sr. Perito se as FDS/FISPQ dos produtos foram apresentadas e se indicam a presença de benzeno como contaminante.',
    'As FDS/FISPQ {{fispqApresentadas}}. Quanto ao benzeno, {{presencaBenzeno}}, sendo que sua presença atrai a análise específica do Anexo 13-A da NR-15 e da legislação complementar.'),

  // ---------------- BIOLÓGICOS ----------------
  q('biologicos', 'juizo', 'Diga o Sr. Perito se o Reclamante estava exposto a agentes biológicos nos termos do Anexo 14 da NR-15.',
    'A avaliação de agentes biológicos é exclusivamente qualitativa, nos termos do Anexo 14 da NR-15, sendo relevante a natureza da atividade e o contato efetivo com os agentes ali relacionados.'),
  q('biologicos', 'juizo', 'Informe o Sr. Perito se as atividades envolviam contato permanente com pacientes, material infectocontagiante, lixo urbano ou esgoto.',
    'Constatou-se que {{contatoBiologico}}. O Anexo 14 exige contato permanente com os agentes descritos, não bastando o contato eventual ou a mera possibilidade de exposição.'),
  q('biologicos', 'reclamada', 'Informe o Sr. Perito se havia PGR/PCMSO contemplando o risco biológico e as respectivas medidas de controle.',
    'A documentação apresentada ({{documentosBio}}) {{contemplaRiscoBio}} o risco biológico, com as medidas de controle ali descritas.'),

  // ---------------- PERICULOSIDADE ----------------
  q('periculosidade', 'juizo', 'Diga o Sr. Perito se as atividades do Reclamante são consideradas perigosas nos termos da NR-16 da Portaria MTb nº 3.214/78.',
    'Com base nos elementos apurados, as atividades {{caracterizacaoPericulosidade}} enquadramento no Anexo {{anexoNr16}} da NR-16.'),
  q('periculosidade', 'juizo', 'Informe o Sr. Perito se o Reclamante adentrava área de risco com inflamáveis, explosivos, energia elétrica ou radiações ionizantes.',
    'Constatou-se {{areaRisco}}, considerando o mapa de risco e as distâncias previstas no Anexo correspondente da NR-16.'),
  q('periculosidade', 'juizo', 'Esclareça o Sr. Perito se o abastecimento de veículos era realizado pelo Reclamante e com qual frequência.',
    'O abastecimento {{abastecimento}}. Nos termos da OJ 385 da SDI-1 do TST e da NR-16, Anexo 2, item 3, "s", considera-se a permanência em área de risco e a habitualidade da exposição.'),
  q('periculosidade', 'juizo', 'Informe o Sr. Perito se as atividades envolviam o sistema elétrico de potência, nos termos do Anexo 4 da NR-16.',
    'Verificou-se que {{sistemaEletrico}}, considerando o Decreto nº 93.412/86 e o Anexo 4 da NR-16, que exige exposição a instalações ou equipamentos energizados do SEP.'),

  // ---------------- EPI ----------------
  q('epi', 'reclamada', 'Informe o Sr. Perito se há fichas de entrega de EPI assinadas pelo Reclamante durante todo o período laborado.',
    'Foram apresentadas fichas de entrega de EPI referentes ao período de {{periodoFichas}}, {{cobrePeriodoIntegral}} o pacto laboral.'),
  q('epi', 'reclamada', 'Diga o Sr. Perito se havia treinamento documentado quanto ao uso correto, guarda e conservação dos EPIs.',
    'Quanto ao treinamento, {{treinamentoEpi}}, nos termos do item 6.6.1 da NR-06.'),
  q('epi', 'reclamante', 'Informe o Sr. Perito se a periodicidade de substituição dos EPIs era compatível com a vida útil dos equipamentos.',
    'A periodicidade de substituição {{periodicidadeEpi}}, considerando a vida útil indicada pelo fabricante e as condições de uso verificadas.'),

  // ---------------- ERGONOMIA ----------------
  q('ergonomia', 'juizo', 'Informe o Sr. Perito se o posto de trabalho atendia aos requisitos da NR-17 quanto a mobiliário, postura e levantamento de cargas.',
    'A análise ergonômica do posto verificou {{analiseErgonomica}}, à luz da NR-17 e da Análise Ergonômica Preliminar/AET apresentada.'),
  q('ergonomia', 'juizo', 'Esclareça o Sr. Perito que os aspectos ergonômicos não geram, por si sós, direito ao adicional de insalubridade.',
    'Registra-se que a NR-17 não integra o rol de anexos da NR-15, de modo que as inadequações ergonômicas, embora relevantes para a saúde do trabalhador, não caracterizam insalubridade para fins de adicional.'),

  // ---------------- ELETRICIDADE / INFLAMÁVEIS ----------------
  q('eletricidade', 'juizo', 'Informe o Sr. Perito se o Reclamante realizava intervenções em instalações elétricas energizadas acima de 50V em corrente alternada.',
    'Constatou-se que {{intervencaoEletrica}}, observando-se os requisitos da NR-10 e o enquadramento do Anexo 4 da NR-16.'),
  q('inflamaveis', 'juizo', 'Informe o Sr. Perito a quantidade de líquido inflamável armazenada no local e se ultrapassa os limites do Anexo 2 da NR-16.',
    'Foi identificado armazenamento de {{quantidadeInflamavel}}, sendo que o Anexo 2 da NR-16 considera a área de risco a partir de {{limiteInflamavel}}.'),
]
