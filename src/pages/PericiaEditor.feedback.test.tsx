// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { prepararFotosParaEnvio } from '@/lib/prepararFotos'
import * as api from '@/services/api'
import { useApp } from '@/store/AppStore'
import type { Empresa, Pericia } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/lib/prepararFotos', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/prepararFotos')>()
  return { ...original, prepararFotosParaEnvio: vi.fn(original.prepararFotosParaEnvio) }
})
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
vi.mock('@/components/BuscaProcesso', () => ({
  BuscaProcesso: () => <div>Busca de processo</div>,
}))
vi.mock('@/components/EpiSelector', () => ({
  EpiSelector: ({ agente, onChange }: { agente: Pericia['tecnico']['agentes'][number]; onChange: (valor: Pericia['tecnico']['agentes'][number]) => void }) => (
    <div>
      <span>{agente.nome}: {(agente.epis ?? []).length} EPI</span>
      <button
        type="button"
        onClick={() => onChange({
          ...agente,
          epis: [
            ...(agente.epis ?? []),
            { categoria: `EPI ${agente.nome}`, modelo: `Modelo ${agente.nome}`, marca: 'Teste' },
          ],
        })}
      >
        Adicionar EPI a {agente.nome}
      </button>
    </div>
  ),
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

function prepararEditor(opcoes: { perfil?: 'admin' | 'perito' | 'assistente'; valor?: Pericia } = {}) {
  const valor = opcoes.valor ?? pericia
  const salvarPericia = vi.fn(async (valor: Pericia) => valor)
  vi.mocked(useApp).mockReturnValue({
    usuario: { id: 'usuario-1', nome: 'Perito responsável', perfil: opcoes.perfil ?? 'perito' },
    empresas,
    pericias: [valor],
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

/**
 * Um store que muda de verdade, com a mesma sequência do `upsert` do
 * AppStore: troca a perícia da lista no envio, de novo na resposta, e volta a
 * lista de antes se a gravação falhar. Com a lista estática do mock acima, a
 * tela nunca via `pericias` mudar durante uma gravação — e era aí que o
 * editor desfazia o que o perito digitava.
 */
function prepararEditorComLoja(valor: Pericia = pericia) {
  const persistir = vi.fn(async (item: Pericia): Promise<Pericia> => ({ ...item }))

  function Loja() {
    const [pericias, setPericias] = useState([valor])
    const lista = pericias
    const salvarPericia = async (item: Pericia): Promise<Pericia> => {
      const anterior = lista
      setPericias((atual) => atual.map((x) => (x.id === item.id ? item : x)))
      try {
        const salvo = await persistir(item)
        setPericias((atual) => atual.map((x) => (x.id === item.id ? salvo : x)))
        return salvo
      } catch (e) {
        setPericias(anterior)
        throw e
      }
    }
    vi.mocked(useApp).mockReturnValue({
      usuario: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'perito' },
      empresas,
      pericias,
      documentos: [],
      textos: [],
      quesitos: [],
      salvarPericia,
      salvarDocumento: vi.fn(),
    } as unknown as ReturnType<typeof useApp>)

    return (
      <MemoryRouter initialEntries={['/pericias/pericia-feedback']}>
        <ToastProvider>
          <Routes>
            <Route path="/pericias/:id" element={<PericiaEditor />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    )
  }

  return { persistir, ...render(<Loja />) }
}

/** Segura a próxima gravação até o teste mandar responder (ou falhar). */
function segurarGravacao(persistir: ReturnType<typeof prepararEditorComLoja>['persistir']) {
  const controle: { responder: () => void; falhar: (erro: Error) => void } = { responder: () => {}, falhar: () => {} }
  persistir.mockImplementationOnce((item) => new Promise<Pericia>((resolve, reject) => {
    controle.responder = () => resolve({ ...item })
    controle.falhar = reject
  }))
  return controle
}

function enviarFotoComLegenda(id: string, legenda: string) {
  vi.spyOn(api.fotos, 'enviar').mockResolvedValue([
    { id, secao: 'ambiente', url: `https://arquivos.example/${id}.jpg`, legenda, ordem: 1 },
  ])
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

    expect(rotulos(reclamante)).toEqual(['Reclamante', 'Parte reclamante ausente', 'Advogado (a)', 'Assistente Técnico (a)'])
    expect(rotulos(principal)).toEqual([
      'Advogado (a)',
      'Eng. Segurança do Trabalho',
      'Eng. Segurança do Trabalho - Assistente Técnico',
      'Téc. Segurança do Trabalho - Assistente Técnico',
      'Preposto',
      'Gestor(a) Imediato(a) / Liderança',
      'Representante Setorial',
      'Recursos Humanos',
    ])
    expect(rotulos(envolvidas)).toEqual([
      'Advogado (a)',
      'Eng. Segurança do Trabalho',
      'Eng. Segurança do Trabalho - Assistente Técnico',
      'Téc. Segurança do Trabalho - Assistente Técnico',
      'Preposto',
      'Gestor(a) Imediato(a) / Liderança',
      'Representante Setorial',
      'Recursos Humanos',
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

  it('não exige nome quando a parte reclamante foi registrada como ausente', () => {
    prepararEditor()
    const reclamante = screen.getByRole('region', { name: 'Parte Reclamante' })
    fireEvent.click(within(reclamante).getByRole('button', { name: 'Adicionar participante em Parte Reclamante' }))
    fireEvent.change(within(reclamante).getByLabelText('Qualificação'), {
      target: { value: 'parte_reclamante_ausente' },
    })

    expect(within(reclamante).queryByLabelText('Nome')).toBeNull()
    expect(within(reclamante).getByText('A parte reclamante não compareceu para a apresentação de suas alegações.')).toBeDefined()
  })

  it('mantém presença e conclusão dentro de cada avaliação NR-15', async () => {
    const comAgente = {
      ...pericia,
      tecnico: {
        ...pericia.tecnico,
        agentes: [
          { id: 'agente-frio', nome: 'Frio', tipo: 'fisico', criterio: 'qualitativo', observacao: '' },
        ],
      },
    } as Pericia
    prepararEditor({ valor: comAgente })
    fireEvent.click(screen.getByRole('button', { name: /Avaliações e EPIs/ }))

    expect(await screen.findByRole('checkbox', { name: /Agente identificado na atividade/ })).toBeDefined()
    expect(screen.getByRole('textbox', { name: 'Conclusão da avaliação' })).toBeDefined()
  })

  it('mostra no preenchimento a mesma numeração do documento e oculta campos automáticos', () => {
    prepararEditor()
    fireEvent.click(screen.getByRole('button', { name: /Preenchimento/ }))

    expect(screen.getByText('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA')).toBeDefined()
    // Título de nível 1 não tem caixa de texto: o 3.1 abre a seção 3 direto.
    expect(screen.queryByText('3. Descrição das Instalações da Reclamada')).toBeNull()
    expect(screen.getByText('3.1. Instalações Físicas')).toBeDefined()
    expect(screen.getByText('6.1. Descrição do Posto de Trabalho')).toBeDefined()
    expect(screen.getByText('7.1. Atividades Efetivamente Exercidas')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Abrir biblioteca do item 3.1' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Abrir biblioteca do item 6.4' })).toBeDefined()
    expect(screen.queryByText('Endereçamento')).toBeNull()
    expect(screen.queryByText('Objetivo da perícia')).toBeNull()
  })

  it('protege os textos próprios da matriz para usuários não administradores', () => {
    prepararEditor({ perfil: 'perito' })
    fireEvent.click(screen.getByRole('button', { name: /Preenchimento/ }))

    const apresentacao = screen.getByText('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA').closest('.card')?.querySelector('textarea')
    expect(apresentacao).not.toBeNull()
    expect(apresentacao?.readOnly).toBe(true)
    expect(screen.queryByRole('button', { name: 'Abrir biblioteca da apresentação' })).toBeNull()
    expect(screen.getByText(/Texto oficial da matriz/)).toBeDefined()
  })

  it('permite que o administrador edite o texto próprio da matriz', () => {
    prepararEditor({ perfil: 'admin' })
    fireEvent.click(screen.getByRole('button', { name: /Preenchimento/ }))

    const apresentacao = screen.getByText('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA').closest('.card')?.querySelector('textarea')
    expect(apresentacao).not.toBeNull()
    expect(apresentacao?.readOnly).toBe(false)
    expect(screen.getByRole('button', { name: 'Abrir biblioteca da apresentação' })).toBeDefined()
  })

  it('mantém os EPIs de agentes diferentes quando atualizações são recebidas no mesmo lote', () => {
    const comAgentes = {
      ...pericia,
      tecnico: {
        ...pericia.tecnico,
        agentes: [
          { id: 'agente-ruido', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo', epis: [] },
          { id: 'agente-quimico', nome: 'Amônia', tipo: 'quimico', criterio: 'quantitativo', epis: [] },
        ],
      },
    } as Pericia
    prepararEditor({ valor: comAgentes })
    fireEvent.click(screen.getByRole('button', { name: /Avaliações e EPIs/ }))

    const ruido = screen.getByRole('button', { name: 'Adicionar EPI a Ruído' })
    const amonia = screen.getByRole('button', { name: 'Adicionar EPI a Amônia' })
    act(() => {
      ruido.click()
      amonia.click()
    })

    expect(screen.getByText('Ruído: 1 EPI')).toBeDefined()
    expect(screen.getByText('Amônia: 1 EPI')).toBeDefined()
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

  it('envia as fotos mesmo quando o navegador esvazia o FileList ao zerar o input (Chromium)', async () => {
    // O bug que o cliente viu em produção: nenhuma foto subia. O Chromium
    // esvazia o FileList no próprio objeto quando o input é zerado, e a tela
    // lia a lista só depois de salvar o rascunho. O jsdom não reproduz isso
    // sozinho — este input imita o comportamento do Chrome.
    const enviar = vi.spyOn(api.fotos, 'enviar').mockImplementation(async (_id, secao, arquivos) =>
      arquivos.map((arquivo, i) => ({
        id: `foto-${arquivo.name}`,
        secao,
        url: `https://arquivos.example/${arquivo.name}`,
        legenda: arquivo.name,
        ordem: i + 1,
      })),
    )
    const { salvarPericia, container } = prepararEditor()
    fireEvent.click(screen.getByRole('button', { name: /Fotografias/ }))

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    escolherComoNoChromium(input, [
      new File(['um'], 'um.jpg', { type: 'image/jpeg' }),
      new File(['dois'], 'dois.jpg', { type: 'image/jpeg' }),
    ])

    await waitFor(() => expect(salvarPericia).toHaveBeenCalledTimes(2))
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar.mock.calls[0]?.[2].map((arquivo) => arquivo.name)).toEqual(['um.jpg', 'dois.jpg'])
    expect(salvarPericia.mock.calls[1]?.[0].fotos.map((f) => f.id)).toEqual(['foto-um.jpg', 'foto-dois.jpg'])
    expect(await screen.findByText('2 foto(s) adicionada(s) em "Ambiente de trabalho (item 3.1)".')).toBeDefined()
  })

  it('envia um lote grande em partes e mantém o que já subiu quando uma parte falha', async () => {
    let chamada = 0
    const enviar = vi.spyOn(api.fotos, 'enviar').mockImplementation(async (_id, secao, arquivos) => {
      chamada += 1
      if (chamada === 2) throw new Error('A conexão caiu.')
      return arquivos.map((arquivo, i) => ({
        id: `foto-${arquivo.name}`,
        secao,
        url: `https://arquivos.example/${arquivo.name}`,
        legenda: arquivo.name,
        ordem: i + 1,
      }))
    })
    const { salvarPericia, container } = prepararEditor()
    fireEvent.click(screen.getByRole('button', { name: /Fotografias/ }))

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    escolherComoNoChromium(
      input,
      Array.from({ length: 8 }, (_, i) => new File(['x'], `f${i + 1}.jpg`, { type: 'image/jpeg' })),
    )

    await waitFor(() => expect(salvarPericia).toHaveBeenCalledTimes(2))
    expect(enviar.mock.calls.map((c) => c[2].length)).toEqual([6, 2])
    expect(salvarPericia.mock.calls[1]?.[0].fotos).toHaveLength(6)
    expect(await screen.findByText(/6 de 8 foto\(s\) enviada\(s\).*A conexão caiu\./)).toBeDefined()
    expect(screen.queryByText(/foto\(s\) adicionada\(s\)/)).toBeNull()
  })

  it('não desfaz a legenda editada enquanto a foto é preparada e o rascunho é salvo', async () => {
    // A foto grande espera a redução no navegador; o rascunho era salvo com a
    // perícia de ANTES dessa espera, e a legenda digitada nesse meio voltava.
    const existente = { id: 'foto-antiga', secao: 'ambiente' as const, url: 'https://arquivos.example/a.jpg', legenda: 'Legenda antiga', ordem: 1 }
    const nova = { id: 'foto-nova', secao: 'ambiente' as const, url: 'https://arquivos.example/b.jpg', legenda: 'b', ordem: 2 }
    vi.spyOn(api.fotos, 'enviar').mockResolvedValue([nova])

    let terminarPreparo!: () => void
    const { prepararFotosParaEnvio: original } = await vi.importActual<typeof import('@/lib/prepararFotos')>('@/lib/prepararFotos')
    vi.mocked(prepararFotosParaEnvio).mockImplementationOnce(async (arquivos) => {
      await new Promise<void>((resolve) => { terminarPreparo = resolve })
      return original(arquivos)
    })

    const { salvarPericia, container } = prepararEditor({ valor: { ...pericia, fotos: [existente] } })
    let terminarRascunho!: () => void
    salvarPericia.mockImplementationOnce(async (valor: Pericia) => {
      await new Promise<void>((resolve) => { terminarRascunho = resolve })
      return valor
    })
    fireEvent.click(screen.getByRole('button', { name: /Fotografias/ }))

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    escolherComoNoChromium(input, [new File(['b'], 'b.jpg', { type: 'image/jpeg' })])
    await waitFor(() => expect(terminarPreparo).toBeTypeOf('function'))

    fireEvent.change(screen.getByDisplayValue('Legenda antiga'), { target: { value: 'Legenda nova' } })
    await act(async () => terminarPreparo())

    await waitFor(() => expect(salvarPericia).toHaveBeenCalledTimes(1))
    expect(salvarPericia.mock.calls[0]?.[0].fotos[0]?.legenda).toBe('Legenda nova')

    fireEvent.change(screen.getByDisplayValue('Legenda nova'), { target: { value: 'Legenda final' } })
    await act(async () => terminarRascunho())

    await waitFor(() => expect(salvarPericia).toHaveBeenCalledTimes(2))
    expect(salvarPericia.mock.calls[1]?.[0].fotos.map((f) => [f.id, f.legenda])).toEqual([
      ['foto-antiga', 'Legenda final'],
      ['foto-nova', 'b'],
    ])
    expect(screen.getByDisplayValue('Legenda final')).toBeDefined()
  })

  it('não desfaz a legenda digitada enquanto a lista de fotos é gravada (store real)', async () => {
    enviarFotoComLegenda('foto-enviada', 'Foto enviada')
    const { persistir, container } = prepararEditorComLoja()
    // 1ª gravação (rascunho) responde na hora; a 2ª (lista de fotos) espera.
    persistir.mockImplementationOnce(async (item) => ({ ...item }))
    const sincronizacao = segurarGravacao(persistir)
    fireEvent.click(screen.getByRole('button', { name: /Fotografias/ }))

    escolherComoNoChromium(container.querySelector<HTMLInputElement>('input[type="file"]')!, [
      new File(['x'], 'local.jpg', { type: 'image/jpeg' }),
    ])
    await waitFor(() => expect(persistir).toHaveBeenCalledTimes(2))
    fireEvent.change(await screen.findByDisplayValue('Foto enviada'), { target: { value: 'Legenda digitada' } })

    // A resposta chega e o store troca a perícia da lista.
    await act(async () => sincronizacao.responder())

    expect(screen.getByDisplayValue('Legenda digitada')).toBeDefined()
    expect(screen.queryByDisplayValue('Foto enviada')).toBeNull()
  })

  it('mantém a foto e a legenda na tela quando a gravação da lista falha (store real)', async () => {
    enviarFotoComLegenda('foto-enviada', 'Foto enviada')
    const { persistir, container } = prepararEditorComLoja()
    persistir.mockImplementationOnce(async (item) => ({ ...item }))
    const sincronizacao = segurarGravacao(persistir)
    fireEvent.click(screen.getByRole('button', { name: /Fotografias/ }))

    escolherComoNoChromium(container.querySelector<HTMLInputElement>('input[type="file"]')!, [
      new File(['x'], 'local.jpg', { type: 'image/jpeg' }),
    ])
    await waitFor(() => expect(persistir).toHaveBeenCalledTimes(2))
    fireEvent.change(await screen.findByDisplayValue('Foto enviada'), { target: { value: 'Legenda digitada' } })

    // Falhou: o store volta a lista de ANTES das fotos. A tela não pode ir junto.
    await act(async () => sincronizacao.falhar(new Error('Conexão perdida.')))

    expect(await screen.findByText(/As fotos foram gravadas, mas a lista da perícia não foi atualizada/)).toBeDefined()
    expect(screen.getByDisplayValue('Legenda digitada')).toBeDefined()

    // O "salve o rascunho" do aviso leva a foto e a legenda — não a versão velha.
    enviarFotoComLegenda('foto-segunda', 'Segunda')
    escolherComoNoChromium(container.querySelector<HTMLInputElement>('input[type="file"]')!, [
      new File(['y'], 'segunda.jpg', { type: 'image/jpeg' }),
    ])
    await waitFor(() => expect(persistir).toHaveBeenCalledTimes(4))
    expect(persistir.mock.calls[2]?.[0].fotos.map((f) => [f.id, f.legenda])).toEqual([['foto-enviada', 'Legenda digitada']])
    expect(persistir.mock.calls[3]?.[0].fotos.map((f) => [f.id, f.legenda])).toEqual([
      ['foto-enviada', 'Legenda digitada'],
      ['foto-segunda', 'Segunda'],
    ])
  })

  it('nunca anuncia sucesso quando nenhuma foto foi gravada', async () => {
    vi.spyOn(api.fotos, 'enviar').mockRejectedValue(new Error('Servidor fora do ar.'))
    const { salvarPericia, container } = prepararEditor()
    fireEvent.click(screen.getByRole('button', { name: /Fotografias/ }))

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    escolherComoNoChromium(input, [new File(['x'], 'a.jpg', { type: 'image/jpeg' })])

    expect(await screen.findByText('Servidor fora do ar.')).toBeDefined()
    expect(salvarPericia).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/adicionada/)).toBeNull()
  })
})

/**
 * Imita o `<input type="file">` do Chrome: `files` é um objeto vivo que se
 * esvazia quando `value` recebe ''. É o que zerar o input faz de verdade.
 */
function escolherComoNoChromium(input: HTMLInputElement, arquivos: File[]) {
  const lista: File[] = [...arquivos]
  Object.defineProperty(input, 'files', { configurable: true, get: () => lista })
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => (lista.length ? `C:\\fakepath\\${lista[0]!.name}` : ''),
    set: (valor: string) => {
      if (valor === '') lista.length = 0
    },
  })
  fireEvent.change(input)
}
