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
    atividadesFuncoes: '',
    periodos: [],
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
  fotos: [
    {
      id: 'foto-epi',
      secao: 'epi',
      url: '/foto-epi.jpg',
      legenda: 'EPI reconhecido na diligência',
      ordem: 1,
    },
  ],
} satisfies Pericia

describe('DocumentoPreview', () => {
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
    expect(secaoEpis).toContain('EPI reconhecido na diligência')
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
