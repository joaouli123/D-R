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
 * Estes textos entram sozinhos na perícia e se mantêm atualizados
 * enquanto o perito não os editar. No instante em que ele mexe em um
 * deles, aquele campo passa a ser dele e nunca mais é reescrito
 * (ver `patchDeTextosPadrao`).
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
  const insalubridade = 'Apurar o direito ao adicional de insalubridade, nos termos da NR-15, e, se devido, seu respectivo grau: mínimo, médio ou máximo.'
  const periculosidade = 'Apurar o direito ao adicional de periculosidade, nos termos da NR-16, e o respectivo percentual aplicável.'

  if (modalidade === 'insalubridade') return insalubridade
  if (modalidade === 'periculosidade') return periculosidade
  return `${insalubridade}\n\n${periculosidade}`
}

function objetivoPericia(pericia: Pericia): string {
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
    pericia.modalidade !== 'periculosidade' && 'Quando previsto no respectivo Anexo, a caracterização dependerá da avaliação dos níveis ou concentrações do agente, mediante metodologia e parâmetros aplicáveis. Entre os agentes sujeitos a critérios quantitativos, conforme o Anexo aplicável, encontram-se: ruído contínuo ou intermitente; ruído de impacto; calor; vibração; agentes químicos; poeiras minerais; e radiações ionizantes, conforme os critérios específicos aplicáveis.',
    pericia.modalidade !== 'periculosidade' && '4.1.2. Critérios Qualitativos',
    pericia.modalidade !== 'periculosidade' && 'Quando estabelecido critério qualitativo pelo respectivo Anexo, a análise deverá considerar a atividade efetivamente realizada, as condições de exposição e o correspondente enquadramento normativo. Podem compreender, conforme aplicável: condições hiperbáricas; radiações não ionizantes; frio; umidade; determinados agentes químicos; e agentes biológicos.',
    pericia.modalidade !== 'periculosidade' && '4.1.3. Frequência, Duração e Habitualidade',
    pericia.modalidade !== 'periculosidade' && 'A análise da exposição deverá considerar, quando pertinentes ao agente avaliado:\n• Frequência: quantidade de ocorrências da exposição em determinado período;\n• Duração: tempo efetivo de exposição em cada ocorrência;\n• Periodicidade: regularidade com que a atividade ou exposição ocorre;\n• Habitualidade: integração da atividade à rotina laboral;\n• Permanência: continuidade ou constância da exposição, conforme o critério normativo aplicável.\nPara fins de análise técnica, exposição eventual ou esporádica não deverá ser automaticamente equiparada à exposição habitual ou permanente, devendo a situação concreta ser confrontada com os critérios estabelecidos na norma específica.',
    pericia.modalidade !== 'insalubridade' && '4.2. PERICULOSIDADE – NR-16',
    pericia.modalidade !== 'insalubridade' && 'A caracterização da periculosidade deverá observar os critérios estabelecidos na NR-16 e respectivos Anexos, mediante análise da atividade ou operação efetivamente desenvolvida e do correspondente enquadramento normativo. Serão considerados, conforme aplicável: atividade efetivamente desempenhada; natureza da condição de risco; área de risco; ingresso ou permanência na área de risco; frequência e forma de exposição; condições reais de trabalho; e enquadramento específico no respectivo Anexo da NR-16.',
    pericia.modalidade !== 'insalubridade' && 'A mera proximidade, possibilidade de contato ou existência de fonte de risco no estabelecimento não constitui, isoladamente, comprovação de condição perigosa.',
    pericia.modalidade !== 'insalubridade' && '4.2.1. Anexos da NR-16',
    pericia.modalidade !== 'insalubridade' && 'Para a análise serão considerados os respectivos Anexos da NR-16 aplicáveis ao objeto da perícia, incluindo:\n• Anexo I – Explosivos;\n• Anexo II – Inflamáveis;\n• Anexo III – Segurança pessoal ou patrimonial;\n• Anexo IV – Energia elétrica;\n• Anexo V – Motocicleta;\n• Anexo VI – Agentes das autoridades de trânsito;\n• Anexo VII – Radiações ionizantes ou substâncias radioativas.',
    pericia.modalidade !== 'insalubridade' && 'Nota Técnica.\nLíquidos Inflamáveis (Gera Direito à Periculosidade): são os líquidos com ponto de fulgor menor ou igual a 60 ºC (≤ 60 ºC). O Anexo 2 da NR-16 utiliza a definição técnica estabelecida na NR-20 (item 20.3.1).\nLíquidos Combustíveis (NÃO Gera Periculosidade): o item 16.7 da NR-16 define explicitamente que líquido combustível é aquele com ponto de fulgor maior que 60 ºC e inferior ou igual a 93 ºC. Portanto, se o produto estiver nessa faixa de temperatura, o trabalhador não tem direito ao adicional de 30%.\nÓleos Lubrificantes e Diesel Marítimo: possuem ponto de fulgor superior a 60 ºC. Enquadram-se estritamente como líquidos combustíveis, afastando legalmente o direito ao adicional de periculosidade.\nDiesel Automotivo Comum (S10/S500): apesar do nome comercial de combustível, seu ponto de fulgor real de fábrica fica abaixo de 60 ºC (geralmente entre 38 ºC e 55 ºC). Logo, é classificado legalmente como líquido inflamável, gerando direito à periculosidade.',
  )
}

function criterioAvaliacaoPericulosidade(): string {
  return 'A caracterização da periculosidade é realizada mediante avaliação qualitativa, considerando as atividades efetivamente desenvolvidas, as condições de trabalho e o enquadramento nos critérios estabelecidos pela NR-16 e seus respectivos Anexos.'
}

function notaTecnicaEpis(): string {
  return paragrafos(
    'Nota Técnica sobre a Primazia da Realidade',
    'A análise técnica observará a primazia da realidade, considerando as condições efetivamente existentes e as atividades realmente desempenhadas, em conjunto com os elementos documentais e demais evidências disponíveis.',
    'Quanto aos EPIs, eventual ausência ou inconsistência formal nos registros de entrega não deve, isoladamente, presumir a inexistência de fornecimento, disponibilização ou utilização dos equipamentos, devendo ser considerado o conjunto probatório, inclusive outros meios de prova admitidos em direito, conforme art. 369 do CPC.',
    'Tecnicamente, a análise deve privilegiar a realidade laboral efetivamente comprovada, e não exclusivamente a existência ou ausência de determinado registro formal.',
    'Do ponto de vista técnico, a identificação dos próprios EPIs do Reclamante, por ele reconhecidos na presença de todos, constitui elemento objetivo a ser considerado na análise do fornecimento e da disponibilização dos EPIs pela empresa durante o contrato de trabalho.',
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
    'Serão considerados, conforme disponíveis: PPP; PGR; LTCAT; laudos ambientais; fichas de entrega de EPI; documentos relativos ao processo produtivo; e demais documentos técnicos pertinentes. A documentação será analisada em conjunto com as condições reais de trabalho, considerando-se sua coerência, período de abrangência, metodologia utilizada e compatibilidade com as atividades efetivamente desempenhadas.',
    '5.2.1. PPP – Perfil Profissiográfico Previdenciário',
    'O PPP constitui elemento documental relevante, porém não deverá ser analisado isoladamente para fins de caracterização de insalubridade ou periculosidade. Suas informações deverão ser confrontadas com os demais documentos técnicos, com a metodologia utilizada para obtenção dos dados e, quando possível, com as condições efetivamente verificadas.',
    pericia.modalidade !== 'periculosidade' && '5.2.2. Avaliação de Ruído – Q3 e Q5',
    pericia.modalidade !== 'periculosidade' && 'Nas informações de ruído constantes do PPP ou de outros documentos técnicos, deverá ser identificada a metodologia utilizada para obtenção dos resultados. A NHO-01 da FUNDACENTRO utiliza fator de duplicação Q = 3 dB, enquanto o Anexo nº 1 da NR-15 adota Q = 5 dB. Por se tratarem de critérios distintos, os resultados obtidos por uma metodologia não deverão ser automaticamente convertidos ou interpretados como se tivessem sido obtidos segundo a outra.',
    '5.2.3. Equipamentos de Proteção Individual – EPI',
    'Os registros de fornecimento de EPI serão analisados em conjunto com os demais elementos disponíveis, considerando-se o equipamento fornecido, respectivo CA, adequação ao agente, período de utilização, treinamentos e demais evidências pertinentes. A validade e a adequação do Certificado de Aprovação serão conferidas na base oficial CAEPI do Ministério do Trabalho e Emprego. Para a proteção auditiva, será considerado o NRRsf constante do CA; havendo mais de um protetor associado ao mesmo agente, cada equipamento será demonstrado e a conclusão considerará o de maior atenuação.',
    pericia.modalidade !== 'periculosidade' && 'A eliminação ou neutralização da insalubridade será analisada conforme o item 15.4.1 da NR-15 e o artigo 191 da CLT, considerando-se as medidas de ordem geral e a utilização de equipamento de proteção individual.',
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
    '1 - Foi realizada inspeção in loco no ambiente objeto do presente trabalho, com análise das condições relacionadas à insalubridade e/ou periculosidade conforme a modalidade selecionada e a fundamentação técnica apresentada.',
    '2 - As conclusões apresentadas decorrem exclusivamente dos elementos técnicos, documentais e fáticos analisados, observados os critérios estabelecidos na legislação e nas Normas Regulamentadoras aplicáveis.',
    '3 - No melhor conhecimento e crédito, as vistorias, análises e conclusões expressas no presente trabalho são baseadas em dados, diligências, pesquisas e levantamentos verdadeiros e corretos.',
    '4 - Foram ouvidos os relatos das partes envolvidas, assegurando-se a todos o direito de se expressar livremente.',
    '5 - A presente vistoria e o respectivo parecer foram elaborados com observância aos postulados do Código de Ética Profissional do Conselho Federal de Engenharia e Agronomia (CONFEA), do IBAPE/SP e do Ministério do Trabalho e Emprego.',
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
    objetivoPericia: objetivoPericia(pericia),
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
      (campo === 'normasReferencias' && atual.startsWith('A avaliação pericial observou os seguintes diplomas')) ||
      (campo === 'normasReferencias' && atual.includes('agente avaliado: frequência, duração, periodicidade, habitualidade e permanência')) ||
      (campo === 'equipamentosAnalisados' && atual.startsWith('Os trabalhos periciais foram conduzidos em três etapas')) ||
      (campo === 'encerramento' && atual.startsWith('Os trabalhos periciais foram desenvolvidos com imparcialidade'))
    const doPerito = atual.trim() !== '' && atual !== anterior && !padraoLegado
    if (!doPerito && atual !== padroes[campo]) patch[campo] = padroes[campo]
  }

  return patch
}
