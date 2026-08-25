// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgenteNr15Fields } from './AgenteNr15Fields'
import type { AgenteAvaliado } from '@/types'

afterEach(cleanup)

const RUIDO: AgenteAvaliado = {
  id: 'ruido-1',
  nome: 'Ruído',
  tipo: 'fisico',
  criterio: 'quantitativo',
  anexoNr15: 'ANEXO_01',
  limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
  grau: 'medio',
  unidadeMedicao: 'dB(A)',
}

describe('campos específicos do Anexo 1', () => {
  it('aceita somente o valor numérico da medição e mantém unidade e limite normativos', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={RUIDO} onChange={onChange} />)

    const medicao = screen.getByRole('textbox', { name: 'Medição em perícia (dB(A))' })
    expect(medicao.getAttribute('inputmode')).toBe('decimal')
    expect(screen.getByText('Medição em perícia (dB(A))')).toBeDefined()
    expect(screen.queryByRole('textbox', { name: 'Unidade da medição' })).toBeNull()
    expect(screen.getByDisplayValue('85 dB(A) para jornada de 8h/dia (q=5)').getAttribute('readonly')).not.toBeNull()

    await user.type(medicao, '90,5')
    await user.tab()
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ valorMedido: '90.5', unidadeMedicao: 'dB(A)' }))
  })

  it('mostra no lugar da unidade o resultado calculado após a proteção', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      valorMedido: '90',
      epis: [{
        categoria: 'Protetor auditivo',
        modelo: 'CA 11882',
        caUnico: '11882',
        nivelProtecaoDb: 17,
      }],
    }} onChange={() => undefined} />)

    const resultado = screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement
    expect(resultado.value).toBe('73 dB(A)')
    expect(resultado.readOnly).toBe(true)
    expect(screen.getByText('90 − 17 = 73 dB(A) · Proteção eficaz')).toBeDefined()
  })

  it('não mostra medição numérica para anexo qualitativo', () => {
    render(<AgenteNr15Fields agente={{ ...RUIDO, anexoNr15: 'ANEXO_07', nome: 'Radiação', criterio: 'qualitativo' }} onChange={() => undefined} />)
    expect(screen.queryByRole('textbox', { name: /^Medição em perícia/ })).toBeNull()
  })

  it('calcula com o protetor mais atenuante quando há vários associados', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      valorMedido: '88.41',
      epis: [
        { categoria: 'Protetor auditivo', modelo: 'Plug CA 5745', caUnico: '5745', nivelProtecaoDb: 9 },
        { categoria: 'Protetor auditivo', modelo: 'Concha CA 11882', caUnico: '11882', nivelProtecaoDb: 17 },
      ],
    }} onChange={() => undefined} />)

    const resultado = screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement
    expect(resultado.value).toBe('71.41 dB(A)')
    expect(screen.getByText(/melhor entre 2 protetores/)).toBeDefined()
  })
})

describe('origem da medição', () => {
  it('adota a avaliação da empresa e avisa a divergência com a do perito', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      valorMedido: '88.41',
      medicaoEmpresa: '83',
      fonteMedicaoEmpresa: 'PGR 2024',
      origemMedicao: 'empresa',
      epis: [{ categoria: 'Protetor auditivo', modelo: 'Concha CA 11882', caUnico: '11882', nivelProtecaoDb: 17 }],
    }} onChange={() => undefined} />)

    // A conta tem de sair de 83, não de 88,41: é a empresa que o laudo adotou.
    expect((screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement).value).toBe('66 dB(A)')
    expect(screen.getByRole('status').textContent).toContain('As duas avaliações divergem')
    expect((screen.getByRole('textbox', { name: 'Medição da empresa (dB(A))' }) as HTMLInputElement).value).toBe('83')
  })

  it('apresenta as três alternativas sob o rótulo enxuto de origem da medição', () => {
    render(<AgenteNr15Fields agente={RUIDO} onChange={() => undefined} />)

    const seletor = screen.getByRole('combobox', { name: 'Origem da medição' })
    expect(seletor.querySelectorAll('option')).toHaveLength(3)
    expect(screen.queryByText('Medição adotada no laudo')).toBeNull()
  })

  it('grava a medição da empresa sem apagar a do perito', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{ ...RUIDO, valorMedido: '88.41' }} onChange={onChange} />)

    await user.type(screen.getByRole('textbox', { name: 'Medição da empresa (dB(A))' }), '83,0')
    await user.tab()

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ valorMedido: '88.41', medicaoEmpresa: '83.0' }))
  })

  it('registra que o perito não mediu e passa a adotar a empresa', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{ ...RUIDO, medicaoEmpresa: '83' }} onChange={onChange} />)

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origem da medição' }),
      'nao_informado',
    )

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ origemMedicao: 'nao_informado' }))
  })

  it('grava o topo da faixa da empresa sem apagar o início', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{ ...RUIDO, medicaoEmpresa: '83', origemMedicao: 'empresa' }} onChange={onChange} />)

    await user.type(screen.getByRole('textbox', { name: 'Medição da empresa até' }), '88,5')
    await user.tab()

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ medicaoEmpresa: '83', medicaoEmpresaAte: '88.5' }),
    )
  })

  it('com faixa, calcula pela maior e diz isso na tela', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      medicaoEmpresa: '83',
      medicaoEmpresaAte: '88',
      origemMedicao: 'empresa',
      epis: [{ categoria: 'Protetor auditivo', modelo: 'Concha CA 11882', caUnico: '11882', nivelProtecaoDb: 17 }],
    }} onChange={() => undefined} />)

    // 88 − 17, não 83 − 17: o laudo parte do pior cenário do período.
    expect((screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement).value).toBe('71 dB(A)')
    expect(screen.getByText(/entre 83 e 88 dB\(A\) — o laudo considera a maior/)).toBeDefined()
  })
})

describe('fonte do ruído', () => {
  it('mostra a frase que vai ao laudo assim que a fonte é escolhida', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={RUIDO} onChange={onChange} />)

    const seletor = screen.getByRole('combobox', { name: 'Fonte do ruído' })
    await user.selectOptions(seletor, 'administrativa')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ fonteRuido: 'administrativa' }))

    cleanup()
    render(<AgenteNr15Fields agente={{ ...RUIDO, fonteRuido: 'administrativa' }} onChange={onChange} />)
    expect(screen.getByText(/Ambiente destinado a atividades administrativas/)).toBeDefined()
  })

  it('volta a não informar a fonte sem deixar o campo vazio gravado', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{ ...RUIDO, fonteRuido: 'maquinas' }} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Fonte do ruído' }), '')

    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ fonteRuido: expect.anything() }))
  })

  it('não pergunta a fonte do ruído em agente que não é de ruído', () => {
    render(<AgenteNr15Fields
      agente={{ ...RUIDO, anexoNr15: 'ANEXO_11', nome: 'Acetaldeído', unidadeMedicao: 'ppm' }}
      onChange={() => undefined}
    />)

    expect(screen.queryByRole('combobox', { name: 'Fonte do ruído' })).toBeNull()
  })
})
