import { useId, useRef, useState } from 'react'
import { AlertTriangle, MapPin } from 'lucide-react'
import { Input } from '@/components/ui'
import * as api from '@/services/api'
import type { DadosCep } from '@/services/api'
import { cepCompleto, mascararCep } from '@/lib/cadastro'

// ============================================================
// Campo de CEP que preenche o endereço.
//
// Vem antes do endereço de propósito: fechou os 8 dígitos, a consulta sai
// sozinha, a rua, o bairro, a cidade e a UF chegam e o cursor pula para o
// número — o que sobra digitar. Se a consulta falhar, o endereço continua
// livre para ir à mão.
// ============================================================

export interface CampoCepProps {
  valor: string
  onChange: (valor: string) => void
  /** O endereço que o CEP trouxe; quem usa decide o que substituir. */
  onEndereco: (dados: DadosCep) => void
  label?: string
  id?: string
  /** Id do campo que recebe o cursor quando o endereço chega — em geral, o número. */
  focarAoPreencher?: string
  className?: string
}

export function CampoCep({
  valor,
  onChange,
  onEndereco,
  label = 'CEP',
  id,
  focarAoPreencher,
  className,
}: CampoCepProps) {
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [encontrado, setEncontrado] = useState<DadosCep | null>(null)
  /** Último CEP já consultado — não repete a busca a cada tecla. */
  const [consultado, setConsultado] = useState<string | null>(null)
  const pedido = useRef(0)
  const statusId = useId()

  async function consultar(cep: string) {
    const meu = ++pedido.current
    setBuscando(true)
    setErro(null)
    try {
      const dados = await api.consultas.cep(cep)
      if (pedido.current !== meu) return
      setEncontrado(dados)
      setConsultado(cep)
      onEndereco(dados)
      if (focarAoPreencher) document.getElementById(focarAoPreencher)?.focus()
    } catch (e) {
      if (pedido.current !== meu) return
      setEncontrado(null)
      setConsultado(cep)
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar o CEP agora.')
    } finally {
      if (pedido.current === meu) setBuscando(false)
    }
  }

  function mudar(bruto: string) {
    const mascarado = mascararCep(bruto)
    onChange(mascarado)
    const limpo = mascarado.replace(/\D/g, '')
    if (limpo !== consultado) {
      setErro(null)
      setEncontrado(null)
    }
    if (cepCompleto(limpo) && limpo !== consultado) void consultar(limpo)
  }

  const limpo = valor.replace(/\D/g, '')

  return (
    <div className={className}>
      <Input
        id={id}
        label={label}
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        placeholder="00000-000"
        inputMode="numeric"
        autoComplete="postal-code"
        aria-describedby={statusId}
      />
      <p id={statusId} aria-live="polite" className="mt-1 text-xs text-ink-500">
        {buscando ? (
          'Buscando o endereço…'
        ) : encontrado ? (
          <span className="inline-flex gap-1 text-emerald-700">
            <MapPin size={13} className="mt-px shrink-0" />
            Endereço preenchido pelo CEP. Confira e complete o número.
          </span>
        ) : erro ? null : limpo.length > 0 && limpo.length < 8 ? (
          `Faltam ${8 - limpo.length} dígito${8 - limpo.length === 1 ? '' : 's'}.`
        ) : (
          'Com o CEP completo, o endereço vem sozinho.'
        )}
      </p>
      {erro && (
        <p className="mt-1 flex flex-wrap items-start gap-1.5 text-xs text-amber-800">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          <span className="min-w-0 flex-1">{erro} Preencha o endereço à mão.</span>
          {cepCompleto(limpo) && (
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => void consultar(limpo)}
            >
              Tentar de novo
            </button>
          )}
        </p>
      )}
    </div>
  )
}
