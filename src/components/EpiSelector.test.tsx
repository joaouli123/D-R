// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import { AgenteNr15Fields } from '@/components/AgenteNr15Fields'
import { BuscaNormativa } from '@/components/BuscaNormativa'
import { EpiSelector } from '@/components/EpiSelector'
import { SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import * as api from '@/services/api'
import type { AgenteAvaliado } from '@/types'

vi.mock('@/services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/api')>()
  return {
    ...original,
    epis: { listar: vi.fn() },
    // snapshotCa fica o original de propósito: é ele que decide o que
    // do CA vai para o laudo, e é isso que os testes precisam checar.
    caepi: { consultar: vi.fn(), buscar: vi.fn(), salvarNrrsf: vi.fn(), status: vi.fn() },
  }
})

const ACETALDEIDO = SUBSTANCIAS_ANEXO_11.find((item) => item.label === 'Acetaldeído')!
const ACETILENO = SUBSTANCIAS_ANEXO_11.find((item) => item.label === 'Acetileno')!

const AGENTE_BASE: AgenteAvaliado = {
  id: 'agente-1',
  nome: 'Acetaldeído',
  cas: '75-07-0',
  tipo: 'quimico',
  criterio: 'quantitativo',
  anexoNr15: 'ANEXO_11',
  referenciaNormativaId: ACETALDEIDO.id,
  limiteTolerancia: ACETALDEIDO.limiteTolerancia,
  unidadeLimite: ACETALDEIDO.unidadeLimite,
  epiEficaz: false,
}

const EPI_3M = {
  id: 'epi-3m-6200',
  chave: '3m|6200|4115|5635',
  modelo: '3M 6200 + Cartucho 3M 6001',
  marca: '3M',
  caUnico: null,
  caPecaFacial: '4115',
  caFiltroCartucho: '5635',
  observacao: 'Conjunto respiratório',
  ativo: true,
  aplicacoes: [{ anexo: 'Anexo 11', categoria: 'Vapores Orgânicos' }],
}

const EPI_7502 = {
  ...EPI_3M,
  id: 'epi-3m-7502',
  chave: '3m|7502|12069|5635',
  modelo: '3M 7502 + Cartucho 3M 6001',
  caPecaFacial: '12069',
}

const EPI_MULTIGASES = {
  ...EPI_3M,
  id: 'epi-3m-multigases',
  chave: '3m|6200|4115|5640',
  modelo: '3M 6200 + Cartucho 3M 60926',
  caFiltroCartucho: '5640',
  aplicacoes: [{ anexo: 'Anexo 11', categoria: 'Multigases' }],
}

const EPI_GASES_ACIDOS = {
  ...EPI_3M,
  id: 'epi-3m-gases-acidos',
  chave: '3m|6200|4115|5636',
  modelo: '3M 6200 + Cartucho 3M 6002',
  caFiltroCartucho: '5636',
  aplicacoes: [{ anexo: 'Anexo 11', categoria: 'Gases Ácidos' }],
}

function promessaControlada<T>() {
  let resolver!: (valor: T) => void
  const promise = new Promise<T>((resolve) => { resolver = resolve })
  return { promise, resolver }
}

// O seletor pergunta o status da base ao montar. Sem um padrão aqui,
// `vi.fn()` devolveria undefined e o await quebraria toda montagem.
beforeEach(() => {
  vi.mocked(api.caepi.status).mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('busca cruzada do agente', () => {
  it('pesquisa pelo CAS, mostra agente e CAS na mesma opção e só seleciona após clique', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <BuscaNormativa
        itens={SUBSTANCIAS_ANEXO_11}
        value=""
        onSelect={onSelect}
        placeholder="Buscar agente ou CAS"
      />,
    )

    const busca = screen.getByRole('combobox', { name: 'Buscar agente ou CAS' })
    await user.type(busca, '75-07-0')

    const opcao = screen.getByRole('option', { name: /Acetaldeído.*75-07-0/ })
    expect(opcao).toBeDefined()
    expect(onSelect).not.toHaveBeenCalled()

    await user.click(opcao)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ label: 'Acetaldeído', cas: '75-07-0' }))
  })
})

describe('EpiSelector', () => {
  it('sugere proteção auditiva e calcula cada CA de forma independente', async () => {
    vi.mocked(api.epis.listar).mockResolvedValue([])
    const agente: AgenteAvaliado = {
      id: 'ruido-1',
      nome: 'Ruído',
      tipo: 'fisico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_01',
      valorMedido: '90',
      unidadeMedicao: 'dB(A)',
      epis: [
        { categoria: 'Proteção auditiva', modelo: 'CA 11882', marca: 'Não informada', caUnico: '11882', nivelProtecaoDb: 17, metodoAtenuacao: 'NRRsf' },
        { categoria: 'Proteção auditiva', modelo: 'Sem NRRsf', marca: 'Não informada', caUnico: '00000', nivelProtecaoDb: null },
      ],
    }

    render(<EpiSelector agente={agente} onChange={() => undefined} />)

    expect(api.epis.listar).toHaveBeenCalledWith({ anexo: 'Anexo 1' })
    expect(screen.getByText('90 - 17 = 73 dB(A)')).toBeDefined()
    expect(screen.getByText(/Proteção eficaz · limite 85 dB\(A\)/)).toBeDefined()
    expect(screen.getByText('Atenuação (NRRsf): 17 dB')).toBeDefined()
    expect(screen.getByText('90 - 0 = 90 dB(A)')).toBeDefined()
    expect(screen.getByText('Atenuação (NRRsf): não informada')).toBeDefined()
    expect(screen.getByText(/NRRsf não informado; considerado 0 dB/)).toBeDefined()
  })

  it('calcula o ruído de impacto pelo limite do Anexo 2', async () => {
    vi.mocked(api.epis.listar).mockResolvedValue([])
    const agente: AgenteAvaliado = {
      id: 'impacto-1',
      nome: 'Ruído de impacto',
      tipo: 'fisico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_02',
      valorMedido: '135',
      unidadeMedicao: 'dB(C)',
      epis: [
        { categoria: 'Proteção auditiva', modelo: 'CA 11882', marca: 'Não informada', caUnico: '11882', nivelProtecaoDb: 17, metodoAtenuacao: 'NRRsf' },
      ],
    }

    render(<EpiSelector agente={agente} onChange={() => undefined} />)

    expect(api.epis.listar).toHaveBeenCalledWith({ anexo: 'Anexo 2' })
    expect(screen.getByText('Atenuação (NRRsf): 17 dB')).toBeDefined()
    expect(screen.getByText('135 - 17 = 118 dB(C)')).toBeDefined()
    // 118 passaria longe do limite do Anexo 1 (85); aqui o limite é 130.
    expect(screen.getByText(/Proteção eficaz · limite 130 dB\(C\)/)).toBeDefined()
  })

  it('permite informar NRRsf ao cadastrar proteção auditiva manual', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([])
    const agente: AgenteAvaliado = {
      id: 'ruido-1', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo', anexoNr15: 'ANEXO_01',
    }
    render(<EpiSelector agente={agente} onChange={onChange} />)

    await user.click(screen.getByText('Informar EPI manualmente'))
    await user.type(screen.getByRole('textbox', { name: 'Equipamento' }), 'Protetor auditivo')
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), 'Protetor tipo concha')
    await user.type(screen.getByRole('textbox', { name: 'Validade do CA' }), '31/12/2028')
    await user.type(screen.getByRole('textbox', { name: 'CA único' }), '11882')
    await user.type(screen.getByRole('spinbutton', { name: 'NRRsf em dB' }), '13')
    expect(screen.queryByRole('textbox', { name: 'CA da peça facial' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'CA do cartucho ou filtro' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Adicionar EPI manual' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      epis: [expect.objectContaining({
        categoria: 'Protetor auditivo',
        modelo: 'Protetor tipo concha',
        validadeCa: '31/12/2028',
        caUnico: '11882',
        nivelProtecaoDb: 13,
        metodoAtenuacao: 'NRRsf',
      })],
    }))
  })

  it('rejeita NRRsf manual fora do intervalo aceito', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([])
    const agente: AgenteAvaliado = {
      id: 'ruido-1', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo', anexoNr15: 'ANEXO_01',
    }
    render(<EpiSelector agente={agente} onChange={onChange} />)

    await user.click(screen.getByText('Informar EPI manualmente'))
    await user.type(screen.getByRole('textbox', { name: 'Equipamento' }), 'Protetor auditivo')
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), 'Protetor')
    await user.type(screen.getByRole('textbox', { name: 'Validade do CA' }), '31/12/2028')
    await user.type(screen.getByRole('spinbutton', { name: 'NRRsf em dB' }), '101')
    await user.click(screen.getByRole('button', { name: 'Adicionar EPI manual' }))

    expect(screen.getByRole('alert').textContent).toContain('entre 0 e 100 dB')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('usa dois CAs no cadastro manual de proteção para agente químico', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([])

    render(<EpiSelector agente={AGENTE_BASE} onChange={onChange} />)
    await user.click(screen.getByText('Informar EPI manualmente'))

    expect(screen.queryByRole('textbox', { name: 'CA único' })).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: 'NRRsf em dB' })).toBeNull()
    await user.type(screen.getByRole('textbox', { name: 'Equipamento' }), 'Respirador semifacial')
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), 'Conjunto com filtro para vapores orgânicos')
    await user.type(screen.getByRole('textbox', { name: 'Validade do CA' }), '08/2029')
    await user.type(screen.getByRole('textbox', { name: 'CA da peça facial' }), '4115')
    await user.type(screen.getByRole('textbox', { name: 'CA do cartucho ou filtro' }), '5635')
    await user.click(screen.getByRole('button', { name: 'Adicionar EPI manual' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      epis: [expect.objectContaining({
        categoria: 'Respirador semifacial',
        modelo: 'Conjunto com filtro para vapores orgânicos',
        validadeCa: '08/2029',
        caPecaFacial: '4115',
        caFiltroCartucho: '5635',
      })],
    }))
    expect(onChange.mock.calls[0]?.[0].epis[0]).not.toHaveProperty('caUnico')
  })

  it('usa CA único e omite NRRsf no cadastro manual dos demais agentes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([])
    const agente: AgenteAvaliado = {
      id: 'vibracao-1', nome: 'Vibração', tipo: 'fisico', criterio: 'quantitativo', anexoNr15: 'ANEXO_08_VMB',
    }

    render(<EpiSelector agente={agente} onChange={onChange} />)
    await user.click(screen.getByText('Informar EPI manualmente'))

    expect(screen.getByRole('textbox', { name: 'CA único' })).toBeDefined()
    expect(screen.queryByRole('textbox', { name: 'CA da peça facial' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'CA do cartucho ou filtro' })).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: 'NRRsf em dB' })).toBeNull()
  })

  it('carrega sugestões sem selecionar e adiciona o snapshot somente pelo botão', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([EPI_3M])

    render(<EpiSelector agente={AGENTE_BASE} onChange={onChange} />)

    const adicionar = await screen.findByRole('button', { name: /Adicionar 3M 6200/ })
    expect(api.epis.listar).toHaveBeenCalledWith({ anexo: 'Anexo 11' })
    expect(onChange).not.toHaveBeenCalled()

    await user.click(adicionar)

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      epiEficaz: false,
      epis: [expect.objectContaining({
        modelo: expect.stringContaining('3M 6200'),
        caPecaFacial: '4115',
        caFiltroCartucho: '5635',
      })],
    }))
  })

  it('mantém dois EPIs adicionados ao mesmo agente no mesmo lote de eventos', async () => {
    const alterado = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([EPI_3M, EPI_7502])

    function Harness() {
      const [agente, setAgente] = useState(AGENTE_BASE)
      return <EpiSelector agente={agente} onChange={(valor) => { setAgente(valor); alterado(valor) }} />
    }

    render(<Harness />)
    const primeiro = await screen.findByRole('button', { name: /Adicionar 3M 6200/ })
    const segundo = screen.getByRole('button', { name: /Adicionar 3M 7502/ })

    act(() => {
      primeiro.click()
      segundo.click()
    })

    expect(alterado).toHaveBeenLastCalledWith(expect.objectContaining({
      epis: [
        expect.objectContaining({ catalogoId: EPI_3M.id }),
        expect.objectContaining({ catalogoId: EPI_7502.id }),
      ],
    }))
  })

  it('prioriza a categoria reconhecida, mantém Multigases e não recomenda categorias incompatíveis', async () => {
    vi.mocked(api.epis.listar).mockResolvedValue([EPI_GASES_ACIDOS, EPI_MULTIGASES, EPI_3M])

    render(<EpiSelector agente={AGENTE_BASE} onChange={() => undefined} />)

    const botoes = await screen.findAllByRole('button', { name: /^Adicionar 3M/ })
    expect(botoes.map((botao) => botao.getAttribute('aria-label'))).toEqual([
      `Adicionar ${EPI_3M.modelo}`,
      `Adicionar ${EPI_MULTIGASES.modelo}`,
    ])
  })

  it('não presume recomendação quando o agente não possui categoria reconhecida', async () => {
    vi.mocked(api.epis.listar).mockResolvedValue([EPI_3M])

    render(<EpiSelector agente={{ ...AGENTE_BASE, nome: 'Acetileno', referenciaNormativaId: ACETILENO.id }} onChange={() => undefined} />)

    expect(await screen.findByText('Pesquise o catálogo ou informe o EPI manualmente.')).toBeDefined()
    expect(api.epis.listar).not.toHaveBeenCalled()
  })

  it('pesquisa no catálogo e mantém a confirmação explícita', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([EPI_3M])

    render(<EpiSelector agente={AGENTE_BASE} onChange={onChange} />)
    await screen.findByText('Nenhum EPI sugerido para este agente.')

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar EPI, marca ou CA' }), '6200')
    await user.click(screen.getByRole('button', { name: 'Pesquisar EPI' }))

    expect(await screen.findByRole('button', { name: /Adicionar 3M 6200/ })).toBeDefined()
    expect(api.epis.listar).toHaveBeenLastCalledWith(expect.objectContaining({ q: '6200' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignora resposta antiga quando buscas submetidas terminam fora de ordem', async () => {
    const user = userEvent.setup()
    const buscaAntiga = promessaControlada<api.EpiCatalogo[]>()
    const buscaNova = promessaControlada<api.EpiCatalogo[]>()
    vi.mocked(api.epis.listar).mockImplementation((filtros = {}) => {
      if (filtros.q === '6200') return buscaAntiga.promise
      if (filtros.q === '7502') return buscaNova.promise
      return Promise.resolve([])
    })

    render(<EpiSelector agente={AGENTE_BASE} onChange={() => undefined} />)
    await screen.findByText('Nenhum EPI sugerido para este agente.')

    const campo = screen.getByRole('searchbox', { name: 'Pesquisar EPI, marca ou CA' })
    await user.type(campo, '6200')
    await user.click(screen.getByRole('button', { name: 'Pesquisar EPI' }))
    await user.clear(campo)
    await user.type(campo, '7502')
    await user.click(screen.getByRole('button', { name: 'Pesquisar EPI' }))

    await act(async () => {
      buscaNova.resolver([EPI_7502])
      await buscaNova.promise
    })
    expect(screen.getByRole('button', { name: /Adicionar 3M 7502/ })).toBeDefined()

    await act(async () => {
      buscaAntiga.resolver([EPI_3M])
      await buscaAntiga.promise
    })
    expect(screen.queryByRole('button', { name: /Adicionar 3M 6200/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Adicionar 3M 7502/ })).toBeDefined()
  })

  it('remove um snapshot associado sem alterar os demais dados do agente', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([])
    const agente = {
      ...AGENTE_BASE,
      epis: [{
        catalogoId: EPI_3M.id,
        categoria: 'Vapores Orgânicos',
        modelo: EPI_3M.modelo,
        marca: EPI_3M.marca,
        caPecaFacial: '4115',
        caFiltroCartucho: '5635',
      }],
    }

    render(<EpiSelector agente={agente} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /Remover 3M 6200/ }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Acetaldeído',
      epiEficaz: false,
      epis: [],
    }))
  })

  it('mantém a entrada manual utilizável quando a API falha', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockRejectedValue(new Error('indisponível'))

    render(<EpiSelector agente={AGENTE_BASE} onChange={onChange} />)
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar o catálogo')

    await user.click(screen.getByText('Informar EPI manualmente'))
    await user.type(screen.getByRole('textbox', { name: 'Equipamento' }), 'Respirador manual')
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), 'Modelo informado')
    await user.type(screen.getByRole('textbox', { name: 'Validade do CA' }), '31/12/2028')
    await user.click(screen.getByRole('button', { name: 'Adicionar EPI manual' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      epis: [expect.objectContaining({
        categoria: 'Respirador manual',
        modelo: 'Modelo informado',
        validadeCa: '31/12/2028',
      })],
    }))
  })
})

describe('consulta ao CAEPI', () => {
  const AGENTE_RUIDO: AgenteAvaliado = {
    id: 'ruido-1',
    nome: 'Ruído',
    tipo: 'fisico',
    criterio: 'quantitativo',
    anexoNr15: 'ANEXO_01',
    valorMedido: '90',
    unidadeMedicao: 'dB(A)',
  }

  // CA real: venceu em 23/03/2024, mas valia em 01/05/2022 — que é a
  // data do período periciado. É esse o caso que o módulo existe para
  // acertar.
  const HOMOLOGACAO: api.HomologacaoCa = {
    numeroCa: '11882',
    processo: '19980.011882/2015-11',
    dataValidade: '2024-03-23',
    situacao: 'VENCIDO',
    equipamento: 'PROTETOR AUDITIVO',
    descricao: 'Protetor auditivo de inserção, moldável, com cordão.',
    marca: '3M',
    referencia: '3M Millenium',
    cor: null,
    cnpj: null,
    razaoSocial: '3M DO BRASIL LTDA',
    natureza: null,
    aprovadoParaLaudo: null,
    restricaoLaudo: null,
    observacaoLaudo: null,
    normas: ['ANSI S3.19-1974'],
    categoria: 'Proteção auditiva',
    anexos: ['Anexo 1', 'Anexo 2'],
    exigeNrrsf: true,
    descontinuado: false,
    validade: {
      situacao: 'VALIDO',
      valido: true,
      motivo: 'Válido em 01/05/2022 — o CA vencia em 23/03/2024.',
      incerto: false,
    },
  }

  function ficha(ajustes: Partial<api.FichaCa> = {}): api.FichaCa {
    return {
      numeroCa: '11882',
      dataReferencia: '2022-05-01',
      exigeNrrsf: true,
      buscaNrrsf: 'ja_tinha',
      temHistorico: false,
      vigente: HOMOLOGACAO,
      homologacoes: [HOMOLOGACAO],
      atenuacao: { nrrsfDb: 17, fonte: 'PERITO', bandas: null, observacao: null, fichaConsultadaEm: null },
      ...ajustes,
    }
  }

  async function consultar(props: Partial<Parameters<typeof EpiSelector>[0]> = {}) {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([])

    render(
      <EpiSelector
        agente={AGENTE_RUIDO}
        dataReferencia="2022-05-01"
        onChange={onChange}
        {...props}
      />,
    )
    await user.type(screen.getByLabelText('Número do CA'), '11882')
    await user.click(screen.getByRole('button', { name: 'Consultar CA' }))
    return { user, onChange }
  }

  it('julga a validade na data da vistoria, não em hoje', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha())
    await consultar()

    expect(api.caepi.consultar).toHaveBeenCalledWith('11882', '2022-05-01', { forcarNrrsf: false })
    expect(await screen.findByText('Válido em 01/05/2022')).toBeDefined()
    expect(screen.getByText(/o CA vencia em 23\/03\/2024/)).toBeDefined()
    expect(screen.getByText(/CA 11882 · PROTETOR AUDITIVO/)).toBeDefined()
    expect(screen.getByText(/Anexo 1, Anexo 2/)).toBeDefined()
  })

  it('avisa quando o CA teve mais de uma homologação', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(
      ficha({ temHistorico: true, homologacoes: [HOMOLOGACAO, { ...HOMOLOGACAO, processo: 'P-2009' }] }),
    )
    await consultar()

    expect(await screen.findByText(/homologado 2 vezes, com validades diferentes/)).toBeDefined()
  })

  it('leva CA, validade e NRRsf para o laudo ao adicionar', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha())
    const { user, onChange } = await consultar()

    await user.click(await screen.findByRole('button', { name: 'Adicionar ao laudo' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      epis: [expect.objectContaining({
        categoria: 'PROTETOR AUDITIVO',
        modelo: 'Protetor auditivo de inserção, moldável, com cordão.',
        marca: '3M',
        caUnico: '11882',
        validadeCa: '23/03/2024',
        nivelProtecaoDb: 17,
        metodoAtenuacao: 'NRRsf',
      })],
    }))
  })

  it('pede o NRRsf quando não consta na base e o grava como do perito', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha({ atenuacao: null }))
    vi.mocked(api.caepi.salvarNrrsf).mockResolvedValue({
      numeroCa: '11882',
      nrrsfDb: 17,
      fonte: 'PERITO',
      observacao: null,
      atualizadoEm: '2026-08-20T12:00:00.000Z',
    })
    const { user } = await consultar()

    expect(await screen.findByText(/Não consta na base do MTE/)).toBeDefined()
    await user.type(screen.getByLabelText('NRRsf (atenuação do protetor)'), '17')
    await user.click(screen.getByRole('button', { name: 'Salvar NRRsf' }))

    expect(api.caepi.salvarNrrsf).toHaveBeenCalledWith('11882', { nrrsfDb: 17 })
    expect(await screen.findByText(/NRRsf de 17 dB salvo/)).toBeDefined()
    // 90 − 17 = 73 dB(A): abaixo dos 85 dB(A), proteção eficaz.
    expect(screen.getByText(/90 − 17 = 73 dB\(A\).*proteção eficaz/)).toBeDefined()
  })

  it('usa o NRRsf que o sistema foi buscar sozinho na ficha do MTE', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha({
      buscaNrrsf: 'encontrado',
      atenuacao: { nrrsfDb: 21, fonte: 'CAEPI', bandas: null, observacao: null, fichaConsultadaEm: '2026-08-22T10:00:00.000Z' },
    }))
    await consultar()

    expect(await screen.findByText(/21 dB · lido da ficha do CA no site do MTE/)).toBeDefined()
    // Com o valor em mãos, nada de mandar o perito ao site do MTE.
    expect(screen.queryByRole('button', { name: 'Buscar no MTE' })).toBeNull()
  })

  it('com o portal do MTE recusando, explica e deixa buscar de novo', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha({ buscaNrrsf: 'portal_bloqueado', atenuacao: null }))
    const { user } = await consultar()

    expect(await screen.findByText(/recusando consultas automáticas/)).toBeDefined()

    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha({
      buscaNrrsf: 'encontrado',
      atenuacao: { nrrsfDb: 21, fonte: 'CAEPI', bandas: null, observacao: null, fichaConsultadaEm: null },
    }))
    await user.click(screen.getByRole('button', { name: 'Buscar no MTE' }))

    expect(api.caepi.consultar).toHaveBeenLastCalledWith('11882', '2022-05-01', { forcarNrrsf: true })
    expect(await screen.findByText(/21 dB · lido da ficha do CA no site do MTE/)).toBeDefined()
  })

  it('quando a ficha do MTE não traz o NRRsf, manda direto para o certificado', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha({ buscaNrrsf: 'sem_valor_na_ficha', atenuacao: null }))
    await consultar()

    expect(await screen.findByText(/não traz o NRRsf/)).toBeDefined()
    // Insistir no portal não adiantaria: a ficha existe e não tem o campo.
    expect(screen.queryByRole('button', { name: 'Buscar no MTE' })).toBeNull()
  })

  it('recusa NRRsf fora da faixa sem chamar o servidor', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha({ atenuacao: null }))
    const { user } = await consultar()

    await user.type(await screen.findByLabelText('NRRsf (atenuação do protetor)'), '99')
    await user.click(screen.getByRole('button', { name: 'Salvar NRRsf' }))

    expect(api.caepi.salvarNrrsf).not.toHaveBeenCalled()
    expect(screen.getByText(/entre 0 e 50/)).toBeDefined()
  })

  it('manda para o cadastro manual quando o CA não existe na base', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(null)
    await consultar()

    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('não consta na base do Ministério do Trabalho')
    expect(aviso.textContent).toContain('informe o EPI manualmente')
    expect(screen.queryByRole('button', { name: 'Adicionar ao laudo' })).toBeNull()
  })

  it('com a base ainda não carregada, culpa o servidor e não o número do CA', async () => {
    vi.mocked(api.caepi.status).mockResolvedValue({
      ultimaSincronizacao: null,
      totais: { homologacoes: 0, cas: 0, validosHoje: 0, protetoresAuditivos: 0, comNrrsf: 0, nrrsfDoPerito: 0 },
    })
    vi.mocked(api.caepi.consultar).mockResolvedValue(null)
    await consultar()

    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('ainda não foi carregada neste servidor')
    // O número digitado está certo: dizer que ele "não consta" seria mentira.
    expect(aviso.textContent).not.toContain('Confira o número na etiqueta')
  })

  it('mostra o tamanho e a data da base quando ela está carregada', async () => {
    vi.mocked(api.caepi.status).mockResolvedValue({
      ultimaSincronizacao: {
        iniciadoEm: '2026-08-20T10:00:00.000Z',
        concluidoEm: '2026-08-20T10:04:00.000Z',
        status: 'CONCLUIDA',
        origem: 'manual',
        registrosLidos: 42343,
        registrosNovos: 42343,
        registrosAtualizados: 0,
        fichasConsultadas: 0,
        erro: null,
      },
      totais: { homologacoes: 42343, cas: 42321, validosHoje: 14903, protetoresAuditivos: 543, comNrrsf: 2, nrrsfDoPerito: 2 },
    })
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha())
    await consultar()

    expect(await screen.findByText(/42\.321 CAs, atualizada em 20\/08\/2026/)).toBeDefined()
  })

  it('deixa o perito dizer se o CA é da peça facial ou do cartucho', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(
      ficha({ exigeNrrsf: false, atenuacao: null, vigente: { ...HOMOLOGACAO, exigeNrrsf: false } }),
    )
    const { user, onChange } = await consultar({ agente: AGENTE_BASE })

    await user.click(await screen.findByRole('radio', { name: 'Cartucho / filtro' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar ao laudo' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      epis: [expect.objectContaining({ caFiltroCartucho: '11882' })],
    }))
    expect(onChange.mock.calls[0]?.[0].epis[0].caUnico).toBeUndefined()
  })

  it('sem data de vistoria, consulta em hoje e avisa o perito', async () => {
    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha())
    await consultar({ dataReferencia: undefined })

    expect(api.caepi.consultar).toHaveBeenCalledWith('11882', undefined, { forcarNrrsf: false })
    expect(screen.getByText('Validade conferida em hoje')).toBeDefined()
    expect(screen.getByText(/Preencha a data da vistoria/)).toBeDefined()
  })

  /**
   * O NRRsf quase nunca chega antes do EPI: o perito adiciona o protetor
   * ao laudo e só depois o número aparece — numa segunda tentativa do
   * portal ou digitado da ficha do MTE. Aqui o agente precisa de estado
   * de verdade; com onChange de mentira o EPI nunca chega ao agente e o
   * teste passaria sem provar nada.
   */
  function Laudo({ aoMudar }: { aoMudar: (agente: AgenteAvaliado) => void }) {
    const [agente, setAgente] = useState<AgenteAvaliado>(AGENTE_RUIDO)
    return (
      <EpiSelector
        agente={agente}
        dataReferencia="2022-05-01"
        onChange={(atualizado) => { setAgente(atualizado); aoMudar(atualizado) }}
      />
    )
  }

  /**
   * Adicionar ao laudo limpa a consulta, então o perito digita o CA de
   * novo para mexer no NRRsf — é por esse caminho que o número chega
   * atrasado, e é ele que precisa ser testado.
   */
  async function comEpiNoLaudo(inicial: api.FichaCa, aoVoltar = inicial) {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    vi.mocked(api.epis.listar).mockResolvedValue([])
    vi.mocked(api.caepi.consultar).mockResolvedValue(inicial)

    render(<Laudo aoMudar={aoMudar} />)
    await user.type(screen.getByLabelText('Número do CA'), '11882')
    await user.click(screen.getByRole('button', { name: 'Consultar CA' }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar ao laudo' }))

    vi.mocked(api.caepi.consultar).mockResolvedValue(aoVoltar)
    await user.type(screen.getByLabelText('Número do CA'), '11882')
    await user.click(screen.getByRole('button', { name: 'Consultar CA' }))
    await screen.findByRole('button', { name: 'Já adicionado' })
    return { user, aoMudar }
  }

  it('leva ao EPI já no laudo o NRRsf que o perito digitou depois', async () => {
    const { user } = await comEpiNoLaudo(ficha({ buscaNrrsf: 'sem_valor_na_ficha', atenuacao: null }))
    expect(screen.getByText('Atenuação (NRRsf): não informada')).toBeDefined()

    vi.mocked(api.caepi.salvarNrrsf).mockResolvedValue({
      numeroCa: '11882',
      nrrsfDb: 21,
      fonte: 'PERITO',
      observacao: null,
      atualizadoEm: '2026-08-22T12:00:00.000Z',
    })
    await user.type(screen.getByLabelText('NRRsf (atenuação do protetor)'), '21')
    await user.click(screen.getByRole('button', { name: 'Salvar NRRsf' }))

    // Sem isto o perito preenche o número, vê a ficha certa na tela e o
    // laudo sai com o protetor sem atenuação nenhuma.
    expect(await screen.findByText('Atenuação (NRRsf): 21 dB')).toBeDefined()
  })

  it('leva ao EPI já no laudo o NRRsf que o portal devolveu na segunda tentativa', async () => {
    const { user } = await comEpiNoLaudo(ficha({ buscaNrrsf: 'portal_bloqueado', atenuacao: null }))
    expect(screen.getByText('Atenuação (NRRsf): não informada')).toBeDefined()

    vi.mocked(api.caepi.consultar).mockResolvedValue(ficha({
      buscaNrrsf: 'encontrado',
      atenuacao: { nrrsfDb: 15, fonte: 'CAEPI', bandas: null, observacao: null, fichaConsultadaEm: null },
    }))
    await user.click(screen.getByRole('button', { name: 'Buscar no MTE' }))

    expect(await screen.findByText('Atenuação (NRRsf): 15 dB')).toBeDefined()
  })

  it('não apaga a atenuação do laudo quando a nova consulta volta sem NRRsf', async () => {
    await comEpiNoLaudo(ficha(), ficha({ buscaNrrsf: 'portal_bloqueado', atenuacao: null }))

    expect(await screen.findByText(/recusando consultas automáticas/)).toBeDefined()
    // O portal ter falhado não desmente o número que já estava no laudo.
    expect(screen.getByText('Atenuação (NRRsf): 17 dB')).toBeDefined()
  })

  it('apaga também no EPI do laudo quando o perito apaga o NRRsf', async () => {
    const { user } = await comEpiNoLaudo(ficha())
    expect(screen.getByText('Atenuação (NRRsf): 17 dB')).toBeDefined()

    vi.mocked(api.caepi.salvarNrrsf).mockResolvedValue({
      numeroCa: '11882',
      nrrsfDb: null,
      fonte: 'PERITO',
      observacao: null,
      atualizadoEm: '2026-08-22T12:00:00.000Z',
    })
    await user.clear(screen.getByLabelText('NRRsf (atenuação do protetor)'))
    await user.click(screen.getByRole('button', { name: 'Salvar NRRsf' }))

    expect(await screen.findByText('Atenuação (NRRsf): não informada')).toBeDefined()
  })
})

describe('compatibilidade de agentes sem referencia especializada', () => {
  function Harness({ inicial, onChange }: { inicial: AgenteAvaliado; onChange: (agente: AgenteAvaliado) => void }) {
    const [agente, setAgente] = useState(inicial)
    return <AgenteNr15Fields agente={agente} onChange={(atualizado) => { setAgente(atualizado); onChange(atualizado) }} />
  }

  it('preserva o registro legado sem pedir medição em anexo qualitativo', () => {
    const onChange = vi.fn()
    render(<Harness inicial={{
      id: 'agente-7',
      nome: 'Radiacao nao ionizante',
      tipo: 'fisico',
      criterio: 'qualitativo',
      anexoNr15: 'ANEXO_07',
      referenciaNormativaId: 'ANEXO_07_REFERENCIA_LEGADA',
      limiteTolerancia: 'Exposicao habitual',
      medido: 'Registro legado',
    }} onChange={onChange} />)

    const limite = screen.getByRole('textbox', { name: 'Limite de tolerância' }) as HTMLInputElement
    expect(limite.value).toBe('Exposicao habitual')
    expect(screen.queryByRole('textbox', { name: /^Medição em perícia/ })).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('referência normativa salva')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('remove unidade estruturada ao limpar a referencia', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness inicial={{ ...AGENTE_BASE, unidadeMedicao: 'mg/m³', valorMedido: '12.5' }} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Limpar referência' }))

    const limpo = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as AgenteAvaliado
    expect(limpo).not.toHaveProperty('unidadeMedicao')
    expect(limpo).not.toHaveProperty('unidadeLimite')
    expect(limpo.valorMedido).toBe('12.5')
  })
})

describe('medição estruturada', () => {
  function Harness({ inicial, onChange }: { inicial: AgenteAvaliado; onChange: (agente: AgenteAvaliado) => void }) {
    const [agente, setAgente] = useState(inicial)
    return (
      <AgenteNr15Fields
        agente={agente}
        onChange={(atualizado) => {
          setAgente(atualizado)
          onChange(atualizado)
        }}
      />
    )
  }

  it('aceita decimal, escolhe unidade e deriva o limite somente leitura', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness inicial={AGENTE_BASE} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Unidade da medição' }), 'mg/m³')
    const limite = screen.getByRole('textbox', { name: 'Limite de tolerância' }) as HTMLInputElement
    expect(limite.value).toBe('140 mg/m³')
    expect(limite.readOnly).toBe(true)

    const valor = screen.getByRole('textbox', { name: 'Medição em perícia (mg/m³)' }) as HTMLInputElement
    expect(valor.inputMode).toBe('decimal')
    await user.type(valor, '12,5')
    await user.tab()

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      valorMedido: '12.5',
      unidadeMedicao: 'mg/m³',
      limiteTolerancia: '140 mg/m³',
    }))
  })

  it('remove a unidade estruturada ao voltar para a opção vazia', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness inicial={{ ...AGENTE_BASE, unidadeMedicao: 'ppm', unidadeLimite: 'ppm', limiteTolerancia: '78 ppm' }} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Unidade da medição' }), '')

    const atualizado = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as AgenteAvaliado
    expect(atualizado).not.toHaveProperty('unidadeMedicao')
    expect(atualizado).not.toHaveProperty('unidadeLimite')
    expect(atualizado).not.toHaveProperty('limiteTolerancia')
  })

  it('oferece a unidade literal de oxigênio sem conversão', () => {
    render(<Harness inicial={{
      ...AGENTE_BASE,
      nome: ACETILENO.label,
      referenciaNormativaId: ACETILENO.id,
      cas: ACETILENO.cas,
      unidadeLimite: ACETILENO.unidadeLimite,
      limiteTolerancia: ACETILENO.limiteTolerancia,
    }} onChange={() => undefined} />)

    expect(screen.getByRole('option', { name: '% O₂ em volume' })).toBeDefined()
  })

  it('rejeita texto no novo valor numérico', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness inicial={AGENTE_BASE} onChange={onChange} />)

    const valor = screen.getByRole('textbox', { name: 'Medição em perícia' })
    await user.type(valor, 'doze')
    await user.tab()

    const erro = screen.getByRole('alert')
    expect(erro.textContent).toContain('Informe um valor numérico')
    expect(valor.getAttribute('aria-invalid')).toBe('true')
    expect(valor.getAttribute('aria-describedby')).toBe(erro.id)
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ valorMedido: 'doze' }))
  })

  it('preserva medição legada ambígua até a correção explícita', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness inicial={{ ...AGENTE_BASE, medido: '12 ppm (pico)' }} onChange={onChange} />)

    expect(screen.getByRole('alert').textContent).toContain('12 ppm (pico)')
    expect(onChange).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: 'Medição em perícia' }), '12,5')
    await user.tab()

    const corrigido = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as AgenteAvaliado
    expect(corrigido.valorMedido).toBe('12.5')
    expect(corrigido).not.toHaveProperty('medido')
  })
})
