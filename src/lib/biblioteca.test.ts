import { describe, expect, it } from 'vitest'
import type { TextoBiblioteca } from '@/types'
import {
  alternarTipoDocumento,
  contarTextosBiblioteca,
  filtrarTextosBiblioteca,
  textoDisponivelNoContexto,
  tiposIniciaisNovoTexto,
} from './biblioteca'

const texto = (
  id: string,
  tiposDocumento: TextoBiblioteca['tiposDocumento'],
  secao: TextoBiblioteca['secao'] = 'analise',
): TextoBiblioteca => ({
  id,
  titulo: `Texto ${id}`,
  secao,
  tiposDocumento,
  tags: id === 'epi' ? ['epi'] : [],
  conteudo: `Conteúdo ${id}`,
  favorito: false,
  usos: 0,
  criadoEm: '2026-08-17',
})

const textos = [
  texto('geral', []),
  texto('parecer', ['parecer']),
  texto('duplo', ['parecer', 'laudo'], 'conclusao'),
]

describe('biblioteca por documentos', () => {
  it('não duplica um texto multibiblioteca em Todos', () => {
    expect(filtrarTextosBiblioteca(textos, { biblioteca: 'todas' }).map((item) => item.id)).toEqual([
      'geral',
      'parecer',
      'duplo',
    ])
  })

  it('separa Uso geral de Parecer', () => {
    expect(filtrarTextosBiblioteca(textos, { biblioteca: 'geral' }).map((item) => item.id)).toEqual([
      'geral',
    ])
    expect(
      filtrarTextosBiblioteca(textos, { biblioteca: 'parecer' }).map((item) => item.id),
    ).toEqual(['parecer', 'duplo'])
  })

  it('combina documento, seção e busca', () => {
    expect(
      filtrarTextosBiblioteca(textos, {
        biblioteca: 'parecer',
        secao: 'conclusao',
        busca: 'duplo',
      }).map((item) => item.id),
    ).toEqual(['duplo'])
  })

  it('localiza e ordena textos pelo item exato do parecer', () => {
    const porReferencia = [
      { ...texto('dez', ['parecer']), referencia: '10.2.1' },
      { ...texto('sete', ['parecer']), referencia: '7.2.1' },
      { ...texto('sem-item', ['parecer']) },
      { ...texto('outro', ['parecer']), referencia: '7.2.2' },
    ] as TextoBiblioteca[]

    expect(
      filtrarTextosBiblioteca(porReferencia, {
        biblioteca: 'parecer',
        referencia: '7.2.1',
      }).map((item) => item.id),
    ).toEqual(['sete'])

    expect(
      filtrarTextosBiblioteca(porReferencia, { biblioteca: 'parecer' }).map(
        (item) => item.referencia ?? 'sem-item',
      ),
    ).toEqual(['7.2.1', '7.2.2', '10.2.1', 'sem-item'])
  })

  it('encontra a referência digitada na busca', () => {
    const referenciado = {
      ...texto('criterio', ['parecer']),
      referencia: '5.2.3',
    } as TextoBiblioteca

    expect(
      filtrarTextosBiblioteca([referenciado], {
        biblioteca: 'parecer',
        busca: '5.2.3',
      }).map((item) => item.id),
    ).toEqual(['criterio'])
  })

  it('busca também pelas tags', () => {
    const comEpi = [...textos, texto('epi', ['quesitos'])]
    expect(
      filtrarTextosBiblioteca(comEpi, { biblioteca: 'quesitos', busca: 'EPI' }).map(
        (item) => item.id,
      ),
    ).toEqual(['epi'])
  })

  it('conta múltiplas categorias sem inflar Todos', () => {
    expect(contarTextosBiblioteca(textos)).toMatchObject({
      todas: 3,
      geral: 1,
      parecer: 2,
      laudo: 1,
      quesitos: 0,
      manifestacao: 0,
      impugnacao: 0,
      esclarecimento: 0,
    })
  })

  it('pré-seleciona somente uma categoria documental ativa', () => {
    expect(tiposIniciaisNovoTexto('laudo')).toEqual(['laudo'])
    expect(tiposIniciaisNovoTexto('todas')).toEqual([])
    expect(tiposIniciaisNovoTexto('geral')).toEqual([])
  })

  it('adiciona e remove um tipo sem duplicar os demais', () => {
    expect(alternarTipoDocumento(['parecer'], 'laudo')).toEqual(['parecer', 'laudo'])
    expect(alternarTipoDocumento(['parecer', 'laudo'], 'parecer')).toEqual(['laudo'])
  })

  it('combina tipo atual com Uso geral e seção no drawer', () => {
    expect(textoDisponivelNoContexto(textos[0], 'parecer', 'analise')).toBe(true)
    expect(textoDisponivelNoContexto(textos[1], 'parecer', 'analise')).toBe(true)
    expect(textoDisponivelNoContexto(textos[2], 'parecer', 'analise')).toBe(false)
    expect(textoDisponivelNoContexto(textos[1], 'laudo', 'analise')).toBe(false)
  })

  it('mantém no drawer o item exato e os textos sem referência', () => {
    const geral = texto('geral-item', [])
    const mesmoItem = {
      ...texto('mesmo-item', ['parecer']),
      referencia: '10.1.2',
    } as TextoBiblioteca
    const outroItem = {
      ...texto('outro-item', ['parecer']),
      referencia: '10.2.1',
    } as TextoBiblioteca

    expect(textoDisponivelNoContexto(geral, 'parecer', 'analise', '10.1.2')).toBe(true)
    expect(textoDisponivelNoContexto(mesmoItem, 'parecer', 'analise', '10.1.2')).toBe(true)
    expect(textoDisponivelNoContexto(outroItem, 'parecer', 'analise', '10.1.2')).toBe(false)
  })
})
