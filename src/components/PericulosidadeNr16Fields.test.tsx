// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PericulosidadeNr16Fields } from './PericulosidadeNr16Fields'
import { anexoNr16PorId } from '@/content/anexosNr16'
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
})
