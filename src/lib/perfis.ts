import type { PerfilUsuario } from '@/types'

/**
 * Como cada perfil aparece nas telas (Configurações e Usuários e equipes).
 *
 * A `descricao` diz o que o perfil faz no sistema — é o texto que ajuda o
 * administrador a escolher, no cadastro, entre três nomes que de fora se
 * parecem.
 */
export const PERFIL: Record<
  PerfilUsuario,
  { label: string; tone: 'green' | 'navy' | 'gray'; descricao: string }
> = {
  admin: {
    label: 'Administrador',
    tone: 'green',
    descricao: 'Gere usuários e equipes e edita os textos oficiais nas perícias.',
  },
  perito: {
    label: 'Perito',
    tone: 'navy',
    descricao: 'Elabora perícias e documentos. Não gere usuários.',
  },
  assistente: {
    label: 'Assistente',
    tone: 'gray',
    descricao: 'Apoia a elaboração das perícias. Não gere usuários.',
  },
}

/** Iniciais para o círculo do avatar — no máximo duas letras. */
export function iniciaisDe(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}
