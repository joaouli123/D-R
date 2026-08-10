import nodemailer from 'nodemailer'
import { env } from '../env.js'
import { ErroHttp } from '../erros.js'

// ============================================================
// MÓDULO I — Envio do documento por e-mail, com o PDF anexado.
//
// A API REST da Brevo é preferencial (chave "xkeysib-"). O relay
// SMTP (senha "xsmtpsib-") permanece como fallback opcional.
// ============================================================

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const smtpConfigurado = !!env.BREVO_SMTP_USER && !!env.BREVO_SMTP_PASSWORD

const transporte = smtpConfigurado
  ? nodemailer.createTransport({
      host: env.BREVO_SMTP_HOST,
      port: env.BREVO_SMTP_PORT,
      secure: env.BREVO_SMTP_PORT === 465,
      requireTLS: env.BREVO_SMTP_PORT === 587,
      auth: {
        user: env.BREVO_SMTP_USER,
        pass: env.BREVO_SMTP_PASSWORD,
      },
    })
  : null

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
  if (!env.BREVO_API_KEY && !transporte) {
    throw new ErroHttp(
      503,
      'Envio de e-mail não configurado. Defina a API key ou as credenciais SMTP da Brevo.',
    )
  }

  if (env.BREVO_API_KEY) return enviarPelaApi(envio)
  return enviarPorSmtp(envio)
}

async function enviarPelaApi(envio: EnvioEmail): Promise<{ id?: string }> {
  const resposta = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: separarRemetente(env.EMAIL_REMETENTE),
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
    }),
  })

  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => null)) as { message?: string } | null
    throw new ErroHttp(
      502,
      `O provedor de e-mail recusou o envio: ${erro?.message ?? `HTTP ${resposta.status}`}`,
    )
  }

  const dados = (await resposta.json().catch(() => null)) as { messageId?: string } | null
  return { id: dados?.messageId }
}

async function enviarPorSmtp(envio: EnvioEmail): Promise<{ id?: string }> {
  if (!transporte) throw new ErroHttp(503, 'Credenciais SMTP da Brevo ausentes.')

  try {
    const resultado = await transporte.sendMail({
      from: env.EMAIL_REMETENTE,
      to: envio.para,
      cc: envio.copia?.length ? envio.copia : undefined,
      replyTo: envio.responderPara,
      subject: envio.assunto,
      text: envio.mensagem,
      html: corpoHtml(envio.mensagem),
      attachments: envio.anexos.map((a) => ({
        filename: a.nome,
        content: a.conteudo,
        contentType: 'application/pdf',
      })),
    })
    return { id: resultado.messageId }
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : 'erro desconhecido'
    throw new ErroHttp(502, `O provedor de e-mail recusou o envio: ${motivo}`)
  }
}

function separarRemetente(bruto: string): { name?: string; email: string } {
  const m = bruto.match(/^(.*)<(.+)>$/)
  if (!m?.[2]) return { email: bruto.trim() }
  const nome = (m[1] ?? '').trim()
  return { name: nome || undefined, email: m[2].trim() }
}

export const emailDisponivel = (): boolean => !!env.BREVO_API_KEY || transporte !== null
