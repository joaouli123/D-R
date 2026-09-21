import type { DocumentoGerado } from '@prisma/client'
import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'

import type { PericiaCompleta } from '../mappers.js'
import { agentesNr15DeRegressao, anexosNr15DeRegressao } from './conclusoes-nr15.fixture.js'
import { empresa, periciaAmbasSoNr16, periciaDeTeste, periciaSoPericulosidade, perito } from './parecer.fixture.js'

// Sem disco: `lerUpload` devolve um buffer vazio, o sharp falha e o
// renderizador cai no ramo "imagem indisponível" — que ainda imprime a
// legenda "Fotografia N", que é o que este teste mede.
// A única exceção é 'assinatura.png', a assinatura manuscrita do perito.
vi.mock('./armazenamento.js', async () => {
  const { default: sharp } = await import('sharp')
  const assinatura = await sharp({
    create: { width: 600, height: 200, channels: 4, background: { r: 20, g: 30, b: 90, alpha: 1 } },
  }).png().toBuffer()
  return {
    comoDataUri: async () => null,
    lerUpload: async (arquivo: string) => (arquivo === 'assinatura.png' ? assinatura : Buffer.alloc(0)),
  }
})

const { gerarDocx } = await import('./docx.js')

// ============================================================
// O DOCX é o renderizador que ninguém enxerga antes de o cliente abrir o
// arquivo no Word — e é o mais fácil de dessincronizar do PDF, porque a
// numeração das seções vem de um contador que roda na ordem dos pushes.
// Espelha server/src/services/documento-parecer.test.ts.
// ============================================================

const documento = {
  id: 'doc-1',
  tipo: 'parecer',
  titulo: 'Parecer Técnico da Reclamada — Insalubridade',
  periciaId: 'per-1',
} as DocumentoGerado

/** O word/document.xml do DOCX gerado. */
async function xmlDoDocx(
  pericia: PericiaCompleta = periciaDeTeste(),
  quemAssina: typeof perito = perito,
  doc: DocumentoGerado = documento,
): Promise<string> {
  const buffer = await gerarDocx(doc, pericia, [empresa], quemAssina)
  const zip = await JSZip.loadAsync(buffer)
  return zip.file('word/document.xml')!.async('string')
}

/** Texto corrido do DOCX: só a concatenação dos <w:t> de word/document.xml. */
async function textoDoDocx(
  pericia: PericiaCompleta = periciaDeTeste(),
  doc: DocumentoGerado = documento,
): Promise<string> {
  const xml = await xmlDoDocx(pericia, perito, doc)
  return (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
    .map((n) => n.replace(/<[^>]+>/g, ''))
    .join(' ')
}

describe('parecer em DOCX', () => {
  it('separa os quesitos do Laudo por origem, omite os grupos vazios e mantém o texto antigo no fim', async () => {
    const pericia = periciaDeTeste()
    Object.assign(pericia.tecnico as object, {
      respostasQuesitos: 'Resposta legada do parecer.',
      quesitosJuizo: 'Pergunta e resposta do juízo.',
      quesitosReclamante: '',
      quesitosReclamada: 'Não apresentado',
    })
    const laudo = { ...documento, tipo: 'laudo', titulo: 'Laudo Técnico Pericial' } as DocumentoGerado

    const xml = await xmlDoDocx(pericia, perito, laudo)
    const texto = (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
      .map((no) => no.replace(/<[^>]+>/g, ''))
      .join(' ')

    expect(texto).toContain('RESPOSTAS AOS QUESITOS TÉCNICOS')
    expect(texto).toContain('Quesitos do Juízo')
    expect(texto).toContain('Quesitos da Reclamada')
    expect(texto).not.toContain('Quesitos do Reclamante')
    expect(texto).toContain('Outras respostas aos quesitos')
    expect(texto).toContain('Resposta legada do parecer.')
    expect(texto.indexOf('Resposta legada do parecer.')).toBeGreaterThan(texto.indexOf('Quesitos da Reclamada'))
  })

  it('não deixa caracteres de controle no XML: o Word recusa abrir o arquivo com eles', async () => {
    const pericia = periciaDeTeste()
    // Texto colado de PDF costuma trazer quebra de página (\f) e tabulação vertical (\v).
    Object.assign(pericia.tecnico as object, {
      encerramento: 'Texto colado do PDF\fcom quebra de página\vno meio\x00 e nulo.\n\nSegundo parágrafo.',
    })

    const xml = await xmlDoDocx(pericia)

    expect(xml).not.toMatch(/[\x00-\x08\x0b\x0c\x0e-\x1f]/)
    expect(xml).toContain('Texto colado do PDF com quebra de página no meio e nulo.')
  })

  it('imprime o texto antigo dos quesitos sozinho no Laudo, sem subtítulo', async () => {
    const pericia = periciaDeTeste()
    Object.assign(pericia.tecnico as object, {
      respostasQuesitos: 'Resposta legada do parecer.',
      quesitosJuizo: '',
      quesitosReclamante: '',
      quesitosReclamada: '',
    })
    const laudo = { ...documento, tipo: 'laudo', titulo: 'Laudo Técnico Pericial' } as DocumentoGerado

    const xml = await xmlDoDocx(pericia, perito, laudo)
    const texto = (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
      .map((no) => no.replace(/<[^>]+>/g, ''))
      .join(' ')

    expect(texto).toContain('RESPOSTAS AOS QUESITOS TÉCNICOS')
    expect(texto).toContain('Resposta legada do parecer.')
    expect(texto).not.toContain('Outras respostas aos quesitos')
  })

  it('desce o "Diante do exposto…" para depois dos honorários, logo acima da assinatura', async () => {
    const pericia = periciaDeTeste()
    Object.assign(pericia.tecnico as object, {
      encerramento:
        'Primeiro parágrafo do encerramento.\n\nSegundo parágrafo do encerramento.\n\nDiante do exposto, o signatário coloca-se à disposição dos envolvidos.',
      honorariosPericiaisCentavos: 500_000,
    })
    const laudo = { ...documento, tipo: 'laudo', titulo: 'Laudo Técnico Pericial' } as DocumentoGerado

    const xml = await xmlDoDocx(pericia, perito, laudo)
    const texto = (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
      .map((no) => no.replace(/<[^>]+>/g, ''))
      .join(' ')
    const ordem = [
      texto.indexOf('ENCERRAMENTO'),
      texto.indexOf('Segundo parágrafo do encerramento.'),
      texto.indexOf('DOS HONORÁRIOS PERICIAIS'),
      texto.indexOf('Diante do exposto'),
      texto.lastIndexOf(perito.nome),
    ]

    expect(ordem.every((posicao) => posicao > -1)).toBe(true)
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
    expect(texto.match(/Diante do exposto/g)).toHaveLength(1)
  })

  it('sem honorários, o "Diante do exposto…" continua fechando o encerramento', async () => {
    const pericia = periciaDeTeste()
    Object.assign(pericia.tecnico as object, {
      encerramento: 'Primeiro parágrafo do encerramento.\n\nDiante do exposto, o signatário coloca-se à disposição dos envolvidos.',
      honorariosPericiaisCentavos: undefined,
    })
    const laudo = { ...documento, tipo: 'laudo', titulo: 'Laudo Técnico Pericial' } as DocumentoGerado

    const xml = await xmlDoDocx(pericia, perito, laudo)
    const texto = (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
      .map((no) => no.replace(/<[^>]+>/g, ''))
      .join(' ')

    expect(texto).not.toContain('DOS HONORÁRIOS PERICIAIS')
    expect(texto.indexOf('Diante do exposto')).toBeGreaterThan(texto.indexOf('Primeiro parágrafo do encerramento.'))
    expect(texto.lastIndexOf(perito.nome)).toBeGreaterThan(texto.indexOf('Diante do exposto'))
    expect(texto.match(/Diante do exposto/g)).toHaveLength(1)
  })

  it('imprime os honorários do Laudo depois do encerramento e antes da assinatura', async () => {
    const pericia = periciaDeTeste()
    Object.assign(pericia.tecnico as object, { honorariosPericiaisCentavos: 500_000 })
    const laudo = { ...documento, tipo: 'laudo', titulo: 'Laudo Técnico Pericial' } as DocumentoGerado

    const xml = await xmlDoDocx(pericia, perito, laudo)
    const texto = (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
      .map((no) => no.replace(/<[^>]+>/g, ''))
      .join(' ')
    const encerramento = texto.indexOf('ENCERRAMENTO')
    const honorarios = texto.indexOf('DOS HONORÁRIOS PERICIAIS')
    const assinatura = texto.indexOf(perito.nome)

    expect(honorarios).toBeGreaterThan(encerramento)
    expect(assinatura).toBeGreaterThan(honorarios)
    expect(texto).toContain('R$ 5.000,00 (cinco mil reais)')
    expect(texto).not.toContain('[VALOR]')
  })

  const LEGENDA_AGENTE = 'Visor do equipamento na avaliação química'
  const fotoDoAgente = (agenteId: string, id = 'foto-agente', legenda = LEGENDA_AGENTE) => ({
    id, periciaId: 'per-1', secao: 'documentos', agenteId,
    ordem: 3, arquivo: `${id}.jpg`, legenda,
  }) as never
  const laudo = { ...documento, tipo: 'laudo', titulo: 'Laudo Técnico Pericial' } as DocumentoGerado
  // No DOCX, entre o número e a legenda vem o aviso "imagem indisponível" (o
  // disco não existe nestes testes); por isso a legenda é lida logo depois do número.
  const legendaDaFoto = (texto: string, numero: number) =>
    texto.split(`Fotografia ${numero} – `)[1]?.slice(0, 120) ?? ''

  it('no Laudo, coloca a foto vinculada depois da tabela do respectivo agente sem duplicação', async () => {
    const pericia = periciaDeTeste()
    pericia.fotos.push(fotoDoAgente('agn-1'))

    const texto = await textoDoDocx(pericia, laudo)
    const quadro = texto.indexOf('10.1.1. Óleos minerais')
    const foto = texto.indexOf(LEGENDA_AGENTE)

    expect(foto).toBeGreaterThan(quadro)
    expect(texto.split(LEGENDA_AGENTE)).toHaveLength(2)
  })

  it('no Parecer, não imprime a foto vinculada a agente nem lhe reserva número', async () => {
    const pericia = periciaDeTeste()
    pericia.fotos.push(fotoDoAgente('agn-1'))

    const texto = await textoDoDocx(pericia)

    expect(texto).not.toContain(LEGENDA_AGENTE)
    expect(texto).toContain('Fotografia 2')
    expect(texto).not.toContain('Fotografia 3')
  })

  it('numera a foto do agente depois das fotos das seções, mesmo gravada em "documentos"', async () => {
    const pericia = periciaDeTeste()
    pericia.fotos.push(
      fotoDoAgente('agn-1'),
      { id: 'fot-produto', periciaId: 'per-1', secao: 'produtos', ordem: 1, arquivo: 'fot-produto.jpg', legenda: 'Rótulo do produto' } as never,
    )

    const texto = await textoDoDocx(pericia, laudo)

    expect(legendaDaFoto(texto, 3)).toContain('Rótulo do produto')
    expect(legendaDaFoto(texto, 4)).toContain(LEGENDA_AGENTE)
  })

  it('não gasta número com foto de agente que já não está no laudo', async () => {
    const pericia = periciaDeTeste()
    pericia.fotos.push(
      fotoDoAgente('agn-removido', 'foto-orfa', 'Foto de agente excluído'),
      fotoDoAgente('agn-1'),
    )

    const texto = await textoDoDocx(pericia, laudo)

    expect(texto).not.toContain('Foto de agente excluído')
    expect(legendaDaFoto(texto, 3)).toContain(LEGENDA_AGENTE)
    expect(texto).not.toContain('Fotografia 4')
  })


  it('imprime o quadro compacto da varredura normativa', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { varreduraNr15: unknown[] }).varreduraNr15 = [
      { anexoId: 'ANEXO_01', status: 'exposicao_identificada' },
      { anexoId: 'ANEXO_02', status: 'sem_exposicao' },
    ]

    expect(await textoDoDocx(pericia)).toContain('Resultado da varredura NR-15')
  })

  it('abre a seção 3 pelo 3.1, sem texto de nível 1', async () => {
    const texto = await textoDoDocx()

    // Espelha o mesmo caso em documento-parecer.test.ts: se um dos dois
    // renderizadores voltar a imprimir o campo antigo, o Word e o PDF
    // divergem na mesma perícia.
    expect(texto).not.toContain('A Reclamada atua no ramo de usinagem.')
    expect(texto.indexOf('3. DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA')).toBeLessThan(
      texto.indexOf('3.1. Instalações Físicas'),
    )
  })

  it('abre a seção 7 pelo 7.1, antes da tabela de períodos', async () => {
    const texto = await textoDoDocx()

    expect(texto).toContain('7.1. Atividades Efetivamente Exercidas')
    expect(texto.indexOf('7.1. Atividades Efetivamente Exercidas')).toBeLessThan(
      texto.indexOf('Auxiliar de Produção'),
    )
  })

  it('mantém o 7.1 quando a perícia não tem períodos cadastrados', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { periodos: unknown[] }).periodos = []

    const texto = await textoDoDocx(pericia)

    // Se o h3 fosse para dentro do `if (t.periodos?.length)`, o 7.1 sumiria e
    // a NR-15 assumiria o número dele — o DOCX passaria a numerar diferente
    // do PDF e da prévia no mesmo processo.
    expect(texto).toContain('7.1. Atividades Efetivamente Exercidas')
    expect(texto).toContain('7.2. NR-15')
  })

  it('numera as fotografias na sequência em que elas saem no documento', async () => {
    const texto = await textoDoDocx()

    expect(texto).toContain('Fotografia 1')
    expect(texto).toContain('Fotografia 2')
    expect(texto.indexOf('Fotografia 1')).toBeLessThan(texto.indexOf('Fotografia 2'))
    expect(texto.indexOf('Vista geral do galpão')).toBeLessThan(
      texto.indexOf('EPI reconhecido na diligência'),
    )
  })

  it('não imprime a linha "Conclusão:" quando a avaliação está sem texto', async () => {
    expect(await textoDoDocx()).not.toContain('Conclusão:')
  })

  it('imprime a conclusão só na tabela do item 10, não na do 7.2.x', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { agentes: { observacao?: string }[] }).agentes[0]!.observacao =
      'A exposição é habitual e permanente.'

    const xml = await xmlDoDocx(pericia)
    const tabelas = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? []
    const comConclusao = tabelas.filter((t) => t.includes('A exposição é habitual e permanente.'))

    // Uma tabela só: o item 7 descreve o que foi avaliado e o item 10 conclui.
    // Nos dois, a conclusão saía repetida e antecipava o desfecho (perito,
    // 18/09). Na tabela que sobra ela é a última linha: uma célula na largura
    // toda, fundo cinza-azulado e "Conclusão:" em negrito.
    expect(comConclusao).toHaveLength(1)
    for (const tabela of comConclusao) {
      const linhas = tabela.match(/<w:tr>[\s\S]*?<\/w:tr>|<w:tr [\s\S]*?<\/w:tr>/g) ?? []
      const ultima = linhas[linhas.length - 1]!
      expect(ultima).toContain('A exposição é habitual e permanente.')
      expect(ultima).toContain('<w:gridSpan w:val="2"/>')
      expect(ultima).toMatch(/w:fill="EEF1F5"/)
      expect(ultima).toMatch(/<w:b\/>[\s\S]*?Conclusão: </)
    }
  })

  it('mantém a conclusão dos Anexos 1 a 14 e 13-A somente no item 10', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { agentes: unknown[] }).agentes = agentesNr15DeRegressao()

    const texto = await textoDoDocx(pericia)
    const inicioItem10 = texto.indexOf('10.1. NR-15')

    expect(inicioItem10).toBeGreaterThan(0)
    for (const anexo of anexosNr15DeRegressao) {
      const conclusao = `Conclusão exclusiva ${anexo}.`
      expect(texto.split(conclusao)).toHaveLength(2)
      expect(texto.indexOf(conclusao)).toBeGreaterThan(inicioItem10)
    }
  })

  it('tira da seção de EPIs os agentes que a modalidade excluiu', async () => {
    const texto = await textoDoDocx(periciaSoPericulosidade())

    expect(texto).toContain('Inflamáveis líquidos')
    expect(texto).toContain('Nitrílica NL-30')
    expect(texto).not.toContain('Ruído contínuo herdado')
    expect(texto).not.toContain('Plug 3M 1100')
  })

  it('transcreve no 7.3.2 o risco alegado pela parte', async () => {
    const pericia = periciaDeTeste()
    // Com as duas modalidades a NR-16 é a terceira subseção do item 7 — é o
    // 7.3 do modelo que o perito mandou.
    ;(pericia as { modalidade: string }).modalidade = 'ambas'
    Object.assign(pericia.tecnico as object, {
      criterioAvaliacaoPericulosidade: 'Critério qualitativo.',
      riscoAlegadoPericulosidade: 'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
    })

    const texto = await textoDoDocx(pericia)

    const posicoes = [
      '7.3.1. Critério de Avaliação',
      '7.3.2. Risco de Periculosidade Alegado pela Parte Reclamante',
      'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
    ].map((trecho) => texto.indexOf(trecho))
    expect(posicoes.every((posicao) => posicao >= 0)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('fecha o item 10 com o quadro Sem Risco, e o rol dos anexos dentro dele', async () => {
    const pericia = periciaSoPericulosidade()
    ;(pericia.tecnico as unknown as { agentes: unknown[] }).agentes = [{
      id: 'nr16-sem-risco',
      nome: 'Sem risco',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      resultadoPericulosidade: 'nao_caracterizada',
    }]

    const texto = await textoDoDocx(pericia)

    expect(texto).toContain('10.1.1. Sem Risco – Avaliação, Resultado e Conclusão')
    expect(texto).toContain('Condição / Atividades')
    // No DOCX cada linha da célula é um parágrafo próprio; o texto corrido do
    // teste junta os <w:t> com espaço, então o que se mede é a presença de
    // cada item do rol.
    expect(texto).toContain('• Anexo 1 – Explosivos;')
    expect(texto).toContain('• Anexo (*) – Radiações ionizantes ou substâncias radioativas;')
  })

  it('numera o grupo do item 10 pela modalidade, não pelo tamanho da lista', async () => {
    // Espelha o mesmo caso em documento-parecer.test.ts e em
    // DocumentoPreview.test.tsx: os três têm de dar o mesmo número.
    const texto = await textoDoDocx(periciaAmbasSoNr16())

    expect(texto).toContain('7.3. NR-16')
    expect(texto).toContain('10.2. NR-16')
    expect(texto).not.toContain('10.1. NR-16')
    expect(texto).toContain('10.2.1. Inflamáveis – Avaliação, Resultado e Conclusão')
  })

  it('não repete o rol dos anexos como subitem do item 10', async () => {
    const texto = await textoDoDocx(periciaSoPericulosidade())

    expect(texto).toContain('10.1.1. Inflamáveis – Avaliação, Resultado e Conclusão')
    expect(texto).not.toContain('10.1.1. Explosivos;')
    // O rol dos sete anexos cabe no quadro da varredura, no item 7 — não no 10.
    const item10 = texto.slice(texto.indexOf('10.1. NR-16'))
    expect(item10).not.toContain('Radiações ionizantes ou substâncias radioativas')
  })

  it('imprime o quadro da varredura NR-16 a partir das avaliações, sem afirmar a exposição', async () => {
    const texto = await textoDoDocx(periciaSoPericulosidade())
    const item7 = texto.slice(0, texto.indexOf('10.1. NR-16'))

    expect(item7).toContain('Resultado da varredura NR-16')
    expect(item7).toContain('Avaliação da suposta exposição')
    expect(item7).toContain('Radiações ionizantes ou substâncias radioativas')
    expect(texto).not.toMatch(/Exposição identificada/i)
  })

  it('mantém em negrito, no Word, a linha de resultado do quadro do item 10', async () => {
    // A prévia e o PDF marcam a célula com `destaque` em peso 700
    // (.resultado-negativo). O DOCX era o único dos três que imprimia a linha
    // da conclusão com o mesmo peso do resto — e o extrator de texto dos
    // outros testes joga a formatação fora, então ninguém via.
    const buffer = await gerarDocx(documento, periciaSoPericulosidade(), [empresa], perito)
    const zip = await JSZip.loadAsync(buffer)
    const xml = await zip.file('word/document.xml')!.async('string')

    const celulas = xml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []
    const conclusiva = celulas.find((celula) => celula.includes('Periculosidade caracterizada'))
    expect(conclusiva).toBeDefined()
    expect(conclusiva).toContain('<w:b/>')

    // E o negrito é do destaque, não de todas as células de valor: a linha do
    // levantamento ao lado continua em peso normal.
    const semDestaque = celulas.find((celula) => celula.includes('Pátio de abastecimento'))
    expect(semDestaque).toBeDefined()
    expect(semDestaque).not.toContain('<w:b/>')
  })

  it('não imprime mais o texto livre da análise técnica no item 10', async () => {
    // Espelha o mesmo caso em documento-parecer.test.ts.
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { analiseTecnica: string }).analiseTecnica =
      'Texto exclusivo de teste da análise técnica.'

    const texto = await textoDoDocx(pericia)

    expect(texto).toContain('10. ANÁLISE TÉCNICA DOS AGENTES IDENTIFICADOS')
    expect(texto).not.toContain('Texto exclusivo de teste da análise técnica.')
  })

  it('abre a capa pela identificação das partes', async () => {
    const texto = await textoDoDocx()

    const posicoes = ['EXCELENTÍSSIMO', 'IDENTIFICAÇÃO DAS PARTES', 'Processo nº'].map((t) =>
      texto.indexOf(t),
    )
    expect(posicoes.every((p) => p >= 0)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('desce a identificação na capa e começa o item 1 na folha 2', async () => {
    const xml = await xmlDoDocx()
    const paragrafos = xml.match(/<w:p>[\s\S]*?<\/w:p>|<w:p [\s\S]*?<\/w:p>/g) ?? []

    const identificacao = paragrafos.find((p) => p.includes('IDENTIFICAÇÃO DAS PARTES'))!
    const antes = Number(identificacao.match(/w:before="(\d+)"/)?.[1])
    // A capa desta fixture é curta: o espaço bate no teto (~6,2cm).
    expect(antes).toBeGreaterThan(2000)

    const item1 = paragrafos.find((p) => p.includes('1. OBJETO DA PERÍCIA E DADOS CONTRATUAIS'))!
    expect(item1).toContain('<w:pageBreakBefore/>')
    // Só o item 1 abre folha nova.
    expect(paragrafos.filter((p) => p.includes('<w:pageBreakBefore/>'))).toHaveLength(1)
  })

  it('encolhe o espaço da capa quando a apresentação é longa', async () => {
    const pericia = periciaDeTeste()
    ;(pericia.tecnico as unknown as { apresentacao: string }).apresentacao =
      Array.from({ length: 6 }, () => 'Texto longo de apresentação e qualificação técnica do perito. '.repeat(5)).join('\n')

    const xml = await xmlDoDocx(pericia)
    const identificacao = (xml.match(/<w:p>[\s\S]*?<\/w:p>|<w:p [\s\S]*?<\/w:p>/g) ?? [])
      .find((p) => p.includes('IDENTIFICAÇÃO DAS PARTES'))!
    expect(Number(identificacao.match(/w:before="(\d+)"/)?.[1])).toBeLessThan(1000)
  })

  it('prende a data à assinatura e centraliza a linha', async () => {
    const xml = await xmlDoDocx()
    const paragrafos = xml.match(/<w:p>[\s\S]*?<\/w:p>|<w:p [\s\S]*?<\/w:p>/g) ?? []
    const indiceNome = paragrafos.findIndex((p) => p.includes('Dinoel Ribeiro da Silva') && p.includes('<w:pBdr>'))
    const nome = paragrafos[indiceNome]!
    // Sem assinatura manuscrita, a data vem logo antes da linha.
    const data = paragrafos[indiceNome - 1]!
    expect(data).toMatch(/, \d{1,2} de [a-zç]+ de \d{4}\./)

    expect(data).toContain('<w:keepNext/>')
    // Parecer: mais ar acima da data (pedido do perito).
    expect(Number(data.match(/w:before="(\d+)"/)?.[1])).toBeGreaterThanOrEqual(720)
    expect(nome).toContain('<w:keepNext/>')
    expect(nome).toMatch(/<w:ind w:left="2435" w:right="2435"\/>/)
    expect(xml).not.toContain('Assinatura de Dinoel')
  })

  it('embute a assinatura manuscrita acima da linha', async () => {
    const xml = await xmlDoDocx(periciaDeTeste(), { ...perito, assinaturaArquivo: 'assinatura.png' })
    const paragrafos = xml.match(/<w:p>[\s\S]*?<\/w:p>|<w:p [\s\S]*?<\/w:p>/g) ?? []
    const indiceImagem = paragrafos.findIndex((p) => p.includes('Assinatura de Dinoel Ribeiro da Silva'))

    expect(indiceImagem).toBeGreaterThan(0)
    expect(paragrafos[indiceImagem]).toContain('<w:keepNext/>')
    // 600x200 na caixa de 220x64 → 192x64 px = 1828800x609600 EMU.
    expect(paragrafos[indiceImagem]).toContain('cx="1828800" cy="609600"')
    // A linha com o nome vem logo depois da imagem.
    expect(paragrafos[indiceImagem + 1]).toContain('Dinoel Ribeiro da Silva')
    expect(paragrafos[indiceImagem + 1]).toContain('<w:pBdr>')
  })

  it('leva o último parágrafo da impugnação junto quando o fecho desce de folha', async () => {
    // Espelha o `break-before: avoid` do `.fecho` no PDF: com a assinatura
    // manuscrita a impugnação passa de uma folha, e a folha 2 não pode ter
    // só a data e a assinatura.
    const impugnacao = {
      id: 'doc-2',
      tipo: 'impugnacao',
      titulo: 'Impugnação ao Laudo Pericial — Ruído',
      periciaId: 'per-1',
      conteudo: {
        posicionamento: 'impugnacao',
        agente: 'ruido',
        fundamentacao: 'Fundamentação.',
        blocos: [],
        encerramento: 'Pedido intermediário.\n\nAnte o exposto, requer o acolhimento.',
      },
    } as unknown as DocumentoGerado
    const xml = await xmlDoDocx(periciaDeTeste(), perito, impugnacao)
    const paragrafos = xml.match(/<w:p>[\s\S]*?<\/w:p>|<w:p [\s\S]*?<\/w:p>/g) ?? []
    const intermediario = paragrafos.find((p) => p.includes('Pedido intermediário.'))!
    const ultimo = paragrafos.find((p) => p.includes('Ante o exposto, requer o acolhimento.'))!

    expect(ultimo).toContain('<w:keepNext/>')
    expect(intermediario).not.toContain('<w:keepNext/>')
  })

  it('usa o mesmo rodapé do PDF, com a paginação na margem direita', async () => {
    const zip = await JSZip.loadAsync(await gerarDocx(documento, periciaDeTeste(), [empresa], perito))
    const arquivo = Object.keys(zip.files).find((nome) => /^word\/footer\d*\.xml$/.test(nome))!
    const xml = await zip.file(arquivo)!.async('string')

    expect(xml).toContain('© D&amp;R Perícia Trabalhista — Propriedade intelectual exclusiva e protegida.')
    expect(xml).toMatch(/<w:tab w:val="right" w:pos="9070"\/>/)
    expect(xml).toContain('Página ')
    expect(xml).not.toContain('D&amp;R Perícia — Página')
  })
})
