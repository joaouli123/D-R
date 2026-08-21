import { describe, expect, it } from 'vitest'

import { empresasLivres, opcoesDaLinha, semRepetidas } from './reclamadas'
import type { Empresa, Reclamada } from '@/types'

const empresa = (id: string, razaoSocial: string): Empresa =>
  ({ id, razaoSocial, cnpj: `${id}-cnpj` }) as Empresa

const AURORA = empresa('emp-1', 'Aurora')
const BOREAL = empresa('emp-2', 'Boreal')
const CYKLOP = empresa('emp-3', 'Cyklop')
const TODAS = [AURORA, BOREAL, CYKLOP]

const vinculo = (id: string, empresaId: string): Reclamada => ({ id, empresaId, principal: false })

describe('empresasLivres', () => {
  it('esconde as que já estão no processo', () => {
    expect(empresasLivres(TODAS, [vinculo('r1', 'emp-2')])).toEqual([AURORA, CYKLOP])
  })

  it('linha em branco não consome empresa nenhuma', () => {
    expect(empresasLivres(TODAS, [vinculo('r1', '')])).toEqual(TODAS)
  })

  it('devolve vazio quando todas já foram vinculadas', () => {
    const cheia = TODAS.map((e, i) => vinculo(`r${i}`, e.id))
    expect(empresasLivres(TODAS, cheia)).toEqual([])
  })
})

describe('opcoesDaLinha', () => {
  it('mantém a empresa da própria linha, senão o campo esvaziaria', () => {
    const linha = vinculo('r1', 'emp-2')
    expect(opcoesDaLinha(TODAS, [linha], linha)).toEqual(TODAS)
  })

  it('tira as escolhidas nas outras linhas', () => {
    const linha = vinculo('r1', 'emp-1')
    const reclamadas = [linha, vinculo('r2', 'emp-3')]
    expect(opcoesDaLinha(TODAS, reclamadas, linha)).toEqual([AURORA, BOREAL])
  })
})

describe('semRepetidas', () => {
  it('guarda só o primeiro vínculo de cada empresa', () => {
    // Foi o que aconteceu na perícia do Edmar: a mesma empresa três vezes.
    const repetida = [vinculo('r1', 'emp-2'), vinculo('r2', 'emp-2'), vinculo('r3', 'emp-2')]
    expect(semRepetidas(repetida)).toEqual([vinculo('r1', 'emp-2')])
  })

  it('descarta linha ainda em branco', () => {
    expect(semRepetidas([vinculo('r1', ''), vinculo('r2', 'emp-1')])).toEqual([vinculo('r2', 'emp-1')])
  })

  it('não mexe numa lista já correta', () => {
    const certa = [vinculo('r1', 'emp-1'), vinculo('r2', 'emp-3')]
    expect(semRepetidas(certa)).toEqual(certa)
  })
})
