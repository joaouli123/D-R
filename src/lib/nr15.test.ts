import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ATIVIDADES_ANEXO_13, ATIVIDADES_ANEXO_14, SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import { AgenteNr15Fields } from '@/components/AgenteNr15Fields'
import { BuscaNormativa } from '@/components/BuscaNormativa'
import type { ReferenciaNormativa } from '@/content/nr15/tipos'
import { aplicarAnexo, aplicarReferencia, buscarReferencias, buscarReferenciasNr15, normalizarBuscaNr15 } from './nr15'

function referenciaPorId(
  referencias: readonly ReferenciaNormativa[],
  id: string,
): ReferenciaNormativa {
  const referencia = referencias.find(item => item.id === id)
  expect(referencia, `Referência normativa ausente: ${id}`).toBeDefined()
  return referencia!
}

describe('bases normativas oficiais da NR-15', () => {
  it('protege a lista fechada dos CAS importados da planilha', () => {
    expect(SUBSTANCIAS_ANEXO_11.flatMap(item => item.cas ? [item.cas] : [])).toEqual([
      '75-07-0',
      '111-15-9',
      '141-78-6',
      '74-86-2',
      '67-64-1',
      '75-05-8',
      '64-19-7',
      '74-90-8',
      '7647-01-0',
      '7738-94-5',
      '7664-39-3',
      '64-18-6',
      '96-33-3',
      '107-13-1',
      '123-51-3',
    ])
  })

  it('protege as contagens exatas e a unicidade global dos IDs', () => {
    expect(SUBSTANCIAS_ANEXO_11).toHaveLength(146)
    expect(ATIVIDADES_ANEXO_13).toHaveLength(83)
    expect(ATIVIDADES_ANEXO_14).toHaveLength(12)

    const referencias = [
      ...SUBSTANCIAS_ANEXO_11,
      ...ATIVIDADES_ANEXO_13,
      ...ATIVIDADES_ANEXO_14,
    ]
    expect(new Set(referencias.map(item => item.id)).size).toBe(referencias.length)
  })

  it('protege anexo, tipo, critério e unidades de cada base', () => {
    expect(SUBSTANCIAS_ANEXO_11.every(item =>
      item.anexoId === 'ANEXO_11'
      && item.tipo === 'quimico'
      && item.criterio === 'quantitativo'
      && item.limiteTolerancia
      && item.unidadeLimite
      && ['ppm', 'mg/m³', 'ppm | mg/m³', '% O₂ em volume'].includes(item.unidadeLimite),
    )).toBe(true)

    expect(ATIVIDADES_ANEXO_13.every(item =>
      item.anexoId === 'ANEXO_13'
      && item.tipo === 'quimico'
      && item.criterio === 'qualitativo',
    )).toBe(true)

    expect(ATIVIDADES_ANEXO_14.every(item =>
      item.anexoId === 'ANEXO_14'
      && item.tipo === 'biologico'
      && item.criterio === 'qualitativo',
    )).toBe(true)
  })

  it('restringe a ausência de grau no Anexo 13 ao item oficial de substâncias cancerígenas', () => {
    expect(ATIVIDADES_ANEXO_13.filter(item => item.grau === undefined).map(item => item.id)).toEqual([
      'ANEXO_13_SUBSTANCIAS_CANCERIGENAS_01',
    ])
    expect(ATIVIDADES_ANEXO_13
      .filter(item => item.id !== 'ANEXO_13_SUBSTANCIAS_CANCERIGENAS_01')
      .every(item => ['minimo', 'medio', 'maximo'].includes(item.grau!))).toBe(true)
    expect(new Set(ATIVIDADES_ANEXO_14.map(item => item.grau))).toEqual(new Set(['medio', 'maximo']))
  })

  it('protege o grau máximo do Dióxido de cloro no Anexo 11', () => {
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_DIOXIDO_DE_CLORO')).toMatchObject({
      limiteTolerancia: '0,08 ppm | 0,25 mg/m³',
      unidadeLimite: 'ppm | mg/m³',
      grau: 'maximo',
      atividadeEnquadrada: undefined,
    })
  })

  it('protege o marcador de absorção pela pele do Éter decloroetílico', () => {
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ETER_DECLOROETILICO')).toMatchObject({
      limiteTolerancia: '4 ppm | 24 mg/m³',
      unidadeLimite: 'ppm | mg/m³',
      grau: 'maximo',
      atividadeEnquadrada: 'Absorção também pela pele.',
    })
  })

  it('protege valores, unidades e demais marcadores sentinela do Anexo 11', () => {
    expect(SUBSTANCIAS_ANEXO_11.filter(item => item.atividadeEnquadrada?.includes('Valor teto.')))
      .toHaveLength(11)
    expect(SUBSTANCIAS_ANEXO_11.filter(item => item.atividadeEnquadrada?.includes('Absorção também pela pele.')))
      .toHaveLength(42)
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ACIDO_CLORIDRICO').atividadeEnquadrada)
      .toBe('Valor teto.')
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_N_BUTILAMINA').atividadeEnquadrada)
      .toBe('Valor teto. Absorção também pela pele.')
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ACETILENO')).toMatchObject({
      limiteTolerancia: 'Asfixiante simples (oxigênio mínimo de 18% em volume)',
      unidadeLimite: '% O₂ em volume',
      grau: 'nao_caracterizado',
      atividadeEnquadrada: 'Asfixiante simples: concentração mínima de oxigênio de 18% em volume.',
    })
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_CHUMBO')).toMatchObject({
      limiteTolerancia: '0,1 mg/m³',
      unidadeLimite: 'mg/m³',
      grau: 'maximo',
    })
  })
})

describe('normalizarBuscaNr15', () => {
  it('normaliza acentos e letras maiusculas para busca normativa', () => {
    expect(normalizarBuscaNr15('Ácido Nítrico')).toBe('acido nitrico')
  })
})

describe('buscarReferencias', () => {
  it('localiza a referência pelo CAS recebido', () => {
    expect(buscarReferenciasNr15('75-07-0')[0]).toMatchObject({
      label: 'Acetaldeído',
      cas: '75-07-0',
      limites: { ppm: '78', 'mg/m³': '140' },
    })
  })

  it('mantém agente sem CAS selecionável', () => {
    expect(SUBSTANCIAS_ANEXO_11.find((x) => x.label === 'Álcool terc-butílico')).toBeDefined()
  })

  it('encontra referencias por texto normalizado no rotulo, sinonimos e atividade', () => {
    const referencias: ReferenciaNormativa[] = [
      {
        id: 'ANEXO_11_ACIDO_NITRICO',
        anexoId: 'ANEXO_11',
        label: 'Ácido Nítrico',
        sinonimos: ['aqua fortis'],
        tipo: 'quimico',
        criterio: 'quantitativo',
        limiteTolerancia: '2 ppm',
        unidadeLimite: 'ppm',
        grau: 'medio',
      },
      {
        id: 'ANEXO_11_ACETONA',
        anexoId: 'ANEXO_11',
        label: 'Acetona',
        tipo: 'quimico',
        criterio: 'quantitativo',
        limiteTolerancia: '780 ppm',
        unidadeLimite: 'ppm',
        grau: 'medio',
        atividadeEnquadrada: 'Contato habitual com tuberculose bovina',
      },
    ]

    expect(buscarReferencias(referencias, 'AQUA FORTIS')).toEqual([referencias[0]])
    expect(buscarReferencias(referencias, 'TUBERCULOSE BOVINA')).toEqual([referencias[1]])
  })

  it.each([
    { referencias: ATIVIDADES_ANEXO_13, consulta: 'DDT', idEsperado: 'ANEXO_13_HIDROCARBONETOS_MED_01' },
    { referencias: ATIVIDADES_ANEXO_13, consulta: 'BHC', idEsperado: 'ANEXO_13_HIDROCARBONETOS_MED_01' },
    { referencias: ATIVIDADES_ANEXO_13, consulta: 'sulfeto de níquel', idEsperado: 'ANEXO_13_OPERACOES_DIVERSAS_MAX_02' },
    { referencias: ATIVIDADES_ANEXO_14, consulta: 'brucelose', idEsperado: 'ANEXO_14_MAX_ANIMAIS_PORTADORES' },
    { referencias: ATIVIDADES_ANEXO_14, consulta: 'tuberculose', idEsperado: 'ANEXO_14_MAX_ANIMAIS_PORTADORES' },
  ])('encontra $consulta pelo texto integral da atividade', ({ referencias, consulta, idEsperado }) => {
    expect(buscarReferencias(referencias, consulta).map(item => item.id)).toContain(idEsperado)
  })
})

describe('aplicarAnexo', () => {
  it('preserva medicao, EPI e observacao ao trocar para o Anexo 7', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Legado',
      tipo: 'quimico',
      criterio: 'quantitativo',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    }, 'ANEXO_07')).toMatchObject({
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
      tipo: 'fisico',
      criterio: 'qualitativo',
    })
  })

  it('remove apenas referencias normativas incompatíveis com o novo anexo', () => {
    const agente = aplicarAnexo({
      id: 'a1',
      nome: 'Ácido Nítrico',
      tipo: 'quimico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_11',
      referenciaNormativaId: 'ANEXO_11_ACIDO_NITRICO',
      atividadeEnquadrada: 'Exposição a ácido nítrico',
      unidadeLimite: 'ppm',
      unidadeMedicao: 'ppm',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    }, 'ANEXO_14')

    expect(agente).not.toHaveProperty('referenciaNormativaId')
    expect(agente).not.toHaveProperty('atividadeEnquadrada')
    expect(agente).not.toHaveProperty('unidadeLimite')
    expect(agente).not.toHaveProperty('unidadeMedicao')
    expect(agente).toMatchObject({
      anexoNr15: 'ANEXO_14',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    })
  })
})

describe('aplicarReferencia', () => {
  it('preserva unidade valida, escolhe a primeira unidade possivel e remove unidade sem suporte', () => {
    const acetaldeido = referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ACETALDEIDO')
    const atividadeQualitativa = referenciaPorId(ATIVIDADES_ANEXO_13, 'ANEXO_13_HIDROCARBONETOS_MED_01')
    const agente = {
      id: 'a1',
      nome: 'Legado',
      tipo: 'quimico' as const,
      criterio: 'quantitativo' as const,
      unidadeMedicao: '% O₂ em volume' as const,
    }

    const primeiraValida = aplicarReferencia(agente, acetaldeido)
    expect(primeiraValida).toMatchObject({ unidadeMedicao: 'ppm', unidadeLimite: 'ppm', limiteTolerancia: '78 ppm' })

    const unidadePreservada = aplicarReferencia({ ...agente, unidadeMedicao: 'mg/m³' }, acetaldeido)
    expect(unidadePreservada).toMatchObject({ unidadeMedicao: 'mg/m³', unidadeLimite: 'mg/m³', limiteTolerancia: '140 mg/m³' })

    const semUnidade = aplicarReferencia(unidadePreservada, atividadeQualitativa)
    expect(semUnidade).not.toHaveProperty('unidadeMedicao')
  })

  it('injeta somente os campos derivados da referencia normativa', () => {
    const referencia: ReferenciaNormativa = {
      id: 'ANEXO_11_ACETALDEIDO',
      anexoId: 'ANEXO_11',
      label: 'Acetaldeído',
      tipo: 'quimico',
      criterio: 'quantitativo',
      limiteTolerancia: '78 ppm | 140 mg/m³',
      unidadeLimite: 'ppm | mg/m³',
      grau: 'maximo',
      cas: '75-07-0',
    }

    expect(aplicarReferencia({
      id: 'a1',
      nome: 'Legado',
      tipo: 'quimico',
      criterio: 'quantitativo',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    }, referencia)).toMatchObject({
      anexoNr15: 'ANEXO_11',
      referenciaNormativaId: 'ANEXO_11_ACETALDEIDO',
      nome: 'Acetaldeído',
      tipo: 'quimico',
      criterio: 'quantitativo',
      limiteTolerancia: '78 ppm | 140 mg/m³',
      unidadeLimite: 'ppm | mg/m³',
      grau: 'maximo',
      cas: '75-07-0',
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    })
  })

  it('aplica os dados especializados dos Anexos 11, 13 e 14 sem perder os dados periciais', () => {
    const agenteBase = {
      id: 'a1',
      nome: 'Legado',
      tipo: 'quimico' as const,
      criterio: 'qualitativo' as const,
      medido: '12 ppm',
      epiEficaz: false,
      observacao: 'Jornada completa',
    }

    expect(aplicarReferencia(agenteBase, referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ACIDO_CLORIDRICO')))
      .toMatchObject({
        nome: 'Ácido clorídrico',
        limiteTolerancia: '4 ppm',
        unidadeLimite: 'ppm',
        unidadeMedicao: 'ppm',
        grau: 'maximo',
        medido: '12 ppm',
        epiEficaz: false,
        observacao: 'Jornada completa',
      })

    expect(aplicarReferencia(agenteBase, referenciaPorId(ATIVIDADES_ANEXO_13, 'ANEXO_13_HIDROCARBONETOS_MED_01')))
      .toMatchObject({
        atividadeEnquadrada: expect.stringContaining('DDT'),
        grau: 'medio',
        medido: '12 ppm',
        epiEficaz: false,
        observacao: 'Jornada completa',
      })

    expect(aplicarReferencia(agenteBase, referenciaPorId(ATIVIDADES_ANEXO_14, 'ANEXO_14_MAX_ANIMAIS_PORTADORES')))
      .toMatchObject({
        tipo: 'biologico',
        atividadeEnquadrada: expect.stringContaining('brucelose'),
        grau: 'maximo',
        medido: '12 ppm',
        epiEficaz: false,
        observacao: 'Jornada completa',
      })
  })
})

describe('BuscaNormativa', () => {
  it('limita a lista inicial a trinta referencias normativas', () => {
    const html = renderToStaticMarkup(createElement(BuscaNormativa, {
      itens: SUBSTANCIAS_ANEXO_11,
      value: '',
      onSelect: () => undefined,
      placeholder: 'Buscar substância',
    }))

    expect((html.match(/role="option"/g) ?? [])).toHaveLength(30)
    expect(html).toContain('Acetaldeído — CAS 75-07-0')
  })
})

describe('AgenteNr15Fields', () => {
  it('avisa sobre referência legada ausente fora dos anexos com busca especializada', () => {
    const html = renderToStaticMarkup(createElement(AgenteNr15Fields, {
      agente: {
        id: 'a1',
        nome: 'Radiação legada',
        tipo: 'fisico',
        criterio: 'qualitativo',
        anexoNr15: 'ANEXO_07',
        referenciaNormativaId: 'ANEXO_07_REFERENCIA_REMOVIDA',
        medido: '12',
        epiEficaz: false,
        observacao: 'Registro original preservado',
      },
      onChange: () => undefined,
    }))

    expect(html).toContain('A referência normativa salva não está na base atual.')
    expect(html).not.toContain('role="combobox"')
  })
})
