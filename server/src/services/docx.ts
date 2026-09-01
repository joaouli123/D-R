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
import { LOGO_OFICIAL_ALT, LOGO_OFICIAL_JPEG } from './logo-oficial.js'
import {
  AGENTE_LABEL,
  type ConteudoEsclarecimento,
  type ConteudoManifestacao,
  type ConteudoQuesitos,
  MARCA,
  ORIGEM_PONTO,
  PAPEL,
  type TecnicoJson,
  atividadesDoPeriodo,
  data,
  dadosAssinaturaDocumento,
  emParagrafos,
  extenso,
  intervaloDoPeriodo,
  mascaraCnpj,
  mascaraCpf,
  montarApresentacaoAgente,
  numeradorDeSecoes,
  objetivoAutomaticoDocumento,
  periodoAvaliacaoDocumento,
  horarioDaVistoriaDocumento,
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

const h4 = (t: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    keepNext: true,
    keepLines: true,
    spacing: { before: 180, after: 80 },
    children: [texto(t, { negrito: true, tamanho: 20, cor: MARCA.documentoSecao })],
  })

const blocos = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  if (!partes.length) return []
  return partes.map(p)
}

const blocosEstruturados = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  if (!partes.length) return blocos(t)
  return partes.map((parte) => {
    const titulo = parte.trim().match(/^([45]\.\d+(?:\.\d+)?\.)\s+(.+)$/s)
    if (!titulo) return p(parte)
    const prefixo = titulo[1] ?? ''
    const textoTitulo = titulo[2] ?? ''
    const nivel = prefixo.split('.').filter(Boolean).length
    return nivel >= 3 ? h4(`${prefixo} ${textoTitulo}`) : h3(`${prefixo} ${textoTitulo}`)
  })
}

const blocosComProximo = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  return partes.map(
    (parte) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: RECUO_PRIMEIRA_LINHA },
        keepNext: true,
        spacing: { after: 120, line: 340 },
        children: [texto(parte)],
      }),
  )
}

const borda = { style: BorderStyle.SINGLE, size: 4, color: MARCA.documentoBorda }
const BORDAS = { top: borda, bottom: borda, left: borda, right: borda }

function celula(
  conteudo: string,
  opcoes: {
    cabecalho?: boolean
    larguraDxa?: number
    columnSpan?: number
    paragrafos?: Paragraph[]
    manterComProxima?: boolean
  } = {},
) {
  return new TableCell({
    borders: BORDAS,
    shading: { fill: opcoes.cabecalho ? MARCA.documentoTabela : MARCA.documentoFundo },
    width: opcoes.larguraDxa ? { size: opcoes.larguraDxa, type: WidthType.DXA } : undefined,
    columnSpan: opcoes.columnSpan,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: opcoes.paragrafos ?? [
      new Paragraph({
        keepNext: opcoes.manterComProxima,
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
const fichaLinha = (rotulo: string, valor: string, manterComProxima = false) =>
  new TableRow({
    cantSplit: true,
    children: [
      celula(rotulo, { cabecalho: true, larguraDxa: COLUNAS_FICHA[0], manterComProxima }),
      celula(valor, { larguraDxa: COLUNAS_FICHA[1], manterComProxima }),
    ],
  })

async function figuraDocx(
  arquivo: string,
  legenda: string | null,
  numero: number,
): Promise<(Paragraph | Table)[]> {
  const titulo = `Fotografia ${numero}`
  const descricao = legenda?.trim() || 'Sem legenda'
  const descricaoComFonte = /\bfonte\s*:/i.test(descricao)
    ? descricao
    : `${descricao} - Fonte: Ato pericial.`

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
                      texto(`${titulo} – ${descricaoComFonte}`, {
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
        children: [texto(`${titulo} – imagem indisponível. ${descricaoComFonte}`, { italico: true, tamanho: 18 })],
      }),
    ]
  }
}

function assinatura(
  perito: Usuario | null,
  cidade?: string | null,
  dataAssinatura: string = hoje(),
): Paragraph[] {
  const titulos = (perito?.titulo ?? '').split(/\r?\n|;/).map((linha) => linha.trim()).filter(Boolean)
  const registros = (perito?.registroProfissional ?? '').split(/\r?\n|;/).map((linha) => linha.trim()).filter(Boolean)
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 360, after: 360 },
      children: [texto(`${cidade || 'São Paulo/SP'}, ${extenso(dataAssinatura)}.`)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: MARCA.tinta800 } },
      spacing: { after: 0 },
      children: [texto(perito?.nome ?? '—', { negrito: true })],
    }),
    ...titulos.map((linha) => new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { after: 0 },
      children: [texto(linha, { tamanho: 20 })],
    })),
    ...registros.map((linha, indice) => new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: indice < registros.length - 1,
      children: [texto(linha, { tamanho: 20 })],
    })),
  ]
}

const enderecamento = (vara?: string | null): Paragraph[] => [
  pSemRecuo('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO', true),
  pSemRecuo((vara ?? '').toUpperCase(), true),
]

const enderecamentoDoParecer = (
  vara?: string | null,
  comarca?: string | null,
): Paragraph[] => {
  const destino = [vara, comarca].filter(Boolean).join(' — ').toUpperCase()
  const linhas = [`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA ${destino}`]

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

function marcaOficial(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: '007A3D', space: 8 } },
    spacing: { after: 180 },
    children: [
      new ImageRun({
        type: 'jpg',
        data: LOGO_OFICIAL_JPEG,
        transformation: { width: 270, height: 93 },
        altText: {
          title: LOGO_OFICIAL_ALT,
          description: LOGO_OFICIAL_ALT,
          name: LOGO_OFICIAL_ALT,
        },
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
        children: [marcaOficial(), ...filhos],
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
  const fecho = dadosAssinaturaDocumento({ ...pericia, tecnico: t })
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
  const tituloAnalise = pericia.modalidade === 'insalubridade'
    ? 'ANÁLISE TÉCNICA DOS AGENTES IDENTIFICADOS'
    : pericia.modalidade === 'periculosidade'
      ? 'ANÁLISE TÉCNICA DAS ATIVIDADES E RISCOS IDENTIFICADOS'
      : 'ANÁLISE TÉCNICA DOS AGENTES, ATIVIDADES E RISCOS IDENTIFICADOS'
  const conclusaoNr15 =
    t.conclusaoInsalubridade?.trim() ||
    (pericia.modalidade === 'insalubridade' || !t.conclusaoPericulosidade?.trim() ? t.conclusao : '')
  const conclusaoNr16 =
    t.conclusaoPericulosidade?.trim() || (pericia.modalidade === 'periculosidade' ? t.conclusao : '')
  const encerramento = t.encerramento?.trim() || t.observacoesAdicionais

  // Mesmo contador do HTML: as seções finais são condicionais e o
  // DOCX precisa sair numerado igual ao PDF do mesmo documento.
  const num = numeradorDeSecoes()

  // Sem data de ajuizamento a conta dos cinco anos não fecha, e uma
  // janela chutada no laudo é pior do que janela nenhuma.
  const periodo = periodoAvaliacaoDocumento(pericia)

  const filhos: (Paragraph | Table)[] = [
    ...enderecamentoDoParecer(pericia.vara, pericia.comarca),
    tabela([
      fichaLinha('Processo nº', pericia.numeroProcesso),
      fichaLinha(
        'Reclamante',
        `${pericia.reclamante}${pericia.cpfReclamante ? ` — CPF ${mascaraCpf(pericia.cpfReclamante)}` : ''}`,
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
    h2(num.secao('OBJETO DA PERÍCIA E DADOS CONTRATUAIS')),
    ...blocos(objetivoAutomaticoDocumento(pericia.modalidade)),
    tabela([
      fichaLinha('Função Inicial', pericia.funcaoReclamante || '—'),
      fichaLinha('Data de admissão', data(pericia.admissao)),
      fichaLinha('Data de desligamento', pericia.demissao ? data(pericia.demissao) : 'Contrato vigente'),
      ...(pericia.dataAjuizamento ? [fichaLinha('Ajuizamento da ação', data(pericia.dataAjuizamento))] : []),
      ...(periodo ? [fichaLinha('Período avaliado', intervaloDoPeriodo(periodo))] : []),
    ]),
    h2(num.secao('DA DILIGÊNCIA TÉCNICA PERICIAL')),
    p(
      `A vistoria técnica foi realizada em ${extenso(pericia.dataVistoria)}${horarioDaVistoriaDocumento(pericia)}, no endereço ${pericia.localVistoria || '—'}${pericia.numeroVistoria ? `, nº ${pericia.numeroVistoria}` : ''}${pericia.setorVistoriado ? `, no setor/local ${pericia.setorVistoriado}` : ''}, com a presença dos participantes abaixo relacionados.`,
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
                celula(
                  `${PAPEL[pt.papel] ?? pt.papel}${pt.empresaId && porId.get(pt.empresaId) ? ` — ${porId.get(pt.empresaId)?.razaoSocial}` : ''}`,
                  { larguraDxa: 2864 },
                ),
                celula(ATUACAO[pt.papel] ?? '—', { larguraDxa: 3401 }),
              ],
            }),
        ),
      ], [2685, 2864, 3401]),
    )
  }

  filhos.push(
    h2(num.secao('DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA')),
    ...blocos(t.descricaoEmpresa),
    h3(num.sub('Instalações Físicas')),
    ...blocos(t.descricaoAmbiente),
  )
  filhos.push(...(await fotosDasSecoes(['ambiente'])))
  filhos.push(
    h2(num.secao('CRITÉRIOS TÉCNICOS PARA AVALIAÇÃO PERICIAL')),
    ...blocosEstruturados(t.normasReferencias),
    h2(num.secao('METODOLOGIA DE AVALIAÇÃO')),
    ...blocosEstruturados(t.equipamentosAnalisados),
    h2(num.secao('DESCRIÇÃO DO POSTO DE TRABALHO, MÁQUINAS, FERRAMENTAS E PRODUTOS')),
    h3(num.sub('Descrição do Posto de Trabalho')),
    ...blocos(t.descricaoPostoTrabalho || t.descricaoAmbiente),
  )
  filhos.push(...(await fotosDasSecoes(['atividades'])))
  filhos.push(h3(num.sub('Máquinas, Ferramentas e Equipamentos Utilizados')), ...blocos(t.maquinasFerramentas))
  filhos.push(...(await fotosDasSecoes(['equipamentos'])))
  filhos.push(
    h3(num.sub('Constatações da Vistoria Pericial')),
    ...blocos(t.informacoesLevantadas),
    h3(num.sub('Produtos Utilizados Habitualmente nas Atividades')),
    ...blocos(t.produtosUtilizados),
  )
  filhos.push(...(await fotosDasSecoes(['produtos'])))
  filhos.push(h2(num.secao('HISTÓRICO LABORAL, PERÍODOS E ATIVIDADES HABITUAIS EXERCIDAS')))

  if (t.periodos?.length) {
    const largurasPeriodos = [3043, 2506, 3401] as const
    filhos.push(
      tabela(
        t.periodos.flatMap((pr) => {
          const atividades = atividadesDoPeriodo(pr.descricaoAtividades)
          const paragrafosAtividades = [
            new Paragraph({
              keepNext: atividades.length > 0,
              spacing: { after: atividades.length ? 40 : 0 },
              children: [texto('Atividades', { negrito: true, tamanho: 20 })],
            }),
            ...(atividades.length
              ? atividades.map((atividade) => new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 20, line: 260 },
                  children: [texto(atividade, { tamanho: 20 })],
                }))
              : [new Paragraph({ spacing: { after: 0 }, children: [texto('—', { tamanho: 20 })] })]),
          ]

          return [
            new TableRow({
              cantSplit: true,
              children: [
                celula(`Função: ${pr.funcao}`, { cabecalho: true, larguraDxa: largurasPeriodos[0] }),
                celula(`Setor: ${pr.setor || '—'}`, { cabecalho: true, larguraDxa: largurasPeriodos[1] }),
                celula(`Período: ${data(pr.inicio)} a ${pr.fim ? data(pr.fim) : 'atual'}`, {
                  cabecalho: true,
                  larguraDxa: largurasPeriodos[2],
                }),
              ],
            }),
            new TableRow({
              cantSplit: true,
              children: [
                celula('', {
                  larguraDxa: LARGURA_TABELA_DXA,
                  columnSpan: 3,
                  paragrafos: paragrafosAtividades,
                }),
              ],
            }),
          ]
        }),
        largurasPeriodos,
      ),
    )
  }

  filhos.push(h3(num.sub('Atividades Efetivamente Exercidas')), ...blocos(t.atividadesFuncoes))

  const rotuloNatureza = (tipo?: string) => ({
    fisico: 'Agente Físico',
    quimico: 'Agente Químico',
    biologico: 'Agente Biológico',
    periculosidade: 'Atividade ou Operação Perigosa',
  } as Record<string, string>)[tipo ?? ''] ?? 'Agente'

  const adicionarAgentes = (lista: typeof agentes, prefixo?: string) => {
    if (!lista.length) return
    for (const [indice, agente] of lista.entries()) {
      const apresentacao = montarApresentacaoAgente(agente)
      filhos.push(
        prefixo
          ? h4(`${prefixo}.${indice + 1}. ${rotuloNatureza(agente.tipo)} — ${apresentacao.titulo}`)
          : h3(apresentacao.titulo),
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
      if (agente.observacao?.trim()) filhos.push(...blocos(agente.observacao))
    }
  }

  if (temInsalubridade) {
    const cabecalho = num.sub('NR-15 — Avaliação da Exposição Ocupacional')
    const numero = cabecalho.split('. ')[0]
    filhos.push(h3(cabecalho))
    adicionarAgentes(agentesNr15, numero)
  }
  if (temPericulosidade) {
    const cabecalho = num.sub('NR-16 — Avaliação das Atividades e Operações Perigosas')
    const numero = cabecalho.split('. ')[0]
    filhos.push(h3(cabecalho), h4(`${numero}.1. Critério de Avaliação`), ...blocos(t.criterioAvaliacaoPericulosidade))
    adicionarAgentes(agentesNr16)
  }
  const temDivergencias = Boolean(
    t.divergenciasFaticas?.trim() ||
    t.alegacoesReclamante?.trim() ||
    t.informacoesReclamada?.trim() ||
    t.consideracoesDivergencias?.trim(),
  )
  if (temDivergencias) {
    const cabecalho = num.sub('Divergências Fáticas')
    const numero = cabecalho.split('. ')[0]
    filhos.push(h3(cabecalho))
    if (t.divergenciasFaticas?.trim()) filhos.push(...blocos(t.divergenciasFaticas))
    if (t.alegacoesReclamante?.trim()) {
      filhos.push(h4(`${numero}.1. Alegações do Reclamante`), ...blocos(t.alegacoesReclamante))
    }
    if (t.informacoesReclamada?.trim()) {
      filhos.push(h4(`${numero}.2. Informações prestadas pela Reclamada`), ...blocos(t.informacoesReclamada))
    }
    if (t.consideracoesDivergencias?.trim()) {
      filhos.push(h3(num.sub('Considerações sobre as divergências fáticas')), ...blocos(t.consideracoesDivergencias))
    }
  }
  filhos.push(...(await fotosDasSecoes(['documentos'])))

  filhos.push(h2(num.secao('DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (NR-06)')))
  filhos.push(...blocos(t.notaTecnicaEpis))
  let numeroProtecao = 1
  for (const agente of agentes) {
    const apresentacao = montarApresentacaoAgente(agente)
    if (!apresentacao.protecoes.length) continue
    filhos.push(h3(apresentacao.titulo))
    for (const protecao of apresentacao.protecoes) {
      const tituloProtecao = /^Proteção \d+$/.test(protecao.titulo)
        ? `Proteção ${numeroProtecao++}`
        : protecao.titulo
      filhos.push(
        new Paragraph({ keepNext: true, spacing: { before: 140, after: 60 }, children: [texto(tituloProtecao, { negrito: true, tamanho: 20 })] }),
        tabela(protecao.linhas.map((item, indice, linhas) => fichaLinha(item.rotulo, item.valor, indice < linhas.length - 1))),
      )
    }
  }
  filhos.push(...(await fotosDasSecoes(['epi'])))

  filhos.push(
    h2(num.secao('DAS PROTEÇÕES COLETIVAS')),
    ...blocos(t.protecoesColetivas),
  )

  const cabecalhoAnalise = num.secao(tituloAnalise)
  const numeroAnalise = cabecalhoAnalise.split('. ')[0]
  filhos.push(h2(cabecalhoAnalise), ...blocos(t.analiseTecnica))

  let grupoAnalise = 0
  const adicionarQuadrosDeAnalise = (lista: typeof agentes, tituloGrupo: string) => {
    if (!lista.length) return
    grupoAnalise += 1
    filhos.push(h3(`${numeroAnalise}.${grupoAnalise}. ${tituloGrupo}`))
    lista.forEach((agente, indice) => {
      const apresentacao = montarApresentacaoAgente(agente)
      const protecoes = (agente.epis ?? []).map((epi, indiceEpi) => {
        const cas = [
          epi.caUnico?.trim() ? `CA ${epi.caUnico.trim()}` : '',
          epi.caPecaFacial?.trim() ? `CA peça facial ${epi.caPecaFacial.trim()}` : '',
          epi.caFiltroCartucho?.trim() ? `CA cartucho/filtro ${epi.caFiltroCartucho.trim()}` : '',
        ].filter(Boolean).join(' / ')
        return `Proteção ${indiceEpi + 1}: ${epi.modelo}${cas ? ` — ${cas}` : ''}`
      }).join('\n')
      filhos.push(
        h4(`${numeroAnalise}.${grupoAnalise}.${indice + 1}. ${apresentacao.titulo}`),
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
          ...(protecoes ? [fichaLinha('Proteções associadas', protecoes)] : []),
        ]),
      )
    })
  }

  if (temInsalubridade) adicionarQuadrosDeAnalise(agentesNr15, 'NR-15 — Avaliação da Exposição Ocupacional')
  if (temPericulosidade) adicionarQuadrosDeAnalise(agentesNr16, 'NR-16 — Avaliação das Atividades e Operações Perigosas')
  if (temInsalubridade) filhos.push(h2(num.secao('NR-15 — CONCLUSÃO E FUNDAMENTAÇÃO')), ...blocos(conclusaoNr15))
  if (temPericulosidade) filhos.push(h2(num.secao('NR-16 — CONCLUSÃO E FUNDAMENTAÇÃO')), ...blocos(conclusaoNr16))
  if (t.respostasQuesitos?.trim()) filhos.push(h2(num.secao('RESPOSTAS AOS QUESITOS TÉCNICOS')), ...blocos(t.respostasQuesitos))
  filhos.push(h2(num.secao('ENCERRAMENTO')), ...blocosComProximo(encerramento))

  filhos.push(...assinatura(perito, fecho.cidade, fecho.data))

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
