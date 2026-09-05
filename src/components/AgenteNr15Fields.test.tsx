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

    const medicao = screen.getByRole('textbox', { name: 'Medição em perícia (dB(A))' })
    expect(medicao.getAttribute('inputmode')).toBe('decimal')
    expect(screen.getByText('Medição em perícia (dB(A))')).toBeDefined()
    expect(screen.queryByRole('textbox', { name: 'Unidade da medição' })).toBeNull()
    expect(screen.getByDisplayValue('85 dB(A) para jornada de 8h/dia (q=5)').getAttribute('readonly')).not.toBeNull()

    await user.type(medicao, '90,5')
    await user.tab()
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ valorMedido: '90.5', unidadeMedicao: 'dB(A)' }))
  })

  it('mostra no lugar da unidade o resultado calculado após a proteção', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      valorMedido: '90',
      epis: [{
        categoria: 'Protetor auditivo',
        modelo: 'CA 11882',
        caUnico: '11882',
        nivelProtecaoDb: 17,
      }],
    }} onChange={() => undefined} />)

    const resultado = screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement
    expect(resultado.value).toBe('73 dB(A)')
    expect(resultado.readOnly).toBe(true)
    expect(screen.getByText('90 − 17 = 73 dB(A) · Proteção eficaz')).toBeDefined()
  })

  it('não mostra medição numérica para anexo qualitativo', () => {
    render(<AgenteNr15Fields agente={{ ...RUIDO, anexoNr15: 'ANEXO_07', nome: 'Radiação', criterio: 'qualitativo' }} onChange={() => undefined} />)
    expect(screen.queryByRole('textbox', { name: /^Medição em perícia/ })).toBeNull()
  })

  it('calcula com o protetor mais atenuante quando há vários associados', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      valorMedido: '88.41',
      epis: [
        { categoria: 'Protetor auditivo', modelo: 'Plug CA 5745', caUnico: '5745', nivelProtecaoDb: 9 },
        { categoria: 'Protetor auditivo', modelo: 'Concha CA 11882', caUnico: '11882', nivelProtecaoDb: 17 },
      ],
    }} onChange={() => undefined} />)

    const resultado = screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement
    expect(resultado.value).toBe('71.41 dB(A)')
    expect(screen.getByText(/melhor entre 2 protetores/)).toBeDefined()
  })
})

describe('origem da medição', () => {
  it('adota a avaliação da empresa e avisa a divergência com a do perito', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      valorMedido: '88.41',
      medicaoEmpresa: '83',
      fonteMedicaoEmpresa: 'PGR 2024',
      origemMedicao: 'empresa',
      epis: [{ categoria: 'Protetor auditivo', modelo: 'Concha CA 11882', caUnico: '11882', nivelProtecaoDb: 17 }],
    }} onChange={() => undefined} />)

    // A conta tem de sair de 83, não de 88,41: é a empresa que o laudo adotou.
    expect((screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement).value).toBe('66 dB(A)')
    expect(screen.getByRole('status').textContent).toContain('As duas avaliações divergem')
    expect((screen.getByRole('textbox', { name: 'Medição da empresa (dB(A))' }) as HTMLInputElement).value).toBe('83')
  })

  it('apresenta as três alternativas sob o rótulo enxuto de origem da medição', () => {
    render(<AgenteNr15Fields agente={RUIDO} onChange={() => undefined} />)

    const seletor = screen.getByRole('combobox', { name: 'Origem da medição' })
    expect(seletor.querySelectorAll('option')).toHaveLength(3)
    expect(screen.queryByText('Medição adotada no laudo')).toBeNull()
  })

  it('permite escolher registros do processo como terceira forma da medição da empresa', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      medicaoEmpresa: '83',
      medicaoEmpresaAte: '88.5',
    }} onChange={onChange} />)

    const seletor = screen.getByRole('combobox', { name: 'Forma da medição da empresa' })
    expect(seletor.querySelectorAll('option')).toHaveLength(3)
    expect(seletor.textContent).toContain('Medição conforme registros apresentados junto ao processo')

    await user.selectOptions(seletor, 'registros_processo')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      tipoMedicaoEmpresa: 'registros_processo',
    }))
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ medicaoEmpresa: expect.anything() }))
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ medicaoEmpresaAte: expect.anything() }))
  })

  it('grava a medição da empresa sem apagar a do perito', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{ ...RUIDO, valorMedido: '88.41' }} onChange={onChange} />)

    await user.type(screen.getByRole('textbox', { name: 'Medição da empresa (dB(A))' }), '83,0')
    await user.tab()

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ valorMedido: '88.41', medicaoEmpresa: '83.0' }))
  })

  it('registra que o perito não mediu e passa a adotar a empresa', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{ ...RUIDO, medicaoEmpresa: '83' }} onChange={onChange} />)

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Origem da medição' }),
      'nao_informado',
    )

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ origemMedicao: 'nao_informado' }))
  })

  it('grava o topo da faixa da empresa sem apagar o início', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      medicaoEmpresa: '83',
      tipoMedicaoEmpresa: 'faixa',
      origemMedicao: 'empresa',
    }} onChange={onChange} />)

    await user.type(screen.getByRole('textbox', { name: 'Medição da empresa até' }), '88,5')
    await user.tab()

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ medicaoEmpresa: '83', medicaoEmpresaAte: '88.5' }),
    )
  })

  it('com faixa, calcula pela maior e diz isso na tela', () => {
    render(<AgenteNr15Fields agente={{
      ...RUIDO,
      medicaoEmpresa: '83',
      medicaoEmpresaAte: '88',
      origemMedicao: 'empresa',
      epis: [{ categoria: 'Protetor auditivo', modelo: 'Concha CA 11882', caUnico: '11882', nivelProtecaoDb: 17 }],
    }} onChange={() => undefined} />)

    // 88 − 17, não 83 − 17: o laudo parte do pior cenário do período.
    expect((screen.getByRole('textbox', { name: 'Resultado após proteção' }) as HTMLInputElement).value).toBe('71 dB(A)')
    expect(screen.getByText(/entre 83 e 88 dB\(A\) — o laudo considera a maior/)).toBeDefined()
  })
})

describe('fonte do ruído', () => {
  it('mostra a frase que vai ao laudo assim que a fonte é escolhida', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={RUIDO} onChange={onChange} />)

    const seletor = screen.getByRole('combobox', { name: 'Fonte do ruído' })
    await user.selectOptions(seletor, 'administrativa')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ fonteRuido: 'administrativa' }))

    cleanup()
    render(<AgenteNr15Fields agente={{ ...RUIDO, fonteRuido: 'administrativa' }} onChange={onChange} />)
    expect(screen.getByText(/Ambiente destinado a atividades administrativas/)).toBeDefined()
  })

  it('volta a não informar a fonte sem deixar o campo vazio gravado', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AgenteNr15Fields agente={{ ...RUIDO, fonteRuido: 'maquinas' }} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Fonte do ruído' }), '')

    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ fonteRuido: expect.anything() }))
  })

  it('não pergunta a fonte do ruído em agente que não é de ruído', () => {
    render(<AgenteNr15Fields
      agente={{ ...RUIDO, anexoNr15: 'ANEXO_11', nome: 'Acetaldeído', unidadeMedicao: 'ppm' }}
      onChange={() => undefined}
    />)

    expect(screen.queryByRole('combobox', { name: 'Fonte do ruído' })).toBeNull()
  })
})

// A CETESB, do primeiro desenho, publica 96 produtos e cobre 40 dos 146
// agentes do Anexo 11 — e não filtra por URL. As bases de agora recebem o CAS
// que vai sair no parecer já na busca, sem o perito redigitar.
describe('consulta do número CAS', () => {
  const QUIMICO: AgenteAvaliado = {
    id: 'q-1',
    nome: 'Acetaldeído',
    tipo: 'quimico',
    criterio: 'quantitativo',
    anexoNr15: 'ANEXO_12_MANGANES_FUMOS',
    cas: '7439-96-5',
    unidadeMedicao: 'mg/m³',
  }

  it('leva o CAS gravado para a busca das duas bases', () => {
    render(<AgenteNr15Fields agente={QUIMICO} onChange={() => undefined} />)

    expect(screen.getByRole('link', { name: /CAS Common Chemistry/ }).getAttribute('href'))
      .toBe('https://commonchemistry.cas.org/results?q=7439-96-5')
    expect(screen.getByRole('link', { name: /PubChem/ }).getAttribute('href'))
      .toBe('https://pubchem.ncbi.nlm.nih.gov/#query=7439-96-5')
  })

  it('abre a base sem termo quando o agente ainda não tem CAS', () => {
    render(<AgenteNr15Fields agente={{ ...QUIMICO, cas: undefined }} onChange={() => undefined} />)

    expect(screen.getByRole('link', { name: /CAS Common Chemistry/ }).getAttribute('href'))
      .toBe('https://commonchemistry.cas.org/')
    expect(screen.getByRole('link', { name: /PubChem/ }).getAttribute('href'))
      .toBe('https://pubchem.ncbi.nlm.nih.gov/')
  })

  it('não oferece consulta de CAS em agente físico', () => {
    render(<AgenteNr15Fields agente={RUIDO} onChange={() => undefined} />)

    expect(screen.queryByRole('link', { name: /CAS Common Chemistry/ })).toBeNull()
  })

  it('usa o CAS da substância do Anexo 11 quando o registro antigo gravou o campo vazio', () => {
    render(<AgenteNr15Fields
      agente={{ ...QUIMICO, anexoNr15: 'ANEXO_11', referenciaNormativaId: 'ANEXO_11_ACETALDEIDO', cas: '', unidadeMedicao: 'ppm' }}
      onChange={() => undefined}
    />)

    expect(screen.getByRole('link', { name: /CAS Common Chemistry/ }).getAttribute('href'))
      .toBe('https://commonchemistry.cas.org/results?q=75-07-0')
  })

  it('prefere o CAS gravado no agente ao da referência — é o que sai no parecer', () => {
    render(<AgenteNr15Fields
      agente={{ ...QUIMICO, anexoNr15: 'ANEXO_11', referenciaNormativaId: 'ANEXO_11_ACETALDEIDO', cas: '7439-96-5', unidadeMedicao: 'ppm' }}
      onChange={() => undefined}
    />)

    expect(screen.getByRole('link', { name: /PubChem/ }).getAttribute('href'))
      .toBe('https://pubchem.ncbi.nlm.nih.gov/#query=7439-96-5')
  })

  it('oferece a consulta na atividade do Anexo 13, que não traz CAS na lista', () => {
    const atividade: AgenteAvaliado = {
      id: 'q-13',
      nome: 'Arsênico',
      tipo: 'quimico',
      criterio: 'qualitativo',
      anexoNr15: 'ANEXO_13',
      referenciaNormativaId: 'ANEXO_13_ARSENICO_MAX_01',
      grau: 'maximo',
    }
    render(<AgenteNr15Fields agente={atividade} onChange={() => undefined} />)

    expect(screen.getByText('Consultar CAS em:')).toBeDefined()
    expect(screen.getByRole('link', { name: /CAS Common Chemistry/ }).getAttribute('href'))
      .toBe('https://commonchemistry.cas.org/')

    cleanup()
    render(<AgenteNr15Fields agente={{ ...atividade, cas: '7784-42-1' }} onChange={() => undefined} />)

    expect(screen.getByText('Conferir CAS em:')).toBeDefined()
    expect(screen.getByRole('link', { name: /CAS Common Chemistry/ }).getAttribute('href'))
      .toBe('https://commonchemistry.cas.org/results?q=7784-42-1')
  })

  it('não oferece consulta de CAS em agente biológico do Anexo 14', () => {
    render(<AgenteNr15Fields
      agente={{
        id: 'b-14',
        nome: 'Pacientes em isolamento',
        tipo: 'biologico',
        criterio: 'qualitativo',
        anexoNr15: 'ANEXO_14',
        referenciaNormativaId: 'ANEXO_14_MAX_PACIENTES_EM_ISOLAMENTO',
        grau: 'maximo',
      }}
      onChange={() => undefined}
    />)

    expect(screen.queryByText(/CAS em:/)).toBeNull()
    expect(screen.queryByRole('link', { name: /PubChem/ })).toBeNull()
  })

  it('ignora espaços em volta do CAS e trata número malformado como ausente', () => {
    render(<AgenteNr15Fields agente={{ ...QUIMICO, cas: ' 7439-96-5 ' }} onChange={() => undefined} />)
    expect(screen.getByRole('link', { name: /CAS Common Chemistry/ }).getAttribute('href'))
      .toBe('https://commonchemistry.cas.org/results?q=7439-96-5')

    cleanup()
    render(<AgenteNr15Fields agente={{ ...QUIMICO, cas: '7439965' }} onChange={() => undefined} />)
    expect(screen.getByText('Consultar CAS em:')).toBeDefined()
    expect(screen.getByRole('link', { name: /CAS Common Chemistry/ }).getAttribute('href'))
      .toBe('https://commonchemistry.cas.org/')
  })

  it('abre as bases em nova aba sem vazar o referer', () => {
    render(<AgenteNr15Fields agente={QUIMICO} onChange={() => undefined} />)

    const links = screen.getAllByRole('link', { name: /CAS Common Chemistry|PubChem/ })
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noreferrer')
    }
  })
})
