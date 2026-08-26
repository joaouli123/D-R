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
