// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { AgenteAvaliado, Pericia } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
vi.mock('@/components/BuscaProcesso', () => ({
  BuscaProcesso: () => <div>Busca de processo</div>,
}))
vi.mock('@/components/EpiSelector', () => ({
  EpiSelector: () => <div>Seleção de EPI</div>,
}))

afterEach(cleanup)

const pericia = {
  id: 'pericia-cas',
  numeroProcesso: '1000000-00.2026.5.02.0001',
  vara: '1ª Vara do Trabalho',
  comarca: 'São Paulo/SP',
  reclamante: 'Pessoa reclamante',
  cpfReclamante: '',
  funcaoReclamante: 'Operador',
  reclamadas: [],
  participantes: [],
  dataVistoria: '',
  horaVistoria: '',
  localVistoria: '',
  modalidade: 'insalubridade',
  status: 'rascunho',
  responsavelId: 'usuario-1',
  criadoEm: '2026-09-05T00:00:00.000Z',
  atualizadoEm: '2026-09-05T00:00:00.000Z',
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

// Atividade do Anexo 13: a lista oficial enquadra a operação, não uma
// substância, então não traz CAS — o perito registra o do composto
// específico quando houver.
const ATIVIDADE_ANEXO_13: AgenteAvaliado = {
  id: 'agente-anexo-13',
  nome: 'Arsênico',
  tipo: 'quimico',
  criterio: 'qualitativo',
  anexoNr15: 'ANEXO_13',
  referenciaNormativaId: 'ANEXO_13_ARSENICO_MAX_01',
  limiteTolerancia: 'Não aplicável (análise qualitativa por inspeção da operação prevista no Anexo 13)',
  grau: 'maximo',
}

function prepararEditor(agente: AgenteAvaliado) {
  vi.mocked(useApp).mockReturnValue({
    usuario: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'perito' },
    empresas: [],
    pericias: [{ ...pericia, tecnico: { ...pericia.tecnico, agentes: [agente] } }],
    documentos: [],
    textos: [],
    quesitos: [],
    salvarPericia: vi.fn(async (valor: Pericia) => valor),
    salvarDocumento: vi.fn(),
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter initialEntries={['/pericias/pericia-cas']}>
      <ToastProvider>
        <Routes>
          <Route path="/pericias/:id" element={<PericiaEditor />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )

  // Os agentes ficam na terceira etapa do editor; a trilha do topo pula direto.
  fireEvent.click(screen.getByRole('button', { name: /Avaliações e EPIs/ }))

  return screen.getByRole('textbox', { name: 'CAS' }) as HTMLInputElement
}

describe('PericiaEditor — campo CAS do agente', () => {
  it('libera o CAS na atividade do Anexo 13, que não traz o número na lista', async () => {
    const user = userEvent.setup()
    const cas = prepararEditor(ATIVIDADE_ANEXO_13)

    expect(cas.disabled).toBe(false)
    expect(cas.value).toBe('')

    await user.type(cas, '1303-96-4')

    expect(cas.value).toBe('1303-96-4')
    expect(screen.queryByText(/Dígito verificador|Formato esperado/)).toBeNull()
  })

  it('reabre o CAS de registro antigo do Anexo 13 que ficou gravado vazio', () => {
    const cas = prepararEditor({ ...ATIVIDADE_ANEXO_13, cas: '' })

    expect(cas.disabled).toBe(false)
  })

  it('avisa o dígito verificador errado sem bloquear o registro', async () => {
    const user = userEvent.setup()
    const cas = prepararEditor(ATIVIDADE_ANEXO_13)

    await user.type(cas, '1303-9')
    expect(screen.queryByText(/Dígito verificador|Formato esperado/)).toBeNull()

    await user.type(cas, '6-5')
    expect(cas.value).toBe('1303-96-5')
    expect(cas.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(/Dígito verificador não confere/)).toBeDefined()
  })

  it('mantém travado o CAS que a substância do Anexo 11 já traz', () => {
    const cas = prepararEditor({
      id: 'agente-anexo-11',
      nome: 'Acetaldeído',
      tipo: 'quimico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_11',
      referenciaNormativaId: 'ANEXO_11_ACETALDEIDO',
      cas: '75-07-0',
      unidadeMedicao: 'ppm',
    })

    expect(cas.disabled).toBe(true)
    expect(cas.value).toBe('75-07-0')
  })

  it('mantém travado o CAS fixo do Anexo 12', () => {
    const cas = prepararEditor({
      id: 'agente-anexo-12',
      nome: 'Manganês (fumos)',
      tipo: 'quimico',
      criterio: 'quantitativo',
      anexoNr15: 'ANEXO_12_MANGANES_FUMOS',
      cas: '7439-96-5',
      grau: 'maximo',
      unidadeMedicao: 'mg/m³',
    })

    expect(cas.disabled).toBe(true)
    expect(cas.value).toBe('7439-96-5')
  })
})
