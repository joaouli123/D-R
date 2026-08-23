// ============================================================
// Grau de risco da NR-04 a partir do CNAE do cadastro.
//
// O grau de risco dimensiona o SESMT e abre o laudo na descrição da
// empresa. Ele não é opinião: o Anexo I da NR-04 atribui um grau a
// cada classe da CNAE 2.0, e o CNAE da empresa está no cadastro da
// Receita que a consulta já traz.
//
// O que continua sendo leitura do perito é *qual atividade* responde
// pelo setor avaliado — uma metalúrgica com CNAE de comércio existe.
// Por isso a resposta diz de qual classe o grau saiu: quem confere
// precisa ver a premissa, não só o número.
// ============================================================

import { GRAU_POR_CLASSE_CNAE, type GrauRisco } from './nr04-anexo1.js'

export type { GrauRisco }

export interface GrauDeRisco {
  grau: GrauRisco
  /** A classe que a norma usa, no formato do Anexo I ("25.11-0"). */
  classe: string
}

/**
 * Aceita o CNAE em qualquer forma que circule por aqui: subclasse
 * formatada ("25.11-0-00"), subclasse crua ("2511000") ou a própria
 * classe. Menos de cinco dígitos não identifica classe nenhuma.
 */
export function grauDeRiscoDoCnae(cnae: string | null | undefined): GrauDeRisco | null {
  const digitos = String(cnae ?? '').replace(/\D/g, '')
  if (digitos.length < 5) return null

  const classe = `${digitos.slice(0, 2)}.${digitos.slice(2, 4)}-${digitos.slice(4, 5)}`
  const grau = GRAU_POR_CLASSE_CNAE[classe]
  return grau ? { grau, classe } : null
}
