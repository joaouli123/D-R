// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { useApp } from '@/store/AppStore'
import type { AgenteAvaliado, Pericia, PeriodoFuncao } from '@/types'

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

// ============================================================
// Dois pedidos do perito, gravados em áudio, nesta tela:
//
//   "Você insere o agente, ele fica na tela. Vai inserir outro, aí a tela
//    vai aumentando... Se desse para inserir no laudo e a tela sumir, e
//    abrir de novo para inserir um novo — tipo igual tá o do EPI."
//
//   "Pego o ruído aqui como exemplo: função tal, insiro o ruído, o valor
//    que deu, o EPI. E aí depois tem que inserir o ruído de novo em outra
//    função. Então ele teria que ficar dividido ali naquele campo de onde
//    vão entrar os agentes. Da mesma forma pra NR-16."
//
// O primeiro virou o botão "Inserir no laudo", que recolhe o cartão. O
// segundo virou o vínculo do agente com um período do item 7.1, que a tela
// usa para separar as avaliações por função.
// ============================================================

const PERIODOS: PeriodoFuncao[] = [
  { id: 'per-prensa', funcao: 'Prensista', setor: 'Estamparia', inicio: '2019-01-10' },
  { id: 'per-expedicao', funcao: 'Auxiliar de expedição', inicio: '2022-03-01' },
]

const RUIDO_PENDENTE: AgenteAvaliado = {
  id: 'agn-ruido',
  nome: 'Ruído',
  tipo: 'fisico',
  criterio: 'quantitativo',
  grau: 'medio',
}

// Nome e conclusão preenchidos: é o que `nr15Completa` exige, e o que faz o
// cartão nascer recolhido.
const AMONIA_COMPLETA: AgenteAvaliado = {
  id: 'agn-amonia',
  nome: 'Amônia',
  tipo: 'quimico',
  criterio: 'quantitativo',
  grau: 'maximo',
  observacao: 'Exposição habitual acima do limite de tolerância.',
}

const INFLAMAVEIS_NR16: AgenteAvaliado = {
  id: 'ris-inflamaveis',
  nome: 'Inflamáveis',
  tipo: 'periculosidade',
  criterio: 'qualitativo',
}

const base = {
  id: 'pericia-agentes',
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

function prepararEditor({
  agentes,
  periodos = [],
  modalidade = 'insalubridade',
}: {
  agentes: AgenteAvaliado[]
  periodos?: PeriodoFuncao[]
  modalidade?: Pericia['modalidade']
}) {
  vi.mocked(useApp).mockReturnValue({
    usuario: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'perito' },
    empresas: [],
    pericias: [{ ...base, modalidade, tecnico: { ...base.tecnico, periodos, agentes } }],
    documentos: [],
    textos: [],
    quesitos: [],
    salvarPericia: vi.fn(async (valor: Pericia) => valor),
    salvarDocumento: vi.fn(),
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter initialEntries={['/pericias/pericia-agentes']}>
      <ToastProvider>
        <Routes>
          <Route path="/pericias/:id" element={<PericiaEditor />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: /Avaliações e EPIs/ }))
}

/**
 * O botão que abre e fecha um cartão.
 *
 * O nome acessível dele é o título da avaliação seguido do resumo, então
 * casar pelo começo basta e não prende o teste à redação do resumo.
 */
const alternadorDe = (titulo: string) =>
  screen.getByRole('button', { name: new RegExp(`^${titulo}`) })

const estaAberto = (botao: HTMLElement) => botao.getAttribute('aria-expanded') === 'true'

describe('PericiaEditor — inserir no laudo recolhe a avaliação', () => {
  it('fecha o cartão no clique e passa a avisar que ele ficou pendente', () => {
    prepararEditor({ agentes: [RUIDO_PENDENTE] })
    const ruido = alternadorDe('Ruído')

    // Avaliação incompleta chega aberta: há trabalho a fazer nela.
    expect(estaAberto(ruido)).toBe(true)
    expect(screen.queryByText('pendente')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Inserir no laudo' }))

    expect(estaAberto(ruido)).toBe(false)
    // Recolhido não é escondido: sem a conclusão, o cartão continua cobrando.
    expect(screen.getByText('pendente')).toBeDefined()
    // E o corpo saiu do alcance — é a tela que "some", como ele pediu.
    expect(screen.queryByRole('button', { name: 'Inserir no laudo' })).toBeNull()
  })

  it('recolhe também a avaliação NR-16', () => {
    prepararEditor({ agentes: [INFLAMAVEIS_NR16], modalidade: 'periculosidade' })
    const inflamaveis = alternadorDe('Inflamáveis')

    expect(estaAberto(inflamaveis)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Inserir no laudo' }))

    expect(estaAberto(inflamaveis)).toBe(false)
  })

  it('não fecha o cartão na cara do perito quando ele termina a conclusão', () => {
    // A conclusão é justamente o que torna a avaliação "completa". Se o
    // estado de aberto continuasse sendo recalculado, o cartão se recolheria
    // sozinho no instante da última tecla. O padrão é congelado na primeira
    // vez que a avaliação aparece; daí em diante só um clique o muda.
    prepararEditor({ agentes: [RUIDO_PENDENTE] })
    const ruido = alternadorDe('Ruído')

    fireEvent.change(screen.getByLabelText(/Conclusão da avaliação/), {
      target: { value: 'Exposição a ruído acima do limite de tolerância.' },
    })

    expect(estaAberto(ruido)).toBe(true)
  })

  it('abre o agente novo sem mexer nos vizinhos', () => {
    // Sanfona ele não pediu, e comparar duas avaliações lado a lado é rotina
    // de perícia: quem se fecha é só o cartão que foi inserido.
    prepararEditor({ agentes: [AMONIA_COMPLETA, RUIDO_PENDENTE] })

    expect(estaAberto(alternadorDe('Amônia'))).toBe(false)
    expect(estaAberto(alternadorDe('Ruído'))).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Novo agente NR-15' }))

    const novo = screen
      .getAllByRole('button', { name: /Novo agente NR-15/ })
      .find((botao) => botao.hasAttribute('aria-expanded'))
    expect(novo && estaAberto(novo)).toBe(true)
    expect(estaAberto(alternadorDe('Amônia'))).toBe(false)
    expect(estaAberto(alternadorDe('Ruído'))).toBe(true)
  })
})

describe('PericiaEditor — o mesmo agente uma vez por função', () => {
  it('não oferece função nenhuma quando a etapa 1 não tem período', () => {
    prepararEditor({ agentes: [RUIDO_PENDENTE] })

    expect(screen.queryByLabelText(/Função \/ Posto avaliado/)).toBeNull()
  })

  it('lista os períodos do item 7.1, e deixa o agente valer para o lapso inteiro', () => {
    prepararEditor({ agentes: [RUIDO_PENDENTE], periodos: PERIODOS })
    const seletor = screen.getByLabelText(/Função \/ Posto avaliado/) as HTMLSelectElement

    expect([...seletor.options].map((opcao) => opcao.text)).toEqual([
      '— todo o período avaliado —',
      'Prensista — Estamparia',
      'Auxiliar de expedição',
    ])
    // Sem escolha, o agente não fica preso a posto nenhum — é a perícia de
    // função única, que é toda perícia gravada até hoje.
    expect(seletor.value).toBe('')
    expect(screen.queryByRole('heading', { name: 'Prensista — Estamparia' })).toBeNull()
  })

  it('oferece a mesma escolha na avaliação NR-16', () => {
    prepararEditor({
      agentes: [INFLAMAVEIS_NR16],
      periodos: PERIODOS,
      modalidade: 'periculosidade',
    })

    expect(screen.getByLabelText(/Função \/ Posto avaliado/)).toBeDefined()
  })

  it('divide a lista por função assim que um agente é vinculado', () => {
    prepararEditor({ agentes: [RUIDO_PENDENTE, AMONIA_COMPLETA], periodos: PERIODOS })
    const [doRuido] = screen.getAllByLabelText(/Função \/ Posto avaliado/) as HTMLSelectElement[]

    fireEvent.change(doRuido!, { target: { value: 'per-prensa' } })

    expect(screen.getByRole('heading', { name: 'Prensista — Estamparia' })).toBeDefined()
    // A amônia continua sem vínculo, e continua à vista — no bloco do fim.
    expect(screen.getByRole('heading', { name: 'Sem função vinculada' })).toBeDefined()
    // Período sem agente nenhum não vira cabeçalho vazio.
    expect(screen.queryByRole('heading', { name: 'Auxiliar de expedição' })).toBeNull()
    expect(doRuido!.value).toBe('per-prensa')
  })
})
