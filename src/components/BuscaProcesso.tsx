import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Clock, Gavel, Search } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
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
// A base do CNJ anda respondendo em 30 segundos ou mais, e devolvendo
// 429 quando se insiste. Por isso a consulta não é mais "vai e volta":
// o servidor assume a busca e a tela pergunta de tempos em tempos se
// já chegou. Enquanto isso o perito preenche o resto — quando o dado
// vem, os campos se completam sozinhos e um aviso diz que veio.
//
// O que a base pública do CNJ não tem são os nomes das partes. Isso
// aparece escrito na tela junto do resultado, porque a expectativa
// natural de quem vê "puxou os dados do processo" é que reclamante e
// reclamada venham também.
// ============================================================

/** De quanto em quanto tempo a tela volta a perguntar ao servidor. */
const INTERVALO_MS = 4_000

/** Teto da espera. Acima disso não é lentidão, é pane. */
const PACIENCIA_MS = 3 * 60_000

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
  const [esperando, setEsperando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosProcesso | null>(null)
  const [consultado, setConsultado] = useState<string | null>(null)
  const pedido = useRef(0)
  const toast = useToast()

  const completo = numeroProcessoCompleto(valor)

  // Sai de cena junto com o componente: sem isso a espera continuaria
  // perguntando depois que o perito trocou de perícia.
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  async function consultar(numero: string, origem: OrigemConsulta) {
    const limpo = digitos(numero)
    if (!numeroProcessoCompleto(limpo)) {
      setErro('Informe os 20 dígitos do número do processo.')
      return
    }

    const meu = ++pedido.current
    setBuscando(true)
    setErro(null)
    setEsperando(null)

    const comecou = Date.now()
    let avisado = false

    try {
      for (;;) {
        const resposta = await api.consultas.processo(limpo)
        if (pedido.current !== meu || !vivo.current) return

        if (!api.aindaBuscando(resposta)) {
          setDados(resposta)
          setConsultado(limpo)
          setEsperando(null)
          onDados(resposta, origem)
          // Só avisa quem chegou a esperar: para a consulta que volta
          // na hora, o campo preenchido já é o aviso.
          if (avisado) toast('Os dados do processo chegaram do CNJ.', 'success')
          return
        }

        avisado = true
        setEsperando(resposta.aviso)
        setBuscando(false)

        if (Date.now() - comecou > PACIENCIA_MS) {
          setConsultado(limpo)
          setEsperando(null)
          setErro(
            'A base pública do CNJ não respondeu dentro de três minutos. A busca continua no servidor — clique em "Buscar no CNJ" daqui a pouco para ver se chegou.',
          )
          return
        }

        await new Promise((resolver) => setTimeout(resolver, INTERVALO_MS))
        if (pedido.current !== meu || !vivo.current) return
      }
    } catch (e) {
      if (pedido.current !== meu || !vivo.current) return
      setDados(null)
      setConsultado(limpo)
      setEsperando(null)
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
      setEsperando(null)
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
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mb-[1px] shrink-0"
          icon={<Search size={15} />}
          loading={buscando || !!esperando}
          disabled={!completo || !!esperando}
          onClick={() => void consultar(valor, 'manual')}
        >
          Buscar no CNJ
        </Button>
      </div>

      {/* A dica fica fora da linha: dentro do campo ela empurrava a base da
          coluna para baixo e o botão descolava do input. */}
      {autoBuscar && (
        <p className="hint">Ao completar o número, vara e comarca vêm da base pública do CNJ.</p>
      )}

      {esperando && !erro && (
        <p
          role="status"
          className="mt-2 flex gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-[13px] text-navy-800"
        >
          <Clock size={15} className="mt-0.5 shrink-0 animate-pulse" />
          <span>{esperando}</span>
        </p>
      )}

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
