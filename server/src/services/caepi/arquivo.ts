// ============================================================
// Leitura do CSV do CAEPI, venha ele de onde vier.
//
// Isolado num módulo só porque o `.gz` do portal tem uma armadilha
// que todo mundo que lê a base precisa tratar igual: os dois scripts
// (sync e validar), o download do portal e o upload pelo painel.
// ============================================================

import { createReadStream } from 'node:fs'
import { PassThrough, Transform, pipeline } from 'node:stream'
import { createInflateRaw } from 'node:zlib'

/**
 * O arquivo que o portal entrega não termina no fim do membro gzip:
 * vem HTML da própria página colado depois, às vezes cortado no meio
 * de uma tag. `createGunzip` lê a base inteira, tenta interpretar esse
 * resto como um segundo membro e estoura "incorrect header check" —
 * e, em arquivos pequenos, descarta junto tudo o que já tinha
 * descomprimido.
 *
 * A saída é não entregar esse lixo ao zlib. Removendo o cabeçalho
 * gzip na mão e inflando o corpo com `inflateRaw`, a leitura termina
 * sozinha no bloco final do deflate e ignora o que vier depois, sem
 * perder nada e sem erro para engolir.
 *
 * Corrupção de verdade continua estourando: cabeçalho inválido falha
 * aqui, e download cortado no meio falha no inflate. As duas coisas
 * precisam falhar — importar meia base seria pior que não importar.
 */

/** Tamanho do cabeçalho gzip, ou `null` se ainda faltam bytes para saber. */
function fimDoCabecalhoGzip(dados: Buffer): number | null {
  if (dados.length < 10) return null
  if (dados[0] !== 0x1f || dados[1] !== 0x8b) {
    throw new Error('Arquivo .gz inválido: não começa com um cabeçalho gzip. Baixe o CSV de novo pelo navegador.')
  }
  if (dados[2] !== 8) {
    throw new Error(`Arquivo .gz inválido: método de compressão ${dados[2]} não suportado.`)
  }

  const bandeiras = dados[3] as number
  let posicao = 10

  if (bandeiras & 0x04) {
    // FEXTRA: 2 bytes de tamanho + o campo em si.
    if (dados.length < posicao + 2) return null
    posicao += 2 + dados.readUInt16LE(posicao)
  }
  for (const bandeira of [0x08, 0x10]) {
    // FNAME e FCOMMENT: texto terminado em zero.
    if (!(bandeiras & bandeira)) continue
    const zero = dados.indexOf(0, posicao)
    if (zero < 0) return null
    posicao = zero + 1
  }
  if (bandeiras & 0x02) posicao += 2 // FHCRC

  return dados.length < posicao ? null : posicao
}

/** Descarta o cabeçalho gzip e repassa o corpo deflate adiante. */
class SemCabecalhoGzip extends Transform {
  private acumulado: Buffer | null = Buffer.alloc(0)

  override _transform(pedaco: Buffer, _codificacao: BufferEncoding, pronto: (erro?: Error | null) => void) {
    if (this.acumulado === null) {
      this.push(pedaco)
      return pronto()
    }

    this.acumulado = Buffer.concat([this.acumulado, pedaco])
    let fim: number | null
    try {
      fim = fimDoCabecalhoGzip(this.acumulado)
    } catch (erro) {
      return pronto(erro as Error)
    }
    if (fim === null) return pronto() // ainda não deu para ler o cabeçalho inteiro

    const corpo = this.acumulado.subarray(fim)
    this.acumulado = null
    if (corpo.length) this.push(corpo)
    pronto()
  }

  override _flush(pronto: (erro?: Error | null) => void) {
    if (this.acumulado !== null) {
      return pronto(new Error('Arquivo .gz inválido: acabou antes do fim do cabeçalho gzip.'))
    }
    pronto()
  }
}

/** O nome indica um arquivo comprimido? Mesma regra em todo lugar. */
export function pareceComprimido(nome: string): boolean {
  return /\.gz$/i.test(nome.trim())
}

/**
 * Entrega o CSV como texto, descomprimindo quando `comprimido`.
 *
 * Serve para qualquer origem: arquivo no disco, resposta do portal ou
 * corpo de um upload. Quem chama diz se está comprimido — deduzir
 * pelos bytes seria pior, porque um `.gz` corrompido passaria batido
 * como se fosse texto puro em vez de estourar.
 */
export function descomprimirCsvCaepi(
  entrada: NodeJS.ReadableStream,
  comprimido: boolean,
): NodeJS.ReadableStream {
  if (!comprimido) {
    entrada.setEncoding('utf8')
    return entrada
  }

  const saida = new PassThrough({ encoding: 'utf8' })
  pipeline(entrada, new SemCabecalhoGzip(), createInflateRaw(), saida, (erro) => {
    if (erro) saida.destroy(erro)
  })
  return saida
}

/** Abre o CSV do CAEPI, descomprimindo quando o nome termina em `.gz`. */
export function abrirCsvCaepi(caminho: string): NodeJS.ReadableStream {
  return descomprimirCsvCaepi(createReadStream(caminho), pareceComprimido(caminho))
}
