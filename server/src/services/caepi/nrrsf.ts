// ============================================================
// Busca do NRRsf sob demanda.
//
// O NRRsf não vem no CSV do MTE: só existe na ficha individual do CA.
// Até aqui ele só era buscado pelo lote (`sincronizarFichas`), que roda
// por linha de comando — ou seja, na prática nunca rodava. O perito
// abria um protetor auditivo, não encontrava a atenuação e ia baixar o
// certificado no site do MTE à mão.
//
// Agora a consulta de um CA busca a ficha na hora. Duas defesas, porque
// o portal fica atrás do Cloudflare e devolve 403 sem aviso:
//
//   · disjuntor — depois de um bloqueio, as consultas seguintes nem
//     tentam por alguns minutos. Sem ele, todo CA aberto durante um
//     bloqueio pagaria uma ida perdida ao portal antes de responder;
//   · repescagem — o CA que falhou entra numa fila e é tentado de novo
//     sozinho, devagar. É o que faz o valor aparecer depois sem o
//     perito ter de pedir outra vez.
//
// Nada aqui sobrescreve NRRsf de fonte PERITO: o que ele digitou vale
// mais do que a ficha, porque foi ele quem conferiu o certificado.
// ============================================================

import { prisma } from '../../prisma.js'
import { normalizarNrrsf } from './normalizar.js'
import { buscarFicha, ErroDesafioCloudflare } from './portal.js'

export type EstadoBuscaNrrsf =
  /** Já havia valor gravado; o portal nem foi procurado. */
  | 'ja_tinha'
  | 'encontrado'
  /** A ficha existe, mas não publica a coluna NRRsf. */
  | 'sem_valor_na_ficha'
  | 'ca_inexistente'
  /** Cloudflare. Não é erro nosso e não adianta insistir agora. */
  | 'portal_bloqueado'
  | 'falhou'

export interface ResultadoNrrsf {
  estado: EstadoBuscaNrrsf
  nrrsfDb?: number
}

/**
 * Grava o que veio da ficha do MTE.
 *
 * `COALESCE` preserva o valor anterior quando a ficha volta sem NRRsf, e
 * o `WHERE` final é o que impede a ficha de apagar o número do perito.
 * A visita é registrada mesmo sem valor — senão a repescagem tentaria
 * os mesmos CAs para sempre.
 */
export async function gravarAtenuacaoDaFicha(
  numeroCa: string,
  nrrsfDb: number | null,
  bandas: string | null,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "cas_atenuacao" ("numeroCa", "nrrsfDb", "fonte", "bandas", "fichaConsultadaEm", "atualizadoEm")
     VALUES ($1, $2, 'CAEPI', $3::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("numeroCa") DO UPDATE SET
       "nrrsfDb"           = COALESCE(EXCLUDED."nrrsfDb", "cas_atenuacao"."nrrsfDb"),
       "bandas"            = COALESCE(EXCLUDED."bandas", "cas_atenuacao"."bandas"),
       "fichaConsultadaEm" = CURRENT_TIMESTAMP,
       "atualizadoEm"      = CURRENT_TIMESTAMP
     WHERE "cas_atenuacao"."fonte" <> 'PERITO'`,
    numeroCa,
    nrrsfDb,
    bandas,
  )
}

export interface OpcoesBuscador {
  buscar?: typeof buscarFicha
  gravar?: typeof gravarAtenuacaoDaFicha
  agora?: () => number
  /** Teto para os três postbacks encadeados da ficha. */
  tempoLimiteMs?: number
  /** Quanto tempo o disjuntor fica aberto depois de um bloqueio. */
  pausaAposBloqueioMs?: number
  /** Intervalo entre duas tentativas da fila de repescagem. */
  pausaEntreRepescagensMs?: number
  /** Quantas vezes insistir num mesmo CA antes de desistir. */
  tentativasPorCa?: number
  /** Teto da fila, para um portal fora do ar não virar memória crescendo. */
  tamanhoMaximoDaFila?: number
}

export interface Buscador {
  /**
   * Garante o NRRsf do CA, buscando a ficha se preciso.
   * `forcar` ignora o disjuntor — é o perito pedindo de novo, na mão.
   */
  garantir(numeroCa: string, forcar?: boolean): Promise<ResultadoNrrsf>
  /** Estado atual, para o smoke test e para diagnóstico. */
  situacao(): { portalBloqueadoAte: number; naFila: string[] }
  pararRepescagem(): void
}

export function criarBuscadorNrrsf(opcoes: OpcoesBuscador = {}): Buscador {
  const buscar = opcoes.buscar ?? buscarFicha
  const gravar = opcoes.gravar ?? gravarAtenuacaoDaFicha
  const agora = opcoes.agora ?? Date.now
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? 15_000
  const pausaAposBloqueioMs = opcoes.pausaAposBloqueioMs ?? 10 * 60_000
  const pausaEntreRepescagensMs = opcoes.pausaEntreRepescagensMs ?? 45_000
  const tentativasPorCa = opcoes.tentativasPorCa ?? 4
  const tamanhoMaximoDaFila = opcoes.tamanhoMaximoDaFila ?? 200

  /** Uma busca por CA de cada vez, mesmo com dois peritos no mesmo CA. */
  const emVoo = new Map<string, Promise<ResultadoNrrsf>>()
  /** CA → tentativas já gastas. */
  const fila = new Map<string, number>()
  let portalBloqueadoAte = 0
  let relogio: ReturnType<typeof setInterval> | null = null

  function enfileirar(numeroCa: string): void {
    const tentativas = fila.get(numeroCa) ?? 0
    if (tentativas >= tentativasPorCa) {
      fila.delete(numeroCa)
      return
    }
    if (!fila.has(numeroCa) && fila.size >= tamanhoMaximoDaFila) return

    fila.set(numeroCa, tentativas + 1)
    ligarRepescagem()
  }

  function ligarRepescagem(): void {
    if (relogio || pausaEntreRepescagensMs <= 0) return

    relogio = setInterval(() => {
      if (!fila.size) {
        pararRepescagem()
        return
      }
      if (portalBloqueadoAte > agora()) return

      const proximo = fila.keys().next().value
      if (proximo) void garantir(proximo)
    }, pausaEntreRepescagensMs)

    // Uma fila de repescagem não pode ser motivo para o processo do
    // servidor continuar vivo depois de pedirem para ele encerrar.
    relogio.unref?.()
  }

  function pararRepescagem(): void {
    if (!relogio) return
    clearInterval(relogio)
    relogio = null
  }

  async function executar(numeroCa: string): Promise<ResultadoNrrsf> {
    try {
      const ficha = await buscar(numeroCa, AbortSignal.timeout(tempoLimiteMs))
      if (!ficha) {
        fila.delete(numeroCa)
        return { estado: 'ca_inexistente' }
      }

      const nrrsfDb = normalizarNrrsf(ficha.nrrsfBruto)
      const bandas = Object.keys(ficha.bandas).length ? JSON.stringify(ficha.bandas) : null
      await gravar(numeroCa, nrrsfDb, bandas)

      fila.delete(numeroCa)
      return nrrsfDb == null ? { estado: 'sem_valor_na_ficha' } : { estado: 'encontrado', nrrsfDb }
    } catch (erro) {
      if (erro instanceof ErroDesafioCloudflare) {
        portalBloqueadoAte = agora() + pausaAposBloqueioMs
        enfileirar(numeroCa)
        return { estado: 'portal_bloqueado' }
      }
      enfileirar(numeroCa)
      return { estado: 'falhou' }
    }
  }

  async function garantir(numeroCa: string, forcar = false): Promise<ResultadoNrrsf> {
    const jaEmVoo = emVoo.get(numeroCa)
    if (jaEmVoo) return jaEmVoo

    if (!forcar && portalBloqueadoAte > agora()) {
      enfileirar(numeroCa)
      return { estado: 'portal_bloqueado' }
    }

    const promessa = executar(numeroCa).finally(() => emVoo.delete(numeroCa))
    emVoo.set(numeroCa, promessa)
    return promessa
  }

  return {
    garantir,
    situacao: () => ({ portalBloqueadoAte, naFila: [...fila.keys()] }),
    pararRepescagem,
  }
}

export const buscadorNrrsf = criarBuscadorNrrsf()
