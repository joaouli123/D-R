// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PericulosidadeNr16Fields } from './PericulosidadeNr16Fields'
import { NOME_PADRAO_SEM_ENQUADRAMENTO, anexoNr16PorId } from '@/content/anexosNr16'
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

  it('oferece todas as atividades do quadro oficial do Anexo 2 da NR-16', () => {
    const atividades = anexoNr16PorId('ANEXO_02')?.atividadesSugeridas ?? []

    expect(atividades).toHaveLength(12)
    expect(atividades).toContain('Reabastecimento de aeronaves')
    expect(atividades).toContain('Transporte de inflamáveis líquidos e gasosos liquefeitos em caminhão-tanque')
    expect(atividades).toContain('Desgaseificação, decantação e reparos de vasilhames não desgaseificados ou decantados')
    expect(atividades).toContain('Transporte de vasilhames com inflamável líquido em quantidade total igual ou superior a 200 litros')
  })

  it('aplica os quatro textos padrão de ausência de enquadramento somente por ação do usuário', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PericulosidadeNr16Fields
      avaliacao={{ ...avaliacao, nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }}
      onChange={onChange}
    />)

    await user.click(screen.getByRole('button', { name: 'Aplicar texto padrão sem enquadramento' }))

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      atividadeEnquadrada: 'Avaliada a atividade efetivamente desempenhada pelo trabalhador.',
      areaRisco: 'Não identificada condição ou área de risco enquadrável na NR-16 e seus anexos.',
      exposicaoPericulosidade: 'nao_constatada',
      resultadoPericulosidade: 'nao_caracterizada',
    }))
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
