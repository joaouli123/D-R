// ============================================================
// Colheita das fichas de NRRsf.
//
// A base inteira do CAEPI tem cerca de 540 protetores auditivos —
// não os 124 mil registros do arquivo. Varrer todos leva menos de
// meia hora, e isso muda o desenho do problema: em vez de o perito
// descobrir a falta na hora em que abre o EPI, e ficar dependendo de
// o portal do MTE estar respondendo naquele minuto, o servidor varre
// a lista inteira sozinho e guarda o resultado. Quando o perito
// chega, o número já está lá.
//
// O portal fica atrás do Cloudflare e passa dias recusando qualquer
// cliente que não seja um navegador de verdade. Por isso a rodada não
// insiste: ao primeiro desafio ela para no meio e volta mais tarde.
// Insistir com os 540 CAs durante um bloqueio não traria um valor
// sequer, e ainda seria bater na porta de um serviço público que
// acabou de dizer não.
//
// A busca sob demanda (nrrsf.ts) continua existindo — é ela que
// atende o CA que entrou na base hoje. A colheita é o que faz esse
// caso ser raro.
// ============================================================

import { normalizarNrrsf } from './normalizar.js'
import { gravarAtenuacaoDaFicha } from './nrrsf.js'
import { buscarFicha, ErroDesafioCloudflare } from './portal.js'
import { listarPendentesDeNrrsf } from './sync.js'

export type MotivoParada =
  /** Não sobrou pendente: a base está completa. */
  | 'concluida'
  /** Cloudflare. Parou no meio de propósito. */
  | 'portal_bloqueado'
  /** Erros seguidos demais — o portal está fora, não adianta seguir. */
  | 'muitas_falhas'
  /** Bateu o teto da rodada; ainda há pendentes. */
  | 'teto_da_rodada'
  | 'cancelada'

export interface ResultadoColheita {
  pendentes: number
  consultadas: number
  comNrrsf: number
  falhas: number
  motivo: MotivoParada
}

export interface OpcoesColheita {
  listarPendentes?: typeof listarPendentesDeNrrsf
  buscar?: typeof buscarFicha
  gravar?: typeof gravarAtenuacaoDaFicha
  /** Intervalo entre dois CAs. O portal é lento e sequencial. */
  pausaEntreCasMs?: number
  /** Espera depois de um desafio do Cloudflare. */
  pausaAposBloqueioMs?: number
  /** Espera depois de uma rodada que não deixou pendente. */
  intervaloEntreRodadasMs?: number
  /** Espera quando a rodada bateu o teto e ainda há fila. */
  pausaEntreLotesMs?: number
  /** Quantos CAs no máximo por rodada. */
  tetoPorRodada?: number
  /** Falhas seguidas que encerram a rodada. */
  falhasSeguidasParaParar?: number
  /** Teto para os postbacks encadeados de uma ficha. */
  tempoLimitePorCaMs?: number
  dormir?: (ms: number) => Promise<void>
  agendar?: (acao: () => void, ms: number) => { cancelar: () => void }
  agora?: () => number
}

export interface SituacaoColheita {
  ligada: boolean
  rodando: boolean
  ultima: (ResultadoColheita & { terminadaEm: string }) | null
  /** Quando a próxima rodada está marcada, em ISO. */
  proximaEm: string | null
}

export interface Colheita {
  /** Uma passada. Devolve por que parou — é o que o agendador usa. */
  rodada(sinal?: AbortSignal): Promise<ResultadoColheita>
  iniciar(): void
  parar(): void
  situacao(): SituacaoColheita
}

/**
 * `setTimeout` que não segura o processo vivo. Uma varredura de fundo
 * não pode ser motivo para o servidor demorar a encerrar quando pedem.
 */
function agendarPadrao(acao: () => void, ms: number): { cancelar: () => void } {
  const marca = setTimeout(acao, ms)
  marca.unref?.()
  return { cancelar: () => clearTimeout(marca) }
}

export function criarColheita(opcoes: OpcoesColheita = {}): Colheita {
  const listarPendentes = opcoes.listarPendentes ?? listarPendentesDeNrrsf
  const buscar = opcoes.buscar ?? buscarFicha
  const gravar = opcoes.gravar ?? gravarAtenuacaoDaFicha
  const dormir = opcoes.dormir ?? ((ms: number) => new Promise((ok) => setTimeout(ok, ms)))
  const agendar = opcoes.agendar ?? agendarPadrao
  const agora = opcoes.agora ?? Date.now

  const pausaEntreCasMs = opcoes.pausaEntreCasMs ?? 3_000
  const pausaAposBloqueioMs = opcoes.pausaAposBloqueioMs ?? 60 * 60_000
  const intervaloEntreRodadasMs = opcoes.intervaloEntreRodadasMs ?? 12 * 60 * 60_000
  const pausaEntreLotesMs = opcoes.pausaEntreLotesMs ?? 60_000
  const tetoPorRodada = opcoes.tetoPorRodada ?? 120
  const falhasSeguidasParaParar = opcoes.falhasSeguidasParaParar ?? 5
  const tempoLimitePorCaMs = opcoes.tempoLimitePorCaMs ?? 30_000

  let ligada = false
  let rodando = false
  let ultima: (ResultadoColheita & { terminadaEm: string }) | null = null
  let proximaEm: number | null = null
  let marcada: { cancelar: () => void } | null = null
  let cancelador: AbortController | null = null

  async function rodada(sinal?: AbortSignal): Promise<ResultadoColheita> {
    rodando = true
    try {
      const pendentes = await listarPendentes({ limite: tetoPorRodada })

      let consultadas = 0
      let comNrrsf = 0
      let falhas = 0
      let seguidas = 0
      let motivo: MotivoParada | null = null

      for (const numeroCa of pendentes) {
        if (sinal?.aborted) {
          motivo = 'cancelada'
          break
        }

        try {
          // Sinal próprio por CA: um portal que aceita a conexão e não
          // responde travaria a rodada inteira num único número.
          const ficha = await buscar(numeroCa, AbortSignal.timeout(tempoLimitePorCaMs))
          consultadas += 1
          seguidas = 0

          const nrrsf = normalizarNrrsf(ficha?.nrrsfBruto)
          const bandas =
            ficha?.bandas && Object.keys(ficha.bandas).length ? JSON.stringify(ficha.bandas) : null

          // Grava mesmo sem NRRsf: é o registro da visita que impede a
          // próxima rodada de tentar os mesmos CAs para sempre. E nunca
          // encosta no valor de fonte PERITO.
          await gravar(numeroCa, nrrsf, bandas)
          if (nrrsf != null) comNrrsf += 1
        } catch (erro) {
          if (erro instanceof ErroDesafioCloudflare) {
            motivo = 'portal_bloqueado'
            break
          }
          falhas += 1
          seguidas += 1
          if (seguidas >= falhasSeguidasParaParar) {
            motivo = 'muitas_falhas'
            break
          }
        }

        if (pausaEntreCasMs > 0) await dormir(pausaEntreCasMs)
      }

      if (!motivo) motivo = pendentes.length < tetoPorRodada ? 'concluida' : 'teto_da_rodada'

      const resultado: ResultadoColheita = {
        pendentes: pendentes.length,
        consultadas,
        comNrrsf,
        falhas,
        motivo,
      }
      ultima = { ...resultado, terminadaEm: new Date(agora()).toISOString() }
      return resultado
    } finally {
      rodando = false
    }
  }

  /**
   * Quanto esperar até a próxima passada.
   *
   * Bloqueio e enxurrada de falhas são o mesmo caso na prática — o
   * portal não está atendendo — e pedem a espera longa. Bateu o teto
   * significa que está funcionando e ainda há fila: volta logo.
   */
  function esperaApos(motivo: MotivoParada): number {
    if (motivo === 'portal_bloqueado' || motivo === 'muitas_falhas') return pausaAposBloqueioMs
    if (motivo === 'teto_da_rodada') return pausaEntreLotesMs
    return intervaloEntreRodadasMs
  }

  function agendarProxima(ms: number): void {
    if (!ligada) return
    proximaEm = agora() + ms
    marcada = agendar(() => {
      marcada = null
      void ciclo()
    }, ms)
  }

  async function ciclo(): Promise<void> {
    if (!ligada) return
    proximaEm = null

    cancelador = new AbortController()
    let motivo: MotivoParada = 'muitas_falhas'
    try {
      motivo = (await rodada(cancelador.signal)).motivo
    } catch (erro) {
      // Banco fora do ar, por exemplo. Não derruba o servidor: espera
      // como se o portal tivesse recusado e tenta de novo.
      console.error('✗ colheita de NRRsf falhou nesta rodada:', erro)
    } finally {
      cancelador = null
    }

    agendarProxima(esperaApos(motivo))
  }

  return {
    rodada,

    iniciar() {
      if (ligada) return
      ligada = true
      // A primeira passada não sai junto com o boot: subir o servidor
      // e sair batendo num serviço externo atrasa o healthcheck do
      // deploy sem nenhuma vantagem.
      agendarProxima(pausaEntreLotesMs)
    },

    parar() {
      ligada = false
      proximaEm = null
      marcada?.cancelar()
      marcada = null
      cancelador?.abort()
    },

    situacao: () => ({
      ligada,
      rodando,
      ultima,
      proximaEm: proximaEm == null ? null : new Date(proximaEm).toISOString(),
    }),
  }
}

export const colheitaNrrsf = criarColheita()
