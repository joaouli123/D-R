import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

import { anexoNr15PorId, ATIVIDADES_ANEXO_13, ATIVIDADES_ANEXO_14, SUBSTANCIAS_ANEXO_11 } from '@/content/anexosNr15'
import type { ReferenciaNormativa, UnidadeMedicao } from '@/content/nr15/tipos'
import {
  FONTE_RUIDO,
  tipoMedicaoEmpresaDe,
  medicaoAdotada,
  NOTA_ORIGEM_MEDICAO,
  ROTULO_ORIGEM_MEDICAO,
  normalizarNumeroMedido,
  unidadesDisponiveis,
} from '@/lib/medicoes'
import { aplicarReferencia } from '@/lib/nr15'
import { protecaoDoConjunto } from '@/lib/protecaoAuditiva'
import { obterRegraAnexo } from '@/content/nr15/regrasAnexos'
import type { AgenteAvaliado, FonteRuido, OrigemMedicao, TipoMedicaoEmpresa } from '@/types'
import { Input, Select } from './ui'
import { BuscaNormativa } from './BuscaNormativa'

const CONFIGURACOES = {
  ANEXO_11: { itens: SUBSTANCIAS_ANEXO_11, titulo: 'Substância do Anexo 11', placeholder: 'Busque por agente ou CAS' },
  ANEXO_13: { itens: ATIVIDADES_ANEXO_13, titulo: 'Grupo ou atividade do Anexo 13', placeholder: 'Busque por grupo ou atividade' },
  ANEXO_14: { itens: ATIVIDADES_ANEXO_14, titulo: 'Atividade do Anexo 14', placeholder: 'Busque por atividade biológica' },
} as const

// O Quadro 1 do Anexo 11 não publica número CAS, e nem toda perícia precisa
// dele. Em vez de o sistema se responsabilizar por acertar o identificador
// químico de cada agente, a consulta fica a um clique — mesmo caminho do
// portal do CAEPI usado para o CA do EPI.
//
// A primeira versão apontava para a CETESB. A listagem pública de lá tem 96
// produtos e cobre 40 dos 146 agentes do Anexo 11: é o manual de emergência
// química do transporte, não um registro de substâncias. As duas bases abaixo
// são gratuitas e sem cadastro — o CAS Common Chemistry é publicado pela
// própria CAS, que atribui o número, e o PubChem (NIH) cobre o que faltar.
const BASES_CAS = [
  {
    nome: 'CAS Common Chemistry',
    fichaDoCas: (cas: string) => `https://commonchemistry.cas.org/detail?cas_rn=${cas}`,
    busca: 'https://commonchemistry.cas.org/',
  },
  {
    nome: 'PubChem',
    fichaDoCas: (cas: string) => `https://pubchem.ncbi.nlm.nih.gov/#query=${cas}`,
    busca: 'https://pubchem.ncbi.nlm.nih.gov/',
  },
] as const

const FORMATO_CAS = /^\d{2,7}-\d{2}-\d$/

// Com o CAS preenchido o link abre direto a ficha da substância, para o perito
// conferir o que vai sair no parecer; sem ele, abre a busca. O nome do agente
// não vai na URL de propósito: as duas bases respondem em inglês e
// “Álcool n-butílico” não encontraria nada.
function LinkConsultaCas({ cas, className = '' }: { cas?: string; className?: string }) {
  const numero = (cas ?? '').trim()
  const temFicha = FORMATO_CAS.test(numero)

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px] ${className}`}>
      <span className="font-semibold text-ink-500">{temFicha ? 'Conferir CAS em:' : 'Consultar CAS em:'}</span>
      {BASES_CAS.map((base) => (
        <a
          key={base.nome}
          href={temFicha ? base.fichaDoCas(numero) : base.busca}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          {base.nome}
          <ExternalLink size={11} aria-hidden="true" />
        </a>
      ))}
    </span>
  )
}

const OPCOES_ORIGEM: OrigemMedicao[] = ['perito', 'empresa', 'nao_informado']

const OPCOES_FONTE_RUIDO: FonteRuido[] = ['maquinas', 'ruido_fundo', 'administrativa']

interface AgenteNr15FieldsProps {
  agente: AgenteAvaliado
  onChange: (agente: AgenteAvaliado) => void
}

/**
 * Campo numérico com confirmação no blur.
 *
 * Guarda o que foi digitado em estado local para o perito poder digitar
 * "88," sem que a vírgula solta vire erro a cada tecla; só ao sair do
 * campo o valor é normalizado e sobe.
 */
function CampoNumerico({
  label,
  rotuloAcessivel,
  valor,
  hint,
  placeholder,
  onConfirmar,
}: {
  label: string
  /** Quando o rótulo visível é curto demais para identificar o campo. */
  rotuloAcessivel?: string
  valor?: string
  hint?: string
  placeholder?: string
  onConfirmar: (normalizado: string | null) => void
}) {
  const [texto, setTexto] = useState(valor ?? '')
  const [erro, setErro] = useState('')

  useEffect(() => setTexto(valor ?? ''), [valor])

  function confirmar() {
    if (!texto.trim()) {
      setErro('')
      onConfirmar(null)
      return
    }
    const normalizado = normalizarNumeroMedido(texto)
    if (!normalizado) {
      setErro('Informe um valor numérico, usando ponto ou vírgula para decimais.')
      return
    }
    setErro('')
    setTexto(normalizado)
    onConfirmar(normalizado)
  }

  return (
    <Input
      label={label}
      aria-label={rotuloAcessivel ?? label}
      inputMode="decimal"
      value={texto}
      error={erro}
      hint={hint}
      placeholder={placeholder}
      onChange={(evento) => { setTexto(evento.target.value); setErro('') }}
      onBlur={confirmar}
    />
  )
}

/**
 * As três origens que o perito precisa distinguir: a medição que ele
 * fez, a que a empresa apresentou nos seus documentos, e o caso em que
 * ele não mediu. Quando as duas existem e divergem — 83 dB no PGR
 * contra 88,41 dB na diligência —, o laudo tem de dizer qual prevaleceu.
 */
function OrigemDaMedicao({
  agente,
  onChange,
  unidade,
}: AgenteNr15FieldsProps & { unidade?: string }) {
  const origem: OrigemMedicao = agente.origemMedicao ?? 'perito'
  const adotada = medicaoAdotada(agente)
  const formaEmpresa = tipoMedicaoEmpresaDe(agente)
  const sufixo = unidade ? ` (${unidade})` : ''

  function definirNumero(
    campo: 'valorMedido' | 'medicaoEmpresa' | 'medicaoEmpresaAte',
    normalizado: string | null,
  ) {
    if (normalizado == null) {
      const { [campo]: _removido, ...semValor } = agente
      onChange(semValor)
      return
    }
    // `medido` era o campo de texto livre antigo. Uma vez que existe
    // número, ele só confundiria o documento.
    const { medido: _legado, ...semLegado } = agente
    onChange({ ...semLegado, [campo]: normalizado })
  }

  function definirFormaEmpresa(forma: TipoMedicaoEmpresa) {
    if (forma === 'registros_processo') {
      const {
        medicaoEmpresa: _medicaoEmpresa,
        medicaoEmpresaAte: _medicaoEmpresaAte,
        ...semNumerosEmpresa
      } = agente
      onChange({
        ...semNumerosEmpresa,
        tipoMedicaoEmpresa: forma,
        ...(!agente.valorMedido ? { origemMedicao: 'nao_informado' as const } : {}),
      })
      return
    }
    if (forma === 'valor') {
      const { medicaoEmpresaAte: _medicaoEmpresaAte, ...semFimDaFaixa } = agente
      onChange({ ...semFimDaFaixa, tipoMedicaoEmpresa: forma })
      return
    }
    onChange({ ...agente, tipoMedicaoEmpresa: forma })
  }

  return (
    <div className="mt-3 border-t border-ink-200 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Avaliação da medição</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Origem da medição"
          aria-label="Origem da medição"
          className="sm:col-span-2"
          value={origem}
          hint={NOTA_ORIGEM_MEDICAO[origem]}
          onChange={(evento) => onChange({ ...agente, origemMedicao: evento.target.value as OrigemMedicao })}
        >
          {OPCOES_ORIGEM.map((opcao) => (
            <option key={opcao} value={opcao}>{ROTULO_ORIGEM_MEDICAO[opcao]}</option>
          ))}
        </Select>

        <CampoNumerico
          label={`Medição em perícia${sufixo}`}
          valor={agente.valorMedido}
          hint={origem === 'perito' ? 'Adotada no laudo.' : 'Registrada para comparação.'}
          onConfirmar={(normalizado) => definirNumero('valorMedido', normalizado)}
        />

        <Select
          label="Forma da medição da empresa"
          value={formaEmpresa}
          onChange={(evento) => definirFormaEmpresa(evento.target.value as TipoMedicaoEmpresa)}
        >
          <option value="valor">Medição da empresa — PGR / Laudos Ocupacionais — valor único</option>
          <option value="faixa">Medição da empresa — PGR / Laudos Ocupacionais — entre dois valores</option>
          <option value="registros_processo">Medição conforme registros apresentados junto ao processo</option>
        </Select>

        {/*
          A medição da empresa raramente é um número só: o PGR cobre
          anos e o nível varia. Dois campos em vez de um texto livre
          porque o número precisa continuar entrando no cálculo — e a
          conclusão sai pelo topo da faixa, o pior cenário do período.
        */}
        {formaEmpresa === 'valor' && (
          <CampoNumerico
            label={`Medição da empresa${sufixo}`}
            valor={agente.medicaoEmpresa}
            hint={origem === 'perito' ? 'Registrada para comparação.' : 'Adotada no laudo.'}
            onConfirmar={(normalizado) => definirNumero('medicaoEmpresa', normalizado)}
          />
        )}
        {formaEmpresa === 'faixa' && (
          <div className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <CampoNumerico
                label={`Medição da empresa — de${sufixo}`}
                rotuloAcessivel={`Medição da empresa${sufixo}`}
                valor={agente.medicaoEmpresa}
                onConfirmar={(normalizado) => definirNumero('medicaoEmpresa', normalizado)}
              />
              <CampoNumerico
                label={`Até${sufixo}`}
                rotuloAcessivel="Medição da empresa até"
                valor={agente.medicaoEmpresaAte}
                onConfirmar={(normalizado) => definirNumero('medicaoEmpresaAte', normalizado)}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              {origem === 'perito' ? 'Registrada para comparação.' : 'Adotada no laudo.'} O cálculo
              considera o maior valor da faixa.
            </p>
          </div>
        )}
        {formaEmpresa === 'registros_processo' && (
          <div className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700">
            Medição conforme registros apresentados junto ao processo.
          </div>
        )}
        <Input
          label="Documento da empresa"
          aria-label="Documento de origem da medição da empresa"
          className="sm:col-span-2"
          value={agente.fonteMedicaoEmpresa ?? ''}
          placeholder="Ex.: PGR 2024, laudo ambiental de 12/03/2023"
          hint="Sai no laudo junto da medição da empresa."
          onChange={(evento) => onChange({ ...agente, fonteMedicaoEmpresa: evento.target.value })}
        />
      </div>

      {adotada.faixaEmpresa && (
        <p role="status" className="mt-2 text-xs leading-5 text-ink-600">
          Medição da empresa entre {adotada.faixaEmpresa.de.replace('.', ',')} e{' '}
          {adotada.faixaEmpresa.ate.replace('.', ',')}
          {unidade ? ` ${unidade}` : ''} — o laudo considera a maior.
        </p>
      )}

      {adotada.divergente && (
        <p role="status" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-900">
          As duas avaliações divergem. O laudo adota a {adotada.origem === 'perito' ? 'do perito' : 'da empresa'} e
          apresenta a outra ao lado — justifique a escolha na análise técnica.
        </p>
      )}
    </div>
  )
}

/**
 * A fonte do ruído do local, só nos anexos de ruído. É o que separa o
 * escritório silencioso do galpão cuja prensa estava parada no dia da
 * diligência — dois locais que a medição sozinha descreve igual.
 */
function FonteDoRuido({ agente, onChange }: AgenteNr15FieldsProps) {
  const escolhida = agente.fonteRuido

  return (
    <div className="mt-3 border-t border-ink-200 pt-3">
      <Select
        label="Fonte do ruído"
        aria-label="Fonte do ruído"
        value={escolhida ?? ''}
        hint={escolhida ? FONTE_RUIDO[escolhida].frase : 'A frase escolhida sai no laudo, junto do agente.'}
        onChange={(evento) => {
          if (!evento.target.value) {
            const { fonteRuido: _semFonte, ...semFonte } = agente
            onChange(semFonte)
            return
          }
          onChange({ ...agente, fonteRuido: evento.target.value as FonteRuido })
        }}
      >
        <option value="">— não informada —</option>
        {OPCOES_FONTE_RUIDO.map((opcao) => (
          <option key={opcao} value={opcao}>{FONTE_RUIDO[opcao].rotulo}</option>
        ))}
      </Select>
    </div>
  )
}

export function AgenteNr15Fields({ agente, onChange }: AgenteNr15FieldsProps) {
  const configuracao = CONFIGURACOES[agente.anexoNr15 as keyof typeof CONFIGURACOES]
  const referencia = configuracao?.itens.find((item) => item.id === agente.referenciaNormativaId)
  const referenciaLegadaAusente = Boolean(agente.referenciaNormativaId && !referencia)

  if (!configuracao) return <CamposGenericos agente={agente} onChange={onChange} referenciaLegadaAusente={referenciaLegadaAusente} />

  function limparReferencia() {
    const { referenciaNormativaId, atividadeEnquadrada, unidadeLimite, unidadeMedicao, ...agenteSemReferencia } = agente
    onChange(agenteSemReferencia)
  }

  function selecionarReferenciaNr15(item: ReferenciaNormativa) {
    onChange(aplicarReferencia(agente, item))
  }

  const unidades = referencia ? unidadesDisponiveis(referencia) : []
  const unidade = agente.unidadeMedicao ?? ''
  const limite = referencia?.limites?.[agente.unidadeMedicao!]
  const exibeCas = obterRegraAnexo(agente.anexoNr15)?.exibeCas ?? false

  return (
    <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-800">{configuracao.titulo}</p>
        {agente.referenciaNormativaId && <button type="button" className="rounded text-xs font-medium text-brand-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600" onClick={limparReferencia}>Limpar referência</button>}
      </div>
      <BuscaNormativa itens={configuracao.itens} value={agente.referenciaNormativaId ?? ''} onSelect={selecionarReferenciaNr15} placeholder={configuracao.placeholder} />
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {referencia
          ? <p className="text-xs text-ink-600">Referência selecionada: {referencia.label}{referencia.cas ? ` — CAS ${referencia.cas}` : ''}</p>
          : <span aria-hidden="true" />}
        {exibeCas && <LinkConsultaCas cas={agente.cas ?? referencia?.cas} />}
      </div>
      {referenciaLegadaAusente && <AvisoReferenciaLegada className="mt-2" />}

      {referencia && unidades.length > 0 && (
        <div className="mt-3 border-t border-brand-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Medição quantitativa</p>
          <div className="grid gap-3 sm:grid-cols-2">
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
          <OrigemDaMedicao agente={agente} onChange={onChange} unidade={unidade || undefined} />
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
  const unidadeMedicao = agente.unidadeMedicao ?? regra?.unidadePadrao
  const adotada = medicaoAdotada(agente)
  const medicaoRuido = adotada.valor ? Number(adotada.valor) : undefined
  const conjunto = regra?.calculo === 'ruido_nrrsf'
    && medicaoRuido != null
    && Number.isFinite(medicaoRuido)
    ? protecaoDoConjunto(medicaoRuido, agente.epis ?? [], unidadeMedicao)
    : undefined
  const resultadoProtecao = conjunto?.melhor

  return (
    <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50/60 p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)]">
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
          regra.calculo === 'ruido_nrrsf' ? (
            <Input
              label="Resultado após proteção"
              aria-label="Resultado após proteção"
              value={resultadoProtecao ? `${resultadoProtecao.resultadoDbA} ${resultadoProtecao.unidade}` : ''}
              placeholder={!adotada.valor ? 'Informe a medição' : 'Associe um protetor auditivo'}
              readOnly
              hint={resultadoProtecao && conjunto
                ? `${resultadoProtecao.medicaoDbA} − ${resultadoProtecao.atenuacaoDb} = ${resultadoProtecao.resultadoDbA} ${resultadoProtecao.unidade} · ${resultadoProtecao.eficaz ? 'Proteção eficaz' : 'Proteção ineficaz'}${conjunto.quantidade > 1 ? ` · melhor entre ${conjunto.quantidade} protetores` : ''}`
                : 'O resultado será calculado automaticamente com o NRRsf do EPI.'}
            />
          ) : regra.unidadePadrao && (
            <Input label="Unidade" aria-label="Unidade da medição" value={unidadeMedicao} readOnly hint="Definida pelo anexo selecionado." />
          )
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
      {regra?.exibeCas && (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {agente.cas ? <p className="text-xs text-ink-600">CAS {agente.cas}</p> : <span aria-hidden="true" />}
          <LinkConsultaCas cas={agente.cas} />
        </div>
      )}
      {regra?.calculo === 'ruido_nrrsf' && <FonteDoRuido agente={agente} onChange={onChange} />}
      {regra?.exibeMedicao && <OrigemDaMedicao agente={agente} onChange={onChange} unidade={unidadeMedicao} />}
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
