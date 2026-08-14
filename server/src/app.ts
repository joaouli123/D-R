import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import { env } from './env.js'
import { ErroHttp, tratarErros } from './erros.js'
import { authRouter } from './routes/auth.js'
import { documentosRouter } from './routes/documentos.js'
import { episRouter } from './routes/epis.js'
import { empresasRouter } from './routes/empresas.js'
import { fotosRouter } from './routes/fotos.js'
import { periciasRouter } from './routes/pericias.js'
import { quesitosRouter } from './routes/quesitos.js'
import { textosRouter } from './routes/textos.js'
import { usuariosRouter } from './routes/usuarios.js'
import { PASTA_UPLOADS } from './services/armazenamento.js'
import { emailDisponivel } from './services/email.js'

// ============================================================
// Montagem do app Express, separada do bootstrap para que os
// testes possam exercitar as rotas sem abrir conexão com o banco.
// ============================================================

export function criarApp(): Express {
  const app = express()

  app.set('trust proxy', 1) // atrás do proxy do Coolify
  app.disable('x-powered-by')

  app.use(
    cors({
      origin(origin, cb) {
        // Sem Origin: chamadas server-to-server e healthcheck.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true)
        cb(new ErroHttp(403, `Origem não autorizada: ${origin}`))
      },
      credentials: true,
    }),
  )

  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())

  // Fotos da vistoria. Cache longo: o nome do arquivo é um UUID,
  // então o conteúdo nunca muda.
  app.use(
    '/uploads',
    express.static(PASTA_UPLOADS, {
      maxAge: '30d',
      immutable: true,
      index: false,
      dotfiles: 'deny',
    }),
  )

  app.get('/saude', (_req, res) => {
    res.json({
      ok: true,
      versao: '1.0.0',
      ambiente: env.NODE_ENV,
      email: emailDisponivel() ? 'configurado' : 'indisponível',
    })
  })

  app.use('/auth', authRouter)
  app.use('/usuarios', usuariosRouter)
  app.use('/empresas', empresasRouter)
  app.use('/pericias/:periciaId/fotos', fotosRouter)
  app.use('/pericias', periciasRouter)
  app.use('/textos', textosRouter)
  app.use('/quesitos', quesitosRouter)
  app.use('/documentos', documentosRouter)
  app.use('/epis', episRouter)

  app.use((req, _res, next) => {
    next(new ErroHttp(404, `Rota não encontrada: ${req.method} ${req.path}`))
  })

  app.use(tratarErros)

  return app
}
