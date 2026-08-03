import { Resend } from 'resend'
import { env } from '../env.js'
import { ErroHttp } from '../erros.js'

// ============================================================
// MÓDULO I — Envio do documento por e-mail, com o PDF anexado
// automaticamente (o perito não precisa baixar e reanexar).
// ============================================================

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

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
  if (!resend) {
    throw new ErroHttp(
      503,
      'Envio de e-mail não configurado. Defina RESEND_API_KEY nas variáveis de ambiente.',
    )
  }

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_REMETENTE,
    to: envio.para,
    cc: envio.copia?.length ? envio.copia : undefined,
    replyTo: envio.responderPara,
    subject: envio.assunto,
    text: envio.mensagem,
    html: corpoHtml(envio.mensagem),
    attachments: envio.anexos.map((a) => ({
      filename: a.nome,
      content: a.conteudo.toString('base64'),
    })),
  })

  if (error) {
    throw new ErroHttp(502, `O provedor de e-mail recusou o envio: ${error.message}`)
  }

  return { id: data?.id }
}

export const emailDisponivel = (): boolean => resend !== null
