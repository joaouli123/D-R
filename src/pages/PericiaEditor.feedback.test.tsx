// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import * as api from '@/services/api'
import { useApp } from '@/store/AppStore'
import type { Empresa, Pericia } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
vi.mock('@/components/BuscaProcesso', () => ({
  BuscaProcesso: () => <div>Busca de processo</div>,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const empresas: Empresa[] = [
  {
    id: 'empresa-principal',
    razaoSocial: 'Reclamada Principal Ltda.',
    cnpj: '11.111.111/0001-11',
    endereco: '',
    cidade: 'São Paulo',
    uf: 'SP',
    criadoEm: '2026-08-01',
  },
  {
    id: 'empresa-secundaria',
    razaoSocial: 'Reclamada Secundária Ltda.',
    cnpj: '22.222.222/0001-22',
    endereco: '',
    cidade: 'São Paulo',
    uf: 'SP',
    criadoEm: '2026-08-01',
  },
]

const pericia: Pericia = {
  id: 'pericia-feedback',
  numeroProcesso: '1000000-00.2026.5.02.0001',
  vara: '1ª Vara do Trabalho',
  comarca: 'São Paulo/SP',
  reclamante: 'Pessoa reclamante',
  cpfReclamante: '',
  funcaoReclamante: 'Operador',
  reclamadas: [
    { id: 'reclamada-1', empresaId: 'empresa-principal', principal: true },
    { id: 'reclamada-2', empresaId: 'empresa-secundaria', principal: false },
  ],
  participantes: [
    {
      id: 'participante-1',
      nome: 'Preposto Secundário',
      papel: 'preposto',
      empresaId: 'empresa-secundaria',
    },
  ],
  dataVistoria: '2026-08-28',
  horaVistoria: '09:00',
  horaFimVistoria: '10:30',
  localVistoria: 'São Paulo/SP',
  modalidade: 'insalubridade',
  status: 'rascunho',
  responsavelId: 'usuario-1',
  criadoEm: '2026-08-28',
  atualizadoEm: '2026-08-28',
  tecnico: {
    apresentacao: 'Apresentação', enderecamento: 'Legado', objetivoPericia: 'Legado',
    descricaoEmpresa: '', descricaoAmbiente: '', descricaoPostoTrabalho: '',
    maquinasFerramentas: '', produtosUtilizados: '', atividadesFuncoes: '', periodos: [], agentes: [],
    normasReferencias: '', equipamentosAnalisados: '', informacoesLevantadas: '',
    divergenciasFaticas: '', protecoesColetivas: '', analiseTecnica: '', conclusao: '',
    conclusaoInsalubridade: '', conclusaoPericulosidade: '', respostasQuesitos: '',
    encerramento: '', observacoesAdicionais: '',
  },
  fotos: [],
}

function prepararEditor() {
  const salvarPericia = vi.fn(async (valor: Pericia) => valor)
  vi.mocked(useApp).mockReturnValue({
    usuario: { id: 'usuario-1', nome: 'Perito responsável' },
    empresas,
    pericias: [pericia],
    documentos: [],
    textos: [],
    quesitos: [],
    salvarPericia,
    salvarDocumento: vi.fn(),
  } as unknown as ReturnType<typeof useApp>)

  const renderizado = render(
    <MemoryRouter initialEntries={['/pericias/pericia-feedback']}>
      <ToastProvider>
        <Routes>
          <Route path="/pericias/:id" element={<PericiaEditor />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )

  return { salvarPericia, ...renderizado }
}

describe('PericiaEditor — feedback noturno de 28/08', () => {
  it('oferece quatro grupos de participantes com qualificações próprias', () => {
    prepararEditor()

    const reclamante = screen.getByRole('region', { name: 'Parte Reclamante' })
    const principal = screen.getByRole('region', { name: 'Parte Reclamada Principal' })
    const envolvidas = screen.getByRole('region', { name: 'Parte Reclamada Envolvida no Processo' })
    const demais = screen.getByRole('region', { name: 'Perícia / Juízo — Demais Participantes' })

    fireEvent.click(within(reclamante).getByRole('button', { name: 'Adicionar participante em Parte Reclamante' }))
    fireEvent.click(within(principal).getByRole('button', { name: 'Adicionar participante em Parte Reclamada Principal' }))
    fireEvent.click(within(demais).getByRole('button', { name: 'Adicionar participante em Perícia / Juízo — Demais Participantes' }))

    const rotulos = (regiao: HTMLElement) => Array.from(
      within(regiao).getByLabelText<HTMLSelectElement>('Qualificação').options,
    ).map((opcao) => opcao.textContent)

    expect(rotulos(reclamante)).toEqual(['Reclamante', 'Advogado (a)', 'Assistente Técnico (a)'])
    expect(rotulos(principal)).toEqual([
      'Advogado (a)',
      'Eng. Segurança do Trabalho',
      'Eng. Segurança do Trabalho - Assistente Técnico',
      'Téc. Segurança do Trabalho - Assistente Técnico',
      'Preposto',
      'Gestor(a) Imediato(a) / Liderança',
    ])
    expect(rotulos(envolvidas)).toEqual([
      'Advogado (a)',
      'Eng. Segurança do Trabalho',
      'Eng. Segurança do Trabalho - Assistente Técnico',
      'Téc. Segurança do Trabalho - Assistente Técnico',
      'Preposto',
      'Gestor(a) Imediato(a) / Liderança',
    ])
    expect(rotulos(demais)).toEqual([
      'Perito Judicial',
      'Auxiliar do Perito',
      'Paradigma',
      'Entrevistado',
      'Participante Autorizado',
    ])
    expect((within(envolvidas).getByLabelText('Empresa representada') as HTMLSelectElement).value)
      .toBe('empresa-secundaria')
  })

  it('oferece início e término da vistoria', () => {
    prepararEditor()

    expect(screen.getByLabelText('Horário de início da perícia')).toBeDefined()
    expect(screen.getByLabelText('Horário de término da perícia')).toBeDefined()
  })

  it('mostra no preenchimento a mesma numeração do documento e oculta campos automáticos', () => {
    prepararEditor()
    fireEvent.click(screen.getByRole('button', { name: /Preenchimento/ }))

    expect(screen.getByText('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA')).toBeDefined()
    expect(screen.getByText('3. Descrição das Instalações da Reclamada')).toBeDefined()
    expect(screen.getByText('3.1. Instalações Físicas')).toBeDefined()
    expect(screen.getByText('6.1. Descrição do Posto de Trabalho')).toBeDefined()
    expect(screen.getByText('7.1. Atividades Efetivamente Exercidas')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Abrir biblioteca do item 3.1' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Abrir biblioteca do item 6.4' })).toBeDefined()
    expect(screen.queryByText('Endereçamento')).toBeNull()
    expect(screen.queryByText('Objetivo da perícia')).toBeNull()
  })

  it('sincroniza a fotografia enviada com a perícia antes de sair da etapa', async () => {
    const foto = {
      id: 'foto-enviada',
      secao: 'ambiente' as const,
      url: 'https://arquivos.example/foto.jpg',
      legenda: 'Local avaliado',
      ordem: 1,
    }
    vi.spyOn(api.fotos, 'enviar').mockResolvedValue([foto])
    const { salvarPericia, container } = prepararEditor()
    fireEvent.click(screen.getByRole('button', { name: /Fotografias/ }))

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    fireEvent.change(input!, { target: { files: [new File(['foto'], 'local.jpg', { type: 'image/jpeg' })] } })

    await waitFor(() => expect(salvarPericia).toHaveBeenCalledTimes(2))
    expect(salvarPericia.mock.calls[1]?.[0].fotos).toEqual([foto])
    expect(await screen.findByAltText('Local avaliado')).toBeDefined()
  })
})
