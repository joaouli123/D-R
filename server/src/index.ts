import { criarApp } from './app.js'
import { env } from './env.js'
import { prisma } from './prisma.js'
import { PASTA_UPLOADS, prepararArmazenamento } from './services/armazenamento.js'
import { encerrarBrowser } from './services/pdf.js'

// ============================================================
// D&R Perícia Elite — API REST
// Contrato consumido por src/services/api.ts do frontend.
// ============================================================

async function iniciar() {
  await prepararArmazenamento()

  // Falha aqui em vez de servir uma API que erra a cada consulta.
  await prisma.$connect()

  const servidor = criarApp().listen(env.PORT, () => {
    console.log(`\n  D&R Perícia Elite — API`)
    console.log(`  ▸ porta ........ ${env.PORT}`)
    console.log(`  ▸ ambiente ..... ${env.NODE_ENV}`)
    console.log(`  ▸ uploads ...... ${PASTA_UPLOADS}`)
    console.log(`  ▸ CORS ......... ${env.corsOrigins.join(', ')}\n`)
  })

  const encerrar = (sinal: string) => async () => {
    console.log(`\n${sinal} recebido — encerrando.`)
    servidor.close()
    await Promise.allSettled([encerrarBrowser(), prisma.$disconnect()])
    process.exit(0)
  }

  process.on('SIGTERM', encerrar('SIGTERM'))
  process.on('SIGINT', encerrar('SIGINT'))
}

iniciar().catch((e) => {
  console.error('✗ falha ao iniciar a API:', e)
  process.exit(1)
})
