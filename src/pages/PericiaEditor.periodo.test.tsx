// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { Pericia } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
vi.mock('@/components/BuscaProcesso', () => ({
  BuscaProcesso: () => <div>Busca de processo</div>,
}))

afterEach(cleanup)

const pericia = {
  id: 'pericia-periodo',
  numeroProcesso: '1000000-00.2026.5.02.0001',
  vara: '1ª Vara do Trabalho',
  comarca: 'São Paulo/SP',
  reclamante: 'Pessoa reclamante',
  cpfReclamante: '',
  funcaoReclamante: 'Operador',
  admissao: '2020-01-01',
  demissao: '',
  dataAjuizamento: '2026-06-10',
  reclamadas: [],
  participantes: [],
  dataVistoria: '',
  horaVistoria: '',
  localVistoria: '',
  modalidade: 'insalubridade',
  status: 'rascunho',
  responsavelId: 'usuario-1',
  criadoEm: '2026-08-24T00:00:00.000Z',
  atualizadoEm: '2026-08-24T00:00:00.000Z',
  tecnico: {
    apresentacao: '', enderecamento: '', objetivoPericia: '', descricaoEmpresa: '',
    descricaoAmbiente: '', descricaoPostoTrabalho: '', maquinasFerramentas: '',
    produtosUtilizados: '', atividadesFuncoes: '', periodos: [], agentes: [],
    normasReferencias: '', equipamentosAnalisados: '', informacoesLevantadas: '',
    divergenciasFaticas: '', protecoesColetivas: '', analiseTecnica: '', conclusao: '',
    conclusaoInsalubridade: '', conclusaoPericulosidade: '', respostasQuesitos: '',
    encerramento: '', observacoesAdicionais: '',
  },
  fotos: [],
} as Pericia

describe('PericiaEditor — período avaliado', () => {
  it('mostra somente o intervalo, sem repetir a justificativa legal', () => {
    vi.mocked(useApp).mockReturnValue({
      usuario: { id: 'usuario-1', nome: 'Perito responsável' },
      empresas: [],
      pericias: [pericia],
      documentos: [],
      textos: [],
      quesitos: [],
      salvarPericia: vi.fn(),
      salvarDocumento: vi.fn(),
    } as unknown as ReturnType<typeof useApp>)

    render(
      <MemoryRouter initialEntries={['/pericias/pericia-periodo']}>
        <ToastProvider>
          <Routes>
            <Route path="/pericias/:id" element={<PericiaEditor />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('10/06/2021 até o fim do contrato')).toBeDefined()
    expect(screen.queryByText(/Cinco anos anteriores ao ajuizamento da ação/i)).toBeNull()
  })

  it('identifica a função contratual como função inicial', () => {
    vi.mocked(useApp).mockReturnValue({
      usuario: { id: 'usuario-1', nome: 'Perito responsável' },
      empresas: [],
      pericias: [pericia],
      documentos: [],
      textos: [],
      quesitos: [],
      salvarPericia: vi.fn(),
      salvarDocumento: vi.fn(),
    } as unknown as ReturnType<typeof useApp>)

    render(
      <MemoryRouter initialEntries={['/pericias/pericia-periodo']}>
        <ToastProvider>
          <Routes>
            <Route path="/pericias/:id" element={<PericiaEditor />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Função Inicial')).toBeDefined()
  })
})
