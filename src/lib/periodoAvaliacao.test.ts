import { describe, expect, it } from 'vitest'
import {
  intervaloDoPeriodo,
  periodoAvaliacaoEmpresa,
  subtrairAnos,
} from './periodoAvaliacao'

// ============================================================
// Os dois exemplos do cliente são o coração destes testes:
//
//   · admitido em 2020, ação ajuizada em 2026 → avalia de 2021 em diante;
//   · admitido em 2023, ação ajuizada em 2026 → avalia da admissão.
//
// O resto trata dos casos que o exemplo não cobre e que aparecem na
// mesa do perito: contrato ainda em curso, contrato encerrado antes da
// prescrição, e a data de ajuizamento que ainda não foi consultada.
// ============================================================

describe('subtrairAnos', () => {
  it('retrocede cinco anos mantendo dia e mês', () => {
    expect(subtrairAnos('2026-05-26', 5)).toBe('2021-05-26')
  })

  it('encaixa 29 de fevereiro no último dia do mês do ano de destino', () => {
    // 2024 é bissexto, 2019 não é: o corte cai em 28/02.
    expect(subtrairAnos('2024-02-29', 5)).toBe('2019-02-28')
  })

  it('mantém 29 de fevereiro quando o ano de destino também é bissexto', () => {
    expect(subtrairAnos('2028-02-29', 4)).toBe('2024-02-29')
  })

  it('devolve a entrada intacta quando ela não é uma data', () => {
    expect(subtrairAnos('sem data', 5)).toBe('sem data')
  })
})

describe('periodoAvaliacaoEmpresa', () => {
  it('exemplo 1 do cliente: admissão anterior à janela, conta dos cinco anos', () => {
    const periodo = periodoAvaliacaoEmpresa({
      dataAjuizamento: '2026-05-26',
      admissao: '2020-03-10',
      demissao: '2025-09-30',
    })

    expect(periodo).toMatchObject({
      inicio: '2021-05-26',
      fim: '2025-09-30',
      motivoInicio: 'prescricao',
      marcoPrescricional: '2021-05-26',
      foraDoPrazo: false,
    })
  })

  it('exemplo 2 do cliente: admissão dentro da janela, conta da admissão', () => {
    const periodo = periodoAvaliacaoEmpresa({
      dataAjuizamento: '2026-05-26',
      admissao: '2023-02-01',
      demissao: '2025-09-30',
    })

    expect(periodo).toMatchObject({
      inicio: '2023-02-01',
      motivoInicio: 'admissao',
      marcoPrescricional: '2021-05-26',
    })
  })

  it('sem data de ajuizamento não inventa janela nenhuma', () => {
    expect(periodoAvaliacaoEmpresa({ admissao: '2020-03-10', demissao: '2025-09-30' })).toBeNull()
    expect(periodoAvaliacaoEmpresa({ dataAjuizamento: '', admissao: '2020-03-10' })).toBeNull()
    expect(periodoAvaliacaoEmpresa({ dataAjuizamento: 'a combinar' })).toBeNull()
  })

  it('contrato em curso fica sem data de fim', () => {
    const periodo = periodoAvaliacaoEmpresa({
      dataAjuizamento: '2026-05-26',
      admissao: '2019-01-15',
    })

    expect(periodo?.fim).toBeUndefined()
    expect(periodo?.inicio).toBe('2021-05-26')
  })

  it('marca fora do prazo quando o contrato acabou antes do corte', () => {
    const periodo = periodoAvaliacaoEmpresa({
      dataAjuizamento: '2026-05-26',
      admissao: '2014-01-10',
      demissao: '2019-08-20',
    })

    expect(periodo?.foraDoPrazo).toBe(true)
  })

  it('admissão exatamente no marco não desloca o início', () => {
    const periodo = periodoAvaliacaoEmpresa({
      dataAjuizamento: '2026-05-26',
      admissao: '2021-05-26',
    })

    expect(periodo?.motivoInicio).toBe('prescricao')
    expect(periodo?.inicio).toBe('2021-05-26')
  })

  it('aceita data com hora, como vem da consulta ao CNJ', () => {
    const periodo = periodoAvaliacaoEmpresa({
      dataAjuizamento: '2026-05-26T14:32:00.000Z',
      admissao: '2020-03-10',
    })

    expect(periodo?.marcoPrescricional).toBe('2021-05-26')
  })

  it('sem admissão cadastrada usa o marco dos cinco anos', () => {
    const periodo = periodoAvaliacaoEmpresa({ dataAjuizamento: '2026-05-26' })

    expect(periodo).toMatchObject({ inicio: '2021-05-26', motivoInicio: 'prescricao' })
  })
})
describe('intervaloDoPeriodo', () => {
  const doExemplo = (extras: Parameters<typeof periodoAvaliacaoEmpresa>[0]) =>
    periodoAvaliacaoEmpresa({ dataAjuizamento: '2026-05-26', ...extras })!

  it('escreve as duas pontas em pt-BR', () => {
    expect(intervaloDoPeriodo(doExemplo({ admissao: '2020-03-10', demissao: '2025-09-30' })))
      .toBe('26/05/2021 a 30/09/2025')
  })

  it('diz "até o fim do contrato" quando não há demissão', () => {
    expect(intervaloDoPeriodo(doExemplo({ admissao: '2020-03-10' })))
      .toBe('26/05/2021 até o fim do contrato')
  })

  it('não devolve intervalo quando o contrato está fora do prazo', () => {
    const periodo = doExemplo({ admissao: '2014-01-10', demissao: '2019-08-20' })
    expect(intervaloDoPeriodo(periodo)).toBe(
      'Nenhum — contrato encerrado antes do marco prescricional',
    )
  })
})

describe('texto exibido para o período', () => {
  it('devolve somente o intervalo calculado, sem justificativa adicional', () => {
    const periodo = periodoAvaliacaoEmpresa({
      dataAjuizamento: '2026-06-10',
      admissao: '2020-01-01',
    })!

    expect(intervaloDoPeriodo(periodo)).toBe('10/06/2021 até o fim do contrato')
  })
})
