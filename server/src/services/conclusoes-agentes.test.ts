import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { agenteExibeConclusao, agentesNr15SemConclusao } from './documento-comum'
import {
  agenteExibeConclusao as exibeConclusaoFront,
  agentesNr15SemConclusao as semConclusaoFront,
} from '../../../src/lib/conclusoesAgentes'

describe('conclusões individuais das avaliações NR-15', () => {
  it('lista somente agentes NR-15 sem conclusão, identificados ou ausentes', () => {
    expect(agentesNr15SemConclusao({
      agentes: [
        { id: 'a1', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo', observacao: 'Proteção eficaz.' },
        { id: 'a2', nome: 'Frio', tipo: 'fisico', criterio: 'qualitativo', identificadoNaAtividade: false },
        { id: 'a3', nome: 'Inflamáveis', tipo: 'periculosidade', criterio: 'qualitativo' },
      ],
    })).toEqual(['Frio'])
  })

  it('não bloqueia documento exclusivamente de periculosidade por agentes NR-15 antigos', () => {
    expect(agentesNr15SemConclusao({
      agentes: [
        { id: 'a1', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo' },
      ],
    }, 'periculosidade')).toEqual([])
  })
})

// ============================================================
// A regra existe em duas cópias — a da API recusa a geração, a do front
// acende a pendência no editor. Este bloco é o que impede que divirjam:
// enquanto eram duas regras diferentes, uma perícia só de periculosidade
// travava no editor cobrando a conclusão de um agente NR-15 que a própria
// modalidade tinha tirado da tela.
// ============================================================

const CASOS: { nome: string; tecnico: { agentes: unknown[] }; modalidade?: string }[] = [
  { nome: 'sem agentes', tecnico: { agentes: [] } },
  {
    nome: 'conclusão preenchida',
    tecnico: { agentes: [{ nome: 'Ruído', tipo: 'fisico', observacao: 'Proteção eficaz.' }] },
  },
  {
    nome: 'conclusão só com espaços conta como vazia',
    tecnico: { agentes: [{ nome: 'Calor', tipo: 'fisico', observacao: '   ' }] },
  },
  {
    nome: 'agente sem nome',
    tecnico: { agentes: [{ nome: '  ', tipo: 'quimico' }] },
  },
  {
    nome: 'periculosidade nunca entra na lista',
    tecnico: { agentes: [{ nome: 'Inflamáveis', tipo: 'periculosidade' }] },
  },
  {
    nome: 'modalidade periculosidade ignora agentes NR-15 herdados',
    tecnico: { agentes: [{ nome: 'Ruído', tipo: 'fisico' }] },
    modalidade: 'periculosidade',
  },
  {
    nome: 'modalidade ambas continua cobrando o NR-15',
    tecnico: { agentes: [{ nome: 'Ruído', tipo: 'fisico' }, { nome: 'Frio', tipo: 'fisico' }] },
    modalidade: 'ambas',
  },
  {
    nome: 'modalidade insalubridade cobra o NR-15',
    tecnico: { agentes: [{ nome: 'Poeira', tipo: 'quimico' }] },
    modalidade: 'insalubridade',
  },
]

describe('paridade entre a API e o editor', () => {
  it.each(CASOS)('devolve a mesma lista: $nome', ({ tecnico, modalidade }) => {
    const daApi = agentesNr15SemConclusao(tecnico as never, modalidade)
    expect(daApi).toEqual(semConclusaoFront(tecnico as never, modalidade))
  })

  it('mantém o aviso de espelhamento nos dois arquivos', () => {
    const caminho = (relativo: string) => fileURLToPath(new URL(relativo, import.meta.url))
    expect(readFileSync(caminho('../../../src/lib/conclusoesAgentes.ts'), 'utf8')).toContain(
      'Espelha agentesNr15SemConclusao de server/src/services/documento-comum.ts',
    )
    expect(readFileSync(caminho('./documento-comum.ts'), 'utf8')).toContain(
      'Espelha src/lib/conclusoesAgentes.ts',
    )
  })
})

// ============================================================
// O título "Conclusão" é impresso pelos três renderizadores; a decisão de
// imprimi-lo é uma só. Enquanto era `tipo !== 'periculosidade'` direto no
// JSX/HTML/DOCX, uma avaliação NR-15 vazia — herdada de outra modalidade,
// por exemplo — punha no documento pronto um "Conclusão" seguido de nada.
// ============================================================

const AGENTES: { nome: string; agente: { tipo?: string; observacao?: string } }[] = [
  { nome: 'NR-15 com conclusão', agente: { tipo: 'fisico', observacao: 'Proteção eficaz.' } },
  { nome: 'NR-15 sem conclusão', agente: { tipo: 'fisico' } },
  { nome: 'NR-15 com conclusão só de espaços', agente: { tipo: 'fisico', observacao: '   ' } },
  { nome: 'periculosidade com texto', agente: { tipo: 'periculosidade', observacao: 'Enquadrada.' } },
  { nome: 'periculosidade sem texto', agente: { tipo: 'periculosidade' } },
  { nome: 'agente sem tipo', agente: { observacao: 'Texto.' } },
]

describe('título "Conclusão" dentro do quadro da avaliação', () => {
  it('sai apenas para avaliação NR-15 com texto', () => {
    expect(AGENTES.filter(({ agente }) => agenteExibeConclusao(agente)).map((c) => c.nome)).toEqual([
      'NR-15 com conclusão',
      'agente sem tipo',
    ])
  })

  it.each(AGENTES)('decide igual no front: $nome', ({ agente }) => {
    expect(agenteExibeConclusao(agente)).toBe(exibeConclusaoFront(agente))
  })
})
