/**
 * Descobre que a hospedagem já tem uma versão mais nova do que a que esta
 * aba carregou.
 *
 * O index.html sai servido sem `Cache-Control`, então o navegador decide
 * sozinho por quanto tempo guarda e o perito continua vendo o bundle antigo
 * horas depois do deploy — foi o que fez o cliente dizer que a correção
 * "não subiu". Mandar no cabeçalho não está ao nosso alcance (quem serve é
 * o Caddy do Coolify, atrás do Cloudflare), então quem percebe a troca é o
 * próprio app.
 */

/** Nome do bundle de entrada dentro de um HTML gerado pelo Vite. */
export function bundleDoHtml(html: string): string | null {
  return html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? null
}

/**
 * O bundle que esta aba está rodando. Em desenvolvimento o script é
 * `/src/main.tsx`, sem hash: aí não há o que comparar e devolve `null`.
 */
export function bundleEmUso(documento: Document): string | null {
  const scripts = Array.from(documento.querySelectorAll('script[src]'))
  for (const script of scripts) {
    const achado = bundleDoHtml(script.getAttribute('src') ?? '')
    if (achado) return achado
  }
  return null
}

/**
 * Só avisa quando os dois nomes existem e diferem. Sem um deles é melhor
 * ficar calado do que empurrar um recarregamento sem motivo.
 */
export function versaoMudou(emUso: string | null, noServidor: string | null): boolean {
  return emUso != null && noServidor != null && emUso !== noServidor
}

/**
 * Lê o index.html publicado sem passar pelo cache do navegador — é o
 * `no-store` que garante que a resposta veio da hospedagem agora.
 */
export async function bundleNoServidor(buscar: typeof fetch): Promise<string | null> {
  try {
    const resposta = await buscar('/', { cache: 'no-store' })
    if (!resposta.ok) return null
    return bundleDoHtml(await resposta.text())
  } catch {
    // Sem rede é só esperar a próxima conferência.
    return null
  }
}
