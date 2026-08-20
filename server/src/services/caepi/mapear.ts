// ============================================================
// Linha bruta do CSV → registro do espelho.
//
// Função pura de propósito: é o ponto onde os defeitos da base
// oficial viram (ou não) dado confiável, e é o que os testes cobrem
// sem precisar de rede nem de banco.
//
// GRÃO DOS DADOS — medido sobre a base de 20/08/2026 (124.067 linhas):
//
//   • 42.321 números de CA distintos
//   • 42.343 pares (CA, processo) distintos
//
// Ou seja, a base repete o mesmo CA uma vez por norma técnica e por
// laudo de laboratório — em média 2 linhas, chegando a 57. Isso é
// redundância, não histórico: dentro de um mesmo (CA, processo) só
// variam NORMA, NR LAUDO e o laboratório.
//
// O histórico de verdade são os 22 CAs que têm mais de um processo
// de homologação, com validades diferentes. Exemplo real: o CA 14168
// (protetor auditivo) valeu até 07/01/2009 num processo e até
// 12/06/2014 em outro. Numa perícia que examina 2010, colapsar os
// dois num registro só produziria afirmação errada no laudo.
//
// Por isso o grão aqui é (numeroCa, processo), com as normas e os
// laudos agregados em lista.
// ============================================================

import type { LinhaCaepi } from './csv.js'
import { classificarEquipamento } from './classificar.js'
import { limparTexto, normalizarData, normalizarNumeroCa, normalizarSituacao, type SituacaoCa } from './normalizar.js'

/** Laudo de ensaio e o laboratório que o emitiu. */
export interface LaudoCa {
  numero: string | null
  cnpjLaboratorio: string | null
  razaoLaboratorio: string | null
}

export interface RegistroCa {
  numeroCa: string
  processo: string
  dataValidade: string | null
  situacao: SituacaoCa
  cnpj: string | null
  razaoSocial: string | null
  natureza: string | null
  equipamento: string
  descricao: string | null
  marca: string | null
  referencia: string | null
  cor: string | null
  aprovadoParaLaudo: string | null
  restricaoLaudo: string | null
  observacaoLaudo: string | null
  /** Normas técnicas de ensaio, agregadas das linhas repetidas. */
  normas: string[]
  /** Laudos de ensaio, agregados das linhas repetidas. */
  laudos: LaudoCa[]
  categoria: string
  anexos: string[]
  exigeNrrsf: boolean
  descontinuado: boolean
}

/** Identidade do registro no espelho. */
export function chaveRegistro(registro: Pick<RegistroCa, 'numeroCa' | 'processo'>): string {
  return `${registro.numeroCa}|${registro.processo}`
}

/**
 * Converte uma linha do CSV oficial.
 *
 * Devolve null quando falta CA ou processo — sem os dois não há
 * identidade, e o registro não serviria nem para busca. Na base de
 * 20/08/2026 nenhuma linha caiu nesse caso, mas a checagem fica
 * porque é a única coisa entre um CSV torto e um laudo errado.
 */
export function mapearLinha(linha: LinhaCaepi): RegistroCa | null {
  const numeroCa = normalizarNumeroCa(linha['NR Registro CA'])
  if (!numeroCa) return null

  const processo = limparTexto(linha['NR DO PROCESSO'])
  if (!processo) return null

  const equipamento = limparTexto(linha.EQUIPAMENTO) ?? 'NÃO INFORMADO'
  const classificacao = classificarEquipamento(equipamento)

  const norma = limparTexto(linha.NORMA)
  const numeroLaudo = limparTexto(linha['NR LAUDO'])
  const cnpjLaboratorio = limparTexto(linha['CNPJ LABORATORIO'])
  const razaoLaboratorio = limparTexto(linha['RAZAO SOCIAL LABORATORIO'])
  const temLaudo = numeroLaudo || cnpjLaboratorio || razaoLaboratorio

  return {
    numeroCa,
    processo,
    dataValidade: normalizarData(linha['DATA DE VALIDADE']),
    situacao: normalizarSituacao(linha.SITUACAO),
    cnpj: limparTexto(linha.CNPJ),
    razaoSocial: limparTexto(linha['RAZAO SOCIAL']),
    natureza: limparTexto(linha.NATUREZA),
    equipamento,
    descricao: limparTexto(linha['DESCRICAO EQUIPAMENTO']),
    marca: limparTexto(linha['MARCA CA']),
    referencia: limparTexto(linha.REFERENCIA),
    cor: limparTexto(linha.COR),
    aprovadoParaLaudo: limparTexto(linha['APROVADO PARA LAUDO']),
    restricaoLaudo: limparTexto(linha['RESTRICAO LAUDO']),
    observacaoLaudo: limparTexto(linha['OBSERVACAO ANALISE LAUDO']),
    normas: norma ? [norma] : [],
    laudos: temLaudo ? [{ numero: numeroLaudo, cnpjLaboratorio, razaoLaboratorio }] : [],
    categoria: classificacao.categoria,
    anexos: classificacao.anexos,
    exigeNrrsf: classificacao.exigeNrrsf,
    descontinuado: classificacao.descontinuado,
  }
}

function identidadeLaudo(laudo: LaudoCa): string {
  return `${laudo.numero ?? ''}|${laudo.cnpjLaboratorio ?? ''}|${laudo.razaoLaboratorio ?? ''}`
}

/**
 * Junta duas linhas do mesmo (CA, processo).
 *
 * Só normas e laudos se acumulam. Nos demais campos vale a última
 * linha lida — medido na base real, apenas 2 dos 42.343 grupos têm
 * divergência em descrição, marca ou referência, e nesses casos as
 * duas versões são igualmente oficiais.
 */
export function mesclarRegistros(anterior: RegistroCa, novo: RegistroCa): RegistroCa {
  const normas = new Set([...anterior.normas, ...novo.normas])

  const laudos = new Map(anterior.laudos.map((laudo) => [identidadeLaudo(laudo), laudo]))
  for (const laudo of novo.laudos) laudos.set(identidadeLaudo(laudo), laudo)

  return {
    ...novo,
    normas: [...normas].sort(),
    laudos: [...laudos.values()],
  }
}
