import type { AgenteAvaliado, ItemVarreduraNormativa, PreenchimentoTecnico, StatusVarredura } from '@/types'
import { temAnexoNr16Valido } from '@/content/anexosNr16'
import { camposPendentesAgente, type CampoPendenteAgente } from './conclusoesAgentes'

// Espelho: server/src/services/varredura-normativa.ts. Os dois mudam juntos —
// a tela mostra as pendências, a API recusa a emissão com as mesmas regras.

export interface AnexoVarredura {
  anexoId: string
  numero: string
  tema: string
  status: StatusVarredura
  conclusao: string
  temAvaliacao: boolean
}

export interface VarreduraNormalizada {
  nr15: AnexoVarredura[]
  nr15Complementares: AnexoVarredura[]
  nr16: AnexoVarredura[]
}

export type MotivoPendencia =
  | 'não avaliado'
  | 'sem avaliação detalhada'
  | 'sem avaliação registrada'
  | 'sem conclusão individual'
  | 'sem eficácia do EPI'
  | 'sem anexo da NR-16'

/**
 * Uma coisa que falta para emitir. Pendência de anexo leva `anexoId`;
 * pendência de avaliação leva `agenteId` e o `campo` que a resolve — é o que
 * permite à tela levar o perito direto até o campo, em vez de só nomear o
 * problema.
 */
export interface PendenciaVarredura {
  norma: 'NR-15' | 'NR-16'
  /** Número do anexo como sai no laudo ("1", "13-A", "(*)"); vazio quando a avaliação ainda não tem anexo. */
  anexo: string
  anexoId?: string
  tema?: string
  motivo: MotivoPendencia
  agenteId?: string
  agenteNome?: string
  campo?: CampoPendenteAgente
}

type TecnicoVarredura = Pick<PreenchimentoTecnico, 'agentes'> &
  Partial<Pick<PreenchimentoTecnico, 'varreduraNr15' | 'varreduraNr16'>>

interface CatalogoAnexo {
  anexoId: string
  numero: string
  tema: string
  statusFixo?: StatusVarredura
}

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

const ANEXO_13A: CatalogoAnexo = { anexoId: 'ANEXO_13A', numero: '13-A', tema: 'Benzeno' }

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

/**
 * "Exposição identificada" afirmava, no próprio quadro do laudo, que a
 * exposição foi constatada — antes de a avaliação concluir qualquer coisa.
 * O perito pediu redação que diga só que a situação foi avaliada; o
 * enquadramento fica com a conclusão de cada avaliação.
 */
function conclusaoPadrao(norma: 'NR-15' | 'NR-16', item: CatalogoAnexo, status: StatusVarredura): string {
  if (status === 'nao_aplicavel') return 'Anexo revogado — não aplicável.'
  if (status === 'sem_exposicao') {
    return norma === 'NR-15'
      ? `Não foi identificada exposição ocupacional enquadrável no Anexo ${item.numero} da NR-15.`
      : `Não foi identificada atividade ou operação perigosa enquadrável no Anexo ${item.numero} da NR-16.`
  }
  if (status === 'exposicao_identificada') {
    return norma === 'NR-15'
      ? `Suposta exposição submetida à avaliação técnica detalhada do Anexo ${item.numero} da NR-15; o enquadramento consta da conclusão individual.`
      : `Suposta atividade ou operação perigosa submetida à avaliação técnica detalhada do Anexo ${item.numero} da NR-16; o enquadramento consta do resultado da avaliação.`
  }
  return 'Avaliação pendente.'
}

function avaliacaoNr15DoAnexo(agente: AgenteAvaliado, anexoId: string): boolean {
  if (agente.tipo === 'periculosidade') return false
  return anexoId === 'ANEXO_13A'
    ? agente.anexoNr15 === 'ANEXO_13A'
    : anexoLegalNr15(agente.anexoNr15) === anexoId
}

function avaliacaoNr16DoAnexo(agente: AgenteAvaliado, anexoId: string): boolean {
  return agente.tipo === 'periculosidade' && agente.anexoNr16 === anexoId
}

function avaliacaoNr16Concluida(agente: AgenteAvaliado): boolean {
  return Boolean(agente.resultadoPericulosidade || agente.resultadoPericulosidadeTexto?.trim())
}

/**
 * NR-15: o perito decide anexo a anexo no quadro da varredura.
 *
 * NR-16: o quadro não é mais preenchido à mão — sai das avaliações. Eram dois
 * painéis de periculosidade na mesma tela, e o de cima ainda falava a língua
 * antiga; o perito não sabia qual valia. Agora:
 * - anexo com avaliação → "Avaliação da suposta exposição";
 * - sem avaliação, com "Sem exposição" ou "Não aplicável" já gravado → mantém;
 * - sem avaliação, mas com alguma avaliação NR-16 concluída → "Sem exposição"
 *   (o perito concluiu a periculosidade e não apontou este anexo);
 * - do contrário → "Não avaliado".
 * Um "exposição identificada" gravado sem avaliação correspondente é
 * ignorado: era o painel antigo afirmando o que nenhuma avaliação sustenta.
 */
function montarItens(
  norma: 'NR-15' | 'NR-16',
  catalogo: readonly CatalogoAnexo[],
  persistidos: ItemVarreduraNormativa[] | undefined,
  agentes: AgenteAvaliado[],
): AnexoVarredura[] {
  const nr16Concluida = norma === 'NR-16'
    && agentes.some((agente) => agente.tipo === 'periculosidade' && avaliacaoNr16Concluida(agente))

  return catalogo.map((item) => {
    const temAgente = agentes.some((agente) => norma === 'NR-15'
      ? avaliacaoNr15DoAnexo(agente, item.anexoId)
      : avaliacaoNr16DoAnexo(agente, item.anexoId))
    const persistido = persistidos?.find((registro) => registro.anexoId === item.anexoId)

    let status: StatusVarredura
    if (item.statusFixo) status = item.statusFixo
    else if (temAgente) status = 'exposicao_identificada'
    else if (norma === 'NR-15') status = persistido?.status ?? 'nao_avaliado'
    else if (persistido?.status === 'sem_exposicao' || persistido?.status === 'nao_aplicavel') status = persistido.status
    else status = nr16Concluida ? 'sem_exposicao' : 'nao_avaliado'

    // A redação gravada só vale para o status em que foi escrita.
    const conclusaoPersistida = persistido?.status === status ? persistido.conclusao?.trim() : undefined
    return {
      ...item,
      status,
      conclusao: conclusaoPersistida || conclusaoPadrao(norma, item, status),
      temAvaliacao: temAgente,
    }
  })
}

export function normalizarVarredura(
  tecnico: TecnicoVarredura,
  modalidade: string,
): VarreduraNormalizada {
  const agentes = tecnico.agentes ?? []
  const tem13A = agentes.some((agente) => agente.tipo !== 'periculosidade' && agente.anexoNr15 === 'ANEXO_13A')
  const registro13A = tecnico.varreduraNr15?.find((item) => item.anexoId === 'ANEXO_13A')
  const complementar13A = tem13A || registro13A
    ? montarItens('NR-15', [ANEXO_13A], tecnico.varreduraNr15, agentes)
    : []

  return {
    nr15: modalidade === 'periculosidade'
      ? []
      : montarItens('NR-15', CATALOGO_VARREDURA_NR15, tecnico.varreduraNr15, agentes),
    nr15Complementares: modalidade === 'periculosidade' ? [] : complementar13A,
    nr16: modalidade === 'insalubridade'
      ? []
      : montarItens('NR-16', CATALOGO_VARREDURA_NR16, tecnico.varreduraNr16, agentes),
  }
}

/**
 * Quando o quadro da varredura entra no documento. O da NR-16 também entra
 * quando só há avaliações — desde que ele deixou de ser preenchido à mão, um
 * laudo novo não teria registro gravado nenhum.
 */
export function exibirQuadroVarredura(
  tecnico: Partial<TecnicoVarredura> | null | undefined,
): { nr15: boolean; nr16: boolean } {
  return {
    nr15: Boolean(tecnico?.varreduraNr15?.length),
    nr16: Boolean(tecnico?.varreduraNr16?.length)
      || Boolean(tecnico?.agentes?.some((agente) => agente.tipo === 'periculosidade')),
  }
}

export function atualizarStatusVarredura<T extends TecnicoVarredura>(
  tecnico: T,
  norma: 'NR-15' | 'NR-16',
  anexoId: string,
  status: StatusVarredura,
): T {
  const chave = norma === 'NR-15' ? 'varreduraNr15' : 'varreduraNr16'
  const atuais = tecnico[chave] ?? []
  const anterior = atuais.find((item) => item.anexoId === anexoId)
  const registro: ItemVarreduraNormativa = {
    ...anterior,
    anexoId,
    status,
  }
  return {
    ...tecnico,
    [chave]: [...atuais.filter((item) => item.anexoId !== anexoId), registro],
  }
}

const MOTIVO_DO_CAMPO: Record<CampoPendenteAgente, MotivoPendencia> = {
  observacao: 'sem conclusão individual',
  epiEficaz: 'sem eficácia do EPI',
  resultadoPericulosidade: 'sem conclusão individual',
  anexoNr16: 'sem anexo da NR-16',
}

function anexoNr15DoAgente(agente: AgenteAvaliado): CatalogoAnexo | undefined {
  if (agente.anexoNr15 === 'ANEXO_13A') return ANEXO_13A
  const legal = anexoLegalNr15(agente.anexoNr15)
  return CATALOGO_VARREDURA_NR15.find((item) => item.anexoId === legal)
}

function anexoNr16DoAgente(agente: AgenteAvaliado): CatalogoAnexo | undefined {
  if (!temAnexoNr16Valido(agente)) return undefined
  return CATALOGO_VARREDURA_NR16.find((item) => item.anexoId === agente.anexoNr16)
}

/**
 * Tudo o que impede a emissão, na ordem em que aparece na tela: quadro da
 * NR-15, avaliações NR-15, avaliações NR-16.
 *
 * As avaliações são verificadas TODAS, e não só as de anexo marcado: uma
 * avaliação sem anexo escapava da cobrança e travava a emissão mais adiante,
 * numa segunda mensagem.
 */
export function pendenciasVarredura(tecnico: TecnicoVarredura, modalidade: string): PendenciaVarredura[] {
  const normalizada = normalizarVarredura(tecnico, modalidade)
  const agentes = tecnico.agentes ?? []
  const pendencias: PendenciaVarredura[] = []

  if (modalidade !== 'periculosidade') {
    for (const item of [...normalizada.nr15, ...normalizada.nr15Complementares]) {
      const base = { norma: 'NR-15' as const, anexo: item.numero, anexoId: item.anexoId, tema: item.tema }
      if (item.status === 'nao_avaliado') pendencias.push({ ...base, motivo: 'não avaliado' })
      if (item.status === 'exposicao_identificada' && !item.temAvaliacao) {
        pendencias.push({ ...base, motivo: 'sem avaliação detalhada' })
      }
    }
    for (const agente of agentes) {
      if (agente.tipo === 'periculosidade') continue
      const anexo = anexoNr15DoAgente(agente)
      for (const campo of camposPendentesAgente(agente)) {
        pendencias.push({
          norma: 'NR-15',
          anexo: anexo?.numero ?? '',
          ...(anexo ? { anexoId: anexo.anexoId, tema: anexo.tema } : {}),
          motivo: MOTIVO_DO_CAMPO[campo],
          agenteId: agente.id,
          ...(agente.nome?.trim() ? { agenteNome: agente.nome.trim() } : {}),
          campo,
        })
      }
    }
  }

  if (modalidade !== 'insalubridade') {
    const avaliacoes = agentes.filter((agente) => agente.tipo === 'periculosidade')
    if (!avaliacoes.length && normalizada.nr16.some((item) => item.status === 'nao_avaliado')) {
      pendencias.push({ norma: 'NR-16', anexo: '', motivo: 'sem avaliação registrada' })
    }
    for (const agente of avaliacoes) {
      const anexo = anexoNr16DoAgente(agente)
      for (const campo of camposPendentesAgente(agente)) {
        pendencias.push({
          norma: 'NR-16',
          anexo: anexo?.numero ?? '',
          ...(anexo ? { anexoId: anexo.anexoId, tema: anexo.tema } : {}),
          motivo: MOTIVO_DO_CAMPO[campo],
          agenteId: agente.id,
          ...(agente.nome?.trim() ? { agenteNome: agente.nome.trim() } : {}),
          campo,
        })
      }
    }
  }

  return pendencias
}

const ACAO_DO_CAMPO: Record<CampoPendenteAgente, string> = {
  observacao: 'preencha a conclusão da avaliação',
  epiEficaz: 'informe se o EPI é eficaz',
  resultadoPericulosidade: 'informe o resultado da avaliação',
  anexoNr16: 'indique o anexo da NR-16 do enquadramento',
}

function quemDaPendencia(pendencia: PendenciaVarredura): string {
  const { norma, anexo } = pendencia
  if (pendencia.agenteNome) return `${pendencia.agenteNome}${anexo ? ` (Anexo ${anexo})` : ''}`
  if (anexo) return `avaliação do Anexo ${anexo}`
  return norma === 'NR-16' ? 'avaliação de periculosidade sem anexo' : 'agente sem nome'
}

/** O que fazer, sem repetir a norma e o anexo — para quando o lugar já está à vista. */
/**
 * Os anexos 8 e 12 não têm opção própria na lista de anexos — só os subtipos.
 * A pendência deles se resolve escolhendo o subtipo, e é isso que o aviso diz.
 */
const ESCOLHA_DE_SUBTIPO: Record<string, string> = {
  ANEXO_08: 'escolha o tipo de vibração (mãos e braços ou corpo inteiro) no campo "Anexo NR-15" da avaliação',
  ANEXO_12: 'escolha a poeira (asbesto, manganês ou sílica) no campo "Anexo NR-15" da avaliação',
}

export function exigeEscolhaDeSubtipo(anexoId: string | undefined): boolean {
  return Boolean(anexoId && ESCOLHA_DE_SUBTIPO[anexoId])
}

export function descreverAcaoPendencia(pendencia: PendenciaVarredura): string {
  switch (pendencia.motivo) {
    case 'não avaliado':
      return 'marque "Sem exposição" ou "Avaliação da suposta exposição"'
    case 'sem avaliação detalhada':
      return (pendencia.anexoId ? ESCOLHA_DE_SUBTIPO[pendencia.anexoId] : undefined) ?? 'registre a avaliação detalhada do agente'
    case 'sem avaliação registrada':
      return 'registre ao menos uma avaliação de periculosidade'
    default: {
      const acao = pendencia.campo ? ACAO_DO_CAMPO[pendencia.campo] : pendencia.motivo
      return `${quemDaPendencia(pendencia)} — ${acao}`
    }
  }
}

/** Uma frase que diz ONDE está o problema e O QUE fazer — não só o nome técnico da falta. */
export function descreverPendencia(pendencia: PendenciaVarredura): string {
  const { norma, anexo, tema } = pendencia
  const doAnexo = `${norma}, Anexo ${anexo}${tema ? ` (${tema})` : ''}`
  switch (pendencia.motivo) {
    case 'não avaliado':
    case 'sem avaliação detalhada':
      return `${doAnexo}: ${descreverAcaoPendencia(pendencia)}`
    case 'sem avaliação registrada':
      return `${norma}: nenhuma avaliação de periculosidade registrada`
    default: {
      const acao = pendencia.campo ? ACAO_DO_CAMPO[pendencia.campo] : pendencia.motivo
      return `${norma}, ${quemDaPendencia(pendencia)}: ${acao}`
    }
  }
}

/**
 * Resumo curto para o aviso e para a recusa da API. Os anexos ainda sem
 * decisão viram uma linha só por norma — catorze frases iguais escondiam a
 * pendência que de fato dava trabalho.
 */
export function resumirPendencias(pendencias: readonly PendenciaVarredura[], limite = 6): string {
  const partes: string[] = []
  const agrupadas = new Set<string>()
  for (const pendencia of pendencias) {
    if (pendencia.motivo !== 'não avaliado') {
      partes.push(descreverPendencia(pendencia))
      continue
    }
    if (agrupadas.has(pendencia.norma)) continue
    agrupadas.add(pendencia.norma)
    const doGrupo = pendencias.filter((p) => p.motivo === 'não avaliado' && p.norma === pendencia.norma)
    partes.push(doGrupo.length === 1
      ? descreverPendencia(pendencia)
      : `${pendencia.norma}, anexos sem decisão: ${doGrupo.map((p) => p.anexo).join(', ')}`)
  }
  const exibidas = partes.slice(0, limite)
  const restantes = partes.length - exibidas.length
  return exibidas.join('; ') + (restantes > 0 ? `; e mais ${restantes}` : '')
}

export function mensagemPendencias(pendencias: readonly PendenciaVarredura[]): string {
  return `Há pendências para emitir o documento: ${resumirPendencias(pendencias)}.`
}
