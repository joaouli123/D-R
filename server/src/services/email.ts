import { env } from '../env.js'
import { ErroHttp } from '../erros.js'

// ============================================================
// MÓDULO I — Envio do documento por e-mail, com o PDF anexado
// automaticamente (o perito não precisa baixar e reanexar).
//
// Usa a API transacional da Brevo (POST /v3/smtp/email) direto via
// fetch — sem SDK. O build da imagem já teve dor de cabeça de sobra
// com dependência (@types ausentes, engine do Prisma, curl do
// healthcheck); uma chamada HTTP simples não precisa de mais uma.
// Docs: https://developers.brevo.com/reference/sendtransacemail
// ============================================================

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

export interface Anexo {
  nome: string
  conteudo: Buffer
}

export interface EnvioEmail {
  para: string[]
  copia?: string[]
  responderPara?: string
  assunto: string
  mensagem: string
  anexos: Anexo[]
}

/** "Nome <email@dominio>" -> { name, email }. Aceita também só o e-mail puro. */
function remetente(bruto: string): { name?: string; email: string } {
  const m = bruto.match(/^(.*)<(.+)>$/)
  if (!m || !m[2]) return { email: bruto.trim() }
  const nome = (m[1] ?? '').trim()
  return { name: nome || undefined, email: m[2].trim() }
}

/** Converte quebras de linha em parágrafos, escapando o conteúdo. */
function corpoHtml(mensagem: string): string {
  const esc = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const paragrafos = mensagem
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#26241F;max-width:640px">
    ${paragrafos}
    <hr style="border:0;border-top:1px solid #DFDACC;margin:28px 0 14px">
    <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#8B8677">
      Enviado pela plataforma D&amp;R Perícia — Plataforma Inteligente de Perícia Trabalhista.
    </p>
  </div>`
}

export async function enviarDocumento(envio: EnvioEmail): Promise<{ id?: string }> {
  if (!env.BREVO_API_KEY) {
    throw new ErroHttp(
      503,
      'Envio de e-mail não configurado. Defina BREVO_API_KEY nas variáveis de ambiente.',
    )
  }

  const corpo = {
    sender: remetente(env.EMAIL_REMETENTE),
    to: envio.para.map((email) => ({ email })),
    cc: envio.copia?.length ? envio.copia.map((email) => ({ email })) : undefined,
    replyTo: envio.responderPara ? { email: envio.responderPara } : undefined,
    subject: envio.assunto,
    textContent: envio.mensagem,
    htmlContent: corpoHtml(envio.mensagem),
    attachment: envio.anexos.map((a) => ({
      name: a.nome,
      content: a.conteudo.toString('base64'),
    })),
  }

  const resposta = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(corpo),
  })

  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => null)) as { message?: string } | null
    const motivo = erro?.message ?? `HTTP ${resposta.status}`
    throw new ErroHttp(502, `O provedor de e-mail recusou o envio: ${motivo}`)
  }

  const dados = (await resposta.json().catch(() => null)) as { messageId?: string } | null
  return { id: dados?.messageId }
}

export const emailDisponivel = (): boolean => !!env.BREVO_API_KEY
