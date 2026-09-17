// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { idLinhaVarredura, PainelVarreduraNormativa, ResumoVarreduraNr16 } from './PainelVarreduraNormativa'
import type { AnexoVarredura, PendenciaVarredura } from '@/lib/varreduraNormativa'

afterEach(cleanup)

const ITENS: AnexoVarredura[] = [
  { anexoId: 'ANEXO_01', numero: '1', tema: 'Ruído', status: 'nao_avaliado', conclusao: 'Avaliação pendente.', temAvaliacao: false },
  { anexoId: 'ANEXO_04', numero: '4', tema: 'Revogado', status: 'nao_aplicavel', conclusao: 'Anexo revogado — não aplicável.', temAvaliacao: false },
]

const ITENS_LOTE: AnexoVarredura[] = [
  { anexoId: 'ANEXO_01', numero: '1', tema: 'Ruído', status: 'exposicao_identificada', conclusao: '', temAvaliacao: true },
  { anexoId: 'ANEXO_02', numero: '2', tema: 'Ruído de impacto', status: 'nao_avaliado', conclusao: '', temAvaliacao: false },
  { anexoId: 'ANEXO_03', numero: '3', tema: 'Calor', status: 'sem_exposicao', conclusao: '', temAvaliacao: false },
  { anexoId: 'ANEXO_04', numero: '4', tema: 'Revogado', status: 'nao_aplicavel', conclusao: '', temAvaliacao: false },
  { anexoId: 'ANEXO_05', numero: '5', tema: 'Radiações ionizantes', status: 'nao_avaliado', conclusao: '', temAvaliacao: false },
]

function painel(props: Partial<Parameters<typeof PainelVarreduraNormativa>[0]> = {}) {
  return render(
    <PainelVarreduraNormativa
      norma="NR-15"
      itens={ITENS}
      onStatusChange={() => undefined}
      onExposicao={() => undefined}
      {...props}
    />,
  )
}

describe('PainelVarreduraNormativa', () => {
  it('mostra progresso real e mantém o anexo revogado resolvido', () => {
    painel()

    expect(screen.getByText('1 de 2 anexos avaliados')).toBeDefined()
    expect(screen.getByText('Revogado — não aplicável')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Anexo 4.*Sem exposição/i })).toBeNull()
  })

  it('oferece decisão negativa rápida e abre o detalhe da avaliação', () => {
    const onStatusChange = vi.fn()
    const onExposicao = vi.fn()
    painel({ onStatusChange, onExposicao })

    fireEvent.click(screen.getByRole('button', { name: /Anexo 1.*Sem exposição/i }))
    expect(onStatusChange).toHaveBeenCalledWith('ANEXO_01', 'sem_exposicao')

    fireEvent.click(screen.getByRole('button', { name: /Anexo 1.*Avaliação da suposta exposição/i }))
    expect(onExposicao).toHaveBeenCalledWith('ANEXO_01')
  })

  it('não afirma a exposição antes da avaliação: usa "Avaliação da suposta exposição"', () => {
    // Pedido do perito: "exposição identificada" dava a entender que a
    // exposição foi constatada.
    const { container } = painel({ itens: ITENS_LOTE })

    expect(container.textContent).toContain('Avaliação da suposta exposição')
    expect(container.textContent).not.toMatch(/exposição identificada/i)
  })

  it('dá a cada linha um alvo de foco e trava "Sem exposição" quando já há avaliação', () => {
    painel({ itens: ITENS_LOTE })

    const linha = document.getElementById(idLinhaVarredura('NR-15', 'ANEXO_02'))
    expect(linha).not.toBeNull()
    expect(linha?.getAttribute('tabindex')).toBe('-1')

    const semExposicao = screen.getByRole('button', { name: /Anexo 1 —.*Sem exposição/i }) as HTMLButtonElement
    expect(semExposicao.disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Anexo 2 —.*Sem exposição/i }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('mostra na própria linha o que falta na avaliação do anexo', () => {
    const pendencias: PendenciaVarredura[] = [
      { norma: 'NR-15', anexo: '1', anexoId: 'ANEXO_01', tema: 'Ruído', motivo: 'sem conclusão individual', agenteId: 'a1', agenteNome: 'Ruído contínuo', campo: 'observacao' },
      // A pendência "não avaliado" já é o próprio status: não repete como aviso.
      { norma: 'NR-15', anexo: '2', anexoId: 'ANEXO_02', tema: 'Ruído de impacto', motivo: 'não avaliado' },
      // Pendência de outra norma não aparece neste painel.
      { norma: 'NR-16', anexo: '1', anexoId: 'ANEXO_01', tema: 'Explosivos', motivo: 'sem conclusão individual', agenteId: 'r1', campo: 'resultadoPericulosidade' },
    ]
    painel({ itens: ITENS_LOTE, pendencias })

    const linha1 = document.getElementById(idLinhaVarredura('NR-15', 'ANEXO_01')) as HTMLElement
    expect(within(linha1).getByText('Falta: Ruído contínuo (Anexo 1) — preencha a conclusão da avaliação')).toBeDefined()
    expect(within(linha1).queryByText(/informe o resultado/)).toBeNull()

    const linha2 = document.getElementById(idLinhaVarredura('NR-15', 'ANEXO_02')) as HTMLElement
    expect(within(linha2).queryByText(/^Falta:/)).toBeNull()
  })

  it('marca os pendentes como "Sem exposição" de uma vez, só depois de confirmar', () => {
    const onMarcarSemExposicao = vi.fn()
    painel({ itens: ITENS_LOTE, onMarcarSemExposicao })

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pendentes como sem exposição (2)' }))
    expect(onMarcarSemExposicao).not.toHaveBeenCalled()
    expect(screen.getByText(/os 2 anexos ainda sem decisão \(2, 5\)/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onMarcarSemExposicao).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pendentes como sem exposição (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onMarcarSemExposicao).toHaveBeenCalledTimes(1)
    expect(onMarcarSemExposicao).toHaveBeenCalledWith(['ANEXO_02', 'ANEXO_05'])
  })

  it('não oferece a marcação em lote sem o callback nem quando nada está pendente', () => {
    painel({ itens: ITENS_LOTE })
    expect(screen.queryByRole('button', { name: /Marcar pendentes/ })).toBeNull()
    cleanup()

    painel({
      itens: ITENS_LOTE.map((item) => item.status === 'nao_avaliado' ? { ...item, status: 'sem_exposicao' as const } : item),
      onMarcarSemExposicao: () => undefined,
    })
    expect(screen.queryByRole('button', { name: /Marcar pendentes/ })).toBeNull()
  })
})

describe('ResumoVarreduraNr16', () => {
  const NR16: AnexoVarredura[] = [
    { anexoId: 'ANEXO_01', numero: '1', tema: 'Explosivos', status: 'sem_exposicao', conclusao: '', temAvaliacao: false },
    { anexoId: 'ANEXO_02', numero: '2', tema: 'Inflamáveis', status: 'exposicao_identificada', conclusao: '', temAvaliacao: true },
    { anexoId: 'ANEXO_03', numero: '3', tema: 'Segurança pessoal ou patrimonial', status: 'nao_avaliado', conclusao: '', temAvaliacao: false },
  ]

  it('só mostra o quadro: nenhum botão de decisão por anexo', () => {
    render(<ResumoVarreduraNr16 itens={NR16} />)

    const regiao = screen.getByRole('region', { name: 'Varredura dos anexos da NR-16' })
    expect(within(regiao).queryAllByRole('button')).toHaveLength(0)
    expect(regiao.textContent).toContain('Anexo 2 (Inflamáveis) · avaliação da suposta exposição')
    expect(regiao.textContent).toContain('Anexo 1 (Explosivos) · sem exposição')
    expect(regiao.textContent).toContain('Anexo 3 (Segurança pessoal ou patrimonial) · pendente')
    expect(document.getElementById(idLinhaVarredura('NR-16', 'ANEXO_03'))).not.toBeNull()
  })

  it('oferece registrar a primeira avaliação quando recebe o callback', () => {
    const onRegistrarAvaliacao = vi.fn()
    render(<ResumoVarreduraNr16 itens={NR16} onRegistrarAvaliacao={onRegistrarAvaliacao} />)

    fireEvent.click(screen.getByRole('button', { name: 'Registrar avaliação NR-16' }))
    expect(onRegistrarAvaliacao).toHaveBeenCalledTimes(1)
  })
})
