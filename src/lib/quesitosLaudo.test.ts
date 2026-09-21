import { describe, expect, it } from 'vitest'

import { blocosQuesitosDoLaudo, gruposQuesitosDoLaudo } from './quesitosLaudo'

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

describe('blocosQuesitosDoLaudo', () => {
  it('imprime o texto legado dos quesitos depois dos grupos, com título próprio', () => {
    expect(blocosQuesitosDoLaudo({
      respostasQuesitos: '  Resposta antiga.  ',
      quesitosJuizo: 'Perguntas do juízo.',
    })).toEqual([
      { chave: 'quesitosJuizo', titulo: 'Quesitos do Juízo', texto: 'Perguntas do juízo.' },
      { chave: 'respostasQuesitos', titulo: 'Outras respostas aos quesitos', texto: 'Resposta antiga.' },
    ])
  })

  it('imprime o legado sozinho, sem subtítulo, quando não há grupo preenchido', () => {
    expect(blocosQuesitosDoLaudo({ respostasQuesitos: 'Resposta antiga.' })).toEqual([
      { chave: 'respostasQuesitos', texto: 'Resposta antiga.' },
    ])
  })

  it('não cria bloco para legado em branco nem para perícia sem quesito algum', () => {
    expect(blocosQuesitosDoLaudo({ respostasQuesitos: '   ' })).toEqual([])
    expect(blocosQuesitosDoLaudo({})).toEqual([])
  })
})
