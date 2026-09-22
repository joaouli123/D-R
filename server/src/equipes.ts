import { prisma } from './prisma.js'
import { alcanca, idsDaSubarvore } from './tenancy.js'

// ============================================================
// Consultas de equipe — a ponte entre a regra pura (tenancy.ts) e
// o banco. A árvore é pequena (uma linha por equipe, dezenas no
// máximo), então é lida inteira: uma consulta simples, sem CTE
// recursiva para manter e sem N+1.
// ============================================================

/** Todas as equipes, só o necessário para navegar a hierarquia. */
export function carregarEquipes() {
  return prisma.organizacao.findMany({
    select: { id: true, paiId: true, nome: true, licencaId: true, licenca: { select: { nome: true } } },
  })
}

/** Ids da equipe e de todas as que estão abaixo dela. */
export async function equipesAlcancadas(organizacaoId: string): Promise<string[]> {
  return idsDaSubarvore(await carregarEquipes(), organizacaoId)
}

/** `true` se `gestorId` é `alvoId` ou está acima dela na hierarquia. */
export async function equipeAlcanca(gestorId: string, alvoId: string): Promise<boolean> {
  return alcanca(await carregarEquipes(), gestorId, alvoId)
}
