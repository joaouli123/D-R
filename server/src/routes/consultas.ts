import { Router } from 'express'
import { exigirSessao } from '../auth.js'
import { env } from '../env.js'
import { parametro, rota } from '../erros.js'
import { consultarCnpj } from '../services/consultas/cnpj.js'
import { consultarProcesso } from '../services/consultas/processo.js'

// ============================================================
// Preenchimento automático a partir de fontes públicas.
//
//   GET /consultas/cnpj/:cnpj       → cadastro da empresa (Receita)
//   GET /consultas/processo/:numero → dados básicos do processo (CNJ)
//
// A chamada às fontes sai daqui, do servidor, e não do navegador do
// perito: é o que mantém o CORS fora do caminho, deixa o cache
// valendo para todo mundo e evita que a chave do DataJud precise
// viajar até a tela.
//
// Nenhuma das duas rotas grava nada. O que elas devolvem é sugestão:
// quem confere e salva é o perito, na tela.
// ============================================================

export function criarConsultasRouter() {
  const consultasRouter = Router()
  consultasRouter.use(exigirSessao)

  consultasRouter.get(
    '/cnpj/:cnpj',
    rota(async (req, res) => {
      res.json(await consultarCnpj(parametro(req, 'cnpj')))
    }),
  )

  consultasRouter.get(
    '/processo/:numero',
    rota(async (req, res) => {
      res.json(
        await consultarProcesso(parametro(req, 'numero'), { chave: env.DATAJUD_API_KEY }),
      )
    }),
  )

  return consultasRouter
}

export const consultasRouter = criarConsultasRouter()
