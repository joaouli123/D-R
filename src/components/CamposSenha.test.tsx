// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { CamposSenha } from './CamposSenha'

afterEach(cleanup)

function Campos() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  return (
    <CamposSenha
      senha={senha}
      confirmacao={confirmacao}
      onSenha={setSenha}
      onConfirmacao={setConfirmacao}
      hint="Troque depois no perfil."
    />
  )
}

const senha = () => screen.getByLabelText(/^Senha/) as HTMLInputElement
const repetir = () => screen.getByLabelText(/^Repetir senha/) as HTMLInputElement

describe('CamposSenha', () => {
  it('acompanha a digitação até as duas senhas conferirem', async () => {
    const user = userEvent.setup()
    render(<Campos />)

    expect(screen.getByText('Mínimo 8 caracteres. Troque depois no perfil.')).toBeDefined()

    await user.type(senha(), 'abc12')
    expect(screen.getByText('Faltam 3 caracteres (mínimo 8).')).toBeDefined()

    await user.type(senha(), 'x9!')
    expect(screen.getByText('Agora repita a senha.')).toBeDefined()

    await user.type(repetir(), 'abc1')
    expect(screen.getByText('Continue digitando a repetição.')).toBeDefined()
    expect(repetir().getAttribute('aria-invalid')).toBeNull()

    await user.type(repetir(), '2x9!')
    expect(screen.getByText('As senhas conferem.')).toBeDefined()
  })

  it('aponta quando a repetição não confere', async () => {
    const user = userEvent.setup()
    render(<Campos />)

    await user.type(senha(), 'senha-segura')
    await user.type(repetir(), 'senha-errada')

    expect(screen.getByText('As senhas não conferem.')).toBeDefined()
    expect(repetir().getAttribute('aria-invalid')).toBe('true')
  })

  it('mostra e oculta as duas senhas juntas', async () => {
    const user = userEvent.setup()
    render(<Campos />)

    expect(senha().type).toBe('password')
    expect(repetir().type).toBe('password')

    await user.click(screen.getByRole('button', { name: 'Mostrar senhas' }))
    expect(senha().type).toBe('text')
    expect(repetir().type).toBe('text')

    await user.click(screen.getByRole('button', { name: 'Ocultar senhas' }))
    expect(senha().type).toBe('password')
  })
})
