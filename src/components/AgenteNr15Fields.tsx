import { ATIVIDADES_ANEXO_13, ATIVIDADES_ANEXO_14, SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import type { ReferenciaNormativa } from '@/content/nr15/tipos'
import { aplicarReferencia } from '@/lib/nr15'
import type { AgenteAvaliado } from '@/types'

import { BuscaNormativa } from './BuscaNormativa'

const CONFIGURACOES = {
  ANEXO_11: {
    itens: SUBSTANCIAS_ANEXO_11,
    titulo: 'Substância do Anexo 11',
    placeholder: 'Busque por substância ou sinônimo',
  },
  ANEXO_13: {
    itens: ATIVIDADES_ANEXO_13,
    titulo: 'Grupo ou atividade do Anexo 13',
    placeholder: 'Busque por grupo ou atividade',
  },
  ANEXO_14: {
    itens: ATIVIDADES_ANEXO_14,
    titulo: 'Atividade do Anexo 14',
    placeholder: 'Busque por atividade biológica',
  },
} as const

interface AgenteNr15FieldsProps {
  agente: AgenteAvaliado
  onChange: (agente: AgenteAvaliado) => void
}

export function AgenteNr15Fields({ agente, onChange }: AgenteNr15FieldsProps) {
  const configuracao = CONFIGURACOES[agente.anexoNr15 as keyof typeof CONFIGURACOES]
  if (!configuracao) return null

  const referencia = configuracao.itens.find((item) => item.id === agente.referenciaNormativaId)
  const referenciaLegadaAusente = Boolean(agente.referenciaNormativaId && !referencia)

  function limparReferencia() {
    const { referenciaNormativaId, atividadeEnquadrada, unidadeLimite, ...agenteSemReferencia } = agente
    onChange(agenteSemReferencia)
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-800">{configuracao.titulo}</p>
        {agente.referenciaNormativaId && (
          <button
            type="button"
            className="text-xs font-medium text-brand-700 underline underline-offset-2"
            onClick={limparReferencia}
          >
            Limpar referência
          </button>
        )}
      </div>
      <BuscaNormativa
        itens={configuracao.itens}
        value={agente.referenciaNormativaId ?? ''}
        onSelect={(item: ReferenciaNormativa) => onChange(aplicarReferencia(agente, item))}
        placeholder={configuracao.placeholder}
      />
      {referencia && (
        <p className="mt-2 text-xs text-ink-600">
          Referência selecionada: {referencia.label}
          {referencia.unidadeLimite ? ` — ${referencia.limiteTolerancia} (${referencia.unidadeLimite})` : ''}
        </p>
      )}
      {referenciaLegadaAusente && (
        <p role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          A referência normativa salva não está na base atual. Os dados já registrados foram preservados; selecione uma referência para atualizá-los.
        </p>
      )}
    </div>
  )
}
