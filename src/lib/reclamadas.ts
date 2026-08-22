import type { Empresa, Reclamada } from '@/types'

/**
 * Quem é reclamada é a empresa *dentro de um processo*, não a empresa em
 * si — a mesma pode ser reclamada num caso e nem aparecer em outro. Por
 * isso a regra vive aqui, e não num campo do cadastro de empresas.
 *
 * O servidor repete a checagem em `POST /pericias` (server/src/routes/
 * pericias.ts). Os dois precisam mudar juntos: a tela evita o engano, a
 * API é a última porta antes do banco.
 */

/** Empresas que ainda não foram vinculadas a este processo. */
export function empresasLivres(empresas: Empresa[], reclamadas: Reclamada[]): Empresa[] {
  return empresas.filter((e) => !reclamadas.some((r) => r.empresaId === e.id))
}

/**
 * O que uma linha pode oferecer no seletor: as livres mais a que ela
 * própria já usa — sem esta, o campo se esvaziaria ao ser preenchido.
 */
export function opcoesDaLinha(
  empresas: Empresa[],
  reclamadas: Reclamada[],
  linha: Reclamada,
): Empresa[] {
  return empresas.filter(
    (e) => e.id === linha.empresaId || !reclamadas.some((r) => r.id !== linha.id && r.empresaId === e.id),
  )
}

/**
 * Acrescenta o vínculo se a empresa ainda não estiver no processo.
 *
 * É o atalho "usar em perícia" da tela de Clientes: ali a empresa foi
 * escolhida a dedo, então chega já selecionada — o que a tela da perícia
 * não faz sozinha é *decidir* por quem ninguém escolheu.
 */
export function comEmpresaVinculada(
  reclamadas: Reclamada[],
  empresaId: string,
  novoId: string,
): Reclamada[] {
  if (reclamadas.some((r) => r.empresaId === empresaId)) return reclamadas
  return [...reclamadas, { id: novoId, empresaId, principal: reclamadas.length === 0 }]
}

/**
 * Descarta linhas em branco e vínculos repetidos. A ficha do laudo
 * imprime uma linha "Reclamada" por vínculo: repetido, a empresa sai
 * duas vezes no documento entregue ao juízo.
 */
export function semRepetidas(reclamadas: Reclamada[]): Reclamada[] {
  return reclamadas.filter(
    (r, i, todas) => r.empresaId !== '' && todas.findIndex((x) => x.empresaId === r.empresaId) === i,
  )
}
