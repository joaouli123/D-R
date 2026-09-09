import type { DocumentoGerado } from '@prisma/client'
import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'

import type { PericiaCompleta } from '../mappers.js'
import { empresa, periciaDeTeste, periciaSoPericulosidade, perito } from './parecer.fixture.js'

// Sem disco: `lerUpload` devolve um buffer vazio, o sharp falha e o
// renderizador cai no ramo "imagem indisponível" — que ainda imprime a
// legenda "Fotografia N", que é o que este teste mede.
vi.mock('./armazenamento.js', () => ({
  comoDataUri: async () => null,
  lerUpload: async () => Buffer.alloc(0),
}))

const { gerarDocx } = await import('./docx.js')

// ============================================================
// O DOCX é o renderizador que ninguém enxerga antes de o cliente abrir o
// arquivo no Word — e é o mais fácil de dessincronizar do PDF, porque a
// numeração das seções vem de um contador que roda na ordem dos pushes.
// Espelha server/src/services/documento-parecer.test.ts.
// ============================================================

const documento = {
  id: 'doc-1',
  tipo: 'parecer',
  titulo: 'Parecer Técnico da Reclamada — Insalubridade',
  periciaId: 'per-1',
} as DocumentoGerado

/** Texto corrido do DOCX: só a concatenação dos <w:t> de word/document.xml. */
async function textoDoDocx(pericia: PericiaCompleta = periciaDeTeste()): Promise<string> {
  const buffer = await gerarDocx(documento, pericia, [empresa], perito)
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file('word/document.xml')!.async('string')
  return (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
    .map((n) => n.replace(/<[^>]+>/g, ''))
    .join(' ')
}

describe('parecer em DOCX', () => {
  it('abre a seção 3 pelo 3.1, sem texto de nível 1', async () => {
    const texto = await textoDoDocx()

    // Espelha o mesmo caso em documento-parecer.test.ts: se um dos dois
    // renderizadores voltar a imprimir o campo antigo, o Word e o PDF
    // divergem na mesma perícia.
    expect(texto).not.toContain('A Reclamada atua no ramo de usinagem.')
    expect(texto.indexOf('3. DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA')).toBeLessThan(
      texto.indexOf('3.1. Instalações Físicas'),
    )
  })

  it('abre a seção 7 pelo 7.1, antes da tabela de períodos', async () => {
    const texto = await textoDoDocx()

    expect(texto).toContain('7.1. Atividades Efetivamente Exercidas')
    expect(texto.indexOf('7.1. Atividades Efetivamente Exercidas')).toBeLessThan(
      texto.indexOf('Auxiliar de Produção'),
    )
  })

  it('mantém o 7.1 quando a perícia não tem períodos cadastrados', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { periodos: unknown[] }).periodos = []

    const texto = await textoDoDocx(pericia)

    // Se o h3 fosse para dentro do `if (t.periodos?.length)`, o 7.1 sumiria e
    // a NR-15 assumiria o número dele — o DOCX passaria a numerar diferente
    // do PDF e da prévia no mesmo processo.
    expect(texto).toContain('7.1. Atividades Efetivamente Exercidas')
    expect(texto).toContain('7.2. NR-15')
  })

  it('numera as fotografias na sequência em que elas saem no documento', async () => {
    const texto = await textoDoDocx()

    expect(texto).toContain('Fotografia 1')
    expect(texto).toContain('Fotografia 2')
    expect(texto.indexOf('Fotografia 1')).toBeLessThan(texto.indexOf('Fotografia 2'))
    expect(texto.indexOf('Vista geral do galpão')).toBeLessThan(
      texto.indexOf('EPI reconhecido na diligência'),
    )
  })

  it('não imprime o título "Conclusão" quando a avaliação está sem texto', async () => {
    expect(await textoDoDocx()).not.toContain('Conclusão')
  })

  it('imprime a conclusão da avaliação quando ela existe', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { agentes: { observacao?: string }[] }).agentes[0]!.observacao =
      'A exposição é habitual e permanente.'

    const texto = await textoDoDocx(pericia)

    expect(texto).toContain('Conclusão')
    expect(texto).toContain('A exposição é habitual e permanente.')
  })

  it('tira da seção de EPIs os agentes que a modalidade excluiu', async () => {
    const texto = await textoDoDocx(periciaSoPericulosidade())

    expect(texto).toContain('Inflamáveis líquidos')
    expect(texto).toContain('Nitrílica NL-30')
    expect(texto).not.toContain('Ruído contínuo herdado')
    expect(texto).not.toContain('Plug 3M 1100')
  })

  it('transcreve no 7.3.2 o risco alegado pela parte, com a folha da inicial', async () => {
    const pericia = periciaDeTeste()
    // Com as duas modalidades a NR-16 é a terceira subseção do item 7 — é o
    // 7.3 do modelo que o perito mandou.
    ;(pericia as { modalidade: string }).modalidade = 'ambas'
    Object.assign(pericia.tecnico as object, {
      criterioAvaliacaoPericulosidade: 'Critério qualitativo.',
      riscoAlegadoPericulosidade: 'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
      fonteRiscoAlegado: 'Inicial do processo - Fls.: 8',
    })

    const texto = await textoDoDocx(pericia)

    const posicoes = [
      '7.3.1. Critério de Avaliação',
      '7.3.2. Risco de Periculosidade Alegado pela Parte Reclamante',
      'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
      'Fonte: Inicial do processo - Fls.: 8',
    ].map((trecho) => texto.indexOf(trecho))
    expect(posicoes.every((posicao) => posicao >= 0)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('fecha o item 10 com o quadro Sem Risco e a lista dos anexos em linhas', async () => {
    const pericia = periciaSoPericulosidade()
    ;(pericia.tecnico as unknown as { agentes: unknown[] }).agentes = [{
      id: 'nr16-sem-risco',
      nome: 'Sem risco',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      resultadoPericulosidade: 'nao_caracterizada',
    }]

    const texto = await textoDoDocx(pericia)

    expect(texto).toContain('10.1.8. Sem Risco – Avaliação, Resultado e Conclusão')
    expect(texto).toContain('Condição / Atividades')
    // No DOCX cada linha da célula é um parágrafo próprio; o texto corrido do
    // teste junta os <w:t> com espaço, então o que se mede é a presença de
    // cada item da lista.
    expect(texto).toContain('• Anexo 1 – Explosivos;')
    expect(texto).toContain('• Anexo (*) – Radiações ionizantes ou substâncias radioativas;')
  })

  it('percorre os sete anexos da NR-16 no item 10, um a um', async () => {
    const texto = await textoDoDocx(periciaSoPericulosidade())

    expect(texto).toContain('10.1.1. Explosivos;')
    expect(texto).toContain('10.1.2. Inflamáveis – Avaliação, Resultado e Conclusão')
    expect(texto).toContain('10.1.7. Anexo (*) – Radiações ionizantes ou substâncias radioativas')
  })

  it('abre a capa pela identificação das partes', async () => {
    const texto = await textoDoDocx()

    const posicoes = ['EXCELENTÍSSIMO', 'IDENTIFICAÇÃO DAS PARTES', 'Processo nº'].map((t) =>
      texto.indexOf(t),
    )
    expect(posicoes.every((p) => p >= 0)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })
})
