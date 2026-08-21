import type { DocumentoGerado, Empresa, Usuario } from '@prisma/client'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import sharp from 'sharp'
import type { PericiaCompleta } from '../mappers.js'
import {
  AGENTE_LABEL,
  type ConteudoEsclarecimento,
  type ConteudoManifestacao,
  type ConteudoQuesitos,
  MARCA,
  ORIGEM_PONTO,
  PAPEL,
  type TecnicoJson,
  VAZIO,
  data,
  emParagrafos,
  extenso,
  mascaraCnpj,
  montarApresentacaoAgente,
  hoje,
  ATUACAO,
} from './documento-comum.js'

// ============================================================
// MÓDULO H — Exportação em formato editável (.docx).
//
// Gerado a partir dos dados, não convertido do HTML: assim o
// arquivo abre no Word com estilos nativos (títulos na navegação,
// tabelas reais, recuo de primeira linha) em vez de virar um
// emaranhado de HTML importado que o perito não consegue editar.
// ============================================================

const FONTE = 'Arial'
const CORPO = 22 // meio-pontos → 11pt
const RECUO_PRIMEIRA_LINHA = 709 // 1,25cm em twips
const LARGURA_UTIL_DXA = 9070
const RECUO_TABELA_DXA = 120
const LARGURA_TABELA_DXA = LARGURA_UTIL_DXA - RECUO_TABELA_DXA
const COLUNAS_FICHA = [2864, 6086] as const

const texto = (
  t: string,
  opcoes: {
    negrito?: boolean
    italico?: boolean
    tamanho?: number
    cor?: string
    quebraAntes?: number
  } = {},
) =>
  new TextRun({
    text: t,
    break: opcoes.quebraAntes,
    bold: opcoes.negrito,
    italics: opcoes.italico,
    color: opcoes.cor ?? MARCA.documentoTexto,
    font: FONTE,
    size: opcoes.tamanho ?? CORPO,
  })

/** Parágrafo do corpo: justificado, com recuo de primeira linha. */
const p = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: RECUO_PRIMEIRA_LINHA },
    spacing: { after: 120, line: 340 },
    children: [texto(t)],
  })

/** Parágrafo sem recuo — endereçamento, rótulos, encerramento. */
const pSemRecuo = (t: string, negrito = false, manterComProximo = false) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    keepNext: manterComProximo,
    spacing: { after: 120, line: 340 },
    children: [texto(t, { negrito })],
  })

const h1 = (t: string, centralizado = false, quebrarNoTravessao = false) => {
  const titulo = t.toUpperCase()
  const indiceTravessao = quebrarNoTravessao ? titulo.lastIndexOf(' — ') : -1
  const estilo = { negrito: true, tamanho: 36, cor: MARCA.documentoTitulo }

  return new Paragraph({
    alignment: centralizado ? AlignmentType.CENTER : AlignmentType.LEFT,
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 12,
        color: MARCA.documentoTitulo,
        space: 6,
      },
    },
    spacing: { before: 240, after: 240 },
    children:
      indiceTravessao >= 0
        ? [
            texto(titulo.slice(0, indiceTravessao), estilo),
            texto(titulo.slice(indiceTravessao + 1), { ...estilo, quebraAntes: 1 }),
          ]
        : [texto(titulo, estilo)],
  })
}

const h2 = (t: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    keepLines: true,
    spacing: { before: 320, after: 140 },
    children: [texto(t.toUpperCase(), { negrito: true, tamanho: 28, cor: MARCA.documentoSecao })],
  })

const h3 = (t: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    keepLines: true,
    spacing: { before: 220, after: 100 },
    children: [texto(t, { negrito: true, tamanho: CORPO, cor: MARCA.documentoSecao })],
  })

const blocos = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  if (!partes.length) {
    return [
      new Paragraph({
        spacing: { after: 120 },
        children: [texto(VAZIO, { italico: true })],
      }),
    ]
  }
  return partes.map(p)
}

const blocosComProximo = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  const conteudo = partes.length ? partes : [VAZIO]
  return conteudo.map(
    (parte) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: RECUO_PRIMEIRA_LINHA },
        keepNext: true,
        spacing: { after: 120, line: 340 },
        children: [texto(parte, { italico: !partes.length })],
      }),
  )
}

const borda = { style: BorderStyle.SINGLE, size: 4, color: MARCA.documentoBorda }
const BORDAS = { top: borda, bottom: borda, left: borda, right: borda }

function celula(conteudo: string, opcoes: { cabecalho?: boolean; larguraDxa?: number } = {}) {
  return new TableCell({
    borders: BORDAS,
    shading: { fill: opcoes.cabecalho ? MARCA.documentoTabela : MARCA.documentoFundo },
    width: opcoes.larguraDxa ? { size: opcoes.larguraDxa, type: WidthType.DXA } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [texto(conteudo, { negrito: opcoes.cabecalho, tamanho: 20 })],
      }),
    ],
  })
}

const tabela = (linhas: TableRow[], larguras: readonly number[] = COLUNAS_FICHA) =>
  new Table({
    width: { size: LARGURA_TABELA_DXA, type: WidthType.DXA },
    indent: { size: RECUO_TABELA_DXA, type: WidthType.DXA },
    columnWidths: larguras,
    layout: TableLayoutType.FIXED,
    rows: linhas,
  })

/** Tabela rótulo/valor, como as fichas de identificação do parecer. */
const fichaLinha = (rotulo: string, valor: string) =>
  new TableRow({
    children: [
      celula(rotulo, { cabecalho: true, larguraDxa: COLUNAS_FICHA[0] }),
      celula(valor, { larguraDxa: COLUNAS_FICHA[1] }),
    ],
  })

async function figuraDocx(
  arquivo: string,
  legenda: string | null,
  numero: number,
): Promise<(Paragraph | Table)[]> {
  const titulo = `Figura ${numero}`
  const descricao = legenda?.trim() || 'Sem legenda'

  try {
    // Carrega o armazenamento apenas quando há uma foto para embutir.
    // Assim, documentos sem imagens continuam independentes da configuração
    // completa do servidor (útil também para geração e testes offline).
    const { lerUpload } = await import('./armazenamento.js')
    const original = await lerUpload(arquivo)
    const { data: imagem, info } = await sharp(original, { failOn: 'none' })
      .rotate()
      .flatten({ background: '#FFFFFF' })
      .resize({ width: 1400, height: 1000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })

    const larguraMaxima = 540
    const alturaMaxima = 390
    const escala = Math.min(larguraMaxima / info.width, alturaMaxima / info.height, 1)
    const largura = Math.max(1, Math.round(info.width * escala))
    const altura = Math.max(1, Math.round(info.height * escala))

    const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    return [
      new Table({
        width: { size: LARGURA_TABELA_DXA, type: WidthType.DXA },
        indent: { size: RECUO_TABELA_DXA, type: WidthType.DXA },
        columnWidths: [LARGURA_TABELA_DXA],
        layout: TableLayoutType.FIXED,
        borders: { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda, insideHorizontal: semBorda, insideVertical: semBorda },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: LARGURA_TABELA_DXA, type: WidthType.DXA },
                borders: { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda },
                margins: { top: 120, bottom: 180, left: 0, right: 0 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    keepLines: true,
                    spacing: { after: 50 },
                    children: [
                      new ImageRun({
                        type: 'jpg',
                        data: imagem,
                        transformation: { width: largura, height: altura },
                        altText: { title: titulo, description: descricao, name: titulo },
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    keepLines: true,
                    spacing: { after: 0, line: 260 },
                    children: [
                      texto(`${titulo} — ${descricao}`, {
                        italico: true,
                        tamanho: 18,
                        cor: MARCA.tinta600,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ]
  } catch {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepLines: true,
        spacing: { before: 120, after: 180 },
        children: [texto(`${titulo} — imagem indisponível. ${descricao}`, { italico: true, tamanho: 18 })],
      }),
    ]
  }
}

function assinatura(perito: Usuario | null, comarca?: string | null): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 600, after: 720 },
      children: [texto(`${comarca || 'São Paulo/SP'}, ${extenso(hoje())}.`)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: MARCA.tinta800 } },
      spacing: { after: 0 },
      children: [texto(perito?.nome ?? '—', { negrito: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { after: 0 },
      children: [texto(perito?.titulo ?? '', { tamanho: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [texto(perito?.registroProfissional ?? '', { tamanho: 20 })],
    }),
  ]
}

const enderecamento = (vara?: string | null): Paragraph[] => [
  pSemRecuo('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO', true),
  pSemRecuo((vara ?? '').toUpperCase(), true),
]

const enderecamentoDoParecer = (
  vara?: string | null,
  comarca?: string | null,
  personalizado?: string | null,
): Paragraph[] => {
  const informados = emParagrafos(personalizado)
  const destino = [vara, comarca].filter(Boolean).join(' — ').toUpperCase()
  const linhas = informados.length
    ? informados
    : [`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA ${destino}`]

  return linhas.map(
    (linha, indice) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: indice === linhas.length - 1 ? 420 : 80, line: 340 },
        children: [texto(linha, { negrito: true })],
      }),
  )
}

function rodape(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: MARCA.documentoTitulo } },
        spacing: { before: 80 },
        children: [
          texto('D&R Perícia — Página ', { tamanho: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONTE, size: 16 }),
          texto(' de ', { tamanho: 16 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONTE, size: 16 }),
        ],
      }),
    ],
  })
}

function montarDocumento(filhos: (Paragraph | Table)[]): Document {
  return new Document({
    styles: { default: { document: { run: { font: FONTE, size: CORPO } } } },
    sections: [
      {
        properties: {
          page: {
            // A4 com as margens do modelo em Word do contratante.
            size: { width: 11906, height: 16838 },
            margin: { top: 1417, right: 1134, bottom: 1701, left: 1701 },
          },
        },
        footers: { default: rodape() },
        children: filhos,
      },
    ],
  })
}

// ---------------- parecer / laudo ----------------

async function docParecer(
  pericia: PericiaCompleta,
  empresas: Empresa[],
  perito: Usuario | null,
  titulo: string,
): Promise<(Paragraph | Table)[]> {
  const t = pericia.tecnico as unknown as TecnicoJson
  const porId = new Map(empresas.map((e) => [e.id, e]))
  const principal = porId.get(pericia.reclamadas.find((r) => r.principal)?.empresaId ?? '')
  const solidarias = pericia.reclamadas
    .filter((r) => !r.principal)
    .map((r) => porId.get(r.empresaId))
    .filter((e): e is Empresa => Boolean(e))

  const fotosOrdenadas = [...pericia.fotos].sort((a, b) => a.ordem - b.ordem)
  const numeroDaFoto = new Map(fotosOrdenadas.map((foto, indice) => [foto.id, indice + 1]))
  const fotosDasSecoes = async (secoes: string[]) => {
    const elementos: (Paragraph | Table)[] = []
    for (const foto of fotosOrdenadas.filter((item) => secoes.includes(item.secao))) {
      elementos.push(...(await figuraDocx(foto.arquivo, foto.legenda, numeroDaFoto.get(foto.id) ?? 0)))
    }
    return elementos
  }

  const agentes = t.agentes ?? []
  const agentesNr15 = agentes.filter((agente) => agente.tipo !== 'periculosidade')
  const agentesNr16 = agentes.filter((agente) => agente.tipo === 'periculosidade')
  const temInsalubridade = pericia.modalidade !== 'periculosidade'
  const temPericulosidade = pericia.modalidade !== 'insalubridade'
  const conclusaoNr15 =
    t.conclusaoInsalubridade?.trim() ||
    (pericia.modalidade === 'insalubridade' || !t.conclusaoPericulosidade?.trim() ? t.conclusao : '')
  const conclusaoNr16 =
    t.conclusaoPericulosidade?.trim() || (pericia.modalidade === 'periculosidade' ? t.conclusao : '')
  const encerramento = t.encerramento?.trim() || t.observacoesAdicionais

  const filhos: (Paragraph | Table)[] = [
    ...enderecamentoDoParecer(pericia.vara, pericia.comarca, t.enderecamento),
    tabela([
      fichaLinha('Processo nº', pericia.numeroProcesso),
      fichaLinha(
        'Reclamante',
        `${pericia.reclamante}${pericia.funcaoReclamante ? ` — ${pericia.funcaoReclamante}` : ''}`,
      ),
      fichaLinha(
        'Reclamada',
        principal ? `${principal.razaoSocial} — CNPJ ${mascaraCnpj(principal.cnpj)}` : '—',
      ),
      ...solidarias.map((e) => fichaLinha('Reclamada', `${e.razaoSocial} — CNPJ ${mascaraCnpj(e.cnpj)}`)),
    ]),
    h1(titulo, true),
    h3('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA'),
    ...blocos(t.apresentacao),
    h2('1. OBJETO DA PERÍCIA E DADOS CONTRATUAIS'),
    ...blocos(t.objetivoPericia),
    tabela([
      fichaLinha('Função / Cargo', pericia.funcaoReclamante || '—'),
      fichaLinha('Data de admissão', data(pericia.admissao)),
      fichaLinha('Data de desligamento', pericia.demissao ? data(pericia.demissao) : 'Contrato vigente'),
    ]),
    h2('2. DA DILIGÊNCIA TÉCNICA PERICIAL'),
    p(
      `A vistoria técnica foi realizada em ${extenso(pericia.dataVistoria)}${
        pericia.horaVistoria ? `, às ${pericia.horaVistoria}` : ''
      }, no endereço ${pericia.localVistoria || '—'}, com a presença dos participantes abaixo relacionados.`,
    ),
  ]

  if (pericia.participantes.length) {
    filhos.push(
      tabela([
        new TableRow({
          tableHeader: true,
          children: [
            celula('Nome do Participante', { cabecalho: true, larguraDxa: 2685 }),
            celula('Qualificação / Representação', { cabecalho: true, larguraDxa: 2864 }),
            celula('Atuação no Ato', { cabecalho: true, larguraDxa: 3401 }),
          ],
        }),
        ...pericia.participantes.map(
          (pt) =>
            new TableRow({
              children: [
                celula(pt.nome, { larguraDxa: 2685 }),
                celula(PAPEL[pt.papel] ?? pt.papel, { larguraDxa: 2864 }),
                celula(ATUACAO[pt.papel] ?? '—', { larguraDxa: 3401 }),
              ],
            }),
        ),
      ], [2685, 2864, 3401]),
    )
  }

  filhos.push(
    h2('3. DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA'),
    ...blocos(t.descricaoEmpresa),
    h3('3.1. Instalações Físicas'),
    ...blocos(t.descricaoAmbiente),
  )
  filhos.push(...(await fotosDasSecoes(['ambiente'])))
  filhos.push(
    h2('4. CRITÉRIOS TÉCNICOS PARA AVALIAÇÃO PERICIAL'),
    ...blocos(t.normasReferencias),
    h2('5. METODOLOGIA DE AVALIAÇÃO'),
    ...blocos(t.equipamentosAnalisados),
    h2('6. DESCRIÇÃO DO POSTO DE TRABALHO, MÁQUINAS, FERRAMENTAS E PRODUTOS'),
    h3('6.1. Características do Posto de Trabalho'),
    ...blocos(t.descricaoPostoTrabalho || t.descricaoAmbiente),
  )
  filhos.push(...(await fotosDasSecoes(['atividades'])))
  filhos.push(h3('6.2. Máquinas, Ferramentas e Equipamentos Utilizados'), ...blocos(t.maquinasFerramentas))
  filhos.push(...(await fotosDasSecoes(['equipamentos'])))
  filhos.push(
    h3('6.3. Constatações da Vistoria Pericial'),
    ...blocos(t.informacoesLevantadas),
    h3('6.4. Produtos Utilizados Habitualmente nas Atividades'),
    ...blocos(t.produtosUtilizados),
  )
  filhos.push(...(await fotosDasSecoes(['produtos'])))
  filhos.push(h2('7. HISTÓRICO LABORAL, PERÍODOS E ATIVIDADES HABITUAIS EXERCIDAS'))

  if (t.periodos?.length) {
    filhos.push(
      tabela([
        new TableRow({
          tableHeader: true,
          children: [
            celula('Função', { cabecalho: true, larguraDxa: 2506 }),
            celula('Setor', { cabecalho: true, larguraDxa: 1611 }),
            celula('Período', { cabecalho: true, larguraDxa: 2148 }),
            celula('Atividades', { cabecalho: true, larguraDxa: 2685 }),
          ],
        }),
        ...t.periodos.map(
          (pr) =>
            new TableRow({
              children: [
                celula(pr.funcao, { larguraDxa: 2506 }),
                celula(pr.setor || '—', { larguraDxa: 1611 }),
                celula(`${data(pr.inicio)} a ${pr.fim ? data(pr.fim) : 'atual'}`, { larguraDxa: 2148 }),
                celula(pr.descricaoAtividades || '—', { larguraDxa: 2685 }),
              ],
            }),
        ),
      ], [2506, 1611, 2148, 2685]),
    )
  }

  filhos.push(h3('7.1. Atividades Efetivamente Exercidas'), ...blocos(t.atividadesFuncoes))

  const adicionarAgentes = (lista: typeof agentes) => {
    if (!lista.length) {
      filhos.push(new Paragraph({ children: [texto('[Nenhum agente cadastrado]', { italico: true })] }))
      return
    }
    for (const agente of lista) {
      const apresentacao = montarApresentacaoAgente(agente)
      filhos.push(
        h3(apresentacao.titulo),
        tabela([
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: [
              celula('Propriedade', { cabecalho: true, larguraDxa: COLUNAS_FICHA[0] }),
              celula('Informação', { cabecalho: true, larguraDxa: COLUNAS_FICHA[1] }),
            ],
          }),
          ...apresentacao.linhas.map((item) => fichaLinha(item.rotulo, item.valor)),
        ]),
      )
    }
  }

  if (temInsalubridade) {
    filhos.push(h3('7.2. NR-15 — Avaliação da Exposição Ocupacional'))
    adicionarAgentes(agentesNr15)
  }
  if (temPericulosidade) {
    filhos.push(h3('7.3. NR-16 — Avaliação das Atividades e Operações Perigosas'))
    adicionarAgentes(agentesNr16)
  }
  if (t.divergenciasFaticas?.trim()) filhos.push(h3('7.4. Divergências Fáticas'), ...blocos(t.divergenciasFaticas))
  filhos.push(...(await fotosDasSecoes(['documentos'])))

  filhos.push(h2('8. DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (NR-06)'))
  let temProtecao = false
  for (const agente of agentes) {
    const apresentacao = montarApresentacaoAgente(agente)
    if (!apresentacao.protecoes.length) continue
    temProtecao = true
    filhos.push(h3(apresentacao.titulo))
    for (const protecao of apresentacao.protecoes) {
      filhos.push(
        new Paragraph({ spacing: { before: 140, after: 60 }, children: [texto(protecao.titulo, { negrito: true, tamanho: 20 })] }),
        tabela(protecao.linhas.map((item) => fichaLinha(item.rotulo, item.valor))),
      )
    }
  }
  if (!temProtecao) filhos.push(new Paragraph({ children: [texto('[Nenhum EPI associado aos agentes]', { italico: true })] }))
  filhos.push(...(await fotosDasSecoes(['epi'])))

  filhos.push(
    h2('9. DAS PROTEÇÕES COLETIVAS'),
    ...blocos(t.protecoesColetivas),
    h2('10. ANÁLISE TÉCNICA DOS AGENTES IDENTIFICADOS'),
    ...blocos(t.analiseTecnica),
  )
  if (temInsalubridade) filhos.push(h2('11. NR-15 — CONCLUSÃO E FUNDAMENTAÇÃO'), ...blocos(conclusaoNr15))
  if (temPericulosidade) filhos.push(h2('12. NR-16 — CONCLUSÃO E FUNDAMENTAÇÃO'), ...blocos(conclusaoNr16))
  if (t.respostasQuesitos?.trim()) filhos.push(h2('13. RESPOSTAS AOS QUESITOS TÉCNICOS'), ...blocos(t.respostasQuesitos))
  filhos.push(h2('14. ENCERRAMENTO'), ...blocosComProximo(encerramento))

  filhos.push(
    pSemRecuo(
      'Sendo o que se apresenta para o momento, o signatário coloca-se à disposição deste MM. Juízo para os esclarecimentos que se fizerem necessários.',
      false,
      true,
    ),
    ...assinatura(perito, pericia.comarca),
  )

  return filhos
}

// ---------------- quesitos ----------------

function docQuesitos(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
): (Paragraph | Table)[] {
  const itens = ((doc.conteudo ?? {}) as ConteudoQuesitos).quesitos ?? []

  const filhos: (Paragraph | Table)[] = [h1('Quesitos Técnicos')]

  if (pericia) {
    filhos.push(
      tabela([
        fichaLinha('Processo nº', pericia.numeroProcesso),
        fichaLinha('Vara', pericia.vara),
        fichaLinha('Reclamante', pericia.reclamante),
        fichaLinha('Reclamada', empresa?.razaoSocial ?? '—'),
      ]),
    )
  }

  filhos.push(h2('Quesitos e Respostas'))

  if (!itens.length) {
    filhos.push(new Paragraph({ children: [texto('[Nenhum quesito respondido]', { italico: true })] }))
  } else {
    itens.forEach((q, i) => {
      filhos.push(pSemRecuo(`${i + 1}. ${q.pergunta}`, true))
      filhos.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: RECUO_PRIMEIRA_LINHA },
          spacing: { after: 200, line: 340 },
          children: [
            texto('Resposta: ', { negrito: true }),
            texto(q.resposta || '[resposta não preenchida]'),
          ],
        }),
      )
    })
  }

  filhos.push(...assinatura(perito, pericia?.comarca))
  return filhos
}

// ---------------- manifestação / impugnação ----------------

function docManifestacao(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
): (Paragraph | Table)[] {
  const c = (doc.conteudo ?? {}) as ConteudoManifestacao
  const ehConcordancia = c.posicionamento === 'concordancia'

  const filhos: (Paragraph | Table)[] = [h1(doc.titulo, false, !ehConcordancia)]

  if (pericia) {
    filhos.push(
      ...enderecamento(pericia.vara),
      tabela([
        fichaLinha('Processo nº', pericia.numeroProcesso),
        fichaLinha('Reclamante', pericia.reclamante),
        fichaLinha('Reclamada', empresa?.razaoSocial ?? '—'),
        fichaLinha('Agente objeto', AGENTE_LABEL[c.agente ?? ''] ?? c.agente ?? '—'),
      ]),
    )
  }

  filhos.push(
    h2('I — Fundamentação Técnica'),
    ...blocos(c.fundamentacao),
    h2(`II — ${ehConcordancia ? 'Razões da Concordância' : 'Razões da Impugnação'}`),
  )

  if (c.blocos?.length) {
    c.blocos.forEach((b, i) => {
      filhos.push(h3(`${i + 1}. ${b.titulo}`), ...blocos(b.conteudo))
    })
  } else {
    filhos.push(
      new Paragraph({ children: [texto('[Nenhum argumento selecionado]', { italico: true })] }),
    )
  }

  filhos.push(h2('III — Requerimento'), ...blocos(c.encerramento), ...assinatura(perito, pericia?.comarca))
  return filhos
}

// ---------------- esclarecimentos ----------------

function docEsclarecimento(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
): (Paragraph | Table)[] {
  const c = (doc.conteudo ?? {}) as ConteudoEsclarecimento

  const filhos: (Paragraph | Table)[] = [h1('Esclarecimentos Técnicos')]

  if (pericia) {
    const linhas = [
      fichaLinha('Processo nº', pericia.numeroProcesso),
      fichaLinha('Reclamante', pericia.reclamante),
      fichaLinha('Reclamada', empresa?.razaoSocial ?? '—'),
      fichaLinha('Agente objeto', AGENTE_LABEL[c.agente ?? ''] ?? c.agente ?? '—'),
    ]
    if (c.referencia) linhas.push(fichaLinha('Referência', c.referencia))
    filhos.push(...enderecamento(pericia.vara), tabela(linhas))
  }

  filhos.push(h2('I — Da Intimação'), ...blocos(c.introducao), h2('II — Dos Esclarecimentos Prestados'))

  if (c.pontos?.length) {
    c.pontos.forEach((pt, i) => {
      filhos.push(
        h3(`${i + 1}. Questionamento ${ORIGEM_PONTO[pt.origem] ?? pt.origem}`),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: RECUO_PRIMEIRA_LINHA },
          spacing: { after: 120, line: 340 },
          children: [texto(pt.questionamento || '[questionamento não informado]', { italico: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: RECUO_PRIMEIRA_LINHA },
          spacing: { after: 200, line: 340 },
          children: [
            texto('Esclarecimento: ', { negrito: true }),
            texto(pt.resposta || '[esclarecimento não preenchido]'),
          ],
        }),
      )
    })
  } else {
    filhos.push(new Paragraph({ children: [texto('[Nenhum ponto informado]', { italico: true })] }))
  }

  filhos.push(h2('III — Conclusão'), ...blocos(c.conclusao), ...assinatura(perito, pericia?.comarca))
  return filhos
}

// ---------------- despacho por tipo ----------------

export async function gerarDocx(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresas: Empresa[],
  perito: Usuario | null,
): Promise<Buffer> {
  const principal =
    empresas.find((e) => e.id === pericia?.reclamadas.find((r) => r.principal)?.empresaId) ?? null

  let filhos: (Paragraph | Table)[]

  switch (doc.tipo) {
    case 'parecer':
    case 'laudo':
      filhos = pericia
        ? await docParecer(pericia, empresas, perito, doc.titulo)
        : [h1(doc.titulo), p('[A perícia vinculada não existe mais.]')]
      break
    case 'quesitos':
      filhos = docQuesitos(doc, pericia, principal, perito)
      break
    case 'manifestacao':
    case 'impugnacao':
      filhos = docManifestacao(doc, pericia, principal, perito)
      break
    case 'esclarecimento':
      filhos = docEsclarecimento(doc, pericia, principal, perito)
      break
  }

  return Packer.toBuffer(montarDocumento(filhos))
}
