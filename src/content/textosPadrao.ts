import type { Empresa, ModalidadePericia, Pericia, Usuario } from '@/types'

/**
 * Textos que são iguais em toda perícia.
 *
 * A estrutura de 14 itens do parecer só precisa do perito naquilo que é
 * do caso concreto — o ambiente, os agentes, a conclusão. O resto
 * (qualificação, objeto, critérios normativos, metodologia,
 * encerramento) é a mesma coisa em todos os laudos, e o perito não deve
 * ter de redigir de novo a cada processo.
 *
 * Estes textos reproduzem a matriz revisada no Parecer Jhonathan Victor.
 * Peritos e assistentes recebem sempre a versão oficial; somente o
 * administrador pode deliberadamente personalizá-la.
 */
export const CAMPOS_COM_TEXTO_PADRAO = [
  'apresentacao',
  'objetivoPericia',
  'normasReferencias',
  'equipamentosAnalisados',
  'criterioAvaliacaoPericulosidade',
  'notaTecnicaEpis',
  'protecoesColetivas',
  'encerramento',
] as const

export type CampoComTextoPadrao = (typeof CAMPOS_COM_TEXTO_PADRAO)[number]

/** Junta parágrafos descartando os que ficaram vazios. */
function paragrafos(...partes: (string | false | undefined)[]): string {
  return partes.filter((parte): parte is string => Boolean(parte)).join('\n\n')
}

function qualificacao(perito?: Usuario | null): string {
  const nome = perito?.nome?.trim()
  if (!nome) return 'O profissional responsável'

  const credenciais = [perito?.titulo?.trim(), perito?.registroProfissional?.trim()].filter(Boolean)
  return credenciais.length ? `${nome}, ${credenciais.join(', ')}` : nome
}

function apresentacao(_pericia: Pericia, perito?: Usuario | null, _reclamada?: Empresa): string {
  return `${qualificacao(perito)}, qualificado nos autos como Assistente Técnico da Reclamada, vem, respeitosamente, apresentar o presente PARECER TÉCNICO, elaborado com base na diligência realizada, nas condições efetivamente constatadas e na documentação analisada, à luz das Normas Regulamentadoras aplicáveis, apresentando suas conclusões técnicas de forma objetiva e fundamentada.`
}

function objetoPorModalidade(modalidade: ModalidadePericia): string {
  const insalubridade = 'Avaliar, sob o ponto de vista técnico, a caracterização ou não de insalubridade, nos termos da NR-15, e, quando caracterizada, indicar o respectivo grau: mínimo, médio ou máximo.'
  const periculosidade = 'Avaliar, sob o ponto de vista técnico, a caracterização ou não de periculosidade, nos termos da NR-16, e, quando caracterizada, indicar o respectivo percentual.'

  if (modalidade === 'insalubridade') return insalubridade
  if (modalidade === 'periculosidade') return periculosidade
  return `${insalubridade}\n\n${periculosidade}`
}

export function objetivoPadraoDaPericia(pericia: Pick<Pericia, 'modalidade'>): string {
  return objetoPorModalidade(pericia.modalidade)
}

/**
 * Base normativa. Varia com a modalidade porque citar a NR-16 num laudo
 * exclusivamente de insalubridade — e vice-versa — só dá margem a
 * impugnação.
 */
function normasReferencias(pericia: Pericia): string {
  return paragrafos(
    'A análise técnica será realizada com fundamento na legislação trabalhista vigente, especialmente na Lei nº 6.514/1977, na Portaria nº 3.214/1978 e respectivas Normas Regulamentadoras, considerando-se as atividades efetivamente desempenhadas, as condições reais de trabalho, o ambiente laboral e o conjunto dos elementos técnicos e documentais disponíveis.',
    'Na análise deverão prevalecer as condições efetivamente verificadas no ambiente de trabalho e a realidade das atividades desempenhadas, em observância ao princípio da primazia da realidade, não sendo suficiente a mera descrição de atividade, a possibilidade de contato ou a existência de determinado agente ou condição de risco para caracterizar, por si só, insalubridade ou periculosidade.',
    pericia.modalidade !== 'periculosidade' && '4.1. INSALUBRIDADE – NR-15',
    pericia.modalidade !== 'periculosidade' && 'A caracterização da insalubridade deverá observar os critérios estabelecidos na NR-15 e respectivos Anexos, identificando-se previamente o agente e o critério específico de avaliação aplicável. Conforme o Anexo correspondente, a avaliação poderá ser quantitativa ou qualitativa, não sendo tecnicamente adequado atribuir a todos os agentes o mesmo critério de caracterização.',
    pericia.modalidade !== 'periculosidade' && 'Serão considerados, quando pertinentes:\n• natureza e fonte do agente;\n• atividade efetivamente realizada;\n• forma de exposição;\n• frequência e duração;\n• periodicidade e habitualidade;\n• condições reais do ambiente de trabalho;\n• medidas de controle existentes;\n• critério específico estabelecido no respectivo Anexo da NR-15.',
    pericia.modalidade !== 'periculosidade' && 'A simples existência de agente potencialmente nocivo no ambiente, bem como a possibilidade abstrata ou eventual de contato, não se confunde com efetiva exposição ocupacional.',
    pericia.modalidade !== 'periculosidade' && '4.1.1. Critérios Quantitativos',
    pericia.modalidade !== 'periculosidade' && 'Quando previsto no respectivo Anexo, a caracterização dependerá da avaliação dos níveis ou concentrações do agente, mediante metodologia e parâmetros aplicáveis. Entre os agentes sujeitos a critérios quantitativos, conforme o Anexo aplicável, encontram-se: ruído contínuo ou intermitente; ruído de impacto; calor; vibração; agentes químicos; poeiras minerais; e radiações ionizantes, estas conforme o Anexo 5 da NR-15 e os critérios específicos nele estabelecidos.',
    pericia.modalidade !== 'periculosidade' && '4.1.2. Critérios Qualitativos',
    pericia.modalidade !== 'periculosidade' && 'Quando estabelecido critério qualitativo pelo respectivo Anexo, a análise deverá considerar a atividade efetivamente realizada, as condições de exposição e o correspondente enquadramento normativo. Podem compreender, conforme aplicável: condições hiperbáricas; radiações não ionizantes; frio; umidade; determinados agentes químicos; e agentes biológicos.',
    pericia.modalidade !== 'periculosidade' && '4.1.3. Frequência, Duração e Habitualidade',
    pericia.modalidade !== 'periculosidade' && 'A análise da exposição deverá considerar, quando pertinentes ao agente avaliado:\n• Frequência: quantidade de ocorrências da exposição em determinado período;\n• Duração: tempo efetivo de exposição em cada ocorrência;\n• Periodicidade: regularidade com que a atividade ou exposição ocorre;\n• Habitualidade: integração da atividade à rotina laboral;\n• Permanência: continuidade ou constância da exposição, conforme o critério normativo aplicável.\nPara fins de análise técnica, exposição eventual ou esporádica não deverá ser automaticamente equiparada à exposição habitual ou permanente, devendo a situação concreta ser confrontada com os critérios estabelecidos na norma específica.',
    pericia.modalidade !== 'insalubridade' && '4.2. PERICULOSIDADE – NR-16',
    pericia.modalidade !== 'insalubridade' && 'A caracterização da periculosidade deverá observar os critérios estabelecidos na NR-16 e respectivos Anexos, mediante análise da atividade ou operação efetivamente desenvolvida e do correspondente enquadramento normativo. Serão considerados, conforme aplicável: atividade efetivamente desempenhada; natureza da condição de risco; área de risco; ingresso ou permanência na área de risco; frequência e forma de exposição; condições reais de trabalho; e enquadramento específico no respectivo Anexo da NR-16.',
    pericia.modalidade !== 'insalubridade' && 'A mera proximidade, possibilidade de contato ou existência de fonte de risco no estabelecimento não constitui, isoladamente, comprovação de condição perigosa.',
    pericia.modalidade !== 'insalubridade' && '4.2.1. Anexos da NR-16',
    pericia.modalidade !== 'insalubridade' && 'Para a análise serão considerados os respectivos Anexos da NR-16 aplicáveis ao objeto da perícia, incluindo:\n• Anexo 1 – Explosivos;\n• Anexo 2 – Inflamáveis;\n• Anexo 3 – Segurança pessoal ou patrimonial;\n• Anexo 4 – Energia elétrica;\n• Anexo 5 – Motocicleta;\n• Anexo 6 – Agentes das autoridades de trânsito e\n• Anexo (*) – Radiações ionizantes ou substâncias radioativas.',
    pericia.modalidade !== 'insalubridade' && 'Nota Técnica sobre Inflamáveis e Combustíveis.\nO ponto de fulgor é um elemento de classificação da substância, mas não caracteriza, isoladamente, a periculosidade. A análise deve verificar a atividade ou operação efetivamente desempenhada, a forma de manuseio, armazenamento ou transporte, as quantidades e embalagens, o ingresso ou permanência em área de risco e o correspondente enquadramento no Anexo 2 da NR-16.\nO item 16.7 da NR-16 define como líquido combustível aquele que possui ponto de fulgor maior que 60 ºC e inferior ou igual a 93 ºC. Essa definição também não autoriza conclusão automática de caracterização ou descaracterização, que depende das condições concretas e das hipóteses normativas aplicáveis.\nNo caso de óleo diesel S10 ou S500, devem ser examinadas a Ficha com Dados de Segurança do produto efetivamente utilizado e as condições verificadas na diligência. O nome comercial ou o ponto de fulgor, isoladamente, não determinam a conclusão técnica.',
  )
}

function criterioAvaliacaoPericulosidade(): string {
  return 'A análise da periculosidade considera as atividades e operações efetivamente desenvolvidas, as condições de trabalho, o ingresso ou a permanência em áreas de risco e o correspondente enquadramento nos critérios da NR-16 e de seus Anexos. A conclusão não decorre apenas de uma classificação genérica como avaliação qualitativa.'
}

function notaTecnicaEpis(): string {
  return paragrafos(
    'Quanto aos EPIs, eventual ausência ou inconsistência nos registros formais de entrega não deve, isoladamente, conduzir à conclusão de inexistência de fornecimento, disponibilização ou utilização dos equipamentos, devendo ser considerado o conjunto probatório, inclusive os demais meios de prova admitidos em direito, nos termos do art. 369 do CPC.',
    'Nesse contexto, a identificação e o reconhecimento, pelo próprio Reclamante, dos EPIs apresentados na presença dos demais envolvidos constituem elementos objetivos e relevantes para a análise do fornecimento e da disponibilização desses equipamentos, devendo ser considerados em conjunto com os demais elementos probatórios relativos ao período contratual.',
  )
}

function protecoesColetivas(): string {
  return 'Descrição dos dispositivos e medidas de engenharia adotadas no ambiente laboral para mitigação coletiva de riscos, tais como: Placas de Sinalização; Sistemas de Ventilação e Exaustão; Sistemas de Iluminação de Emergência.'
}

function metodologia(pericia: Pericia): string {
  return paragrafos(
    'A metodologia será definida de acordo com o agente, condição de risco e objeto da perícia, compreendendo a análise das atividades efetivamente desenvolvidas, das condições ambientais, dos documentos técnicos e das evidências obtidas durante a inspeção. A avaliação poderá compreender procedimentos qualitativos e/ou quantitativos, conforme o critério estabelecido na norma aplicável.',
    pericia.modalidade !== 'periculosidade' && '5.1. METODOLOGIA – NR-15',
    pericia.modalidade !== 'periculosidade' && 'A avaliação de insalubridade compreenderá, conforme aplicável:\n• inspeção do ambiente e dos postos de trabalho;\n• identificação dos agentes e respectivas fontes geradoras;\n• análise das atividades efetivamente realizadas;\n• verificação da forma, frequência e duração da exposição;\n• definição do critério quantitativo ou qualitativo aplicável;\n• realização de medições ambientais, quando necessárias;\n• análise dos resultados obtidos;\n• verificação das medidas de controle existentes;\n• enquadramento técnico conforme a NR-15.',
    pericia.modalidade !== 'periculosidade' && '5.1.1. Avaliações Quantitativas',
    pericia.modalidade !== 'periculosidade' && 'Quando exigida avaliação quantitativa, serão utilizados instrumentos apropriados ao agente avaliado, observando-se os procedimentos técnicos pertinentes e as condições de calibração, verificação e rastreabilidade aplicáveis. As medições deverão representar, tanto quanto possível, as condições efetivamente encontradas no ambiente e no processo de trabalho, evitando-se conclusões baseadas em medições isoladas ou dissociadas das atividades efetivamente desempenhadas.',
    pericia.modalidade !== 'periculosidade' && '5.1.2. Avaliações Qualitativas',
    pericia.modalidade !== 'periculosidade' && 'Nas avaliações qualitativas serão analisados o agente, a atividade desenvolvida, a forma de exposição, as condições do ambiente e o enquadramento da situação nas hipóteses previstas no respectivo Anexo da NR-15. A mera identificação de determinado produto, agente ou condição no estabelecimento não será considerada suficiente, por si só, para demonstrar exposição ocupacional do trabalhador.',
    pericia.modalidade !== 'periculosidade' && '5.1.3. Registro Fotográfico e Evidências',
    pericia.modalidade !== 'periculosidade' && 'Quando permitido, serão realizados registros fotográficos dos postos de trabalho, máquinas, equipamentos, fontes geradoras, instalações e demais condições relevantes. As imagens terão caráter complementar e serão analisadas conjuntamente com os demais elementos técnicos e documentais.',
    '5.2. ANÁLISE DOCUMENTAL E PPP',
    'Serão considerados, conforme disponíveis: PPP; PGR; laudos ambientais; fichas de entrega de EPI; documentos relativos ao processo produtivo; e demais documentos técnicos pertinentes. A documentação será analisada em conjunto com as condições reais de trabalho, considerando-se sua coerência, período de abrangência, metodologia utilizada e compatibilidade com as atividades efetivamente desempenhadas.',
    '5.2.1. PPP – Perfil Profissiográfico Previdenciário',
    'O PPP constitui elemento documental relevante, porém não deverá ser analisado isoladamente para fins de caracterização de insalubridade ou periculosidade. Suas informações deverão ser confrontadas com os demais documentos técnicos, com a metodologia utilizada para obtenção dos dados e, quando possível, com as condições efetivamente verificadas.',
    pericia.modalidade !== 'periculosidade' && '5.2.2. Critérios de Avaliação de Ruído – NHO-01 (Q=3) e NR-15 (Q=5)',
    pericia.modalidade !== 'periculosidade' && 'Nas informações de ruído constantes do PPP ou de outros documentos técnicos, deverá ser identificada a metodologia utilizada para obtenção dos resultados. A NHO-01 da FUNDACENTRO utiliza fator de duplicação Q = 3 dB, enquanto o Anexo nº 1 da NR-15 adota Q = 5 dB. Por se tratarem de critérios distintos, os resultados obtidos por uma metodologia não deverão ser automaticamente convertidos ou interpretados como se tivessem sido obtidos segundo a outra.',
    '5.2.3. Equipamentos de Proteção Individual – EPI',
    'A análise dos Equipamentos de Proteção Individual – EPI será realizada a partir do conjunto dos elementos técnicos e documentais disponíveis nos autos, considerando-se os equipamentos relacionados às atividades e aos agentes de risco identificados, bem como suas características e finalidade de proteção.',
    'Serão considerados, quando disponíveis, os registros e demais elementos relacionados aos equipamentos utilizados, incluindo sua identificação, respectivo Certificado de Aprovação – CA, características de proteção e correspondência com o agente de risco e com o período analisado.',
    'Para os protetores auditivos, quando identificado o respectivo CA nos elementos disponíveis, serão consideradas suas características de atenuação, inclusive o NRRsf correspondente, quando aplicável, em conjunto com as demais informações técnicas pertinentes à avaliação da proteção proporcionada.',
    'A análise não será realizada de forma isolada a partir de um único documento, devendo ser considerados, conjuntamente, os elementos técnicos, documentais e circunstanciais relacionados às condições de trabalho, às atividades desenvolvidas, aos agentes identificados e aos equipamentos de proteção associados.',
    'A eventual ausência ou insuficiência de determinada informação documental será apreciada em conjunto com os demais elementos disponíveis, sem que, isoladamente, seja estabelecida presunção quanto à inexistência do equipamento, à sua não utilização ou à ineficácia da proteção.',
    pericia.modalidade !== 'periculosidade' && 'A eliminação ou neutralização da insalubridade será analisada nos termos do item 15.4.1 da NR-15 e do artigo 191 da CLT, considerando-se as medidas de ordem geral e, quando aplicável, a utilização de Equipamento de Proteção Individual adequado ao agente e capaz de reduzir ou neutralizar a exposição, observadas as características técnicas do equipamento e as condições verificadas no período objeto da análise.',
    pericia.modalidade !== 'insalubridade' && '5.3. METODOLOGIA – NR-16',
    pericia.modalidade !== 'insalubridade' && 'A avaliação de periculosidade compreenderá, conforme aplicável: inspeção técnica in loco; análise das atividades efetivamente desenvolvidas; análise do processo e fluxo operacional; identificação das fontes e condições de risco; verificação das áreas de risco; análise do ingresso ou permanência do trabalhador; avaliação da frequência e forma de exposição; análise da documentação técnica; registro fotográfico, quando permitido; e enquadramento nos critérios específicos da NR-16.',
    pericia.modalidade !== 'insalubridade' && '5.3.1. Áreas de Risco',
    pericia.modalidade !== 'insalubridade' && 'Quando aplicável, serão identificadas e analisadas as áreas de risco previstas na NR-16 e respectivos Anexos, verificando-se a efetiva inserção do trabalhador nessas áreas e a correspondência entre a atividade desempenhada e a condição de risco normativamente estabelecida.',
    pericia.modalidade !== 'insalubridade' && '5.3.2. Inspeção e Constatação Técnica',
    pericia.modalidade !== 'insalubridade' && 'A inspeção deverá privilegiar a verificação das condições reais de trabalho, confrontando-se os relatos das partes, os documentos apresentados e as características efetivamente observadas durante a diligência. Quando necessário, poderão ser utilizados instrumentos ou recursos técnicos auxiliares para a verificação das condições relacionadas ao objeto da perícia.',
    '5.4. CRITÉRIO CONCLUSIVO',
    'A conclusão técnica será estabelecida a partir da análise conjunta dos elementos ambientais, operacionais, documentais e normativos, observando-se a efetiva condição de exposição e o correspondente enquadramento na NR-15 ou NR-16. Não deverá ser considerada suficiente, isoladamente, a possibilidade de exposição, a existência de agente no ambiente, a descrição genérica da atividade ou a informação documental desacompanhada de correspondência com as condições reais de trabalho.',
  )
}

function encerramento(): string {
  return paragrafos(
    'As considerações e conclusões apresentadas neste parecer são fundamentadas nos elementos técnicos, documentais e fáticos pertinentes ao objeto da perícia, considerados à luz da legislação aplicável, das Normas Regulamentadoras e das normas técnicas pertinentes.',
    'O presente parecer técnico foi elaborado por este Assistente Técnico com fundamento nos elementos disponíveis para análise e em observância ao Código de Ética Profissional do Sistema Confea/Crea, à legislação trabalhista, às Normas Regulamentadoras e às normas técnicas aplicáveis.',
    'Diante do exposto, o signatário coloca-se à disposição dos envolvidos para os esclarecimentos técnicos que se fizerem necessários.',
  )
}

/** Os textos padrão desta perícia, já preenchidos com os dados dela. */
export function textosPadraoDaPericia(
  pericia: Pericia,
  perito?: Usuario | null,
  reclamada?: Empresa,
): Record<CampoComTextoPadrao, string> {
  return {
    apresentacao: apresentacao(pericia, perito, reclamada),
    objetivoPericia: objetivoPadraoDaPericia(pericia),
    normasReferencias: normasReferencias(pericia),
    equipamentosAnalisados: metodologia(pericia),
    criterioAvaliacaoPericulosidade: criterioAvaliacaoPericulosidade(),
    notaTecnicaEpis: notaTecnicaEpis(),
    protecoesColetivas: protecoesColetivas(),
    encerramento: encerramento(),
  }
}

/**
 * O que precisa ser reescrito no texto técnico para refletir os padrões
 * atuais — sem encostar no que o perito escreveu.
 *
 * Um campo é reescrito quando está vazio ou quando ainda contém
 * exatamente o padrão que este mesmo mecanismo colocou lá antes
 * (`aplicadosAntes`). Qualquer outro conteúdo é do perito e fica.
 */
export function patchDeTextosPadrao(
  tecnico: Pericia['tecnico'],
  padroes: Record<CampoComTextoPadrao, string>,
  aplicadosAntes: Partial<Record<CampoComTextoPadrao, string>>,
): Partial<Record<CampoComTextoPadrao, string>> {
  const patch: Partial<Record<CampoComTextoPadrao, string>> = {}

  for (const campo of CAMPOS_COM_TEXTO_PADRAO) {
    const atual = tecnico[campo] ?? ''
    const anterior = aplicadosAntes[campo]
    const padraoLegado =
      (campo === 'apresentacao' && atual.includes('nomeado(a) para atuar como perito(a) do Juízo')) ||
      (campo === 'apresentacao' &&
        atual.includes(
          'qualificado(a) nos autos como Assistente Técnico(a) da Reclamada, vem, respeitosamente, apresentar o presente PARECER TÉCNICO, elaborado com base na diligência realizada, nas condições efetivamente constatadas e na documentação analisada, à luz das Normas Regulamentadoras aplicáveis, apresentando suas conclusões técnicas de forma objetiva e fundamentada.',
        )) ||
      (campo === 'objetivoPericia' && atual.includes('Apurar o direito ao adicional de insalubridade')) ||
      (campo === 'objetivoPericia' && atual.includes('Apurar o direito ao adicional de periculosidade')) ||
      (campo === 'objetivoPericia' && atual.includes('Analisar tecnicamente a eventual caracterização')) ||
      (campo === 'normasReferencias' && atual.startsWith('A avaliação pericial observou os seguintes diplomas')) ||
      (campo === 'normasReferencias' && atual.includes('agente avaliado: frequência, duração, periodicidade, habitualidade e permanência')) ||
      (campo === 'normasReferencias' && atual.includes('Líquidos Inflamáveis (Gera Direito à Periculosidade)')) ||
      (campo === 'normasReferencias' && atual.includes('Anexo I – Explosivos')) ||
      (campo === 'equipamentosAnalisados' && atual.startsWith('Os trabalhos periciais foram conduzidos em três etapas')) ||
      (campo === 'equipamentosAnalisados' && atual.includes('conclusão considerará o de maior atenuação')) ||
      (campo === 'equipamentosAnalisados' && atual.includes('Os registros de fornecimento de EPI serão analisados em conjunto')) ||
      (campo === 'equipamentosAnalisados' && atual.includes('PPP; PGR; LTCAT;')) ||
      (campo === 'criterioAvaliacaoPericulosidade' && atual.includes('realizada mediante avaliação qualitativa')) ||
      (campo === 'notaTecnicaEpis' && atual.includes('identificação dos próprios EPIs do Reclamante')) ||
      (campo === 'notaTecnicaEpis' && atual.includes('não substituem automaticamente a ficha de entrega')) ||
      (campo === 'encerramento' && atual.startsWith('Os trabalhos periciais foram desenvolvidos com imparcialidade')) ||
      (campo === 'encerramento' && atual.startsWith('1 - Foi realizada inspeção in loco')) ||
      (campo === 'encerramento' && atual.includes('No melhor conhecimento e crédito'))
    const doPerito = atual.trim() !== '' && atual !== anterior && !padraoLegado
    if (!doPerito && atual !== padroes[campo]) patch[campo] = padroes[campo]
  }

  return patch
}
