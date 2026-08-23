import { criarApp } from './app.js'
import { env } from './env.js'
import { prisma } from './prisma.js'
import { PASTA_UPLOADS, prepararArmazenamento } from './services/armazenamento.js'
import { colheitaNrrsf } from './services/caepi/colheita.js'
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
    console.log(`  ▸ catálogo EPI . /epis`)
    console.log(`  ▸ CORS ......... ${env.corsOrigins.join(', ')}`)
    console.log(`  ▸ NRRsf ........ colheita ${env.COLHEITA_NRRSF ? 'ligada' : 'desligada'}\n`)
  })

  // Depois do listen: a varredura é de fundo e não pode atrasar o
  // momento em que a API começa a responder ao healthcheck do deploy.
  if (env.COLHEITA_NRRSF) colheitaNrrsf.iniciar()

  const encerrar = (sinal: string) => async () => {
    console.log(`\n${sinal} recebido — encerrando.`)
    colheitaNrrsf.parar()
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
