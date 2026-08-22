import { useRef, useState } from 'react'
import { AlertTriangle, Gavel, Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import * as api from '@/services/api'
import type { DadosProcesso } from '@/services/api'
import {
  digitos,
  numeroProcessoCompleto,
  outrasInstancias,
  resumoDoProcesso,
} from '@/lib/consultas'
import { maskProcesso } from '@/lib/utils'
import type { OrigemConsulta } from '@/components/BuscaCnpj'

// ============================================================
// Campo do número do processo que traz vara e comarca junto.
//
// Mesma regra do CNPJ: perícia nova, o número fechou, a consulta sai
// sozinha; perícia já preenchida, só pelo botão — e aí atualiza.
//
// O que a base pública do CNJ não tem são os nomes das partes. Isso
// aparece escrito na tela junto do resultado, porque a expectativa
// natural de quem vê "puxou os dados do processo" é que reclamante e
// reclamada venham também.
// ============================================================

export interface BuscaProcessoProps {
  valor: string
  onChange: (valor: string) => void
  onDados: (dados: DadosProcesso, origem: OrigemConsulta) => void
  /** Perícia ainda sem vara: pode buscar assim que o número fechar. */
  autoBuscar?: boolean
  className?: string
}

export function BuscaProcesso({
  valor,
  onChange,
  onDados,
  autoBuscar = false,
  className,
}: BuscaProcessoProps) {
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosProcesso | null>(null)
  const [consultado, setConsultado] = useState<string | null>(null)
  const pedido = useRef(0)

  const completo = numeroProcessoCompleto(valor)

  async function consultar(numero: string, origem: OrigemConsulta) {
    const limpo = digitos(numero)
    if (!numeroProcessoCompleto(limpo)) {
      setErro('Informe os 20 dígitos do número do processo.')
      return
    }

    const meu = ++pedido.current
    setBuscando(true)
    setErro(null)

    try {
      const encontrados = await api.consultas.processo(limpo)
      if (pedido.current !== meu) return
      setDados(encontrados)
      setConsultado(limpo)
      onDados(encontrados, origem)
    } catch (e) {
      if (pedido.current !== meu) return
      setDados(null)
      setConsultado(limpo)
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar o processo agora.')
    } finally {
      if (pedido.current === meu) setBuscando(false)
    }
  }

  function mudar(bruto: string) {
    const mascarado = maskProcesso(bruto)
    onChange(mascarado)

    const limpo = digitos(mascarado)
    if (limpo !== consultado) {
      setErro(null)
      setDados(null)
    }
    if (autoBuscar && !buscando && numeroProcessoCompleto(limpo) && limpo !== consultado) {
      void consultar(limpo, 'automatica')
    }
  }

  const instanciasExtras = dados ? outrasInstancias(dados) : []

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Número do processo"
            required
            aria-label="Número do processo"
            value={valor}
            onChange={(e) => mudar(e.target.value)}
            placeholder="0000000-00.0000.0.00.0000"
            {...(autoBuscar
              ? { hint: 'Ao completar o número, vara e comarca vêm da base pública do CNJ.' }
              : {})}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mb-[1px] shrink-0"
          icon={<Search size={15} />}
          loading={buscando}
          disabled={!completo}
          onClick={() => void consultar(valor, 'manual')}
        >
          Buscar no CNJ
        </Button>
      </div>

      {erro && (
        <p role="alert" className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{erro} Vara e comarca continuam livres para preenchimento manual.</span>
        </p>
      )}

      {dados && !erro && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
          <p className="flex gap-2">
            <Gavel size={15} className="mt-0.5 shrink-0" />
            <span>
              <strong>{resumoDoProcesso(dados)}</strong>
              <span className="block text-emerald-800">{dados.fonte}</span>
            </span>
          </p>
          {instanciasExtras.length > 0 && (
            <p className="mt-1.5 text-emerald-800">
              Também consta em: {instanciasExtras.join(' | ')}
            </p>
          )}
          <p className="mt-1.5 text-emerald-800">{dados.aviso}</p>
        </div>
      )}
    </div>
  )
}
