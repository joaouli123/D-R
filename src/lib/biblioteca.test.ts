import { describe, expect, it } from 'vitest'
import type { TextoBiblioteca } from '@/types'
import {
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

  it('combina tipo atual com Uso geral e seção no drawer', () => {
    expect(textoDisponivelNoContexto(textos[0], 'parecer', 'analise')).toBe(true)
    expect(textoDisponivelNoContexto(textos[1], 'parecer', 'analise')).toBe(true)
    expect(textoDisponivelNoContexto(textos[2], 'parecer', 'analise')).toBe(false)
    expect(textoDisponivelNoContexto(textos[1], 'laudo', 'analise')).toBe(false)
  })
})
