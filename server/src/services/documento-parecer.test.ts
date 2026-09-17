import { describe, expect, it, vi } from 'vitest'

import type { PericiaCompleta } from '../mappers.js'
import { empresa, periciaAmbasSoNr16, periciaDeTeste, periciaSoPericulosidade, perito } from './parecer.fixture.js'

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
  it('imprime o quadro compacto da varredura antes das avaliações detalhadas', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { varreduraNr15: unknown[] }).varreduraNr15 = [
      { anexoId: 'ANEXO_01', status: 'exposicao_identificada' },
      { anexoId: 'ANEXO_02', status: 'sem_exposicao' },
    ]

    const html = await gerar(pericia)

    expect(html).toContain('Resultado da varredura NR-15')
    expect(html.indexOf('class="varredura-normativa"')).toBeLessThan(html.indexOf('class="agente-bloco"'))
  })

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

  it('numera o grupo do item 10 pela modalidade, não pelo tamanho da lista', async () => {
    // Perícia “ambas” sem nenhum agente de insalubridade: o item 7 chamava a
    // NR-16 de 7.3 (numerado por modalidade) e o item 10 chamava a mesma
    // norma de 10.1 (numerado pela lista, vazia do lado da NR-15). O mesmo
    // arquivo assinado dava dois números à mesma seção.
    const html = await gerar(periciaAmbasSoNr16())

    expect(html).toContain('7.3. NR-16')
    expect(html).toContain('10.2. NR-16')
    expect(html).not.toContain('10.1. NR-16')
    // E os subitens acompanham o grupo: o quadro é o 10.2.1, não o 10.1.1.
    expect(html).toContain('10.2.1. Inflamáveis – Avaliação, Resultado e Conclusão')
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

  it('não imprime a linha "Conclusão:" quando a avaliação está sem texto', async () => {
    // O agente da fixture não tem `observacao`. Antes, o quadro fechava com um
    // <h4>Conclusão</h4> seguido de nada — o que o perito leu como defeito do
    // gerador dentro do documento pronto.
    expect(await gerar()).not.toContain('Conclusão:')
  })

  it('imprime a conclusão da avaliação quando ela existe', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { agentes: { observacao?: string }[] }).agentes[0]!.observacao =
      'A exposição é habitual e permanente.'

    const html = await gerar(pericia)

    expect(html).toContain('Conclusão: A exposição é habitual e permanente.')
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

  it('transcreve no 7.3.2 o risco alegado pela parte', async () => {
    const pericia = periciaDeTeste()
    // Com as duas modalidades a NR-16 é a terceira subseção do item 7 — é o
    // 7.3 do modelo que o perito mandou.
    ;(pericia as { modalidade: string }).modalidade = 'ambas'
    Object.assign(pericia.tecnico as object, {
      criterioAvaliacaoPericulosidade: 'Critério qualitativo.',
      riscoAlegadoPericulosidade: 'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
    })

    const html = await gerar(pericia)

    const posicoes = [
      '7.3.1. Critério de Avaliação',
      '7.3.2. Risco de Periculosidade Alegado pela Parte Reclamante',
      'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
    ].map((trecho) => html.indexOf(trecho))
    expect(posicoes.every((posicao) => posicao >= 0)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('fecha o item 10 com o quadro Sem Risco, e o rol dos anexos dentro dele', async () => {
    const pericia = periciaSoPericulosidade()
    ;(pericia.tecnico as unknown as { agentes: unknown[] }).agentes = [{
      id: 'nr16-sem-risco',
      nome: 'Sem risco',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      resultadoPericulosidade: 'nao_caracterizada',
    }]

    const html = await gerar(pericia)

    expect(html).toContain('10.1.1. Sem Risco – Avaliação, Resultado e Conclusão')
    expect(html).toContain('<th>Condição / Atividades</th>')
    // A quebra de linha da célula vira <br>: sem isso o rol dos sete anexos
    // sai como um parágrafo corrido dentro do quadro.
    expect(html).toContain('<br>• Anexo 1 – Explosivos;')
    expect(html).toContain('<br>• Anexo (*) – Radiações ionizantes ou substâncias radioativas;')
  })

  it('não repete o rol dos anexos como subitem do item 10', async () => {
    // O item 10 declara que os sete anexos foram observados — mas dentro da
    // tabela, na célula de conclusão, e não como sete subitens soltos. É o
    // modelo que o perito mandou, com os subitens riscados à mão.
    const html = await gerar(periciaSoPericulosidade())

    expect(html).toContain('10.1. NR-16 — Avaliação das Atividades e Operações Perigosas')
    expect(html).toContain('10.1.1. Inflamáveis – Avaliação, Resultado e Conclusão')
    expect(html).not.toContain('10.1.1. Explosivos;')
    // O rol dos sete anexos cabe no quadro da varredura, no item 7 — não no 10.
    const item10 = html.slice(html.indexOf('10.1. NR-16 — Avaliação das Atividades e Operações Perigosas'))
    expect(item10).not.toContain('Radiações ionizantes ou substâncias radioativas')
  })

  it('imprime o quadro da varredura NR-16 a partir das avaliações, sem afirmar a exposição', async () => {
    // O painel manual da NR-16 saiu do editor: o quadro sai das avaliações,
    // mesmo sem registro gravado. E "Exposição identificada" virou
    // "Avaliação da suposta exposição", a pedido do perito.
    const html = await gerar(periciaSoPericulosidade())
    const item7 = html.slice(0, html.indexOf('10.1. NR-16 — Avaliação das Atividades e Operações Perigosas'))

    expect(item7).toContain('Resultado da varredura NR-16')
    expect(item7).toContain('Avaliação da suposta exposição')
    expect(item7).toContain('Radiações ionizantes ou substâncias radioativas')
    expect(html).not.toMatch(/Exposição identificada/i)
    expect(html).not.toContain('>Pendente<')
  })

  it('imprime a análise técnica depois dos quadros dos agentes, não antes', async () => {
    // O texto do item 10 é a CONCLUSÃO de cada agente avaliado: tem que sair
    // depois dos quadros, não colado no título da seção.
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { analiseTecnica: string }).analiseTecnica =
      'Texto exclusivo de teste da análise técnica.'

    const html = await gerar(pericia)

    expect(html).toContain('Texto exclusivo de teste da análise técnica.')
    expect(html.lastIndexOf('class="agente-bloco"')).toBeLessThan(
      html.indexOf('Texto exclusivo de teste da análise técnica.'),
    )
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
