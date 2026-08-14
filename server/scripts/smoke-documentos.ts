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

const pericia = {
  id: 'per-1',
  numeroProcesso: '1001234-56.2025.5.02.0071',
  vara: '71ª Vara do Trabalho de São Paulo',
  comarca: 'São Paulo/SP',
  reclamante: 'José Aparecido da Silva',
  cpfReclamante: '123.456.789-00',
  funcaoReclamante: 'Operador de Máquinas',
  admissao: '2018-03-12',
  demissao: '2024-11-08',
  dataVistoria: '2026-07-15',
  horaVistoria: '09:30',
  localVistoria: 'Rodovia Anhanguera, km 32 — Cajamar/SP',
  modalidade: 'insalubridade',
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
      },
      {
        id: 'agn-2',
        nome: 'Ruído contínuo',
        tipo: 'fisico',
        anexoNr15: 'Anexo 1',
        medido: '85 dB(A)',
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
    ],
    normasReferencias:
      'Portaria MTb nº 3.214/78 — NR-15 e NR-16; NHO-01 e NHO-06 da FUNDACENTRO; NR-06; NR-09.',
    equipamentosAnalisados: 'Audiodosímetro digital, termômetro de globo, fichas de EPI.',
    informacoesLevantadas:
      'Foram apresentadas fichas de entrega de EPI referentes ao período de 2019 a 2024, com lacunas em 2018.',
    analiseTecnica:
      'A exposição habitual a névoas de óleo mineral, sem neutralização comprovada, atrai o enquadramento qualitativo do Anexo 13 da NR-15.\n\nRegistra-se que o simples fornecimento de EPI não elide o adicional, nos termos das Súmulas 80 e 289 do C. TST.',
    conclusao:
      'Diante de todo o exposto, conclui este Perito pela CARACTERIZAÇÃO da insalubridade em GRAU MÉDIO (20%), com fundamento no Anexo 13 da NR-15, durante todo o período laborado.',
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
} as unknown as PericiaCompleta

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

  for (const caso of CASOS) {
    const html = await montarHtml(caso.doc, pericia, [empresa], perito)
    await fs.writeFile(path.join(SAIDA, `${caso.nome}.html`), html, 'utf8')

    const pdf = await gerarPdf(html)
    await fs.writeFile(path.join(SAIDA, `${caso.nome}.pdf`), pdf)

    const docx = await gerarDocx(caso.doc, pericia, [empresa], perito)
    await fs.writeFile(path.join(SAIDA, `${caso.nome}.docx`), docx)

    const assinaturaPdf = pdf.subarray(0, 5).toString('latin1')
    const assinaturaDocx = docx.subarray(0, 2).toString('latin1')

    resumo.push(
      `${caso.nome.padEnd(16)} html ${String(html.length).padStart(6)}B  ` +
        `pdf ${String(pdf.length).padStart(7)}B ${assinaturaPdf === '%PDF-' ? 'ok' : 'INVÁLIDO'}  ` +
        `docx ${String(docx.length).padStart(6)}B ${assinaturaDocx === 'PK' ? 'ok' : 'INVÁLIDO'}`,
    )
  }

  const htmlParecer = await fs.readFile(path.join(SAIDA, 'parecer.html'), 'utf8')

  assert.match(htmlParecer, /12,5 ppm/)
  assert.match(htmlParecer, /Limite de Tolerância.*78 ppm/s)
  assert.match(htmlParecer, /CA da peça facial: 4115/)
  assert.match(htmlParecer, /CA do cartucho\/filtro: 5635/)
  assert.match(htmlParecer, /CA: 5657/)
  assert.match(htmlParecer, /85 dB\(A\)/)
  assert.match(htmlParecer, /18 % O₂ em volume/)
  assert.doesNotMatch(htmlParecer, /registro legado que não deve prevalecer/)
  assert.doesNotMatch(htmlParecer, /undefined|null/)

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

  console.log('\n' + resumo.join('\n'))
  console.log(`\nescape de HTML no conteúdo: ${escapou ? 'ok' : 'FALHOU'}`)
  console.log(`enquadramentos NR-15:       ${enquadramentos ? 'ok' : 'FALHOU'}`)
  console.log(`escape no enquadramento:    ${escapouEnquadramento ? 'ok' : 'FALHOU'}`)
  console.log(`unidade sem repetição:      ${unidadeSemRepeticao ? 'ok' : 'FALHOU'}`)
  console.log(
    `numeração das seções:       ${sequencial ? `ok (1..${numeros.length})` : `FALHOU → ${numeros.join(', ')}`}`,
  )
  console.log(`arquivos em: ${path.resolve(SAIDA)}\n`)

  if (!escapou || !enquadramentos || !escapouEnquadramento || !unidadeSemRepeticao || !sequencial) process.exitCode = 1

  await encerrarBrowser()
}

main().catch(async (e) => {
  console.error('FALHOU:', e)
  await encerrarBrowser()
  process.exit(1)
})
