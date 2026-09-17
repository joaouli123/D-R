import { labelAnexoNr15 } from '@/content/anexosNr15'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import type {
  AgenteAvaliado,
  EpiSelecionado,
  ExposicaoPericulosidade,
  PeriodicidadeOperacionalNr16,
  PresencaAreaRisco,
  RelacaoAtividadeNr16,
  SituacaoAreaRisco,
} from '@/types'
import {
  ANALISE_ATIVIDADES_NR16,
  CRITERIO_QUALITATIVO_NR16,
  LAPSO_TEMPORAL_NR16,
  SEM_ENQUADRAMENTO_NR16,
  conclusaoSemRiscoNr16,
  labelAnexoNr16,
  temAnexoNr16Valido,
} from '@/content/anexosNr16'

import { FONTE_RUIDO, formatarMedicaoEmpresa, medicaoAdotada, tipoMedicaoEmpresaDe } from './medicoes'
import { usaAtenuacaoRuido } from './nr15'
import { calcularProtecaoAuditiva, protecaoDoConjunto } from './protecaoAuditiva'

export interface LinhaAgente {
  rotulo: string
  valor: string
  destaque?: 'positivo' | 'negativo' | 'aviso'
}

export interface BlocoProtecaoAgente {
  titulo: string
  linhas: LinhaAgente[]
}

export interface ApresentacaoAgente {
  titulo: string
  linhas: LinhaAgente[]
  protecoes: BlocoProtecaoAgente[]
}

export interface OpcoesApresentacaoAgente {
  /**
   * Monta o quadro do item 10, não o do item 7.
   *
   * Os dois itens falam do mesmo agente com propósitos diferentes, e o perito
   * foi explícito quanto a isso: o item 7 é levantamento — o que foi avaliado,
   * em que período, sob que critério — e não conclui nada; o item 10 é onde a
   * conclusão pericial aparece. Imprimir "Resultado técnico" já no item 7
   * antecipava a conclusão e tornava os dois itens redundantes.
   */
  conclusiva?: boolean
}

/**
 * Agente pronto para impressão: o que está gravado, mais o rótulo da função.
 *
 * `funcaoPosto` NÃO é campo do agente. É derivado do período por
 * `comFuncaoPosto`, uma vez por renderização. Gravar o rótulo faria o laudo
 * mentir no dia em que o perito renomeasse a função no item 7.1 — e o laudo
 * é peça assinada.
 */
export type AgenteApresentavel = AgenteAvaliado & { funcaoPosto?: string }

/** O mínimo que `rotuloFuncaoPosto` precisa de um período do item 7.1. */
export interface PeriodoDeAgente {
  id: string
  funcao?: string
  setor?: string
}

/**
 * "Operador de Prensa — Estamparia", ou só o que houver dos dois.
 *
 * Espelha server/src/services/documento-comum.ts — mudou aqui, muda lá.
 */
export function rotuloFuncaoPosto(periodo: PeriodoDeAgente | undefined): string {
  const funcao = periodo?.funcao?.trim() ?? ''
  const setor = periodo?.setor?.trim() ?? ''
  if (funcao && setor) return `${funcao} — ${setor}`
  return funcao || setor
}

/**
 * Resolve o rótulo da função de cada agente, na entrada do renderizador.
 *
 * Um agente por função é o pedido do perito: quando o trabalhador teve dois
 * postos no lapso avaliado, o mesmo ruído é lançado duas vezes, com medição
 * e EPI próprios. Sem esta linha o laudo imprimia dois quadros de título
 * idêntico e o leitor não tinha como saber qual era qual.
 *
 * Genérica de propósito: o agente atravessa `quadrosNr16DoItem10` e sai do
 * outro lado ainda tipado. Agente sem vínculo — e toda perícia antiga é
 * assim — sai sem a linha, e o documento fica igual ao que já era.
 *
 * Espelha server/src/services/documento-comum.ts — mudou aqui, muda lá.
 */
export function comFuncaoPosto<A extends { periodoId?: string }>(
  agentes: A[],
  periodos: PeriodoDeAgente[],
): (A & { funcaoPosto?: string })[] {
  return agentes.map((agente) => ({
    ...agente,
    funcaoPosto:
      rotuloFuncaoPosto(periodos.find((periodo) => periodo.id === agente.periodoId)) || undefined,
  }))
}

const CRITERIO: Record<string, string> = {
  qualitativo: 'Qualitativo', quantitativo: 'Quantitativo', nao_aplicavel: 'Não aplicável',
}
const GRAU: Record<string, string> = {
  minimo: 'Mínimo (10%)', medio: 'Médio (20%)', maximo: 'Máximo (40%)', nao_caracterizado: 'Não caracterizado',
}
const NATUREZA: Record<string, string> = {
  quimico: 'Químico', fisico: 'Físico', biologico: 'Biológico', periculosidade: 'Periculosidade',
}

/**
 * `fortuita` e `tempo_extremamente_reduzido` usam as palavras da Súmula 364 do
 * TST. `eventual` é o valor dos laudos gravados antes da separação e mantém o
 * texto com que foram emitidos.
 */
export const EXPOSICAO_PERICULOSIDADE: Record<ExposicaoPericulosidade, string> = {
  permanente: 'Permanente',
  intermitente: 'Intermitente',
  fortuita: 'Eventual, assim considerado o contato fortuito',
  tempo_extremamente_reduzido: 'Habitual, por tempo extremamente reduzido',
  eventual: 'Eventual ou por tempo extremamente reduzido',
  nao_constatada: 'Não constatada exposição a condição de risco que atenda aos critérios normativos de caracterização.',
}

const RESULTADO_PERICULOSIDADE = {
  nao_caracterizada: {
    valor: 'Não caracterizada periculosidade, por ausência de enquadramento nos critérios técnicos e normativos aplicáveis.',
    destaque: 'positivo' as const,
  },
  prejudicada: { valor: 'Não foi possível caracterizar a periculosidade, por insuficiência de elementos técnicos.', destaque: 'aviso' as const },
} as const

/**
 * O resultado escolhido no seletor, por extenso.
 *
 * Quando há enquadramento registrado, a caracterização o cita — é o que torna
 * a conclusão rastreável até o item da norma. A parcial diz ainda a que
 * período ou atividade ficou restrita.
 */
function resultadoPericulosidade(
  agente: AgenteAvaliado,
): { valor: string; destaque: 'positivo' | 'negativo' | 'aviso' } | undefined {
  const enquadramento = agente.enquadramentoNr16?.trim()
  const citacao = enquadramento ? ` (${enquadramento})` : ''
  switch (agente.resultadoPericulosidade) {
    case 'caracterizada':
      return { valor: `Periculosidade caracterizada${citacao}`, destaque: 'negativo' }
    case 'caracterizada_parcial': {
      const periodo = agente.periodoCaracterizacaoNr16?.trim()
      return {
        valor: `Periculosidade caracterizada parcialmente${citacao}${periodo ? ` — ${periodo}` : ''}`,
        destaque: 'negativo',
      }
    }
    case 'nao_caracterizada':
    case 'prejudicada':
      return RESULTADO_PERICULOSIDADE[agente.resultadoPericulosidade]
    default:
      return undefined
  }
}

// ------------------------------------------------------------
// O levantamento da NR-16 em frases.
//
// Cada dado estruturado da tela vira uma frase do laudo. Número digitado
// sozinho ganha a unidade ("15" → "15 metros"); texto livre sai como foi
// escrito, porque o perito pode ter registrado "entre 10 e 15 minutos" e a
// unidade repetida estragaria a frase.
//
// Espelha server/src/services/documento-comum.ts — mudou aqui, muda lá. A análise
// automática (src/content/nr16/analise.ts) usa as mesmas frases.
// ------------------------------------------------------------

const SITUACAO_AREA_RISCO: Record<SituacaoAreaRisco, string> = {
  dentro: 'Atividade exercida dentro da área de risco',
  parcialmente_dentro: 'Atividade exercida parcialmente dentro da área de risco',
  fora: 'Atividade exercida fora da área de risco',
  nao_caracterizada: 'Área de risco não caracterizada',
}

/** A presença como complemento da situação: "…dentro da área de risco, com permanência." */
const PRESENCA_AREA_RISCO: Record<PresencaAreaRisco, string> = {
  permanencia: 'com permanência',
  circulacao: 'em circulação',
  acesso_eventual: 'com acesso eventual',
}

/** A presença registrada sem a situação. */
const PRESENCA_AREA_RISCO_ISOLADA: Record<PresencaAreaRisco, string> = {
  permanencia: 'Permanência na área de risco.',
  circulacao: 'Circulação pela área de risco.',
  acesso_eventual: 'Acesso eventual à área de risco.',
}

const PERIODICIDADE_OPERACIONAL: Record<PeriodicidadeOperacionalNr16, string> = {
  dia: 'dia',
  semana: 'semana',
  mes: 'mês',
}

const RELACAO_ATIVIDADE: Record<RelacaoAtividadeNr16, string> = {
  principal: 'Atividade principal',
  secundaria: 'Atividade secundária',
  complementar: 'Atividade complementar',
}

/** "15", "7,5", "2 a 3", "2-3" — número digitado sem unidade. */
const SO_NUMERO_NR16 = /^\d+(?:[.,]\d+)?(?:\s*(?:a|-)\s*\d+(?:[.,]\d+)?)?$/
/** "1.100", "1.000,5" — milhar com ponto, à brasileira. Nunca é um só. */
const MILHAR_NR16 = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/

function soNumeroNr16(valor: string): boolean {
  return MILHAR_NR16.test(valor) || SO_NUMERO_NR16.test(valor)
}
function quantidadeNr16(valor: string, singular: string, plural: string): string {
  // Antes do teste de número com decimal: "1.100" não é 1,1 metro.
  if (MILHAR_NR16.test(valor)) return `${valor} ${plural}`
  if (!SO_NUMERO_NR16.test(valor)) return valor
  const numero = valor.replace(/\./g, ',')
  return `${numero} ${Number(valor.replace(',', '.')) === 1 ? singular : plural}`
}

export function fraseSituacaoAreaRiscoNr16(agente: AgenteAvaliado): string {
  const situacao = agente.situacaoAreaRisco ? SITUACAO_AREA_RISCO[agente.situacaoAreaRisco] : undefined
  // Fora da área, ou sem área caracterizada, não há presença a descrever.
  const cabePresenca = agente.situacaoAreaRisco !== 'fora' && agente.situacaoAreaRisco !== 'nao_caracterizada'
  const presenca = cabePresenca && agente.presencaAreaRisco ? agente.presencaAreaRisco : undefined
  if (situacao && presenca) return `${situacao}, ${PRESENCA_AREA_RISCO[presenca]}.`
  if (situacao) return `${situacao}.`
  return presenca ? PRESENCA_AREA_RISCO_ISOLADA[presenca] ?? '' : ''
}

export function textoDistanciaAreaRiscoNr16(agente: AgenteAvaliado): string {
  const distancia = agente.distanciaAreaRisco?.trim()
  return distancia ? quantidadeNr16(distancia, 'metro', 'metros') : ''
}

export function textoTempoExposicaoNr16(agente: AgenteAvaliado): string {
  const tempo = agente.tempoExposicaoNr16?.trim()
  if (!tempo) return ''
  if (!agente.unidadeTempoExposicaoNr16 || !soNumeroNr16(tempo)) return tempo
  const [singular, plural] = agente.unidadeTempoExposicaoNr16 === 'horas_dia'
    ? ['hora', 'horas']
    : ['minuto', 'minutos']
  return `${quantidadeNr16(tempo, singular, plural)} por dia`
}

export function textoFrequenciaOperacionalNr16(agente: AgenteAvaliado): string {
  const frequencia = agente.frequenciaOperacionalNr16?.trim()
  if (!frequencia) return ''
  if (!soNumeroNr16(frequencia)) return frequencia
  const periodo = agente.periodicidadeOperacionalNr16
    ? ` por ${PERIODICIDADE_OPERACIONAL[agente.periodicidadeOperacionalNr16]}`
    : ''
  return `${quantidadeNr16(frequencia, 'vez', 'vezes')}${periodo}`
}

export function textoRelacaoAtividadeNr16(agente: AgenteAvaliado): string {
  return agente.relacaoAtividadeNr16 ? RELACAO_ATIVIDADE[agente.relacaoAtividadeNr16] ?? '' : ''
}

/**
 * A célula "Condição ou área de risco": onde o trabalhador estava, qual é a
 * área que a norma delimita, a que distância dela, e o texto livre do perito.
 * Uma informação por linha, nessa ordem.
 */
export function textoCondicaoAreaRiscoNr16(agente: AgenteAvaliado): string {
  const delimitacao = agente.delimitacaoAreaRisco?.trim()
  const distancia = textoDistanciaAreaRiscoNr16(agente)
  return [
    fraseSituacaoAreaRiscoNr16(agente),
    delimitacao ? `Área de risco: ${delimitacao}` : '',
    distancia ? `Distância verificada: ${distancia}` : '',
    agente.areaRisco?.trim() ?? '',
  ].filter(Boolean).join('\n')
}

function numeroDocumento(valor: number | string): string {
  return String(valor).replace('.', ',')
}

function comUnidade(valor: string, unidade?: string): string {
  return `${numeroDocumento(valor)}${unidade ? ` ${unidade}` : ''}`
}

export function formatarMedicaoAgente(agente: AgenteAvaliado): string {
  const valor = medicaoAdotada(agente).valor
  if (valor) return comUnidade(valor, agente.unidadeMedicao)
  if (tipoMedicaoEmpresaDe(agente) === 'registros_processo') {
    return formatarMedicaoEmpresa(agente, agente.unidadeMedicao) ?? '—'
  }
  return agente.medido?.trim() || '—'
}

/**
 * Linhas que explicam de onde veio o número. Só aparecem quando há o
 * que explicar: com uma única medição do perito, o laudo segue como
 * sempre foi.
 */
function linhasOrigemMedicao(agente: AgenteAvaliado): LinhaAgente[] {
  const adotada = medicaoAdotada(agente)
  const medicaoEmpresa = formatarMedicaoEmpresa(agente, agente.unidadeMedicao)
  const origemExplicita = (agente.origemMedicao ?? 'perito') !== 'perito'
  if (!medicaoEmpresa && !origemExplicita) return []
  const somenteRegistros = tipoMedicaoEmpresaDe(agente) === 'registros_processo' && !adotada.valor

  return [
    { rotulo: 'Origem da medição', valor: adotada.rotuloOrigem, ...(adotada.divergente ? { destaque: 'aviso' as const } : {}) },
    { rotulo: 'Base da medição', valor: adotada.notaOrigem },
    ...(adotada.fonte ? [{ rotulo: 'Documento da empresa', valor: adotada.fonte }] : []),
    ...(medicaoEmpresa && !somenteRegistros
      ? [{ rotulo: 'Medição da empresa – PGR / Laudos Ocupacionais', valor: medicaoEmpresa }]
      : []),
  ]
}

export function formatarCasEpi(epi: EpiSelecionado): LinhaAgente[] {
  return [
    epi.caUnico?.trim() ? { rotulo: 'CA', valor: epi.caUnico.trim() } : undefined,
    epi.caPecaFacial?.trim() ? { rotulo: 'CA da peça facial', valor: epi.caPecaFacial.trim() } : undefined,
    epi.caFiltroCartucho?.trim() ? { rotulo: 'CA do cartucho/filtro', valor: epi.caFiltroCartucho.trim() } : undefined,
  ].filter((linha): linha is LinhaAgente => Boolean(linha))
}

/**
 * As proteções do agente resumidas em uma linha por EPI, para caber numa
 * célula só do quadro de análise do item 10.
 *
 * Vive aqui porque os quatro renderizadores montavam a mesma string cada um
 * por si — e quando o quadro da NR-16 passou a ser montado à parte, a linha
 * simplesmente não foi junto. Os EPIs de periculosidade sumiram do laudo
 * inteiro: a seção de EPIs só alcança agente com bloco de proteção próprio,
 * e o de periculosidade não tem.
 */
export function resumoProtecoesAssociadas(epis?: EpiSelecionado[]): string {
  return (epis ?? []).map((epi, indice) => {
    const cas = [
      epi.caUnico?.trim() ? `CA ${epi.caUnico.trim()}` : '',
      epi.caPecaFacial?.trim() ? `CA peça facial ${epi.caPecaFacial.trim()}` : '',
      epi.caFiltroCartucho?.trim() ? `CA cartucho/filtro ${epi.caFiltroCartucho.trim()}` : '',
    ].filter(Boolean).join(' / ')
    return `Proteção ${indice + 1}: ${epi.modelo}${cas ? ` — ${cas}` : ''}`
  }).join('\n')
}

function linhasProtecao(
  agente: AgenteAvaliado,
  epi: EpiSelecionado,
  indice: number,
): BlocoProtecaoAgente {
  const linhas: LinhaAgente[] = [
    { rotulo: 'Equipamento', valor: epi.categoria },
    { rotulo: 'Descrição', valor: epi.modelo },
    { rotulo: 'Validade do CA', valor: epi.validadeCa?.trim() || 'Não informada' },
    ...formatarCasEpi(epi),
  ].filter((linha): linha is LinhaAgente => Boolean(linha))

  if (usaAtenuacaoRuido(agente)) {
    const adotada = medicaoAdotada(agente).valor
    const medicao = adotada ? Number(adotada) : Number.NaN
    const resultado = Number.isFinite(medicao)
      ? calcularProtecaoAuditiva(medicao, epi.nivelProtecaoDb, agente.unidadeMedicao)
      : null
    linhas.push({
      rotulo: 'NRRsf',
      valor: epi.nivelProtecaoDb == null ? 'Não informado — considerado 0 dB' : `${numeroDocumento(epi.nivelProtecaoDb)} dB`,
      ...(epi.nivelProtecaoDb == null ? { destaque: 'aviso' as const } : {}),
    })
    if (resultado) {
      linhas.push(
        { rotulo: 'Cálculo', valor: `${numeroDocumento(resultado.medicaoDbA)} - ${numeroDocumento(resultado.atenuacaoDb)} = ${numeroDocumento(resultado.resultadoDbA)} ${resultado.unidade}` },
        { rotulo: 'Conclusão', valor: `${resultado.eficaz ? 'Proteção eficaz' : 'Proteção ineficaz'} (limite de ${numeroDocumento(resultado.limiteDb)} ${resultado.unidade})`, destaque: resultado.eficaz ? 'positivo' : 'negativo' },
      )
    } else {
      linhas.push({ rotulo: 'Cálculo', valor: 'Medição registrada não informada', destaque: 'aviso' })
    }
  } else {
    // Sem resposta não é "Não": a emissão já cobra a resposta, mas o
    // rascunho pré-visualizado não pode afirmar ineficácia que ninguém atestou.
    linhas.push(
      typeof agente.epiEficaz === 'boolean'
        ? { rotulo: 'Eficácia comprovada', valor: agente.epiEficaz ? 'Sim' : 'Não', destaque: agente.epiEficaz ? 'positivo' : 'negativo' }
        : { rotulo: 'Eficácia comprovada', valor: 'Não informada', destaque: 'aviso' },
    )
  }

  return { titulo: `Proteção ${indice + 1}`, linhas }
}

export function montarApresentacaoAgente(
  agente: AgenteApresentavel,
  opcoes: OpcoesApresentacaoAgente = {},
): ApresentacaoAgente {
  if (agente.tipo === 'periculosidade') {
    // ------------------------------------------------------------
    // O mesmo agente, dois quadros.
    //
    // No item 7 sai o levantamento: o que foi avaliado, sob que critério, em
    // que período, contra quais anexos e com que exposição. Nenhuma linha de
    // resultado — é só o registro do exame.
    //
    // No item 10 sai a conclusão, em duas linhas: o que foi examinado e o que
    // se concluiu. No cenário negativo a conclusão é a lista inteira dos
    // anexos observados, montada por `conclusaoSemRiscoNr16`.
    //
    // "Adicional Pretendido" aparece nos dois cenários de propósito: os 30%
    // são o que a parte pede, não o que o laudo reconhece. Foi o próprio
    // perito quem pediu o rótulo por extenso justamente para desfazer essa
    // leitura — antes a linha sumia no cenário negativo para não confundir.
    //
    // Exposição e resultado aceitam redação própria, e ela VENCE a opção do
    // seletor: a lista fechada resolve o caso comum, o texto livre resolve o
    // que ela não previu.
    // ------------------------------------------------------------
    const resultado = resultadoPericulosidade(agente)
    const exposicaoTexto = agente.exposicaoPericulosidadeTexto?.trim()
    const resultadoTexto = agente.resultadoPericulosidadeTexto?.trim()
    const semEnquadramento =
      !resultadoTexto && agente.resultadoPericulosidade === 'nao_caracterizada'
    const titulo = agente.nome || 'Risco de periculosidade não informado'

    if (opcoes.conclusiva) {
      // Sem anexo escolhido o quadro é o "Sem Risco": aí a conclusão precisa
      // dizer que TODOS os anexos foram percorridos, e não só que nada foi
      // caracterizado. Com anexo, quem responde é o resultado daquele anexo.
      //
      // A pergunta é a mesma que `quadrosNr16DoItem10` faz para escolher o
      // título do quadro; se aqui fosse só `!agente.anexoNr16`, a perícia
      // antiga com "Anexo 2" gravado sairia intitulada "Sem Risco" e sem o
      // rol — que, retirada a lista do item 10, não tem outro lugar onde
      // aparecer.
      const conclusao = resultadoTexto
        ? { valor: resultadoTexto }
        : semEnquadramento && !temAnexoNr16Valido(agente)
          ? { valor: conclusaoSemRiscoNr16(), destaque: 'positivo' as const }
          : resultado
            ? { valor: resultado.valor, destaque: resultado.destaque }
            : undefined
      // A observação do agente não tinha onde sair na periculosidade: este é
      // o lugar dela, junto da conclusão que ela comenta.
      const observacao = agente.observacao?.trim()
      const corpo = [conclusao?.valor, observacao].filter(Boolean).join('\n\n')
      // Quando o perito registrou EPIs no agente de periculosidade, este é o
      // único quadro do laudo em que eles aparecem. No cenário negativo não há
      // EPI nenhum e a tabela sai com as duas linhas do print.
      const protecoesAssociadas = resumoProtecoesAssociadas(agente.epis)
      return {
        titulo,
        linhas: [
          ...(agente.funcaoPosto ? [{ rotulo: 'Função / Posto', valor: agente.funcaoPosto }] : []),
          {
            rotulo: 'Condição / Atividades',
            valor: [ANALISE_ATIVIDADES_NR16, LAPSO_TEMPORAL_NR16].join('\n'),
          },
          ...(corpo
            ? [{
                rotulo: 'Resultado técnico / Conclusão',
                valor: corpo,
                ...(conclusao?.destaque ? { destaque: conclusao.destaque } : {}),
              }]
            : []),
          ...(protecoesAssociadas
            ? [{ rotulo: 'Proteções associadas', valor: protecoesAssociadas }]
            : []),
        ],
        protecoes: [],
      }
    }

    // A ordem é a do raciocínio pericial: anexo, item da norma, atividade,
    // condição e área, e por fim a exposição com tempo e frequência. O
    // resultado não entra — é do item 10.
    //
    // "Sem enquadramento" não imprime a linha do anexo: o quadro sai igual ao
    // do cenário negativo que o perito aprovou, em que ela não existia.
    const enquadramento = agente.enquadramentoNr16?.trim()
    const condicaoArea = textoCondicaoAreaRiscoNr16(agente)
    const tempo = textoTempoExposicaoNr16(agente)
    const frequencia = textoFrequenciaOperacionalNr16(agente)
    const relacao = textoRelacaoAtividadeNr16(agente)
    return {
      titulo,
      linhas: [
        ...(agente.funcaoPosto ? [{ rotulo: 'Função / Posto', valor: agente.funcaoPosto }] : []),
        ...(agente.anexoNr16 && agente.anexoNr16 !== SEM_ENQUADRAMENTO_NR16
          ? [{ rotulo: 'Anexo NR-16', valor: labelAnexoNr16(agente.anexoNr16) }]
          : []),
        { rotulo: 'Natureza', valor: 'Periculosidade' },
        { rotulo: 'Critério', valor: CRITERIO_QUALITATIVO_NR16 },
        { rotulo: 'Lapso temporal', valor: LAPSO_TEMPORAL_NR16 },
        { rotulo: 'Adicional Pretendido', valor: '30%' },
        ...(enquadramento ? [{ rotulo: 'Enquadramento normativo', valor: enquadramento }] : []),
        ...(agente.atividadeEnquadrada?.trim()
          ? [{ rotulo: 'Atividade ou operação avaliada', valor: agente.atividadeEnquadrada.trim() }]
          : []),
        ...(condicaoArea ? [{ rotulo: 'Condição ou área de risco', valor: condicaoArea }] : []),
        ...(agente.analiseAnexos?.trim()
          ? [{ rotulo: 'Análise dos Anexos', valor: agente.analiseAnexos.trim() }]
          : []),
        ...(agente.detalhesNr16 ?? [])
          .filter((detalhe) => detalhe.valor.trim())
          .map((detalhe) => ({ rotulo: detalhe.rotulo, valor: detalhe.valor.trim() })),
        ...(exposicaoTexto
          ? [{ rotulo: 'Exposição', valor: exposicaoTexto }]
          : agente.exposicaoPericulosidade
            ? [{ rotulo: 'Exposição', valor: EXPOSICAO_PERICULOSIDADE[agente.exposicaoPericulosidade] }]
            : []),
        ...(tempo ? [{ rotulo: 'Tempo médio de exposição', valor: tempo }] : []),
        ...(frequencia ? [{ rotulo: 'Frequência operacional', valor: frequencia }] : []),
        ...(relacao ? [{ rotulo: 'Relação com a atividade', valor: relacao }] : []),
      ],
      protecoes: [],
    }
  }

  const regra = obterRegraAnexo(agente.anexoNr15)
  const somenteRegistrosEmpresa =
    tipoMedicaoEmpresaDe(agente) === 'registros_processo' && !medicaoAdotada(agente).valor
  const linhas: LinhaAgente[] = [
    ...(agente.funcaoPosto ? [{ rotulo: 'Função / Posto', valor: agente.funcaoPosto }] : []),
    ...(agente.anexoNr15 ? [{ rotulo: 'Anexo NR-15', valor: labelAnexoNr15(agente.anexoNr15) }] : []),
    { rotulo: 'Natureza', valor: NATUREZA[agente.tipo] ?? agente.tipo },
    { rotulo: 'Critério', valor: CRITERIO[agente.criterio] ?? agente.criterio },
    ...(agente.grau ? [{ rotulo: 'Grau', valor: GRAU[agente.grau] ?? agente.grau }] : []),
    ...((regra?.exibeCas ?? Boolean(agente.cas)) && agente.cas ? [{ rotulo: 'CAS', valor: agente.cas }] : []),
    ...(agente.atividadeEnquadrada?.trim() ? [{ rotulo: 'Atividade ou referência normativa', valor: agente.atividadeEnquadrada.trim() }] : []),
    ...(agente.limiteTolerancia?.trim() ? [{ rotulo: 'Limite de tolerância', valor: agente.limiteTolerancia.trim() }] : []),
    // A frase inteira, não o rótulo: o documento é lido por quem não
    // acompanhou a diligência, e "Ruído de fundo" sozinho não explica
    // por que o nível medido não vem de máquina nenhuma.
    ...(agente.fonteRuido ? [{ rotulo: 'Fonte do ruído', valor: FONTE_RUIDO[agente.fonteRuido].frase }] : []),
    ...((regra?.exibeMedicao ?? Boolean(agente.valorMedido || agente.medicaoEmpresa || agente.medicaoEmpresaAte || agente.medido || agente.tipoMedicaoEmpresa === 'registros_processo'))
      ? [{
          rotulo: somenteRegistrosEmpresa
            ? 'Medição da empresa – PGR / Laudos Ocupacionais'
            : 'Medição registrada',
          valor: formatarMedicaoAgente(agente),
        }, ...linhasOrigemMedicao(agente)]
      : []),
  ]

  const epis = agente.epis ?? []
  const protecoes = epis.map((epi, indice) => linhasProtecao(agente, epi, indice))

  // Com mais de um protetor, cada um sai avaliado no laudo e ainda
  // falta a pergunta que importa: com o melhor deles a exposição fica
  // dentro do limite?
  if (usaAtenuacaoRuido(agente) && epis.length > 1) {
    const adotada = medicaoAdotada(agente).valor
    const medicao = adotada ? Number(adotada) : Number.NaN
    const conjunto = Number.isFinite(medicao)
      ? protecaoDoConjunto(medicao, epis, agente.unidadeMedicao)
      : undefined
    if (conjunto) {
      const { melhor } = conjunto
      protecoes.push({
        titulo: `Conclusão do conjunto (${conjunto.quantidade} protetores)`,
        linhas: [
          { rotulo: 'Protetor mais atenuante', valor: `Proteção ${conjunto.indiceMelhor + 1} — ${epis[conjunto.indiceMelhor].modelo}` },
          { rotulo: 'Cálculo', valor: `${numeroDocumento(melhor.medicaoDbA)} - ${numeroDocumento(melhor.atenuacaoDb)} = ${numeroDocumento(melhor.resultadoDbA)} ${melhor.unidade}` },
          {
            rotulo: 'Conclusão',
            valor: melhor.eficaz
              ? `Exposição neutralizada pelo protetor mais atenuante (limite de ${numeroDocumento(melhor.limiteDb)} ${melhor.unidade})`
              : `Nenhum dos protetores associados neutraliza a exposição (limite de ${numeroDocumento(melhor.limiteDb)} ${melhor.unidade})`,
            destaque: melhor.eficaz ? 'positivo' : 'negativo',
          },
        ],
      })
    }
  }

  return { titulo: agente.nome || 'Agente não informado', linhas, protecoes }
}
