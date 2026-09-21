import { describe, expect, it } from 'vitest'
import {
  ORGANIZACAO_RAIZ_ID,
  alcanca,
  arvoreOrdenada,
  ehEquipePrincipal,
  idsDaSubarvore,
  type NoDeEquipe,
} from './tenancy.js'

// principal
// ├── clinica
// │   └── clinica-sul
// └── escritorio
// externa (outra árvore, sem ligação com a principal)
const PRINCIPAL = ORGANIZACAO_RAIZ_ID
const equipes: Array<NoDeEquipe & { nome: string }> = [
  { id: PRINCIPAL, paiId: null, nome: 'D&R Perícia Elite' },
  { id: 'escritorio', paiId: PRINCIPAL, nome: 'Escritório Beta' },
  { id: 'clinica', paiId: PRINCIPAL, nome: 'Clínica Alfa' },
  { id: 'clinica-sul', paiId: 'clinica', nome: 'Clínica Alfa — Sul' },
  { id: 'externa', paiId: null, nome: 'Outra árvore' },
]

describe('idsDaSubarvore', () => {
  it('inclui a própria equipe e todas as descendentes', () => {
    expect(idsDaSubarvore(equipes, PRINCIPAL).sort()).toEqual(
      [PRINCIPAL, 'clinica', 'clinica-sul', 'escritorio'].sort(),
    )
    expect(idsDaSubarvore(equipes, 'clinica').sort()).toEqual(['clinica', 'clinica-sul'])
  })

  it('uma folha alcança só a si mesma', () => {
    expect(idsDaSubarvore(equipes, 'clinica-sul')).toEqual(['clinica-sul'])
  })

  it('nunca sobe: uma filha não alcança a mãe nem as irmãs', () => {
    const alcance = idsDaSubarvore(equipes, 'clinica')
    expect(alcance).not.toContain(PRINCIPAL)
    expect(alcance).not.toContain('escritorio')
  })

  it('não atravessa para outra árvore', () => {
    expect(idsDaSubarvore(equipes, PRINCIPAL)).not.toContain('externa')
    expect(idsDaSubarvore(equipes, 'externa')).toEqual(['externa'])
  })

  it('equipe inexistente não alcança nada (nunca "tudo")', () => {
    expect(idsDaSubarvore(equipes, 'fantasma')).toEqual([])
  })

  it('um ciclo nos dados não trava a busca', () => {
    const ciclo: NoDeEquipe[] = [
      { id: 'a', paiId: 'b' },
      { id: 'b', paiId: 'a' },
    ]
    expect(idsDaSubarvore(ciclo, 'a').sort()).toEqual(['a', 'b'])
  })
})

describe('alcanca', () => {
  it('a mãe alcança a filha e a neta, e a equipe alcança a si mesma', () => {
    expect(alcanca(equipes, PRINCIPAL, 'clinica-sul')).toBe(true)
    expect(alcanca(equipes, 'clinica', 'clinica')).toBe(true)
  })

  it('a filha não alcança a mãe, a irmã nem outra árvore', () => {
    expect(alcanca(equipes, 'clinica', PRINCIPAL)).toBe(false)
    expect(alcanca(equipes, 'clinica', 'escritorio')).toBe(false)
    expect(alcanca(equipes, 'clinica', 'externa')).toBe(false)
  })
})

describe('arvoreOrdenada', () => {
  it('põe cada equipe antes das filhas, com o nível, irmãs em ordem alfabética', () => {
    expect(arvoreOrdenada(equipes, PRINCIPAL).map((e) => [e.id, e.nivel])).toEqual([
      [PRINCIPAL, 0],
      ['clinica', 1],
      ['clinica-sul', 2],
      ['escritorio', 1],
    ])
  })

  it('a partir de uma filha, ela vira o nível 0 e a mãe some', () => {
    expect(arvoreOrdenada(equipes, 'clinica').map((e) => [e.id, e.nivel])).toEqual([
      ['clinica', 0],
      ['clinica-sul', 1],
    ])
  })

  it('não devolve equipes de fora do alcance', () => {
    expect(arvoreOrdenada(equipes, 'clinica').map((e) => e.id)).not.toContain('externa')
  })
})

describe('ehEquipePrincipal', () => {
  it('só a equipe raiz é a principal', () => {
    expect(ehEquipePrincipal(PRINCIPAL)).toBe(true)
    expect(ehEquipePrincipal('clinica')).toBe(false)
  })
})
