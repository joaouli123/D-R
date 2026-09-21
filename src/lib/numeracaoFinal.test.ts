import { describe, expect, it } from 'vitest'

import { numerarItensFinais } from './numeracaoFinal'

describe('numerarItensFinais', () => {
  it('numera do 11 em diante, sem buracos, conforme o que entra no documento', () => {
    expect(numerarItensFinais({ modalidade: 'ambas', temQuesitos: true, temHonorarios: true })).toEqual({
      conclusaoNr15: 11,
      conclusaoNr16: 12,
      quesitos: 13,
      encerramento: 14,
      honorarios: 15,
    })
  })

  it('não reserva número para quesitos nem honorários vazios', () => {
    expect(numerarItensFinais({ modalidade: 'ambas', temQuesitos: false, temHonorarios: false })).toEqual({
      conclusaoNr15: 11,
      conclusaoNr16: 12,
      quesitos: null,
      encerramento: 13,
      honorarios: null,
    })
  })

  it('só insalubridade não tem a conclusão da NR-16', () => {
    expect(numerarItensFinais({ modalidade: 'insalubridade', temQuesitos: true, temHonorarios: true })).toEqual({
      conclusaoNr15: 11,
      conclusaoNr16: null,
      quesitos: 12,
      encerramento: 13,
      honorarios: 14,
    })
  })

  it('só periculosidade começa pela conclusão da NR-16, no 11', () => {
    expect(numerarItensFinais({ modalidade: 'periculosidade', temQuesitos: false, temHonorarios: true })).toEqual({
      conclusaoNr15: null,
      conclusaoNr16: 11,
      quesitos: null,
      encerramento: 12,
      honorarios: 13,
    })
  })
})
