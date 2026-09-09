import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { ORDEM_SECAO_FOTO, fotosEmOrdemDeDocumento } from './documento-comum.js'
import {
  ORDEM_SECAO_FOTO as ORDEM_FRONT,
  fotosEmOrdemDeDocumento as ordenarFront,
} from '../../../src/lib/fotosDocumento'

// ============================================================
// A numeração "Fotografia N" é global e tem de ser idêntica na
// pré-visualização, no PDF e no DOCX. Como o front e a API são projetos
// separados, o ordenador existe em duas cópias e este teste é o que
// impede que elas divirjam.
//
// O bug que ele tranca: até a correção de server/src/routes/fotos.ts a
// coluna `ordem` era contada POR SEÇÃO, então a 1ª foto de "Ambiente" e a
// 1ª de "EPIs" empatavam em 1 e a legenda saía fora de sequência no
// documento. As perícias já gravadas continuam com esse empate — quem
// conserta o histórico é o ordenador, não a rota.
// ============================================================

const foto = (id: string, secao: string, ordem: number) => ({ id, secao, ordem })

const EMPATE = [
  foto('f-epi-1', 'epi', 1),
  foto('f-amb-1', 'ambiente', 1),
  foto('f-epi-2', 'epi', 2),
  foto('f-amb-2', 'ambiente', 2),
]

describe('ordenação das fotografias no documento', () => {
  it('segue a ordem das seções no documento, não a coluna ordem sozinha', () => {
    expect(fotosEmOrdemDeDocumento(EMPATE).map((f) => f.id)).toEqual([
      'f-amb-1',
      'f-amb-2',
      'f-epi-1',
      'f-epi-2',
    ])
  })

  it('põe produtos (item 6.4) antes de EPIs (item 8)', () => {
    expect(ORDEM_SECAO_FOTO.produtos).toBeLessThan(ORDEM_SECAO_FOTO.epi as number)
    expect(fotosEmOrdemDeDocumento([
      foto('f-epi', 'epi', 1),
      foto('f-prod', 'produtos', 9),
    ]).map((f) => f.id)).toEqual(['f-prod', 'f-epi'])
  })

  it('desempata pelo id para o resultado não depender do banco', () => {
    expect(fotosEmOrdemDeDocumento([
      foto('f-b', 'ambiente', 1),
      foto('f-a', 'ambiente', 1),
    ]).map((f) => f.id)).toEqual(['f-a', 'f-b'])
  })

  it('não perde foto de seção desconhecida — ela vai para o fim', () => {
    const ordenadas = fotosEmOrdemDeDocumento([
      foto('f-nova', 'secao-que-ainda-nao-existe', 1),
      foto('f-amb', 'ambiente', 9),
    ])
    expect(ordenadas.map((f) => f.id)).toEqual(['f-amb', 'f-nova'])
  })

  it('não muda a lista recebida', () => {
    const original = [...EMPATE]
    fotosEmOrdemDeDocumento(EMPATE)
    expect(EMPATE).toEqual(original)
  })

  it('ordena igual no front', () => {
    expect(ORDEM_FRONT).toEqual(ORDEM_SECAO_FOTO)
    expect(ordenarFront(EMPATE)).toEqual(fotosEmOrdemDeDocumento(EMPATE))
  })

  it('mantém o aviso de espelhamento nos dois arquivos', () => {
    const caminho = (relativo: string) => fileURLToPath(new URL(relativo, import.meta.url))
    expect(readFileSync(caminho('../../../src/lib/fotosDocumento.ts'), 'utf8')).toContain(
      'server/src/services/documento-comum.ts',
    )
    expect(readFileSync(caminho('./documento-comum.ts'), 'utf8')).toContain(
      'Espelha src/lib/fotosDocumento.ts',
    )
  })
})
