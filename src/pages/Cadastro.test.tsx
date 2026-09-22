// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/services/api'
import Cadastro from './Cadastro'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function montar() {
  render(
    <MemoryRouter>
      <Cadastro />
    </MemoryRouter>,
  )
}

async function preencher(repetir: string) {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: /^Nome da empresa/ }), 'Metalúrgica Alfa')
  await user.type(screen.getByRole('textbox', { name: /^Seu nome/ }), 'Ana')
  await user.type(screen.getByRole('textbox', { name: /^E-mail de acesso/ }), 'ana@alfa.com.br')
  await user.type(screen.getByLabelText(/^Senha/), 'senhaforte1')
  await user.type(screen.getByLabelText(/^Repetir senha/), repetir)
  await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }))
}

describe('Cadastro público', () => {
  it('envia e mostra que aguarda aprovação', async () => {
    const enviar = vi
      .spyOn(api.cadastroPublico, 'enviar')
      .mockResolvedValue({ aguardandoAprovacao: true } as never)
    montar()
    await preencher('senhaforte1')

    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar.mock.calls[0][0]).toMatchObject({
      nome: 'Metalúrgica Alfa',
      admin: { nome: 'Ana', email: 'ana@alfa.com.br', senha: 'senhaforte1' },
    })
    expect(await screen.findByRole('heading', { name: 'Cadastro recebido' })).toBeTruthy()
  })

  it('não envia se a senha repetida não conferir', async () => {
    const enviar = vi.spyOn(api.cadastroPublico, 'enviar')
    montar()
    await preencher('senhaforte2')

    expect(screen.getByRole('alert').textContent).toContain('As senhas não conferem')
    expect(enviar).not.toHaveBeenCalled()
  })
})
