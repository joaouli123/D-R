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
  reclamadas: [],
  participantes: [],
  dataVistoria: '2026-08-14',
  localVistoria: 'Local da vistoria',
  modalidade: 'insalubridade',
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
    analiseTecnica: '',
    conclusao: '',
    observacoesAdicionais: '',
  },
  fotos: [],
} satisfies Pericia

describe('DocumentoPreview', () => {
  it('renderiza snapshots estruturados de medição e EPI sem reescrever dados históricos', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

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

  it('organiza cada agente em bloco compacto de propriedades aplicáveis', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )
    const inicio = html.indexOf('Agentes e Riscos Avaliados')
    const fim = html.indexOf('Normas e Referências Técnicas Utilizadas')
    const secaoAgentes = html.slice(inicio, fim)

    expect(secaoAgentes).toContain('class="agente-bloco"')
    expect(secaoAgentes).not.toContain('class="agentes-table table-fixed"')
    expect(secaoAgentes).toContain('<th>Propriedade</th><th>Informação</th>')
    expect(secaoAgentes).toContain('CA da peça facial')
    expect(secaoAgentes).toContain('90 - 17 = 73 dB(A)')
    expect(secaoAgentes).toMatch(/Eficácia comprovada<\/th><td[^>]*>Sim/)
  })
})
