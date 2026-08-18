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

    const medicao = screen.getByRole('textbox', { name: 'Medição registrada' })
    expect(medicao.getAttribute('inputmode')).toBe('decimal')
    expect(screen.getByDisplayValue('dB(A)').getAttribute('readonly')).not.toBeNull()
    expect(screen.getByDisplayValue('85 dB(A) para jornada de 8h/dia (q=5)').getAttribute('readonly')).not.toBeNull()

    await user.type(medicao, '90,5')
    await user.tab()
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ valorMedido: '90.5', unidadeMedicao: 'dB(A)' }))
  })

  it('não mostra medição numérica para anexo qualitativo', () => {
    render(<AgenteNr15Fields agente={{ ...RUIDO, anexoNr15: 'ANEXO_07', nome: 'Radiação', criterio: 'qualitativo' }} onChange={() => undefined} />)
    expect(screen.queryByRole('textbox', { name: 'Medição registrada' })).toBeNull()
  })
})
