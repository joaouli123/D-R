import { describe, expect, it, vi } from 'vitest'

import type { PericiaCompleta } from '../mappers.js'
import { empresa, periciaDeTeste, periciaSoPericulosidade, perito } from './parecer.fixture.js'

// O renderizador carrega o armazenamento sob demanda, só quando há foto para
// embutir. Aqui o disco não existe: devolvendo `null`, a figura sai com o
// espaço reservado e a LEGENDA — que é o que este teste mede — continua igual.
vi.mock('./armazenamento.js', () => ({
  comoDataUri: async () => null,
  lerUpload: async () => Buffer.alloc(0),
}))

const { htmlDoParecer } = await import('./documento-html.js')

// ============================================================
// Os três renderizadores (prévia, PDF e DOCX) precisam emitir o parecer na
// MESMA ordem. Este arquivo cobre o PDF; a prévia está em
// src/components/DocumentoPreview.test.tsx e o DOCX em docx-parecer.test.ts.
// ============================================================

const gerar = (pericia = periciaDeTeste()) =>
  htmlDoParecer(pericia, [empresa], perito, 'Parecer Técnico da Reclamada — Insalubridade')

describe('parecer em HTML (motor do PDF)', () => {
  it('abre a seção 3 pelo 3.1, sem texto de nível 1', async () => {
    const html = await gerar()

    // Título de nível 1 não leva texto próprio: entre o 3 e o 3.1 não pode
    // sobrar parágrafo nenhum. A fixture ainda grava `descricaoEmpresa` de
    // propósito — é assim que se vê que o campo antigo não volta a imprimir.
    expect(html).not.toContain('A Reclamada atua no ramo de usinagem.')
    const entre = html.slice(
      html.indexOf('3. DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA'),
      html.indexOf('3.1. Instalações Físicas'),
    )
    expect(entre.replace(/<[^>]+>/g, '').replace('3. DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA', '').trim()).toBe('')
  })

  it('abre a seção 7 pelo 7.1, antes da tabela de períodos', async () => {
    const html = await gerar()

    expect(html).toContain('7.1. Atividades Efetivamente Exercidas')
    expect(html.indexOf('7.1. Atividades Efetivamente Exercidas')).toBeLessThan(
      html.indexOf('Auxiliar de Produção'),
    )
  })

  it('mantém o 7.1 quando a perícia não tem períodos cadastrados', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { periodos: unknown[] }).periodos = []

    const html = await gerar(pericia)

    expect(html).toContain('7.1. Atividades Efetivamente Exercidas')
    // Se o 7.1 sumisse, a NR-15 subiria para 7.1 e o DOCX/prévia divergiriam.
    expect(html).toContain('7.2. NR-15')
  })

  it('numera as fotografias na sequência em que elas saem no documento', async () => {
    const html = await gerar()

    expect(html.indexOf('Fotografia 1')).toBeLessThan(html.indexOf('Fotografia 2'))
    expect(html).toContain('Fotografia 1 – Vista geral do galpão')
    expect(html).toContain('Fotografia 2 – EPI reconhecido na diligência')
  })

  it('imprime a foto do ambiente dentro do item 3.1', async () => {
    const html = await gerar()

    expect(html.indexOf('3.1. Instalações Físicas')).toBeLessThan(html.indexOf('Fotografia 1'))
    expect(html.indexOf('Fotografia 1')).toBeLessThan(html.indexOf('Fotografia 2'))
  })

  it('não imprime o título "Conclusão" quando a avaliação está sem texto', async () => {
    // O agente da fixture não tem `observacao`. Antes, o quadro fechava com um
    // <h4>Conclusão</h4> seguido de nada — o que o perito leu como defeito do
    // gerador dentro do documento pronto.
    expect(await gerar()).not.toContain('<h4>Conclusão</h4>')
  })

  it('imprime a conclusão da avaliação quando ela existe', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { agentes: { observacao?: string }[] }).agentes[0]!.observacao =
      'A exposição é habitual e permanente.'

    const html = await gerar(pericia)

    expect(html).toContain('<h4>Conclusão</h4>')
    expect(html).toContain('A exposição é habitual e permanente.')
  })

  it('tira da seção de EPIs os agentes que a modalidade excluiu', async () => {
    const html = await htmlDoParecer(
      periciaSoPericulosidade(),
      [empresa],
      perito,
      'Parecer Técnico da Reclamada — Periculosidade',
    )

    expect(html).toContain('Inflamáveis líquidos')
    expect(html).toContain('Nitrílica NL-30')
    // O agente NR-15 herdado não aparece em nenhum quadro do laudo; os EPIs
    // dele também não podem aparecer.
    expect(html).not.toContain('Ruído contínuo herdado')
    expect(html).not.toContain('Plug 3M 1100')
  })

  it('abre a capa pela identificação das partes', async () => {
    const html = await gerar()

    const posicoes = ['EXCELENTÍSSIMO', 'IDENTIFICAÇÃO DAS PARTES', 'Processo nº'].map((t) =>
      html.indexOf(t),
    )
    expect(posicoes.every((p) => p >= 0)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })
})
