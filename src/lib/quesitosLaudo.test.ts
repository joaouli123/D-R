import { describe, expect, it } from 'vitest'

import { gruposQuesitosDoLaudo } from './quesitosLaudo'

describe('gruposQuesitosDoLaudo', () => {
  it('mantém somente os grupos preenchidos na ordem Juízo, Reclamante e Reclamada', () => {
    expect(gruposQuesitosDoLaudo({
      quesitosReclamada: '  Perguntas da empresa.  ',
      quesitosJuizo: 'Perguntas do juízo.',
      quesitosReclamante: '   ',
    })).toEqual([
      { campo: 'quesitosJuizo', titulo: 'Quesitos do Juízo', texto: 'Perguntas do juízo.' },
      { campo: 'quesitosReclamada', titulo: 'Quesitos da Reclamada', texto: 'Perguntas da empresa.' },
    ])
  })
})
