import { Input, Select, Textarea } from '@/components/ui'
import { ANEXOS_NR16, anexoNr16PorId, aplicarAnexoNr16 } from '@/content/anexosNr16'
import type { AgenteAvaliado, ExposicaoPericulosidade, ResultadoPericulosidade } from '@/types'

interface PericulosidadeNr16FieldsProps {
  avaliacao: AgenteAvaliado
  onChange: (avaliacao: AgenteAvaliado) => void
}

const EXPOSICOES: { value: ExposicaoPericulosidade; label: string }[] = [
  { value: 'permanente', label: 'Permanente' },
  { value: 'intermitente', label: 'Intermitente' },
  { value: 'eventual', label: 'Eventual ou por tempo extremamente reduzido' },
]

const RESULTADOS: { value: ResultadoPericulosidade; label: string }[] = [
  { value: 'caracterizada', label: 'Periculosidade caracterizada' },
  { value: 'nao_caracterizada', label: 'Periculosidade não caracterizada' },
  { value: 'prejudicada', label: 'Avaliação prejudicada por insuficiência de elementos' },
]

export function PericulosidadeNr16Fields({ avaliacao, onChange }: PericulosidadeNr16FieldsProps) {
  const anexo = anexoNr16PorId(avaliacao.anexoNr16)
  const listaId = `atividades-${avaliacao.id}`

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(260px,1.5fr)_minmax(180px,0.8fr)_minmax(120px,0.45fr)]">
        <Select
          label="Anexo NR-16"
          value={avaliacao.anexoNr16 ?? ''}
          onChange={(evento) => onChange(aplicarAnexoNr16(avaliacao, evento.target.value))}
        >
          <option value="">— selecione —</option>
          {ANEXOS_NR16.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <Input label="Risco avaliado" value={anexo?.risco ?? avaliacao.nome} readOnly />
        <Input label="Adicional" value="30%" readOnly hint="Percentual fixo da NR-16." />
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
      </div>
      <p className="mt-2 text-xs text-ink-500">
        Critério qualitativo. A conclusão deve considerar a atividade, a área de risco e a frequência de exposição verificadas no caso concreto.
      </p>
    </div>
  )
}
