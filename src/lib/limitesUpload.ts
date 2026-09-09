// ============================================================
// Gêmeo de server/src/limites.ts — o front não pode importar de
// server/src. Mudou aqui, mude lá: server/src/limites.test.ts compara os
// dois e quebra se divergirem.
//
// Aqui mora também a conferência que roda ANTES do envio. Sem ela o perito
// espera a foto inteira subir para só então ouvir “arquivo grande demais”
// — e, com corpo grande, a resposta às vezes nem chega legível ao
// navegador: aparece como falha de rede, sem explicação nenhuma.
// ============================================================

export const LIMITE_IMAGEM_MB = 3

export const LIMITE_IMAGEM_BYTES = LIMITE_IMAGEM_MB * 1024 * 1024

export const LIMITE_FOTOS_POR_ENVIO = 30

/** O que interessa de um `File` — o teste não precisa de um File de verdade. */
export interface ArquivoEscolhido {
  name: string
  size: number
}

function emMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1).replace('.', ',')
}

/**
 * Devolve o aviso a mostrar, ou `undefined` quando tudo cabe no limite.
 *
 * Nomeia o arquivo e o tamanho dele: numa seleção de vinte fotos, “alguma
 * passou do limite” não diz qual trocar.
 */
export function recusaPorTamanho(arquivos: ArquivoEscolhido[]): string | undefined {
  const grandes = arquivos.filter((arquivo) => arquivo.size > LIMITE_IMAGEM_BYTES)
  if (grandes.length === 0) return undefined

  const nomes = grandes
    .slice(0, 3)
    .map((arquivo) => `“${arquivo.name}” (${emMb(arquivo.size)} MB)`)
    .join(', ')
  const resto = grandes.length > 3 ? ` e mais ${grandes.length - 3}` : ''
  const verbo = grandes.length > 1 ? 'passam' : 'passa'
  return `${nomes}${resto} ${verbo} do limite de ${LIMITE_IMAGEM_MB} MB por imagem. Reduza a resolução e envie de novo.`
}

/**
 * Devolve o aviso de lote grande demais, ou `undefined` quando cabe.
 *
 * A tela anuncia o teto de fotos por envio, mas o `<input multiple>` não o
 * impõe: sem esta conferência o perito seleciona a pasta inteira, espera a
 * subida e recebe do servidor um 400 que o navegador costuma mostrar como
 * falha de rede.
 */
export function recusaPorQuantidade(arquivos: { length: number }): string | undefined {
  if (arquivos.length <= LIMITE_FOTOS_POR_ENVIO) return undefined
  return `Você escolheu ${arquivos.length} fotos. Envie no máximo ${LIMITE_FOTOS_POR_ENVIO} por vez — pode repetir o envio quantas vezes precisar.`
}
