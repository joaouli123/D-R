import type { PreenchimentoTecnico } from '@/types'

export type CampoQuesitosLaudo =
  | 'quesitosJuizo'
  | 'quesitosReclamante'
  | 'quesitosReclamada'

export interface GrupoQuesitosLaudo {
  campo: CampoQuesitosLaudo
  titulo: string
  texto: string
}

const GRUPOS: ReadonlyArray<Omit<GrupoQuesitosLaudo, 'texto'>> = [
  { campo: 'quesitosJuizo', titulo: 'Quesitos do Juízo' },
  { campo: 'quesitosReclamante', titulo: 'Quesitos do Reclamante' },
  { campo: 'quesitosReclamada', titulo: 'Quesitos da Reclamada' },
]

/** Grupos efetivamente preenchidos, na ordem oficial do Laudo Pericial. */
export function gruposQuesitosDoLaudo(
  tecnico: Pick<PreenchimentoTecnico, CampoQuesitosLaudo>,
): GrupoQuesitosLaudo[] {
  return GRUPOS.flatMap((grupo) => {
    const texto = tecnico[grupo.campo]?.trim()
    return texto ? [{ ...grupo, texto }] : []
  })
}

export const camposQuesitosDoLaudo = GRUPOS

export interface BlocoQuesitosLaudo {
  chave: CampoQuesitosLaudo | 'respostasQuesitos'
  /** Sem título, o bloco entra direto sob "Respostas aos Quesitos Técnicos". */
  titulo?: string
  texto: string
}

export const TITULO_QUESITOS_LEGADOS = 'Outras respostas aos quesitos'

/**
 * Tudo o que o Laudo imprime na seção de quesitos: os grupos por origem e, por
 * último, o texto do campo antigo (`respostasQuesitos`), que perícias
 * anteriores ao Laudo por origem ainda trazem e que não pode sumir do
 * documento. Sozinho, o texto antigo não leva subtítulo.
 */
export function blocosQuesitosDoLaudo(
  tecnico: Pick<PreenchimentoTecnico, CampoQuesitosLaudo | 'respostasQuesitos'>,
): BlocoQuesitosLaudo[] {
  const grupos: BlocoQuesitosLaudo[] = gruposQuesitosDoLaudo(tecnico).map((grupo) => ({
    chave: grupo.campo,
    titulo: grupo.titulo,
    texto: grupo.texto,
  }))
  const legado = tecnico.respostasQuesitos?.trim()
  if (!legado) return grupos
  return [
    ...grupos,
    grupos.length
      ? { chave: 'respostasQuesitos', titulo: TITULO_QUESITOS_LEGADOS, texto: legado }
      : { chave: 'respostasQuesitos', texto: legado },
  ]
}
