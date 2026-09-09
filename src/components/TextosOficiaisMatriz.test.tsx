// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TextosOficiaisMatriz } from './TextosOficiaisMatriz'
import { textosOficiaisDaMatriz } from '@/content/textosPadrao'
import { useApp } from '@/store/AppStore'
import type { Usuario } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))

afterEach(cleanup)

// ============================================================
// A tela existe por causa de uma pergunta do perito: "Estão ocultos, certo?
// Onde consigo vê-lo?". Ela mostra, por inteiro, os textos que o sistema
// escreve sozinho no parecer e no laudo.
//
// Duas coisas não podem se perder daqui:
//   • continua sendo LEITURA — quem personaliza a matriz é o administrador,
//     dentro da perícia, e um campo editável nesta tela seria uma promessa
//     falsa de que dá para salvar;
//   • o texto tem de aparecer FORMATADO como sai no documento, senão a tela
//     mente sobre o que ele vai assinar.
// ============================================================

const perito = {
  id: 'u-1',
  nome: 'Dinoel Ribeiro da Silva',
  email: 'perito@example.com',
  perfil: 'perito',
} as unknown as Usuario

describe('TextosOficiaisMatriz', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({ usuario: perito } as unknown as ReturnType<typeof useApp>)
  })

  it('lista todos os textos oficiais como leitura protegida, sem campo editável', () => {
    render(<TextosOficiaisMatriz />)

    const oficiais = textosOficiaisDaMatriz('ambas', perito)
    expect(oficiais.length).toBeGreaterThan(0)

    for (const texto of oficiais) {
      const rotulo = texto.referencia ? `${texto.referencia}. ${texto.titulo}` : texto.titulo
      expect(screen.getByText(rotulo)).toBeTruthy()
    }
    expect(screen.getAllByText('Protegido')).toHaveLength(oficiais.length)

    // Nem input, nem textarea: a edição continua reservada ao administrador.
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })

  it('só oferece o critério da NR-16 quando a perícia tem periculosidade', async () => {
    const user = userEvent.setup()
    render(<TextosOficiaisMatriz />)

    const modalidade = screen.getByRole('combobox', { name: 'Modalidade da perícia' })
    expect(screen.getByText('NR-16 — Critério de Avaliação')).toBeTruthy()

    // Listá-lo numa perícia só de insalubridade prometeria um texto que os
    // três renderizadores não imprimem.
    await user.selectOptions(modalidade, 'insalubridade')
    expect(screen.queryByText('NR-16 — Critério de Avaliação')).toBeNull()

    await user.selectOptions(modalidade, 'periculosidade')
    expect(screen.getByText('NR-16 — Critério de Avaliação')).toBeTruthy()
  })

  it('mostra o texto formatado como sai no documento — com marcador e com linha recuada', async () => {
    const user = userEvent.setup()
    render(<TextosOficiaisMatriz />)

    const criterios = textosOficiaisDaMatriz('ambas', perito).find((t) => t.campo === 'normasReferencias')
    expect(criterios).toBeTruthy()
    expect(criterios?.conteudo).toContain('\n• ')
    expect(criterios?.conteudo).toContain('\n\tAnexo 1')

    await user.click(screen.getByText(`4. ${criterios?.titulo}`))

    // O "•" e o TAB são do renderizador, não do texto: se o prefixo tivesse
    // sobrado no conteúdo, nenhuma destas buscas exatas encontraria a linha.
    expect(screen.getByText('natureza e fonte do agente;').closest('li')).toBeTruthy()
    expect(screen.getByText('Anexo 1 – Explosivos;').closest('li')).toBeTruthy()

    // As numerações da matriz viram título destacado, não parágrafo corrido.
    const titulo = screen.getByText('4.1. INSALUBRIDADE – NR-15')
    expect(titulo.tagName).toBe('P')
    expect(titulo.className).toContain('font-semibold')
  })

  it('copia o texto oficial inteiro, não o resumo mostrado na tela', () => {
    const writeText = vi.fn()
    // `navigator.clipboard` só tem getter no jsdom: `Object.assign` estoura.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<TextosOficiaisMatriz />)

    const objeto = textosOficiaisDaMatriz('ambas', perito).find((t) => t.campo === 'objetivoPericia')
    expect(objeto).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: `Copiar o texto oficial: ${objeto?.titulo}` }))

    expect(writeText).toHaveBeenCalledWith(objeto?.conteudo)
  })
})
