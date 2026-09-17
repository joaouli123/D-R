// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { CATALOGO_VARREDURA_NR15 } from '@/lib/varreduraNormativa'
import { useApp } from '@/store/AppStore'
import type { AgenteAvaliado, Pericia, PeriodoFuncao, PreenchimentoTecnico } from '@/types'

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
  tecnico = {},
}: {
  agentes: AgenteAvaliado[]
  periodos?: PeriodoFuncao[]
  modalidade?: Pericia['modalidade']
  tecnico?: Partial<PreenchimentoTecnico>
}) {
  const salvarPericia = vi.fn(async (valor: Pericia) => valor)
  const salvarDocumento = vi.fn(async (valor: { id: string }) => valor)
  vi.mocked(useApp).mockReturnValue({
    usuario: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'perito' },
    empresas: [],
    pericias: [{ ...base, modalidade, tecnico: { ...base.tecnico, ...tecnico, periodos, agentes } }],
    documentos: [],
    textos: [],
    quesitos: [],
    salvarPericia,
    salvarDocumento,
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
  return { salvarPericia, salvarDocumento }
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

describe('PericiaEditor — varredura obrigatória dos anexos', () => {
  it('abre uma avaliação já enquadrada ao confirmar exposição no Anexo 1', () => {
    prepararEditor({ agentes: [] })

    expect(screen.getByText('1 de 14 anexos avaliados')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /^Anexo 1 —.*Avaliação da suposta exposição/i }))

    expect(alternadorDe('Ruído contínuo ou intermitente')).toBeDefined()
    expect(screen.getByText('2 de 14 anexos avaliados')).toBeDefined()
  })

  it('mostra as duas varreduras quando a modalidade abrange ambas', () => {
    prepararEditor({ agentes: [], modalidade: 'ambas' })

    expect(screen.getByRole('region', { name: 'Varredura dos anexos da NR-15' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Varredura dos anexos da NR-16' })).toBeDefined()
  })

  it('tem um painel de periculosidade só: o quadro da NR-16 não se marca à mão', () => {
    // "Aparentemente existem dois painéis de periculosidade: um com a versão
    // atualizada e outro que ainda apresenta os textos anteriores."
    prepararEditor({ agentes: [], modalidade: 'periculosidade' })

    const quadro = screen.getByRole('region', { name: 'Varredura dos anexos da NR-16' })
    expect(within(quadro).queryByRole('button', { name: /Sem exposição/ })).toBeNull()
    expect(within(quadro).queryByRole('button', { name: /suposta exposição|Exposição identificada/i })).toBeNull()
    expect(screen.queryByText(/Exposição identificada/i)).toBeNull()

    fireEvent.click(within(quadro).getByRole('button', { name: 'Registrar avaliação NR-16' }))

    const nova = screen
      .getAllByRole('button', { name: /^Nova avaliação NR-16/ })
      .find((botao) => botao.hasAttribute('aria-expanded'))
    expect(nova && estaAberto(nova)).toBe(true)
    expect(document.activeElement?.id).toMatch(/^agente-ris/)
    expect(within(quadro).queryByRole('button', { name: 'Registrar avaliação NR-16' })).toBeNull()
  })
})

// ============================================================
// "Durante o teste, ainda tive dificuldade para concluir essa etapa."
// A emissão travou em "NR-15, Anexo 1: sem eficácia do EPI", cobrança de um
// campo que a tela nem mostra no ruído. Estes testes fazem o caminho dele:
// ver o que falta, ir até o campo, responder e emitir.
// ============================================================

const EPI_AUDITIVO = [{ categoria: 'Proteção auditiva', modelo: 'Concha' }]
const EPI_LUVA = [{ categoria: 'Luva', modelo: 'Nitrílica' }]

const ALCALIS_SEM_EFICACIA = {
  id: 'agn-alcalis', nome: 'Álcalis', tipo: 'quimico', criterio: 'qualitativo', grau: 'medio',
  anexoNr15: 'ANEXO_13', epis: EPI_LUVA, observacao: 'Contato habitual com álcalis cáusticos.',
} as AgenteAvaliado

/** Todos os anexos decididos; os de `exposicao` com avaliação, o resto sem exposição. */
const varreduraDecidida = (exposicao: string[]) => CATALOGO_VARREDURA_NR15
  .filter((item) => item.anexoId !== 'ANEXO_04')
  .map((item) => ({
    anexoId: item.anexoId,
    status: exposicao.includes(item.anexoId) ? 'exposicao_identificada' as const : 'sem_exposicao' as const,
  }))

const irParaODocumento = () => fireEvent.click(screen.getByRole('button', { name: /^6\s*Documento$/ }))

describe('PericiaEditor — concluir a etapa das avaliações', () => {
  it('não cobra eficácia do EPI no ruído: a etapa fica sem pendência e o documento sai', async () => {
    const { salvarDocumento } = prepararEditor({
      agentes: [{
        id: 'agn-ruido-epi', nome: 'Ruído contínuo ou intermitente', tipo: 'fisico', criterio: 'quantitativo',
        grau: 'medio', anexoNr15: 'ANEXO_01', epis: EPI_AUDITIVO, observacao: 'Abaixo do limite com o protetor.',
      } as AgenteAvaliado],
      tecnico: { varreduraNr15: varreduraDecidida(['ANEXO_01']) },
    })

    expect(screen.getByText(/Nenhuma pendência nesta etapa/)).toBeDefined()
    expect(screen.queryByRole('region', { name: 'Pendências para emitir' })).toBeNull()

    irParaODocumento()
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar documento' }))

    await vi.waitFor(() => expect(salvarDocumento).toHaveBeenCalled())
    expect(screen.queryByText(/Há pendências para emitir/)).toBeNull()
  })

  it('leva ao campo da eficácia do EPI, reabre o cartão recolhido e aceita "Não" como resposta', () => {
    prepararEditor({
      agentes: [ALCALIS_SEM_EFICACIA],
      tecnico: { varreduraNr15: varreduraDecidida(['ANEXO_13']) },
    })

    const pendencias = screen.getByRole('region', { name: 'Pendências para emitir' })
    expect(within(pendencias).getByText('Falta 1 item para emitir o documento')).toBeDefined()
    expect(within(pendencias).getByText('NR-15, Álcalis (Anexo 13): informe se o EPI é eficaz')).toBeDefined()

    // O perito recolheu o cartão: o botão da lista tem de reabri-lo.
    fireEvent.click(screen.getByRole('button', { name: 'Inserir no laudo' }))
    expect(estaAberto(alternadorDe('Álcalis'))).toBe(false)

    fireEvent.click(within(pendencias).getByRole('button', { name: 'Ir ao campo' }))

    expect(estaAberto(alternadorDe('Álcalis'))).toBe(true)
    expect(document.activeElement?.id).toBe('agente-agn-alcalis-epiEficaz')

    fireEvent.click(screen.getByRole('radio', { name: /^Não/ }))

    expect(screen.queryByRole('region', { name: 'Pendências para emitir' })).toBeNull()
    expect(screen.getByText(/Nenhuma pendência nesta etapa/)).toBeDefined()
  })

  it('leva ao campo da conclusão que falta', () => {
    prepararEditor({
      agentes: [{ ...RUIDO_PENDENTE, anexoNr15: 'ANEXO_01' }],
      tecnico: { varreduraNr15: varreduraDecidida(['ANEXO_01']) },
    })

    const pendencias = screen.getByRole('region', { name: 'Pendências para emitir' })
    fireEvent.click(within(pendencias).getByRole('button', { name: 'Ir ao campo' }))

    expect(document.activeElement).toBe(screen.getByLabelText(/Conclusão da avaliação/))
  })

  it('fecha os anexos restantes de uma vez, depois de confirmar', () => {
    prepararEditor({ agentes: [] })

    expect(screen.getByText('1 de 14 anexos avaliados')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar pendentes como sem exposição (13)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('14 de 14 anexos avaliados')).toBeDefined()
    expect(screen.getByText(/Nenhuma pendência nesta etapa/)).toBeDefined()
  })

  it('no Anexo 8, leva à escolha do subtipo sem criar uma avaliação em branco a cada clique', () => {
    prepararEditor({ agentes: [], tecnico: { varreduraNr15: varreduraDecidida(['ANEXO_08']) } })

    const pendencias = screen.getByRole('region', { name: 'Pendências para emitir' })
    expect(within(pendencias).getByText(/^NR-15, Anexo 8 \(Vibrações\): escolha o tipo de vibração/)).toBeDefined()
    const camposDeAnexo = () => document.querySelectorAll('select[id$="-anexoNr15"]')

    fireEvent.click(within(pendencias).getByRole('button', { name: 'Escolher subtipo' }))
    expect(camposDeAnexo()).toHaveLength(1)
    const campo = camposDeAnexo()[0] as HTMLSelectElement
    expect(document.activeElement).toBe(campo)

    // O subtipo ainda não foi escolhido: a pendência continua, e o segundo
    // clique volta ao mesmo campo em vez de empilhar outra avaliação.
    ;(document.activeElement as HTMLElement).blur()
    fireEvent.click(within(pendencias).getByRole('button', { name: 'Escolher subtipo' }))
    expect(camposDeAnexo()).toHaveLength(1)
    expect(document.activeElement).toBe(campo)

    fireEvent.change(campo, { target: { value: 'ANEXO_08_VMB' } })
    expect(screen.queryByText(/escolha o tipo de vibração/)).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Pendências para emitir' }))
      .getByText(/Anexo 8\): preencha a conclusão da avaliação/)).toBeDefined()
  })

  it('leva à linha do anexo ainda sem decisão', () => {
    prepararEditor({ agentes: [] })

    const pendencias = screen.getByRole('region', { name: 'Pendências para emitir' })
    expect(within(pendencias).getByText(/^NR-15: 13 anexos sem decisão \(1, 2, 3, 5,/)).toBeDefined()
    fireEvent.click(within(pendencias).getByRole('button', { name: 'Ir ao anexo' }))

    expect(document.activeElement?.id).toBe('varredura-NR-15-ANEXO_01')
  })

  it('ao finalizar com pendência, volta à etapa com a lista do que falta em foco', async () => {
    const { salvarDocumento } = prepararEditor({
      agentes: [ALCALIS_SEM_EFICACIA],
      tecnico: { varreduraNr15: varreduraDecidida(['ANEXO_13']) },
    })

    irParaODocumento()
    expect(screen.queryByRole('region', { name: 'Pendências para emitir' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar documento' }))

    expect(await screen.findByText(
      'Há pendências para emitir o documento: NR-15, Álcalis (Anexo 13): informe se o EPI é eficaz.',
    )).toBeDefined()
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Pendências para emitir' }))
    expect(salvarDocumento).not.toHaveBeenCalled()
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
