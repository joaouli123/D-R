// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PainelVarreduraNormativa } from './PainelVarreduraNormativa'
import type { AnexoVarredura } from '@/lib/varreduraNormativa'

afterEach(cleanup)

const ITENS: AnexoVarredura[] = [
  { anexoId: 'ANEXO_01', numero: '1', tema: 'Ruído', status: 'nao_avaliado', conclusao: 'Avaliação pendente.', temAvaliacao: false },
  { anexoId: 'ANEXO_04', numero: '4', tema: 'Revogado', status: 'nao_aplicavel', conclusao: 'Anexo revogado — não aplicável.', temAvaliacao: false },
]

describe('PainelVarreduraNormativa', () => {
  it('mostra progresso real e mantém o anexo revogado resolvido', () => {
    render(<PainelVarreduraNormativa norma="NR-15" itens={ITENS} onStatusChange={() => undefined} onExposicao={() => undefined} />)

    expect(screen.getByText('1 de 2 anexos avaliados')).toBeDefined()
    expect(screen.getByText('Revogado — não aplicável')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Anexo 4.*Sem exposição/i })).toBeNull()
  })

  it('oferece decisão negativa rápida e abre o detalhe da exposição', () => {
    const onStatusChange = vi.fn()
    const onExposicao = vi.fn()
    render(<PainelVarreduraNormativa norma="NR-15" itens={ITENS} onStatusChange={onStatusChange} onExposicao={onExposicao} />)

    fireEvent.click(screen.getByRole('button', { name: /Anexo 1.*Sem exposição/i }))
    expect(onStatusChange).toHaveBeenCalledWith('ANEXO_01', 'sem_exposicao')

    fireEvent.click(screen.getByRole('button', { name: /Anexo 1.*Exposição identificada/i }))
    expect(onExposicao).toHaveBeenCalledWith('ANEXO_01')
  })
})
