// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ breadcrumb, title }: { breadcrumb?: string; title: string }) => (
    <header>
      <p>{breadcrumb}</p>
      <h1>{title}</h1>
    </header>
  ),
}))
vi.mock('@/components/BuscaProcesso', () => ({
  BuscaProcesso: () => <div>Busca de processo</div>,
}))
vi.mock('@/components/EpiSelector', () => ({
  EpiSelector: () => <div>Seleção de EPI</div>,
}))

afterEach(cleanup)

// Perícia nova: o editor monta o rascunho sozinho, a loja só precisa existir.
function abrirEditor(rota: string) {
  vi.mocked(useApp).mockReturnValue({
    usuario: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'perito' },
    empresas: [],
    pericias: [],
    documentos: [],
    textos: [],
    quesitos: [],
    salvarPericia: vi.fn(),
    salvarDocumento: vi.fn(),
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <Routes>
          <Route path="/pericias/nova" element={<PericiaEditor />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

const titulo = () => screen.getByRole('heading', { level: 1 }).textContent

describe('PericiaEditor — cabeçalho do documento novo', () => {
  it('chama de Parecer Técnico o que entra por "Gerar Parecer"', () => {
    abrirEditor('/pericias/nova?tipo=parecer')

    expect(titulo()).toBe('Novo Parecer Técnico')
    expect(screen.queryByText(/Nova perícia/i)).toBeNull()
  })

  it('chama de Laudo Técnico o que entra por "Gerar Laudo"', () => {
    abrirEditor('/pericias/nova?tipo=laudo')

    expect(titulo()).toBe('Novo Laudo Técnico')
    expect(screen.getByText('Novo Laudo Técnico', { selector: 'p' })).toBeDefined()
  })

  it('sem tipo na rota, o atalho antigo continua abrindo um parecer', () => {
    abrirEditor('/pericias/nova')

    expect(titulo()).toBe('Novo Parecer Técnico')
  })

  it('oferece no Laudo os três campos opcionais de quesitos e o atalho Não apresentado', () => {
    abrirEditor('/pericias/nova?tipo=laudo')
    fireEvent.click(screen.getByRole('button', { name: /Conclusão/ }))

    expect(screen.getByLabelText('Quesitos do Juízo')).toBeDefined()
    expect(screen.getByLabelText('Quesitos do Reclamante')).toBeDefined()
    expect(screen.getByLabelText('Quesitos da Reclamada')).toBeDefined()

    const atalhos = screen.getAllByRole('button', { name: 'Não apresentado' })
    expect(atalhos).toHaveLength(3)
    fireEvent.click(atalhos[0]!)
    expect(screen.getByLabelText<HTMLInputElement>('Quesitos do Juízo').value).toBe('Não apresentado')
  })

  it('mantém no Parecer somente o campo consolidado legado', () => {
    abrirEditor('/pericias/nova?tipo=parecer')
    fireEvent.click(screen.getByRole('button', { name: /Conclusão/ }))

    expect(screen.queryByLabelText('Quesitos do Juízo')).toBeNull()
    expect(screen.getByText(/Respostas aos Quesitos Técnicos/)).toBeDefined()
  })

  it('oferece honorários somente no Laudo e apresenta o valor por extenso', () => {
    abrirEditor('/pericias/nova?tipo=laudo')
    fireEvent.click(screen.getByRole('button', { name: /Conclusão/ }))

    const valor = screen.getByLabelText<HTMLInputElement>('Valor proposto dos honorários (R$)')
    fireEvent.change(valor, { target: { value: '5000' } })
    expect(screen.getByText('Por extenso: cinco mil reais.')).toBeDefined()
  })
})

// Pedido do cliente: o caso mais comum é o documento completo (insalubridade
// e periculosidade), então ele é a primeira opção do seletor e já vem
// marcado numa perícia nova. As modalidades individuais continuam a um clique.
describe('PericiaEditor — modalidade padrão da perícia nova', () => {
  const seletor = () => screen.getByLabelText<HTMLSelectElement>('Modalidade da perícia')

  it('oferece o documento completo como primeira opção', () => {
    abrirEditor('/pericias/nova?tipo=laudo')

    expect(Array.from(seletor().options).map((o) => o.value)).toEqual([
      'ambas',
      'insalubridade',
      'periculosidade',
    ])
    expect(seletor().options[0]!.textContent).toBe('Insalubridade e Periculosidade')
  })

  it.each(['laudo', 'parecer'])('abre o %s novo já como insalubridade e periculosidade', (tipo) => {
    abrirEditor(`/pericias/nova?tipo=${tipo}`)

    expect(seletor().value).toBe('ambas')
  })

  it('o perito ainda escolhe só insalubridade ou só periculosidade', () => {
    abrirEditor('/pericias/nova?tipo=laudo')

    fireEvent.change(seletor(), { target: { value: 'periculosidade' } })
    expect(seletor().value).toBe('periculosidade')
    fireEvent.change(seletor(), { target: { value: 'insalubridade' } })
    expect(seletor().value).toBe('insalubridade')
  })
})

// O título impresso no documento é o do seletor MAIS a modalidade. Ele
// precisa ser o mesmo na prévia, no histórico e no PDF/DOCX — antes a
// prévia mostrava só "Parecer Técnico da Reclamada" e o PDF vinha com
// "— insalubridade", em minúsculo, para modalidade única.
describe('PericiaEditor — modalidade no título do documento', () => {
  const irParaODocumento = () =>
    fireEvent.click(screen.getByRole('button', { name: /Documento/ }))

  const tituloDaPrevia = () =>
    screen.getByRole('heading', { level: 1, name: /Parecer Técnico da Reclamada/ }).textContent

  it('escreve a modalidade única com inicial maiúscula', () => {
    abrirEditor('/pericias/nova?tipo=parecer')
    fireEvent.change(screen.getByLabelText('Modalidade da perícia'), {
      target: { value: 'insalubridade' },
    })
    irParaODocumento()

    expect(tituloDaPrevia()).toBe('Parecer Técnico da Reclamada — Insalubridade')
  })

  it('escreve as duas modalidades por extenso quando a perícia é "ambas"', () => {
    abrirEditor('/pericias/nova?tipo=parecer')
    fireEvent.change(screen.getByLabelText('Modalidade da perícia'), {
      target: { value: 'ambas' },
    })
    irParaODocumento()

    expect(tituloDaPrevia()).toBe(
      'Parecer Técnico da Reclamada — Insalubridade e Periculosidade',
    )
  })
})
