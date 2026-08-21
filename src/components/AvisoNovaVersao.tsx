import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { bundleEmUso, bundleNoServidor, versaoMudou } from '@/lib/versaoApp'

/** De quanto em quanto tempo reconferir enquanto a aba fica aberta. */
const INTERVALO_MS = 5 * 60 * 1000

/**
 * Faixa que aparece quando o servidor já publicou uma versão mais nova.
 * Sem ela o perito só descobre a atualização limpando o cache na mão.
 */
export function AvisoNovaVersao() {
  const [temNova, setTemNova] = useState(false)

  useEffect(() => {
    const emUso = bundleEmUso(document)
    // Em desenvolvimento não há bundle com hash para comparar.
    if (!emUso) return

    let ativo = true

    const conferir = async () => {
      if (!ativo || document.visibilityState === 'hidden') return
      if (versaoMudou(emUso, await bundleNoServidor(fetch))) setTemNova(true)
    }

    void conferir()
    const relogio = window.setInterval(conferir, INTERVALO_MS)
    // Quem volta para a aba depois de um tempo é justamente quem está
    // mais sujeito a estar com a versão velha.
    document.addEventListener('visibilitychange', conferir)

    return () => {
      ativo = false
      window.clearInterval(relogio)
      document.removeEventListener('visibilitychange', conferir)
    }
  }, [])

  if (!temNova) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-navy-800 px-4 py-3 text-sm text-white shadow-pop"
    >
      <span>Existe uma versão mais nova do sistema.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-ink-100"
      >
        <RefreshCw size={14} />
        Atualizar agora
      </button>
    </div>
  )
}
