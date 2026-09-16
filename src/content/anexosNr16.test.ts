import { describe, expect, it } from 'vitest'

import {
  NOME_PADRAO_SEM_ENQUADRAMENTO,
  OBSERVACOES_PADRAO_NR16,
  PADRAO_NR16_SEM_ENQUADRAMENTO,
  SEM_ENQUADRAMENTO_NR16,
  alternarObservacaoNr16,
  anexoNr16PorId,
  aplicarAnexoNr16,
  labelAnexoNr16,
  temAnexoNr16Valido,
  temObservacaoNr16,
} from './anexosNr16'
import type { AgenteAvaliado } from '@/types'

const preenchido: AgenteAvaliado = {
  id: 'nr16-1',
  nome: 'Inflamáveis',
  tipo: 'periculosidade',
  criterio: 'qualitativo',
  periodoId: 'per-frentista',
  observacao: 'Ressalva do perito.',
  anexoNr16: 'ANEXO_02',
  enquadramentoNr16: 'NR-16, Anexo 2, item 1, alínea m',
  atividadeEnquadrada: 'Abastecimento de veículos',
  situacaoAreaRisco: 'dentro',
  presencaAreaRisco: 'permanencia',
  delimitacaoAreaRisco: 'Círculo de 7,5 metros',
  distanciaAreaRisco: '3',
  areaRisco: 'Pátio',
  analiseAnexos: 'Análise.',
  exposicaoPericulosidade: 'intermitente',
  exposicaoPericulosidadeTexto: 'Redação.',
  tempoExposicaoNr16: '40',
  unidadeTempoExposicaoNr16: 'minutos_dia',
  frequenciaOperacionalNr16: '3',
  periodicidadeOperacionalNr16: 'semana',
  relacaoAtividadeNr16: 'principal',
  resultadoPericulosidade: 'caracterizada_parcial',
  resultadoPericulosidadeTexto: 'Conclusão.',
  periodoCaracterizacaoNr16: 'de 2021 a 2022',
  detalhesNr16: [{ id: 'produto', rotulo: 'Produto', valor: 'Diesel' }],
}

const CONTEUDO_DO_ANEXO = [
  'enquadramentoNr16', 'atividadeEnquadrada', 'situacaoAreaRisco', 'presencaAreaRisco',
  'delimitacaoAreaRisco', 'distanciaAreaRisco', 'areaRisco', 'analiseAnexos',
  'exposicaoPericulosidade', 'exposicaoPericulosidadeTexto', 'tempoExposicaoNr16',
  'unidadeTempoExposicaoNr16', 'frequenciaOperacionalNr16', 'periodicidadeOperacionalNr16',
  'relacaoAtividadeNr16', 'resultadoPericulosidade', 'resultadoPericulosidadeTexto',
  'periodoCaracterizacaoNr16', 'detalhesNr16',
]

describe('aplicarAnexoNr16', () => {
  it('ao trocar de anexo, descarta tudo o que foi escrito para o anterior', () => {
    const trocado = aplicarAnexoNr16(preenchido, 'ANEXO_04')

    expect(trocado).toMatchObject({ anexoNr16: 'ANEXO_04', nome: 'Energia elétrica' })
    for (const campo of CONTEUDO_DO_ANEXO) expect(trocado, campo).not.toHaveProperty(campo)
    // Fica o que não é do anexo: o vínculo com a função e a observação.
    expect(trocado).toMatchObject({ id: 'nr16-1', periodoId: 'per-frentista', observacao: 'Ressalva do perito.' })
  })

  it('a opção vazia e um valor que não é anexo removem o anexo, em vez de deixar o antigo', () => {
    for (const id of ['', 'Anexo 2']) {
      const semAnexo = aplicarAnexoNr16(preenchido, id)
      expect(semAnexo).not.toHaveProperty('anexoNr16')
      expect(semAnexo.nome).toBe('')
      for (const campo of CONTEUDO_DO_ANEXO) expect(semAnexo, campo).not.toHaveProperty(campo)
    }
  })

  it('“Sem enquadramento” chega com os textos padrão do cenário negativo', () => {
    expect(aplicarAnexoNr16(preenchido, SEM_ENQUADRAMENTO_NR16)).toEqual({
      id: 'nr16-1',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      periodoId: 'per-frentista',
      observacao: 'Ressalva do perito.',
      nome: NOME_PADRAO_SEM_ENQUADRAMENTO,
      anexoNr16: SEM_ENQUADRAMENTO_NR16,
      ...PADRAO_NR16_SEM_ENQUADRAMENTO,
    })
  })
})

describe('“Sem enquadramento em Anexo”', () => {
  it('é uma escolha da tela, não um anexo da norma', () => {
    expect(anexoNr16PorId(SEM_ENQUADRAMENTO_NR16)).toBeUndefined()
    expect(temAnexoNr16Valido({ anexoNr16: SEM_ENQUADRAMENTO_NR16 })).toBe(false)
    expect(temAnexoNr16Valido({ anexoNr16: 'ANEXO_02' })).toBe(true)
    expect(labelAnexoNr16(SEM_ENQUADRAMENTO_NR16)).toBe('Sem enquadramento em Anexo da NR-16')
  })
})

describe('observações frequentes', () => {
  const frase = OBSERVACOES_PADRAO_NR16[0]!

  it('não repete frase', () => {
    expect(new Set(OBSERVACOES_PADRAO_NR16).size).toBe(OBSERVACOES_PADRAO_NR16.length)
  })

  it('acrescenta numa linha própria e tira só a linha exata', () => {
    expect(alternarObservacaoNr16(undefined, frase)).toBe(frase)
    expect(alternarObservacaoNr16('Texto do perito.\n', frase)).toBe(`Texto do perito.\n${frase}`)
    expect(alternarObservacaoNr16(`Texto do perito.\n${frase}`, frase)).toBe('Texto do perito.')
    expect(alternarObservacaoNr16(`${frase}\nTexto do perito.`, frase)).toBe('Texto do perito.')

    // A frase dentro de um parágrafo do perito não é a observação marcada.
    const paragrafo = `Conforme apurado: ${frase}`
    expect(temObservacaoNr16(paragrafo, frase)).toBe(false)
    expect(alternarObservacaoNr16(paragrafo, frase)).toBe(`${paragrafo}\n${frase}`)
    expect(temObservacaoNr16(`  ${frase}  `, frase)).toBe(true)
  })
})
