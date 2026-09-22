import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui'
import { TAMANHO_MINIMO_DA_SENHA, type TomDaSituacao } from '@/lib/cadastro'
import { cn } from '@/lib/utils'

// ============================================================
// Senha e repetir senha, lado a lado.
//
// O aviso embaixo acompanha a digitação: quanto falta para o mínimo, se a
// repetição ainda está a caminho e, no fim, se as duas conferem. Quem salva
// confere de novo com `problemaNaSenha`.
// ============================================================

export interface CamposSenhaProps {
  senha: string
  confirmacao: string
  onSenha: (valor: string) => void
  onConfirmacao: (valor: string) => void
  /** Rótulo do primeiro campo; o segundo é sempre "Repetir senha". */
  rotulo?: string
  /** Complemento do aviso enquanto nada foi digitado. */
  hint?: string
  required?: boolean
}

const COR_DO_TOM: Record<TomDaSituacao, string> = {
  neutro: 'text-ink-500',
  ok: 'text-emerald-700',
  aviso: 'text-amber-700',
  erro: 'text-red-600',
}

function situacaoDaSenha(senha: string, confirmacao: string, hint?: string): { mensagem: string; tom: TomDaSituacao } {
  const minimo = `Mínimo ${TAMANHO_MINIMO_DA_SENHA} caracteres.`
  if (!senha) return { mensagem: hint ? `${minimo} ${hint}` : minimo, tom: 'neutro' }
  const falta = TAMANHO_MINIMO_DA_SENHA - senha.length
  if (falta > 0) {
    return {
      mensagem: falta === 1 ? `Falta 1 caractere (mínimo ${TAMANHO_MINIMO_DA_SENHA}).` : `Faltam ${falta} caracteres (mínimo ${TAMANHO_MINIMO_DA_SENHA}).`,
      tom: 'neutro',
    }
  }
  if (!confirmacao) return { mensagem: 'Agora repita a senha.', tom: 'neutro' }
  if (confirmacao === senha) return { mensagem: 'As senhas conferem.', tom: 'ok' }
  if (senha.startsWith(confirmacao)) return { mensagem: 'Continue digitando a repetição.', tom: 'neutro' }
  return { mensagem: 'As senhas não conferem.', tom: 'erro' }
}

export function CamposSenha({
  senha,
  confirmacao,
  onSenha,
  onConfirmacao,
  rotulo = 'Senha',
  hint,
  required = true,
}: CamposSenhaProps) {
  const [visivel, setVisivel] = useState(false)
  const statusId = useId()
  const situacao = situacaoDaSenha(senha, confirmacao, hint)
  const tipo = visivel ? 'text' : 'password'

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={rotulo}
          required={required}
          type={tipo}
          autoComplete="new-password"
          value={senha}
          onChange={(e) => onSenha(e.target.value)}
          aria-describedby={statusId}
        />
        <Input
          label="Repetir senha"
          required={required}
          type={tipo}
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => onConfirmacao(e.target.value)}
          aria-invalid={situacao.tom === 'erro' || undefined}
          aria-describedby={statusId}
        />
      </div>
      <div className="mt-1 flex items-start justify-between gap-3">
        <p id={statusId} aria-live="polite" className={cn('text-xs', COR_DO_TOM[situacao.tom])}>
          {situacao.mensagem}
        </p>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-900"
          aria-pressed={visivel}
          onClick={() => setVisivel((v) => !v)}
        >
          {visivel ? <EyeOff size={13} /> : <Eye size={13} />}
          {visivel ? 'Ocultar senhas' : 'Mostrar senhas'}
        </button>
      </div>
    </div>
  )
}
