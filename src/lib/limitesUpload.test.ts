import { describe, expect, it } from 'vitest'
import {
  LIMITE_FOTOS_POR_ENVIO,
  LIMITE_IMAGEM_BYTES,
  recusaPorQuantidade,
  recusaPorTamanho,
} from './limitesUpload'

const foto = (name: string, mb: number) => ({ name, size: Math.round(mb * 1024 * 1024) })

describe('recusaPorTamanho', () => {
  it('deixa passar o que cabe no limite', () => {
    expect(recusaPorTamanho([foto('a.jpg', 2.9), foto('b.jpg', 0.4)])).toBeUndefined()
  })

  it('aceita o arquivo exatamente no limite', () => {
    // As duas pontas têm de concordar na borda. Quem manda no servidor é o
    // busboy, e ele recusa quando o acumulado FICA IGUAL ao que se passou
    // em `fileSize` — daí `LIMITE_MULTER_BYTES` ser um byte maior. Sem isso,
    // a foto de exatamente 3 MB passava aqui e voltava 413 de lá.
    expect(recusaPorTamanho([{ name: 'no-limite.jpg', size: LIMITE_IMAGEM_BYTES }])).toBeUndefined()
  })

  it('nomeia o arquivo e o tamanho dele, para o perito saber qual trocar', () => {
    const aviso = recusaPorTamanho([foto('boa.jpg', 1), foto('IMG_0042.jpg', 7.4)])
    expect(aviso).toContain('IMG_0042.jpg')
    expect(aviso).toContain('7,4 MB')
    expect(aviso).toContain('3 MB')
    expect(aviso).not.toContain('boa.jpg')
    // No singular. É o caminho principal da troca de logo, que manda um
    // arquivo só — e "“logo.png” (7,4 MB) passam do limite" é o tipo de
    // erro que ninguém vê no código e todo mundo vê na tela.
    expect(aviso).toContain('passa do limite')
    expect(aviso).not.toContain('passam')
  })

  it('resume quando são muitas, em vez de despejar a lista inteira', () => {
    const aviso = recusaPorTamanho(['a', 'b', 'c', 'd', 'e'].map((nome) => foto(`${nome}.jpg`, 5)))
    expect(aviso).toContain('e mais 2')
    expect(aviso).toContain('passam')
  })
})

describe('recusaPorQuantidade', () => {
  it('deixa passar o lote cheio, sem sobrar um', () => {
    expect(recusaPorQuantidade({ length: LIMITE_FOTOS_POR_ENVIO })).toBeUndefined()
  })

  it('recusa o lote de uma foto a mais e diz quantas foram escolhidas', () => {
    // O <input multiple> não impõe teto nenhum: sem esta conferência o
    // perito seleciona a pasta inteira, espera a subida e recebe do
    // servidor um 400 que o navegador costuma mostrar como falha de rede.
    const aviso = recusaPorQuantidade({ length: LIMITE_FOTOS_POR_ENVIO + 1 })
    expect(aviso).toContain(String(LIMITE_FOTOS_POR_ENVIO + 1))
    expect(aviso).toContain(String(LIMITE_FOTOS_POR_ENVIO))
  })
})
