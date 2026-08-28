import { labelAnexoNr15 } from '@/content/anexosNr15'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import type { AgenteAvaliado, EpiSelecionado } from '@/types'
import { labelAnexoNr16 } from '@/content/anexosNr16'

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

const CRITERIO: Record<string, string> = {
  qualitativo: 'Qualitativo', quantitativo: 'Quantitativo', nao_aplicavel: 'Não aplicável',
}
const GRAU: Record<string, string> = {
  minimo: 'Mínimo (10%)', medio: 'Médio (20%)', maximo: 'Máximo (40%)', nao_caracterizado: 'Não caracterizado',
}
const NATUREZA: Record<string, string> = {
  quimico: 'Químico', fisico: 'Físico', biologico: 'Biológico', periculosidade: 'Periculosidade',
}

const EXPOSICAO_PERICULOSIDADE = {
  permanente: 'Permanente',
  intermitente: 'Intermitente',
  eventual: 'Eventual ou por tempo extremamente reduzido',
  nao_constatada: 'Não constatada exposição a condição de risco que atenda aos critérios normativos de caracterização.',
} as const

const RESULTADO_PERICULOSIDADE = {
  caracterizada: { valor: 'Periculosidade caracterizada', destaque: 'negativo' as const },
  nao_caracterizada: {
    valor: 'Não caracterizada periculosidade, por ausência de enquadramento nos critérios técnicos e normativos aplicáveis.',
    destaque: 'positivo' as const,
  },
  prejudicada: { valor: 'Avaliação prejudicada por insuficiência de elementos', destaque: 'aviso' as const },
} as const

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
  if (agente.tipo === 'periculosidade') {
    const resultado = agente.resultadoPericulosidade
      ? RESULTADO_PERICULOSIDADE[agente.resultadoPericulosidade]
      : undefined
    return {
      titulo: agente.nome || 'Risco de periculosidade não informado',
      linhas: [
        ...(agente.anexoNr16 ? [{ rotulo: 'Anexo NR-16', valor: labelAnexoNr16(agente.anexoNr16) }] : []),
        { rotulo: 'Natureza', valor: 'Periculosidade' },
        { rotulo: 'Critério', valor: 'Qualitativo' },
        { rotulo: 'Adicional', valor: '30%' },
        ...(agente.atividadeEnquadrada?.trim()
          ? [{ rotulo: 'Atividade ou operação avaliada', valor: agente.atividadeEnquadrada.trim() }]
          : []),
        ...(agente.areaRisco?.trim()
          ? [{ rotulo: 'Condição ou área de risco', valor: agente.areaRisco.trim() }]
          : []),
        ...(agente.exposicaoPericulosidade
          ? [{ rotulo: 'Exposição', valor: EXPOSICAO_PERICULOSIDADE[agente.exposicaoPericulosidade] }]
          : []),
        ...(resultado
          ? [{ rotulo: 'Resultado técnico', valor: resultado.valor, destaque: resultado.destaque }]
          : []),
      ],
      protecoes: [],
    }
  }

  const regra = obterRegraAnexo(agente.anexoNr15)
  const somenteRegistrosEmpresa =
    tipoMedicaoEmpresaDe(agente) === 'registros_processo' && !medicaoAdotada(agente).valor
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
