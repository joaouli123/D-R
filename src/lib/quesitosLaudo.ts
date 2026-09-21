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
