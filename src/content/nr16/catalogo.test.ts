import { describe, expect, it } from 'vitest'

import {
  CATALOGO_NR16,
  areasDaHipoteseNr16,
  catalogoDoAnexoNr16,
  hipoteseCorrespondente,
  textoAreaRiscoNr16,
} from './catalogo'
import { ANEXOS_NR16, SEM_ENQUADRAMENTO_NR16 } from '@/content/anexosNr16'

const hipotese = (anexoNr16: string, enquadramentoNr16: string) => {
  const encontrada = hipoteseCorrespondente({ anexoNr16, enquadramentoNr16 })
  if (!encontrada) throw new Error(`Hipótese fora do catálogo: ${enquadramentoNr16}`)
  return encontrada
}

describe('catálogo da NR-16', () => {
  it('cobre exatamente os anexos que a tela oferece', () => {
    expect(Object.keys(CATALOGO_NR16).sort()).toEqual(ANEXOS_NR16.map((anexo) => anexo.id).sort())
    expect(catalogoDoAnexoNr16(SEM_ENQUADRAMENTO_NR16)).toBeUndefined()
    expect(catalogoDoAnexoNr16('Anexo 2')).toBeUndefined()
    expect(catalogoDoAnexoNr16()).toBeUndefined()
  })

  it('dá a cada hipótese uma referência única, do próprio anexo', () => {
    // A referência é o valor gravado no agente: repetida, a tela não saberia
    // qual hipótese reabrir.
    const referencias = Object.values(CATALOGO_NR16).flatMap((catalogo) => catalogo.hipoteses.map((h) => h.referencia))
    expect(new Set(referencias).size).toBe(referencias.length)

    for (const anexo of ANEXOS_NR16) {
      for (const { referencia, rotulo, atividade, grupo } of CATALOGO_NR16[anexo.id]!.hipoteses) {
        expect(referencia.startsWith(`NR-16, Anexo ${anexo.numero}`), referencia).toBe(true)
        expect(rotulo.trim() && atividade.trim() && grupo.trim(), referencia).toBeTruthy()
        // A atividade entra no meio de uma frase do laudo: sem espaço sobrando.
        expect(atividade, referencia).toBe(atividade.trim())
      }
    }
  })

  it('não liga área de risco a grupo ou hipótese que não existe', () => {
    // Um `aplicaA` com erro de digitação some com a área da tela em silêncio.
    for (const [id, catalogo] of Object.entries(CATALOGO_NR16)) {
      const alvos = new Set(catalogo.hipoteses.flatMap((h) => [h.grupo, h.referencia]))
      for (const area of catalogo.areasRisco) {
        for (const alvo of area.aplicaA ?? []) {
          expect(alvos.has(alvo), `${id}: ${area.local} → ${alvo}`).toBe(true)
        }
        expect(area.referencia.startsWith('NR-16'), `${id}: ${area.local}`).toBe(true)
      }
    }
  })

  it('mantém na atividade a condição que a norma impõe às atividades de apoio do Anexo 2', () => {
    // É a atividade que sai no laudo; a nota com a condição fica só na tela.
    for (const referencia of [
      'NR-16, Anexo 2, item 2, inciso I, alínea e',
      'NR-16, Anexo 2, item 2, inciso VI',
      'NR-16, Anexo 2, item 2, inciso VIII, alínea b',
    ]) {
      expect(hipotese('ANEXO_02', referencia).atividade, referencia).toMatch(/, ad referendum do Ministério do Trabalho$/)
    }
    expect(hipotese('ANEXO_02', 'NR-16, Anexo 2, item 2, inciso II, alínea e').atividade)
      .toMatch(/dentro das áreas consideradas perigosas pelo Ministério do Trabalho$/)
  })

  it('reencontra a hipótese gravada só no anexo dela', () => {
    const referencia = 'NR-16, Anexo 2, item 1, alínea m'

    expect(hipoteseCorrespondente({ anexoNr16: 'ANEXO_02', enquadramentoNr16: referencia })?.atividade)
      .toBe('Operações em postos de serviço e bombas de abastecimento de inflamáveis líquidos')
    expect(hipoteseCorrespondente({ anexoNr16: 'ANEXO_02', enquadramentoNr16: `  ${referencia} ` })).toBeDefined()
    expect(hipoteseCorrespondente({ anexoNr16: 'ANEXO_01', enquadramentoNr16: referencia })).toBeUndefined()
    expect(hipoteseCorrespondente({ anexoNr16: 'ANEXO_02', enquadramentoNr16: 'NR-16, Anexo 2, item 9' })).toBeUndefined()
    expect(hipoteseCorrespondente({ anexoNr16: 'ANEXO_02' })).toBeUndefined()
  })

  it('sugere só as áreas que a norma liga à hipótese', () => {
    const todas = catalogoDoAnexoNr16('ANEXO_04')!.areasRisco

    expect(areasDaHipoteseNr16('ANEXO_04')).toBe(todas)
    // Energia elétrica fora do SEP: a norma não delimita área nenhuma.
    expect(areasDaHipoteseNr16('ANEXO_04', hipotese('ANEXO_04', 'NR-16, Anexo 4, item 1, alínea a'))).toEqual([])
    const sep = areasDaHipoteseNr16('ANEXO_04', hipotese('ANEXO_04', 'NR-16, Anexo 4, item 1, alínea d'))
    expect(sep.length).toBeGreaterThan(0)
    expect(sep.length).toBeLessThan(todas.length)

    // Anexo 1: as faixas do item 3 são de armazenagem, e só a alínea a alcança
    // quem permanece na área de risco.
    const faixas = catalogoDoAnexoNr16('ANEXO_01')!.areasRisco
    expect(faixas.length).toBeGreaterThan(0)
    expect(areasDaHipoteseNr16('ANEXO_01', hipotese('ANEXO_01', 'NR-16, Anexo 1, item 1 (Quadro 1), alínea a'))).toEqual(faixas)
    for (const alinea of ['b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const referencia = `NR-16, Anexo 1, item 1 (Quadro 1), alínea ${alinea}`
      expect(areasDaHipoteseNr16('ANEXO_01', hipotese('ANEXO_01', referencia)), referencia).toEqual([])
    }

    // Anexo sem quadro de áreas (segurança pessoal) e valor que não é anexo.
    expect(areasDaHipoteseNr16('ANEXO_03')).toEqual([])
    expect(areasDaHipoteseNr16(SEM_ENQUADRAMENTO_NR16)).toEqual([])
  })

  it('escreve a área com o local, a delimitação e a referência', () => {
    expect(textoAreaRiscoNr16({ local: 'Tanques', descricao: 'toda a bacia de segurança', referencia: 'NR-16, Anexo 2, item 3, alínea d' }))
      .toBe('Tanques — toda a bacia de segurança (NR-16, Anexo 2, item 3, alínea d)')
  })
})
