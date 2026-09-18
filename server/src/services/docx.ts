import type { DocumentoGerado, Empresa, Usuario } from '@prisma/client'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  Tab,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
} from 'docx'
import sharp from 'sharp'
import type { PericiaCompleta } from '../mappers.js'
import { type AssinaturaDoDocumento, assinaturaDoDocumento } from './assinatura-perito.js'
import { type MarcaDoDocumento, marcaDoDocumento } from './logo-oficial.js'
import {
  AGENTE_LABEL,
  agenteExibeConclusao,
  type ConteudoEsclarecimento,
  type ConteudoManifestacao,
  type ConteudoQuesitos,
  MARCA,
  MARCADOR_LISTA,
  ORIGEM_PONTO,
  type LinhaApresentacaoAgente,
  type TecnicoJson,
  atividadesDoPeriodo,
  comFuncaoPosto,
  data,
  dadosAssinaturaDocumento,
  emParagrafos,
  extenso,
  fotosEmOrdemDeDocumento,
  intervaloDoPeriodo,
  linhasDoBloco,
  mascaraCnpj,
  mascaraCpf,
  montarApresentacaoAgente,
  numeradorDeSecoes,
  quadrosNr16DoItem10,
  resumoProtecoesAssociadas,
  objetivoAutomaticoDocumento,
  periodoAvaliacaoDocumento,
  horarioDaVistoriaDocumento,
  qualificacaoParticipanteDocumento,
  TEXTO_AUSENCIA_RECLAMANTE,
  hoje,
  ATUACAO,
} from './documento-comum.js'
import { exibirQuadroVarredura, normalizarVarredura, type AnexoVarreduraDocumento } from './varredura-normativa.js'

// ============================================================
// MÓDULO H — Exportação em formato editável (.docx).
//
// Gerado a partir dos dados, não convertido do HTML: assim o
// arquivo abre no Word com estilos nativos (títulos na navegação,
// tabelas reais, recuo de primeira linha) em vez de virar um
// emaranhado de HTML importado que o perito não consegue editar.
// ============================================================

const FONTE = 'Arial'
// Corpo nas regras da ABNT (NBR 14724): 12pt com entrelinha 1,5 (360 =
// 1,5 × 240 no Word). O PDF e a prévia usam as mesmas medidas.
const CORPO = 24 // meio-pontos → 12pt
const ENTRELINHA = 360
const RECUO_PRIMEIRA_LINHA = 709 // 1,25cm em twips
// Listas da matriz do perito: marcador em 1,25cm e texto em 2,25cm.
// O deslocamento (hanging) e a diferenca entre os dois, 1cm.
const RECUO_ITEM_TEXTO = 1276 // 2,25cm em twips
const RECUO_ITEM_DESLOCADO = 567 // 1cm em twips
const REFERENCIA_LISTA = 'lista-parecer'
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
const p = (t: string, manterComProximo = false) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: RECUO_PRIMEIRA_LINHA },
    keepNext: manterComProximo,
    spacing: { after: 120, line: ENTRELINHA },
    children: [texto(t)],
  })

/**
 * Item de lista com marcador. O marcador vem da numeração nativa do Word
 * (REFERENCIA_LISTA), e não do texto: assim o perito continua podendo
 * editar, recuar e continuar a lista dentro do Word.
 */
const pItem = (t: string, manterComProximo = false) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    numbering: { reference: REFERENCIA_LISTA, level: 0 },
    keepNext: manterComProximo,
    spacing: { after: 40, line: ENTRELINHA },
    children: [texto(t)],
  })

/** Linha recuada sem marcador — os Anexos da NR-16 (item 4.2.1). */
const pItemSemMarcador = (t: string, manterComProximo = false) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: RECUO_PRIMEIRA_LINHA },
    keepNext: manterComProximo,
    spacing: { after: 40, line: ENTRELINHA },
    children: [texto(t)],
  })

/**
 * Um bloco vira uma sequência de parágrafos: linha comum é parágrafo
 * justificado, "• " é item de lista e TAB é linha recuada sem marcador.
 */
const linhasEmParagrafos = (bloco: string, manterComProximo = false): Paragraph[] =>
  linhasDoBloco(bloco).map((linha) => {
    if (linha.tipo === 'item') return pItem(linha.texto, manterComProximo)
    if (linha.tipo === 'item-sem-marcador') return pItemSemMarcador(linha.texto, manterComProximo)
    return p(linha.texto, manterComProximo)
  })

/** Parágrafo sem recuo — endereçamento, rótulos, encerramento. */
const pSemRecuo = (t: string, negrito = false, manterComProximo = false) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    keepNext: manterComProximo,
    spacing: { after: 120, line: ENTRELINHA },
    children: [texto(t, { negrito })],
  })

const h1 = (t: string, centralizado = false, quebrarNoTravessao = false, espacoAntes = 240) => {
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
    spacing: { before: espacoAntes, after: 240 },
    children:
      indiceTravessao >= 0
        ? [
            texto(titulo.slice(0, indiceTravessao), estilo),
            texto(titulo.slice(indiceTravessao + 1), { ...estilo, quebraAntes: 1 }),
          ]
        : [texto(titulo, estilo)],
  })
}

/** `abreFolha`: o título começa uma folha nova (o item 1, depois da capa). */
const h2 = (t: string, abreFolha = false) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    keepLines: true,
    pageBreakBefore: abreFolha || undefined,
    spacing: { before: abreFolha ? 0 : 320, after: 140 },
    children: [texto(t.toUpperCase(), { negrito: true, tamanho: 28, cor: MARCA.documentoSecao })],
  })

const h3 = (t: string, espacoAntes = 220) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    keepLines: true,
    spacing: { before: espacoAntes, after: 100 },
    children: [texto(t, { negrito: true, tamanho: CORPO, cor: MARCA.documentoSecao })],
  })

const h4 = (t: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    keepNext: true,
    keepLines: true,
    spacing: { before: 180, after: 80 },
    children: [texto(t, { negrito: true, tamanho: CORPO, cor: MARCA.documentoSecao })],
  })

const blocos = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  if (!partes.length) return []
  return partes.flatMap((parte) => linhasEmParagrafos(parte))
}

/**
 * Transcrição literária de uma peça do processo. Espelha `<Transcricao>` de
 * src/components/DocumentoPreview.tsx: aspas na primeira e na última linha,
 * itálico no meio — a voz da parte não pode se confundir com a do perito.
 */
const blocosTranscricao = (t?: string | null): Paragraph[] => {
  const linhas = (t ?? '').split('\n').map((linha) => linha.trim()).filter(Boolean)
  return linhas.map((linha, indice) => new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: RECUO_PRIMEIRA_LINHA },
    spacing: { after: 60, line: ENTRELINHA },
    children: [texto(
      `${indice === 0 ? '“' : ''}${linha}${indice === linhas.length - 1 ? '”' : ''}`,
      { italico: true },
    )],
  }))
}

const blocosEstruturados = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  if (!partes.length) return blocos(t)
  return partes.flatMap((parte) => {
    const titulo = parte.trim().match(/^([45]\.\d+(?:\.\d+)?\.)\s+([^\n]+)$/)
    if (!titulo) return linhasEmParagrafos(parte)
    const prefixo = titulo[1] ?? ''
    const textoTitulo = titulo[2] ?? ''
    const nivel = prefixo.split('.').filter(Boolean).length
    return [nivel >= 3 ? h4(`${prefixo} ${textoTitulo}`) : h3(`${prefixo} ${textoTitulo}`)]
  })
}

const blocosComProximo = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  return partes.flatMap((parte) => linhasEmParagrafos(parte, true))
}

/**
 * Como `blocos`, mas o último parágrafo vai preso ao fecho (`keepNext`):
 * quando data e assinatura não cabem e descem de folha, levam junto o fim
 * do texto — nunca sai uma folha só com a assinatura. Espelha o
 * `break-before: avoid` do `.fecho` em documento-html.ts.
 */
const blocosAteOFecho = (t?: string | null): Paragraph[] => {
  const partes = emParagrafos(t)
  return partes.flatMap((parte, indice) => linhasEmParagrafos(parte, indice === partes.length - 1))
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
    /**
     * Negrito por conta própria, fora do cabeçalho.
     *
     * A prévia e o PDF imprimem em peso 700 toda célula com `destaque`
     * (`.resultado-positivo|negativo|aviso`). Sem esta opção o DOCX era o
     * único dos três em que a linha "Resultado técnico / Conclusão" saía
     * com o mesmo peso das demais — justo a linha que o leitor procura.
     */
    negrito?: boolean
  } = {},
) {
  return new TableCell({
    borders: BORDAS,
    shading: { fill: opcoes.cabecalho ? MARCA.documentoTabela : MARCA.documentoFundo },
    width: opcoes.larguraDxa ? { size: opcoes.larguraDxa, type: WidthType.DXA } : undefined,
    columnSpan: opcoes.columnSpan,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    // Um parágrafo por linha: o quadro conclusivo da NR-16 lista os anexos
    // observados dentro de uma célula só, e um `\n` cru dentro do TextRun
    // sairia como espaço simples no Word — a lista viraria texto corrido, só
    // no DOCX, enquanto PDF e tela mostravam item a item.
    children: opcoes.paragrafos ?? conteudo.split('\n').map((linha) =>
      new Paragraph({
        keepNext: opcoes.manterComProxima,
        spacing: { after: 0 },
        children: [texto(linha, { negrito: opcoes.negrito ?? opcoes.cabecalho, tamanho: 20 })],
      }),
    ),
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

/**
 * Conclusão do agente como última linha da tabela dele: uma célula na
 * largura toda, fundo cinza-azulado e "Conclusão:" em negrito (pedido do
 * perito). Espelha `tr.conclusao-agente` do PDF e `LinhaConclusaoAgente` da
 * prévia. Um parágrafo por linha, como em `celula`.
 */
const linhaConclusaoAgente = (observacao: string) =>
  new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        borders: BORDAS,
        shading: { fill: MARCA.tinta100 },
        width: { size: LARGURA_TABELA_DXA, type: WidthType.DXA },
        columnSpan: 2,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: observacao.trim().split('\n').map((linha, indice) =>
          new Paragraph({
            spacing: { after: 0 },
            children: [
              ...(indice === 0 ? [texto('Conclusão: ', { negrito: true, tamanho: 20, cor: MARCA.documentoTitulo })] : []),
              texto(linha, { tamanho: 20 }),
            ],
          }),
        ),
      }),
    ],
  })

/** Tabela rótulo/valor, como as fichas de identificação do parecer. */
const fichaLinha = (
  rotulo: string,
  valor: string,
  manterComProxima = false,
  destaque?: LinhaApresentacaoAgente['destaque'],
) =>
  new TableRow({
    cantSplit: true,
    children: [
      celula(rotulo, { cabecalho: true, larguraDxa: COLUNAS_FICHA[0], manterComProxima }),
      celula(valor, { larguraDxa: COLUNAS_FICHA[1], manterComProxima, negrito: Boolean(destaque) }),
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

    // Mesmo teto dos outros dois renderizadores: 540 px = a largura do texto
    // e 416 px = 11 cm a 96 dpi, o `max-height` de figure img em
    // documento-html.ts e o max-h-[11cm] de DocumentoPreview.tsx.
    const larguraMaxima = 540
    const alturaMaxima = 416
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

/**
 * Recuo de cada lado da linha de assinatura: o fio mede ~7,4cm, como os
 * 280px do `.traco` no PDF, em vez de atravessar a largura toda do texto.
 */
const RECUO_LINHA_ASSINATURA = Math.round((LARGURA_UTIL_DXA - 4200) / 2)

/**
 * Local, data e assinatura. Todos os parágrafos vão presos ao seguinte
 * (`keepNext`): a data nunca fica sozinha no pé de uma folha com a
 * assinatura na outra.
 *
 * `espacado` é o fecho do parecer/laudo, com mais ar acima da data e da
 * linha — a impugnação continua compacta para caber numa folha. Com a
 * assinatura manuscrita cadastrada, a imagem entra logo acima da linha.
 */
function assinatura(
  perito: Usuario | null,
  manuscrita: AssinaturaDoDocumento | null,
  cidade?: string | null,
  dataAssinatura: string = hoje(),
  opcoes: { espacado?: boolean } = {},
): Paragraph[] {
  const titulos = (perito?.titulo ?? '').split(/\r?\n|;/).map((linha) => linha.trim()).filter(Boolean)
  const registros = (perito?.registroProfissional ?? '').split(/\r?\n|;/).map((linha) => linha.trim()).filter(Boolean)
  const espacoAposData = manuscrita
    ? (opcoes.espacado ? 240 : 120)
    : (opcoes.espacado ? 1000 : 360)
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: opcoes.espacado ? 720 : 360, after: espacoAposData },
      children: [texto(`${cidade || 'São Paulo/SP'}, ${extenso(dataAssinatura)}.`)],
    }),
    ...(manuscrita
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          keepNext: true,
          keepLines: true,
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: 'png',
              data: manuscrita.dados,
              transformation: { width: manuscrita.largura, height: manuscrita.altura },
              altText: {
                title: 'Assinatura',
                description: `Assinatura de ${perito?.nome ?? 'perito'}`,
                name: 'Assinatura',
              },
            }),
          ],
        })]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      indent: { left: RECUO_LINHA_ASSINATURA, right: RECUO_LINHA_ASSINATURA },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: MARCA.tinta800, space: 4 } },
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
        spacing: { after: indice === linhas.length - 1 ? 290 : 80, line: ENTRELINHA },
        children: [texto(linha, { negrito: true })],
      }),
  )
}

/**
 * Mesmo rodapé do PDF (RODAPE em pdf.ts): o aviso de propriedade à
 * esquerda e a paginação encostada na margem direita.
 */
function rodape(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        tabStops: [{ type: TabStopType.RIGHT, position: LARGURA_UTIL_DXA }],
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: MARCA.documentoTitulo } },
        spacing: { before: 80 },
        children: [
          texto('© D&R Perícia Trabalhista — Propriedade intelectual exclusiva e protegida.', { tamanho: 16 }),
          new TextRun({ children: [new Tab(), 'Página '], color: MARCA.documentoTexto, font: FONTE, size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONTE, size: 16 }),
          texto(' de ', { tamanho: 16 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONTE, size: 16 }),
        ],
      }),
    ],
  })
}

/**
 * Cabeçalho com a logo do perito responsável (white-label).
 *
 * `tipo` e as dimensões vêm prontos de marcaDoDocumento e não são mais
 * constantes: o Word exige declarar o formato da imagem embutida, e a caixa
 * fixa de 270x93pt — a proporção exata da arte da D&R — esticaria a marca de
 * qualquer perito com logo de outro formato.
 */
function marcaDoPerito(marca: MarcaDoDocumento): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: '007A3D', space: 8 } },
    spacing: { after: 180 },
    children: [
      new ImageRun({
        type: marca.tipo,
        data: marca.dados,
        transformation: { width: marca.largura, height: marca.altura },
        altText: {
          title: marca.alt,
          description: marca.alt,
          name: marca.alt,
        },
      }),
    ],
  })
}

function montarDocumento(filhos: (Paragraph | Table)[], marca: MarcaDoDocumento): Document {
  return new Document({
    styles: { default: { document: { run: { font: FONTE, size: CORPO } } } },
    // Numeração nativa das listas com marcador da matriz do perito. Fica
    // aqui, e não em cada parágrafo, porque o Word exige a definição no
    // documento para o marcador aparecer e continuar editável.
    numbering: {
      config: [
        {
          reference: REFERENCIA_LISTA,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: MARCADOR_LISTA,
              alignment: AlignmentType.LEFT,
              style: {
                run: { font: FONTE, size: CORPO, color: MARCA.documentoTexto },
                paragraph: {
                  indent: { left: RECUO_ITEM_TEXTO, hanging: RECUO_ITEM_DESLOCADO },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            // A4 com as margens da ABNT (NBR 14724): 3cm em cima e à
            // esquerda, 2cm embaixo e à direita — as mesmas do PDF. O rodapé
            // fica a 1cm da borda, dentro da margem de baixo.
            size: { width: 11906, height: 16838 },
            margin: { top: 1701, right: 1134, bottom: 1134, left: 1701, footer: 567 },
          },
        },
        footers: { default: rodape() },
        children: [marcaDoPerito(marca), ...filhos],
      },
    ],
  })
}

// ---------------- parecer / laudo ----------------

/** Altura útil da folha A4 com as margens de `montarDocumento`, em twips. */
const ALTURA_UTIL_TWIPS = 16838 - 1701 - 1134

/** Teto do espaço acima da identificação na capa: ~6,2cm, o `max-height` do `.espaco-capa` no PDF. */
const ESPACO_MAXIMO_CAPA = 3515

/** Linhas que um texto ocupa, a tantos caracteres por linha. */
const linhasDe = (textoLinha: string, porLinha: number) => Math.max(1, Math.ceil(textoLinha.length / porLinha))

/**
 * Espaço acima de "IDENTIFICAÇÃO DAS PARTES" na folha de rosto do DOCX.
 *
 * No PDF quem resolve é o flex (`.capa`): o espaço estica até o teto e
 * encolhe quando a apresentação é longa. O Word não tem isso, então aqui ele
 * é estimado: a folha útil menos o que a capa ocupa. A estimativa é
 * pessimista de propósito (poucos caracteres por linha, folga no fim): se a
 * capa transbordasse, o item 1 — que abre folha nova — iria para a folha 3.
 */
function espacoDaCapa(pericia: PericiaCompleta, marca: MarcaDoDocumento, fichas: string[], titulo: string): number {
  const LINHA_CORPO = 414 // 12pt com a entrelinha 1,5 do corpo
  const logo = marca.altura * 15 + 380
  const enderecamentoCapa = linhasDe(
    `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA ${[pericia.vara, pericia.comarca].filter(Boolean).join(' — ')}`,
    53,
  ) * LINHA_CORPO + 290
  const subtitulos = 2 * 600
  const ficha = fichas.reduce((total, valor) => total + 140 + linhasDe(valor, 52) * 250, 0)
  const tituloCapa = 510 + linhasDe(titulo, 30) * 440 + 380
  const t = pericia.tecnico as unknown as TecnicoJson
  const apresentacao = (t.apresentacao ?? '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .reduce((total, linha) => total + linhasDe(linha, 71) * LINHA_CORPO + 120, 0)
  const folga = 700
  const livre = ALTURA_UTIL_TWIPS - (logo + enderecamentoCapa + subtitulos + ficha + tituloCapa + apresentacao + folga)
  return Math.max(220, Math.min(ESPACO_MAXIMO_CAPA, livre))
}

async function docParecer(
  pericia: PericiaCompleta,
  empresas: Empresa[],
  perito: Usuario | null,
  titulo: string,
  marca: MarcaDoDocumento,
  manuscrita: AssinaturaDoDocumento | null,
): Promise<(Paragraph | Table)[]> {
  const t = pericia.tecnico as unknown as TecnicoJson
  const varredura = normalizarVarredura(t, pericia.modalidade)
  const exibeVarredura = exibirQuadroVarredura(t)
  const fecho = dadosAssinaturaDocumento({ ...pericia, tecnico: t })
  const porId = new Map(empresas.map((e) => [e.id, e]))
  const principal = porId.get(pericia.reclamadas.find((r) => r.principal)?.empresaId ?? '')
  const solidarias = pericia.reclamadas
    .filter((r) => !r.principal)
    .map((r) => porId.get(r.empresaId))
    .filter((e): e is Empresa => Boolean(e))

  const fotosOrdenadas = fotosEmOrdemDeDocumento(pericia.fotos)
  const numeroDaFoto = new Map(fotosOrdenadas.map((foto, indice) => [foto.id, indice + 1]))
  const fotosDasSecoes = async (secoes: string[]) => {
    const elementos: (Paragraph | Table)[] = []
    for (const foto of fotosOrdenadas.filter((item) => secoes.includes(item.secao))) {
      elementos.push(...(await figuraDocx(foto.arquivo, foto.legenda, numeroDaFoto.get(foto.id) ?? 0)))
    }
    return elementos
  }

  // Um agente por função: o rótulo é resolvido aqui, uma vez, a partir do
  // período. Ver `comFuncaoPosto`.
  const agentes = comFuncaoPosto(t.agentes ?? [], t.periodos ?? [])
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

  const fichasDaCapa: [string, string][] = [
    ['Processo nº', pericia.numeroProcesso],
    ['Reclamante', `${pericia.reclamante}${pericia.cpfReclamante ? ` — CPF: ${mascaraCpf(pericia.cpfReclamante)}` : ''}`],
    ['Reclamada', principal ? `${principal.razaoSocial} — CNPJ ${mascaraCnpj(principal.cnpj)}` : '—'],
    ...solidarias.map((e): [string, string] => ['Reclamada', `${e.razaoSocial} — CNPJ ${mascaraCnpj(e.cnpj)}`]),
  ]

  // Folha de rosto (pedido do perito): a identificação desce para perto do
  // meio da folha e o item 1 abre a folha 2. Espelha `.capa` do PDF.
  const filhos: (Paragraph | Table)[] = [
    ...enderecamentoDoParecer(pericia.vara, pericia.comarca),
    h3('IDENTIFICAÇÃO DAS PARTES', espacoDaCapa(pericia, marca, fichasDaCapa.map(([, valor]) => valor), titulo)),
    tabela(fichasDaCapa.map(([rotulo, valor]) => fichaLinha(rotulo, valor))),
    h1(titulo, true, false, 510),
    h3('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA'),
    ...blocos(t.apresentacao),
    h2(num.secao('OBJETO DA PERÍCIA E DADOS CONTRATUAIS'), true),
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
        ...pericia.participantes.map((pt) => pt.papel === 'parte_reclamante_ausente'
          ? new TableRow({ children: [celula(TEXTO_AUSENCIA_RECLAMANTE, { columnSpan: 3 })] })
          : new TableRow({
              children: [
                celula(pt.nome, { larguraDxa: 2685 }),
                celula(qualificacaoParticipanteDocumento(
                  pt.papel,
                  pt.empresaId ? porId.get(pt.empresaId)?.razaoSocial : undefined,
                ), { larguraDxa: 2864 }),
                celula(ATUACAO[pt.papel] ?? '—', { larguraDxa: 3401 }),
              ],
            })),
      ], [2685, 2864, 3401]),
    )
  }

  filhos.push(
    // Título de nível 1 sem texto próprio: o 3.1 vem colado no 3, igual ao
    // PDF e à pré-visualização. `t.descricaoEmpresa` segue gravado nas
    // perícias antigas, mas não é mais impresso (pedido do perito).
    h2(num.secao('DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA')),
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
  filhos.push(h3(num.sub('Constatações da Vistoria Pericial')), ...blocos(t.informacoesLevantadas))
  filhos.push(...(await fotosDasSecoes(['documentos', 'epi'])))
  filhos.push(
    h3(num.sub('Produtos Utilizados Habitualmente nas Atividades')),
    ...blocos(t.produtosUtilizados),
  )
  filhos.push(...(await fotosDasSecoes(['produtos'])))
  // O 7.1 abre a secao 7, antes da tabela de periodos (pedido do perito).
  // Os argumentos de um mesmo push avaliam da esquerda para a direita, entao
  // num.secao roda antes de num.sub e o subtitulo continua sendo o 7.1.
  // O h3 tem de ficar FORA do `if (t.periodos?.length)` abaixo: dentro dele,
  // pericia sem periodos perderia o 7.1 e todos os subitens seguintes da
  // secao 7 subiriam um numero, dessincronizando o DOCX do PDF e da previa.
  filhos.push(
    h2(num.secao('HISTÓRICO LABORAL, PERÍODOS E ATIVIDADES HABITUAIS EXERCIDAS')),
    h3(num.sub('Atividades Efetivamente Exercidas')),
    ...blocos(t.atividadesFuncoes),
  )

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

  const rotuloNatureza = (tipo?: string) => ({
    fisico: 'Agente Físico',
    quimico: 'Agente Químico',
    biologico: 'Agente Biológico',
    periculosidade: 'Atividade ou Operação Perigosa',
  } as Record<string, string>)[tipo ?? ''] ?? 'Agente'

  /**
   * A tabela do agente, com a conclusão como última linha. Agente não
   * identificado não tem tabela: a conclusão sai sozinha, numa tabela de uma
   * linha com o mesmo destaque. Espelha `quadroDoAgente` do PDF.
   */
  const quadroDoAgente = (agente: (typeof agentes)[number], linhas: TableRow[]): Table[] => {
    const conclusao = agenteExibeConclusao(agente) ? [linhaConclusaoAgente(agente.observacao ?? '')] : []
    if (agente.identificadoNaAtividade === false) return conclusao.length ? [tabela(conclusao)] : []
    return [tabela([
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          celula('Propriedade', { cabecalho: true, larguraDxa: COLUNAS_FICHA[0] }),
          celula('Informação', { cabecalho: true, larguraDxa: COLUNAS_FICHA[1] }),
        ],
      }),
      ...linhas,
      ...conclusao,
    ])]
  }

  const adicionarAgentes = (lista: typeof agentes, prefixo?: string) => {
    if (!lista.length) return
    for (const [indice, agente] of lista.entries()) {
      const apresentacao = montarApresentacaoAgente(agente)
      filhos.push(
        prefixo
          ? h4(`${prefixo}.${indice + 1}. ${rotuloNatureza(agente.tipo)} — ${apresentacao.titulo}`)
          : h3(apresentacao.titulo),
        ...quadroDoAgente(
          agente,
          apresentacao.linhas.map((item) => fichaLinha(item.rotulo, item.valor, false, item.destaque)),
        ),
      )
    }
  }

  const adicionarVarredura = (norma: string, itens: AnexoVarreduraDocumento[]) => {
    const rotulo = (status: AnexoVarreduraDocumento['status']) => ({
      sem_exposicao: 'Sem exposição', exposicao_identificada: 'Avaliação da suposta exposição',
      nao_aplicavel: 'Não aplicável', nao_avaliado: 'Pendente',
    })[status]
    filhos.push(tabela([
      new TableRow({ tableHeader: true, cantSplit: true, children: [
        celula('Anexo', { cabecalho: true }), celula('Agente / risco avaliado', { cabecalho: true }),
        celula(`Resultado da varredura ${norma}`, { cabecalho: true }),
      ] }),
      ...itens.map((item) => new TableRow({ cantSplit: true, children: [
        celula(item.numero), celula(item.tema), celula(rotulo(item.status)),
      ] })),
    ]))
  }

  if (temInsalubridade) {
    const cabecalho = num.sub('NR-15 — Avaliação da Exposição Ocupacional')
    const numero = cabecalho.split('. ')[0]
    filhos.push(h3(cabecalho))
    if (exibeVarredura.nr15) adicionarVarredura('NR-15', [...varredura.nr15, ...varredura.nr15Complementares])
    adicionarAgentes(agentesNr15, numero)
  }
  if (temPericulosidade) {
    const cabecalho = num.sub('NR-16 — Avaliação das Atividades e Operações Perigosas')
    const numero = cabecalho.split('. ')[0]
    filhos.push(h3(cabecalho))
    if (exibeVarredura.nr16) adicionarVarredura('NR-16', varredura.nr16)
    filhos.push(h4(`${numero}.1. Critério de Avaliação`), ...blocos(t.criterioAvaliacaoPericulosidade))
    if (t.riscoAlegadoPericulosidade?.trim()) {
      filhos.push(
        h4(`${numero}.2. Risco de Periculosidade Alegado pela Parte Reclamante`),
        ...blocosTranscricao(t.riscoAlegadoPericulosidade),
      )
    }
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

  filhos.push(h2(num.secao('DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (NR-06)')))
  filhos.push(...blocos(t.notaTecnicaEpis))
  // A seção de EPIs precisa enxergar exatamente os mesmos agentes que o resto
  // do documento. Enquanto varria a lista inteira, uma perícia só de
  // periculosidade imprimia aqui os EPIs de agentes NR-15 herdados do
  // cadastro — agentes que nenhum outro item do laudo mencionava, porque a
  // modalidade já os tinha excluído. Ficavam proteções órfãs, atribuídas a
  // um agente que o leitor não encontrava em lugar nenhum.
  let numeroProtecao = 1
  for (const agente of agentes.filter((item) =>
    item.identificadoNaAtividade !== false
    && (item.tipo === 'periculosidade' ? temPericulosidade : temInsalubridade))) {
    const apresentacao = montarApresentacaoAgente(agente)
    if (!apresentacao.protecoes.length) continue
    filhos.push(h3(apresentacao.titulo))
    for (const protecao of apresentacao.protecoes) {
      const tituloProtecao = /^Proteção \d+$/.test(protecao.titulo)
        ? `Proteção ${numeroProtecao++}`
        : protecao.titulo
      filhos.push(
        new Paragraph({ keepNext: true, spacing: { before: 140, after: 60 }, children: [texto(tituloProtecao, { negrito: true, tamanho: 20 })] }),
        tabela(protecao.linhas.map((item, indice, linhas) => fichaLinha(item.rotulo, item.valor, indice < linhas.length - 1, item.destaque))),
      )
    }
  }

  filhos.push(
    h2(num.secao('DAS PROTEÇÕES COLETIVAS')),
    ...blocos(t.protecoesColetivas),
  )

  const cabecalhoAnalise = num.secao(tituloAnalise)
  const numeroAnalise = cabecalhoAnalise.split('. ')[0]
  filhos.push(h2(cabecalhoAnalise))

  // Mesma regra do PDF e da prévia: o número do grupo vem da modalidade,
  // não do tamanho da lista. Lista vazia continua suprimindo o bloco, mas
  // não pode mais empurrar a NR-16 para o 10.1 num documento que já chamou
  // a mesma norma de 7.3.
  let grupoAnalise = 0
  const numeroAnaliseNr15 = temInsalubridade ? `${numeroAnalise}.${++grupoAnalise}` : null
  const numeroAnaliseNr16 = temPericulosidade ? `${numeroAnalise}.${++grupoAnalise}` : null
  const adicionarQuadrosDeAnalise = (
    lista: typeof agentes,
    tituloGrupo: string,
    prefixo: string | null,
  ) => {
    if (!prefixo || !lista.length) return
    filhos.push(h3(`${prefixo}. ${tituloGrupo}`))
    lista.forEach((agente, indice) => {
      const apresentacao = montarApresentacaoAgente(agente)
      const protecoes = resumoProtecoesAssociadas(agente.epis)
      filhos.push(
        h4(`${prefixo}.${indice + 1}. ${apresentacao.titulo}`),
        ...quadroDoAgente(agente, [
          ...apresentacao.linhas.map((item) => fichaLinha(item.rotulo, item.valor, false, item.destaque)),
          ...(protecoes ? [fichaLinha('Proteções associadas', protecoes)] : []),
        ]),
      )
    })
  }

  /**
   * O grupo da NR-16 é um subitem por agente avaliado, numerado em
   * sequência. A lista solta dos sete anexos saiu daqui por determinação do
   * perito — o rol observado sai dentro da tabela, na célula “Resultado
   * técnico / Conclusão”. Quem monta é `quadrosNr16DoItem10`.
   * Espelha `quadrosNr16DeAnalise` da prévia e `montarGrupoNr16` do PDF.
   */
  const adicionarQuadrosNr16 = (lista: typeof agentes, prefixo: string | null) => {
    if (!prefixo || !lista.length) return
    filhos.push(h3(`${prefixo}. NR-16 — Avaliação das Atividades e Operações Perigosas`))
    for (const quadro of quadrosNr16DoItem10(lista, prefixo)) {
      const apresentacao = quadro.agente.identificadoNaAtividade !== false
        ? montarApresentacaoAgente(quadro.agente, { conclusiva: true })
        : null
      filhos.push(
        h4(`${quadro.numero}. ${quadro.titulo}`),
        ...(apresentacao
          ? [tabela(apresentacao.linhas.map((item) => fichaLinha(item.rotulo, item.valor, false, item.destaque)))]
          : []),
      )
    }
  }

  adicionarQuadrosDeAnalise(agentesNr15, 'NR-15 — Avaliação da Exposição Ocupacional', numeroAnaliseNr15)
  adicionarQuadrosNr16(agentesNr16, numeroAnaliseNr16)
  // Só os quadros: o texto livre da análise técnica saiu do formulário e do
  // documento (pedido do perito). `t.analiseTecnica` segue gravado nas
  // perícias antigas, mas não é mais impresso — igual ao PDF e à prévia.
  if (temInsalubridade) filhos.push(h2(num.secao('NR-15 — CONCLUSÃO E FUNDAMENTAÇÃO')), ...blocos(conclusaoNr15))
  if (temPericulosidade) filhos.push(h2(num.secao('NR-16 — CONCLUSÃO E FUNDAMENTAÇÃO')), ...blocos(conclusaoNr16))
  if (t.respostasQuesitos?.trim()) filhos.push(h2(num.secao('RESPOSTAS AOS QUESITOS TÉCNICOS')), ...blocos(t.respostasQuesitos))
  filhos.push(h2(num.secao('ENCERRAMENTO')), ...blocosComProximo(encerramento))

  filhos.push(...assinatura(perito, manuscrita, fecho.cidade, fecho.data, { espacado: true }))

  return filhos
}

// ---------------- quesitos ----------------

function docQuesitos(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
  manuscrita: AssinaturaDoDocumento | null,
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
          // A última resposta desce junto com o fecho, se ele mudar de folha.
          keepNext: i === itens.length - 1,
          spacing: { after: 200, line: ENTRELINHA },
          children: [
            texto('Resposta: ', { negrito: true }),
            texto(q.resposta || '[resposta não preenchida]'),
          ],
        }),
      )
    })
  }

  filhos.push(...assinatura(perito, manuscrita, pericia?.comarca))
  return filhos
}

// ---------------- manifestação / impugnação ----------------

function docManifestacao(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
  manuscrita: AssinaturaDoDocumento | null,
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

  filhos.push(h2('III — Requerimento'), ...blocosAteOFecho(c.encerramento), ...assinatura(perito, manuscrita, pericia?.comarca))
  return filhos
}

// ---------------- esclarecimentos ----------------

function docEsclarecimento(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
  manuscrita: AssinaturaDoDocumento | null,
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
          spacing: { after: 120, line: ENTRELINHA },
          children: [texto(pt.questionamento || '[questionamento não informado]', { italico: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: RECUO_PRIMEIRA_LINHA },
          spacing: { after: 200, line: ENTRELINHA },
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

  filhos.push(h2('III — Conclusão'), ...blocosAteOFecho(c.conclusao), ...assinatura(perito, manuscrita, pericia?.comarca))
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
  const marca = await marcaDoDocumento(perito)
  const manuscrita = await assinaturaDoDocumento(perito)

  switch (doc.tipo) {
    case 'parecer':
    case 'laudo':
      filhos = pericia
        ? await docParecer(pericia, empresas, perito, doc.titulo, marca, manuscrita)
        : [h1(doc.titulo), p('[A perícia vinculada não existe mais.]')]
      break
    case 'quesitos':
      filhos = docQuesitos(doc, pericia, principal, perito, manuscrita)
      break
    case 'manifestacao':
    case 'impugnacao':
      filhos = docManifestacao(doc, pericia, principal, perito, manuscrita)
      break
    case 'esclarecimento':
      filhos = docEsclarecimento(doc, pericia, principal, perito, manuscrita)
      break
  }

  return Packer.toBuffer(montarDocumento(filhos, marca))
}
