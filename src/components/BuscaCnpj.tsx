import { useId, useRef, useState } from 'react'
import { AlertTriangle, Building2, Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import * as api from '@/services/api'
import type { DadosCnpj } from '@/services/api'
import {
  cnpjValido,
  limparDocumento,
  mascararCnpj,
  mascararCpfCnpj,
  situacaoDoDocumento,
  type TomDaSituacao,
} from '@/lib/cadastro'
import { resumoDaReceita, situacaoIrregular } from '@/lib/consultas'
import { cn } from '@/lib/utils'

// ============================================================
// Campo de CNPJ (ou de CPF ou CNPJ) que traz o cadastro da empresa junto.
//
// A máscara e o aviso embaixo acompanham a digitação: o campo diz na hora
// se o número é CPF ou CNPJ, quanto falta e se o dígito verificador fecha.
// O CNPJ alfanumérico (com letras, emitido desde julho de 2026) entra igual.
//
// Fechou um CNPJ válido num cadastro em branco, a consulta sai sozinha — é
// o que o perito faria em seguida, de qualquer forma. Num cadastro já
// preenchido ela só sai pelo botão, e aí sobrescreve: ali o pedido é
// explícito, "atualize com o que está na Receita". CPF não tem consulta
// pública; os dados vão à mão.
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
  /** O cadastro admite pessoa física: o mesmo campo recebe CPF ou CNPJ. */
  aceitarCpf?: boolean
  required?: boolean
  id?: string
  className?: string
  /** Quem consulta; o padrão exige login. O cadastro público passa a rota aberta. */
  consultar?: (numero: string) => Promise<DadosCnpj>
}

const COR_DO_TOM: Record<TomDaSituacao, string> = {
  neutro: 'text-ink-500',
  ok: 'text-emerald-700',
  aviso: 'text-amber-700',
  erro: 'text-red-600',
}

export function BuscaCnpj({
  valor,
  onChange,
  onDados,
  autoBuscar = false,
  aceitarCpf = false,
  required = true,
  id,
  className,
  consultar: consultarNaFonte = api.consultas.cnpj,
}: BuscaCnpjProps) {
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosCnpj | null>(null)
  /** Último número já consultado — evita repetir a busca automática. */
  const [consultado, setConsultado] = useState<string | null>(null)
  /** Descarta resposta de consulta antiga que chegou fora de ordem. */
  const pedido = useRef(0)
  const statusId = useId()

  const situacao = situacaoDoDocumento(valor, { aceitarCpf })
  const podeConsultar = situacao.tipo === 'cnpj' && situacao.valido
  const rotulo = aceitarCpf ? 'CPF ou CNPJ' : 'CNPJ'

  async function consultar(numero: string, origem: OrigemConsulta) {
    const limpo = limparDocumento(numero)
    if (!cnpjValido(limpo)) return

    const meu = ++pedido.current
    setBuscando(true)
    setErro(null)

    try {
      const encontrados = await consultarNaFonte(limpo)
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
    const mascarado = aceitarCpf ? mascararCpfCnpj(bruto) : mascararCnpj(bruto)
    onChange(mascarado)

    const limpo = limparDocumento(mascarado)
    if (limpo !== consultado) {
      setErro(null)
      setDados(null)
    }
    if (autoBuscar && !buscando && cnpjValido(limpo) && limpo !== consultado) {
      void consultar(limpo, 'automatica')
    }
  }

  const dica = aceitarCpf
    ? 'Digite só os números: o campo reconhece se é CPF ou CNPJ.'
    : 'Digite só os números; o CNPJ com letras também vale.'
  const busca = autoBuscar ? ' Com o CNPJ completo, os dados vêm da Receita Federal.' : ''

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            id={id}
            label={rotulo}
            required={required}
            aria-label={rotulo}
            value={valor}
            onChange={(e) => mudar(e.target.value)}
            placeholder={aceitarCpf ? 'CPF ou CNPJ' : '00.000.000/0000-00'}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={situacao.tom === 'erro' || undefined}
            aria-describedby={statusId}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mb-[1px] shrink-0"
          icon={<Search size={15} />}
          loading={buscando}
          disabled={!podeConsultar}
          onClick={() => void consultar(valor, 'manual')}
        >
          Buscar na Receita
        </Button>
      </div>

      <p id={statusId} aria-live="polite" className={cn('mt-1 text-xs', COR_DO_TOM[situacao.tom])}>
        {buscando ? (
          <span className="text-ink-500">Consultando a Receita Federal…</span>
        ) : situacao.tipo ? (
          <>
            <span className="mr-1.5 rounded bg-ink-100 px-1.5 py-px text-[11px] font-semibold text-ink-700">
              {situacao.tipo === 'cpf' ? 'CPF' : 'CNPJ'}
            </span>
            {situacao.mensagem}
            {situacao.tipo === 'cpf' && situacao.valido
              ? ' Não há consulta pública de CPF: preencha os dados à mão.'
              : ''}
          </>
        ) : (
          <span className="text-ink-500">
            {dica}
            {busca}
          </span>
        )}
      </p>

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
