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
  'encerramento',
] as const

export type CampoComTextoPadrao = (typeof CAMPOS_COM_TEXTO_PADRAO)[number]

/** Junta parágrafos descartando os que ficaram vazios. */
function paragrafos(...partes: (string | false | undefined)[]): string {
  return partes.filter((parte): parte is string => Boolean(parte)).join('\n\n')
}

function nomeDaEmpresa(empresa?: Empresa): string {
  return empresa?.razaoSocial?.trim() || empresa?.nomeFantasia?.trim() || ''
}

/**
 * Qualificação do perito na primeira pessoa do documento. Sem os dados
 * do cadastro, cai numa forma neutra em vez de imprimir lacuna.
 */
function qualificacao(perito?: Usuario | null): string {
  const nome = perito?.nome?.trim()
  if (!nome) return 'O perito judicial nomeado por este MM. Juízo'

  const credenciais = [perito?.titulo?.trim(), perito?.registroProfissional?.trim()].filter(Boolean)
  return credenciais.length ? `${nome}, ${credenciais.join(', ')}` : nome
}

function apresentacao(pericia: Pericia, perito?: Usuario | null, reclamada?: Empresa): string {
  const processo = pericia.numeroProcesso?.trim()
  const reclamante = pericia.reclamante?.trim()
  const empresa = nomeDaEmpresa(reclamada)

  const autos = processo ? `nos autos do processo nº ${processo}` : 'nos autos do processo em epígrafe'
  const partes = reclamante && empresa
    ? `, movido por ${reclamante} em face de ${empresa}`
    : reclamante
      ? `, movido por ${reclamante}`
      : ''

  return paragrafos(
    `${qualificacao(perito)}, nomeado(a) para atuar como perito(a) do Juízo ${autos}${partes}, vem, respeitosamente, à presença de Vossa Excelência apresentar o resultado dos trabalhos técnicos realizados, na forma que segue.`,
    'Os trabalhos foram desenvolvidos com base em vistoria no local de trabalho, na observação direta das atividades, nas informações prestadas pelas partes durante a diligência e na análise da documentação técnica juntada aos autos, observadas as normas técnicas e a legislação aplicáveis à matéria.',
    'O signatário declara não possuir qualquer impedimento ou suspeição para o encargo, atuando com estrita imparcialidade e restringindo-se à matéria técnica submetida à sua apreciação.',
  )
}

function objetoPorModalidade(modalidade: ModalidadePericia): string {
  const insalubridade =
    'apurar a existência, ou não, de exposição a agentes insalubres, nos termos dos artigos 189 e seguintes da CLT e da NR-15 da Portaria MTb nº 3.214/78, bem como, em caso positivo, o respectivo grau (mínimo, médio ou máximo) e os períodos de exposição'
  const periculosidade =
    'apurar a existência, ou não, de atividades ou operações perigosas, nos termos do artigo 193 da CLT e da NR-16 da Portaria MTb nº 3.214/78, bem como, em caso positivo, os respectivos períodos de exposição'

  if (modalidade === 'insalubridade') return insalubridade
  if (modalidade === 'periculosidade') return periculosidade
  return `${insalubridade}; e, ainda, ${periculosidade}`
}

function objetivoPericia(pericia: Pericia): string {
  return paragrafos(
    `A presente perícia tem por objeto a verificação das condições de trabalho a que esteve submetido(a) o(a) reclamante, com a finalidade de ${objetoPorModalidade(pericia.modalidade)}.`,
    'Para tanto, foram examinadas as atividades efetivamente exercidas, o ambiente e o posto de trabalho, os agentes ambientais neles presentes, os equipamentos de proteção fornecidos e utilizados e a documentação técnica apresentada pela reclamada.',
  )
}

/**
 * Base normativa. Varia com a modalidade porque citar a NR-16 num laudo
 * exclusivamente de insalubridade — e vice-versa — só dá margem a
 * impugnação.
 */
function normasReferencias(pericia: Pericia): string {
  const comum = [
    'Constituição Federal, artigo 7º, inciso XXIII',
    'CLT, artigo 195, e artigos 464 a 484 do CPC, quanto à prova pericial',
    'NR-06 — Equipamentos de Proteção Individual',
    'NR-09 — Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos',
    'NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais (PGR)',
  ]
  const daInsalubridade = [
    'CLT, artigos 189 a 192',
    'NR-15 — Atividades e Operações Insalubres, e seus Anexos',
    'Normas de Higiene Ocupacional NHO-01 (ruído) e NHO-06 (calor), da FUNDACENTRO',
    'Súmula 448 do TST, Súmula 80 do TST e Súmula 289 do TST',
  ]
  const daPericulosidade = [
    'CLT, artigo 193',
    'NR-16 — Atividades e Operações Perigosas, e seus Anexos',
  ]

  const itens = [
    ...comum.slice(0, 2),
    ...(pericia.modalidade !== 'periculosidade' ? daInsalubridade : []),
    ...(pericia.modalidade !== 'insalubridade' ? daPericulosidade : []),
    ...comum.slice(2),
    'Orientação Jurisprudencial nº 165 da SDI-1 do TST',
  ]

  return paragrafos(
    'A avaliação pericial observou os seguintes diplomas legais, normas regulamentadoras e referências técnicas:',
    itens.map((item) => `• ${item};`).join('\n').replace(/;$/, '.'),
  )
}

function metodologia(pericia: Pericia): string {
  return paragrafos(
    'Os trabalhos periciais foram conduzidos em três etapas: (i) inspeção do local de trabalho, com observação direta do ambiente e das atividades habitualmente executadas; (ii) entrevista com o(a) reclamante e com os representantes da reclamada presentes à diligência; e (iii) análise da documentação técnica apresentada, tais como PGR, PCMSO, LTCAT, laudos ambientais, ordens de serviço, fichas de entrega de EPI e respectivos Certificados de Aprovação.',
    pericia.modalidade !== 'periculosidade' &&
      'A caracterização de cada agente seguiu o critério fixado pelo respectivo Anexo da NR-15: qualitativo, quando o enquadramento decorre da atividade ou da operação executada, e quantitativo, quando depende da comparação da medição obtida com o limite de tolerância previsto na norma. Nas avaliações quantitativas foram adotadas as metodologias das Normas de Higiene Ocupacional da FUNDACENTRO aplicáveis a cada agente.',
    pericia.modalidade !== 'periculosidade' &&
      'Quando a reclamada apresentou avaliação ambiental própria, o laudo registra as duas medições — a da empresa e a obtida em diligência — e indica expressamente qual delas foi adotada e por quê.',
    'A eficácia dos equipamentos de proteção individual foi apurada a partir do Certificado de Aprovação de cada equipamento, conferido na base do CAEPI do Ministério do Trabalho e Emprego, verificando-se a validade do certificado e a adequação do equipamento ao agente a que se destina. Para a proteção auditiva, considerou-se o Nível de Redução de Ruído Subject Fit (NRRsf) constante do próprio Certificado de Aprovação, subtraído do nível de exposição apurado. Havendo mais de um protetor associado ao mesmo agente, a conclusão considera o de maior atenuação.',
    pericia.modalidade !== 'periculosidade' &&
      'Registre-se, quanto ao ponto, que o item 15.4.1 da NR-15 dispõe que a eliminação ou neutralização da insalubridade ocorrerá “a) com a adoção de medidas de ordem geral que conservem o ambiente de trabalho dentro dos limites de tolerância; b) com a utilização de equipamento de proteção individual”, no mesmo sentido do artigo 191, incisos I e II, da CLT.',
  )
}

function encerramento(): string {
  return paragrafos(
    'Os trabalhos periciais foram desenvolvidos com imparcialidade e refletem as condições efetivamente encontradas na data da diligência, bem como a documentação técnica apresentada pelas partes até a conclusão deste trabalho.',
    'As conclusões aqui apresentadas restringem-se à matéria técnica submetida ao signatário, cabendo a este MM. Juízo a valoração jurídica dos fatos apurados.',
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
    const doPerito = atual.trim() !== '' && atual !== anterior
    if (!doPerito && atual !== padroes[campo]) patch[campo] = padroes[campo]
  }

  return patch
}
