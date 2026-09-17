// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ID_PENDENCIAS_EMISSAO, PendenciasEmissao } from './PendenciasEmissao'
import type { PendenciaVarredura } from '@/lib/varreduraNormativa'

afterEach(cleanup)

const SEM_DECISAO: PendenciaVarredura[] = ['2', '3', '5'].map((anexo) => ({
  norma: 'NR-15', anexo, anexoId: `ANEXO_0${anexo}`, tema: `Tema ${anexo}`, motivo: 'não avaliado',
}))

const EPI: PendenciaVarredura = {
  norma: 'NR-15', anexo: '1', anexoId: 'ANEXO_01', tema: 'Ruído contínuo ou intermitente',
  motivo: 'sem eficácia do EPI', agenteId: 'a1', agenteNome: 'Álcalis', campo: 'epiEficaz',
}

describe('PendenciasEmissao', () => {
  it('diz que está tudo certo quando não falta nada', () => {
    render(<PendenciasEmissao pendencias={[]} onIr={() => undefined} />)

    const aviso = screen.getByText(/Nenhuma pendência nesta etapa/)
    expect(aviso.id).toBe(ID_PENDENCIAS_EMISSAO)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('agrupa os anexos sem decisão e leva cada item ao lugar que o resolve', () => {
    const onIr = vi.fn()
    render(<PendenciasEmissao pendencias={[...SEM_DECISAO, EPI]} onIr={onIr} />)

    const regiao = screen.getByRole('region', { name: 'Pendências para emitir' })
    expect(regiao.id).toBe(ID_PENDENCIAS_EMISSAO)
    expect(within(regiao).getByText('Faltam 2 itens para emitir o documento')).toBeDefined()
    expect(within(regiao).getByText('NR-15: 3 anexos sem decisão (2, 3, 5)')).toBeDefined()
    expect(within(regiao).getByText('NR-15, Álcalis (Anexo 1): informe se o EPI é eficaz')).toBeDefined()

    fireEvent.click(within(regiao).getByRole('button', { name: 'Ir ao anexo' }))
    expect(onIr).toHaveBeenLastCalledWith(SEM_DECISAO[0])

    fireEvent.click(within(regiao).getByRole('button', { name: 'Ir ao campo' }))
    expect(onIr).toHaveBeenLastCalledWith(EPI)
  })

  it('usa o singular e a frase completa com um anexo só', () => {
    render(<PendenciasEmissao pendencias={[SEM_DECISAO[0]]} onIr={() => undefined} />)

    expect(screen.getByText('Falta 1 item para emitir o documento')).toBeDefined()
    expect(screen.getByText('NR-15, Anexo 2 (Tema 2): marque "Sem exposição" ou "Avaliação da suposta exposição"')).toBeDefined()
  })

  it('nomeia a ação de cada tipo de pendência', () => {
    render(
      <PendenciasEmissao
        pendencias={[
          { norma: 'NR-16', anexo: '', motivo: 'sem avaliação registrada' },
          { norma: 'NR-15', anexo: '9', anexoId: 'ANEXO_09', tema: 'Frio', motivo: 'sem avaliação detalhada' },
          { norma: 'NR-15', anexo: '12', anexoId: 'ANEXO_12', tema: 'Poeiras minerais', motivo: 'sem avaliação detalhada' },
        ]}
        onIr={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: 'Registrar avaliação NR-16' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Abrir avaliação' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Escolher subtipo' })).toBeDefined()
    expect(screen.getByText('NR-15, Anexo 12 (Poeiras minerais): escolha a poeira (asbesto, manganês ou sílica) no campo "Anexo NR-15" da avaliação')).toBeDefined()
    expect(screen.getByText('NR-16: nenhuma avaliação de periculosidade registrada')).toBeDefined()
  })

  it('mostra seis de cada vez e revela o resto sob pedido', () => {
    const muitas: PendenciaVarredura[] = Array.from({ length: 8 }, (_, indice) => ({
      norma: 'NR-15', anexo: '', motivo: 'sem conclusão individual', agenteId: `a${indice}`, agenteNome: `Agente ${indice}`, campo: 'observacao',
    }))
    render(<PendenciasEmissao pendencias={muitas} onIr={() => undefined} />)

    expect(screen.getAllByRole('button', { name: 'Ir ao campo' })).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais 2' }))
    expect(screen.getAllByRole('button', { name: 'Ir ao campo' })).toHaveLength(8)
    expect(screen.queryByRole('button', { name: /Mostrar mais/ })).toBeNull()
  })
})
