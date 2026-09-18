import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Pericia } from '@/types'
import { DocumentoPreview } from './DocumentoPreview'

const pericia = {
  id: 'pericia-preview',
  numeroProcesso: '0000000-00.2026.5.00.0000',
  vara: 'Vara do Trabalho',
  comarca: 'São Paulo/SP',
  reclamante: 'Pessoa reclamante',
  admissao: '2020-01-01',
  dataAjuizamento: '2026-06-10',
  reclamadas: [],
  participantes: [],
  dataVistoria: '2026-08-14',
  localVistoria: 'Local da vistoria',
  modalidade: 'ambas',
  status: 'em_andamento',
  responsavelId: 'usuario-1',
  criadoEm: '2026-08-14T00:00:00.000Z',
  atualizadoEm: '2026-08-14T00:00:00.000Z',
  tecnico: {
    apresentacao: '',
    enderecamento: '',
    objetivoPericia: '',
    descricaoEmpresa: '',
    descricaoAmbiente: '',
    descricaoPostoTrabalho: 'Posto de trabalho descrito',
    maquinasFerramentas: 'Máquinas descritas',
    produtosUtilizados: 'Produtos descritos',
    atividadesFuncoes: 'Operação de tornos com manuseio de fluido de corte.',
    periodos: [
      {
        id: 'periodo-1',
        funcao: 'Auxiliar de Produção',
        setor: 'Usinagem',
        inicio: '2018-03-12',
        fim: '2024-11-08',
        descricaoAtividades: 'Apoio à operação e movimentação de peças.',
      },
    ],
    agentes: [
      {
        id: 'agente-estruturado',
        nome: 'Acetaldeído',
        tipo: 'quimico',
        anexoNr15: 'Anexo 11',
        limiteTolerancia: '78 ppm',
        unidadeLimite: 'ppm',
        medido: 'registro legado que não deve prevalecer',
        valorMedido: '12.5',
        unidadeMedicao: 'ppm',
        criterio: 'quantitativo',
        grau: 'medio',
        epiEficaz: true,
        epis: [
          {
            catalogoId: 'snapshot-duplo',
            categoria: 'Proteção respiratória',
            modelo: 'Respirador reutilizável',
            marca: 'Marca histórica',
            caPecaFacial: '4115',
            caFiltroCartucho: '5635',
          },
          {
            catalogoId: 'snapshot-unico',
            categoria: 'Proteção respiratória',
            modelo: 'PFF2',
            marca: 'Marca histórica',
            caUnico: '5657',
          },
        ],
      },
      {
        id: 'agente-legado',
        nome: 'Ruído contínuo',
        tipo: 'fisico',
        medido: '85 dB(A)',
        criterio: 'quantitativo',
      },
      {
        id: 'ruido-calculado',
        nome: 'Ruído',
        tipo: 'fisico',
        anexoNr15: 'ANEXO_01',
        cas: 'não aplicável',
        limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
        valorMedido: '90',
        unidadeMedicao: 'dB(A)',
        criterio: 'quantitativo',
        grau: 'medio',
        epis: [{ categoria: 'Proteção auditiva', modelo: 'CA 11882', marca: 'Marca', caUnico: '11882', nivelProtecaoDb: 17, metodoAtenuacao: 'NRRsf' }],
      },
      {
        id: 'agente-oxigenio',
        nome: 'Oxigênio',
        tipo: 'quimico',
        limiteTolerancia: '18 % O₂ em volume',
        unidadeLimite: '% O₂ em volume',
        valorMedido: '18',
        unidadeMedicao: '% O₂ em volume',
        criterio: 'quantitativo',
      },
      {
        id: 'agente-medicao-sem-unidade',
        nome: 'Índice adimensional',
        tipo: 'fisico',
        medido: 'legado sem unidade que não deve prevalecer',
        valorMedido: '7.25',
        criterio: 'quantitativo',
      },
    ],
    normasReferencias: '',
    equipamentosAnalisados: '',
    informacoesLevantadas: '',
    divergenciasFaticas: 'Divergências registradas',
    protecoesColetivas: 'Exaustão localizada',
    analiseTecnica: '',
    conclusao: '',
    conclusaoInsalubridade: 'Conclusão de NR-15',
    conclusaoPericulosidade: 'Conclusão de NR-16',
    respostasQuesitos: 'Respostas técnicas consolidadas',
    encerramento: 'Parecer elaborado em observância aos critérios técnicos.',
    observacoesAdicionais: '',
  },
  // As duas fotos empatam em `ordem`: é o dado que as perícias gravadas antes
  // da correção do contador em server/src/routes/fotos.ts têm no banco. Quem
  // desempata é a ordem das seções no documento.
  fotos: [
    {
      id: 'foto-epi',
      secao: 'epi',
      url: '/foto-epi.jpg',
      legenda: 'EPI reconhecido na diligência',
      ordem: 1,
    },
    {
      id: 'foto-ambiente',
      secao: 'ambiente',
      url: '/foto-ambiente.jpg',
      legenda: 'Vista geral do galpão',
      ordem: 1,
    },
  ],
} satisfies Pericia

describe('DocumentoPreview', () => {
  it('abrevia a empresa na representação e apresenta ausência da parte reclamante em linha única', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          reclamadas: [{ id: 'rec-1', empresaId: 'emp-1', principal: true }],
          participantes: [
            { id: 'p-1', nome: '', papel: 'parte_reclamante_ausente' as never },
            { id: 'p-2', nome: 'Maria', papel: 'recursos_humanos' as never, empresaId: 'emp-1' },
          ],
        }}
        empresas={[{
          id: 'emp-1', razaoSocial: 'Acme Serviços Industriais Ltda.', cnpj: '11.111.111/0001-11',
          endereco: '', cidade: 'São Paulo', uf: 'SP', criadoEm: '2026-01-01',
        }]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('<td colSpan="3">A parte reclamante não compareceu para a apresentação de suas alegações.</td>')
    expect(html).toContain('Recursos Humanos, Acme')
    expect(html).not.toContain('Recursos Humanos — Acme Serviços Industriais Ltda.')
  })

  it('omite a tabela do agente não identificado e mantém sua conclusão individual', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'insalubridade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'bio-ausente', nome: 'Agentes biológicos', tipo: 'biologico',
              criterio: 'qualitativo', identificadoNaAtividade: false, observacao: 'Não foi constatada exposição habitual a agentes biológicos.',
            } as never],
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('Não foi constatada exposição habitual a agentes biológicos.')
    expect(html).not.toContain('<th>Propriedade</th><th>Informação</th>')
    // Sem a tabela de propriedades, a conclusão vira uma tabela de uma linha
    // só — o mesmo destaque cinza-azulado dos agentes identificados.
    expect(html).toMatch(
      /Agentes biológicos[\s\S]*?<table class="tabela-conclusao"><tbody><tr class="conclusao-agente"><td colSpan="2"><strong>Conclusão:<\/strong> Não foi constatada exposição habitual a agentes biológicos\.<\/td><\/tr><\/tbody><\/table>/,
    )
  })

  it('fecha a tabela de cada agente identificado com a linha da conclusão', () => {
    // Feedback do perito de 17/09/2026: a conclusão é a ÚLTIMA LINHA da
    // tabela, na largura toda, com "Conclusão:" em negrito — não mais um
    // parágrafo solto depois dela. Gêmeo de documento-parecer.test.ts e
    // docx-parecer.test.ts.
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'insalubridade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'fisico-presente', nome: 'Frio', tipo: 'fisico', criterio: 'qualitativo',
              identificadoNaAtividade: true, observacao: 'Conclusão técnica exclusiva do agente frio.',
            } as never],
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toMatch(
      /<table class="agente-propriedades">[\s\S]*?<tr class="conclusao-agente"><td colSpan="2"><strong>Conclusão:<\/strong> Conclusão técnica exclusiva do agente frio\.<\/td><\/tr><\/tbody><\/table>/,
    )
    expect(html).not.toContain('<p>Conclusão:')
  })

  it('põe a conclusão também nas tabelas do item 7 quando só há NR-15', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'insalubridade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'frio-2', nome: 'Frio', tipo: 'fisico', criterio: 'qualitativo',
              identificadoNaAtividade: true, observacao: 'Linha um.\nLinha dois.',
            } as never],
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    // Item 7 e item 10: as duas tabelas do agente terminam na conclusão, e a
    // quebra de linha digitada pelo perito é mantida.
    const linhas = html.match(/<tr class="conclusao-agente">/g) ?? []
    expect(linhas.length).toBe(2)
    expect(html).toContain('<strong>Conclusão:</strong> Linha um.<br/>Linha dois.')
  })

  it('não imprime mais o texto livre da análise técnica no item 10', () => {
    // Feedback de 17/09/2026: a caixa de texto do item 10 saiu do formulário;
    // o item é só as tabelas dos agentes, cada uma fechada pela conclusão.
    // Perícias antigas ainda têm o texto gravado — ele não pode reaparecer.
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'insalubridade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'fisico-presente', nome: 'Frio', tipo: 'fisico', criterio: 'qualitativo',
              identificadoNaAtividade: true,
            } as never],
            analiseTecnica: 'Texto exclusivo de teste da análise técnica.',
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('agente-propriedades')
    expect(html).not.toContain('Texto exclusivo de teste da análise técnica.')
  })

  it('omite a linha "Conclusão:" quando a avaliação NR-15 está sem texto', () => {
    // "Conclusão: " seguido de nada — era o que o perito lia como pendência
    // dentro do documento já emitido.
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'insalubridade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'sem-conclusao', nome: 'Calor', tipo: 'fisico', criterio: 'qualitativo',
            } as never],
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('Calor')
    expect(html).not.toContain('Conclusão:')
  })

  it('tira da seção de EPIs os agentes que a modalidade excluiu', () => {
    // Perícia só de periculosidade com um agente NR-15 herdado do cadastro: ele
    // não aparece em quadro nenhum, então os EPIs dele também não podem sair —
    // seriam proteções atribuídas a um agente que o leitor não encontra.
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'periculosidade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [
              {
                id: 'nr15-herdado', nome: 'Ruído contínuo herdado', tipo: 'fisico',
                anexoNr15: 'Anexo 1', criterio: 'quantitativo',
                epis: [{ categoria: 'Protetor auricular', modelo: 'Plug 3M 1100', caUnico: '5745' }],
              },
              {
                id: 'nr16-vigente', nome: 'Inflamáveis líquidos', tipo: 'periculosidade',
                anexoNr16: 'ANEXO_02', criterio: 'qualitativo',
                areaRisco: 'Pátio de abastecimento', resultadoPericulosidade: 'caracterizada',
                epis: [{ categoria: 'Luva', modelo: 'Nitrílica NL-30', caUnico: '9111' }],
              },
            ] as never,
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('Nitrílica NL-30')
    expect(html).not.toContain('Ruído contínuo herdado')
    expect(html).not.toContain('Plug 3M 1100')
  })
  it('fecha o item 10 com o quadro Sem Risco e a lista dos anexos em linhas', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'periculosidade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'nr16-sem-risco', nome: 'Sem risco', tipo: 'periculosidade',
              criterio: 'qualitativo', resultadoPericulosidade: 'nao_caracterizada',
            }] as never,
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('10.1.1. Sem Risco – Avaliação, Resultado e Conclusão')
    expect(html).toContain('Condição / Atividades')
    expect(html).toContain('Resultado técnico / Conclusão')
    // O rol dos anexos só existe aqui dentro, e cada um em sua linha: a
    // célula quebra o texto em <div>, não despeja tudo num parágrafo só.
    expect(html).toContain('<div>• Anexo 1 – Explosivos;</div>')
    expect(html).toContain('<div>• Anexo (*) – Radiações ionizantes ou substâncias radioativas;</div>')
  })

  it('não repete o rol dos anexos como subitem do item 10', () => {
    // Gêmeo do teste do PDF (documento-parecer.test.ts) e do DOCX
    // (docx-parecer.test.ts). O perito riscou os subitens “10.x.1
    // Explosivos; …” do modelo: o rol fica dentro da tabela, e o item 10 só
    // numera os quadros dos agentes efetivamente avaliados.
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'periculosidade',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'risco-inflamaveis', nome: 'Inflamáveis', tipo: 'periculosidade',
              criterio: 'qualitativo', anexoNr16: 'ANEXO_02',
              resultadoPericulosidade: 'caracterizada',
            }] as never,
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('10.1. NR-16 — Avaliação das Atividades e Operações Perigosas')
    expect(html).toContain('10.1.1. Inflamáveis – Avaliação, Resultado e Conclusão')
    expect(html).not.toContain('10.1.1. Explosivos;')
    expect(html).not.toContain('Segurança pessoal ou patrimonial;')
    expect(html).not.toContain('10.1.2.')
  })

  it('numera o grupo do item 10 pela modalidade, não pelo tamanho da lista', () => {
    // A perícia é “ambas” e só tem agente de periculosidade cadastrado. O item
    // 7 numera por modalidade (7.3); o item 10 tem de acompanhar (10.2), ou o
    // mesmo documento dá dois números à mesma seção. Espelha o caso em
    // server/src/services/documento-parecer.test.ts e em docx-parecer.test.ts.
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          modalidade: 'ambas',
          tecnico: {
            ...pericia.tecnico,
            agentes: [{
              id: 'nr16-inflamaveis', nome: 'Inflamáveis líquidos', tipo: 'periculosidade',
              anexoNr16: 'ANEXO_02', criterio: 'qualitativo',
              resultadoPericulosidade: 'caracterizada',
            }] as never,
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    expect(html).toContain('7.3. NR-16')
    expect(html).toContain('10.2. NR-16')
    expect(html).not.toContain('10.1. NR-16')
    expect(html).toContain('10.2.1. Inflamáveis – Avaliação, Resultado e Conclusão')
  })

  it('transcreve no 7.3.2 o risco alegado pela parte', () => {
    // O 7.3.2 é transcrição: o que a parte alegou na inicial, palavra por
    // palavra. Vem depois do critério (7.3.1) e antes dos quadros — e só sai
    // quando o perito escreveu alguma coisa. A fonte da transcrição (ex.:
    // "Inicial do processo - Fls.: 8") deixou de ter campo próprio — quem
    // quiser registrá-la escreve junto no próprio texto do risco alegado.
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={{
          ...pericia,
          tecnico: {
            ...pericia.tecnico,
            criterioAvaliacaoPericulosidade: 'Critério qualitativo.',
            riscoAlegadoPericulosidade: 'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
          },
        }}
        empresas={[]}
        titulo="Parecer de teste"
      />,
    )

    const posicoes = [
      '7.3.1. Critério de Avaliação',
      '7.3.2. Risco de Periculosidade Alegado pela Parte Reclamante',
      'Sustenta a parte Reclamante que laborava no abastecimento de veículos.',
    ].map((trecho) => html.indexOf(trecho))
    expect(posicoes.every((posicao) => posicao >= 0)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('não abre o 7.3.2 quando não há alegação transcrita', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).not.toContain('Risco de Periculosidade Alegado pela Parte Reclamante')
  })

  it('renderiza snapshots estruturados de medição e EPI sem reescrever dados históricos', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('alt="D&amp;R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional"')
    expect(html).toContain('12,5 ppm')
    expect(html).toContain('78 ppm')
    expect(html).toMatch(/CA da peça facial<\/th><td[^>]*>4115/)
    expect(html).toMatch(/CA do cartucho\/filtro<\/th><td[^>]*>5635/)
    expect(html).toMatch(/CA<\/th><td[^>]*>5657/)
    expect(html).toMatch(/Eficácia comprovada<\/th><td[^>]*>Sim/)
    expect(html).not.toContain('registro legado que não deve prevalecer')
    expect(html).not.toMatch(/undefined|null/)
  })

  it('mantém fallback legado, unidade de oxigênio e omite bloco de EPI vazio', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('85 dB(A)')
    expect(html).toContain('18 % O₂ em volume')
    expect(html).toContain('90 - 17 = 73 dB(A)')
    expect(html).toContain('Proteção eficaz')
  })

  it('preserva valor medido estruturado mesmo quando a unidade não foi informada', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('7,25')
    expect(html).not.toContain('legado sem unidade que não deve prevalecer')
  })

  it('organiza agentes e EPIs em seções próprias sem duplicação', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )
    const inicio = html.indexOf('7.2. NR-15')
    const fim = html.indexOf('8. Dos Equipamentos de Proteção Individual')
    const secaoAgentes = html.slice(inicio, fim)
    const inicioEpis = fim
    const fimEpis = html.indexOf('9. Das Proteções Coletivas')
    const secaoEpis = html.slice(inicioEpis, fimEpis)

    expect(secaoAgentes).toContain('class="agente-bloco"')
    expect(secaoAgentes).not.toContain('class="agentes-table table-fixed"')
    expect(secaoAgentes).toContain('<th>Propriedade</th><th>Informação</th>')
    expect(secaoAgentes).not.toContain('CA da peça facial')
    expect(secaoEpis).toContain('CA da peça facial')
    expect(secaoEpis).toContain('90 - 17 = 73 dB(A)')
    expect(secaoEpis).toMatch(/Eficácia comprovada<\/th><td[^>]*>Sim/)
    // A foto marcada 'epi' saiu do item 8 (agora sem fotos) e passou a sair
    // junto das evidências do 6.3 — não pode duplicar nas duas seções.
    expect(secaoEpis).not.toContain('EPI reconhecido na diligência')
    const secaoVistoria = html.slice(
      html.indexOf('6.3. Constatações da Vistoria Pericial'),
      html.indexOf('6.4. Produtos Utilizados Habitualmente nas Atividades'),
    )
    expect(secaoVistoria).toContain('EPI reconhecido na diligência')
  })

  // Espelha server/src/services/documento-parecer.test.ts (PDF) e
  // docx-parecer.test.ts (DOCX): os três renderizadores têm de emitir a
  // seção 7 e as fotografias na mesma ordem.
  it('abre a seção 7 pelo 7.1, antes da tabela de períodos', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('7.1. Atividades Efetivamente Exercidas')
    expect(html.indexOf('7.1. Atividades Efetivamente Exercidas')).toBeLessThan(
      html.indexOf('Auxiliar de Produção'),
    )
  })

  it('abre a seção 3 pelo 3.1, sem texto de nível 1', () => {
    // Título de nível 1 não leva texto próprio: o subitem sobe colado no
    // título. O campo antigo entra preenchido de propósito — é assim que se
    // vê que a prévia não volta a imprimi-lo, igual ao PDF e ao DOCX.
    const comTextoAntigo = {
      ...pericia,
      tecnico: { ...pericia.tecnico, descricaoEmpresa: 'Texto antigo do nível 1.' },
    } as Pericia
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={comTextoAntigo} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).not.toContain('Texto antigo do nível 1.')
    expect(html).toContain(
      '<h2>3. Descrição das Instalações da Reclamada</h2><h3>3.1. Instalações Físicas</h3>',
    )
  })

  it('numera as fotografias na sequência em que elas saem no documento', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    // A foto de "Ambiente" sai no item 3.1 e a de "EPIs" só no item 6.3
    // (evidências constatadas em perícia), ainda que as duas tenham sido
    // gravadas com ordem 1.
    expect(html.indexOf('Fotografia 1 – Vista geral do galpão')).toBeLessThan(
      html.indexOf('Fotografia 2 – EPI reconhecido na diligência'),
    )
    expect(html.indexOf('3.1. Instalações Físicas')).toBeLessThan(
      html.indexOf('Fotografia 1'),
    )
  })

  it('abre a capa na ordem que o perito aprovou', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    // Endereçamento → IDENTIFICAÇÃO DAS PARTES → ficha → título → qualificação.
    // A mesma ordem está travada no PDF e no DOCX (server/scripts/smoke-*.ts).
    const abertura = [
      'EXCELENTÍSSIMO',
      'IDENTIFICAÇÃO DAS PARTES',
      'Processo nº',
      '<h1>',
      'APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA',
    ]

    let posicaoAnterior = -1
    for (const trecho of abertura) {
      const posicao = html.indexOf(trecho)
      expect(posicao, trecho).toBeGreaterThan(posicaoAnterior)
      posicaoAnterior = posicao
    }

    // A ficha antiga da prévia não pode voltar: a vara já está no
    // endereçamento e PDF e DOCX rotulam toda reclamada de "Reclamada".
    expect(html).not.toContain('Vara / Comarca')
    expect(html).not.toContain('Reclamada principal')
    expect(html).not.toContain('Reclamada solidária')
  })

  it('desce a identificação das partes e começa o item 1 na folha 2', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    // O vão da folha de rosto fica entre o endereçamento e a identificação…
    expect(html.indexOf('EXCELENTÍSSIMO')).toBeLessThan(html.indexOf('espaco-capa'))
    expect(html.indexOf('espaco-capa')).toBeLessThan(html.indexOf('IDENTIFICAÇÃO DAS PARTES'))
    // …e a marca de folha nova vem logo antes do item 1 (no print ela vira
    // quebra de página de verdade).
    expect(html).toMatch(/<div class="quebra-folha" aria-hidden="true"><span>Folha 2<\/span><\/div><h2 class="mt-0">1\. Objeto da Perícia/)
    expect(html.match(/quebra-folha/g)?.length).toBe(1)
  })

  it('fecha o parecer com data e assinatura num bloco só, com respiro maior', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={pericia}
        empresas={[]}
        titulo="Parecer de teste"
        perito={{
          id: 'u1', nome: 'Dinoel Ribeiro', email: 'd@x.com', perfil: 'perito', ativo: true,
          titulo: 'Engenheiro de Segurança do Trabalho', registroProfissional: 'CREA/SP 123',
        } as never}
      />,
    )

    expect(html).toMatch(
      /<div class="fecho fecho-parecer"><p class="local-data no-indent text-center">[^<]*, \d{1,2} de [a-zç]+ de \d{4}\.<\/p><div class="assinatura"><div class="traco"><p class="no-indent font-bold">Dinoel Ribeiro<\/p>/,
    )
    expect(html).toContain('<p class="no-indent text-[10pt]">CREA/SP 123</p>')
    // Sem assinatura cadastrada, a linha fica em branco para assinar à mão.
    expect(html).not.toContain('assinatura-imagem')
  })

  it('pousa a assinatura manuscrita do perito sobre a linha', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview
        pericia={pericia}
        empresas={[]}
        titulo="Parecer de teste"
        perito={{
          id: 'u1', nome: 'Dinoel Ribeiro', email: 'd@x.com', perfil: 'perito', ativo: true,
          assinaturaUrl: '/api/uploads/assinatura-u1.png',
        } as never}
      />,
    )

    expect(html).toContain(
      '<div class="assinatura com-imagem"><img class="assinatura-imagem" src="/api/uploads/assinatura-u1.png" alt="Assinatura de Dinoel Ribeiro"/><div class="traco">',
    )
  })

  it('segue a estrutura enxuta aprovada com numeração jurídica fixa de 1 a 14', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    const titulos = [
      '1. Objeto da Perícia e Dados Contratuais',
      '2. Da Diligência Técnica Pericial',
      '3. Descrição das Instalações da Reclamada',
      '4. Critérios Técnicos para Avaliação Pericial',
      '5. Metodologia de Avaliação',
      '6. Descrição do Posto de Trabalho, Máquinas, Ferramentas e Produtos',
      '7. Histórico Laboral, Períodos e Atividades Habituais Exercidas',
      '8. Dos Equipamentos de Proteção Individual (NR-06)',
      '9. Das Proteções Coletivas',
      '10. Análise Técnica dos Agentes, Atividades e Riscos Identificados',
      '11. NR-15 — Conclusão e Fundamentação',
      '12. NR-16 — Conclusão e Fundamentação',
      '13. Respostas aos Quesitos Técnicos',
      '14. Encerramento',
    ]

    let posicaoAnterior = -1
    for (const titulo of titulos) {
      const posicao = html.indexOf(titulo)
      expect(posicao, titulo).toBeGreaterThan(posicaoAnterior)
      posicaoAnterior = posicao
    }
    expect(html).not.toContain('Relatório Fotográfico')
    expect(html).not.toContain('Tramitação')
  })

  it('mostra o período calculado sem repetir a justificativa legal', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('10/06/2021 até o fim do contrato')
    expect(html).not.toContain('Cinco anos anteriores ao ajuizamento da ação')
  })

  it('estrutura as versões das partes e as considerações em itens próprios', () => {
    const comDivergencias = {
      ...pericia,
      tecnico: {
        ...pericia.tecnico,
        divergenciasFaticas: '',
        alegacoesReclamante: 'Versão apresentada pelo reclamante.',
        informacoesReclamada: 'Versão apresentada pela reclamada.',
        consideracoesDivergencias: 'Síntese técnica das divergências.',
      },
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={comDivergencias} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('7.4.1. Alegações do Reclamante')
    expect(html).toContain('7.4.2. Informações prestadas pela Reclamada')
    expect(html).toContain('7.5. Considerações sobre as divergências fáticas')
  })

  it('mostra número do endereço, itens editáveis dos agentes e os novos textos técnicos', () => {
    const revisada = {
      ...pericia,
      numeroVistoria: '125',
      tecnico: {
        ...pericia.tecnico,
        notaTecnicaEpis: 'Nota Técnica sobre a Primazia da Realidade.',
        criterioAvaliacaoPericulosidade:
          'A caracterização da periculosidade é realizada mediante avaliação qualitativa.',
        agentes: [
          { ...pericia.tecnico.agentes[0], observacao: 'Análise editável do agente químico.' },
          { ...pericia.tecnico.agentes[1], observacao: 'Análise editável do agente físico.' },
          {
            id: 'agente-biologico',
            nome: 'Agentes biológicos',
            tipo: 'biologico',
            criterio: 'qualitativo',
            observacao: 'Análise editável do agente biológico.',
          },
          {
            id: 'risco-inflamaveis',
            nome: 'Inflamáveis',
            tipo: 'periculosidade',
            criterio: 'qualitativo',
            anexoNr16: 'ANEXO_02',
            observacao: 'Análise editável da periculosidade.',
          },
        ],
      },
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={revisada} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('Local da vistoria, nº 125')
    expect(html).toContain('7.2.1. Agente Químico — Acetaldeído')
    expect(html).toContain('7.2.2. Agente Físico — Ruído contínuo')
    expect(html).toContain('7.2.3. Agente Biológico — Agentes biológicos')
    expect(html).toContain('Análise editável do agente químico.')
    expect(html).toContain('7.3.1. Critério de Avaliação')
    expect(html).toContain('avaliação qualitativa')
    expect(html).toContain('Nota Técnica sobre a Primazia da Realidade.')
  })

  it('em parecer só de periculosidade omite a NR-15 e renumera as seções finais', () => {
    const somentePericulosidade = {
      ...pericia,
      modalidade: 'periculosidade',
      tecnico: {
        ...pericia.tecnico,
        respostasQuesitos: '',
        agentes: [{
          id: 'risco-inflamaveis',
          nome: 'Inflamáveis',
          tipo: 'periculosidade',
          criterio: 'qualitativo',
          anexoNr16: 'ANEXO_02',
          atividadeEnquadrada: 'Operação em bomba de abastecimento',
          areaRisco: 'Área de operação da bomba',
          exposicaoPericulosidade: 'intermitente',
          resultadoPericulosidade: 'caracterizada',
        }],
      },
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={somentePericulosidade} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('7.2. NR-16 — Avaliação das Atividades e Operações Perigosas')
    expect(html).not.toContain('NR-15 — Avaliação da Exposição Ocupacional')
    expect(html).not.toContain('NR-15 — Conclusão e Fundamentação')
    expect(html).toContain('11. NR-16 — Conclusão e Fundamentação')
    expect(html).toContain('12. Encerramento')
    expect(html).not.toContain('14. Encerramento')
  })

  it('usa a data e a cidade escolhidas para a assinatura', () => {
    const configurada = {
      ...pericia,
      tecnico: {
        ...pericia.tecnico,
        dataAssinatura: '2026-08-20',
        cidadeAssinatura: 'Santo André',
      },
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={configurada} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('Santo André, 20 de agosto de 2026.')
  })

  it('gera endereçamento e objetivo automaticamente e mostra início e término da vistoria', () => {
    const automatica = {
      ...pericia,
      horaVistoria: '09:00',
      horaFimVistoria: '10:30',
      tecnico: {
        ...pericia.tecnico,
        enderecamento: 'ENDEREÇAMENTO ANTIGO QUE NÃO DEVE SAIR',
        objetivoPericia: 'OBJETIVO ANTIGO QUE NÃO DEVE SAIR',
      },
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={automatica} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA VARA DO TRABALHO — SÃO PAULO/SP')
    expect(html).toContain('Avaliar, sob o ponto de vista técnico, a caracterização ou não de insalubridade')
    expect(html).toContain('Avaliar, sob o ponto de vista técnico, a caracterização ou não de periculosidade')
    expect(html).toContain('das 09:00 às 10:30')
    expect(html).not.toContain('ENDEREÇAMENTO ANTIGO QUE NÃO DEVE SAIR')
    expect(html).not.toContain('OBJETIVO ANTIGO QUE NÃO DEVE SAIR')
    expect(html).toContain('Equipamento')
    expect(html).toContain('Descrição')
    expect(html).toContain('Validade do CA')
    expect(html).not.toMatch(/>Categoria<|>Modelo<|>Marca</)
    expect(html).toContain('Fotografia 2 – EPI reconhecido na diligência - Fonte: Ato pericial.')
    expect(html).toContain('10.1.1. Acetaldeído')
    expect(html).toContain('Proteções associadas')
    expect(html.indexOf('Proteção 1')).toBeLessThan(html.indexOf('Proteção 2'))
    expect(html.indexOf('Proteção 2')).toBeLessThan(html.indexOf('Proteção 3'))
    expect(html).not.toContain('Sendo o que se apresenta para o momento')
  })

  it('identifica no documento a empresa representada por cada participante', () => {
    const empresa = {
      id: 'empresa-2',
      razaoSocial: 'Segunda Reclamada Ltda.',
      cnpj: '12.345.678/0001-90',
      endereco: '',
      cidade: 'São Paulo',
      uf: 'SP',
      criadoEm: '2026-08-01',
    }
    const comRepresentante = {
      ...pericia,
      reclamadas: [{ id: 'reclamada-2', empresaId: empresa.id, principal: true }],
      participantes: [
        { id: 'participante-1', nome: 'Maria da Silva', papel: 'preposto', empresaId: empresa.id },
      ],
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={comRepresentante} empresas={[empresa]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('Preposto, Segunda')
  })

  it('nomeia o subitem 6.1 como descrição do posto de trabalho', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('6.1. Descrição do Posto de Trabalho')
    expect(html).not.toContain('6.1. Características do Posto de Trabalho')
  })

  it('usa data e cidade da vistoria como padrão da assinatura', () => {
    const comEnderecoCompleto = {
      ...pericia,
      localVistoria: 'Rua das Flores — Centro — Cajamar/SP',
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={comEnderecoCompleto} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('Cajamar, 14 de agosto de 2026.')
  })

  it('identifica o reclamante pelo CPF e apresenta a função inicial separadamente', () => {
    const identificada = {
      ...pericia,
      cpfReclamante: '12345678900',
      funcaoReclamante: 'Operador de Produção',
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={identificada} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toMatch(
      /<th>Reclamante<\/th><td>\s*Pessoa reclamante\s*— CPF: 123\.456\.789-00\s*<\/td>/,
    )
    expect(html).not.toMatch(/<th>Reclamante<\/th><td>[^<]*Operador de Produção/)
    expect(html).toMatch(/<th>Função Inicial<\/th><td>Operador de Produção<\/td>/)
  })

  it('não imprime marcadores internos quando campos, agentes ou EPIs estão vazios', () => {
    const vazia = {
      ...pericia,
      modalidade: 'insalubridade',
      tecnico: {
        ...pericia.tecnico,
        apresentacao: '',
        objetivoPericia: '',
        descricaoEmpresa: '',
        descricaoAmbiente: '',
        descricaoPostoTrabalho: '',
        maquinasFerramentas: '',
        produtosUtilizados: '',
        atividadesFuncoes: '',
        agentes: [],
        normasReferencias: '',
        equipamentosAnalisados: '',
        informacoesLevantadas: '',
        notaTecnicaEpis: '',
        protecoesColetivas: '',
        analiseTecnica: '',
        conclusao: '',
        conclusaoInsalubridade: '',
        encerramento: '',
        observacoesAdicionais: '',
      },
    } satisfies Pericia

    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={vazia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).not.toContain('[Seção não preenchida]')
    expect(html).not.toContain('[Nenhum agente cadastrado]')
    expect(html).not.toContain('[Nenhum EPI associado aos agentes]')
  })
})
