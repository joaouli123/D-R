import 'dotenv/config'
import { z } from 'zod'

// ============================================================
// Validação das variáveis de ambiente no boot.
// Falhar aqui é melhor do que descobrir um segredo ausente
// no meio de um envio de laudo.
// ============================================================

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres — gere com: openssl rand -base64 48'),
  JWT_EXPIRACAO: z.string().default('8h'),

  /// Origens autorizadas do frontend, separadas por vírgula.
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  /// URL pública desta API — usada para montar as URLs das fotos.
  API_PUBLIC_URL: z.string().default('http://localhost:3333'),

  UPLOAD_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(15),

  /// Puppeteer: no container usamos o Chromium do sistema.
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),

  /// Chave da API Pública do DataJud (CNJ), usada para puxar os dados
  /// básicos do processo. O próprio CNJ publica esta chave no wiki da
  /// API — não é segredo. Fica com valor padrão no código para a
  /// instalação não depender de configuração manual; no dia em que o
  /// CNJ trocar a chave, basta definir a variável de ambiente, sem
  /// precisar de novo deploy do código.
  DATAJUD_API_KEY: z
    .string()
    .min(1)
    .default('cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='),

  /// Credenciais transacionais da Brevo (antiga Sendinblue).
  BREVO_API_KEY: z.string().optional(),
  BREVO_SMTP_HOST: z.string().default('smtp-relay.brevo.com'),
  BREVO_SMTP_PORT: z.coerce.number().int().positive().default(587),
  BREVO_SMTP_USER: z.string().optional(),
  BREVO_SMTP_PASSWORD: z.string().optional(),
  EMAIL_REMETENTE: z.string().default('D&R Perícia <nao-responda@drpericiatrabalhista.com.br>'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const problemas = parsed.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`)
  console.error('\n✗ Configuração inválida:\n' + problemas.join('\n') + '\n')
  process.exit(1)
}

export const env = {
  ...parsed.data,
  ehProducao: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}

if (!env.BREVO_API_KEY && (!env.BREVO_SMTP_USER || !env.BREVO_SMTP_PASSWORD)) {
  console.warn(
    '⚠ Credenciais da Brevo ausentes — o envio de documentos por e-mail ficará indisponível.',
  )
}
