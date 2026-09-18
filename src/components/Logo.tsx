import { useState } from 'react'
import { cn } from '@/lib/utils'
import logoOficial from '@/assets/logo-dr-oficial.png'
import logoCreaSp from '@/assets/orgaos/crea-sp.png'
import logoConfea from '@/assets/orgaos/confea.png'
import logoMte from '@/assets/orgaos/mte.png'

/** Alt fixo da arte embutida — o teste de marca depende dele. */
export const LOGO_PADRAO_ALT =
  'D&R Perícia Trabalhista — Engenharia de Segurança e Higiene Ocupacional'

/** O mínimo que a marca precisa saber sobre o dono dela. */
export interface DonoDaMarca {
  nome?: string | null
  logoUrl?: string | null
}

/**
 * A marca impressa no app e no cabeçalho dos documentos.
 *
 * White-label: quando `perito` já subiu uma logo (Configurações › Meu perfil),
 * é ela que sai — no menu, na pré-visualização, no PDF e no DOCX. A arte da
 * D&R deixou de ser "a logo do sistema" e virou a logo de UM perito; o que
 * sobra aqui é o fallback de quem ainda não subiu nada, e as telas sem sessão
 * (login e splash), que não têm perito para consultar.
 *
 * A arte embutida continua sendo usada inteira, sem remontar a marca com
 * texto e sem filtro que altere as cores dela. As dimensões intrínsecas só
 * acompanham essa arte: a logo de outro perito tem proporção própria e
 * declarar 1390x433 nela reservaria uma caixa errada durante o carregamento.
 *
 * A marca sai num cartão claro, não solta sobre o painel. A arte tem "&" e
 * textos cinza-escuros, feitos para fundo branco — em cima do azul do login
 * eles somem, e recolorir a marca de alguém não é opção. A caixa branca de
 * antes cumpria esse papel, mas com 1px de canto e 4px de folga parecia um
 * print colado (perito, 18/09). O cartão tem canto e folga de elemento
 * desenhado, e a arte agora é PNG transparente: o JPEG punha um segundo
 * retângulo branco dentro do cartão, com borda visível no arredondamento.
 */
export function Logo({
  size = 'md',
  className,
  perito,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  invert?: boolean
  showTagline?: boolean
  className?: string
  perito?: DonoDaMarca | null
}) {
  const sizes = {
    sm: 'w-[190px]',
    md: 'w-[250px]',
    lg: 'w-[340px]',
    xl: 'w-[520px]',
  }

  // Logo do perito que não carrega (link expirado, arquivo removido do volume)
  // cai na arte padrão em vez de deixar o ícone de imagem quebrada no
  // documento. Guarda a URL que falhou: se o perito trocar a logo, a nova é
  // tentada de novo.
  const [falhou, setFalhou] = useState<string | null>(null)
  const informada = perito?.logoUrl?.trim()
  const propria = informada && informada !== falhou ? informada : undefined
  const alt = propria
    ? `Logo de ${perito?.nome?.trim() || 'perito responsável'}`
    : LOGO_PADRAO_ALT

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center justify-center overflow-hidden rounded-xl bg-white shadow-md',
        size === 'sm' ? 'p-2' : 'p-3',
        sizes[size],
        className,
      )}
    >
      <img
        src={propria || logoOficial}
        alt={alt}
        {...(propria ? {} : { width: 1390, height: 433 })}
        onError={propria ? () => setFalhou(propria) : undefined}
        className="h-auto w-full max-w-full object-contain"
      />
    </div>
  )
}

/**
 * Selo de inscrição profissional (rodapé do login).
 *
 * "Inscrito", não "credenciado": quem registra o profissional nos conselhos é
 * uma inscrição, e o termo errado estava na arte original (correção do perito
 * em 18/09). O nome da função fica como está para não espalhar renomeação por
 * telas que não mudaram.
 *
 * Os logos são as artes oficiais dos órgãos, com o fundo tirado
 * (server/scripts/tratar-logos-orgaos.ts). Cada um sai numa plaquinha branca,
 * e não solto sobre o painel: CREA-SP e CONFEA são texto PRETO, e em cima do
 * azul-escuro do login sumiriam. Recolorir logo de órgão não é opção — a
 * plaquinha mantém as cores oficiais e legíveis em qualquer fundo.
 */
const ORGAOS = [
  { nome: 'CREA-SP', texto: 'Conselho Regional de Engenharia e Agronomia de São Paulo', logo: logoCreaSp },
  { nome: 'CONFEA', texto: 'Conselho Federal de Engenharia e Agronomia', logo: logoConfea },
  { nome: 'MTE', texto: 'Ministério do Trabalho e Emprego', logo: logoMte },
]

export function SeloCredenciado({
  invert = false,
  className,
}: {
  invert?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-center rounded-xl border-2 px-5 py-4',
        invert ? 'border-white/25' : 'border-navy-600/25',
        className,
      )}
    >
      <p
        className={cn(
          'mb-3 text-center text-[10px] font-bold uppercase tracking-[0.28em]',
          invert ? 'text-white/70' : 'text-navy-600',
        )}
      >
        Profissional Inscrito
      </p>
      <ul className="grid grid-cols-3 gap-2.5" aria-label="Órgãos de inscrição">
        {ORGAOS.map((orgao) => (
          <li
            key={orgao.nome}
            className={cn(
              'flex h-14 items-center justify-center rounded-lg bg-white px-3',
              invert ? 'shadow-sm' : 'border border-ink-200',
            )}
          >
            <img
              src={orgao.logo}
              alt={`${orgao.nome} — ${orgao.texto}`}
              title={orgao.texto}
              className="max-h-9 w-auto max-w-full object-contain"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
