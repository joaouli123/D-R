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
    expect(html).toContain('CA da peça facial: 4115')
    expect(html).toContain('CA do cartucho/filtro: 5635')
    expect(html).toContain('CA: 5657')
    expect(html).not.toContain('registro legado que não deve prevalecer')
    expect(html).not.toMatch(/undefined|null/)
  })

  it('mantém fallback legado, unidade de oxigênio e omite bloco de EPI vazio', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('85 dB(A)')
    expect(html).toContain('18 % O₂ em volume')
    expect(html.match(/EPIs associados/g) ?? []).toHaveLength(1)
  })

  it('preserva valor medido estruturado mesmo quando a unidade não foi informada', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )

    expect(html).toContain('7,25')
    expect(html).not.toContain('legado sem unidade que não deve prevalecer')
  })

  it('mantém sete colunas e incorpora os EPIs somente na célula do agente', () => {
    const html = renderToStaticMarkup(
      <DocumentoPreview pericia={pericia} empresas={[]} titulo="Parecer de teste" />,
    )
    const inicio = html.indexOf('Agentes e Riscos Avaliados')
    const fim = html.indexOf('Normas e Referências Técnicas Utilizadas')
    const secaoAgentes = html.slice(inicio, fim)

    expect(secaoAgentes).toContain('<table class="agentes-table table-fixed">')
    expect(secaoAgentes.match(/<th(?:\s|>)/g) ?? []).toHaveLength(7)
    expect(secaoAgentes).not.toMatch(/<th[^>]*>EPIs associados<\/th>/)
    expect(secaoAgentes).toMatch(/<td><p>Acetaldeído<\/p>[\s\S]*EPIs associados[\s\S]*CA: 5657[\s\S]*<\/td><td>/)
    expect(secaoAgentes.match(/EPIs associados/g) ?? []).toHaveLength(1)
  })
})
