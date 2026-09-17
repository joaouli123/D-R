import { useId } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Check, CheckCircle2, Wand2 } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import {
  ANEXOS_NR16,
  LABEL_SEM_ENQUADRAMENTO_NR16,
  NOME_PADRAO_SEM_ENQUADRAMENTO,
  OBSERVACOES_PADRAO_NR16,
  OPCAO_EXPOSICAO_LEGADA_NR16,
  OPCOES_EXPOSICAO_NR16,
  OPCOES_PERIODICIDADE_NR16,
  OPCOES_PRESENCA_AREA_NR16,
  OPCOES_RELACAO_ATIVIDADE_NR16,
  OPCOES_RESULTADO_NR16,
  OPCOES_SITUACAO_AREA_NR16,
  OPCOES_UNIDADE_TEMPO_NR16,
  PADRAO_NR16_SEM_ENQUADRAMENTO,
  SEM_ENQUADRAMENTO_NR16,
  alternarObservacaoNr16,
  anexoNr16PorId,
  aplicarAnexoNr16,
  camposDoAnexoNr16,
  temObservacaoNr16,
} from '@/content/anexosNr16'
import type { CampoAnexoNr16 } from '@/content/anexosNr16'
import { alertasNr16, gerarAnaliseNr16 } from '@/content/nr16/analise'
import {
  SUMULA_364_TST,
  areasDaHipoteseNr16,
  catalogoDoAnexoNr16,
  hipoteseCorrespondente,
  textoAreaRiscoNr16,
} from '@/content/nr16/catalogo'
import type { AgenteAvaliado, DetalheNr16 } from '@/types'

// ============================================================
// AVALIAÇÃO DA NR-16 — risco → enquadramento → exposição → conclusão
//
// A tela segue a ordem em que o laudo raciocina, e cada etapa só pede o que
// é dela:
//
// 1. Risco — o anexo da norma (ou "Sem enquadramento em Anexo", o cenário
//    negativo, que já chega com os textos de praxe) e o nome do quadro.
// 2. Enquadramento — a hipótese da norma, a atividade efetivamente exercida
//    (não o cargo), a situação diante da área de risco e os pontos que aquele
//    anexo manda examinar. As listas saem do catálogo do anexo escolhido.
// 3. Exposição — a classificação da Súmula 364 e os números que a sustentam.
// 4. Análise e conclusão — o texto de análise montado com o que foi
//    preenchido, o resultado técnico e as observações.
//
// Nada aqui é lista fechada: toda sugestão entra por `datalist`, e exposição
// e resultado aceitam redação própria, que vence a opção do seletor nos três
// renderizadores. Campo esvaziado sai do agente — linha em branco no meio da
// tabela é a "pendência" que o perito reclamava de ver no documento pronto.
// ============================================================

interface PericulosidadeNr16FieldsProps {
  avaliacao: AgenteAvaliado
  onChange: (avaliacao: AgenteAvaliado) => void
}

/** Campos que só existem no agente enquanto têm valor. */
type CampoOpcionalNr16 =
  | 'enquadramentoNr16'
  | 'situacaoAreaRisco'
  | 'presencaAreaRisco'
  | 'delimitacaoAreaRisco'
  | 'distanciaAreaRisco'
  | 'tempoExposicaoNr16'
  | 'unidadeTempoExposicaoNr16'
  | 'frequenciaOperacionalNr16'
  | 'periodicidadeOperacionalNr16'
  | 'relacaoAtividadeNr16'
  | 'periodoCaracterizacaoNr16'
  | 'exposicaoPericulosidade'
  | 'resultadoPericulosidade'
  | 'exposicaoPericulosidadeTexto'
  | 'resultadoPericulosidadeTexto'

/**
 * Grava o valor ou, vazio, tira a chave. Os seletores só oferecem valores do
 * próprio tipo do campo; por isso a string entra sem conversão.
 */
function comCampoNr16(avaliacao: AgenteAvaliado, campo: CampoOpcionalNr16, valor: string): AgenteAvaliado {
  if (!valor) {
    const semCampo = { ...avaliacao }
    delete semCampo[campo]
    return semCampo
  }
  return { ...avaliacao, [campo]: valor }
}

/** Situações em que não há presença na área a registrar. */
function semPresencaNaArea(situacao?: string): boolean {
  return situacao === 'fora' || situacao === 'nao_caracterizada'
}

/**
 * Grava um ponto de verificação preservando a ordem do catálogo.
 *
 * O rótulo é gravado junto com o valor porque é ele que o documento imprime:
 * o catálogo pode ser reescrito amanhã e um laudo já emitido não pode mudar
 * de texto por causa disso. Campo esvaziado sai da lista — linha em branco no
 * meio da tabela é exatamente a "pendência" que o perito reclamava de ver
 * dentro do documento pronto.
 */
function comDetalhe(
  avaliacao: AgenteAvaliado,
  campos: readonly CampoAnexoNr16[],
  campo: CampoAnexoNr16,
  valor: string,
): AgenteAvaliado {
  const atuais = new Map((avaliacao.detalhesNr16 ?? []).map((detalhe) => [detalhe.id, detalhe]))
  atuais.set(campo.id, { id: campo.id, rotulo: campo.rotulo, valor })

  // Percorre o catálogo, não o que está gravado: é o que garante a ordem de
  // impressão e o que descarta sobra de um anexo trocado.
  const detalhesNr16 = campos
    .map((item) => atuais.get(item.id))
    .filter((detalhe): detalhe is DetalheNr16 => Boolean(detalhe?.valor))

  if (!detalhesNr16.length) {
    const { detalhesNr16: _vazio, ...semDetalhes } = avaliacao
    return semDetalhes
  }
  return { ...avaliacao, detalhesNr16 }
}

function EtapaNr16({
  numero,
  titulo,
  descricao,
  concluida,
  children,
}: {
  numero: number
  titulo: string
  descricao: string
  concluida: boolean
  children: ReactNode
}) {
  const tituloId = useId()
  return (
    <section aria-labelledby={tituloId} className="rounded-lg border border-amber-200 bg-white p-3 sm:p-4">
      <header className="mb-3 flex items-start gap-3">
        <span
          aria-hidden="true"
          className={concluida
            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white'
            : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white'}
        >
          {concluida ? <Check size={15} strokeWidth={3} /> : numero}
        </span>
        <div className="min-w-0">
          <h4 id={tituloId} className="text-[13px] font-bold uppercase tracking-wide text-ink-900">
            {titulo}
          </h4>
          <p className="text-xs text-ink-500">
            {descricao}
            {concluida && <span className="sr-only"> Etapa preenchida.</span>}
          </p>
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

/**
 * Número e unidade sob um rótulo só. Com um rótulo por controle, o nome
 * quebrava em duas linhas no celular e empurrava o número para baixo do
 * seletor ao lado.
 */
function CampoComUnidade({
  label,
  hint,
  valor,
  placeholder,
  onValor,
  rotuloUnidade,
  classeUnidade,
  unidade,
  opcoes,
  onUnidade,
}: {
  label: string
  hint: string
  valor: string
  placeholder: string
  onValor: (valor: string) => void
  rotuloUnidade: string
  classeUnidade: string
  unidade: string
  opcoes: readonly { value: string; label: string }[]
  onUnidade: (valor: string) => void
}) {
  const campoId = useId()
  const hintId = useId()
  return (
    <div className="w-full">
      <label className="label" htmlFor={campoId}>{label}</label>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            id={campoId}
            inputMode="decimal"
            value={valor}
            placeholder={placeholder}
            aria-describedby={hintId}
            onChange={(evento) => onValor(evento.target.value)}
          />
        </div>
        <div className={`${classeUnidade} shrink-0`}>
          <Select aria-label={rotuloUnidade} value={unidade} onChange={(evento) => onUnidade(evento.target.value)}>
            <option value="">—</option>
            {opcoes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </div>
      </div>
      <p id={hintId} className="hint">{hint}</p>
    </div>
  )
}

export function PericulosidadeNr16Fields({ avaliacao, onChange }: PericulosidadeNr16FieldsProps) {
  const anexo = anexoNr16PorId(avaliacao.anexoNr16)
  const semEnquadramento = avaliacao.anexoNr16 === SEM_ENQUADRAMENTO_NR16
  const catalogo = catalogoDoAnexoNr16(anexo?.id)
  const campos = camposDoAnexoNr16(avaliacao.anexoNr16)
  const detalhes = new Map((avaliacao.detalhesNr16 ?? []).map((detalhe) => [detalhe.id, detalhe.valor]))
  const hipotese = hipoteseCorrespondente(avaliacao)
  const areas = anexo ? areasDaHipoteseNr16(anexo.id, hipotese) : []
  const enquadramento = avaliacao.enquadramentoNr16?.trim() ?? ''
  const analiseGerada = gerarAnaliseNr16(avaliacao)
  const alertas = alertasNr16(avaliacao)
  const parcial = avaliacao.resultadoPericulosidade === 'caracterizada_parcial'

  const prefixo = `nr16-${avaliacao.id}`
  const listaAtividades = `atividades-${avaliacao.id}`
  const listaAreas = `${prefixo}-areas`
  // Só a redação oficial: uma lista paralela, resumida à mão, punha a mesma
  // alínea duas vezes na tela e às vezes com sentido diferente do da norma.
  const atividadesSugeridas = [...new Set(catalogo?.hipoteses.map((item) => item.atividade) ?? [])]
  const opcoesExposicao = avaliacao.exposicaoPericulosidade === OPCAO_EXPOSICAO_LEGADA_NR16.value
    ? [...OPCOES_EXPOSICAO_NR16, OPCAO_EXPOSICAO_LEGADA_NR16]
    : OPCOES_EXPOSICAO_NR16
  const gruposHipoteses = [...new Set(catalogo?.hipoteses.map((item) => item.grupo) ?? [])]

  // Perícias antigas gravavam o rótulo ("Anexo 2") onde hoje vai o id. O
  // seletor não achava opção para esse valor e parecia vazio — e a emissão
  // cobrava um anexo que a tela dizia não ter.
  const anexoLegado = avaliacao.anexoNr16 && !anexo && !semEnquadramento ? avaliacao.anexoNr16 : null

  const hintAnexo = anexoLegado
    ? `Registro antigo (“${anexoLegado}”): escolha o anexo na lista para que ele conte no enquadramento.`
    : semEnquadramento
    ? 'Cenário negativo: o item 10 registra que todos os anexos foram observados, sem enquadramento.'
    : catalogo?.vigencia
      ?? 'Escolha o anexo que a atividade pode enquadrar — ou “Sem enquadramento em Anexo”, que já traz os textos padrão.'

  const hintHipotese = hipotese
    ? [hipotese.descricao, hipotese.alcance ? `Adicional devido a: ${hipotese.alcance}` : ''].filter(Boolean).join(' ')
    : enquadramento
      ? 'O enquadramento foi escrito à mão e não corresponde a uma hipótese do catálogo.'
      : 'A escolha preenche o enquadramento normativo e sugere a atividade avaliada.'

  const hintArea = !anexo
    ? 'Descreva a delimitação considerada.'
    : hipotese && !areas.length
      ? 'A norma não delimita área de risco para esta hipótese; descreva a considerada no local.'
      : 'Sugestões com a delimitação do próprio anexo — escolha uma ou descreva a verificada.'

  function escolherHipotese(referencia: string) {
    const nova = catalogo?.hipoteses.find((item) => item.referencia === referencia)
    if (!nova) {
      onChange(comCampoNr16(avaliacao, 'enquadramentoNr16', ''))
      return
    }
    // A atividade só acompanha a hipótese enquanto ainda é a sugestão da
    // hipótese anterior: o que o perito escreveu não se apaga por uma troca.
    const atividadeAtual = avaliacao.atividadeEnquadrada?.trim() ?? ''
    const acompanha = !atividadeAtual || atividadeAtual === hipotese?.atividade
    onChange({
      ...avaliacao,
      enquadramentoNr16: nova.referencia,
      ...(acompanha ? { atividadeEnquadrada: nova.atividade } : {}),
    })
  }

  function escolherSituacao(situacao: string) {
    const atualizada = comCampoNr16(avaliacao, 'situacaoAreaRisco', situacao)
    onChange(semPresencaNaArea(situacao) ? comCampoNr16(atualizada, 'presencaAreaRisco', '') : atualizada)
  }

  function escolherResultado(resultado: string) {
    const atualizada = comCampoNr16(avaliacao, 'resultadoPericulosidade', resultado)
    // O período só descreve a caracterização parcial; fora dela, não imprime
    // e não deve ficar gravado esperando.
    onChange(resultado === 'caracterizada_parcial'
      ? atualizada
      : comCampoNr16(atualizada, 'periodoCaracterizacaoNr16', ''))
  }

  function aplicarPadrao() {
    // Preenche o que está vazio e fecha a conclusão negativa. O que o perito
    // já escreveu fica — o botão é atalho, não borracha.
    onChange({
      ...avaliacao,
      nome: avaliacao.nome.trim() || NOME_PADRAO_SEM_ENQUADRAMENTO,
      anexoNr16: avaliacao.anexoNr16 || SEM_ENQUADRAMENTO_NR16,
      atividadeEnquadrada: avaliacao.atividadeEnquadrada?.trim()
        ? avaliacao.atividadeEnquadrada
        : PADRAO_NR16_SEM_ENQUADRAMENTO.atividadeEnquadrada,
      analiseAnexos: avaliacao.analiseAnexos?.trim()
        ? avaliacao.analiseAnexos
        : PADRAO_NR16_SEM_ENQUADRAMENTO.analiseAnexos,
      exposicaoPericulosidade: PADRAO_NR16_SEM_ENQUADRAMENTO.exposicaoPericulosidade,
      resultadoPericulosidade: PADRAO_NR16_SEM_ENQUADRAMENTO.resultadoPericulosidade,
    })
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      {/* ---------------- 1. RISCO ---------------- */}
      <EtapaNr16
        numero={1}
        titulo="Risco"
        descricao="O anexo da NR-16 examinado e o nome com que o quadro sai no laudo."
        concluida={Boolean(avaliacao.anexoNr16 && avaliacao.nome.trim())}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(260px,1.5fr)_minmax(180px,0.8fr)_minmax(150px,0.5fr)]">
          <Select
            id={`agente-${avaliacao.id}-anexoNr16`}
            label="Anexo NR-16"
            value={avaliacao.anexoNr16 ?? ''}
            onChange={(evento) => onChange(aplicarAnexoNr16(avaliacao, evento.target.value))}
            hint={hintAnexo}
          >
            <option value="">— selecione —</option>
            {anexoLegado && <option value={anexoLegado}>{anexoLegado} (registro antigo)</option>}
            <option value={SEM_ENQUADRAMENTO_NR16}>{LABEL_SEM_ENQUADRAMENTO_NR16}</option>
            <optgroup label="Anexos da NR-16">
              {ANEXOS_NR16.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </optgroup>
          </Select>
          {/* Editável: o anexo sugere o nome do risco, mas é este campo que
              vira o título do quadro no laudo, e o perito precisa poder
              escrever o risco do caso concreto. */}
          <Input
            label="Risco avaliado"
            value={avaliacao.nome}
            placeholder={anexo?.risco ?? 'Descreva o risco examinado'}
            onChange={(evento) => onChange({ ...avaliacao, nome: evento.target.value })}
          />
          {/* O que a parte pretende, não o que a perícia reconhece — por isso
              sai na tabela mesmo na avaliação negativa. */}
          <Input
            label="Adicional Pretendido"
            value="30%"
            readOnly
            hint="Percentual fixo da NR-16."
          />
        </div>
      </EtapaNr16>

      {/* ---------------- 2. ENQUADRAMENTO ---------------- */}
      <EtapaNr16
        numero={2}
        titulo="Enquadramento"
        descricao="A atividade efetivamente exercida — não a denominação do cargo — diante do anexo e da área de risco."
        concluida={Boolean(avaliacao.atividadeEnquadrada?.trim() && (avaliacao.situacaoAreaRisco || avaliacao.areaRisco?.trim() || semEnquadramento))}
      >
        {!avaliacao.anexoNr16 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Escolha o anexo na etapa 1 para carregar as hipóteses da norma, as áreas de risco e os pontos de verificação.
          </p>
        )}

        {catalogo && (
          <Select
            label="Hipótese normativa"
            value={hipotese?.referencia ?? (enquadramento ? '__redacao_propria__' : '')}
            onChange={(evento) => escolherHipotese(evento.target.value)}
            hint={hintHipotese}
          >
            <option value="">— selecione —</option>
            {!hipotese && enquadramento && (
              <option value="__redacao_propria__" disabled>Redação própria (campo “Enquadramento normativo”)</option>
            )}
            {gruposHipoteses.map((grupo) => (
              <optgroup key={grupo} label={grupo}>
                {catalogo.hipoteses
                  .filter((item) => item.grupo === grupo)
                  .map((item) => <option key={item.referencia} value={item.referencia}>{item.rotulo}</option>)}
              </optgroup>
            ))}
          </Select>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Enquadramento normativo"
            value={avaliacao.enquadramentoNr16 ?? ''}
            placeholder={anexo ? `Ex.: NR-16, Anexo ${anexo.numero}, item 1, alínea a` : 'Item ou subitem da norma'}
            hint="Item e subitem da norma que fundamentam o enquadramento."
            onChange={(evento) => onChange(comCampoNr16(avaliacao, 'enquadramentoNr16', evento.target.value))}
          />
          <div>
            <Input
              label="Atividade ou operação avaliada"
              list={listaAtividades}
              value={avaliacao.atividadeEnquadrada ?? ''}
              placeholder="Selecione uma sugestão ou descreva a atividade"
              onChange={(evento) => onChange({ ...avaliacao, atividadeEnquadrada: evento.target.value })}
            />
            <datalist id={listaAtividades}>
              {atividadesSugeridas.map((atividade) => <option key={atividade} value={atividade} />)}
            </datalist>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Situação em relação à área de risco"
            value={avaliacao.situacaoAreaRisco ?? ''}
            onChange={(evento) => escolherSituacao(evento.target.value)}
          >
            <option value="">— selecione —</option>
            {OPCOES_SITUACAO_AREA_NR16.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          {!semPresencaNaArea(avaliacao.situacaoAreaRisco) && (
            <Select
              label="Presença na área de risco"
              value={avaliacao.presencaAreaRisco ?? ''}
              onChange={(evento) => onChange(comCampoNr16(avaliacao, 'presencaAreaRisco', evento.target.value))}
            >
              <option value="">— selecione —</option>
              {OPCOES_PRESENCA_AREA_NR16.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(140px,0.6fr)]">
          <div>
            <Input
              label="Área de risco"
              list={listaAreas}
              value={avaliacao.delimitacaoAreaRisco ?? ''}
              placeholder="Delimitação considerada"
              hint={hintArea}
              onChange={(evento) => onChange(comCampoNr16(avaliacao, 'delimitacaoAreaRisco', evento.target.value))}
            />
            <datalist id={listaAreas}>
              {areas.map((area) => {
                const texto = textoAreaRiscoNr16(area)
                return <option key={texto} value={texto} />
              })}
            </datalist>
          </div>
          <Input
            label="Distância verificada"
            inputMode="decimal"
            value={avaliacao.distanciaAreaRisco ?? ''}
            placeholder="Ex.: 7,5"
            hint="Em metros. Só o número vira “N metros”."
            onChange={(evento) => onChange(comCampoNr16(avaliacao, 'distanciaAreaRisco', evento.target.value))}
          />
        </div>

        <Textarea
          label="Condição ou área de risco"
          rows={2}
          value={avaliacao.areaRisco ?? ''}
          placeholder="Opcional. Descreva a condição encontrada no local."
          hint="Complementa a situação e a área acima, na mesma linha da tabela."
          onChange={(evento) => onChange({ ...avaliacao, areaRisco: evento.target.value })}
        />

        {campos.length > 0 && (
          // Cada anexo traz o que ele mesmo manda examinar; o que ficar em
          // branco não entra na tabela do documento.
          <fieldset className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
              Pontos de verificação do {anexo?.label ?? 'anexo'}
            </legend>
            <div className="grid gap-3 md:grid-cols-2">
              {campos.map((campo) => {
                const opcoesId = `${prefixo}-${campo.id}`
                return (
                  <div key={campo.id}>
                    <Input
                      label={campo.rotulo}
                      list={opcoesId}
                      value={detalhes.get(campo.id) ?? ''}
                      placeholder="Selecione uma sugestão ou descreva o que foi verificado"
                      onChange={(evento) => onChange(comDetalhe(avaliacao, campos, campo, evento.target.value))}
                    />
                    <datalist id={opcoesId}>
                      {campo.opcoes.map((opcao) => <option key={opcao} value={opcao} />)}
                    </datalist>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              O que for preenchido entra como linha da tabela do agente, no levantamento do item 7. O que ficar em branco não aparece.
            </p>
          </fieldset>
        )}

        {catalogo && (
          <details className="rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-2 text-xs text-ink-700">
            <summary className="cursor-pointer font-semibold text-ink-800">
              O que a norma exclui e ressalva neste anexo
            </summary>
            <div className="mt-2 space-y-3">
              {catalogo.exclusoes.length > 0 && (
                <div>
                  <p className="font-semibold text-ink-800">Não caracterizam periculosidade</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {catalogo.exclusoes.map((regra) => (
                      <li key={`${regra.referencia}-${regra.texto}`}>
                        {regra.texto} <span className="text-ink-500">({regra.referencia})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {catalogo.notas.length > 0 && (
                <div>
                  <p className="font-semibold text-ink-800">Condições e ressalvas</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {catalogo.notas.map((regra) => (
                      <li key={`${regra.referencia}-${regra.texto}`}>
                        {regra.texto} <span className="text-ink-500">({regra.referencia})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p>
                {SUMULA_364_TST.texto} <span className="text-ink-500">({SUMULA_364_TST.referencia})</span>
              </p>
            </div>
          </details>
        )}
      </EtapaNr16>

      {/* ---------------- 3. EXPOSIÇÃO ---------------- */}
      <EtapaNr16
        numero={3}
        titulo="Exposição"
        descricao="Súmula 364 do TST: contato fortuito ou habitual por tempo extremamente reduzido não dá direito ao adicional."
        concluida={Boolean(avaliacao.exposicaoPericulosidade || avaliacao.exposicaoPericulosidadeTexto?.trim())}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Exposição ao risco"
            value={avaliacao.exposicaoPericulosidade ?? ''}
            onChange={(evento) => onChange(comCampoNr16(avaliacao, 'exposicaoPericulosidade', evento.target.value))}
          >
            <option value="">— selecione —</option>
            {opcoesExposicao.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select
            label="Relação com a atividade"
            value={avaliacao.relacaoAtividadeNr16 ?? ''}
            onChange={(evento) => onChange(comCampoNr16(avaliacao, 'relacaoAtividadeNr16', evento.target.value))}
          >
            <option value="">— selecione —</option>
            {OPCOES_RELACAO_ATIVIDADE_NR16.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CampoComUnidade
            label="Tempo médio de exposição"
            hint="Só o número; a unidade fica ao lado."
            valor={avaliacao.tempoExposicaoNr16 ?? ''}
            placeholder="Ex.: 40"
            onValor={(valor) => onChange(comCampoNr16(avaliacao, 'tempoExposicaoNr16', valor))}
            rotuloUnidade="Unidade do tempo de exposição"
            classeUnidade="w-32"
            unidade={avaliacao.unidadeTempoExposicaoNr16 ?? ''}
            opcoes={OPCOES_UNIDADE_TEMPO_NR16}
            onUnidade={(valor) => onChange(comCampoNr16(avaliacao, 'unidadeTempoExposicaoNr16', valor))}
          />
          <CampoComUnidade
            label="Frequência operacional"
            hint="Quantas vezes; a periodicidade fica ao lado."
            valor={avaliacao.frequenciaOperacionalNr16 ?? ''}
            placeholder="Ex.: 3"
            onValor={(valor) => onChange(comCampoNr16(avaliacao, 'frequenciaOperacionalNr16', valor))}
            rotuloUnidade="Periodicidade da frequência"
            classeUnidade="w-36"
            unidade={avaliacao.periodicidadeOperacionalNr16 ?? ''}
            opcoes={OPCOES_PERIODICIDADE_NR16}
            onUnidade={(valor) => onChange(comCampoNr16(avaliacao, 'periodicidadeOperacionalNr16', valor))}
          />
        </div>

        {/* Preenchida, substitui o rótulo da opção nos três renderizadores —
            é o que resolve o caso concreto que nenhuma opção descreve. */}
        <Input
          label="Exposição — redação própria"
          value={avaliacao.exposicaoPericulosidadeTexto ?? ''}
          placeholder="Opcional. Preenchida, substitui a opção de exposição escolhida."
          onChange={(evento) => onChange(comCampoNr16(avaliacao, 'exposicaoPericulosidadeTexto', evento.target.value))}
        />
      </EtapaNr16>

      {/* ---------------- 4. ANÁLISE E CONCLUSÃO ---------------- */}
      <EtapaNr16
        numero={4}
        titulo="Análise e conclusão"
        descricao="O EPI não afasta a periculosidade. Cada risco tem a sua conclusão."
        concluida={Boolean(avaliacao.resultadoPericulosidade || avaliacao.resultadoPericulosidadeTexto?.trim())}
      >
        {/* O que o exame fez com os anexos. Sem esta linha, a tabela nega o
            enquadramento sem dizer contra o que confrontou as atividades. */}
        <div>
          <Textarea
            label="Análise dos Anexos"
            rows={4}
            value={avaliacao.analiseAnexos ?? ''}
            placeholder="Descreva o exame dos anexos da NR-16 diante das atividades e condições encontradas"
            hint="Sai como linha da tabela do item 7. O botão monta o texto com o que foi preenchido nas etapas 1 a 3 — revise antes de emitir."
            onChange={(evento) => onChange({ ...avaliacao, analiseAnexos: evento.target.value })}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              icon={<Wand2 size={14} />}
              disabled={avaliacao.analiseAnexos === analiseGerada}
              onClick={() => onChange({ ...avaliacao, analiseAnexos: analiseGerada })}
            >
              Gerar análise a partir dos dados
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            id={`agente-${avaliacao.id}-resultadoPericulosidade`}
            label="Resultado técnico"
            value={avaliacao.resultadoPericulosidade ?? ''}
            onChange={(evento) => escolherResultado(evento.target.value)}
          >
            <option value="">— selecione —</option>
            {OPCOES_RESULTADO_NR16.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          {parcial && (
            <Input
              label="Período ou atividade caracterizada"
              value={avaliacao.periodoCaracterizacaoNr16 ?? ''}
              placeholder="Ex.: de 01/03/2021 a 30/06/2022, no abastecimento da frota"
              hint="A que a caracterização parcial se restringe."
              onChange={(evento) => onChange(comCampoNr16(avaliacao, 'periodoCaracterizacaoNr16', evento.target.value))}
            />
          )}
        </div>

        <Input
          label="Resultado técnico — redação própria"
          value={avaliacao.resultadoPericulosidadeTexto ?? ''}
          placeholder="Opcional. Preenchida, substitui o resultado escolhido."
          onChange={(evento) => onChange(comCampoNr16(avaliacao, 'resultadoPericulosidadeTexto', evento.target.value))}
        />

        {alertas.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={14} aria-hidden="true" /> Confira antes de inserir no laudo
            </p>
            <ul aria-label="Pontos de atenção da avaliação NR-16" className="mt-1 list-disc space-y-0.5 pl-5">
              {alertas.map((alerta) => <li key={alerta}>{alerta}</li>)}
            </ul>
          </div>
        )}

        {/* Vai para o quadro do item 10, logo abaixo da conclusão. É onde cabe
            a ressalva do caso concreto sem alterar a redação da conclusão. */}
        <div>
          <Textarea
            label="Observações complementares"
            rows={3}
            value={avaliacao.observacao ?? ''}
            placeholder="Opcional. Complementa a conclusão no quadro do item 10."
            onChange={(evento) => onChange({ ...avaliacao, observacao: evento.target.value })}
          />
          <div role="group" aria-label="Observações frequentes" className="mt-2 flex flex-wrap gap-1.5">
            {OBSERVACOES_PADRAO_NR16.map((frase) => {
              const marcada = temObservacaoNr16(avaliacao.observacao, frase)
              return (
                <button
                  key={frase}
                  type="button"
                  aria-pressed={marcada}
                  onClick={() => onChange({ ...avaliacao, observacao: alternarObservacaoNr16(avaliacao.observacao, frase) })}
                  className={marcada
                    ? 'inline-flex items-center gap-1 rounded-full border border-amber-500 bg-amber-100 px-2.5 py-1 text-left text-xs text-amber-900'
                    : 'inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-left text-xs text-ink-700 hover:border-amber-400 hover:bg-amber-50'}
                >
                  {marcada && <CheckCircle2 size={12} aria-hidden="true" />}
                  {frase}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-amber-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            Sem enquadramento? O botão fecha a conclusão negativa e completa só o que estiver em branco.
          </p>
          <Button size="sm" variant="outline" onClick={aplicarPadrao}>
            Aplicar texto padrão sem enquadramento
          </Button>
        </div>
      </EtapaNr16>
    </div>
  )
}
