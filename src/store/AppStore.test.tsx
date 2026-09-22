// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppProvider, useApp } from './AppStore'

// A exclusão é otimista: some da tela na hora e volta se o servidor recusar.
// O que se protege aqui é o "volta": só o item que falhou, nunca a lista
// inteira de antes — senão uma segunda exclusão que falha ressuscita a
// primeira, que o servidor já apagou.

const pericia = (id: string) => ({ id, numeroProcesso: id, reclamadas: [] })

vi.mock('@/services/api', () => {
  class ErroApi extends Error {
    sessaoExpirada = false
  }
  const vazio = async () => []
  return {
    API_MODE: 'rest',
    ErroApi,
    auth: { eu: async () => ({ id: 'u1', nome: 'Dinoel', email: 'd@x', perfil: 'admin' }) },
    usuarios: { listar: vazio },
    empresas: { listar: vazio },
    pericias: {
      listar: async () => [pericia('p1'), pericia('p2'), pericia('p3')],
      remover: async (id: string) => {
        if (id === 'p2') throw new Error('Falhou.')
      },
    },
    biblioteca: { listar: vazio },
    quesitos: { listar: vazio },
    documentos: { listar: vazio },
  }
})

let estado: ReturnType<typeof useApp>
function Espiao() {
  estado = useApp()
  return <p data-testid="ids">{estado.pericias.map((p) => p.id).join(',')}</p>
}

afterEach(cleanup)

describe('AppStore — exclusão otimista', () => {
  it('falha numa exclusão devolve só aquele item, sem ressuscitar o que já saiu', async () => {
    render(
      <AppProvider>
        <Espiao />
      </AppProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('ids').textContent).toBe('p1,p2,p3'))

    // As duas saem da mesma renderização, como no laço da tela de Clientes.
    const { removerPericia } = estado
    await act(async () => {
      await removerPericia('p1')
      await removerPericia('p2').catch(() => undefined)
    })

    expect(screen.getByTestId('ids').textContent).toBe('p2,p3')
  })
})
