import { describe, expect, it } from 'vitest'

import { montarApresentacaoAgente } from './apresentacaoAgente'
import type { AgenteAvaliado } from '@/types'

const ruido: AgenteAvaliado = {
  id: 'ruido-1',
  nome: 'Ruído',
  tipo: 'fisico',
  criterio: 'quantitativo',
  anexoNr15: 'ANEXO_01',
  cas: 'não deve aparecer',
  limiteTolerancia: '85 dB(A) para jornada de 8h/dia (q=5)',
  valorMedido: '90',
  unidadeMedicao: 'dB(A)',
  grau: 'medio',
  epis: [
    { categoria: 'Proteção auditiva', modelo: 'Protetor CA 11882', marca: 'Marca', validadeCa: '31/12/2028', caUnico: '11882', nivelProtecaoDb: 17, metodoAtenuacao: 'NRRsf' },
    { categoria: 'Proteção auditiva', modelo: 'CA sem nível', marca: 'Marca', caUnico: '00000', nivelProtecaoDb: null },
  ],
}

describe('montarApresentacaoAgente', () => {
  it('omite CAS irrelevante e apresenta cálculo individual de cada proteção auditiva', () => {
    const apresentacao = montarApresentacaoAgente(ruido)

    expect(apresentacao.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'CAS' }))
    expect(apresentacao.linhas).toContainEqual({ rotulo: 'Medição registrada', valor: '90 dB(A)' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Equipamento', valor: 'Proteção auditiva' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Descrição', valor: 'Protetor CA 11882' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Validade do CA', valor: '31/12/2028' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Cálculo', valor: '90 - 17 = 73 dB(A)' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Conclusão', valor: 'Proteção eficaz', destaque: 'positivo' })
    expect(apresentacao.protecoes[1]?.linhas).toContainEqual({ rotulo: 'NRRsf', valor: 'Não informado — considerado 0 dB', destaque: 'aviso' })
    expect(apresentacao.protecoes[1]?.linhas).toContainEqual({ rotulo: 'Cálculo', valor: '90 - 0 = 90 dB(A)' })
  })

  it('mantém CAS e eficácia manual para agente químico legado', () => {
    const apresentacao = montarApresentacaoAgente({
      id: 'quimico-1', nome: 'Acetaldeído', tipo: 'quimico', criterio: 'quantitativo',
      anexoNr15: 'ANEXO_11', cas: '75-07-0', valorMedido: '12.5', unidadeMedicao: 'ppm',
      epis: [{ categoria: 'Proteção respiratória', modelo: 'PFF2', marca: 'Marca', caUnico: '5657' }],
      epiEficaz: true,
    })

    expect(apresentacao.linhas).toContainEqual({ rotulo: 'CAS', valor: '75-07-0' })
    expect(apresentacao.protecoes[0]?.linhas).toContainEqual({ rotulo: 'Eficácia comprovada', valor: 'Sim', destaque: 'positivo' })
  })
})
