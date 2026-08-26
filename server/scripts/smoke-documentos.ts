// ============================================================
// Smoke test do motor de documentos — roda sem banco.
//
//   npm run smoke
//
// Monta uma perícia sintética, gera os quatro tipos de documento
// em PDF e DOCX e confere: assinatura binária dos arquivos, escape
// de HTML no conteúdo e numeração sequencial das seções. Os
// arquivos ficam em ./saida-teste para inspeção visual.
// ============================================================
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import type { DocumentoGerado, Empresa, Usuario } from '@prisma/client'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import type { PericiaCompleta } from '../src/mappers.js'
import { montarHtml } from '../src/services/documento-html.js'
import { gerarDocx } from '../src/services/docx.js'
import { encerrarBrowser, gerarPdf } from '../src/services/pdf.js'

const SAIDA = process.env.SAIDA_TESTE ?? './saida-teste'

const perito = {
  id: 'usr-1',
  nome: 'Dinoel R. Santos',
  email: 'dinoel@drpericiaelite.com.br',
  senhaHash: '',
  perfil: 'admin',
  registroProfissional: 'CREA-SP 5069874521',
  titulo: 'Engenheiro de Segurança do Trabalho',
  telefone: '(11) 97121-4323',
  ativo: true,
  ultimoAcesso: new Date(),
  criadoEm: new Date(),
  atualizadoEm: new Date(),
} as Usuario

const empresa = {
  id: 'emp-1',
  razaoSocial: 'Metalúrgica Ferrante Indústria e Comércio Ltda.',
  nomeFantasia: 'Ferrante Metais',
  cnpj: '12.345.678/0001-90',
  cnae: '25.39-0-01',
  grauRisco: '3',
  endereco: 'Rodovia Anhanguera, km 32',
  numero: 's/n',
  complemento: null,
  bairro: 'Distrito Industrial',
  cidade: 'Cajamar',
  uf: 'SP',
  cep: '07750-000',
  contatoNome: 'Eng. Roberto Manzi',
  contatoEmail: 'sesmt@ferrantemetais.com.br',
  contatoTelefone: '(11) 4446-8800',
  ramoAtividade: 'Usinagem e tratamento de superfície',
  criadoEm: new Date(),
  atualizadoEm: new Date(),
} as Empresa

// Guardado sem o cast para que os casos derivados (a perícia enxuta
// lá embaixo) consigam alterar campos de `tecnico` sem brigar com o
// JsonValue do Prisma.
const periciaBase = {
  id: 'per-1',
  numeroProcesso: '1001234-56.2025.5.02.0071',
  vara: '71ª Vara do Trabalho de São Paulo',
  comarca: 'São Paulo/SP',
  reclamante: 'José Aparecido da Silva',
  cpfReclamante: '123.456.789-00',
  funcaoReclamante: 'Operador de Máquinas',
  admissao: '2018-03-12',
  demissao: '2024-11-08',
  dataAjuizamento: '2026-06-10',
  dataVistoria: '2026-07-15',
  horaVistoria: '09:30',
  localVistoria: 'Rodovia Anhanguera, km 32 — Cajamar/SP',
  numeroVistoria: '125',
  modalidade: 'ambas',
  status: 'em_andamento',
  responsavelId: 'usr-1',
  criadoEm: new Date(),
  atualizadoEm: new Date(),
  tecnico: {
    apresentacao:
      'O signatário, Engenheiro de Segurança do Trabalho registrado no CREA-SP sob o nº 5069874521, nomeado por este MM. Juízo para atuar como Perito Judicial nos autos em epígrafe, vem apresentar o presente PARECER TÉCNICO PERICIAL.\n\nO trabalho foi elaborado a partir da vistoria realizada no ambiente de trabalho e da análise da documentação acostada aos autos.',
    enderecamento: '',
    objetivoPericia:
      'Verificar a existência de agentes insalubres no ambiente de trabalho do Reclamante, com enquadramento nos anexos da NR-15 da Portaria MTb nº 3.214/78.',
    descricaoEmpresa:
      'A Reclamada atua no ramo de usinagem e tratamento de superfície de peças metálicas, ocupando galpão industrial de aproximadamente 4.200 m², com pé-direito de 9 metros.',
    descricaoAmbiente:
      'Galpão industrial de alvenaria com estrutura metálica, piso em concreto polido, cobertura em telhas metálicas, ventilação natural por sheds complementada por exaustão mecânica localizada.',
    descricaoPostoTrabalho: 'Posto fixo junto aos tornos CNC, com bancada de apoio e circulação delimitada.',
    maquinasFerramentas: 'Tornos CNC, retífica plana, paquímetro e ponte rolante.',
    produtosUtilizados: 'Fluido de corte solúvel e óleo lubrificante mineral.',
    atividadesFuncoes: 'Operação de tornos CNC e retíficas, com manuseio de fluidos de corte.',
    periodos: [
      {
        id: 'prd-1',
        funcao: 'Auxiliar de Produção',
        setor: 'Usinagem',
        inicio: '2018-03-12',
        fim: '2020-06-30',
        descricaoAtividades: 'Apoio à operação e movimentação de peças.',
      },
      {
        id: 'prd-2',
        funcao: 'Operador de Máquinas',
        setor: 'Usinagem',
        inicio: '2020-07-01',
        fim: '2024-11-08',
        descricaoAtividades: 'Operação de tornos CNC com uso de fluido de corte solúvel.',
      },
    ],
    agentes: [
      {
        id: 'agn-1',
        nome: 'Óleos minerais (névoa)',
        tipo: 'quimico',
        cas: '8012-95-1',
        anexoNr15: 'Anexo 13',
        criterio: 'qualitativo',
        grau: 'medio',
        observacao: 'Análise técnica editável dos óleos minerais.',
      },
      {
        id: 'agn-2',
        nome: 'Ruído',
        tipo: 'fisico',
        anexoNr15: 'ANEXO_01',
        cas: 'não aplicável',
        limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
        valorMedido: '90',
        medicaoEmpresa: '83',
        medicaoEmpresaAte: '88.5',
        origemMedicao: 'perito',
        unidadeMedicao: 'dB(A)',
        epis: [{
          categoria: 'Proteção auditiva', modelo: 'Protetor auditivo CA 11882', marca: 'Não informada',
          caUnico: '11882', nivelProtecaoDb: 17, metodoAtenuacao: 'NRRsf',
        }],
        criterio: 'quantitativo',
        grau: 'medio',
      },
      {
        id: 'agn-medicao',
        nome: 'Acetaldeído',
        tipo: 'quimico',
        cas: '75-07-0',
        anexoNr15: 'Anexo 11',
        unidadeLimite: 'ppm',
        limiteTolerancia: '78 ppm',
        medido: 'registro legado que não deve prevalecer',
        valorMedido: '12.5',
        unidadeMedicao: 'ppm',
        epiEficaz: true,
        epis: [
          {
            catalogoId: 'epi-duplo-historico',
            categoria: 'Proteção respiratória',
            modelo: 'Respirador reutilizável',
            marca: 'Marca histórica',
            caPecaFacial: '4115',
            caFiltroCartucho: '5635',
          },
          {
            catalogoId: 'epi-unico-historico',
            categoria: 'Proteção respiratória',
            modelo: 'PFF2',
            marca: 'Marca histórica',
            caUnico: '5657',
          },
        ],
        criterio: 'quantitativo',
        grau: 'medio',
      },
      {
        id: 'agn-vibracao',
        nome: 'Vibração em mãos e braços',
        tipo: 'fisico',
        anexoNr15: 'ANEXO_08_VMB',
        limiteTolerancia: 'aren = 5,0 m/s²',
        valorMedido: '4.2',
        unidadeMedicao: 'm/s²',
        criterio: 'quantitativo',
        grau: 'medio',
      },
      {
        id: 'agn-oxigenio',
        nome: 'Oxigênio',
        tipo: 'quimico',
        anexoNr15: 'Anexo 11',
        unidadeLimite: '% O₂ em volume',
        limiteTolerancia: '18 % O₂ em volume',
        valorMedido: '18',
        unidadeMedicao: '% O₂ em volume',
        criterio: 'quantitativo',
        grau: 'nao_caracterizado',
      },
      {
        id: 'agn-medicao-sem-unidade',
        nome: 'Índice adimensional',
        tipo: 'fisico',
        medido: 'legado sem unidade que não deve prevalecer',
        valorMedido: '7.25',
        criterio: 'quantitativo',
        grau: 'nao_caracterizado',
      },
      {
        id: 'agn-11',
        nome: 'Ácido crômico (névoa)',
        tipo: 'quimico',
        anexoNr15: 'Anexo 11',
        referenciaNormativaId: 'ANEXO_11_ACIDO_CROMICO_NEVOA',
        atividadeEnquadrada: 'Valor teto. <referência especial & controlada>.',
        unidadeLimite: 'mg/m³',
        limiteTolerancia: '0,04 mg/m³',
        criterio: 'quantitativo',
        grau: 'maximo',
      },
      {
        id: 'agn-13',
        nome: 'CROMO — Cromagem eletrolítica',
        tipo: 'quimico',
        anexoNr15: 'Anexo 13',
        referenciaNormativaId: 'ANEXO_13_CROMO_MED_01',
        atividadeEnquadrada: 'Cromagem eletrolítica dos metais.',
        criterio: 'qualitativo',
        grau: 'medio',
      },
      {
        id: 'agn-14',
        nome: 'Lixo urbano',
        tipo: 'biologico',
        anexoNr15: 'Anexo 14',
        referenciaNormativaId: 'ANEXO_14_MAX_LIXO_URBANO',
        atividadeEnquadrada: 'Trabalho ou operações, em contato permanente com: lixo urbano (coleta e industrialização).',
        criterio: 'qualitativo',
        grau: 'maximo',
      },
      {
        id: 'ris-16-inflamaveis',
        nome: 'Inflamáveis',
        tipo: 'periculosidade',
        anexoNr16: 'ANEXO_02',
        atividadeEnquadrada: 'Operação em postos de serviço e bombas de abastecimento',
        areaRisco: 'Área de operação da bomba de inflamáveis líquidos',
        exposicaoPericulosidade: 'intermitente',
        resultadoPericulosidade: 'caracterizada',
        criterio: 'qualitativo',
      },
    ],
    normasReferencias:
      'Portaria MTb nº 3.214/78 — NR-15 e NR-16; NHO-01 e NHO-06 da FUNDACENTRO; NR-06; NR-09.',
    equipamentosAnalisados: 'Audiodosímetro digital, termômetro de globo, fichas de EPI.',
    informacoesLevantadas:
      'Foram apresentadas fichas de entrega de EPI referentes ao período de 2019 a 2024, com lacunas em 2018.',
    divergenciasFaticas: '',
    alegacoesReclamante: 'O Reclamante apresentou sua versão das atividades.',
    informacoesReclamada: 'A Reclamada apresentou sua versão das atividades.',
    consideracoesDivergencias: 'As versões foram confrontadas com os elementos técnicos disponíveis.',
    criterioAvaliacaoPericulosidade:
      'A caracterização da periculosidade é realizada mediante avaliação qualitativa.',
    notaTecnicaEpis: 'Nota Técnica sobre a Primazia da Realidade.',
    protecoesColetivas: 'Exaustão localizada junto aos pontos de geração de névoa e enclausuramento parcial.',
    analiseTecnica:
      'A exposição habitual a névoas de óleo mineral, sem neutralização comprovada, atrai o enquadramento qualitativo do Anexo 13 da NR-15.\n\nRegistra-se que o simples fornecimento de EPI não elide o adicional, nos termos das Súmulas 80 e 289 do C. TST.',
    conclusao:
      'Diante de todo o exposto, conclui este Perito pela CARACTERIZAÇÃO da insalubridade em GRAU MÉDIO (20%), com fundamento no Anexo 13 da NR-15, durante todo o período laborado.',
    conclusaoInsalubridade: 'Caracteriza-se a insalubridade em grau médio, nos termos da NR-15.',
    conclusaoPericulosidade: 'Não se caracteriza a periculosidade, nos termos da NR-16.',
    respostasQuesitos: 'Os quesitos técnicos foram respondidos conforme os elementos colhidos na diligência.',
    encerramento: 'O presente parecer é encerrado com as conclusões técnicas acima consignadas. Aspas "duplas", <tags> e & comercial.',
    observacoesAdicionais: 'Aspas "duplas", <tags> e & comercial para testar o escape.',
  },
  reclamadas: [{ id: 'rec-1', periciaId: 'per-1', empresaId: 'emp-1', principal: true }],
  participantes: [
    {
      id: 'par-1',
      periciaId: 'per-1',
      nome: 'Dr. Fábio Toledo',
      papel: 'advogado_reclamante',
      registro: 'OAB/SP 210.334',
      contato: null,
    },
    {
      id: 'par-2',
      periciaId: 'per-1',
      nome: 'Eng. Roberto Manzi',
      papel: 'assistente_reclamada',
      registro: 'CREA-SP 0601223344',
      contato: null,
    },
  ],
  fotos: [],
}

const pericia = periciaBase as unknown as PericiaCompleta

const doc = (tipo: string, titulo: string, conteudo: unknown): DocumentoGerado =>
  ({
    id: `doc-${tipo}`,
    tipo,
    titulo,
    periciaId: 'per-1',
    numeroProcesso: pericia.numeroProcesso,
    reclamante: pericia.reclamante,
    empresaPrincipal: 'Ferrante Metais',
    status: 'finalizado',
    conteudo,
    anexoExternoNome: null,
    anexoExternoArquivo: null,
    enviadoPara: null,
    enviadoEm: null,
    criadoPorId: 'usr-1',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  }) as unknown as DocumentoGerado

const CASOS = [
  {
    nome: 'parecer',
    doc: doc('parecer', 'Parecer Técnico Pericial — Insalubridade', null),
  },
  {
    nome: 'laudo',
    doc: doc('laudo', 'Laudo Técnico Pericial — Insalubridade', null),
  },
  {
    nome: 'quesitos',
    doc: doc('quesitos', 'Quesitos Técnicos — Agentes Químicos', {
      quesitos: [
        {
          pergunta: 'Queira o Sr. Perito informar a função exercida pelo Reclamante.',
          resposta:
            'O Reclamante exerceu a função de Operador de Máquinas, no período de 12/03/2018 a 08/11/2024.',
        },
        {
          pergunta: 'Diga o Sr. Perito se as atividades são insalubres nos termos da NR-15.',
          resposta: 'Sim. As atividades enquadram-se no Anexo 13 da NR-15.',
        },
      ],
    }),
  },
  {
    nome: 'impugnacao',
    doc: doc('impugnacao', 'Impugnação ao Laudo Pericial — Ruído', {
      agente: 'ruido',
      posicionamento: 'impugnacao_laudo',
      fundamentacao:
        'A avaliação da exposição ao ruído rege-se pelo Anexo 1 da NR-15 e pela NHO-01 da FUNDACENTRO.',
      blocos: [
        {
          titulo: 'Amostragem não representativa da jornada',
          conteudo:
            'A amostragem realizada não abrangeu período representativo da jornada efetivamente cumprida.',
        },
        {
          titulo: 'Ausência de análise do NRRsf',
          conteudo:
            'O laudo considerou neutralizada a exposição pelo simples fornecimento de protetor auricular.',
        },
      ],
      encerramento:
        'Ante o exposto, requer seja acolhida a presente IMPUGNAÇÃO, nos termos do art. 477, §2º, do CPC.',
    }),
  },
  {
    nome: 'manifestacao',
    doc: doc('manifestacao', 'Manifestação ao Laudo Pericial — Ruído', {
      agente: 'ruido',
      posicionamento: 'concordancia',
      fundamentacao:
        'A avaliação da exposição ao ruído rege-se pelo Anexo 1 da NR-15 e pela NHO-01 da FUNDACENTRO.',
      blocos: [
        {
          titulo: 'Metodologia tecnicamente adequada',
          conteudo: 'A avaliação considerou período representativo da jornada e equipamento calibrado.',
        },
      ],
      encerramento: 'Ante o exposto, manifesta concordância com as conclusões técnicas apresentadas.',
    }),
  },
  {
    nome: 'esclarecimento',
    doc: doc('esclarecimento', 'Esclarecimentos Técnicos — Ruído', {
      agente: 'ruido',
      referencia: 'Id. 4a7b2c1 — manifestação da reclamada',
      introducao:
        'O signatário, intimado a prestar esclarecimentos, vem manifestar-se nos seguintes termos.',
      pontos: [
        {
          origem: 'juizo',
          questionamento: 'Qual o instrumento utilizado e seu certificado de calibração?',
          resposta: 'Audiodosímetro digital, certificado nº 2026/0417, válido até 04/2027.',
        },
      ],
      conclusao: 'Ante o exposto, o signatário RATIFICA integralmente as conclusões do laudo.',
    }),
  },
]

async function main() {
  await fs.mkdir(SAIDA, { recursive: true })
  const resumo: string[] = []
  const saidasVisuais: { nome: string; html: string; xml: string; paginasPdf: number }[] = []

  for (const caso of CASOS) {
    const html = await montarHtml(caso.doc, pericia, [empresa], perito)
    await fs.writeFile(path.join(SAIDA, `${caso.nome}.html`), html, 'utf8')

    const pdf = await gerarPdf(html)
    await fs.writeFile(path.join(SAIDA, `${caso.nome}.pdf`), pdf)

    const docx = await gerarDocx(caso.doc, pericia, [empresa], perito)
    await fs.writeFile(path.join(SAIDA, `${caso.nome}.docx`), docx)
    const pacoteDocx = await JSZip.loadAsync(docx)
    const xml = await pacoteDocx.file('word/document.xml')!.async('string')
    const paginasPdf = (await PDFDocument.load(pdf)).getPageCount()
    saidasVisuais.push({ nome: caso.nome, html, xml, paginasPdf })

    const assinaturaPdf = pdf.subarray(0, 5).toString('latin1')
    const assinaturaDocx = docx.subarray(0, 2).toString('latin1')

    resumo.push(
      `${caso.nome.padEnd(16)} html ${String(html.length).padStart(6)}B  ` +
        `pdf ${String(pdf.length).padStart(7)}B ${assinaturaPdf === '%PDF-' ? 'ok' : 'INVÁLIDO'}  ` +
        `docx ${String(docx.length).padStart(6)}B ${assinaturaDocx === 'PK' ? 'ok' : 'INVÁLIDO'}`,
    )
  }

  const htmlParecer = await fs.readFile(path.join(SAIDA, 'parecer.html'), 'utf8')
  const parecerGerado = saidasVisuais.find((saida) => saida.nome === 'parecer')

  const periciaRegistros = {
    ...periciaBase,
    tecnico: {
      ...periciaBase.tecnico,
      agentes: [{
        id: 'agn-registros-processo',
        nome: 'Ruído contínuo ou intermitente',
        tipo: 'fisico',
        anexoNr15: 'ANEXO_01',
        limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
        tipoMedicaoEmpresa: 'registros_processo',
        origemMedicao: 'nao_informado',
        unidadeMedicao: 'dB(A)',
        criterio: 'quantitativo',
        grau: 'medio',
      }],
    },
  } as unknown as PericiaCompleta
  const parecerRegistros = doc('parecer', 'Parecer Técnico Pericial — Medição documental', null)
  const htmlRegistros = await montarHtml(parecerRegistros, periciaRegistros, [empresa], perito)
  const pdfRegistros = await gerarPdf(htmlRegistros)
  const docxRegistros = await gerarDocx(parecerRegistros, periciaRegistros, [empresa], perito)
  const pacoteRegistros = await JSZip.loadAsync(docxRegistros)
  const xmlRegistros = await pacoteRegistros.file('word/document.xml')!.async('string')
  await fs.writeFile(path.join(SAIDA, 'parecer-medicao-registros.html'), htmlRegistros, 'utf8')
  await fs.writeFile(path.join(SAIDA, 'parecer-medicao-registros.pdf'), pdfRegistros)
  await fs.writeFile(path.join(SAIDA, 'parecer-medicao-registros.docx'), docxRegistros)

  assert.doesNotMatch(htmlParecer, />Tramitação</, 'o PDF não deve repetir a modalidade no campo Tramitação')
  assert.doesNotMatch(
    parecerGerado?.xml ?? '',
    />Tramitação</,
    'o DOCX não deve repetir a modalidade no campo Tramitação',
  )
  assert.match(htmlParecer, /Anexo 2 — Atividades e Operações Perigosas com Inflamáveis/)
  assert.match(htmlParecer, /Periculosidade caracterizada/)
  assert.match(parecerGerado?.xml ?? '', /Anexo 2 — Atividades e Operações Perigosas com Inflamáveis/)
  assert.match(parecerGerado?.xml ?? '', /Periculosidade caracterizada/)
  assert.doesNotMatch(htmlParecer, /Medição (?:da empresa|do perito) \(não adotada\)/)
  assert.doesNotMatch(parecerGerado?.xml ?? '', /Medição (?:da empresa|do perito) \(não adotada\)/)
  assert.match(htmlRegistros, /<th>Medição da empresa – PGR \/ Laudos Ocupacionais<\/th><td[^>]*>Medição conforme registros apresentados junto ao processo\.<\/td>/)
  assert.match(xmlRegistros, /Medição conforme registros apresentados junto ao processo\./)
  assert.doesNotMatch(htmlRegistros, /opção adotada/i)
  assert.doesNotMatch(xmlRegistros, /opção adotada/i)
  assert.match(htmlParecer, /7\.4\.1\. Alegações do Reclamante/)
  assert.match(htmlParecer, /7\.4\.2\. Informações prestadas pela Reclamada/)
  assert.match(htmlParecer, /7\.5\. Considerações sobre as divergências fáticas/)
  assert.match(parecerGerado?.xml ?? '', /7\.4\.1\. Alegações do Reclamante/)
  assert.match(htmlParecer, /Rodovia Anhanguera, km 32 — Cajamar\/SP, nº 125/)
  assert.match(htmlParecer, /7\.2\.1\. Agente Químico — Óleos minerais \(névoa\)/)
  assert.match(htmlParecer, /Análise técnica editável dos óleos minerais\./)
  assert.match(htmlParecer, /7\.3\.1\. Critério de Avaliação/)
  assert.match(htmlParecer, /Nota Técnica sobre a Primazia da Realidade\./)
  assert.match(parecerGerado?.xml ?? '', /7\.2\.1\. Agente Químico — Óleos minerais \(névoa\)/)
  assert.match(parecerGerado?.xml ?? '', /7\.3\.1\. Critério de Avaliação/)
  assert.match(parecerGerado?.xml ?? '', /Nota Técnica sobre a Primazia da Realidade\./)
  assert.match(htmlParecer, /Período avaliado/)
  assert.match(parecerGerado?.xml ?? '', /Período avaliado/)
  assert.doesNotMatch(htmlParecer, /cinco anos anteriores ao ajuizamento da ação/i)
  assert.doesNotMatch(parecerGerado?.xml ?? '', /cinco anos anteriores ao ajuizamento da ação/i)

  const periciaPericulosidade = {
    ...periciaBase,
    modalidade: 'periculosidade',
    tecnico: {
      ...periciaBase.tecnico,
      agentes: periciaBase.tecnico.agentes.filter((agente) => agente.tipo === 'periculosidade'),
      objetivoPericia:
        'Apurar a existência, ou não, de atividades ou operações perigosas, nos termos do artigo 193 da CLT e da NR-16 da Portaria MTb nº 3.214/78.',
      normasReferencias: 'NR-16 — Atividades e Operações Perigosas, e seus Anexos.',
      equipamentosAnalisados:
        'Avaliação qualitativa das atividades, da área de risco e da frequência de exposição observadas na diligência.',
      analiseTecnica:
        'A operação em bomba de abastecimento foi examinada em conjunto com a delimitação da área de risco e a exposição intermitente constatada.',
      conclusaoInsalubridade: '',
      conclusaoPericulosidade: 'Caracteriza-se a periculosidade nos termos do Anexo 2 da NR-16.',
      respostasQuesitos: '',
    },
  } as unknown as PericiaCompleta
  const documentoPericulosidade = doc(
    'parecer',
    'Parecer Técnico Pericial — Periculosidade',
    null,
  )
  const htmlPericulosidade = await montarHtml(
    documentoPericulosidade,
    periciaPericulosidade,
    [empresa],
    perito,
  )
  const docxPericulosidade = await gerarDocx(
    documentoPericulosidade,
    periciaPericulosidade,
    [empresa],
    perito,
  )
  const pdfPericulosidade = await gerarPdf(htmlPericulosidade)
  const pacotePericulosidade = await JSZip.loadAsync(docxPericulosidade)
  const xmlPericulosidade = await pacotePericulosidade.file('word/document.xml')!.async('string')
  await fs.writeFile(path.join(SAIDA, 'parecer-periculosidade.html'), htmlPericulosidade, 'utf8')
  await fs.writeFile(path.join(SAIDA, 'parecer-periculosidade.docx'), docxPericulosidade)
  await fs.writeFile(path.join(SAIDA, 'parecer-periculosidade.pdf'), pdfPericulosidade)

  for (const conteudo of [htmlPericulosidade, xmlPericulosidade]) {
    assert.doesNotMatch(conteudo, /NR-15 — (?:AVALIAÇÃO|CONCLUSÃO)/i)
    assert.match(conteudo, /7\.2\. NR-16 — (?:Avaliação|AVALIAÇÃO)/)
    assert.match(conteudo, /11\. NR-16 — (?:Conclusão|CONCLUSÃO)/)
    assert.match(conteudo, /12\. (?:Encerramento|ENCERRAMENTO)/)
  }

  for (const saida of saidasVisuais) {
    assert.match(
      saida.html,
      /<header class="marca">[\s\S]*?<img class="logo-oficial" src="data:image\/jpeg;base64,/,
      `${saida.nome}: o documento deve usar o logo oficial aprovado`,
    )
    assert.match(
      saida.html,
      /--documento-titulo:\s*#2C3E50/,
      `${saida.nome}: título deve usar o grafite do padrão de referência`,
    )
    assert.match(
      saida.html,
      /--documento-secao:\s*#2C3E50/,
      `${saida.nome}: seções devem usar o azul-ardósia sóbrio do padrão vigente`,
    )
    assert.match(
      saida.html,
      /h1\s*\{[^}]*border-bottom:\s*2px solid var\(--documento-titulo\)/s,
      `${saida.nome}: título principal deve ter a linha inferior do padrão`,
    )
    assert.match(
      saida.html,
      /th\s*\{[^}]*background:\s*var\(--documento-tabela\)/s,
      `${saida.nome}: cabeçalhos das tabelas devem ter fundo padronizado`,
    )
    assert.doesNotMatch(
      saida.xml,
      /PLATAFORMA INTELIGENTE DE PERÍCIA TRABALHISTA|— P E R Í C I A —/,
      `${saida.nome}: DOCX não deve reconstruir o logo oficial com texto`,
    )
    assert.match(
      saida.xml,
      /Logo oficial D&amp;R Perícia Trabalhista/,
      `${saida.nome}: DOCX deve embutir a arte oficial como imagem`,
    )
    assert.match(
      saida.xml,
      /<w:bottom[^>]*w:color="2C3E50"/,
      `${saida.nome}: título do DOCX deve ter linha inferior grafite`,
    )
    assert.match(
      saida.xml,
      /<w:color w:val="2C3E50"/,
      `${saida.nome}: títulos de seção do DOCX devem usar o azul-ardósia vigente`,
    )
    assert.match(
      saida.xml,
      /<w:shd[^>]*w:fill="EFF1F4"/,
      `${saida.nome}: tabelas do DOCX devem usar o fundo cinza-claro padronizado`,
    )
  }

  assert.equal(
    saidasVisuais.find((saida) => saida.nome === 'impugnacao')?.paginasPdf,
    1,
    'a assinatura da impugnação não deve ficar órfã em uma segunda página',
  )
  assert.ok(
    (saidasVisuais.find((saida) => saida.nome === 'parecer')?.paginasPdf ?? Infinity) <= 9,
    'o parecer completo de teste não deve crescer além de nove páginas',
  )
  assert.match(
    saidasVisuais.find((saida) => saida.nome === 'parecer')?.xml ?? '',
    /<w:tblHeader\s*\/?>/,
    'cabeçalhos de tabelas técnicas devem se repetir quando houver quebra de página',
  )
  assert.match(
    saidasVisuais.find((saida) => saida.nome === 'impugnacao')?.xml ?? '',
    /<w:br\s*\/?>/,
    'títulos longos do DOCX devem quebrar dentro das margens da página',
  )

  assert.match(htmlParecer, /12,5 ppm/)
  assert.match(htmlParecer, /Limite de tolerância.*78 ppm/s)
  assert.match(htmlParecer, /CA da peça facial<\/th><td[^>]*>4115/)
  assert.match(htmlParecer, /CA do cartucho\/filtro<\/th><td[^>]*>5635/)
  assert.match(htmlParecer, /CA<\/th><td[^>]*>5657/)
  assert.match(htmlParecer, /Eficácia comprovada<\/th><td[^>]*>Sim/)
  assert.match(htmlParecer, /90 - 17 = 73 dB\(A\)/)
  assert.match(htmlParecer, /Proteção eficaz/)
  assert.match(htmlParecer, /Anexo 8 — Vibrações em Mãos e Braços \(VMB\)/)
  assert.match(htmlParecer, /85 dB\(A\)/)
  assert.match(htmlParecer, /18 % O₂ em volume/)
  assert.match(htmlParecer, /7,25/)
  assert.doesNotMatch(htmlParecer, /registro legado que não deve prevalecer/)
  assert.doesNotMatch(htmlParecer, /legado sem unidade que não deve prevalecer/)
  assert.doesNotMatch(htmlParecer, /undefined|null/)

  const secaoAgentes = htmlParecer.match(
    /<h2>7\. HISTÓRICO LABORAL[\s\S]*?<h3>7\.2\. NR-15[^<]*<\/h3>([\s\S]*?)<h2>8\. DOS EQUIPAMENTOS/i,
  )?.[1]
  assert.ok(secaoAgentes, 'seção de agentes não encontrada')
  assert.match(secaoAgentes, /class="agente-bloco"/)
  assert.match(
    secaoAgentes,
    /<div class="agente-resumo"><h3 class="agente-titulo">[\s\S]*?<table>/,
    'o título e a tabela principal do agente precisam formar um bloco indivisível',
  )
  assert.doesNotMatch(secaoAgentes, /class="tabela-agentes"/)
  assert.match(secaoAgentes, /<th>Propriedade<\/th><th>Informação<\/th>/)
  assert.doesNotMatch(secaoAgentes, /<th>CAS<\/th><td>não aplicável<\/td>/)
  assert.doesNotMatch(secaoAgentes, /CA da peça facial|CA do cartucho\/filtro|90 - 17 = 73 dB\(A\)/)

  const secaoEpis = htmlParecer.match(
    /<h2>8\. DOS EQUIPAMENTOS[^<]*<\/h2>([\s\S]*?)<h2>9\. DAS PROTEÇÕES COLETIVAS<\/h2>/i,
  )?.[1]
  assert.ok(secaoEpis, 'seção de EPI não encontrada')
  assert.match(secaoEpis, /CA da peça facial|CA do cartucho\/filtro|90 - 17 = 73 dB\(A\)/)

  assert.match(htmlParecer, /font-family: Arial, sans-serif/)
  assert.match(htmlParecer, /h1 \{[^}]*font-size: 18pt/s)
  assert.match(htmlParecer, /h2 \{[^}]*font-size: 14pt/s)
  assert.match(htmlParecer, /body \{[\s\S]*font-size: 11pt/)
  assert.match(htmlParecer, /table \{[\s\S]*font-size: 10pt/)
  assert.match(
    htmlParecer,
    /\.fotos \{[^}]*display:\s*block/s,
    'o relatório fotográfico deve usar uma fotografia por faixa',
  )
  assert.match(
    htmlParecer,
    /figure img \{[^}]*object-fit:\s*contain/s,
    'as fotografias do PDF devem preservar a proporção sem corte',
  )
  assert.match(
    htmlParecer,
    /figure img \{[^}]*max-height:\s*11cm/s,
    'as fotografias do PDF devem ter altura limitada para não criar páginas quase vazias',
  )

  const corpoParecer = htmlParecer.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''
  assert.match(
    corpoParecer,
    /<header class="marca">[\s\S]*?<img class="logo-oficial"/,
    'parecer e laudo devem iniciar pela identidade visual oficial',
  )
  const ordemAbertura = [
    'class="logo-oficial"',
    'EXCELENTÍSSIMO',
    'class="ficha-processual"',
    '<h1>Parecer Técnico Pericial — Insalubridade</h1>',
    'APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA',
    '1. OBJETO DA PERÍCIA E DADOS CONTRATUAIS',
    '2. DA DILIGÊNCIA TÉCNICA PERICIAL',
  ].map((trecho) => corpoParecer.indexOf(trecho))
  assert.ok(
    ordemAbertura.every((indice) => indice >= 0) &&
      ordemAbertura.every((indice, i) => i === 0 || indice > ordemAbertura[i - 1]),
    `abertura do parecer fora da estrutura aprovada: ${ordemAbertura.join(', ')}`,
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
  ].map((trecho) => corpoParecer.indexOf(trecho))
  assert.ok(
    estruturaEnxuta.every((indice) => indice >= 0) &&
      estruturaEnxuta.every((indice, i) => i === 0 || indice > estruturaEnxuta[i - 1]),
    `estrutura enxuta fora da ordem aprovada: ${estruturaEnxuta.join(', ')}`,
  )
  assert.doesNotMatch(corpoParecer, /RELATÓRIO FOTOGRÁFICO/)

  // O escape precisa ter neutralizado a <tag> plantada em observacoesAdicionais.
  const escapou = htmlParecer.includes('&lt;tags&gt;') && !htmlParecer.includes('<tags>')

  // Os enquadramentos dos Anexos 11, 13 e 14 precisam sobreviver no HTML/PDF.
  const enquadramentos = [
    'Ácido crômico (névoa)',
    'Cromagem eletrolítica dos metais.',
    'lixo urbano (coleta e industrialização).',
    'Máximo (40%)',
    'Atividade ou referência normativa',
  ].every((trecho) => htmlParecer.includes(trecho))
  const escapouEnquadramento =
    htmlParecer.includes('&lt;referência especial &amp; controlada&gt;') &&
    !htmlParecer.includes('<referência especial & controlada>')
  const unidadeSemRepeticao = (htmlParecer.match(/mg\/m³/g) ?? []).length === 1

  // As seções têm de sair numeradas 1, 2, 3… na ordem em que aparecem.
  const numeros = [...htmlParecer.matchAll(/<h2>(\d+)\./g)].map((m) => Number(m[1]))
  const sequencial = numeros.length > 0 && numeros.every((n, i) => n === i + 1)

  // ── Perícia enxuta: só insalubridade, sem quesitos e sem
  // divergências. Três seções finais e duas subseções deixam de
  // existir, e é aqui que a numeração escrita à mão pulava de "11."
  // para "13." no documento entregue ao juízo.
  const periciaEnxuta = {
    ...periciaBase,
    modalidade: 'insalubridade',
    tecnico: {
      ...periciaBase.tecnico,
      respostasQuesitos: '',
      divergenciasFaticas: '',
      alegacoesReclamante: '',
      informacoesReclamada: '',
      consideracoesDivergencias: '',
    },
  } as unknown as PericiaCompleta
  const docEnxuto = doc('parecer', 'Parecer Técnico Pericial — Insalubridade', null)
  const htmlEnxuto = await montarHtml(docEnxuto, periciaEnxuta, [empresa], perito)
  const zipEnxuto = await JSZip.loadAsync(await gerarDocx(docEnxuto, periciaEnxuta, [empresa], perito))
  const xmlEnxuto = await zipEnxuto.file('word/document.xml')!.async('string')

  const numerosEnxuto = [...htmlEnxuto.matchAll(/<h2>(\d+)\./g)].map((m) => Number(m[1]))
  const subsecoesEnxuto = [...htmlEnxuto.matchAll(/<h3>7\.(\d+)\./g)].map((m) => Number(m[1]))
  const sequencialEnxuto =
    numerosEnxuto.length > 0 &&
    numerosEnxuto.every((n, i) => n === i + 1) &&
    subsecoesEnxuto.every((n, i) => n === i + 1)
  assert.match(htmlEnxuto, /<h2>11\. NR-15 — CONCLUSÃO E FUNDAMENTAÇÃO<\/h2>/)
  assert.match(htmlEnxuto, /<h2>12\. ENCERRAMENTO<\/h2>/, 'sem NR-16 e sem quesitos, o encerramento é a 12ª seção')
  assert.doesNotMatch(htmlEnxuto, /<h3>7\.[34]\./, 'subseções ausentes não podem deixar buraco na numeração')
  assert.ok(xmlEnxuto.includes('12. ENCERRAMENTO'), 'o DOCX precisa numerar igual ao PDF do mesmo documento')
  assert.ok(!xmlEnxuto.includes('14. ENCERRAMENTO'), 'o DOCX não pode manter o número fixo antigo')

  console.log('\n' + resumo.join('\n'))
  console.log(`\nescape de HTML no conteúdo: ${escapou ? 'ok' : 'FALHOU'}`)
  console.log(`enquadramentos NR-15:       ${enquadramentos ? 'ok' : 'FALHOU'}`)
  console.log(`escape no enquadramento:    ${escapouEnquadramento ? 'ok' : 'FALHOU'}`)
  console.log(`unidade sem repetição:      ${unidadeSemRepeticao ? 'ok' : 'FALHOU'}`)
  console.log(
    `numeração das seções:       ${sequencial ? `ok (1..${numeros.length})` : `FALHOU → ${numeros.join(', ')}`}`,
  )
  console.log(
    `numeração sem NR-16/quesitos: ${
      sequencialEnxuto ? `ok (1..${numerosEnxuto.length})` : `FALHOU → ${numerosEnxuto.join(', ')}`
    }`,
  )
  console.log(`arquivos em: ${path.resolve(SAIDA)}\n`)

  if (
    !escapou ||
    !enquadramentos ||
    !escapouEnquadramento ||
    !unidadeSemRepeticao ||
    !sequencial ||
    !sequencialEnxuto
  )
    process.exitCode = 1

  await encerrarBrowser()
}

main().catch(async (e) => {
  console.error('FALHOU:', e)
  await encerrarBrowser()
  process.exit(1)
})
