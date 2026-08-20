// ============================================================
// Leitor do CSV oficial do CAEPI.
//
// O arquivo descompactado passa de 140 MB, então nada aqui pode
// carregar o conteúdo inteiro na memória: o parser é incremental e
// entrega uma linha por vez.
//
// Formato observado na base de 20/08/2026: separador ";", aspas
// duplas com escape por duplicação (""), CRLF, 19 colunas e BOM
// duplicado no início do arquivo.
// ============================================================

import { removerBom } from './normalizar.js'

export const COLUNAS_CAEPI = [
  'NR Registro CA',
  'DATA DE VALIDADE',
  'SITUACAO',
  'NR DO PROCESSO',
  'CNPJ',
  'RAZAO SOCIAL',
  'NATUREZA',
  'EQUIPAMENTO',
  'DESCRICAO EQUIPAMENTO',
  'MARCA CA',
  'REFERENCIA',
  'COR',
  'APROVADO PARA LAUDO',
  'RESTRICAO LAUDO',
  'OBSERVACAO ANALISE LAUDO',
  'CNPJ LABORATORIO',
  'RAZAO SOCIAL LABORATORIO',
  'NR LAUDO',
  'NORMA',
] as const

export type ColunaCaepi = (typeof COLUNAS_CAEPI)[number]
export type LinhaCaepi = Record<ColunaCaepi, string>

/**
 * Parser incremental de CSV com aspas.
 *
 * Mantém o estado entre blocos porque um campo entre aspas pode
 * atravessar a fronteira de um chunk do stream.
 */
export class LeitorCsv {
  private campo = ''
  private linha: string[] = []
  private dentroDeAspas = false
  /** true logo após uma aspa de fechamento, para detectar "" (escape). */
  private aspaPendente = false

  private readonly separador: string

  constructor(separador = ';') {
    this.separador = separador
  }

  /** Consome um pedaço de texto e devolve as linhas completas nele. */
  consumir(pedaco: string): string[][] {
    const linhas: string[][] = []

    for (const caractere of pedaco) {
      if (this.aspaPendente) {
        this.aspaPendente = false
        if (caractere === '"') {
          // "" dentro de campo entre aspas = uma aspa literal
          this.campo += '"'
          continue
        }
        this.dentroDeAspas = false
        // segue para o tratamento normal do caractere atual
      }

      if (this.dentroDeAspas) {
        if (caractere === '"') this.aspaPendente = true
        else this.campo += caractere
        continue
      }

      if (caractere === '"' && this.campo === '') {
        this.dentroDeAspas = true
        continue
      }

      if (caractere === this.separador) {
        this.linha.push(this.campo)
        this.campo = ''
        continue
      }

      if (caractere === '\n') {
        this.linha.push(this.campo)
        this.campo = ''
        linhas.push(this.linha)
        this.linha = []
        continue
      }

      if (caractere === '\r') continue

      this.campo += caractere
    }

    return linhas
  }

  /** Fecha o parser e devolve a última linha, se o arquivo não terminar em quebra. */
  finalizar(): string[] | null {
    if (this.campo === '' && this.linha.length === 0) return null
    this.linha.push(this.campo)
    const ultima = this.linha
    this.linha = []
    this.campo = ''
    return ultima
  }
}

/** Sinaliza um cabeçalho diferente do esperado — o MTE mudou o layout. */
export class ErroLayoutCaepi extends Error {
  readonly encontrado: string[]

  constructor(encontrado: string[]) {
    super(
      `Layout do CSV do CAEPI mudou. Esperado ${COLUNAS_CAEPI.length} colunas, veio ${encontrado.length}: ${encontrado.join(', ')}`,
    )
    this.name = 'ErroLayoutCaepi'
    this.encontrado = encontrado
  }
}

/**
 * Confere o cabeçalho contra o layout conhecido.
 *
 * Falhar aqui é intencional: se o MTE trocar as colunas de ordem, um
 * import silencioso gravaria CNPJ no lugar de norma técnica e isso
 * sairia impresso num laudo.
 */
export function validarCabecalho(bruto: string[]): void {
  const limpo = bruto.map((coluna) => removerBom(coluna).trim())
  if (limpo.length !== COLUNAS_CAEPI.length) throw new ErroLayoutCaepi(limpo)
  const divergentes = COLUNAS_CAEPI.filter((esperada, indice) => limpo[indice] !== esperada)
  if (divergentes.length) throw new ErroLayoutCaepi(limpo)
}

/** Monta o objeto nomeado a partir da linha posicional. */
export function montarLinha(valores: string[]): LinhaCaepi {
  const linha = {} as LinhaCaepi
  COLUNAS_CAEPI.forEach((coluna, indice) => {
    linha[coluna] = removerBom(valores[indice] ?? '').trim()
  })
  return linha
}

/**
 * Percorre o CSV inteiro entregando uma linha nomeada por vez.
 *
 * `fonte` é qualquer iterável de texto — um stream de arquivo decodificado
 * ou, nos testes, um array de pedaços.
 */
export async function* lerCaepi(fonte: AsyncIterable<string> | Iterable<string>): AsyncGenerator<LinhaCaepi> {
  const leitor = new LeitorCsv(';')
  let cabecalhoLido = false

  for await (const pedaco of fonte as AsyncIterable<string>) {
    for (const valores of leitor.consumir(pedaco)) {
      if (!cabecalhoLido) {
        validarCabecalho(valores)
        cabecalhoLido = true
        continue
      }
      // linha em branco no fim do arquivo
      if (valores.length === 1 && valores[0] === '') continue
      yield montarLinha(valores)
    }
  }

  const ultima = leitor.finalizar()
  if (ultima && !(ultima.length === 1 && ultima[0] === '')) {
    if (!cabecalhoLido) validarCabecalho(ultima)
    else yield montarLinha(ultima)
  }
}
