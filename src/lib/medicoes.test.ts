import { describe, expect, it } from 'vitest'

import { FONTE_RUIDO, medicaoAdotada, normalizarNumeroMedido, unidadesDisponiveis } from './medicoes'
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
      rotuloOrigem: 'Perito — medição em perícia',
      notaOrigem: 'Medição a ser informada no laudo pericial do perito.',
      faixaEmpresa: undefined,
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
      rotuloOrigem: 'Não informado pelo perito — adotada a medição da empresa',
      notaOrigem: 'Medição conforme registros apresentados junto ao processo.',
      divergente: false,
    })
  })

  // A empresa mede ao longo de anos e o número varia. Adotar o menor
  // seria concluir por um dia bom que o trabalhador não viveu todos os
  // dias — o laudo fica com o topo da faixa.
  it('adota a maior quando a empresa informou faixa', () => {
    expect(medicaoAdotada({
      medicaoEmpresa: '83',
      medicaoEmpresaAte: '88.5',
      origemMedicao: 'empresa',
    })).toMatchObject({
      valor: '88.5',
      faixaEmpresa: { de: '83', ate: '88.5' },
    })
  })

  it('não trata como faixa quando os dois extremos são o mesmo número', () => {
    expect(medicaoAdotada({ medicaoEmpresa: '83', medicaoEmpresaAte: '83.0', origemMedicao: 'empresa' }))
      .toMatchObject({ valor: '83', faixaEmpresa: undefined })
  })

  // Só o topo preenchido é o perito que digitou um campo e pulou o
  // outro: ainda é uma medição da empresa, não a ausência de uma.
  it('aceita a faixa preenchida pela metade', () => {
    expect(medicaoAdotada({ medicaoEmpresaAte: '90', origemMedicao: 'empresa' }))
      .toMatchObject({ valor: '90', faixaEmpresa: undefined })
  })

  it('compara a divergência contra o topo da faixa da empresa', () => {
    expect(medicaoAdotada({ valorMedido: '88.5', medicaoEmpresa: '83', medicaoEmpresaAte: '88.5' }).divergente)
      .toBe(false)
  })
})

// As frases foram redigidas pelo perito e vão inteiras ao juízo. Ficam
// travadas em teste porque uma reescrita bem-intencionada aqui muda o
// que o documento afirma sobre o ambiente.
describe('fonte do ruído', () => {
  it('guarda as três frases exatas do perito', () => {
    expect(FONTE_RUIDO.maquinas.frase)
      .toBe('Ruído proveniente de máquinas, equipamentos e demais dispositivos existentes no local.')
    expect(FONTE_RUIDO.ruido_fundo.frase)
      .toBe('Não há fonte direta de ruído no local. O nível identificado corresponde ao ruído de fundo.')
    expect(FONTE_RUIDO.administrativa.frase)
      .toBe('Não há fonte de ruído relevante. Ambiente destinado a atividades administrativas, sem operação de máquinas ou equipamentos.')
  })
})
