import { describe, expect, it } from 'vitest'

import { medicaoAdotada, normalizarNumeroMedido, unidadesDisponiveis } from './medicoes'
import { SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'

describe('medições estruturadas', () => {
  it('separa unidades disponíveis sem converter valores', () => {
    expect(unidadesDisponiveis({ limites: { ppm: '78', 'mg/m³': '140' } })).toEqual(['ppm', 'mg/m³'])
  })

  it('disponibiliza o limite de oxigênio dos asfixiantes simples sem conversão', () => {
    const acetileno = SUBSTANCIAS_ANEXO_11.find(item => item.label === 'Acetileno')

    expect(acetileno).toBeDefined()
    expect(unidadesDisponiveis(acetileno!)).toEqual(['% O₂ em volume'])
  })

  it('ignora chaves de unidade desconhecidas recebidas em runtime', () => {
    const referencia = { limites: { ppm: '78', psi: '10', 'mg/m³': '140' } } as never

    expect(unidadesDisponiveis(referencia)).toEqual(['ppm', 'mg/m³'])
  })

  it('normaliza decimal com vírgula e rejeita valor não numérico', () => {
    expect(normalizarNumeroMedido(' 12,5 ')).toBe('12.5')
    expect(normalizarNumeroMedido('doze')).toBeNull()
  })
})

describe('medicaoAdotada', () => {
  it('adota a do perito quando a origem não foi declarada', () => {
    expect(medicaoAdotada({ valorMedido: '88.41' })).toEqual({
      valor: '88.41',
      origem: 'perito',
      rotuloOrigem: 'Avaliação do perito em diligência',
      divergente: false,
    })
  })

  it('adota a da empresa e carrega o documento de origem', () => {
    expect(medicaoAdotada({
      medicaoEmpresa: '83',
      fonteMedicaoEmpresa: 'PGR 2024',
      origemMedicao: 'empresa',
    })).toMatchObject({ valor: '83', fonte: 'PGR 2024', divergente: false })
  })

  it('marca divergência quando as duas existem e não batem', () => {
    // O caso do Jhonathan: 83 dB no PGR contra 88,41 dB na diligência.
    const adotada = medicaoAdotada({ valorMedido: '88.41', medicaoEmpresa: '83', origemMedicao: 'perito' })

    expect(adotada.valor).toBe('88.41')
    expect(adotada.divergente).toBe(true)
  })

  it('não acusa divergência quando os números empatam com grafia diferente', () => {
    expect(medicaoAdotada({ valorMedido: '83.0', medicaoEmpresa: '83' }).divergente).toBe(false)
  })

  it('sem medição do perito, cai na da empresa e diz isso no laudo', () => {
    expect(medicaoAdotada({ medicaoEmpresa: '83', origemMedicao: 'nao_informado' })).toMatchObject({
      valor: '83',
      rotuloOrigem: 'Não informado pelo perito — adotada a avaliação da empresa',
      divergente: false,
    })
  })
})
