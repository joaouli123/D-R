// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PericulosidadeNr16Fields } from './PericulosidadeNr16Fields'
import {
  ANALISE_ANEXOS_NR16,
  NOME_PADRAO_SEM_ENQUADRAMENTO,
  OBSERVACOES_PADRAO_NR16,
  PADRAO_NR16_SEM_ENQUADRAMENTO,
  SEM_ENQUADRAMENTO_NR16,
} from '@/content/anexosNr16'
import { gerarAnaliseNr16 } from '@/content/nr16/analise'
import { areasDaHipoteseNr16, catalogoDoAnexoNr16, hipoteseCorrespondente } from '@/content/nr16/catalogo'
import type { AgenteAvaliado } from '@/types'

afterEach(cleanup)

const avaliacao: AgenteAvaliado = {
  id: 'risco-1',
  nome: '',
  tipo: 'periculosidade',
  criterio: 'qualitativo',
}

describe('PericulosidadeNr16Fields', () => {
  it('separa o anexo da NR-16 e limpa propriedades incompatíveis da NR-15', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, anexoNr15: 'ANEXO_11', cas: '67-64-1', grau: 'medio' }}
      onChange={onChange}
    />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Anexo NR-16' }), 'ANEXO_02')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
    }))
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ anexoNr15: expect.anything() }))
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ cas: expect.anything() }))
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ grau: expect.anything() }))
  })

  it('registra atividade, exposição e resultado técnico na matriz', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }}
      onChange={onChange}
    />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Atividade ou operação avaliada' }), {
      target: { value: 'Abastecimento' },
    })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ atividadeEnquadrada: 'Abastecimento' }))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Exposição ao risco' }), 'intermitente')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ exposicaoPericulosidade: 'intermitente' }))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Resultado técnico' }), 'caracterizada')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultadoPericulosidade: 'caracterizada' }))
  })

  it('remove os campos opcionais ao voltar para a opção vazia', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{
        ...avaliacao,
        exposicaoPericulosidade: 'permanente',
        resultadoPericulosidade: 'caracterizada',
      }}
      onChange={onChange}
    />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Exposição ao risco' }), '')
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({
      exposicaoPericulosidade: expect.anything(),
    }))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Resultado técnico' }), '')
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({
      resultadoPericulosidade: expect.anything(),
    }))
  })

  it('sugere as atividades do Anexo 2 com a redação oficial, cada uma uma vez só', () => {
    const { container } = render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, anexoNr16: 'ANEXO_02' }}
      onChange={vi.fn()}
    />)
    const sugeridas = [...container.querySelectorAll<HTMLOptionElement>('#atividades-risco-1 option')]
      .map((opcao) => opcao.value)

    expect(sugeridas).toEqual(catalogoDoAnexoNr16('ANEXO_02')!.hipoteses.map((hipotese) => hipotese.atividade))
    expect(new Set(sugeridas).size).toBe(sugeridas.length)
    expect(sugeridas).toContain(
      'Transporte de vasilhames (em caminhão de carga), contendo inflamável líquido, em quantidade total igual ou '
      + 'superior a 200 litros, quando não observado o disposto nos subitens 4.1 e 4.2 do Anexo 2',
    )
    // O resumo feito à mão não volta a aparecer ao lado da redação da norma.
    expect(sugeridas).toContain('Postos de reabastecimento de aeronaves')
    expect(sugeridas).not.toContain('Reabastecimento de aeronaves')
  })

  it('aplica os textos padrão de ausência de enquadramento somente por ação do usuário', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }}
      onChange={onChange}
    />)

    await user.click(screen.getByRole('button', { name: 'Aplicar texto padrão sem enquadramento' }))

    // O quadro devolvido pelo perito não tem linha de área de risco: no
    // cenário negativo não há área nenhuma a delimitar. O que faltava era
    // dizer contra o que as atividades foram confrontadas — daí a análise
    // dos anexos no lugar dela.
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      atividadeEnquadrada: 'Avaliada a atividade efetivamente desempenhada pela parte Reclamante.',
      analiseAnexos: ANALISE_ANEXOS_NR16,
      exposicaoPericulosidade: 'nao_constatada',
      resultadoPericulosidade: 'nao_caracterizada',
    }))
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({
      areaRisco: expect.anything(),
    }))
  })

  it('dá ao perito onde escrever a análise dos anexos e a observação do quadro', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields avaliacao={avaliacao} onChange={onChange} />)

    await user.type(screen.getByLabelText('Análise dos Anexos'), 'x')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ analiseAnexos: 'x' }))

    // A observação fecha o quadro do item 10; antes a periculosidade não
    // tinha campo nenhum para ela, e o texto não tinha como chegar ao laudo.
    await user.type(screen.getByLabelText('Observações complementares'), 'y')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ observacao: 'y' }))
  })

  // ============================================================
  // Os dois cenários do perito.
  //
  // Sem anexo escolhido a tela fica no essencial — é a avaliação negativa,
  // resolvida pelo botão de texto padrão. Escolhido o anexo, ela CARREGA os
  // pontos que aquele risco manda examinar. Estes testes travam as duas
  // metades, porque é fácil quebrar uma consertando a outra.
  // ============================================================

  it('não mostra pontos de verificação enquanto não houver anexo — é o cenário sem agente', () => {
    render(<PericulosidadeNr16Fields avaliacao={avaliacao} onChange={vi.fn()} />)

    expect(screen.queryByRole('combobox', { name: 'Produto inflamável ou combustível' })).toBeNull()
  })

  it('carrega os pontos do anexo escolhido e grava o rótulo junto com o valor', () => {
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }}
      onChange={onChange}
    />)

    for (const rotulo of [
      'Produto inflamável ou combustível',
      'Classificação do produto',
      'Ponto de fulgor indicado na FDS',
      'Ficha com Dados de Segurança (FDS)',
      'Quantidade e acondicionamento',
      'Local da operação',
    ]) {
      expect(screen.getByRole('combobox', { name: rotulo })).toBeTruthy()
    }

    fireEvent.change(screen.getByRole('combobox', { name: 'Produto inflamável ou combustível' }), {
      target: { value: 'Óleo diesel S10' },
    })

    // O rótulo viaja junto com o valor: reescrever o catálogo amanhã não pode
    // mudar o texto de um laudo já emitido.
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      detalhesNr16: [
        { id: 'produto', rotulo: 'Produto inflamável ou combustível', valor: 'Óleo diesel S10' },
      ],
    }))
  })

  it('mantém os pontos na ordem do anexo e descarta o que for esvaziado', () => {
    const onChange = vi.fn()
    const comLocal: AgenteAvaliado = {
      ...avaliacao,
      nome: 'Inflamáveis',
      anexoNr16: 'ANEXO_02',
      detalhesNr16: [{ id: 'local', rotulo: 'Local da operação', valor: 'Tanque aéreo' }],
    }
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={comLocal} onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Produto inflamável ou combustível' }), {
      target: { value: 'Óleo diesel S500' },
    })

    // Produto antes de local porque essa é a ordem do catálogo — e portanto da
    // tabela impressa —, não a ordem em que o perito digitou.
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      detalhesNr16: [
        { id: 'produto', rotulo: 'Produto inflamável ou combustível', valor: 'Óleo diesel S500' },
        { id: 'local', rotulo: 'Local da operação', valor: 'Tanque aéreo' },
      ],
    }))

    onChange.mockClear()
    rerender(<PericulosidadeNr16Fields avaliacao={comLocal} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Local da operação' }), { target: { value: '' } })

    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({
      detalhesNr16: expect.anything(),
    }))
  })

  it('descarta os pontos e a redação própria do anexo anterior ao trocar de anexo', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{
        ...avaliacao,
        nome: 'Inflamáveis',
        anexoNr16: 'ANEXO_02',
        detalhesNr16: [{ id: 'produto', rotulo: 'Produto inflamável ou combustível', valor: 'Gasolina' }],
        exposicaoPericulosidadeTexto: 'Redação escrita para o caso dos inflamáveis.',
      }}
      onChange={onChange}
    />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Anexo NR-16' }), 'ANEXO_04')

    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({
      detalhesNr16: expect.anything(),
    }))
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({
      exposicaoPericulosidadeTexto: expect.anything(),
    }))
  })

  it('aceita redação própria de exposição e de resultado, e a remove quando esvaziada', () => {
    const onChange = vi.fn()
    const comTexto: AgenteAvaliado = {
      ...avaliacao,
      nome: 'Inflamáveis',
      anexoNr16: 'ANEXO_02',
      resultadoPericulosidadeTexto: 'Caracterizada apenas nos dias de recebimento do caminhão-tanque.',
    }
    const { rerender } = render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, anexoNr16: 'ANEXO_02' }}
      onChange={onChange}
    />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Exposição — redação própria' }), {
      target: { value: 'Exposição nas três horas diárias de abastecimento da frota.' },
    })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      exposicaoPericulosidadeTexto: 'Exposição nas três horas diárias de abastecimento da frota.',
    }))

    onChange.mockClear()
    rerender(<PericulosidadeNr16Fields avaliacao={comTexto} onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Resultado técnico — redação própria' }), {
      target: { value: '' },
    })
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({
      resultadoPericulosidadeTexto: expect.anything(),
    }))
  })

  it('deixa o risco avaliado editável, com o nome do anexo apenas como sugestão', () => {
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }}
      onChange={onChange}
    />)

    const campo = screen.getByRole('textbox', { name: 'Risco avaliado' }) as HTMLInputElement
    expect(campo.readOnly).toBe(false)

    fireEvent.change(campo, { target: { value: 'Abastecimento de frota própria' } })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      nome: 'Abastecimento de frota própria',
    }))
  })

  it('dá nome ao quadro negativo sem apagar o que o perito já escreveu', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={avaliacao} onChange={onChange} />)

    // Sem nome, o quadro sairia como “Risco de periculosidade não informado”,
    // que o leitor confunde com falha de preenchimento.
    await user.click(screen.getByRole('button', { name: 'Aplicar texto padrão sem enquadramento' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      nome: NOME_PADRAO_SEM_ENQUADRAMENTO,
    }))

    onChange.mockClear()
    rerender(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, nome: 'Risco descrito pelo perito' }}
      onChange={onChange}
    />)
    await user.click(screen.getByRole('button', { name: 'Aplicar texto padrão sem enquadramento' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      nome: 'Risco descrito pelo perito',
    }))
  })
})

// ============================================================
// O fluxo em etapas: risco → enquadramento → exposição → conclusão.
// ============================================================

const INFLAMAVEIS: AgenteAvaliado = { ...avaliacao, nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }
const POSTOS = 'NR-16, Anexo 2, item 1, alínea m'
const AERONAVES = 'NR-16, Anexo 2, item 1, alínea c'

function ultimaChamada(onChange: ReturnType<typeof vi.fn>): AgenteAvaliado {
  return onChange.mock.lastCall?.[0] as AgenteAvaliado
}

function valoresDasOpcoes(nome: string): string[] {
  const seletor = screen.getByRole('combobox', { name: nome }) as HTMLSelectElement
  return [...seletor.options].map((opcao) => opcao.value)
}

describe('PericulosidadeNr16Fields — etapas', () => {
  it('organiza a tela em quatro etapas, na ordem em que o laudo raciocina', () => {
    render(<PericulosidadeNr16Fields avaliacao={avaliacao} onChange={vi.fn()} />)

    expect(screen.getAllByRole('region').map((etapa) => within(etapa).getByRole('heading').textContent))
      .toEqual(['Risco', 'Enquadramento', 'Exposição', 'Análise e conclusão'])
  })

  it('oferece “Sem enquadramento em Anexo” no próprio seletor, já com os textos padrão', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields avaliacao={avaliacao} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Anexo NR-16' }), SEM_ENQUADRAMENTO_NR16)

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      anexoNr16: SEM_ENQUADRAMENTO_NR16,
      nome: NOME_PADRAO_SEM_ENQUADRAMENTO,
      ...PADRAO_NR16_SEM_ENQUADRAMENTO,
    }))
  })

  it('só oferece hipótese normativa quando há anexo da norma escolhido', () => {
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={avaliacao} onChange={vi.fn()} />)
    expect(screen.queryByRole('combobox', { name: 'Hipótese normativa' })).toBeNull()

    rerender(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, anexoNr16: SEM_ENQUADRAMENTO_NR16 }}
      onChange={vi.fn()}
    />)
    expect(screen.queryByRole('combobox', { name: 'Hipótese normativa' })).toBeNull()

    rerender(<PericulosidadeNr16Fields avaliacao={INFLAMAVEIS} onChange={vi.fn()} />)
    expect(valoresDasOpcoes('Hipótese normativa')).toContain(POSTOS)
  })

  it('grava a hipótese como enquadramento e deixa a atividade acompanhá-la só enquanto é sugestão', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={INFLAMAVEIS} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Hipótese normativa' }), POSTOS)
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      enquadramentoNr16: POSTOS,
      atividadeEnquadrada: 'Operações em postos de serviço e bombas de abastecimento de inflamáveis líquidos',
    }))

    // A atividade ainda é a sugestão da hipótese anterior: troca junto.
    rerender(<PericulosidadeNr16Fields avaliacao={ultimaChamada(onChange)} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Hipótese normativa' }), AERONAVES)
    expect(ultimaChamada(onChange)).toMatchObject({
      enquadramentoNr16: AERONAVES,
      atividadeEnquadrada: 'Postos de reabastecimento de aeronaves',
    })

    // O perito reescreveu a atividade: a troca de hipótese não a apaga.
    rerender(<PericulosidadeNr16Fields
      avaliacao={{ ...INFLAMAVEIS, enquadramentoNr16: POSTOS, atividadeEnquadrada: 'Abastecimento da frota própria' }}
      onChange={onChange}
    />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Hipótese normativa' }), AERONAVES)
    expect(ultimaChamada(onChange)).toMatchObject({
      enquadramentoNr16: AERONAVES,
      atividadeEnquadrada: 'Abastecimento da frota própria',
    })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Hipótese normativa' }), '')
    expect(ultimaChamada(onChange)).not.toHaveProperty('enquadramentoNr16')
    expect(ultimaChamada(onChange).atividadeEnquadrada).toBe('Abastecimento da frota própria')
  })

  it('reconhece o enquadramento escrito à mão, que não é hipótese do catálogo', () => {
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{ ...INFLAMAVEIS, enquadramentoNr16: 'NR-16, Anexo 2, item 3, alínea d' }}
      onChange={onChange}
    />)

    expect(screen.getByText('O enquadramento foi escrito à mão e não corresponde a uma hipótese do catálogo.')).toBeTruthy()
    const campo = screen.getByRole('textbox', { name: 'Enquadramento normativo' }) as HTMLInputElement
    expect(campo.value).toBe('NR-16, Anexo 2, item 3, alínea d')

    fireEvent.change(campo, { target: { value: '' } })
    expect(ultimaChamada(onChange)).not.toHaveProperty('enquadramentoNr16')
  })

  it('sugere as áreas de risco da hipótese e avisa quando a norma não as delimita', () => {
    const sep = { ...avaliacao, anexoNr16: 'ANEXO_04', enquadramentoNr16: 'NR-16, Anexo 4, item 1, alínea d' }
    const { rerender, container } = render(<PericulosidadeNr16Fields avaliacao={sep} onChange={vi.fn()} />)

    const esperadas = areasDaHipoteseNr16('ANEXO_04', hipoteseCorrespondente(sep)).length
    expect(esperadas).toBeGreaterThan(0)
    expect(container.querySelectorAll('#nr16-risco-1-areas option')).toHaveLength(esperadas)

    // Alta tensão fora do SEP remete à NR-10: não há quadro de área a sugerir.
    rerender(<PericulosidadeNr16Fields
      avaliacao={{ ...sep, enquadramentoNr16: 'NR-16, Anexo 4, item 1, alínea a' }}
      onChange={vi.fn()}
    />)
    expect(container.querySelectorAll('#nr16-risco-1-areas option')).toHaveLength(0)
    expect(screen.getByText(/A norma não delimita área de risco para esta hipótese/)).toBeTruthy()
  })

  it('esconde e descarta a presença na área quando a atividade é fora dela', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const dentro: AgenteAvaliado = { ...INFLAMAVEIS, situacaoAreaRisco: 'dentro', presencaAreaRisco: 'permanencia' }
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={dentro} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação em relação à área de risco' }), 'fora')
    expect(ultimaChamada(onChange).situacaoAreaRisco).toBe('fora')
    expect(ultimaChamada(onChange)).not.toHaveProperty('presencaAreaRisco')

    rerender(<PericulosidadeNr16Fields avaliacao={ultimaChamada(onChange)} onChange={onChange} />)
    expect(screen.queryByRole('combobox', { name: 'Presença na área de risco' })).toBeNull()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação em relação à área de risco' }), 'parcialmente_dentro')
    rerender(<PericulosidadeNr16Fields avaliacao={ultimaChamada(onChange)} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Presença na área de risco' }), 'circulacao')
    expect(ultimaChamada(onChange)).toMatchObject({ situacaoAreaRisco: 'parcialmente_dentro', presencaAreaRisco: 'circulacao' })
  })

  it('grava área, distância, tempo e frequência — e tira a chave do campo esvaziado', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    let atual: AgenteAvaliado = INFLAMAVEIS
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={atual} onChange={onChange} />)
    const aplicar = () => {
      atual = ultimaChamada(onChange)
      rerender(<PericulosidadeNr16Fields avaliacao={atual} onChange={onChange} />)
    }

    fireEvent.change(screen.getByRole('combobox', { name: 'Área de risco' }), { target: { value: 'Bacia de segurança do tanque' } })
    aplicar()
    fireEvent.change(screen.getByRole('textbox', { name: 'Distância verificada' }), { target: { value: '7,5' } })
    aplicar()
    fireEvent.change(screen.getByRole('textbox', { name: 'Tempo médio de exposição' }), { target: { value: '40' } })
    aplicar()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Unidade do tempo de exposição' }), 'minutos_dia')
    aplicar()
    fireEvent.change(screen.getByRole('textbox', { name: 'Frequência operacional' }), { target: { value: '3' } })
    aplicar()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Periodicidade da frequência' }), 'semana')
    aplicar()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Relação com a atividade' }), 'principal')
    aplicar()

    expect(atual).toMatchObject({
      delimitacaoAreaRisco: 'Bacia de segurança do tanque',
      distanciaAreaRisco: '7,5',
      tempoExposicaoNr16: '40',
      unidadeTempoExposicaoNr16: 'minutos_dia',
      frequenciaOperacionalNr16: '3',
      periodicidadeOperacionalNr16: 'semana',
      relacaoAtividadeNr16: 'principal',
    })

    fireEvent.change(screen.getByRole('textbox', { name: 'Tempo médio de exposição' }), { target: { value: '' } })
    expect(ultimaChamada(onChange)).not.toHaveProperty('tempoExposicaoNr16')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Periodicidade da frequência' }), '')
    expect(ultimaChamada(onChange)).not.toHaveProperty('periodicidadeOperacionalNr16')
  })

  it('separa as duas hipóteses da Súmula 364 e só mostra a opção antiga a quem já a gravou', () => {
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={INFLAMAVEIS} onChange={vi.fn()} />)
    const opcoes = valoresDasOpcoes('Exposição ao risco')
    expect(opcoes).toEqual(expect.arrayContaining(['fortuita', 'tempo_extremamente_reduzido']))
    expect(opcoes).not.toContain('eventual')

    rerender(<PericulosidadeNr16Fields
      avaliacao={{ ...INFLAMAVEIS, exposicaoPericulosidade: 'eventual' }}
      onChange={vi.fn()}
    />)
    expect(valoresDasOpcoes('Exposição ao risco')).toContain('eventual')
    expect((screen.getByRole('combobox', { name: 'Exposição ao risco' }) as HTMLSelectElement).value).toBe('eventual')
  })

  it('oferece os quatro resultados e pede o período só na caracterização parcial', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={INFLAMAVEIS} onChange={onChange} />)

    expect(valoresDasOpcoes('Resultado técnico'))
      .toEqual(['', 'caracterizada', 'caracterizada_parcial', 'nao_caracterizada', 'prejudicada'])
    expect(screen.queryByRole('textbox', { name: 'Período ou atividade caracterizada' })).toBeNull()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Resultado técnico' }), 'caracterizada_parcial')
    rerender(<PericulosidadeNr16Fields avaliacao={ultimaChamada(onChange)} onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Período ou atividade caracterizada' }), {
      target: { value: 'de 03/2021 a 06/2022' },
    })
    expect(ultimaChamada(onChange)).toMatchObject({
      resultadoPericulosidade: 'caracterizada_parcial',
      periodoCaracterizacaoNr16: 'de 03/2021 a 06/2022',
    })

    // Fora da parcial o período não imprime — e não fica gravado esperando.
    rerender(<PericulosidadeNr16Fields avaliacao={ultimaChamada(onChange)} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Resultado técnico' }), 'nao_caracterizada')
    expect(ultimaChamada(onChange)).not.toHaveProperty('periodoCaracterizacaoNr16')
  })

  it('monta a análise dos anexos com o que foi preenchido, só quando o perito pede', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const preenchida: AgenteAvaliado = {
      ...INFLAMAVEIS,
      enquadramentoNr16: POSTOS,
      atividadeEnquadrada: 'Abastecimento de veículos',
      situacaoAreaRisco: 'dentro',
      exposicaoPericulosidade: 'intermitente',
      analiseAnexos: 'Texto do perito.',
    }
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={preenchida} onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Gerar análise a partir dos dados' }))
    expect(ultimaChamada(onChange).analiseAnexos).toBe(gerarAnaliseNr16(preenchida))
    expect(ultimaChamada(onChange).analiseAnexos).toContain('Anexo 2 – Inflamáveis')

    rerender(<PericulosidadeNr16Fields avaliacao={ultimaChamada(onChange)} onChange={onChange} />)
    expect((screen.getByRole('button', { name: 'Gerar análise a partir dos dados' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('aponta a contradição entre o resultado e o que foi registrado, sem bloquear', () => {
    const { rerender } = render(<PericulosidadeNr16Fields avaliacao={INFLAMAVEIS} onChange={vi.fn()} />)
    expect(screen.queryByRole('list', { name: 'Pontos de atenção da avaliação NR-16' })).toBeNull()

    rerender(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, resultadoPericulosidade: 'caracterizada', exposicaoPericulosidade: 'fortuita' }}
      onChange={vi.fn()}
    />)
    const alertas = screen.getByRole('list', { name: 'Pontos de atenção da avaliação NR-16' })
    expect(within(alertas).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Aplicar texto padrão sem enquadramento' })).toBeTruthy()
  })

  it('liga e desliga as observações frequentes sem mexer no que o perito escreveu', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const frase = OBSERVACOES_PADRAO_NR16[0]
    const { rerender } = render(<PericulosidadeNr16Fields
      avaliacao={{ ...INFLAMAVEIS, observacao: 'Texto do perito.' }}
      onChange={onChange}
    />)
    const grupo = screen.getByRole('group', { name: 'Observações frequentes' })
    expect(within(grupo).getAllByRole('button')).toHaveLength(OBSERVACOES_PADRAO_NR16.length)

    await user.click(within(grupo).getByRole('button', { name: frase }))
    expect(ultimaChamada(onChange).observacao).toBe(`Texto do perito.\n${frase}`)

    rerender(<PericulosidadeNr16Fields avaliacao={ultimaChamada(onChange)} onChange={onChange} />)
    const marcada = screen.getByRole('button', { name: frase })
    expect(marcada.getAttribute('aria-pressed')).toBe('true')
    await user.click(marcada)
    expect(ultimaChamada(onChange).observacao).toBe('Texto do perito.')
  })

  it('no texto padrão, completa só o que está em branco e marca o cenário sem enquadramento', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, atividadeEnquadrada: 'Operação de empilhadeira no pátio', analiseAnexos: 'Análise escrita.' }}
      onChange={onChange}
    />)

    await user.click(screen.getByRole('button', { name: 'Aplicar texto padrão sem enquadramento' }))
    expect(ultimaChamada(onChange)).toMatchObject({
      anexoNr16: SEM_ENQUADRAMENTO_NR16,
      atividadeEnquadrada: 'Operação de empilhadeira no pátio',
      analiseAnexos: 'Análise escrita.',
      exposicaoPericulosidade: 'nao_constatada',
      resultadoPericulosidade: 'nao_caracterizada',
    })

    // Com anexo escolhido, o anexo fica: a conclusão negativa é daquele anexo.
    rerender(<PericulosidadeNr16Fields avaliacao={INFLAMAVEIS} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Aplicar texto padrão sem enquadramento' }))
    expect(ultimaChamada(onChange).anexoNr16).toBe('ANEXO_02')
    expect(ultimaChamada(onChange).analiseAnexos).toBe(ANALISE_ANEXOS_NR16)
  })
})
