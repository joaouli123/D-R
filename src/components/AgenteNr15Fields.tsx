import { useEffect, useState } from 'react'

import { anexoNr15PorId, ATIVIDADES_ANEXO_13, ATIVIDADES_ANEXO_14, SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import type { ReferenciaNormativa, UnidadeMedicao } from '@/content/nr15/tipos'
import { normalizarNumeroMedido, unidadesDisponiveis } from '@/lib/medicoes'
import { aplicarReferencia } from '@/lib/nr15'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import type { AgenteAvaliado } from '@/types'
import { Input, Select } from './ui'
import { BuscaNormativa } from './BuscaNormativa'

const CONFIGURACOES = {
  ANEXO_11: { itens: SUBSTANCIAS_ANEXO_11, titulo: 'Substância do Anexo 11', placeholder: 'Busque por agente ou CAS' },
  ANEXO_13: { itens: ATIVIDADES_ANEXO_13, titulo: 'Grupo ou atividade do Anexo 13', placeholder: 'Busque por grupo ou atividade' },
  ANEXO_14: { itens: ATIVIDADES_ANEXO_14, titulo: 'Atividade do Anexo 14', placeholder: 'Busque por atividade biológica' },
} as const

interface AgenteNr15FieldsProps {
  agente: AgenteAvaliado
  onChange: (agente: AgenteAvaliado) => void
}

export function AgenteNr15Fields({ agente, onChange }: AgenteNr15FieldsProps) {
  const configuracao = CONFIGURACOES[agente.anexoNr15 as keyof typeof CONFIGURACOES]
  const referencia = configuracao?.itens.find((item) => item.id === agente.referenciaNormativaId)
  const referenciaLegadaAusente = Boolean(agente.referenciaNormativaId && !referencia)
  const [valorDigitado, setValorDigitado] = useState(agente.valorMedido ?? '')
  const [erroValor, setErroValor] = useState('')

  useEffect(() => setValorDigitado(agente.valorMedido ?? ''), [agente.valorMedido])

  if (!configuracao) return <CamposGenericos agente={agente} onChange={onChange} referenciaLegadaAusente={referenciaLegadaAusente} />

  function limparReferencia() {
    const { referenciaNormativaId, atividadeEnquadrada, unidadeLimite, unidadeMedicao, ...agenteSemReferencia } = agente
    onChange(agenteSemReferencia)
  }

  function selecionarReferenciaNr15(item: ReferenciaNormativa) {
    onChange(aplicarReferencia(agente, item))
  }

  function confirmarValor() {
    if (!valorDigitado.trim()) {
      const { valorMedido, ...semValor } = agente
      setErroValor('')
      onChange(semValor)
      return
    }
    const normalizado = normalizarNumeroMedido(valorDigitado)
    if (!normalizado) {
      setErroValor('Informe um valor numérico, usando ponto ou vírgula para decimais.')
      return
    }
    const { medido, ...semLegado } = agente
    setErroValor('')
    setValorDigitado(normalizado)
    onChange({ ...semLegado, valorMedido: normalizado })
  }

  const unidades = referencia ? unidadesDisponiveis(referencia) : []
  const unidade = agente.unidadeMedicao ?? ''
  const limite = referencia?.limites?.[agente.unidadeMedicao!]

  return (
    <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-800">{configuracao.titulo}</p>
        {agente.referenciaNormativaId && <button type="button" className="rounded text-xs font-medium text-brand-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600" onClick={limparReferencia}>Limpar referência</button>}
      </div>
      <BuscaNormativa itens={configuracao.itens} value={agente.referenciaNormativaId ?? ''} onSelect={selecionarReferenciaNr15} placeholder={configuracao.placeholder} />
      {referencia && <p className="mt-2 text-xs text-ink-600">Referência selecionada: {referencia.label}{referencia.cas ? ` — CAS ${referencia.cas}` : ''}</p>}
      {referenciaLegadaAusente && <AvisoReferenciaLegada className="mt-2" />}

      {referencia && unidades.length > 0 && (
        <div className="mt-3 border-t border-brand-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Medição quantitativa</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Valor medido"
              aria-label="Valor medido"
              inputMode="decimal"
              value={valorDigitado}
              error={erroValor}
              onChange={(evento) => { setValorDigitado(evento.target.value); setErroValor('') }}
              onBlur={confirmarValor}
            />
            <Select
              label="Unidade"
              aria-label="Unidade da medição"
              value={unidade}
              onChange={(evento) => {
                if (!evento.target.value) {
                  const { unidadeMedicao, unidadeLimite, limiteTolerancia, ...semUnidade } = agente
                  onChange(semUnidade)
                  return
                }
                const novaUnidade = evento.target.value as UnidadeMedicao
                const novoLimite = referencia.limites?.[novaUnidade]
                onChange({ ...agente, unidadeMedicao: novaUnidade, unidadeLimite: novaUnidade, limiteTolerancia: novoLimite ? `${novoLimite} ${novaUnidade}` : agente.limiteTolerancia })
              }}
            >
              <option value="">— selecione —</option>
              {unidades.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Input label="Limite de tolerância" aria-label="Limite de tolerância" value={limite && unidade ? `${limite} ${unidade}` : ''} readOnly hint="Derivado da referência e unidade selecionadas." />
          </div>
          {agente.medido && !agente.valorMedido && (
            <p role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
              Medição legada preservada: “{agente.medido}”. Informe um valor numérico para substituí-la explicitamente.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CamposGenericos({
  agente,
  onChange,
  referenciaLegadaAusente,
}: AgenteNr15FieldsProps & { referenciaLegadaAusente: boolean }) {
  const anexo = anexoNr15PorId(agente.anexoNr15)
  const regra = obterRegraAnexo(agente.anexoNr15)
  const [valorDigitado, setValorDigitado] = useState(agente.valorMedido ?? '')
  const [erroValor, setErroValor] = useState('')

  useEffect(() => setValorDigitado(agente.valorMedido ?? ''), [agente.valorMedido])

  function confirmarValor() {
    if (!valorDigitado.trim()) {
      const { valorMedido, ...semValor } = agente
      setErroValor('')
      onChange(semValor)
      return
    }
    const normalizado = normalizarNumeroMedido(valorDigitado)
    if (!normalizado) {
      setErroValor('Informe um valor numérico, usando ponto ou vírgula para decimais.')
      return
    }
    const { medido, ...semLegado } = agente
    setErroValor('')
    setValorDigitado(normalizado)
    onChange({
      ...semLegado,
      valorMedido: normalizado,
      ...(regra?.unidadePadrao ? { unidadeMedicao: regra.unidadePadrao } : {}),
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50/60 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Limite de tolerância"
          aria-label="Limite de tolerância"
          value={agente.limiteTolerancia ?? ''}
          readOnly={Boolean(anexo && !anexo.limiteEditavel)}
          placeholder={anexo?.dica}
          hint={anexo && !anexo.limiteEditavel ? 'Valor fixo em lei para o anexo selecionado.' : anexo?.dica}
          onChange={(evento) => onChange({ ...agente, limiteTolerancia: evento.target.value })}
        />
        {regra?.exibeMedicao && (
          <>
            <Input
              label="Medição registrada"
              aria-label="Medição registrada"
              inputMode="decimal"
              value={valorDigitado}
              error={erroValor}
              hint="Informe apenas o valor numérico."
              onChange={(evento) => { setValorDigitado(evento.target.value); setErroValor('') }}
              onBlur={confirmarValor}
            />
            {regra.unidadePadrao && (
              <Input label="Unidade" aria-label="Unidade da medição" value={regra.unidadePadrao} readOnly hint="Definida pelo anexo selecionado." />
            )}
          </>
        )}
        {!regra && (
          <Input
            label="Medição registrada"
            aria-label="Medição registrada"
            value={agente.medido ?? ''}
            hint="Registro livre preservado para conteúdo legado."
            onChange={(evento) => onChange({ ...agente, medido: evento.target.value })}
          />
        )}
      </div>
      {agente.medido && regra?.exibeMedicao && !agente.valorMedido && (
        <p role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
          Medição legada preservada: “{agente.medido}”. Informe um valor numérico para substituí-la explicitamente.
        </p>
      )}
      {referenciaLegadaAusente && <AvisoReferenciaLegada className="mt-2" />}
    </div>
  )
}

function AvisoReferenciaLegada({ className = '' }: { className?: string }) {
  return <p role="alert" className={`rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 ${className}`}>A referência normativa salva não está na base atual. Os dados já registrados foram preservados; selecione uma referência para atualizá-los.</p>
}
