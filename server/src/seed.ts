import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { QUESITOS_BASE } from './quesitos-base.js'

const prisma = new PrismaClient()

// ============================================================
// Seed idempotente — pode rodar em toda subida sem duplicar.
//
//   · administrador inicial (ADMIN_EMAIL / ADMIN_SENHA)
//   · 39 quesitos do banco global (Módulo K)
//   · modelos de documento (Módulo H)
//   · biblioteca de textos inicial do administrador (Módulo F)
//
// Empresas e perícias fictícias só entram com SEED_DEMO=true.
// ============================================================

const TEXTOS_INICIAIS = [
  {
    titulo: 'Apresentação padrão — Perito Judicial',
    secao: 'apresentacao' as const,
    tags: ['padrão', 'abertura'],
    conteudo:
      'O signatário, Engenheiro de Segurança do Trabalho devidamente registrado no CREA sob o nº {{registro}}, nomeado por este MM. Juízo para atuar como Perito Judicial nos autos em epígrafe, vem, respeitosamente, apresentar o presente PARECER TÉCNICO PERICIAL, elaborado a partir da vistoria realizada no ambiente de trabalho e da análise da documentação acostada aos autos.',
    favorito: true,
  },
  {
    titulo: 'Objetivo — Insalubridade (NR-15)',
    secao: 'objetivo' as const,
    tags: ['insalubridade', 'nr-15'],
    conteudo:
      'A presente perícia tem por objetivo verificar a existência de agentes nocivos no ambiente laboral do Reclamante, avaliando sua natureza, intensidade e forma de exposição, com o consequente enquadramento — ou não — nos anexos da Norma Regulamentadora nº 15, aprovada pela Portaria MTb nº 3.214/78.',
    favorito: true,
  },
  {
    titulo: 'Conclusão — Insalubridade caracterizada em grau médio',
    secao: 'conclusao' as const,
    tags: ['conclusão', 'grau médio', 'anexo 13'],
    conteudo:
      'Diante de todo o exposto, com fundamento nos elementos técnicos levantados durante a vistoria e na análise da documentação acostada aos autos, conclui este Perito pela CARACTERIZAÇÃO da insalubridade em GRAU MÉDIO (20%), com fundamento no Anexo 13 da NR-15, aprovada pela Portaria MTb nº 3.214/78, durante todo o período laborado, uma vez que as atividades desempenhadas envolviam o manuseio habitual de hidrocarbonetos e solventes orgânicos sem a devida neutralização por medidas de proteção coletiva ou individual comprovadamente eficazes.',
    favorito: true,
  },
  {
    titulo: 'Conclusão — Insalubridade não caracterizada',
    secao: 'conclusao' as const,
    tags: ['conclusão', 'improcedente'],
    conteudo:
      'Diante de todo o exposto, conclui este Perito pela NÃO CARACTERIZAÇÃO da insalubridade, uma vez que os agentes identificados no ambiente de trabalho não ultrapassam os limites de tolerância fixados no Anexo 11 da NR-15, tampouco as atividades desempenhadas se enquadram nas hipóteses de avaliação qualitativa previstas nos demais anexos da referida norma.',
    favorito: false,
  },
  {
    titulo: 'EPI — Súmula 80 e 289 do TST',
    secao: 'analise' as const,
    tags: ['epi', 'súmula', 'tst'],
    conteudo:
      'Registra-se que o simples fornecimento do Equipamento de Proteção Individual pelo empregador não o exime do pagamento do adicional de insalubridade, sendo necessária a comprovação da efetiva entrega, do treinamento quanto ao uso correto, da higienização, da substituição periódica e, sobretudo, da fiscalização quanto ao uso ininterrupto do equipamento durante toda a exposição, nos exatos termos das Súmulas 80 e 289 do C. TST.',
    favorito: true,
  },
  {
    titulo: 'Descrição de ambiente industrial — galpão com exaustão',
    secao: 'ambiente' as const,
    tags: ['ambiente', 'indústria'],
    conteudo:
      'O ambiente de trabalho consiste em galpão industrial de alvenaria com estrutura metálica, pé-direito aproximado de {{peDireito}} metros, piso em concreto polido, cobertura em telhas metálicas com telhas translúcidas para iluminação zenital, ventilação natural por aberturas laterais e sheds, complementada por sistema de exaustão mecânica localizada junto aos postos de maior emissão de vapores.',
    favorito: false,
  },
  {
    titulo: 'Agentes biológicos — ambiente hospitalar (Anexo 14)',
    secao: 'analise' as const,
    tags: ['biológico', 'anexo 14', 'hospital'],
    conteudo:
      'As atividades desempenhadas em estabelecimento destinado aos cuidados da saúde humana, com contato permanente com pacientes e com material infectocontagiante, enquadram-se na hipótese expressamente prevista no Anexo 14 da NR-15, que classifica tal exposição como insalubre em grau médio, sendo a avaliação de natureza exclusivamente qualitativa, independentemente de quantificação.',
    favorito: true,
  },
  {
    titulo: 'Periculosidade — abastecimento e OJ 385 do TST',
    secao: 'analise' as const,
    tags: ['periculosidade', 'nr-16', 'inflamáveis'],
    conteudo:
      'Verificou-se que o Reclamante realizava, de forma habitual, o abastecimento de veículos em bomba situada no interior do estabelecimento da Reclamada, permanecendo em área de risco delimitada pelo Anexo 2 da NR-16. Nos termos da Orientação Jurisprudencial 385 da SDI-1 do C. TST, tal circunstância caracteriza a periculosidade, sendo irrelevante o tempo de permanência, dada a natureza do risco.',
    favorito: false,
  },
  {
    titulo: 'Metodologia — dosimetria de ruído (NHO-01)',
    secao: 'analise' as const,
    tags: ['ruído', 'nho-01', 'metodologia'],
    conteudo:
      'A avaliação da exposição ocupacional ao ruído foi realizada por meio de dosimetria, com audiodosímetro digital modelo {{modelo}}, calibrado conforme certificado nº {{certificado}}, fixado junto à zona auditiva do trabalhador durante {{tempo}} de sua jornada. Adotaram-se circuito de compensação "A", resposta lenta (slow), critério de referência de 85 dB(A), nível limiar de 80 dB(A) e incremento de duplicação de dose q=5, em conformidade com o Anexo 1 da NR-15 e com a NHO-01 da FUNDACENTRO.',
    favorito: true,
  },
  {
    titulo: 'Ressalva — ausência de quantificação ambiental',
    secao: 'analise' as const,
    tags: ['químicos', 'qualitativo', 'ressalva'],
    conteudo:
      'Não foram realizadas medições das concentrações ambientais dos agentes químicos identificados, inexistindo elementos técnicos que permitam comparar a exposição ocupacional aos respectivos Limites de Tolerância. Resta, portanto, prejudicada qualquer conclusão fundada em critério quantitativo, permanecendo a análise adstrita ao critério qualitativo previsto no Anexo 13 da NR-15.',
    favorito: true,
  },
]

const MODELOS = [
  { nome: 'Parecer Técnico — Insalubridade (padrão D&R)', tipo: 'parecer' as const, secoes: 12 },
  { nome: 'Laudo Técnico — Insalubridade e Periculosidade', tipo: 'laudo' as const, secoes: 14 },
  { nome: 'Quesitos Técnicos — modelo completo', tipo: 'quesitos' as const, secoes: 4 },
  { nome: 'Manifestação ao Laudo — folha única', tipo: 'manifestacao' as const, secoes: 3 },
  { nome: 'Impugnação ao Laudo — extensão do parecer', tipo: 'impugnacao' as const, secoes: 6 },
  { nome: 'Esclarecimentos Técnicos — resposta a quesitos', tipo: 'esclarecimento' as const, secoes: 5 },
]

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'dinoel@drpericiaelite.com.br').toLowerCase()
  const senha = process.env.ADMIN_SENHA

  if (!senha) {
    throw new Error(
      'Defina ADMIN_SENHA no .env antes de rodar o seed. ' +
        'O administrador inicial não é criado com senha padrão.',
    )
  }
  if (senha.length < 8) {
    throw new Error('ADMIN_SENHA deve ter pelo menos 8 caracteres.')
  }

  // ---------- Administrador ----------
  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: process.env.ADMIN_NOME ?? 'Dinoel R. Santos',
      email,
      senhaHash: await bcrypt.hash(senha, 12),
      perfil: 'admin',
      titulo: 'Engenheiro de Segurança do Trabalho',
      registroProfissional: process.env.ADMIN_REGISTRO ?? '',
      ativo: true,
    },
  })
  console.log(`✓ administrador: ${admin.email}`)

  // ---------- Quesitos globais ----------
  const jaTem = await prisma.quesito.count({ where: { usuarioId: null } })
  if (jaTem === 0) {
    await prisma.quesito.createMany({
      data: QUESITOS_BASE.map((q) => ({ ...q, personalizado: false, usuarioId: null })),
    })
    console.log(`✓ ${QUESITOS_BASE.length} quesitos do banco global`)
  } else {
    console.log(`· quesitos globais já presentes (${jaTem}) — nada a fazer`)
  }

  // ---------- Modelos ----------
  for (const m of MODELOS) {
    const existe = await prisma.modeloDocumento.findFirst({ where: { nome: m.nome } })
    if (!existe) await prisma.modeloDocumento.create({ data: m })
  }
  console.log(`✓ ${MODELOS.length} modelos de documento`)

  // ---------- Biblioteca inicial ----------
  const textosDoAdmin = await prisma.textoBiblioteca.count({ where: { usuarioId: admin.id } })
  if (textosDoAdmin === 0) {
    await prisma.textoBiblioteca.createMany({
      data: TEXTOS_INICIAIS.map((t) => ({ ...t, usuarioId: admin.id })),
    })
    console.log(`✓ ${TEXTOS_INICIAIS.length} textos na biblioteca do administrador`)
  } else {
    console.log(`· biblioteca do administrador já tem ${textosDoAdmin} textos — nada a fazer`)
  }

  // ---------- Demonstração (opcional) ----------
  if (process.env.SEED_DEMO === 'true') {
    await seedDemo(admin.id)
  }
}

async function seedDemo(responsavelId: string) {
  if ((await prisma.empresa.count()) > 0) {
    console.log('· dados de demonstração já existem — nada a fazer')
    return
  }

  const ferrante = await prisma.empresa.create({
    data: {
      razaoSocial: 'Metalúrgica Ferrante Indústria e Comércio Ltda.',
      nomeFantasia: 'Ferrante Metais',
      cnpj: '12.345.678/0001-90',
      cnae: '25.39-0-01',
      grauRisco: '3',
      endereco: 'Rodovia Anhanguera, km 32',
      numero: 's/n',
      bairro: 'Distrito Industrial',
      cidade: 'Cajamar',
      uf: 'SP',
      cep: '07750-000',
      contatoNome: 'Eng. Roberto Manzi',
      contatoEmail: 'sesmt@ferrantemetais.com.br',
      contatoTelefone: '(11) 4446-8800',
      ramoAtividade: 'Usinagem e tratamento de superfície de peças metálicas',
    },
  })

  await prisma.pericia.create({
    data: {
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
      responsavelId,
      tecnico: {
        apresentacao: '',
        enderecamento: '',
        objetivoPericia:
          'Verificar a existência de agentes insalubres no ambiente de trabalho do Reclamante, com enquadramento nos anexos da NR-15 da Portaria MTb nº 3.214/78.',
        descricaoEmpresa:
          'A Reclamada atua no ramo de usinagem e tratamento de superfície de peças metálicas, ocupando galpão industrial de aproximadamente 4.200 m², com pé-direito de 9 metros e ventilação natural complementada por exaustores.',
        descricaoAmbiente: '',
        atividadesFuncoes: '',
        periodos: [],
        agentes: [],
        normasReferencias:
          'Portaria MTb nº 3.214/78 — NR-15 e NR-16; NHO-01 e NHO-06 da FUNDACENTRO; NR-06; NR-09.',
        equipamentosAnalisados: '',
        informacoesLevantadas: '',
        analiseTecnica: '',
        conclusao: '',
        observacoesAdicionais: '',
      },
      reclamadas: { create: [{ empresaId: ferrante.id, principal: true }] },
      participantes: {
        create: [
          { nome: 'Dr. Fábio Toledo', papel: 'advogado_reclamante', registro: 'OAB/SP 210.334' },
          { nome: 'Eng. Roberto Manzi', papel: 'assistente_reclamada', registro: 'CREA-SP 0601223344' },
        ],
      },
    },
  })

  console.log('✓ dados de demonstração (1 empresa, 1 perícia)')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('\n✗ seed falhou:', e instanceof Error ? e.message : e)
    await prisma.$disconnect()
    process.exit(1)
  })
