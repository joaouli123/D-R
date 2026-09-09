import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { emParagrafos, linhasDoBloco } from './documento-comum.js'
import {
  emParagrafos as emParagrafosFront,
  linhasDoBloco as linhasDoBlocoFront,
} from '../../../src/lib/listasDocumento'

// ============================================================
// O motor de listas existe em duas cópias — uma na API e outra no
// front — porque os dois projetos têm tsconfig separados. Este teste
// é o que impede que elas divirjam: mudou numa, tem de mudar na
// outra, senão a pré-visualização deixa de bater com o PDF e o DOCX.
//
// A convenção da matriz do perito:
//   "• item"  → item de lista com marcador;
//   "\titem"  → linha recuada sem marcador (Anexos da NR-16, item 4.2.1).
// ============================================================

const CASOS: { nome: string; texto: string }[] = [
  { nome: 'parágrafo simples', texto: 'Texto corrido do parecer.' },
  {
    nome: 'lista com marcador',
    texto: 'Foram analisados:\n• agentes químicos;\n• agentes físicos.',
  },
  {
    nome: 'linha recuada sem marcador',
    texto: 'Anexos da NR-16:\n\tAnexo 1 — explosivos;\n\tAnexo 2 — inflamáveis.',
  },
  {
    nome: 'bloco começando por linha recuada',
    texto: '\tAnexo 3 — energia elétrica.',
  },
  {
    nome: 'lista e parágrafo no mesmo bloco',
    texto: 'Introdução.\n• primeiro item;\n• segundo item.\nFecho do bloco.',
  },
  {
    nome: 'linhas em branco separam blocos',
    texto: 'Primeiro bloco.\n\nSegundo bloco.',
  },
  { nome: 'marcador com espaços antes', texto: '   • item recuado com espaços.' },
  { nome: 'marcador sozinho é descartado', texto: 'Antes.\n•\nDepois.' },
  { nome: 'espaços não valem como recuo', texto: '    Texto colado de outro documento.' },
  { nome: 'quebra estilo Windows', texto: 'Abertura.\r\n• item;\r\n\tanexo.' },
  { nome: 'texto vazio', texto: '   \n  ' },
]

describe('motor de listas do documento', () => {
  it.each(CASOS)('separa os parágrafos igual no front: $nome', ({ texto }) => {
    expect(emParagrafos(texto)).toEqual(emParagrafosFront(texto))
  })

  it.each(CASOS)('classifica as linhas igual no front: $nome', ({ texto }) => {
    for (const bloco of emParagrafos(texto)) {
      expect(linhasDoBloco(bloco)).toEqual(linhasDoBlocoFront(bloco))
    }
  })

  it('reconhece os três tipos de linha', () => {
    expect(linhasDoBloco('Abertura.\n• com marcador.\n\tsem marcador.')).toEqual([
      { tipo: 'texto', texto: 'Abertura.' },
      { tipo: 'item', texto: 'com marcador.' },
      { tipo: 'item-sem-marcador', texto: 'sem marcador.' },
    ])
  })

  it('preserva o TAB inicial quando o bloco começa recuado', () => {
    expect(emParagrafos('\tAnexo 3.')).toEqual(['\tAnexo 3.'])
  })

  it('não confunde recuo por espaços com item de lista', () => {
    expect(linhasDoBloco('    Texto colado.')).toEqual([{ tipo: 'texto', texto: 'Texto colado.' }])
  })

  it('descarta o marcador e o TAB do texto — o glifo é do renderizador', () => {
    expect(linhasDoBloco('• item;').map((l) => l.texto)).toEqual(['item;'])
    expect(linhasDoBloco('\t\tAnexo 5.').map((l) => l.texto)).toEqual(['Anexo 5.'])
  })

  it('mantém o aviso de espelhamento nos dois arquivos', () => {
    const caminho = (relativo: string) => fileURLToPath(new URL(relativo, import.meta.url))
    expect(readFileSync(caminho('../../../src/lib/listasDocumento.ts'), 'utf8')).toContain(
      'Espelha server/src/services/documento-comum.ts',
    )
    expect(readFileSync(caminho('./documento-comum.ts'), 'utf8')).toContain(
      'Espelha src/lib/listasDocumento.ts',
    )
  })
})
