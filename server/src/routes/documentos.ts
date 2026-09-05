import type { Empresa } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { exigirSessao, sessaoDe } from '../auth.js'
import { ErroHttp, naoEncontrado, parametro, rota } from '../erros.js'
import { documentoParaApi, type PericiaCompleta } from '../mappers.js'
import { prisma } from '../prisma.js'
import { apagarUpload, lerUpload, uploadPdf } from '../services/armazenamento.js'
import { montarHtml } from '../services/documento-html.js'
import { gerarDocx } from '../services/docx.js'
import { agentesNr15SemConclusao, type TecnicoJson } from '../services/documento-comum.js'
import { enviarDocumento } from '../services/email.js'
import { concatenarPdf, gerarPdf } from '../services/pdf.js'

// ============================================================
// MÓDULOS G/H/I/J — Documentos gerados: histórico, exportação
// em PDF e DOCX, anexo externo e envio por e-mail.
// ============================================================

export const documentosRouter = Router()
documentosRouter.use(exigirSessao)

const corpo = z.object({
  id: z.string().optional(),
  tipo: z.enum(['parecer', 'laudo', 'quesitos', 'manifestacao', 'impugnacao', 'esclarecimento']),
  titulo: z.string().trim().min(1, 'Informe o título do documento.'),
  periciaId: z.string().optional(),
  numeroProcesso: z.string().default('—'),
  reclamante: z.string().default('—'),
  empresaPrincipal: z.string().default('—'),
  status: z.enum(['rascunho', 'finalizado', 'enviado']).default('rascunho'),
  /// Estado editável do documento (quesitos respondidos, blocos da
  /// manifestação, pontos do esclarecimento).
  conteudo: z.unknown().optional(),
  anexoExternoNome: z.string().optional(),
})

/** O '—' que o frontend usa para "sem vínculo" não é um id válido. */
const idOuNulo = (v?: string): string | null => (v && v !== '—' ? v : null)

const nomeArquivo = (titulo: string, ext: string): string => {
  const base = titulo
    .normalize('NFD')
    // \p{M} = marcas combinantes: "Perícia" vira "Pericia"
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
  return `${base || 'documento'}.${ext}`
}

/** Carrega o documento com tudo que a renderização precisa. */
async function carregarContexto(id: string) {
  const documento = await prisma.documentoGerado.findUnique({ where: { id } })
  if (!documento) throw naoEncontrado('Documento')

  const pericia = documento.periciaId
    ? await prisma.pericia.findUnique({
        where: { id: documento.periciaId },
        include: { reclamadas: true, participantes: true, fotos: { orderBy: { ordem: 'asc' } } },
      })
    : null

  const empresas: Empresa[] = pericia?.reclamadas.length
    ? await prisma.empresa.findMany({
        where: { id: { in: pericia.reclamadas.map((r) => r.empresaId) } },
      })
    : []

  const perito = await prisma.usuario.findUnique({ where: { id: documento.criadoPorId } })

  return { documento, pericia: pericia as PericiaCompleta | null, empresas, perito }
}

function exigirConclusoesNr15(
  documento: { tipo: string },
  pericia: PericiaCompleta | null,
): void {
  if (!pericia || (documento.tipo !== 'parecer' && documento.tipo !== 'laudo')) return
  const pendentes = agentesNr15SemConclusao(
    pericia.tecnico as unknown as Pick<TecnicoJson, 'agentes'>,
    pericia.modalidade,
  )
  if (!pendentes.length) return
  throw new ErroHttp(
    422,
    `Informe a conclusão individual antes de emitir o documento: ${pendentes.join(', ')}.`,
  )
}

/** GET /documentos */
documentosRouter.get(
  '/',
  rota(async (_req, res) => {
    const documentos = await prisma.documentoGerado.findMany({ orderBy: { atualizadoEm: 'desc' } })
    res.json(documentos.map(documentoParaApi))
  }),
)

/** GET /documentos/:id */
documentosRouter.get(
  '/:id',
  rota(async (req, res) => {
    const documento = await prisma.documentoGerado.findUnique({ where: { id: parametro(req, 'id') } })
    if (!documento) throw naoEncontrado('Documento')
    res.json(documentoParaApi(documento))
  }),
)

/** POST /documentos — upsert. Reemitir o mesmo documento atualiza, não duplica. */
documentosRouter.post(
  '/',
  rota(async (req, res) => {
    const d = corpo.parse(req.body)
    const sessao = sessaoDe(req)

    const dados = {
      tipo: d.tipo,
      titulo: d.titulo,
      periciaId: idOuNulo(d.periciaId),
      numeroProcesso: d.numeroProcesso,
      reclamante: d.reclamante,
      empresaPrincipal: d.empresaPrincipal,
      status: d.status,
      conteudo: (d.conteudo ?? null) as never,
      anexoExternoNome: d.anexoExternoNome?.trim() || null,
    }

    const existente = d.id
      ? await prisma.documentoGerado.findUnique({ where: { id: d.id } })
      : null

    const documento = existente
      ? await prisma.documentoGerado.update({ where: { id: existente.id }, data: dados })
      : await prisma.documentoGerado.create({
          data: { ...(d.id ? { id: d.id } : {}), ...dados, criadoPorId: sessao.id },
        })

    res.status(existente ? 200 : 201).json(documentoParaApi(documento))
  }),
)

/** DELETE /documentos/:id */
documentosRouter.delete(
  '/:id',
  rota(async (req, res) => {
    const documento = await prisma.documentoGerado.findUnique({ where: { id: parametro(req, 'id') } })
    if (!documento) throw naoEncontrado('Documento')

    await prisma.documentoGerado.delete({ where: { id: documento.id } })
    await apagarUpload(documento.anexoExternoArquivo)

    res.status(204).end()
  }),
)

// ---------------- Módulo H — anexo externo ----------------

/** POST /documentos/:id/anexo — multipart, campo "anexo". */
documentosRouter.post(
  '/:id/anexo',
  uploadPdf.single('anexo'),
  rota(async (req, res) => {
    const arquivo = req.file
    if (!arquivo) throw new ErroHttp(400, 'Nenhum arquivo enviado.')

    const documento = await prisma.documentoGerado.findUnique({ where: { id: parametro(req, 'id') } })
    if (!documento) {
      await apagarUpload(arquivo.filename)
      throw naoEncontrado('Documento')
    }

    const anterior = documento.anexoExternoArquivo

    const atualizado = await prisma.documentoGerado.update({
      where: { id: documento.id },
      data: { anexoExternoArquivo: arquivo.filename, anexoExternoNome: arquivo.originalname },
    })

    await apagarUpload(anterior)

    res.json(documentoParaApi(atualizado))
  }),
)

/** DELETE /documentos/:id/anexo */
documentosRouter.delete(
  '/:id/anexo',
  rota(async (req, res) => {
    const documento = await prisma.documentoGerado.findUnique({ where: { id: parametro(req, 'id') } })
    if (!documento) throw naoEncontrado('Documento')

    const atualizado = await prisma.documentoGerado.update({
      where: { id: documento.id },
      data: { anexoExternoArquivo: null, anexoExternoNome: null },
    })
    await apagarUpload(documento.anexoExternoArquivo)

    res.json(documentoParaApi(atualizado))
  }),
)

// ---------------- Módulo H — exportação ----------------

/**
 * POST /documentos/:id/pdf
 * Responde com o binário. O anexo externo, quando houver, é
 * concatenado ao final.
 */
documentosRouter.post(
  '/:id/pdf',
  rota(async (req, res) => {
    const { documento, pericia, empresas, perito } = await carregarContexto(parametro(req, 'id'))
    exigirConclusoesNr15(documento, pericia)

    const html = await montarHtml(documento, pericia, empresas, perito)
    let pdf = await gerarPdf(html)
    let aviso: string | undefined

    if (documento.anexoExternoArquivo) {
      const anexo = await lerUpload(documento.anexoExternoArquivo).catch(() => null)
      if (anexo) {
        const resultado = await concatenarPdf(pdf, anexo)
        pdf = resultado.pdf
        aviso = resultado.aviso
      } else {
        aviso = 'O arquivo do anexo externo não foi encontrado no servidor.'
      }
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeArquivo(documento.titulo, 'pdf')}"`,
    )
    if (aviso) res.setHeader('X-Aviso', encodeURIComponent(aviso))
    res.send(pdf)
  }),
)

/** POST /documentos/:id/docx */
documentosRouter.post(
  '/:id/docx',
  rota(async (req, res) => {
    const { documento, pericia, empresas, perito } = await carregarContexto(parametro(req, 'id'))
    exigirConclusoesNr15(documento, pericia)

    const docx = await gerarDocx(documento, pericia, empresas, perito)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeArquivo(documento.titulo, 'docx')}"`,
    )
    res.send(docx)
  }),
)

// ---------------- Módulo I — envio por e-mail ----------------

const envioSchema = z.object({
  para: z.union([z.string(), z.array(z.string())]),
  copia: z.union([z.string(), z.array(z.string())]).optional(),
  assunto: z.string().trim().min(1, 'Informe o assunto do e-mail.'),
  mensagem: z.string().trim().min(1, 'Escreva a mensagem do e-mail.'),
})

/** Aceita "a@x.br, b@y.br" ou lista, valida cada endereço. */
function listaDeEmails(valor: string | string[] | undefined, campo: string): string[] {
  const bruto = Array.isArray(valor) ? valor : (valor ?? '').split(/[,;]/)
  const enderecos = bruto.map((e) => e.trim()).filter(Boolean)

  const invalido = enderecos.find((e) => !z.string().email().safeParse(e).success)
  if (invalido) throw new ErroHttp(422, `Endereço inválido em "${campo}": ${invalido}`)

  return enderecos
}

/** POST /documentos/:id/email */
documentosRouter.post(
  '/:id/email',
  rota(async (req, res) => {
    const d = envioSchema.parse(req.body)

    const para = listaDeEmails(d.para, 'Para')
    if (!para.length) throw new ErroHttp(422, 'Informe ao menos um destinatário.')
    const copia = listaDeEmails(d.copia, 'Cópia')

    const { documento, pericia, empresas, perito } = await carregarContexto(parametro(req, 'id'))
    exigirConclusoesNr15(documento, pericia)

    // O PDF anexado é gerado na hora — o destinatário sempre recebe
    // a versão mais recente do documento.
    const html = await montarHtml(documento, pericia, empresas, perito)
    let pdf = await gerarPdf(html)

    if (documento.anexoExternoArquivo) {
      const anexo = await lerUpload(documento.anexoExternoArquivo).catch(() => null)
      if (anexo) pdf = (await concatenarPdf(pdf, anexo)).pdf
    }

    await enviarDocumento({
      para,
      copia,
      responderPara: perito?.email,
      assunto: d.assunto,
      mensagem: d.mensagem,
      anexos: [{ nome: nomeArquivo(documento.titulo, 'pdf'), conteudo: pdf }],
    })

    const atualizado = await prisma.documentoGerado.update({
      where: { id: documento.id },
      data: { status: 'enviado', enviadoPara: para.join(', '), enviadoEm: new Date() },
    })

    res.json({ ok: true, documento: documentoParaApi(atualizado) })
  }),
)
