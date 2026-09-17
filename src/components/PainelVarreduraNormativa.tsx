import { useState } from 'react'
import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react'

import { Button } from '@/components/ui'
import { descreverAcaoPendencia, type AnexoVarredura, type PendenciaVarredura } from '@/lib/varreduraNormativa'
import type { StatusVarredura } from '@/types'

interface Props {
  norma: 'NR-15' | 'NR-16'
  itens: AnexoVarredura[]
  onStatusChange: (anexoId: string, status: StatusVarredura) => void
  onExposicao: (anexoId: string) => void
  /** As pendências da tela; as do anexo aparecem na própria linha. */
  pendencias?: readonly PendenciaVarredura[]
  /**
   * Marca de uma vez, como "Sem exposição", os anexos ainda sem decisão.
   * Uma chamada só: marcar um a um disparava uma gravação por anexo.
   */
  onMarcarSemExposicao?: (anexoIds: string[]) => void
}

// "Exposição identificada" afirmava a exposição antes de a avaliação
// concluir qualquer coisa. O perito pediu redação que diga só que a situação
// foi submetida à avaliação.
export const ROTULO_AVALIACAO_EXPOSICAO = 'Avaliação da suposta exposição'

const ROTULO_STATUS: Record<StatusVarredura, string> = {
  nao_avaliado: 'Pendente',
  sem_exposicao: 'Sem exposição',
  exposicao_identificada: ROTULO_AVALIACAO_EXPOSICAO,
  nao_aplicavel: 'Revogado — não aplicável',
}

export function idLinhaVarredura(norma: 'NR-15' | 'NR-16', anexoId: string): string {
  return `varredura-${norma}-${anexoId}`
}

export function PainelVarreduraNormativa({
  norma,
  itens,
  onStatusChange,
  onExposicao,
  pendencias = [],
  onMarcarSemExposicao,
}: Props) {
  const [confirmandoLote, setConfirmandoLote] = useState(false)
  const avaliados = itens.filter((item) => item.status !== 'nao_avaliado').length
  const semDecisao = itens.filter((item) => item.status === 'nao_avaliado')

  function confirmarLote() {
    setConfirmandoLote(false)
    if (semDecisao.length) onMarcarSemExposicao?.(semDecisao.map((item) => item.anexoId))
  }

  return (
    <section aria-label={`Varredura dos anexos da ${norma}`} className="rounded-xl border border-ink-200 bg-ink-50/70 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink-900">Varredura obrigatória da {norma}</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Decida cada anexo: “Sem exposição” ou “{ROTULO_AVALIACAO_EXPOSICAO}”, que abre a avaliação detalhada abaixo.
          </p>
        </div>
        <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold text-navy-800">
          {avaliados} de {itens.length} anexos avaliados
        </span>
      </div>

      {onMarcarSemExposicao && semDecisao.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
          {confirmandoLote ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 text-xs text-amber-900">
                Marcar como “Sem exposição” {semDecisao.length === 1 ? 'o anexo' : `os ${semDecisao.length} anexos`} ainda sem decisão
                ({semDecisao.map((item) => item.numero).join(', ')})? Os anexos já decididos não mudam.
              </p>
              <Button size="sm" onClick={confirmarLote}>Confirmar</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmandoLote(false)}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-amber-900">
                Avaliou os anexos com exposição? O restante pode ser fechado de uma vez.
              </p>
              <Button size="sm" variant="outline" onClick={() => setConfirmandoLote(true)}>
                Marcar pendentes como sem exposição ({semDecisao.length})
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-2">
        {itens.map((item) => {
          const resolvido = item.status !== 'nao_avaliado'
          const fixo = item.status === 'nao_aplicavel'
          // A pendência de "sem decisão" já é o próprio status da linha.
          const avisos = pendencias.filter((pendencia) =>
            pendencia.norma === norma && pendencia.anexoId === item.anexoId && pendencia.motivo !== 'não avaliado')
          const comAviso = avisos.length > 0
          return (
            <div
              key={item.anexoId}
              id={idLinhaVarredura(norma, item.anexoId)}
              tabIndex={-1}
              className={`grid gap-3 rounded-lg border bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus:ring-2 focus:ring-amber-400 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center ${
                !resolvido || comAviso ? 'border-amber-300' : 'border-ink-200'
              }`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                {fixo
                  ? <MinusCircle size={17} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
                  : resolvido && !comAviso
                    ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
                    : <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">Anexo {item.numero} — {item.tema}</p>
                  <p className={`mt-0.5 text-xs ${resolvido ? 'text-ink-500' : 'font-medium text-amber-700'}`}>{ROTULO_STATUS[item.status]}</p>
                  {avisos.map((pendencia, indice) => (
                    <p key={`${pendencia.agenteId ?? ''}-${pendencia.campo ?? pendencia.motivo}-${indice}`} className="mt-0.5 text-xs font-medium text-amber-700">
                      Falta: {descreverAcaoPendencia(pendencia)}
                    </p>
                  ))}
                </div>
              </div>
              {!fixo && (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    size="sm"
                    variant={item.status === 'sem_exposicao' ? 'primary' : 'outline'}
                    aria-label={`Anexo ${item.numero} — ${item.tema}: Sem exposição`}
                    aria-pressed={item.status === 'sem_exposicao'}
                    disabled={item.temAvaliacao}
                    title={item.temAvaliacao ? 'Remova as avaliações detalhadas deste anexo antes de marcar sem exposição.' : undefined}
                    onClick={() => onStatusChange(item.anexoId, 'sem_exposicao')}
                  >
                    Sem exposição
                  </Button>
                  <Button
                    size="sm"
                    variant={item.status === 'exposicao_identificada' ? 'secondary' : 'outline'}
                    aria-label={`Anexo ${item.numero} — ${item.tema}: ${ROTULO_AVALIACAO_EXPOSICAO}`}
                    aria-pressed={item.status === 'exposicao_identificada'}
                    onClick={() => onExposicao(item.anexoId)}
                  >
                    {ROTULO_AVALIACAO_EXPOSICAO}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

const TOM_STATUS_NR16: Record<StatusVarredura, string> = {
  nao_avaliado: 'border-amber-300 bg-amber-50 text-amber-800',
  sem_exposicao: 'border-ink-200 bg-white text-ink-600',
  exposicao_identificada: 'border-navy-200 bg-navy-50 text-navy-800',
  nao_aplicavel: 'border-ink-200 bg-ink-100 text-ink-500',
}

// ============================================================
// A varredura da NR-16, só para ler.
//
// Havia dois painéis de periculosidade na mesma etapa: este quadro, marcado
// à mão, e as avaliações logo abaixo. O de cima ainda falava a língua antiga
// e podia contradizer o de baixo — o perito não sabia qual valia e pediu que
// o antigo saísse. Agora o quadro sai das avaliações (`normalizarVarredura`),
// e aqui ele só mostra o que o documento vai imprimir.
// ============================================================

export function ResumoVarreduraNr16({
  itens,
  onRegistrarAvaliacao,
}: {
  itens: AnexoVarredura[]
  /** Presente quando ainda não há avaliação NR-16 nenhuma. */
  onRegistrarAvaliacao?: () => void
}) {
  return (
    <section aria-label="Varredura dos anexos da NR-16" className="rounded-xl border border-ink-200 bg-ink-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ink-900">Varredura da NR-16</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Preenchida pelas avaliações de periculosidade abaixo — não há o que marcar aqui. O anexo escolhido em
            cada avaliação sai como “{ROTULO_AVALIACAO_EXPOSICAO}”; os demais saem como “Sem exposição” assim que
            uma avaliação tiver resultado.
          </p>
        </div>
        {onRegistrarAvaliacao && (
          <Button size="sm" variant="outline" onClick={onRegistrarAvaliacao}>
            Registrar avaliação NR-16
          </Button>
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {itens.map((item) => (
          <li
            key={item.anexoId}
            id={idLinhaVarredura('NR-16', item.anexoId)}
            tabIndex={-1}
            className={`rounded-full border px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-400 ${TOM_STATUS_NR16[item.status]}`}
          >
            <span className="font-semibold">Anexo {item.numero}</span> ({item.tema}) · {ROTULO_STATUS[item.status].toLowerCase()}
          </li>
        ))}
      </ul>
    </section>
  )
}
