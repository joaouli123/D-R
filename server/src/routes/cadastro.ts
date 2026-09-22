import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { ErroHttp, parametro, rota } from '../erros.js'
import { prisma } from '../prisma.js'
import { consultarCep } from '../services/consultas/cep.js'
import { consultarCnpj } from '../services/consultas/cnpj.js'
import { emailDisponivel, enviarDocumento } from '../services/email.js'
import { ORGANIZACAO_RAIZ_ID } from '../tenancy.js'
import { corpoDeCriacao, criarLicenca } from './licencas.js'

// ============================================================
// Cadastro público — a porta de entrada de um cliente novo, sem login.
//
// A licença nasce SUSPENSA e marcada como aguardando aprovação: ninguém
// entra até o perito titular aprovar na página Licenças (ou recusar, que é
// excluir). As consultas de CNPJ e CEP ficam abertas aqui só para o
// formulário se preencher sozinho, com limite por IP.
// ============================================================

/** Limite simples em memória, por IP: basta para um formulário público de uma instância só. */
export function limitePorIp(maximo: number, janelaMs: number): RequestHandler {
  const acessos = new Map<string, number[]>()
  return (req, _res, next) => {
    const agora = Date.now()
    const ip = req.ip ?? 'desconhecido'
    const recentes = (acessos.get(ip) ?? []).filter((t) => agora - t < janelaMs)
    if (recentes.length >= maximo) {
      next(new ErroHttp(429, 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'))
      return
    }
    recentes.push(agora)
    acessos.set(ip, recentes)
    if (acessos.size > 10_000) acessos.clear()
    next()
  }
}

const corpoDoCadastro = corpoDeCriacao.extend({
  /** Armadilha para robô: campo escondido na tela; gente de verdade deixa vazio. */
  site: z.string().optional(),
})

async function avisarTitular(licenca: { nome: string; documento: string | null }, admin: { nome: string; email: string }) {
  if (!emailDisponivel()) return
  const titulares = await prisma.usuario.findMany({
    where: { organizacaoId: ORGANIZACAO_RAIZ_ID, perfil: 'admin', ativo: true },
    select: { email: true },
  })
  if (!titulares.length) return
  await enviarDocumento({
    para: titulares.map((t) => t.email),
    assunto: `Novo cadastro aguardando aprovação: ${licenca.nome}`,
    mensagem:
      `Um novo cliente se cadastrou na plataforma e aguarda a sua aprovação.\n\n` +
      `Empresa: ${licenca.nome}\n` +
      (licenca.documento ? `Documento: ${licenca.documento}\n` : '') +
      `Responsável: ${admin.nome} <${admin.email}>\n\n` +
      `Para aprovar ou recusar, entre no sistema e abra a página Licenças.`,
    anexos: [],
  })
}

export function criarCadastroRouter() {
  const router = Router()
  const limiteDeCadastro = limitePorIp(5, 60 * 60 * 1000)
  const limiteDeConsulta = limitePorIp(40, 10 * 60 * 1000)

  /** POST /cadastro — pede uma licença; fica aguardando a aprovação do titular. */
  router.post(
    '/',
    limiteDeCadastro,
    rota(async (req, res) => {
      const { site, ...dados } = corpoDoCadastro.parse(req.body)
      // Robô preencheu a armadilha: responde como sucesso e não grava nada.
      if (site) {
        res.status(201).json({ aguardandoAprovacao: true })
        return
      }
      const licenca = await criarLicenca(dados, { aguardando: true })
      try {
        await avisarTitular(licenca, dados.admin)
      } catch (erro) {
        console.warn('[cadastro] aviso ao titular não saiu:', erro)
      }
      res.status(201).json({ aguardandoAprovacao: true })
    }),
  )

  router.get(
    '/cnpj/:cnpj',
    limiteDeConsulta,
    rota(async (req, res) => {
      res.json(await consultarCnpj(parametro(req, 'cnpj')))
    }),
  )

  router.get(
    '/cep/:cep',
    limiteDeConsulta,
    rota(async (req, res) => {
      res.json(await consultarCep(parametro(req, 'cep')))
    }),
  )

  return router
}

export const cadastroRouter = criarCadastroRouter()
