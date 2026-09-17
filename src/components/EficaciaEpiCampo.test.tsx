// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EficaciaEpiCampo, idCampoEficaciaEpi } from './EficaciaEpiCampo'
import type { AgenteAvaliado } from '@/types'

afterEach(cleanup)

const EPI = [{ categoria: 'Luva', modelo: 'Nitrílica' }]

function agente(parcial: Partial<AgenteAvaliado> = {}): AgenteAvaliado {
  return {
    id: 'a1',
    nome: 'Álcalis cáusticos',
    tipo: 'quimico',
    criterio: 'qualitativo',
    anexoNr15: 'ANEXO_13',
    epis: EPI,
    ...parcial,
  } as AgenteAvaliado
}

describe('EficaciaEpiCampo', () => {
  it('não pergunta nada sem EPI associado ou com o agente ausente da atividade', () => {
    const { container } = render(<EficaciaEpiCampo agente={agente({ epis: [] })} onChange={() => undefined} />)
    expect(container.innerHTML).toBe('')
    cleanup()

    const ausente = render(<EficaciaEpiCampo agente={agente({ identificadoNaAtividade: false })} onChange={() => undefined} />)
    expect(ausente.container.innerHTML).toBe('')
  })

  it('no ruído não há o que marcar: a eficácia sai do NRRsf', () => {
    render(
      <EficaciaEpiCampo
        agente={agente({ nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo', anexoNr15: 'ANEXO_01' })}
        onChange={() => undefined}
      />,
    )

    expect(screen.getByText(/No ruído, a eficácia do protetor sai do cálculo/)).toBeDefined()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('pergunta Sim ou Não sem resposta pronta e avisa que falta responder', () => {
    render(<EficaciaEpiCampo agente={agente()} onChange={() => undefined} />)

    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(2)
    expect(radios.every((radio) => !radio.checked)).toBe(true)
    expect(radios[0].id).toBe(idCampoEficaciaEpi('a1'))
    expect(screen.getByText(/Responda para emitir o documento/)).toBeDefined()
  })

  it('"Não" é uma resposta: some o aviso e fica marcada', () => {
    render(<EficaciaEpiCampo agente={agente({ epiEficaz: false })} onChange={() => undefined} />)

    expect((screen.getByRole('radio', { name: /Não/ }) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByText(/Responda para emitir o documento/)).toBeNull()
  })

  it('devolve true ou false conforme a opção escolhida', () => {
    const onChange = vi.fn()
    render(<EficaciaEpiCampo agente={agente()} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: /Sim/ }))
    expect(onChange).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByRole('radio', { name: /Não/ }))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })
})
