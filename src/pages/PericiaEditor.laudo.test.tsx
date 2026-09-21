// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PericiaEditor from './PericiaEditor'
import { ToastProvider } from '@/components/ui'
import { textosPadraoDaPericia } from '@/content/textosPadrao'
import * as api from '@/services/api'
import { useApp } from '@/store/AppStore'
import type { Empresa, Pericia, Usuario } from '@/types'

vi.mock('@/store/AppStore', () => ({ useApp: vi.fn() }))
vi.mock('@/components/layout/AppLayout', () => ({
  PageHeader: ({ title, action }: { title: string; action?: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
}))
vi.mock('@/components/BuscaProcesso', () => ({
  BuscaProcesso: () => <div>Busca de processo</div>,
}))
vi.mock('@/components/EpiSelector', () => ({
  EpiSelector: () => <div>Seleção de EPI</div>,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// ------------------------------------------------------------------
// O que o cliente pediu para o LAUDO (e que o Parecer não mostra):
//   • fotos das medições logo abaixo do agente avaliado, inclusive pela
//     câmera do celular;
//   • respostas aos quesitos em campos separados — Juízo, Reclamante e
//     Reclamada — com o atalho "Não apresentado";
//   • item DOS HONORÁRIOS PERICIAIS, com o valor proposto pelo perito.
// Estes testes abrem o editor de uma perícia já gravada, como o perito faz.
// ------------------------------------------------------------------

const empresa: Empresa = {
  id: 'empresa-principal',
  razaoSocial: 'Reclamada Principal Ltda.',
  cnpj: '11.111.111/0001-11',
  endereco: '',
  cidade: 'São Paulo',
  uf: 'SP',
  criadoEm: '2026-08-01',
}

const tecnicoVazio: Pericia['tecnico'] = {
  apresentacao: '', enderecamento: '', objetivoPericia: '',
  descricaoEmpresa: '', descricaoAmbiente: '', descricaoPostoTrabalho: '',
  maquinasFerramentas: '', produtosUtilizados: '', atividadesFuncoes: '', periodos: [], agentes: [],
  normasReferencias: '', equipamentosAnalisados: '', informacoesLevantadas: '',
  divergenciasFaticas: '', protecoesColetivas: '', analiseTecnica: '', conclusao: '',
  conclusaoInsalubridade: '', conclusaoPericulosidade: '', respostasQuesitos: '',
  encerramento: '', observacoesAdicionais: '',
}

function periciaBase(
  alteracoes: Partial<Omit<Pericia, 'tecnico'>> & { tecnico?: Partial<Pericia['tecnico']> } = {},
): Pericia {
  const { tecnico, ...resto } = alteracoes
  return {
    id: 'pericia-laudo',
    numeroProcesso: '1000000-00.2026.5.02.0001',
    vara: '1ª Vara do Trabalho',
    comarca: 'São Paulo/SP',
    reclamante: 'Pessoa reclamante',
    cpfReclamante: '',
    funcaoReclamante: 'Operador',
    reclamadas: [{ id: 'reclamada-1', empresaId: 'empresa-principal', principal: true }],
    participantes: [],
    dataVistoria: '2026-08-28',
    horaVistoria: '09:00',
    horaFimVistoria: '10:30',
    localVistoria: 'São Paulo/SP',
    modalidade: 'ambas',
    status: 'rascunho',
    responsavelId: 'usuario-1',
    criadoEm: '2026-08-28',
    atualizadoEm: '2026-08-28',
    fotos: [],
    ...resto,
    tecnico: { ...tecnicoVazio, ...tecnico },
  }
}

const agenteRuido = { id: 'agente-ruido', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo', epis: [] }
const fotoDoRuido = (id: string, legenda: string, ordem: number) => ({
  id, secao: 'documentos' as const, agenteId: 'agente-ruido',
  url: `https://arquivos.example/${id}.jpg`, legenda, ordem,
})

const periciaComRuido = (fotos: Pericia['fotos'] = []) =>
  periciaBase({ tecnico: { agentes: [agenteRuido] as unknown as Pericia['tecnico']['agentes'] }, fotos })

const usuarios = {
  admin: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'admin' },
  perito: { id: 'usuario-1', nome: 'Perito responsável', perfil: 'perito' },
} as const

function abrirEditor(opcoes: {
  tipo?: string
  perfil?: keyof typeof usuarios
  pericia?: Pericia
} = {}) {
  const valor = opcoes.pericia ?? periciaBase()
  const salvarPericia = vi.fn(async (item: Pericia) => item)
  vi.mocked(useApp).mockReturnValue({
    usuario: usuarios[opcoes.perfil ?? 'perito'],
    empresas: [empresa],
    pericias: [valor],
    documentos: [],
    textos: [],
    quesitos: [],
    salvarPericia,
    salvarDocumento: vi.fn(),
  } as unknown as ReturnType<typeof useApp>)

  render(
    <MemoryRouter initialEntries={[`/pericias/${valor.id}${opcoes.tipo ? `?tipo=${opcoes.tipo}` : ''}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/pericias/:id" element={<PericiaEditor />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
  return { salvarPericia }
}

const irParaEtapa = (nome: RegExp) => fireEvent.click(screen.getByRole('button', { name: nome }))
const cartao = (titulo: string) => {
  const encontrado = screen.getByText(titulo).closest('.card')
  if (!encontrado) throw new Error(`Cartão "${titulo}" não encontrado`)
  return encontrado as HTMLElement
}
const caixaDoCartao = (titulo: string) => {
  const caixa = cartao(titulo).querySelector('textarea')
  if (!caixa) throw new Error(`Cartão "${titulo}" sem caixa de texto`)
  return caixa
}
const antes = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('PericiaEditor — fotos das medições por agente (Laudo)', () => {
  it('no Laudo, cada avaliação ganha o bloco de evidências, com galeria e câmera do celular', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaComRuido() })
    irParaEtapa(/Avaliações e EPIs/)

    expect(screen.getByText('Evidências fotográficas da avaliação')).toBeDefined()
    const galeria = screen.getByLabelText<HTMLInputElement>('Enviar fotos de Ruído')
    expect(galeria.type).toBe('file')
    expect(galeria.accept).toBe('image/*')
    expect(galeria.multiple).toBe(true)
    const camera = screen.getByLabelText<HTMLInputElement>('Capturar foto de Ruído')
    expect(camera.accept).toBe('image/*')
    expect(camera.getAttribute('capture')).toBe('environment')
  })

  it.each([undefined, 'parecer', 'qualquer-coisa'])(
    'sem tipo=laudo (%s) o bloco não aparece: o Parecer não imprime fotos por agente',
    (tipo) => {
      abrirEditor({ tipo, pericia: periciaComRuido() })
      irParaEtapa(/Avaliações e EPIs/)

      expect(screen.getByRole('button', { name: 'Remover agente' })).toBeDefined()
      expect(screen.queryByText('Evidências fotográficas da avaliação')).toBeNull()
      expect(screen.queryByLabelText('Enviar fotos de Ruído')).toBeNull()
      expect(screen.queryByLabelText('Capturar foto de Ruído')).toBeNull()
    },
  )

  it('mostra as fotos da medição logo abaixo do agente, na etapa das avaliações', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaComRuido([fotoDoRuido('foto-1', 'Dosímetro no ombro', 1)]) })
    irParaEtapa(/Avaliações e EPIs/)

    const imagem = screen.getByAltText('Dosímetro no ombro')
    expect(antes(screen.getByText('Evidências fotográficas da avaliação'), imagem)).toBe(true)
  })

  it('na etapa de fotografias, junta as fotos de agentes num grupo à parte', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaComRuido([fotoDoRuido('foto-1', 'Dosímetro no ombro', 1)]) })
    irParaEtapa(/Fotografias/)

    expect(screen.getByText('Medições e avaliações técnicas')).toBeDefined()
    expect(screen.getByAltText('Dosímetro no ombro')).toBeDefined()
  })

  it('na etapa de fotografias do Parecer não aparece o grupo das medições', () => {
    abrirEditor({ tipo: 'parecer', pericia: periciaComRuido([fotoDoRuido('foto-1', 'Dosímetro no ombro', 1)]) })
    irParaEtapa(/Fotografias/)

    expect(screen.queryByText('Medições e avaliações técnicas')).toBeNull()
  })
})

describe('PericiaEditor — excluir avaliação que tem fotos (Laudo)', () => {
  const doisRegistros = () => periciaComRuido([
    fotoDoRuido('foto-1', 'Dosímetro no ombro', 1),
    fotoDoRuido('foto-2', 'Tela do dosímetro', 2),
  ])

  it('pergunta antes e, se o perito desistir, não apaga nada', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const remover = vi.spyOn(api.fotos, 'remover').mockResolvedValue(undefined)
    abrirEditor({ tipo: 'laudo', pericia: doisRegistros() })
    irParaEtapa(/Avaliações e EPIs/)

    fireEvent.click(screen.getByRole('button', { name: 'Remover agente' }))

    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(confirmar.mock.calls[0]?.[0]).toMatch(/Ruído tem 2 foto\(s\) de medição vinculada\(s\)/)
    expect(remover).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Remover agente' })).toBeDefined()
    expect(screen.getByAltText('Dosímetro no ombro')).toBeDefined()
    expect(screen.getByAltText('Tela do dosímetro')).toBeDefined()
  })

  it('confirmando, apaga as fotos do agente e depois a avaliação', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const remover = vi.spyOn(api.fotos, 'remover').mockResolvedValue(undefined)
    abrirEditor({ tipo: 'laudo', pericia: doisRegistros() })
    irParaEtapa(/Avaliações e EPIs/)

    fireEvent.click(screen.getByRole('button', { name: 'Remover agente' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remover agente' })).toBeNull())
    expect(remover).toHaveBeenCalledTimes(2)
    expect(remover).toHaveBeenCalledWith('pericia-laudo', 'foto-1')
    expect(remover).toHaveBeenCalledWith('pericia-laudo', 'foto-2')
    expect(screen.queryByAltText('Dosímetro no ombro')).toBeNull()
    expect(screen.queryByAltText('Tela do dosímetro')).toBeNull()
  })

  it('se uma foto não puder ser apagada, a avaliação fica — nenhuma foto vira órfã', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const remover = vi.spyOn(api.fotos, 'remover')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Servidor indisponível'))
    abrirEditor({ tipo: 'laudo', pericia: doisRegistros() })
    irParaEtapa(/Avaliações e EPIs/)

    fireEvent.click(screen.getByRole('button', { name: 'Remover agente' }))

    expect(await screen.findByText('Servidor indisponível')).toBeDefined()
    expect(remover).toHaveBeenCalledTimes(2)
    // A avaliação continua, com a foto que não saiu; a que saiu não volta.
    expect(screen.getByRole('button', { name: 'Remover agente' })).toBeDefined()
    expect(screen.queryByAltText('Dosímetro no ombro')).toBeNull()
    expect(screen.getByAltText('Tela do dosímetro')).toBeDefined()
  })

  it('sem fotos vinculadas, exclui direto, sem perguntar', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const remover = vi.spyOn(api.fotos, 'remover').mockResolvedValue(undefined)
    abrirEditor({ tipo: 'laudo', pericia: periciaComRuido() })
    irParaEtapa(/Avaliações e EPIs/)

    fireEvent.click(screen.getByRole('button', { name: 'Remover agente' }))

    expect(confirmar).not.toHaveBeenCalled()
    expect(remover).not.toHaveBeenCalled()
  })
})

describe('PericiaEditor — quesitos por origem (Laudo)', () => {
  it('"Não apresentado" preenche o campo vazio', () => {
    abrirEditor({ tipo: 'laudo' })
    irParaEtapa(/Conclusão/)

    const reclamada = screen.getByLabelText<HTMLTextAreaElement>('Quesitos da Reclamada')
    expect(reclamada.value).toBe('')
    fireEvent.click(screen.getAllByRole('button', { name: 'Não apresentado' })[2]!)

    expect(reclamada.value).toBe('Não apresentado')
    expect(screen.getByLabelText<HTMLTextAreaElement>('Quesitos do Juízo').value).toBe('')
  })

  it('"Não apresentado" não sobrescreve o que já foi escrito', () => {
    abrirEditor({
      tipo: 'laudo',
      pericia: periciaBase({ tecnico: { quesitosReclamante: '1) O agente é habitual?\nR: Sim.' } }),
    })
    irParaEtapa(/Conclusão/)

    const atalho = screen.getAllByRole('button', { name: 'Não apresentado' })[1] as HTMLButtonElement
    expect(atalho.disabled).toBe(true)
    fireEvent.click(atalho)

    expect(screen.getByLabelText<HTMLTextAreaElement>('Quesitos do Reclamante').value)
      .toBe('1) O agente é habitual?\nR: Sim.')
    // Os outros dois seguem livres.
    expect((screen.getAllByRole('button', { name: 'Não apresentado' })[0] as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getAllByRole('button', { name: 'Não apresentado' })[2] as HTMLButtonElement).disabled).toBe(false)
  })

  it('os três campos ficam na ordem do documento: Juízo, Reclamante, Reclamada', () => {
    abrirEditor({ tipo: 'laudo' })
    irParaEtapa(/Conclusão/)

    const juizo = screen.getByLabelText('Quesitos do Juízo')
    const reclamante = screen.getByLabelText('Quesitos do Reclamante')
    const reclamada = screen.getByLabelText('Quesitos da Reclamada')
    expect(antes(juizo, reclamante)).toBe(true)
    expect(antes(reclamante, reclamada)).toBe(true)
  })

  it('o texto antigo dos quesitos continua à vista no Laudo, sem perda', () => {
    abrirEditor({
      tipo: 'laudo',
      pericia: periciaBase({ tecnico: { quesitosJuizo: 'Do Juízo.', respostasQuesitos: 'Resposta salva antes da separação.' } }),
    })
    irParaEtapa(/Conclusão/)

    const legado = screen.getByLabelText<HTMLTextAreaElement>('Outras respostas aos quesitos')
    expect(legado.value).toBe('Resposta salva antes da separação.')
  })

  it('o campo do texto antigo não aparece quando não há texto antigo', () => {
    abrirEditor({ tipo: 'laudo' })
    irParaEtapa(/Conclusão/)

    expect(screen.queryByLabelText('Outras respostas aos quesitos')).toBeNull()
  })

  it('esvaziar o texto antigo não faz o campo sumir debaixo do cursor', () => {
    abrirEditor({
      tipo: 'laudo',
      pericia: periciaBase({ tecnico: { respostasQuesitos: 'Resposta antiga.' } }),
    })
    irParaEtapa(/Conclusão/)

    const legado = screen.getByLabelText<HTMLTextAreaElement>('Outras respostas aos quesitos')
    fireEvent.change(legado, { target: { value: '' } })

    expect(screen.getByLabelText<HTMLTextAreaElement>('Outras respostas aos quesitos').value).toBe('')
  })

  it('o Parecer não oferece campos por origem nem "Não apresentado"', () => {
    abrirEditor({ tipo: 'parecer' })
    irParaEtapa(/Conclusão/)

    expect(screen.queryByLabelText('Quesitos do Juízo')).toBeNull()
    expect(screen.queryByLabelText('Quesitos do Reclamante')).toBeNull()
    expect(screen.queryByLabelText('Quesitos da Reclamada')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Não apresentado' })).toBeNull()
  })
})

describe('PericiaEditor — numeração e ordem do fecho do documento', () => {
  it('Laudo completo sem quesitos nem honorários: NR-15 = 11, NR-16 = 12, Encerramento = 13', () => {
    abrirEditor({ tipo: 'laudo' })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('11. NR-15 — Conclusão e Fundamentação')).toBeDefined()
    expect(screen.getByText('12. NR-16 — Conclusão e Fundamentação')).toBeDefined()
    expect(screen.getByText('13. Encerramento')).toBeDefined()
    // Sem conteúdo, a seção de quesitos não é impressa e não tem número.
    expect(screen.getByText('Respostas aos Quesitos Técnicos')).toBeDefined()
    expect(screen.getByText('Dos Honorários Periciais')).toBeDefined()
  })

  it('só periculosidade: a conclusão da NR-16 é o item 11', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaBase({ modalidade: 'periculosidade' }) })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('11. NR-16 — Conclusão e Fundamentação')).toBeDefined()
    expect(screen.queryByText(/NR-15 — Conclusão e Fundamentação/)).toBeNull()
    expect(screen.getByText('12. Encerramento')).toBeDefined()
  })

  it('só insalubridade: a conclusão da NR-15 é o item 11 e não há conclusão da NR-16', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaBase({ modalidade: 'insalubridade' }) })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('11. NR-15 — Conclusão e Fundamentação')).toBeDefined()
    expect(screen.queryByText(/NR-16 — Conclusão e Fundamentação/)).toBeNull()
    expect(screen.getByText('12. Encerramento')).toBeDefined()
  })

  it('quesitos preenchidos ganham o item 13 e empurram o Encerramento para 14', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaBase({ tecnico: { quesitosJuizo: 'Do Juízo.' } }) })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('13. Respostas aos Quesitos Técnicos')).toBeDefined()
    expect(screen.getByText('14. Encerramento')).toBeDefined()
  })

  it('só o texto antigo dos quesitos também numera a seção, como o documento faz', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaBase({ tecnico: { respostasQuesitos: 'Resposta antiga.' } }) })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('13. Respostas aos Quesitos Técnicos')).toBeDefined()
    expect(screen.getByText('14. Encerramento')).toBeDefined()
  })

  it('honorários preenchidos viram o item seguinte ao Encerramento', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaBase({ tecnico: { honorariosPericiaisCentavos: 250_050 } }) })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('13. Encerramento')).toBeDefined()
    expect(screen.getByText('14. Dos Honorários Periciais')).toBeDefined()
  })

  it('com quesitos e honorários: 13 quesitos, 14 Encerramento, 15 Honorários', () => {
    abrirEditor({
      tipo: 'laudo',
      pericia: periciaBase({ tecnico: { quesitosReclamada: 'Da Reclamada.', honorariosPericiaisCentavos: 500_000 } }),
    })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('13. Respostas aos Quesitos Técnicos')).toBeDefined()
    expect(screen.getByText('14. Encerramento')).toBeDefined()
    expect(screen.getByText('15. Dos Honorários Periciais')).toBeDefined()
  })

  it('no papel a ordem é: conclusões, quesitos, Encerramento, Honorários', () => {
    abrirEditor({
      tipo: 'laudo',
      pericia: periciaBase({ tecnico: { quesitosJuizo: 'Do Juízo.', honorariosPericiaisCentavos: 500_000 } }),
    })
    irParaEtapa(/Conclusão/)

    const nr16 = cartao('12. NR-16 — Conclusão e Fundamentação')
    const quesitos = cartao('13. Respostas aos Quesitos Técnicos')
    const encerramento = cartao('14. Encerramento')
    const honorarios = cartao('15. Dos Honorários Periciais')
    expect(antes(nr16, quesitos)).toBe(true)
    expect(antes(quesitos, encerramento)).toBe(true)
    expect(antes(encerramento, honorarios)).toBe(true)
  })

  it('digitar o valor dos honorários numera o item e o escrever por extenso', () => {
    abrirEditor({ tipo: 'laudo' })
    irParaEtapa(/Conclusão/)

    const campo = screen.getByLabelText<HTMLInputElement>('Valor proposto dos honorários (R$)')
    fireEvent.change(campo, { target: { value: '2.500,50' } })

    expect(screen.getByText('14. Dos Honorários Periciais')).toBeDefined()
    expect(screen.getByText(/dois mil e quinhentos reais e cinquenta centavos/)).toBeDefined()
    expect(campo.value).toBe('2.500,50')

    // Apagar o valor tira a seção do documento — e o número do cartão.
    fireEvent.change(campo, { target: { value: '' } })
    expect(screen.getByText('Dos Honorários Periciais')).toBeDefined()
    expect(screen.queryByText('14. Dos Honorários Periciais')).toBeNull()
  })

  it('o valor dos honorários vai em centavos para a gravação da perícia', async () => {
    const { salvarPericia } = abrirEditor({ tipo: 'laudo' })
    irParaEtapa(/Conclusão/)

    fireEvent.change(screen.getByLabelText('Valor proposto dos honorários (R$)'), { target: { value: 'R$ 2.500,50' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }))

    await waitFor(() => expect(salvarPericia).toHaveBeenCalled())
    const ultimaGravacao = salvarPericia.mock.calls[salvarPericia.mock.calls.length - 1]?.[0]
    expect(ultimaGravacao?.tecnico.honorariosPericiaisCentavos).toBe(250_050)
  })

  it('o Parecer não tem honorários e não numera nada além do que imprime', () => {
    abrirEditor({ tipo: 'parecer' })
    irParaEtapa(/Conclusão/)

    expect(screen.queryByLabelText('Valor proposto dos honorários (R$)')).toBeNull()
    expect(screen.queryByText(/Dos Honorários Periciais/)).toBeNull()
    expect(screen.getByText('13. Encerramento')).toBeDefined()
  })

  it('o Parecer numera as respostas dos quesitos só quando há texto', () => {
    abrirEditor({ tipo: 'parecer', pericia: periciaBase({ tecnico: { respostasQuesitos: '1) Sim.' } }) })
    irParaEtapa(/Conclusão/)

    expect(screen.getByText('13. Respostas aos Quesitos Técnicos')).toBeDefined()
    expect(screen.getByText('14. Encerramento')).toBeDefined()
  })
})

describe('PericiaEditor — textos padrão do Laudo', () => {
  const padroesDoTipo = (tipo: 'parecer' | 'laudo', perfil: keyof typeof usuarios = 'perito') =>
    textosPadraoDaPericia({ modalidade: 'ambas' }, usuarios[perfil] as unknown as Usuario, empresa, tipo)

  it('o perito vê a matriz do Laudo, na voz do Perito Judicial', () => {
    abrirEditor({ tipo: 'laudo', pericia: periciaBase({ tecnico: { apresentacao: 'Texto que não é o padrão' } }) })
    irParaEtapa(/Conclusão/)

    const encerramento = caixaDoCartao('13. Encerramento').value
    expect(encerramento).toBe(padroesDoTipo('laudo').encerramento)
    expect(encerramento).toContain('O presente laudo técnico foi elaborado por este Perito Judicial')
    expect(encerramento).not.toContain('Assistente Técnico')

    irParaEtapa(/Preenchimento/)
    expect(caixaDoCartao('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA').value).toBe(padroesDoTipo('laudo').apresentacao)
  })

  it('o mesmo perito, no Parecer, continua vendo a voz do Assistente Técnico', () => {
    abrirEditor({ tipo: 'parecer' })
    irParaEtapa(/Conclusão/)

    const encerramento = caixaDoCartao('13. Encerramento').value
    expect(encerramento).toBe(padroesDoTipo('parecer').encerramento)
    expect(encerramento).toContain('O presente parecer técnico foi elaborado por este Assistente Técnico')
  })

  it('o administrador que abre o Laudo recebe a matriz do Laudo no lugar da do Parecer', () => {
    const doParecer = padroesDoTipo('parecer', 'admin')
    abrirEditor({
      tipo: 'laudo',
      perfil: 'admin',
      pericia: periciaBase({ tecnico: { encerramento: doParecer.encerramento, apresentacao: doParecer.apresentacao } }),
    })
    irParaEtapa(/Conclusão/)

    expect(caixaDoCartao('13. Encerramento').value).toBe(padroesDoTipo('laudo', 'admin').encerramento)
    irParaEtapa(/Preenchimento/)
    expect(caixaDoCartao('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA').value).toBe(padroesDoTipo('laudo', 'admin').apresentacao)
  })

  it('o texto que o administrador escreveu por conta própria não é trocado', () => {
    abrirEditor({
      tipo: 'laudo',
      perfil: 'admin',
      pericia: periciaBase({ tecnico: { encerramento: 'Encerramento redigido pelo administrador.' } }),
    })
    irParaEtapa(/Conclusão/)

    expect(caixaDoCartao('13. Encerramento').value).toBe('Encerramento redigido pelo administrador.')
  })

  it('o administrador restaura o texto padrão do tipo aberto, não o do Parecer', () => {
    abrirEditor({
      tipo: 'laudo',
      perfil: 'admin',
      pericia: periciaBase({ tecnico: { encerramento: 'Encerramento redigido pelo administrador.' } }),
    })
    irParaEtapa(/Conclusão/)

    fireEvent.click(within(cartao('13. Encerramento')).getByRole('button', { name: /Texto padrão/ }))

    expect(caixaDoCartao('13. Encerramento').value).toBe(padroesDoTipo('laudo', 'admin').encerramento)
  })
})
