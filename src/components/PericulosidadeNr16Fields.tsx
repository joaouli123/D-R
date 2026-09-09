import { Button, Input, Select, Textarea } from '@/components/ui'
import {
  ANEXOS_NR16,
  NOME_PADRAO_SEM_ENQUADRAMENTO,
  PADRAO_NR16_SEM_ENQUADRAMENTO,
  anexoNr16PorId,
  aplicarAnexoNr16,
  camposDoAnexoNr16,
} from '@/content/anexosNr16'
import type { CampoAnexoNr16 } from '@/content/anexosNr16'
import type {
  AgenteAvaliado,
  DetalheNr16,
  ExposicaoPericulosidade,
  ResultadoPericulosidade,
} from '@/types'

// ============================================================
// AVALIAÇÃO DA NR-16 — os dois cenários que o perito descreveu
//
// Cenário 1 (negativo, "quando não tem nada"): ele não escolhe anexo, clica
// em "Aplicar texto padrão sem enquadramento" e a tela preenche os quatro
// textos de praxe. Daí só ajusta a redação se quiser. No documento a tabela
// sai enxuta — sem a linha do adicional, que numa avaliação negativa só
// confundia quem lê.
//
// Cenário 2 (com agente): escolhido o anexo, a tela CARREGA os pontos que
// aquele risco manda examinar, cada um com as opções típicas (inflamáveis
// pedem produto, classificação, ponto de fulgor, FDS...). São campos do
// levantamento de fato — o item 7.3 do laudo. A análise e a conclusão
// continuam no item 10 e no bloco próprio da NR-16; são etapas
// complementares, não repetição.
//
// Nada aqui é lista fechada: toda sugestão entra por `datalist` e a exposição
// e o resultado aceitam redação própria, que vence a opção do seletor nos
// três renderizadores.
// ============================================================

interface PericulosidadeNr16FieldsProps {
  avaliacao: AgenteAvaliado
  onChange: (avaliacao: AgenteAvaliado) => void
}

const EXPOSICOES: { value: ExposicaoPericulosidade; label: string }[] = [
  { value: 'permanente', label: 'Permanente' },
  { value: 'intermitente', label: 'Intermitente' },
  { value: 'eventual', label: 'Eventual ou por tempo extremamente reduzido' },
  {
    value: 'nao_constatada',
    label: 'Não constatada exposição a condição de risco que atenda aos critérios normativos de caracterização',
  },
]

const RESULTADOS: { value: ResultadoPericulosidade; label: string }[] = [
  { value: 'caracterizada', label: 'Periculosidade caracterizada' },
  {
    value: 'nao_caracterizada',
    label: 'Não caracterizada periculosidade, por ausência de enquadramento nos critérios técnicos e normativos aplicáveis',
  },
  { value: 'prejudicada', label: 'Avaliação prejudicada por insuficiência de elementos' },
]

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

export function PericulosidadeNr16Fields({ avaliacao, onChange }: PericulosidadeNr16FieldsProps) {
  const anexo = anexoNr16PorId(avaliacao.anexoNr16)
  const campos = camposDoAnexoNr16(avaliacao.anexoNr16)
  const detalhes = new Map((avaliacao.detalhesNr16 ?? []).map((detalhe) => [detalhe.id, detalhe.valor]))
  const listaId = `atividades-${avaliacao.id}`
  const semEnquadramento = avaliacao.resultadoPericulosidade === 'nao_caracterizada'
    && !avaliacao.resultadoPericulosidadeTexto?.trim()

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(260px,1.5fr)_minmax(180px,0.8fr)_minmax(120px,0.45fr)]">
        <Select
          label="Anexo NR-16"
          value={avaliacao.anexoNr16 ?? ''}
          onChange={(evento) => onChange(aplicarAnexoNr16(avaliacao, evento.target.value))}
          hint="Sem anexo, a avaliação segue como negativa — é o cenário sem agente."
        >
          <option value="">— selecione —</option>
          {ANEXOS_NR16.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
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
        <Input
          label="Adicional"
          value="30%"
          readOnly
          hint={semEnquadramento
            ? 'Sem enquadramento, esta linha não sai na tabela.'
            : 'Percentual fixo da NR-16.'}
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <Input
            label="Atividade ou operação avaliada"
            list={listaId}
            value={avaliacao.atividadeEnquadrada ?? ''}
            placeholder="Selecione uma sugestão ou descreva a atividade"
            onChange={(evento) => onChange({ ...avaliacao, atividadeEnquadrada: evento.target.value })}
          />
          <datalist id={listaId}>
            {anexo?.atividadesSugeridas.map((atividade) => <option key={atividade} value={atividade} />)}
          </datalist>
        </div>
        <Textarea
          label="Condição ou área de risco"
          rows={3}
          value={avaliacao.areaRisco ?? ''}
          placeholder="Descreva a condição encontrada e a delimitação da área de risco"
          onChange={(evento) => onChange({ ...avaliacao, areaRisco: evento.target.value })}
        />
      </div>

      {campos.length > 0 && (
        // Só aparece no cenário 2. Cada anexo traz o que ele mesmo manda
        // examinar; o que ficar em branco não entra na tabela do documento.
        <fieldset className="mt-3 rounded-lg border border-amber-200 bg-white/60 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Pontos de verificação do {anexo?.label ?? 'anexo'}
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            {campos.map((campo) => {
              const opcoesId = `nr16-${avaliacao.id}-${campo.id}`
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
            O que for preenchido entra como linha da tabela do agente, no levantamento do item 7.3 e no quadro de análise do item 10. O que ficar em branco não aparece.
          </p>
        </fieldset>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Select
          label="Exposição ao risco"
          value={avaliacao.exposicaoPericulosidade ?? ''}
          onChange={(evento) => {
            const { exposicaoPericulosidade: _anterior, ...semExposicao } = avaliacao
            onChange(evento.target.value
              ? { ...avaliacao, exposicaoPericulosidade: evento.target.value as ExposicaoPericulosidade }
              : semExposicao)
          }}
        >
          <option value="">— selecione —</option>
          {EXPOSICOES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
        <Select
          label="Resultado técnico"
          value={avaliacao.resultadoPericulosidade ?? ''}
          onChange={(evento) => {
            const { resultadoPericulosidade: _anterior, ...semResultado } = avaliacao
            onChange(evento.target.value
              ? { ...avaliacao, resultadoPericulosidade: evento.target.value as ResultadoPericulosidade }
              : semResultado)
          }}
        >
          <option value="">— selecione —</option>
          {RESULTADOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
        {/* As duas saídas de texto livre. Preenchidas, elas substituem o
            rótulo da opção acima nos três renderizadores — é o que resolve o
            caso concreto que nenhuma das opções descreve. */}
        <Input
          label="Exposição — redação própria"
          value={avaliacao.exposicaoPericulosidadeTexto ?? ''}
          placeholder="Opcional. Preenchido, substitui a opção escolhida acima."
          onChange={(evento) => {
            if (evento.target.value) {
              onChange({ ...avaliacao, exposicaoPericulosidadeTexto: evento.target.value })
              return
            }
            const { exposicaoPericulosidadeTexto: _vazio, ...semTexto } = avaliacao
            onChange(semTexto)
          }}
        />
        <Input
          label="Resultado técnico — redação própria"
          value={avaliacao.resultadoPericulosidadeTexto ?? ''}
          placeholder="Opcional. Preenchido, substitui a opção escolhida acima."
          onChange={(evento) => {
            if (evento.target.value) {
              onChange({ ...avaliacao, resultadoPericulosidadeTexto: evento.target.value })
              return
            }
            const { resultadoPericulosidadeTexto: _vazio, ...semTexto } = avaliacao
            onChange(semTexto)
          }}
        />
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange({
            ...avaliacao,
            ...PADRAO_NR16_SEM_ENQUADRAMENTO,
            // Só quando ele ainda não escreveu nada: o botão preenche o que
            // está vazio, não apaga o que o perito já digitou.
            nome: avaliacao.nome.trim() || NOME_PADRAO_SEM_ENQUADRAMENTO,
          })}
        >
          Aplicar texto padrão sem enquadramento
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-500">
        Critério qualitativo. A conclusão deve considerar a atividade, a área de risco e a frequência de exposição verificadas no caso concreto. A fundamentação da NR-16 é escrita no item de conclusão sobre periculosidade, mais abaixo nesta mesma tela.
      </p>
    </div>
  )
}
