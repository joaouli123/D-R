// Gera o HTML do laudo (a MESMA folha de estilo que o Puppeteer imprime)
// para conferência visual do layout sem precisar do Chromium. Descartável.
import { writeFileSync } from 'node:fs'
import { montarHtml } from '../src/services/documento-html.js'

const empresa = {
  id: 'emp-1',
  razaoSocial: 'Metalúrgica Aurora Indústria e Comércio Ltda',
  cnpj: '12345678000190',
} as any

const empresaSolidaria = {
  id: 'emp-2',
  razaoSocial: 'Aurora Participações S.A.',
  cnpj: '98765432000155',
} as any

const perito = {
  nome: 'Dinoel Ramos Santos',
  titulo: 'Engenheiro de Segurança do Trabalho',
  registroProfissional: 'CREA-SP 0000000000',
} as any

const tecnico = {
  apresentacao:
    'O signatário, Perito Judicial nomeado por este MM. Juízo, engenheiro de segurança do trabalho regularmente habilitado, apresenta o presente Laudo Pericial de Insalubridade, elaborado com estrita observância da Norma Regulamentadora NR-15 e da Consolidação das Leis do Trabalho.\n\nOs trabalhos foram conduzidos de forma imparcial, tendo por único objetivo o esclarecimento técnico da controvérsia posta nos autos.',
  enderecamento: '',
  objetivoPericia:
    'A presente perícia tem por objetivo apurar a existência de insalubridade nas atividades exercidas pelo reclamante, por eventual exposição ao agente físico ruído, bem como avaliar a eficácia dos equipamentos de proteção individual fornecidos, nos termos do Anexo 1 da NR-15.',
  descricaoEmpresa:
    'A reclamada atua no ramo de fabricação de artigos de metal, mantendo em seu parque fabril setores de estamparia, usinagem, solda e acabamento.',
  descricaoAmbiente:
    'O setor de estamparia, local de trabalho do reclamante, é um galpão de estrutura metálica com pé-direito de aproximadamente 8 metros, piso em concreto e cobertura em telha metálica.',
  atividadesFuncoes:
    'O reclamante exercia a função de Operador de Prensa, sendo responsável pela alimentação manual de chapas metálicas, acionamento das prensas excêntricas e retirada das peças conformadas.',
  periodos: [
    {
      id: 'p1',
      funcao: 'Operador de Prensa',
      setor: 'Estamparia',
      inicio: '2019-03-04',
      fim: '2024-11-29',
      descricaoAtividades: 'Operação de prensas excêntricas e conformação de chapas.',
    },
  ],
  agentes: [
    {
      id: 'ag-ruido',
      nome: 'Ruído Contínuo/Intermitente',
      tipo: 'fisico',
      anexoNr15: 'ANEXO_01',
      atividadeEnquadrada: 'Exposição a ruído acima do limite de tolerância (Anexo 1, NR-15)',
      limiteTolerancia: '85',
      unidadeLimite: 'dB(A)',
      criterio: 'quantitativo',
      grau: 'medio',
      valorMedido: '103.4',
      unidadeMedicao: 'dB(A)',
      epiEficaz: false,
      epis: [
        {
          categoria: 'Protetor Auditivo',
          modelo: 'Protetor auditivo circum-auricular (tipo concha)',
          marca: 'MSA do Brasil',
          caUnico: '10666',
          nivelProtecaoDb: 16,
          metodoAtenuacao: 'NRRsf',
        },
      ],
    },
  ],
  normasReferencias: 'NR-15 e seu Anexo 1; NR-06; NHO-01 da FUNDACENTRO.',
  equipamentosAnalisados:
    'Para a avaliação quantitativa do agente ruído foi utilizado dosímetro de áudio digital, com certificado de calibração vigente, ajustado ao critério de resposta lenta (SLOW) e circuito de compensação A.',
  informacoesLevantadas:
    'Durante a diligência, o preposto confirmou que o reclamante laborava em tempo integral no setor de estamparia.',
  analiseTecnica:
    'A medição apurou nível de pressão sonora de 103,4 dB(A), valor superior ao limite de tolerância de 85 dB(A).\n\nConsiderando o NRRsf de 16 dB do protetor auditivo fornecido (CA 10666), a atenuação resulta em nível efetivo de 87,4 dB(A), ainda superior ao limite legal.',
  conclusao:
    'Conclui o signatário que as atividades exercidas pelo reclamante caracterizam INSALUBRIDADE EM GRAU MÉDIO (20%), por exposição habitual e permanente ao agente físico ruído acima do limite de tolerância.',
  observacoesAdicionais:
    'O presente laudo reflete as condições verificadas na data da diligência.',
}

const pericia = {
  numeroProcesso: '0001234-56.2025.5.02.0055',
  vara: '55ª Vara do Trabalho de São Paulo',
  comarca: 'São Paulo/SP',
  reclamante: 'João Batista de Souza',
  funcaoReclamante: 'Operador de Prensa',
  admissao: '2019-03-04',
  demissao: '2024-11-29',
  dataVistoria: '2026-08-14',
  horaVistoria: '09:30',
  localVistoria: 'Rodovia Anhanguera, km 22, Distrito Industrial, Osasco/SP',
  modalidade: 'insalubridade',
  tecnico,
  reclamadas: [
    { empresaId: 'emp-1', principal: true },
    { empresaId: 'emp-2', principal: false },
  ],
  participantes: [
    { nome: 'Dinoel R. Santos', papel: 'perito_judicial' },
    { nome: 'João Batista de Souza', papel: 'reclamante' },
    { nome: 'Marcos Andrade', papel: 'preposto' },
    { nome: 'Helena Prado', papel: 'advogado_reclamada' },
  ],
  fotos: [],
} as any

const doc = { tipo: 'laudo', titulo: 'Laudo Pericial de Insalubridade', conteudo: {} } as any

const html = await montarHtml(doc, pericia, [empresa, empresaSolidaria], perito)
const destino = process.argv[2] ?? 'preview-laudo.html'
writeFileSync(destino, html, 'utf-8')
console.log('HTML gravado em', destino, `(${html.length} bytes)`)
