import type { Pericia, Usuario } from '@/types'

/** Resolve no frontend a mesma identidade técnica usada pelo servidor. */
export function responsavelDaPericia(
  pericia: Pick<Pericia, 'responsavelId'>,
  usuarios: Usuario[] | undefined,
  usuarioAtual?: Usuario | null,
): Usuario | null {
  return usuarios?.find((usuario) => usuario.id === pericia.responsavelId)
    ?? (usuarioAtual?.id === pericia.responsavelId ? usuarioAtual : null)
}
