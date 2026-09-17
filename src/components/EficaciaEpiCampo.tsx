import { AlertTriangle } from 'lucide-react'

import { exigeEficaciaEpi } from '@/lib/conclusoesAgentes'
import { usaAtenuacaoRuido } from '@/lib/nr15'
import type { AgenteAvaliado } from '@/types'

interface Props {
  agente: AgenteAvaliado
  onChange: (epiEficaz: boolean) => void
}

// ============================================================
// "O EPI é eficaz?" — pergunta de Sim ou Não, sem resposta pronta.
//
// Era uma caixa de marcar. Desmarcada, ela não distinguia "o EPI não é
// eficaz" de "ainda não respondi": a emissão cobrava a resposta, e o perito
// não via o que faltava numa caixa que já parecia respondida. Por isso a
// dificuldade que ele relatou em "agentes x EPIs".
//
// Quando a pergunta aparece é a mesma regra que a emissão cobra
// (`exigeEficaciaEpi`): avaliação com EPI, agente presente na atividade e
// fora do ruído — no ruído a eficácia sai da conta medição − NRRsf.
// ============================================================

export function idCampoEficaciaEpi(agenteId: string): string {
  return `agente-${agenteId}-epiEficaz`
}

export function EficaciaEpiCampo({ agente, onChange }: Props) {
  if (!agente.epis?.length || agente.identificadoNaAtividade === false) return null

  if (usaAtenuacaoRuido(agente)) {
    return (
      <p className="mt-3 rounded-md border border-ink-200 bg-ink-50/70 px-2.5 py-2 text-xs text-ink-600">
        No ruído, a eficácia do protetor sai do cálculo com o NRRsf mostrado acima — não há o que marcar aqui.
      </p>
    )
  }

  if (!exigeEficaciaEpi(agente)) return null

  const pendente = typeof agente.epiEficaz !== 'boolean'
  const nome = `epiEficaz-${agente.id}`
  const opcoes: { valor: boolean; rotulo: string; descricao: string }[] = [
    { valor: true, rotulo: 'Sim', descricao: 'o EPI neutraliza ou elimina a exposição' },
    { valor: false, rotulo: 'Não', descricao: 'eficácia não comprovada' },
  ]

  return (
    <fieldset
      className={`mt-3 rounded-lg border p-3 ${pendente ? 'border-amber-300 bg-amber-50/60' : 'border-ink-200 bg-ink-50/60'}`}
      aria-describedby={pendente ? `${nome}-pendente` : undefined}
    >
      <legend className="px-1 text-sm font-semibold text-ink-900">
        O EPI é comprovadamente eficaz para este agente? <span className="text-red-600" aria-hidden="true">*</span>
      </legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {opcoes.map((opcao, indice) => {
          const marcada = agente.epiEficaz === opcao.valor
          return (
            <label
              key={opcao.rotulo}
              className={`flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-brand-600 ${
                marcada ? 'border-brand-700 text-ink-900' : 'border-ink-200 text-ink-700 hover:border-ink-300'
              }`}
            >
              <input
                type="radio"
                id={indice === 0 ? idCampoEficaciaEpi(agente.id) : undefined}
                name={nome}
                className="h-4 w-4 accent-brand-700"
                checked={marcada}
                onChange={() => onChange(opcao.valor)}
              />
              <span>
                <span className="font-semibold">{opcao.rotulo}</span>
                <span className="text-ink-500"> — {opcao.descricao}</span>
              </span>
            </label>
          )
        })}
      </div>
      {pendente && (
        <p id={`${nome}-pendente`} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <AlertTriangle size={13} aria-hidden="true" />
          Responda para emitir o documento. Associar o EPI não responde a esta pergunta.
        </p>
      )}
      {/* O enquadramento destes anexos é por atividade, e há quem sustente
          que aí o EPI não conta. A lei permite contar; quem decide é o
          perito, então a base fica à vista de quem responde. */}
      <p className="mt-2 rounded-md border border-ink-200 bg-white/80 px-2.5 py-2 text-[11px] leading-4 text-ink-600">
        NR-15, item 15.4.1: a insalubridade é eliminada ou neutralizada “a) com a
        adoção de medidas de ordem geral que conservem o ambiente de trabalho dentro
        dos limites de tolerância; b) com a utilização de equipamento de proteção
        individual”. No mesmo sentido, o art. 191, I e II, da CLT.
      </p>
    </fieldset>
  )
}
