import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { DocumentoGerado, Empresa, Usuario } from '@prisma/client'
import JSZip from 'jszip'
import sharp from 'sharp'
import type { PericiaCompleta } from '../src/mappers.js'

const SAIDA = path.resolve(process.env.SAIDA_TESTE ?? './saida-teste/docx-layout')
const UPLOADS = path.join(SAIDA, 'uploads')

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL ??= 'postgresql://teste:teste@localhost:5432/teste'
process.env.JWT_SECRET ??= 'teste-layout-docx-segredo-com-mais-de-32-caracteres'
process.env.UPLOAD_DIR = UPLOADS

const imagemDeTeste = async (
  arquivo: string,
  largura: number,
  altura: number,
  fundo: string,
  rotulo: string,
) => {
  const svg = Buffer.from(
    `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${fundo}"/>
      <rect x="36" y="36" width="${largura - 72}" height="${altura - 72}" rx="24" fill="none" stroke="#ffffff" stroke-width="8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="64" font-weight="700">${rotulo}</text>
    </svg>`,
  )
  await sharp(svg).toFile(path.join(UPLOADS, arquivo))
}

async function main() {
  await fs.mkdir(UPLOADS, { recursive: true })
  await imagemDeTeste('foto-horizontal.png', 1400, 800, '#1F4D78', 'FOTO HORIZONTAL')
  await imagemDeTeste('foto-vertical.webp', 800, 1400, '#2E7D63', 'FOTO VERTICAL')
  await imagemDeTeste('foto-quadrada.png', 1100, 1100, '#7A5A00', 'FOTO QUADRADA')
  await imagemDeTeste('foto-panoramica.jpg', 1800, 650, '#7B2D45', 'FOTO PANORÂMICA')
  await imagemDeTeste('foto-documento.avif', 900, 1250, '#48566A', 'FOTO DOCUMENTO')
  await imagemDeTeste('foto-detalhe.png', 1250, 900, '#5B3F8C', 'FOTO DETALHE')

  const { gerarDocx } = await import('../src/services/docx.js')
  const { montarHtml } = await import('../src/services/documento-html.js')
  const { encerrarBrowser, gerarPdf } = await import('../src/services/pdf.js')

  const pericia = {
    id: 'per-layout',
    numeroProcesso: '1000000-00.2026.5.02.0001',
    vara: '1ª Vara do Trabalho',
    comarca: 'São Paulo/SP',
    reclamante: 'Pessoa de Teste',
    admissao: '2020-01-01',
    demissao: '2025-01-01',
    dataVistoria: '2026-08-18',
    horaVistoria: '09:00',
    horaFimVistoria: '10:30',
    localVistoria: 'Local de teste',
    modalidade: 'ambas',
    status: 'em_andamento',
    responsavelId: 'usr-layout',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    tecnico: {
      apresentacao: 'Apresentação do documento.',
      enderecamento: 'ENDEREÇAMENTO MANUAL LEGADO',
      objetivoPericia: 'OBJETIVO MANUAL LEGADO',
      descricaoEmpresa: 'Descrição da empresa.',
      descricaoAmbiente: 'Descrição do ambiente.',
      descricaoPostoTrabalho: 'Descrição do posto de trabalho.',
      maquinasFerramentas: 'Máquinas e ferramentas utilizadas.',
      produtosUtilizados: 'Produtos utilizados nas atividades.',
      atividadesFuncoes: 'Atividades exercidas.',
      periodos: [
        {
          id: 'periodo-1',
          funcao: 'Operador de Máquina Júnior',
          setor: 'UT Gomadeira — Papel',
          inicio: '2021-06-10',
          fim: '2023-09-30',
          descricaoAtividades: 'Trabalhou na linha contínua gomadeira.\nPreparou a cola em tanques.\nAbasteceu o equipamento.',
        },
        {
          id: 'periodo-2',
          funcao: 'Impressor Flexográfico',
          setor: 'UT Papel — Operação',
          inicio: '2023-10-01',
          fim: '2026-03-17',
          descricaoAtividades: 'Operou a máquina impressora.\nAnalisou os clichês antes da impressão.',
        },
      ],
      agentes: [],
      normasReferencias: 'NR-15.',
      equipamentosAnalisados: 'Equipamentos analisados.',
      informacoesLevantadas: 'Informações da vistoria.',
      divergenciasFaticas: 'Divergências fáticas registradas.',
      protecoesColetivas: 'Proteções coletivas avaliadas.',
      analiseTecnica: 'Análise técnica.',
      conclusao: 'Conclusão técnica.',
      conclusaoInsalubridade: 'Conclusão de insalubridade.',
      conclusaoPericulosidade: 'Conclusão de periculosidade.',
      respostasQuesitos: 'Respostas aos quesitos técnicos.',
      encerramento: 'Encerramento do parecer.',
    },
    reclamadas: [{ id: 'rec-layout', periciaId: 'per-layout', empresaId: 'emp-layout', principal: true }],
    participantes: [
      {
        id: 'participante-layout',
        periciaId: 'per-layout',
        empresaId: 'emp-layout',
        nome: 'Representante da Empresa',
        papel: 'preposto',
        registro: null,
        contato: null,
      },
    ],
    fotos: [
      {
        id: 'foto-1',
        periciaId: 'per-layout',
        secao: 'ambiente',
        arquivo: 'foto-horizontal.png',
        legenda: 'Vista geral do ambiente de trabalho',
        ordem: 0,
        criadoEm: new Date(),
      },
      {
        id: 'foto-2',
        periciaId: 'per-layout',
        secao: 'ambiente',
        arquivo: 'foto-vertical.webp',
        legenda: 'Detalhe vertical do ambiente, preservado sem distorção ou corte da fotografia original',
        ordem: 1,
        criadoEm: new Date(),
      },
      {
        id: 'foto-3',
        periciaId: 'per-layout',
        secao: 'equipamentos',
        arquivo: 'foto-quadrada.png',
        legenda: 'Máquina e equipamentos observados durante a diligência',
        ordem: 2,
        criadoEm: new Date(),
      },
      {
        id: 'foto-4',
        periciaId: 'per-layout',
        secao: 'equipamentos',
        arquivo: 'foto-panoramica.jpg',
        legenda: 'Vista panorâmica do setor produtivo e da disposição dos equipamentos',
        ordem: 3,
        criadoEm: new Date(),
      },
      {
        id: 'foto-5',
        periciaId: 'per-layout',
        secao: 'epi',
        arquivo: 'foto-documento.avif',
        legenda: 'Registro documental relacionado aos equipamentos de proteção individual',
        ordem: 4,
        criadoEm: new Date(),
      },
      {
        id: 'foto-6',
        periciaId: 'per-layout',
        secao: 'epi',
        arquivo: 'foto-detalhe.png',
        legenda: 'Detalhe dos equipamentos de proteção apresentados durante a vistoria',
        ordem: 5,
        criadoEm: new Date(),
      },
    ],
  } as unknown as PericiaCompleta

  const empresa = {
    id: 'emp-layout',
    razaoSocial: 'Empresa de Teste Ltda.',
    cnpj: '00.000.000/0001-00',
    endereco: 'Rua de Teste',
    cidade: 'São Paulo',
    uf: 'SP',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  } as Empresa

  const perito = {
    id: 'usr-layout',
    nome: 'Perito de Teste',
    email: 'perito@example.com',
    senhaHash: '',
    perfil: 'admin',
    ativo: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  } as Usuario

  const documento = {
    id: 'doc-layout',
    tipo: 'parecer',
    titulo: 'Parecer Técnico Pericial',
    periciaId: pericia.id,
    numeroProcesso: pericia.numeroProcesso,
    reclamante: pericia.reclamante,
    empresaPrincipal: empresa.razaoSocial,
    status: 'finalizado',
    criadoPorId: perito.id,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  } as DocumentoGerado

  const buffer = await gerarDocx(documento, pericia, [empresa], perito)
  await fs.writeFile(path.join(SAIDA, 'parecer-layout.docx'), buffer)
  const html = await montarHtml(documento, pericia, [empresa], perito)
  const pdf = await gerarPdf(html)
  await fs.writeFile(path.join(SAIDA, 'parecer-layout.pdf'), pdf)
  await encerrarBrowser()

  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file('word/document.xml')!.async('string')
  const imagens = Object.entries(zip.files)
    .filter(([nome, entrada]) => /^word\/media\/.+/.test(nome) && !entrada.dir)
    .map(([nome]) => nome)

  assert.doesNotMatch(
    xml,
    /PLATAFORMA INTELIGENTE DE PERÍCIA TRABALHISTA|— P E R Í C I A —/,
    'parecer e laudo não devem ter a capa da plataforma',
  )
  const ordemAbertura = [
    'EXCELENTÍSSIMO',
    'Processo',
    'PARECER TÉCNICO PERICIAL',
    'APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA',
    '1. OBJETO DA PERÍCIA E DADOS CONTRATUAIS',
    '2. DA DILIGÊNCIA TÉCNICA PERICIAL',
  ].map((trecho) => xml.indexOf(trecho))
  assert.ok(
    ordemAbertura.every((indice) => indice >= 0) &&
      ordemAbertura.every((indice, i) => i === 0 || indice > ordemAbertura[i - 1]),
    `abertura do DOCX fora da estrutura aprovada: ${ordemAbertura.join(', ')}`,
  )
  const estruturaEnxuta = [
    '1. OBJETO DA PERÍCIA E DADOS CONTRATUAIS',
    '2. DA DILIGÊNCIA TÉCNICA PERICIAL',
    '3. DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA',
    '4. CRITÉRIOS TÉCNICOS PARA AVALIAÇÃO PERICIAL',
    '5. METODOLOGIA DE AVALIAÇÃO',
    '6. DESCRIÇÃO DO POSTO DE TRABALHO, MÁQUINAS, FERRAMENTAS E PRODUTOS',
    '7. HISTÓRICO LABORAL, PERÍODOS E ATIVIDADES HABITUAIS EXERCIDAS',
    '8. DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (NR-06)',
    '9. DAS PROTEÇÕES COLETIVAS',
    '10. ANÁLISE TÉCNICA DOS AGENTES, ATIVIDADES E RISCOS IDENTIFICADOS',
    '11. NR-15 — CONCLUSÃO E FUNDAMENTAÇÃO',
    '12. NR-16 — CONCLUSÃO E FUNDAMENTAÇÃO',
    '13. RESPOSTAS AOS QUESITOS TÉCNICOS',
    '14. ENCERRAMENTO',
  ].map((trecho) => xml.indexOf(trecho))
  assert.ok(
    estruturaEnxuta.every((indice) => indice >= 0) &&
      estruturaEnxuta.every((indice, i) => i === 0 || indice > estruturaEnxuta[i - 1]),
    `estrutura enxuta do DOCX fora da ordem aprovada: ${estruturaEnxuta.join(', ')}`,
  )
  assert.doesNotMatch(xml, /RELATÓRIO FOTOGRÁFICO/)
  assert.doesNotMatch(xml, /ENDEREÇAMENTO MANUAL LEGADO|OBJETIVO MANUAL LEGADO/)
  assert.match(xml, /Analisar tecnicamente a eventual caracterização da insalubridade/)
  assert.match(xml, /das 09:00 às 10:30/)
  assert.match(xml, /Preposto — Empresa de Teste Ltda\./)
  assert.match(xml, /6\.1\. Descrição do Posto de Trabalho/)
  assert.match(html, /das 09:00 às 10:30/)
  assert.match(html, /Preposto — Empresa de Teste Ltda\./)
  assert.match(html, /Função: Operador de Máquina Júnior/)
  assert.match(html, /<ul class="atividades-periodo">\s*<li>Trabalhou na linha contínua gomadeira\.<\/li>/)
  assert.doesNotMatch(html, /<th[^>]*>Atividades<\/th>/)
  assert.match(xml, /Função: Operador de Máquina Júnior/)
  assert.ok(
    (xml.match(/<w:numPr>/g) ?? []).length >= 5,
    'cada atividade dos períodos deve ser apresentada como item de lista no DOCX',
  )

  const fotoAmbiente = xml.indexOf('Figura 1 — Vista geral do ambiente de trabalho')
  const secao3 = xml.indexOf('3. DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA')
  const secao4 = xml.indexOf('4. CRITÉRIOS TÉCNICOS PARA AVALIAÇÃO PERICIAL')
  assert.ok(secao3 < fotoAmbiente && fotoAmbiente < secao4, 'foto do ambiente deve permanecer na seção 3')
  const fotoEpi = xml.indexOf('Figura 5 — Registro documental relacionado aos equipamentos de proteção individual')
  const secao8 = xml.indexOf('8. DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (NR-06)')
  const secao9 = xml.indexOf('9. DAS PROTEÇÕES COLETIVAS')
  assert.ok(secao8 < fotoEpi && fotoEpi < secao9, 'foto de EPI deve permanecer na seção 8')

  assert.equal(
    (xml.match(/<wp:inline\b/g) ?? []).length,
    7,
    'o logo oficial e todas as fotos devem ser incluídos inline',
  )
  assert.doesNotMatch(xml, /<wp:anchor\b/, 'imagens flutuantes não são permitidas')
  assert.equal(imagens.length, 7, 'o logo oficial e cada foto devem ser incorporados ao DOCX')
  assert.match(xml, /Figura 1 — Vista geral do ambiente de trabalho/)
  assert.match(xml, /Figura 2 — Detalhe vertical do ambiente/)
  assert.match(xml, /Figura 6 — Detalhe dos equipamentos de proteção apresentados durante a vistoria/)
  assert.doesNotMatch(xml, /w:type="pct"/, 'tabelas percentuais variam entre renderizadores')
  assert.match(xml, /<w:tblW w:type="dxa"/)
  assert.match(xml, /<w:keepNext\/?>/, 'a imagem deve permanecer unida à legenda')
  assert.ok(
    (xml.match(/<w:cantSplit\/?>/g) ?? []).length >= 6,
    'cada figura deve formar um bloco indivisível para respeitar as margens na quebra de página',
  )

  console.log('DOCX layout: logo oficial e 6 fotos inline, legendas vinculadas e tabelas em DXA — ok')
  console.log(`arquivo de inspeção: ${path.join(SAIDA, 'parecer-layout.docx')}`)
  console.log(`PDF de inspeção: ${path.join(SAIDA, 'parecer-layout.pdf')}`)
}

main().catch((erro) => {
  console.error('FALHOU:', erro)
  process.exit(1)
})
