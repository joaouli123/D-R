// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import { AgenteNr15Fields } from '@/components/AgenteNr15Fields'
import { BuscaNormativa } from '@/components/BuscaNormativa'
import { EpiSelector } from '@/components/EpiSelector'
import { SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import * as api from '@/services/api'
import type { AgenteAvaliado } from '@/types'

vi.mock('@/services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/api')>()
  return { ...original, epis: { listar: vi.fn() } }
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
    await user.type(screen.getByRole('textbox', { name: 'Categoria do EPI' }), 'Respirador manual')
    await user.type(screen.getByRole('textbox', { name: 'Modelo do EPI' }), 'Modelo informado')
    await user.type(screen.getByRole('textbox', { name: 'Marca do EPI' }), 'Marca informada')
    await user.click(screen.getByRole('button', { name: 'Adicionar EPI manual' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      epis: [expect.objectContaining({
        categoria: 'Respirador manual',
        modelo: 'Modelo informado',
        marca: 'Marca informada',
      })],
    }))
  })
})

describe('compatibilidade de agentes sem referencia especializada', () => {
  function Harness({ inicial, onChange }: { inicial: AgenteAvaliado; onChange: (agente: AgenteAvaliado) => void }) {
    const [agente, setAgente] = useState(inicial)
    return <AgenteNr15Fields agente={agente} onChange={(atualizado) => { setAgente(atualizado); onChange(atualizado) }} />
  }

  it('mantem limite, medicao e aviso legado editaveis fora dos anexos especializados', async () => {
    const user = userEvent.setup()
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
    const medicao = screen.getByRole('textbox', { name: 'Medição registrada' }) as HTMLInputElement
    expect(limite.value).toBe('Exposicao habitual')
    expect(medicao.value).toBe('Registro legado')
    expect(screen.getByRole('alert').textContent).toContain('referência normativa salva')

    await user.clear(medicao)
    await user.type(medicao, 'Sem quantificacao instrumental')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ medido: 'Sem quantificacao instrumental' }))
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

    const valor = screen.getByRole('textbox', { name: 'Valor medido' }) as HTMLInputElement
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

    const valor = screen.getByRole('textbox', { name: 'Valor medido' })
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

    await user.type(screen.getByRole('textbox', { name: 'Valor medido' }), '12,5')
    await user.tab()

    const corrigido = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as AgenteAvaliado
    expect(corrigido.valorMedido).toBe('12.5')
    expect(corrigido).not.toHaveProperty('medido')
  })
})
