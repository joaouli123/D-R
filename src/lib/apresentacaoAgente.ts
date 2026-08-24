import { labelAnexoNr15 } from '@/content/anexosNr15'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import type { AgenteAvaliado, EpiSelecionado } from '@/types'

import { FONTE_RUIDO, medicaoAdotada } from './medicoes'
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

const CRITERIO: Record<string, string> = {
  qualitativo: 'Qualitativo', quantitativo: 'Quantitativo', nao_aplicavel: 'Não aplicável',
}
const GRAU: Record<string, string> = {
  minimo: 'Mínimo (10%)', medio: 'Médio (20%)', maximo: 'Máximo (40%)', nao_caracterizado: 'Não caracterizado',
}
const NATUREZA: Record<string, string> = {
  quimico: 'Químico', fisico: 'Físico', biologico: 'Biológico', periculosidade: 'Periculosidade',
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
  return agente.medido?.trim() || '—'
}

/**
 * Linhas que explicam de onde veio o número. Só aparecem quando há o
 * que explicar: com uma única medição do perito, o laudo segue como
 * sempre foi.
 */
function linhasOrigemMedicao(agente: AgenteAvaliado): LinhaAgente[] {
  const adotada = medicaoAdotada(agente)
  const doPerito = agente.valorMedido?.trim() ?? ''
  const daEmpresa = agente.medicaoEmpresa?.trim() || agente.medicaoEmpresaAte?.trim() || ''
  const origemExplicita = (agente.origemMedicao ?? 'perito') !== 'perito'
  if (!daEmpresa && !origemExplicita) return []

  // Com faixa, o número adotado sozinho esconde de onde saiu: quem lê
  // precisa ver o intervalo e a razão de o laudo ficar com o topo. O
  // "adotada a maior" só entra quando é essa medição que prevalece —
  // dizê-lo de uma medição descartada seria afirmar o contrário do que
  // o documento conclui.
  const faixa = adotada.faixaEmpresa
  const intervalo = faixa && `entre ${comUnidade(faixa.de)} e ${comUnidade(faixa.ate, agente.unidadeMedicao)}`
  const medicaoDaEmpresa = intervalo
    ? adotada.origem === 'perito' ? intervalo : `${intervalo} — adotada a maior`
    : comUnidade(adotada.origem === 'perito' ? daEmpresa : adotada.valor, agente.unidadeMedicao)

  return [
    { rotulo: 'Origem da medição', valor: adotada.rotuloOrigem, ...(adotada.divergente ? { destaque: 'aviso' as const } : {}) },
    { rotulo: 'Base da medição', valor: adotada.notaOrigem },
    ...(adotada.fonte ? [{ rotulo: 'Documento da empresa', valor: adotada.fonte }] : []),
    ...(daEmpresa && adotada.origem === 'perito'
      ? [{ rotulo: 'Medição da empresa (não adotada)', valor: medicaoDaEmpresa }]
      : []),
    ...(faixa && adotada.origem !== 'perito'
      ? [{ rotulo: 'Faixa informada pela empresa', valor: medicaoDaEmpresa }]
      : []),
    ...(doPerito && adotada.origem !== 'perito'
      ? [{ rotulo: 'Medição do perito (não adotada)', valor: comUnidade(doPerito, agente.unidadeMedicao) }]
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

function linhasProtecao(
  agente: AgenteAvaliado,
  epi: EpiSelecionado,
  indice: number,
): BlocoProtecaoAgente {
  const manualAtual = Boolean(epi.validadeCa?.trim())
  const linhas: LinhaAgente[] = [
    { rotulo: manualAtual ? 'Equipamento' : 'Categoria', valor: epi.categoria },
    { rotulo: manualAtual ? 'Descrição' : 'Modelo', valor: epi.modelo },
    manualAtual
      ? { rotulo: 'Validade do CA', valor: epi.validadeCa!.trim() }
      : epi.marca?.trim() ? { rotulo: 'Marca', valor: epi.marca.trim() } : undefined,
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
    linhas.push({
      rotulo: 'Eficácia comprovada',
      valor: agente.epiEficaz ? 'Sim' : 'Não',
      destaque: agente.epiEficaz ? 'positivo' : 'negativo',
    })
  }

  return { titulo: `Proteção ${indice + 1}`, linhas }
}

export function montarApresentacaoAgente(agente: AgenteAvaliado): ApresentacaoAgente {
  const regra = obterRegraAnexo(agente.anexoNr15)
  const linhas: LinhaAgente[] = [
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
    ...((regra?.exibeMedicao ?? Boolean(agente.valorMedido || agente.medicaoEmpresa || agente.medicaoEmpresaAte || agente.medido))
      ? [{ rotulo: 'Medição registrada', valor: formatarMedicaoAgente(agente) }, ...linhasOrigemMedicao(agente)]
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
