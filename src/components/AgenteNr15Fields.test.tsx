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

    const medicao = screen.getByRole('textbox', { name: 'Medição do perito (dB(A))' })
    expect(medicao.getAttribute('inputmode')).toBe('decimal')
    expect(screen.getByText('Medição do perito (dB(A))')).toBeDefined()
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
    expect(screen.queryByRole('textbox', { name: /^Medição do perito/ })).toBeNull()
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
      screen.getByRole('combobox', { name: 'Origem da medição adotada no laudo' }),
      'nao_informado',
    )

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ origemMedicao: 'nao_informado' }))
  })
})
