// ============================================================
// Atualiza o espelho local da base oficial do CAEPI/MTE.
//
// Dois caminhos, e o de ARQUIVO é o principal:
//
//   npm run sync:caepi -- --arquivo ~/Downloads/RelatorioCA.csv.gz
//   npm run sync:caepi                       (baixa direto do portal)
//
// O portal do MTE está atrás do Cloudflare e às vezes responde com o
// desafio "Just a moment...", que exige um navegador de verdade.
// Quando isso acontece o download automático falha — por isso baixar
// o .csv.gz pelo navegador e apontar para o arquivo é o caminho que
// sempre funciona. Aceita .csv e .csv.gz.
//
// Opções:
//   --arquivo <caminho>  lê do disco em vez de baixar
//   --fichas <n>         busca o NRRsf de até n protetores auditivos
//   --so-fichas          pula o CSV e só busca NRRsf pendente
//   --pausa <ms>         intervalo entre fichas (padrão 800)
//   --origem <texto>     rótulo no histórico (padrão "manual")
// ============================================================

import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { abrirCsvCaepi } from '../src/services/caepi/arquivo.js'

const argumentos = process.argv.slice(2)

function opcao(nome: string): string | undefined {
  const indice = argumentos.indexOf(`--${nome}`)
  if (indice < 0) return undefined
  return argumentos[indice + 1]
}
const bandeira = (nome: string) => argumentos.includes(`--${nome}`)

if (bandeira('ajuda') || bandeira('help')) {
  console.log(`
Sincroniza o espelho do CAEPI.

  npm run sync:caepi -- --arquivo <caminho.csv|.csv.gz>   lê do disco
  npm run sync:caepi                                       baixa do portal

  --fichas <n>      busca o NRRsf de até n protetores auditivos pendentes
  --so-fichas       pula o CSV e só busca NRRsf
  --pausa <ms>      intervalo entre fichas (padrão 800)
  --origem <texto>  rótulo gravado no histórico (padrão "manual")
`)
  process.exit(0)
}

const { prisma } = await import('../src/prisma.js')
const { sincronizar, sincronizarFichas } = await import('../src/services/caepi/sync.js')
const { ErroDesafioCloudflare } = await import('../src/services/caepi/portal.js')

/** Abre o arquivo local já descomprimido quando for .gz. */
async function abrirArquivo(caminho: string): Promise<NodeJS.ReadableStream> {
  const absoluto = resolve(caminho)
  const informacoes = await stat(absoluto).catch(() => null)
  if (!informacoes?.isFile()) {
    console.error(`Arquivo não encontrado: ${absoluto}`)
    process.exit(1)
  }

  const mb = (informacoes.size / 1024 / 1024).toFixed(1)
  console.log(`Lendo ${absoluto} (${mb} MB)`)

  return abrirCsvCaepi(absoluto)
}

function relogio(): string {
  return new Date().toLocaleTimeString('pt-BR')
}

const inicio = Date.now()
let codigoSaida = 0

try {
  const fichas = Number(opcao('fichas') ?? 0) || 0
  const pausaFichasMs = Number(opcao('pausa') ?? 800) || 0

  if (bandeira('so-fichas')) {
    console.log(`[${relogio()}] Buscando NRRsf pendente (limite ${fichas || 'sem limite'})…`)
    const resultado = await sincronizarFichas({
      ...(fichas ? { limite: fichas } : {}),
      pausaMs: pausaFichasMs,
      aoProgredir: (numeroCa, nrrsf) =>
        console.log(`  CA ${numeroCa.padStart(6)} → ${nrrsf == null ? 'sem NRRsf na ficha' : `${nrrsf} dB`}`),
    })
    console.log(
      `\n${resultado.consultadas} fichas consultadas · ${resultado.comNrrsf} com NRRsf · ${resultado.falhas} falhas`,
    )
  } else {
    const caminho = opcao('arquivo')
    const fonte = caminho ? await abrirArquivo(caminho) : undefined
    if (!fonte) console.log(`[${relogio()}] Baixando a base do portal do MTE…`)

    const resultado = await sincronizar({
      ...(fonte ? { fonte } : {}),
      origem: opcao('origem') ?? (caminho ? 'arquivo' : 'manual'),
      ...(fichas ? { fichas } : {}),
      pausaFichasMs,
      aoProgredir: (etapa, quantidade) =>
        process.stdout.write(`\r  ${etapa === 'lendo' ? 'lidas' : 'gravadas'}: ${quantidade.toLocaleString('pt-BR')}   `),
    })

    const segundos = ((Date.now() - inicio) / 1000).toFixed(1)
    console.log(`\n\n=== ESPELHO DO CAEPI ATUALIZADO (${segundos}s) ===`)
    console.log(`linhas lidas no CSV .... ${resultado.linhasLidas.toLocaleString('pt-BR')}`)
    console.log(`registros gravados ..... ${resultado.registros.toLocaleString('pt-BR')}`)
    console.log(`  novos ................ ${resultado.novos.toLocaleString('pt-BR')}`)
    console.log(`  atualizados .......... ${resultado.atualizados.toLocaleString('pt-BR')}`)
    console.log(`linhas ignoradas ....... ${resultado.linhasIgnoradas.toLocaleString('pt-BR')}`)
    if (fichas) {
      console.log(`fichas consultadas ..... ${resultado.consultadas} (${resultado.comNrrsf} com NRRsf)`)
    }
    console.log(`\nRegistro no histórico: ${resultado.id}`)
  }
} catch (erro) {
  codigoSaida = 1
  if (erro instanceof ErroDesafioCloudflare) {
    console.error(`\n${erro.message}\n`)
  } else {
    console.error('\nFalhou:', erro instanceof Error ? erro.message : erro)
  }
} finally {
  await prisma.$disconnect()
  process.exit(codigoSaida)
}
