import type { DocumentoGerado, Empresa, Usuario } from '@prisma/client'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { PericiaCompleta } from '../mappers.js'
import {
  AGENTE_LABEL,
  type ConteudoEsclarecimento,
  type ConteudoManifestacao,
  type ConteudoQuesitos,
  CRITERIO,
  GRAU,
  MARCA,
  MODALIDADE_LABEL,
  ORIGEM_PONTO,
  PAPEL,
  type TecnicoJson,
  VAZIO,
  data,
  emParagrafos,
  extenso,
  formatarCasEpi,
  formatarMedicao,
  hoje,
  limiteComUnidade,
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

const FONTE = 'Times New Roman'
const CORPO = 23 // meio-pontos → 11,5pt
const RECUO_PRIMEIRA_LINHA = 709 // 1,25cm em twips

const texto = (
  t: string,
  opcoes: { negrito?: boolean; italico?: boolean; tamanho?: number; cor?: string } = {},
) =>
  new TextRun({
    text: t,
    bold: opcoes.negrito,
    italics: opcoes.italico,
    color: opcoes.cor,
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
const pSemRecuo = (t: string, negrito = false) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 340 },
    children: [texto(t, { negrito })],
  })

const h1 = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
    children: [texto(t.toUpperCase(), { negrito: true, tamanho: 28 })],
  })

const h2 = (t: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [texto(t.toUpperCase(), { negrito: true, tamanho: 24 })],
  })

const h3 = (t: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 100 },
    children: [texto(t, { negrito: true, tamanho: CORPO })],
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

const borda = { style: BorderStyle.SINGLE, size: 4, color: MARCA.tinta400 }
const BORDAS = { top: borda, bottom: borda, left: borda, right: borda }

function celula(conteudo: string, opcoes: { cabecalho?: boolean; largura?: number } = {}) {
  return new TableCell({
    borders: BORDAS,
    shading: opcoes.cabecalho ? { fill: MARCA.tinta100 } : undefined,
    width: opcoes.largura ? { size: opcoes.largura, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [texto(conteudo, { negrito: opcoes.cabecalho, tamanho: 20 })],
      }),
    ],
  })
}

function episNaCelulaAgente(
  epis: TecnicoJson['agentes'][number]['epis'],
  epiEficaz: TecnicoJson['agentes'][number]['epiEficaz'],
): string[] {
  if (!epis?.length) return []
  return [
    'EPIs associados',
    ...epis.map((epi) =>
      [
        [epi.categoria, epi.modelo, epi.marca]
          .map((parte) => parte.trim())
          .filter(Boolean)
          .join(' — '),
        ...formatarCasEpi(epi),
      ].join('\n'),
    ),
    `Eficácia comprovada: ${epiEficaz ? 'Sim' : 'Não'}`,
  ]
}

const tabela = (linhas: TableRow[]) =>
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: linhas })

/** Tabela rótulo/valor, como as fichas de identificação do parecer. */
const fichaLinha = (rotulo: string, valor: string) =>
  new TableRow({ children: [celula(rotulo, { cabecalho: true, largura: 32 }), celula(valor)] })

function cabecalhoMarca(perito: Usuario | null): Paragraph[] {
  const linhas: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        texto('D', { negrito: true, tamanho: 56, cor: MARCA.primaria }),
        texto('&', { negrito: true, tamanho: 56, cor: MARCA.tinta900 }),
        texto('R', { negrito: true, tamanho: 56, cor: MARCA.primaria }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [texto('— P E R Í C I A —', { negrito: true, tamanho: 18, cor: MARCA.primaria })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        texto('PLATAFORMA INTELIGENTE DE PERÍCIA TRABALHISTA', {
          negrito: true,
          tamanho: 16,
          cor: MARCA.credencial,
        }),
      ],
    }),
  ]

  if (perito) {
    const credencial = [perito.nome, perito.titulo, perito.registroProfissional]
      .filter(Boolean)
      .join(' · ')
    linhas.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: MARCA.primaria } },
        spacing: { after: 360 },
        children: [texto(credencial, { tamanho: 17, cor: MARCA.tinta500 })],
      }),
    )
  }

  return linhas
}

function assinatura(perito: Usuario | null, comarca?: string | null): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 720 },
      children: [texto(`${comarca || 'São Paulo/SP'}, ${extenso(hoje())}.`)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: MARCA.tinta800 } },
      spacing: { after: 0 },
      children: [texto(perito?.nome ?? '—', { negrito: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
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

function rodape(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
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
            margin: { top: 1417, right: 1134, bottom: 1134, left: 1701 },
          },
        },
        footers: { default: rodape() },
        children: filhos,
      },
    ],
  })
}

// ---------------- parecer / laudo ----------------

function docParecer(
  pericia: PericiaCompleta,
  empresas: Empresa[],
  perito: Usuario | null,
  titulo: string,
): (Paragraph | Table)[] {
  const t = pericia.tecnico as unknown as TecnicoJson
  const porId = new Map(empresas.map((e) => [e.id, e]))
  const principal = porId.get(pericia.reclamadas.find((r) => r.principal)?.empresaId ?? '')
  const solidarias = pericia.reclamadas
    .filter((r) => !r.principal)
    .map((r) => porId.get(r.empresaId))
    .filter((e): e is Empresa => Boolean(e))

  let n = 0
  const secao = () => ++n

  const filhos: (Paragraph | Table)[] = [
    ...cabecalhoMarca(perito),
    h1(titulo),
    ...enderecamento(pericia.vara),
    ...(t.enderecamento?.trim() ? blocos(t.enderecamento) : []),

    h2(`${secao()}. Identificação do Processo`),
    tabela([
      fichaLinha('Processo nº', pericia.numeroProcesso),
      fichaLinha('Vara / Comarca', `${pericia.vara} — ${pericia.comarca}`),
      fichaLinha(
        'Reclamante',
        `${pericia.reclamante}${pericia.funcaoReclamante ? ` — ${pericia.funcaoReclamante}` : ''}`,
      ),
      fichaLinha(
        'Reclamada principal',
        principal ? `${principal.razaoSocial} — CNPJ ${principal.cnpj}` : '—',
      ),
      ...solidarias.map((e) => fichaLinha('Reclamada solidária', `${e.razaoSocial} — CNPJ ${e.cnpj}`)),
      fichaLinha(
        'Período contratual',
        `${data(pericia.admissao)} a ${pericia.demissao ? data(pericia.demissao) : 'atual'}`,
      ),
      fichaLinha('Modalidade da perícia', MODALIDADE_LABEL[pericia.modalidade] ?? pericia.modalidade),
    ]),

    h2(`${secao()}. Apresentação`),
    ...blocos(t.apresentacao),

    h2(`${secao()}. Objetivo da Perícia`),
    ...blocos(t.objetivoPericia),

    h2(`${secao()}. Da Vistoria`),
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
          children: [
            celula('Nome do Participante', { cabecalho: true }),
            celula('Qualificação / Representação', { cabecalho: true, largura: 32 }),
            celula('Atuação no Ato', { cabecalho: true, largura: 38 }),
          ],
        }),
        ...pericia.participantes.map(
          (pt) =>
            new TableRow({
              children: [
                celula(pt.nome),
                celula(PAPEL[pt.papel] ?? pt.papel),
                celula(ATUACAO[pt.papel] ?? '—'),
              ],
            }),
        ),
      ]),
    )
  }

  filhos.push(
    h2(`${secao()}. Descrição da Empresa`),
    ...blocos(t.descricaoEmpresa),
    h2(`${secao()}. Descrição do Ambiente de Trabalho`),
    ...blocos(t.descricaoAmbiente),
    h2(`${secao()}. Atividades e Funções Exercidas`),
    ...blocos(t.atividadesFuncoes),
  )

  if (t.periodos?.length) {
    filhos.push(
      tabela([
        new TableRow({
          children: [
            celula('Função', { cabecalho: true, largura: 28 }),
            celula('Setor', { cabecalho: true, largura: 18 }),
            celula('Período', { cabecalho: true, largura: 24 }),
            celula('Atividades', { cabecalho: true }),
          ],
        }),
        ...t.periodos.map(
          (pr) =>
            new TableRow({
              children: [
                celula(pr.funcao),
                celula(pr.setor || '—'),
                celula(`${data(pr.inicio)} a ${pr.fim ? data(pr.fim) : 'atual'}`),
                celula(pr.descricaoAtividades || '—'),
              ],
            }),
        ),
      ]),
    )
  }

  filhos.push(h2(`${secao()}. Agentes e Riscos Avaliados`))

  if (t.agentes?.length) {
    filhos.push(
      tabela([
        new TableRow({
          cantSplit: true,
          children: [
            celula('Agente', { cabecalho: true, largura: 28 }),
            celula('CAS', { cabecalho: true, largura: 9 }),
            celula('Anexo NR-15', { cabecalho: true, largura: 11 }),
            celula('Critério', { cabecalho: true, largura: 13 }),
            celula('Grau', { cabecalho: true, largura: 13 }),
            celula('Limite de Tolerância', { cabecalho: true, largura: 15 }),
            celula('Valor Medido', { cabecalho: true, largura: 11 }),
          ],
        }),
        ...t.agentes.map(
          (a) =>
            new TableRow({
              cantSplit: true,
              children: [
                celula(
                  [
                    a.nome,
                    a.atividadeEnquadrada?.trim()
                      ? `Atividade ou referência normativa: ${a.atividadeEnquadrada}`
                      : undefined,
                    ...episNaCelulaAgente(a.epis, a.epiEficaz),
                  ]
                    .filter(Boolean)
                    .join('\n'),
                ),
                celula(a.cas || '—'),
                celula(a.anexoNr15 || '—'),
                celula(CRITERIO[a.criterio] ?? a.criterio),
                celula(a.grau ? (GRAU[a.grau] ?? a.grau) : '—'),
                celula(limiteComUnidade(a.limiteTolerancia, a.unidadeLimite)),
                celula(formatarMedicao(a)),
              ],
            }),
        ),
      ]),
    )
  } else {
    filhos.push(new Paragraph({ children: [texto('[Nenhum agente cadastrado]', { italico: true })] }))
  }

  filhos.push(
    h2(`${secao()}. Normas e Referências Técnicas Utilizadas`),
    ...blocos(t.normasReferencias),
    h2(`${secao()}. Equipamentos e Procedimentos Analisados`),
    ...blocos(t.equipamentosAnalisados),
    h2(`${secao()}. Informações Levantadas na Vistoria`),
    ...blocos(t.informacoesLevantadas),
    h2(`${secao()}. Análise Técnica`),
    ...blocos(t.analiseTecnica),
  )

  // As fotos ficam no PDF; no editável entra a remissão, para o
  // arquivo não pesar dezenas de MB dentro do Word.
  if (pericia.fotos.length) {
    filhos.push(
      h2(`${secao()}. Relatório Fotográfico`),
      p(
        `O relatório fotográfico é composto por ${pericia.fotos.length} ${
          pericia.fotos.length === 1 ? 'figura' : 'figuras'
        }, organizadas por seção, e integra a versão em PDF deste documento.`,
      ),
    )
  }

  filhos.push(h2(`${secao()}. Conclusão`), ...blocos(t.conclusao))

  if (t.observacoesAdicionais?.trim()) {
    filhos.push(h2(`${secao()}. Observações Adicionais`), ...blocos(t.observacoesAdicionais))
  }

  filhos.push(
    pSemRecuo(
      'Sendo o que se apresenta para o momento, o signatário coloca-se à disposição deste MM. Juízo para os esclarecimentos que se fizerem necessários.',
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

  const filhos: (Paragraph | Table)[] = [...cabecalhoMarca(perito), h1('Quesitos Técnicos')]

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

  const filhos: (Paragraph | Table)[] = [...cabecalhoMarca(perito), h1(doc.titulo)]

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

  const filhos: (Paragraph | Table)[] = [...cabecalhoMarca(perito), h1('Esclarecimentos Técnicos')]

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
        ? docParecer(pericia, empresas, perito, doc.titulo)
        : [...cabecalhoMarca(perito), h1(doc.titulo), p('[A perícia vinculada não existe mais.]')]
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
