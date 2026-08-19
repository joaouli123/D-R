import { labelAnexoNr15 } from '@/content/anexosNr15'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import type { AgenteAvaliado, EpiSelecionado } from '@/types'

import { calcularProtecaoAuditiva } from './protecaoAuditiva'

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

export function formatarMedicaoAgente(agente: AgenteAvaliado): string {
  const valor = agente.valorMedido?.trim()
  if (valor) return `${numeroDocumento(valor)}${agente.unidadeMedicao ? ` ${agente.unidadeMedicao}` : ''}`
  return agente.medido?.trim() || '—'
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

  if (agente.anexoNr15 === 'ANEXO_01') {
    const medicao = agente.valorMedido == null ? Number.NaN : Number(agente.valorMedido)
    const resultado = Number.isFinite(medicao)
      ? calcularProtecaoAuditiva(medicao, epi.nivelProtecaoDb)
      : null
    linhas.push({
      rotulo: 'NRRsf',
      valor: epi.nivelProtecaoDb == null ? 'Não informado — considerado 0 dB' : `${numeroDocumento(epi.nivelProtecaoDb)} dB`,
      ...(epi.nivelProtecaoDb == null ? { destaque: 'aviso' as const } : {}),
    })
    if (resultado) {
      linhas.push(
        { rotulo: 'Cálculo', valor: `${numeroDocumento(resultado.medicaoDbA)} - ${numeroDocumento(resultado.atenuacaoDb)} = ${numeroDocumento(resultado.resultadoDbA)} dB(A)` },
        { rotulo: 'Conclusão', valor: resultado.eficaz ? 'Proteção eficaz' : 'Proteção ineficaz', destaque: resultado.eficaz ? 'positivo' : 'negativo' },
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
    ...((regra?.exibeMedicao ?? Boolean(agente.valorMedido || agente.medido))
      ? [{ rotulo: 'Medição registrada', valor: formatarMedicaoAgente(agente) }]
      : []),
  ]

  return {
    titulo: agente.nome || 'Agente não informado',
    linhas,
    protecoes: (agente.epis ?? []).map((epi, indice) => linhasProtecao(agente, epi, indice)),
  }
}
