import { describe, expect, it } from 'vitest'

import { ANEXOS_NR16, itemListaAnexoNr16 } from './anexosNr16'
import { CHAVE_BIBLIOTECA_POR_CAMPO, REFERENCIAS_PARECER } from './referenciasParecer'

describe('referências da biblioteca do parecer', () => {
  it('oferece o item 10.1.1 para todos os agentes físicos, sem restringir a ruído', () => {
    const item = REFERENCIAS_PARECER.find((referencia) => referencia.numero === '10.1.1')

    expect(item?.titulo).toBe('Agentes Físicos')
    expect(item?.titulo).not.toMatch(/ruído/i)
  })

  it('usa no 7.3.2 o mesmo título que os três renderizadores imprimem', () => {
    // A frase está repetida em seis lugares (três renderizadores e três
    // testes). O catálogo era o sétimo, e o único sem ninguém conferindo:
    // ficou em "pelo Reclamante" depois que o documento passou a dizer
    // "pela Parte Reclamante".
    expect(REFERENCIAS_PARECER.find((referencia) => referencia.numero === '7.3.2')?.titulo)
      .toBe('Risco de Periculosidade Alegado pela Parte Reclamante')
  })

  it('numera os subitens do 10.2 pelos anexos da NR-16, sem sobrar item extinto', () => {
    // No modelo novo o 10.2.1 é Explosivos e o 10.2.2 é Inflamáveis. Enquanto
    // o catálogo dizia "10.2.1 Critério de Avaliação" e "10.2.2 Agente de
    // Risco", o texto que o perito salvasse na Biblioteca reaparecia sob o
    // anexo errado.
    ANEXOS_NR16.forEach((anexo, indice) => {
      expect(REFERENCIAS_PARECER.find((referencia) => referencia.numero === `10.2.${indice + 1}`)?.titulo)
        .toBe(itemListaAnexoNr16(anexo))
    })
    expect(REFERENCIAS_PARECER.find((referencia) => referencia.numero === `10.2.${ANEXOS_NR16.length + 1}`)?.titulo)
      .toBe('Sem Risco')
    expect(REFERENCIAS_PARECER.some((referencia) => referencia.titulo === 'Agente de Risco')).toBe(false)
    expect(REFERENCIAS_PARECER.find((referencia) => referencia.numero === '10.2.1')?.titulo)
      .not.toBe('Critério de Avaliação')
  })

  it('cataloga cada campo do editor num item que existe no índice', () => {
    for (const [campo, numero] of Object.entries(CHAVE_BIBLIOTECA_POR_CAMPO)) {
      expect(REFERENCIAS_PARECER.find((referencia) => referencia.numero === numero), campo).toBeDefined()
    }
  })

  it('cataloga o risco alegado e a conclusão da NR-16 na seção certa', () => {
    // Numa perícia só de periculosidade o documento imprime “7.2.2” e “11”
    // nestes dois campos — números que no catálogo são “Agentes Químicos” e
    // “NR-15 — Conclusão”. A chave tem de continuar sendo a canônica.
    const titulo = (numero?: string) =>
      REFERENCIAS_PARECER.find((referencia) => referencia.numero === numero)?.titulo

    expect(titulo(CHAVE_BIBLIOTECA_POR_CAMPO.criterioAvaliacaoPericulosidade)).toBe('Critério de Avaliação')
    expect(titulo(CHAVE_BIBLIOTECA_POR_CAMPO.riscoAlegadoPericulosidade))
      .toBe('Risco de Periculosidade Alegado pela Parte Reclamante')
    expect(titulo(CHAVE_BIBLIOTECA_POR_CAMPO.fonteRiscoAlegado))
      .toBe('Risco de Periculosidade Alegado pela Parte Reclamante')
    expect(titulo(CHAVE_BIBLIOTECA_POR_CAMPO.conclusaoPericulosidade)).toBe('NR-16 — Conclusão e Fundamentação')
    expect(titulo(CHAVE_BIBLIOTECA_POR_CAMPO.alegacoesReclamante)).toBe('Alegações do Reclamante')
    expect(titulo(CHAVE_BIBLIOTECA_POR_CAMPO.respostasQuesitos)).toBe('Respostas aos Quesitos Técnicos')
    expect(titulo(CHAVE_BIBLIOTECA_POR_CAMPO.encerramento)).toBe('Encerramento')
  })
})
