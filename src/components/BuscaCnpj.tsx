import { useRef, useState } from 'react'
import { AlertTriangle, Building2, Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import * as api from '@/services/api'
import type { DadosCnpj } from '@/services/api'
import { cnpjCompleto, digitos, resumoDaReceita, situacaoIrregular } from '@/lib/consultas'
import { maskCNPJ } from '@/lib/utils'

// ============================================================
// Campo de CNPJ que traz o cadastro da empresa junto.
//
// Completou os 14 dígitos num cadastro em branco, a consulta sai
// sozinha — é o que o perito faria em seguida, de qualquer forma. Num
// cadastro já preenchido ela só sai pelo botão, e aí sobrescreve: ali
// o pedido é explícito, "atualize com o que está na Receita".
//
// Falha de consulta nunca trava o cadastro: a mensagem explica o que
// houve e os campos seguem editáveis à mão.
// ============================================================

export type OrigemConsulta = 'automatica' | 'manual'

export interface BuscaCnpjProps {
  valor: string
  onChange: (valor: string) => void
  onDados: (dados: DadosCnpj, origem: OrigemConsulta) => void
  /** Cadastro ainda em branco: pode buscar assim que o número fechar. */
  autoBuscar?: boolean
  className?: string
}

export function BuscaCnpj({ valor, onChange, onDados, autoBuscar = false, className }: BuscaCnpjProps) {
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosCnpj | null>(null)
  /** Último número já consultado — evita repetir a busca automática. */
  const [consultado, setConsultado] = useState<string | null>(null)
  /** Descarta resposta de consulta antiga que chegou fora de ordem. */
  const pedido = useRef(0)

  const completo = cnpjCompleto(valor)

  async function consultar(numero: string, origem: OrigemConsulta) {
    const limpo = digitos(numero)
    if (!cnpjCompleto(limpo)) {
      setErro('Informe os 14 dígitos do CNPJ.')
      return
    }

    const meu = ++pedido.current
    setBuscando(true)
    setErro(null)

    try {
      const encontrados = await api.consultas.cnpj(limpo)
      if (pedido.current !== meu) return
      setDados(encontrados)
      setConsultado(limpo)
      onDados(encontrados, origem)
    } catch (e) {
      if (pedido.current !== meu) return
      setDados(null)
      // Marca como consultado mesmo na falha: sem isso, cada tecla
      // digitada depois do erro dispararia a busca automática de novo.
      setConsultado(limpo)
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar o CNPJ agora.')
    } finally {
      if (pedido.current === meu) setBuscando(false)
    }
  }

  function mudar(bruto: string) {
    const mascarado = maskCNPJ(bruto)
    onChange(mascarado)

    const limpo = digitos(mascarado)
    if (limpo !== consultado) {
      setErro(null)
      setDados(null)
    }
    if (autoBuscar && !buscando && cnpjCompleto(limpo) && limpo !== consultado) {
      void consultar(limpo, 'automatica')
    }
  }

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="CNPJ"
            required
            aria-label="CNPJ"
            value={valor}
            onChange={(e) => mudar(e.target.value)}
            placeholder="00.000.000/0000-00"
            {...(autoBuscar
              ? { hint: 'Ao completar os 14 dígitos, os dados vêm da Receita Federal.' }
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
          Buscar na Receita
        </Button>
      </div>

      {erro && (
        <p role="alert" className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {erro} Os campos abaixo continuam livres para preenchimento manual.
          </span>
        </p>
      )}

      {dados && !erro && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
          <p className="flex gap-2">
            <Building2 size={15} className="mt-0.5 shrink-0" />
            <span>
              <strong>{resumoDaReceita(dados)}</strong>
              <span className="block text-emerald-800">
                {dados.fonte} · confira os campos antes de salvar.
              </span>
              {dados.grauRisco && (
                <span className="block text-emerald-800">
                  Grau de risco NR-04: {dados.grauRisco}
                  {dados.grauRiscoClasse ? ` · classe CNAE ${dados.grauRiscoClasse}` : ''}.
                </span>
              )}
            </span>
          </p>
          {situacaoIrregular(dados) && (
            <p className="mt-1.5 font-semibold text-amber-800">
              Atenção: situação cadastral {dados.situacao} — confirme se é a empresa correta do
              processo.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
