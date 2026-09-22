import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import { env } from './env.js'
import { ErroHttp, tratarErros } from './erros.js'
import { authRouter } from './routes/auth.js'
import { caepiRouter } from './routes/caepi.js'
import { consultasRouter } from './routes/consultas.js'
import { documentosRouter } from './routes/documentos.js'
import { episRouter } from './routes/epis.js'
import { empresasRouter } from './routes/empresas.js'
import { equipesRouter } from './routes/equipes.js'
import { fotosRouter } from './routes/fotos.js'
import { licencasRouter } from './routes/licencas.js'
import { periciasRouter } from './routes/pericias.js'
import { quesitosRouter } from './routes/quesitos.js'
import { textosRouter } from './routes/textos.js'
import { usuariosRouter } from './routes/usuarios.js'
import { estadoDosUploads, servirUploads } from './services/armazenamento.js'
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

  // Fotos da vistoria e anexos. Ver servirUploads.
  app.use('/uploads', servirUploads())

  // `uploads` esta aqui para ser lido de fora, com um curl, sem entrar no
  // servidor: e a resposta para "o perito diz que a foto nao sobe".
  //   gravavel:false  -> o volume nao aceita escrita (permissao ou montagem);
  //   arquivos:0 depois de um deploy -> nao ha volume persistente e o
  //   relatorio fotografico foi junto com o container antigo.
  // A rota continua devolvendo 200 mesmo com o volume ruim: quem chama e o
  // healthcheck do Coolify, e derrubar a API inteira por causa das fotos
  // deixaria o perito sem sistema nenhum.
  app.get('/saude', (_req, res, next) => {
    estadoDosUploads()
      .then((uploads) => {
        res.json({
          ok: true,
          versao: '1.0.0',
          ambiente: env.NODE_ENV,
          email: emailDisponivel() ? 'configurado' : 'indisponível',
          uploads,
        })
      })
      .catch(next)
  })

  app.use('/auth', authRouter)
  app.use('/usuarios', usuariosRouter)
  app.use('/equipes', equipesRouter)
  app.use('/licencas', licencasRouter)
  app.use('/empresas', empresasRouter)
  app.use('/pericias/:periciaId/fotos', fotosRouter)
  app.use('/pericias', periciasRouter)
  app.use('/textos', textosRouter)
  app.use('/quesitos', quesitosRouter)
  app.use('/documentos', documentosRouter)
  app.use('/epis', episRouter)
  app.use('/caepi', caepiRouter)
  app.use('/consultas', consultasRouter)

  app.use((req, _res, next) => {
    next(new ErroHttp(404, `Rota não encontrada: ${req.method} ${req.path}`))
  })

  app.use(tratarErros)

  return app
}
