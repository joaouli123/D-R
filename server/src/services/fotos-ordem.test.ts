import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { ORDEM_SECAO_FOTO, fotosEmOrdemDeDocumento, fotosImpressasEmOrdem } from './documento-comum.js'
import {
  ORDEM_SECAO_FOTO as ORDEM_FRONT,
  fotosEmOrdemDeDocumento as ordenarFront,
  fotosImpressasEmOrdem as impressasFront,
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

  it('põe evidências (documentos/EPIs, item 6.3) antes de produtos (item 6.4)', () => {
    // 'epi' saiu das opções do editor (dobrada em 'documentos'), mas fotos já
    // gravadas naquela seção continuam saindo junto das evidências do 6.3 —
    // por isso as duas chaves compartilham a mesma posição aqui.
    expect(ORDEM_SECAO_FOTO.documentos).toBe(ORDEM_SECAO_FOTO.epi)
    expect(ORDEM_SECAO_FOTO.documentos).toBeLessThan(ORDEM_SECAO_FOTO.produtos as number)
    expect(fotosEmOrdemDeDocumento([
      foto('f-prod', 'produtos', 1),
      foto('f-epi', 'epi', 9),
    ]).map((f) => f.id)).toEqual(['f-epi', 'f-prod'])
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

// ============================================================
// A numeração conta só o que SAI no documento, na ordem em que sai. Foto de
// agente removido, de agente fora da modalidade ou de um Parecer (fotos por
// agente são do Laudo) não ocupa número: a legenda nunca pula de
// "Fotografia 2" para "Fotografia 4".
// ============================================================

const fotoDeAgente = (id: string, ordem: number, agenteId: string, secao = 'documentos') => ({
  id,
  secao,
  ordem,
  agenteId,
})

const numeros = (fotos: ReturnType<typeof fotosImpressasEmOrdem>['numeroDaFoto']) => Object.fromEntries(fotos)

describe('fotos impressas e sua numeração', () => {
  it('numera as fotos das seções na ordem do documento e as do agente por último', () => {
    // A foto do agente é gravada em 'documentos' (rank 3), mas o item 10 vem
    // depois do 6.4: ela tem de numerar depois das de 'produtos'.
    const fotos = [
      fotoDeAgente('f-ag', 1, 'agn-1'),
      { ...foto('f-prod', 'produtos', 1) },
      { ...foto('f-amb', 'ambiente', 1) },
    ]
    expect(numeros(fotosImpressasEmOrdem(fotos, ['agn-1']).numeroDaFoto)).toEqual({
      'f-amb': 1,
      'f-prod': 2,
      'f-ag': 3,
    })
  })

  it('segue a ordem em que os agentes saem, não a do array de fotos', () => {
    const fotos = [
      fotoDeAgente('f-b', 1, 'agn-b'),
      fotoDeAgente('f-a', 1, 'agn-a'),
    ]
    const { porAgente, numeroDaFoto } = fotosImpressasEmOrdem(fotos, ['agn-a', 'agn-b'])
    expect(numeros(numeroDaFoto)).toEqual({ 'f-a': 1, 'f-b': 2 })
    expect([...porAgente.keys()]).toEqual(['agn-a', 'agn-b'])
  })

  it('não numera foto de agente que não sai no documento', () => {
    const fotos = [
      foto('f-amb', 'ambiente', 1),
      fotoDeAgente('f-removido', 1, 'agn-removido'),
      fotoDeAgente('f-ag', 1, 'agn-1'),
    ]
    const { secoes, porAgente, numeroDaFoto } = fotosImpressasEmOrdem(fotos, ['agn-1'])
    expect(numeros(numeroDaFoto)).toEqual({ 'f-amb': 1, 'f-ag': 2 })
    expect(secoes.map((f) => f.id)).toEqual(['f-amb'])
    expect([...porAgente.keys()]).toEqual(['agn-1'])
  })

  it('sem agentes impressos (Parecer), a foto de agente não sai nem numera — e a da seção continua', () => {
    const fotos = [fotoDeAgente('f-ag', 1, 'agn-1'), foto('f-amb', 'ambiente', 1)]
    const { secoes, porAgente, numeroDaFoto } = fotosImpressasEmOrdem(fotos, [])
    expect(secoes.map((f) => f.id)).toEqual(['f-amb'])
    expect(porAgente.size).toBe(0)
    expect(numeros(numeroDaFoto)).toEqual({ 'f-amb': 1 })
  })

  it('não numera foto de seção desconhecida, que nenhuma seção imprime', () => {
    const fotos = [foto('f-nova', 'secao-que-nao-existe', 1), foto('f-amb', 'ambiente', 1)]
    expect(numeros(fotosImpressasEmOrdem(fotos, []).numeroDaFoto)).toEqual({ 'f-amb': 1 })
  })

  it('ordena as fotos de um mesmo agente por ordem e, no empate, por id', () => {
    const fotos = [
      fotoDeAgente('f-c', 2, 'agn-1'),
      fotoDeAgente('f-b', 1, 'agn-1'),
      fotoDeAgente('f-a', 1, 'agn-1'),
    ]
    expect(fotosImpressasEmOrdem(fotos, ['agn-1']).porAgente.get('agn-1')?.map((f) => f.id)).toEqual([
      'f-a',
      'f-b',
      'f-c',
    ])
  })

  it('não repete a foto se o mesmo agente aparece duas vezes na lista', () => {
    const fotos = [fotoDeAgente('f-1', 1, 'agn-1')]
    const { porAgente, numeroDaFoto } = fotosImpressasEmOrdem(fotos, ['agn-1', 'agn-1'])
    expect(porAgente.get('agn-1')).toHaveLength(1)
    expect(numeros(numeroDaFoto)).toEqual({ 'f-1': 1 })
  })

  it('numera de 1 a N, sem buracos', () => {
    const fotos = [
      foto('f-1', 'ambiente', 1),
      foto('f-2', 'produtos', 1),
      fotoDeAgente('f-3', 1, 'agn-1'),
      fotoDeAgente('f-4', 1, 'agn-fora'),
      foto('f-5', 'invalida', 1),
    ]
    const valores = [...fotosImpressasEmOrdem(fotos, ['agn-1']).numeroDaFoto.values()]
    expect(valores).toEqual([1, 2, 3])
  })

  it('não muda a lista recebida', () => {
    const fotos = [fotoDeAgente('f-b', 2, 'agn-1'), fotoDeAgente('f-a', 1, 'agn-1')]
    const original = [...fotos]
    fotosImpressasEmOrdem(fotos, ['agn-1'])
    expect(fotos).toEqual(original)
  })

  it('calcula igual no front', () => {
    const fotos = [
      fotoDeAgente('f-ag2', 2, 'agn-2'),
      fotoDeAgente('f-ag1', 1, 'agn-1'),
      foto('f-prod', 'produtos', 1),
      foto('f-epi', 'epi', 1),
      foto('f-amb', 'ambiente', 1),
      foto('f-x', 'nao-existe', 1),
    ]
    const servidor = fotosImpressasEmOrdem(fotos, ['agn-1', 'agn-2'])
    const front = impressasFront(fotos, ['agn-1', 'agn-2'])
    expect(front.secoes).toEqual(servidor.secoes)
    expect([...front.porAgente]).toEqual([...servidor.porAgente])
    expect([...front.numeroDaFoto]).toEqual([...servidor.numeroDaFoto])
  })
})
