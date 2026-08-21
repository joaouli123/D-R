// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AvisoNovaVersao } from '@/components/AvisoNovaVersao'

const HTML = (bundle: string) =>
  `<!doctype html><html><body><script type="module" src="${bundle}"></script></body></html>`

/** Coloca no documento do teste o script que a "aba" estaria rodando. */
function abaRodando(bundle: string) {
  const script = document.createElement('script')
  script.setAttribute('src', bundle)
  document.body.appendChild(script)
}

function servidorRespondendo(bundle: string) {
  const buscar = vi.fn(async () => ({ ok: true, text: async () => HTML(bundle) }) as unknown as Response)
  vi.stubGlobal('fetch', buscar)
  return buscar
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('AvisoNovaVersao', () => {
  it('avisa quando o servidor já tem outro bundle', async () => {
    abaRodando('/assets/index-Velho1.js')
    servidorRespondendo('/assets/index-Novo2.js')

    render(<AvisoNovaVersao />)

    expect(await screen.findByText('Existe uma versão mais nova do sistema.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Atualizar agora/ })).toBeTruthy()
  })

  it('não aparece quando o bundle é o mesmo', async () => {
    abaRodando('/assets/index-Igual9.js')
    const buscar = servidorRespondendo('/assets/index-Igual9.js')

    render(<AvisoNovaVersao />)

    await waitFor(() => expect(buscar).toHaveBeenCalled())
    expect(screen.queryByText('Existe uma versão mais nova do sistema.')).toBeNull()
  })

  it('em desenvolvimento nem consulta o servidor', async () => {
    abaRodando('/src/main.tsx')
    const buscar = servidorRespondendo('/assets/index-Novo2.js')

    render(<AvisoNovaVersao />)

    await Promise.resolve()
    expect(buscar).not.toHaveBeenCalled()
    expect(screen.queryByText('Existe uma versão mais nova do sistema.')).toBeNull()
  })
})
