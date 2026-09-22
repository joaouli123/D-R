// ============================================================
// Licenças e equipes — a base do multi-tenant.
//
// A LICENÇA é o inquilino: uma empresa cliente. O trabalho (empresas,
// perícias, documentos) pertence à licença e só é lido por quem é dela;
// uma licença nunca enxerga o conteúdo de outra.
//
// Dentro da licença, cada usuário pertence a UMA equipe. As equipes
// compartilham o trabalho da licença; a árvore entre elas serve para
// gerir os ACESSOS — a mãe cria equipes e usuários abaixo, edita,
// desativa, troca senha, exclui.
//
// Este módulo é puro (sem banco, sem Express) para que a regra de
// quem-alcança-quem seja testável sozinha. As consultas ficam em
// equipes.ts.
// ============================================================

/**
 * Equipe raiz: a do perito titular. Todo dado que já existia antes do
 * multi-tenant foi atribuído a ela pela migração
 * 20260921180000_multitenant_equipes, que insere a linha com este mesmo id.
 * A equipe principal de cada licença cliente fica logo abaixo dela.
 */
export const ORGANIZACAO_RAIZ_ID = '00000000-0000-4000-8000-000000000001'

/**
 * Licença principal: a do perito titular, dono da plataforma — é de lá que as
 * licenças clientes são criadas e geridas. Inserida com este mesmo id pela
 * migração 20260921200000_licencas.
 */
export const LICENCA_PRINCIPAL_ID = '00000000-0000-4000-8000-000000000002'

/** O mínimo que a hierarquia precisa saber de uma equipe. */
export interface NoDeEquipe {
  id: string
  paiId: string | null
}

export const ehEquipePrincipal = (organizacaoId: string): boolean =>
  organizacaoId === ORGANIZACAO_RAIZ_ID

/**
 * Ids da equipe `raizId` e de todas as que estão abaixo dela, a própria
 * primeiro. Volta vazio se a equipe não existe — quem chama trata isso
 * como "fora do alcance", nunca como "tudo".
 */
export function idsDaSubarvore(equipes: readonly NoDeEquipe[], raizId: string): string[] {
  if (!equipes.some((e) => e.id === raizId)) return []

  const filhasDe = new Map<string, string[]>()
  for (const equipe of equipes) {
    if (equipe.paiId === null) continue
    const irmas = filhasDe.get(equipe.paiId)
    if (irmas) irmas.push(equipe.id)
    else filhasDe.set(equipe.paiId, [equipe.id])
  }

  // Busca em largura. O `vistos` só existe para um ciclo nunca prender o
  // laço — o banco não deveria ter um, mas um dado ruim não pode travar a API.
  const vistos = new Set<string>([raizId])
  const ordem = [raizId]
  for (let i = 0; i < ordem.length; i++) {
    for (const filha of filhasDe.get(ordem[i]!) ?? []) {
      if (vistos.has(filha)) continue
      vistos.add(filha)
      ordem.push(filha)
    }
  }
  return ordem
}

/** `true` se `alvoId` é a própria equipe `gestorId` ou uma das suas descendentes. */
export function alcanca(
  equipes: readonly NoDeEquipe[],
  gestorId: string,
  alvoId: string,
): boolean {
  return idsDaSubarvore(equipes, gestorId).includes(alvoId)
}

/**
 * Equipes da subárvore em ordem de exibição (cada equipe seguida das suas
 * filhas, irmãs em ordem alfabética), com a profundidade para a tela indentar.
 */
export function arvoreOrdenada<T extends NoDeEquipe & { nome: string }>(
  equipes: readonly T[],
  raizId: string,
): Array<T & { nivel: number }> {
  const alcancaveis = new Set(idsDaSubarvore(equipes, raizId))
  const dentro = equipes.filter((e) => alcancaveis.has(e.id))

  const filhasDe = new Map<string, T[]>()
  for (const equipe of dentro) {
    if (equipe.paiId === null || equipe.id === raizId) continue
    const irmas = filhasDe.get(equipe.paiId)
    if (irmas) irmas.push(equipe)
    else filhasDe.set(equipe.paiId, [equipe])
  }

  const porNome = (a: T, b: T) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  const saida: Array<T & { nivel: number }> = []

  const visitar = (equipe: T, nivel: number) => {
    saida.push({ ...equipe, nivel })
    for (const filha of (filhasDe.get(equipe.id) ?? []).sort(porNome)) visitar(filha, nivel + 1)
  }

  const raiz = dentro.find((e) => e.id === raizId)
  if (raiz) visitar(raiz, 0)
  return saida
}
