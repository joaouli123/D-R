import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ATIVIDADES_ANEXO_13, ATIVIDADES_ANEXO_14, SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import { AgenteNr15Fields } from '@/components/AgenteNr15Fields'
import { BuscaNormativa } from '@/components/BuscaNormativa'
import type { ReferenciaNormativa } from '@/content/nr15/tipos'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import { aplicarAnexo, aplicarReferencia, buscarReferencias, buscarReferenciasNr15, categoriaProtecaoDoAgente, normalizarBuscaNr15 } from './nr15'

function referenciaPorId(
  referencias: readonly ReferenciaNormativa[],
  id: string,
): ReferenciaNormativa {
  const referencia = referencias.find(item => item.id === id)
  expect(referencia, `Referência normativa ausente: ${id}`).toBeDefined()
  return referencia!
}

describe('bases normativas oficiais da NR-15', () => {
  it('mantém CAS válido e pesquisável em todos os 146 agentes do Anexo 11', () => {
    const casValido = (cas: string) => {
      const partes = cas.match(/^(\d{2,7})-(\d{2})-(\d)$/)
      if (!partes) return false
      const corpo = `${partes[1]}${partes[2]}`.split('').reverse().map(Number)
      const digito = corpo.reduce((soma, numero, indice) => soma + numero * (indice + 1), 0) % 10
      return digito === Number(partes[3])
    }

    expect(SUBSTANCIAS_ANEXO_11).toHaveLength(146)
    expect(SUBSTANCIAS_ANEXO_11.every(item => item.cas && casValido(item.cas))).toBe(true)
    expect(buscarReferenciasNr15('121-44-8')[0]).toMatchObject({
      label: 'Trietilamina',
      cas: '121-44-8',
    })
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

  it('localiza também um agente que antes não tinha CAS', () => {
    expect(buscarReferenciasNr15('75-65-0')[0]).toMatchObject({
      label: 'Álcool terc-butílico',
      cas: '75-65-0',
    })
  })

  it('expõe somente categorias de proteção reconhecidas para sugerir EPIs', () => {
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ACETALDEIDO').categoriaProtecao)
      .toBe('Vapores Orgânicos')
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ACIDO_CLORIDRICO').categoriaProtecao)
      .toBe('Gases Ácidos')
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_AMONIA').categoriaProtecao)
      .toBe('Amônia e Aminas')
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_FORMALDEIDO').categoriaProtecao)
      .toBe('Formaldeído')
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_MERCURIO').categoriaProtecao)
      .toBe('Mercúrio')
    expect(referenciaPorId(SUBSTANCIAS_ANEXO_11, 'ANEXO_11_ACETILENO').categoriaProtecao)
      .toBeUndefined()
  })

  it('resolve a categoria pelo snapshot de referência do agente', () => {
    expect(categoriaProtecaoDoAgente({ referenciaNormativaId: 'ANEXO_11_FORMALDEIDO' }))
      .toBe('Formaldeído')
    expect(categoriaProtecaoDoAgente({ referenciaNormativaId: 'ANEXO_11_ACETILENO' }))
      .toBeUndefined()
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
  it('restringe os graus fixos e variáveis conforme os anexos aprovados', () => {
    expect(obterRegraAnexo('ANEXO_06')?.grausPermitidos).toEqual(['maximo'])
    expect(obterRegraAnexo('ANEXO_14')?.grausPermitidos).toEqual(['medio', 'maximo'])
  })

  it('aplica a regra fechada de ruído contínuo sem preservar CAS químico', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Produto químico legado',
      tipo: 'quimico',
      criterio: 'qualitativo',
      cas: '75-07-0',
      grau: 'maximo',
    }, 'ANEXO_01')).toMatchObject({
      anexoNr15: 'ANEXO_01',
      nome: 'Ruído contínuo ou intermitente',
      tipo: 'fisico',
      criterio: 'quantitativo',
      limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
      grau: 'medio',
      unidadeMedicao: 'dB(A)',
    })

    expect(aplicarAnexo({
      id: 'a1', nome: 'Legado', tipo: 'quimico', criterio: 'qualitativo', cas: '75-07-0',
    }, 'ANEXO_01')).not.toHaveProperty('cas')
  })

  it('expõe apenas os campos, unidade e grau aplicáveis ao Anexo 1', () => {
    expect(obterRegraAnexo('ANEXO_01')).toMatchObject({
      agenteFixo: 'Ruído contínuo ou intermitente',
      tipoFixo: 'fisico',
      criterioFixo: 'quantitativo',
      limiteFixo: '85 dB(A) para jornada de 8h/dia (q=5)',
      grausPermitidos: ['medio'],
      unidades: ['dB(A)'],
      unidadePadrao: 'dB(A)',
      exibeCas: false,
      exibeMedicao: true,
      calculo: 'ruido_nrrsf',
    })
  })

  it('não leva medição nem EPI de um anexo para outro', () => {
    const atualizado = aplicarAnexo({
      id: 'a1',
      nome: 'Ruído contínuo ou intermitente',
      tipo: 'fisico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_01',
      medido: '88 dB(A)',
      valorMedido: '88',
      medicaoEmpresa: '84',
      origemMedicao: 'perito',
      fonteRuido: 'maquinas',
      epis: [{ categoria: 'Protetor auditivo', modelo: 'CA 11882', caUnico: '11882', nivelProtecaoDb: 17 }],
      epiEficaz: false,
      observacao: 'Jornada completa',
    }, 'ANEXO_11')

    expect(atualizado).toMatchObject({
      anexoNr15: 'ANEXO_11',
      observacao: 'Jornada completa',
    })
    expect(atualizado).not.toHaveProperty('medido')
    expect(atualizado).not.toHaveProperty('valorMedido')
    expect(atualizado).not.toHaveProperty('medicaoEmpresa')
    expect(atualizado).not.toHaveProperty('origemMedicao')
    expect(atualizado).not.toHaveProperty('fonteRuido')
    expect(atualizado).not.toHaveProperty('epis')
    expect(atualizado).not.toHaveProperty('epiEficaz')
  })

  it('remove referências, medição e conclusão incompatíveis com o novo anexo', () => {
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
    expect(agente).not.toHaveProperty('medido')
    expect(agente).not.toHaveProperty('epiEficaz')
    expect(agente).toMatchObject({
      anexoNr15: 'ANEXO_14',
      observacao: 'Jornada completa',
    })
  })

  it('limpa o agente imposto pelo anexo anterior ao cair num anexo de escolha livre', () => {
    const agente = aplicarAnexo({
      id: 'a1',
      nome: 'Ruído contínuo ou intermitente',
      tipo: 'fisico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_01',
    }, 'ANEXO_11')

    expect(agente.nome).toBe('')
    expect(agente.anexoNr15).toBe('ANEXO_11')
  })

  it('limpa também o agente salvo com texto antigo, não só o texto atual da regra', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Ruído contínuo/intermitente (redação antiga)',
      tipo: 'fisico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_01',
    }, 'ANEXO_11').nome).toBe('')
  })

  it('limpa o agente vindo da referência quando o anexo muda', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Ácido Nítrico',
      tipo: 'quimico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_11',
      referenciaNormativaId: 'ANEXO_11_ACIDO_NITRICO',
    }, 'ANEXO_13').nome).toBe('')
  })

  it('preenche os CAS fixos do Anexo 12 e limpa o CAS ao entrar no Anexo 13', () => {
    expect(aplicarAnexo({
      id: 'a1', nome: '', tipo: 'quimico', criterio: 'quantitativo',
    }, 'ANEXO_12_MANGANES')).toMatchObject({
      nome: 'Manganês', cas: '7439-96-5', unidadeMedicao: 'mg/m³',
    })

    const anexo13 = aplicarAnexo({
      id: 'a1', nome: 'Acetona', tipo: 'quimico', criterio: 'quantitativo',
      anexoNr15: 'ANEXO_11', cas: '67-64-1',
    }, 'ANEXO_13')
    expect(obterRegraAnexo('ANEXO_13')?.exibeCas).toBe(true)
    expect(anexo13).not.toHaveProperty('cas')
  })

  it('limpa o agente imposto também quando o perito tira o anexo', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Calor',
      tipo: 'fisico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_03',
    }, '').nome).toBe('')
  })

  it('preserva o agente que o perito digitou à mão', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Névoas de óleo mineral',
      tipo: 'quimico',
      criterio: 'qualitativo',
      anexoNr15: 'ANEXO_13',
    }, 'ANEXO_11').nome).toBe('Névoas de óleo mineral')

    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Poeira de madeira',
      tipo: 'quimico',
      criterio: 'qualitativo',
    }, 'ANEXO_11').nome).toBe('Poeira de madeira')
  })

  it('o anexo de agente fixo sempre reescreve o nome, venha de onde vier', () => {
    expect(aplicarAnexo({
      id: 'a1',
      nome: 'Névoas de óleo mineral',
      tipo: 'quimico',
      criterio: 'qualitativo',
      anexoNr15: 'ANEXO_11',
    }, 'ANEXO_01').nome).toBe('Ruído contínuo ou intermitente')
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
  // A lista aberta por padrão tapava o bloco "Proteção associada" logo
  // abaixo, e o perito concluía que os Anexos 11, 13 e 14 não tinham
  // consulta de CA. O comportamento aberto/fechado está coberto em
  // BuscaNormativa.test.tsx; aqui só se garante que a primeira pintura
  // não cobre nada.
  it('não abre a lista antes do perito pedir', () => {
    const html = renderToStaticMarkup(createElement(BuscaNormativa, {
      itens: SUBSTANCIAS_ANEXO_11,
      value: '',
      onSelect: () => undefined,
      placeholder: 'Buscar substância',
    }))

    expect(html).not.toContain('role="option"')
    expect(html).toContain('aria-expanded="false"')
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
