import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo oficial', () => {
  it('usa a arte aprovada sem reconstruir a marca com texto', () => {
    const html = renderToStaticMarkup(<Logo size="lg" showTagline />)

    expect(html).toContain('<img')
    expect(html).toContain('alt="D&amp;R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional"')
    expect(html).toContain('object-contain')
    expect(html).not.toContain('<span>D</span>')
  })
})

// ============================================================
// White-label: a arte da D&R virou a logo de UM perito, nao mais a do
// sistema. Quem subiu a propria marca assina com ela; quem nao subiu
// continua com a arte embutida — inclusive as telas sem sessao (login e
// splash), que nao tem perito para consultar.
// ============================================================

describe('Logo do perito', () => {
  it('sai a marca do proprio perito quando ele subiu uma', () => {
    const html = renderToStaticMarkup(
      <Logo size="lg" perito={{ nome: 'Dinoel Ribeiro da Silva', logoUrl: '/api/uploads/minha.png' }} />,
    )

    expect(html).toContain('src="/api/uploads/minha.png"')
    expect(html).toContain('alt="Logo de Dinoel Ribeiro da Silva"')
    // A proporcao e de cada logo: declarar 1600x549 numa marca de outro
    // formato reservaria a caixa errada durante o carregamento.
    expect(html).not.toContain('width="1600"')
  })

  it('perito sem logo volta para a arte embutida, com as dimensoes dela', () => {
    const html = renderToStaticMarkup(<Logo size="lg" perito={{ nome: 'Dinoel', logoUrl: undefined }} />)

    expect(html).toContain('alt="D&amp;R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional"')
    expect(html).toContain('width="1600"')
  })

  it('logo em branco no cadastro nao vira src vazio', () => {
    const html = renderToStaticMarkup(<Logo size="lg" perito={{ nome: 'Dinoel', logoUrl: '   ' }} />)

    expect(html).not.toContain('src="   "')
    expect(html).toContain('width="1600"')
  })
})
