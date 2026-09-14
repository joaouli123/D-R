import type { AgenteDocumento, ItemVarreduraDocumento } from './documento-comum.js'

export type StatusVarreduraDocumento = 'nao_avaliado' | 'sem_exposicao' | 'exposicao_identificada' | 'nao_aplicavel'

export interface AnexoVarreduraDocumento {
  anexoId: string
  numero: string
  tema: string
  status: StatusVarreduraDocumento
  conclusao: string
  temAvaliacao: boolean
}

export interface PendenciaVarreduraDocumento {
  norma: 'NR-15' | 'NR-16'
  anexo: string
  motivo: 'não avaliado' | 'sem avaliação detalhada' | 'sem conclusão individual' | 'sem eficácia do EPI'
}

interface TecnicoVarreduraDocumento {
  agentes?: AgenteDocumento[]
  varreduraNr15?: ItemVarreduraDocumento[]
  varreduraNr16?: ItemVarreduraDocumento[]
}

interface CatalogoAnexo { anexoId: string; numero: string; tema: string; statusFixo?: StatusVarreduraDocumento }

export const CATALOGO_VARREDURA_NR15: readonly CatalogoAnexo[] = [
  { anexoId: 'ANEXO_01', numero: '1', tema: 'Ruído contínuo ou intermitente' },
  { anexoId: 'ANEXO_02', numero: '2', tema: 'Ruído de impacto' },
  { anexoId: 'ANEXO_03', numero: '3', tema: 'Calor' },
  { anexoId: 'ANEXO_04', numero: '4', tema: 'Revogado', statusFixo: 'nao_aplicavel' },
  { anexoId: 'ANEXO_05', numero: '5', tema: 'Radiações ionizantes' },
  { anexoId: 'ANEXO_06', numero: '6', tema: 'Condições hiperbáricas' },
  { anexoId: 'ANEXO_07', numero: '7', tema: 'Radiações não ionizantes' },
  { anexoId: 'ANEXO_08', numero: '8', tema: 'Vibrações' },
  { anexoId: 'ANEXO_09', numero: '9', tema: 'Frio' },
  { anexoId: 'ANEXO_10', numero: '10', tema: 'Umidade' },
  { anexoId: 'ANEXO_11', numero: '11', tema: 'Agentes químicos com limite de tolerância' },
  { anexoId: 'ANEXO_12', numero: '12', tema: 'Poeiras minerais' },
  { anexoId: 'ANEXO_13', numero: '13', tema: 'Agentes químicos' },
  { anexoId: 'ANEXO_14', numero: '14', tema: 'Agentes biológicos' },
]

export const CATALOGO_VARREDURA_NR16: readonly CatalogoAnexo[] = [
  { anexoId: 'ANEXO_01', numero: '1', tema: 'Explosivos' },
  { anexoId: 'ANEXO_02', numero: '2', tema: 'Inflamáveis' },
  { anexoId: 'ANEXO_03', numero: '3', tema: 'Segurança pessoal ou patrimonial' },
  { anexoId: 'ANEXO_04', numero: '4', tema: 'Energia elétrica' },
  { anexoId: 'ANEXO_05', numero: '5', tema: 'Motocicleta' },
  { anexoId: 'ANEXO_06', numero: '6', tema: 'Agentes das autoridades de trânsito' },
  { anexoId: 'ANEXO_RADIACOES', numero: '(*)', tema: 'Radiações ionizantes ou substâncias radioativas' },
]

export function anexoLegalNr15(anexoId?: string): string | undefined {
  if (!anexoId) return undefined
  if (anexoId.startsWith('ANEXO_08')) return 'ANEXO_08'
  if (anexoId.startsWith('ANEXO_12')) return 'ANEXO_12'
  if (anexoId === 'ANEXO_13A') return 'ANEXO_13'
  return anexoId
}

function conclusaoPadrao(norma: 'NR-15' | 'NR-16', item: CatalogoAnexo, status: StatusVarreduraDocumento): string {
  if (status === 'nao_aplicavel') return 'Anexo revogado — não aplicável.'
  if (status === 'sem_exposicao') return norma === 'NR-15'
    ? `Não foi identificada exposição ocupacional enquadrável no Anexo ${item.numero} da NR-15.`
    : `Não foi identificada atividade ou operação perigosa enquadrável no Anexo ${item.numero} da NR-16.`
  if (status === 'exposicao_identificada') return 'Exposição identificada — ver avaliação técnica detalhada.'
  return 'Avaliação pendente.'
}

function montarItens(
  norma: 'NR-15' | 'NR-16',
  catalogo: readonly CatalogoAnexo[],
  persistidos: ItemVarreduraDocumento[] | undefined,
  agentes: AgenteDocumento[],
): AnexoVarreduraDocumento[] {
  return catalogo.map((item) => {
    const temAgente = agentes.some((agente) => norma === 'NR-15'
      ? agente.tipo !== 'periculosidade' && (item.anexoId === 'ANEXO_13A'
        ? agente.anexoNr15 === 'ANEXO_13A'
        : anexoLegalNr15(agente.anexoNr15) === item.anexoId)
      : agente.tipo === 'periculosidade' && agente.anexoNr16 === item.anexoId)
    const persistido = persistidos?.find((registro) => registro.anexoId === item.anexoId)
    const status = item.statusFixo ?? (temAgente ? 'exposicao_identificada' : persistido?.status ?? 'nao_avaliado')
    return { ...item, status, conclusao: persistido?.conclusao?.trim() || conclusaoPadrao(norma, item, status), temAvaliacao: temAgente }
  })
}

export function normalizarVarredura(tecnico: TecnicoVarreduraDocumento, modalidade: string) {
  const agentes = tecnico.agentes ?? []
  const tem13A = agentes.some((agente) => agente.tipo !== 'periculosidade' && agente.anexoNr15 === 'ANEXO_13A')
  const registro13A = tecnico.varreduraNr15?.find((item) => item.anexoId === 'ANEXO_13A')
  return {
    nr15: modalidade === 'periculosidade' ? [] : montarItens('NR-15', CATALOGO_VARREDURA_NR15, tecnico.varreduraNr15, agentes),
    nr15Complementares: modalidade === 'periculosidade' || (!tem13A && !registro13A)
      ? []
      : montarItens('NR-15', [{ anexoId: 'ANEXO_13A', numero: '13-A', tema: 'Benzeno' }], tecnico.varreduraNr15, agentes),
    nr16: modalidade === 'insalubridade' ? [] : montarItens('NR-16', CATALOGO_VARREDURA_NR16, tecnico.varreduraNr16, agentes),
  }
}

export function pendenciasVarredura(tecnico: TecnicoVarreduraDocumento, modalidade: string): PendenciaVarreduraDocumento[] {
  const normalizada = normalizarVarredura(tecnico, modalidade)
  const pendencias: PendenciaVarreduraDocumento[] = []
  const verificar = (norma: 'NR-15' | 'NR-16', itens: AnexoVarreduraDocumento[]) => {
    for (const item of itens) {
      if (item.status === 'nao_avaliado') pendencias.push({ norma, anexo: item.numero, motivo: 'não avaliado' })
      if (item.status === 'exposicao_identificada') {
        const avaliacoes = (tecnico.agentes ?? []).filter((agente) => norma === 'NR-15'
          ? agente.tipo !== 'periculosidade' && (item.anexoId === 'ANEXO_13A'
            ? agente.anexoNr15 === 'ANEXO_13A'
            : anexoLegalNr15(agente.anexoNr15) === item.anexoId)
          : agente.tipo === 'periculosidade' && agente.anexoNr16 === item.anexoId)
        if (!avaliacoes.length) {
          pendencias.push({ norma, anexo: item.numero, motivo: 'sem avaliação detalhada' })
          continue
        }
        if (norma === 'NR-15') {
          if (avaliacoes.some((agente) => !agente.observacao?.trim())) pendencias.push({ norma, anexo: item.numero, motivo: 'sem conclusão individual' })
          if (avaliacoes.some((agente) => agente.epis?.length && typeof agente.epiEficaz !== 'boolean')) pendencias.push({ norma, anexo: item.numero, motivo: 'sem eficácia do EPI' })
        } else if (avaliacoes.some((agente) => !agente.resultadoPericulosidade && !agente.resultadoPericulosidadeTexto?.trim())) {
          pendencias.push({ norma, anexo: item.numero, motivo: 'sem conclusão individual' })
        }
      }
    }
  }
  verificar('NR-15', [...normalizada.nr15, ...normalizada.nr15Complementares])
  verificar('NR-16', normalizada.nr16)
  return pendencias
}
