// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BaseCaepiCard } from './BaseCaepiCard'
import { ToastProvider } from '@/components/ui'
import * as api from '@/services/api'

vi.mock('@/services/api', () => ({
  caepi: { status: vi.fn(), importar: vi.fn() },
}))

const totais = {
  homologacoes: 120_000,
  cas: 41_000,
  validosHoje: 30_000,
  protetoresAuditivos: 540,
  comNrrsf: 210,
  nrrsfDoPerito: 3,
}

/** Monta um status com a varredura no estado que o teste quer olhar. */
const status = (colheita: api.StatusCaepi['colheitaNrrsf']): api.StatusCaepi => ({
  ultimaSincronizacao: null,
  totais,
  colheitaNrrsf: colheita,
})

const mostrar = async (colheita: api.StatusCaepi['colheitaNrrsf']) => {
  vi.mocked(api.caepi.status).mockResolvedValue(status(colheita))
  render(
    <ToastProvider>
      <BaseCaepiCard podeAtualizar={false} />
    </ToastProvider>,
  )
  // Espera o status chegar: antes dele o cartão ainda não tem o parágrafo.
  return await screen.findByText(/protetores auditivos/)
}

beforeEach(() => {
  vi.mocked(api.caepi.status).mockReset()
})

afterEach(cleanup)

describe('BaseCaepiCard — situação da varredura do NRRsf', () => {
  it('mostra quantos protetores já têm NRRsf e quantos vieram do perito', async () => {
    const paragrafo = await mostrar(null)
    expect(paragrafo.textContent).toContain('210 de 540')
    expect(paragrafo.textContent).toContain('3 informados pelo perito')
  })

  it('varredura rodando: a tela pede para esperar, não manda buscar no portal', async () => {
    const paragrafo = await mostrar({ ligada: true, rodando: true, ultima: null, proximaEm: null })
    expect(paragrafo.textContent).toContain('Buscando os que faltam no portal do MTE agora.')
  })

  it('sem varredura ainda: diz que a primeira não rodou, em vez de fingir que terminou', async () => {
    const paragrafo = await mostrar({ ligada: true, rodando: false, ultima: null, proximaEm: null })
    expect(paragrafo.textContent).toContain('A primeira varredura ainda não rodou.')
  })

  it('portal bloqueado: diz que foi o MTE que recusou e que o sistema tenta de novo sozinho', async () => {
    const paragrafo = await mostrar({
      ligada: true,
      rodando: false,
      ultima: {
        pendentes: 330,
        consultadas: 2,
        comNrrsf: 1,
        falhas: 1,
        motivo: 'portal_bloqueado',
        terminadaEm: '2026-08-23T12:00:00.000Z',
      },
      proximaEm: '2026-08-23T13:00:00.000Z',
    })
    expect(paragrafo.textContent).toContain('portal do MTE recusou as consultas automáticas')
    expect(paragrafo.textContent).toContain('tenta de novo sozinho')
  })

  it('varredura concluída: diz que não sobrou protetor pendente', async () => {
    const paragrafo = await mostrar({
      ligada: true,
      rodando: false,
      ultima: {
        pendentes: 12,
        consultadas: 12,
        comNrrsf: 12,
        falhas: 0,
        motivo: 'concluida',
        terminadaEm: '2026-08-23T12:00:00.000Z',
      },
      proximaEm: null,
    })
    expect(paragrafo.textContent).toContain('não há protetor pendente de consulta')
  })

  it('sobrou fila: diz quantas fichas leu e que o sistema continua sozinho', async () => {
    const paragrafo = await mostrar({
      ligada: true,
      rodando: false,
      ultima: {
        pendentes: 400,
        consultadas: 120,
        comNrrsf: 118,
        falhas: 2,
        motivo: 'teto_da_rodada',
        terminadaEm: '2026-08-23T12:00:00.000Z',
      },
      proximaEm: '2026-08-23T12:01:00.000Z',
    })
    expect(paragrafo.textContent).toContain('120 fichas lidas')
    expect(paragrafo.textContent).toContain('continua sozinho')
  })

  it('busca desligada: a tela avisa, senão o perito espera um número que não vem', async () => {
    const paragrafo = await mostrar({ ligada: false, rodando: false, ultima: null, proximaEm: null })
    expect(paragrafo.textContent).toContain('Busca automática desligada.')
  })
})
