import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui'
import { descreverPendencia, exigeEscolhaDeSubtipo, type PendenciaVarredura } from '@/lib/varreduraNormativa'

interface Props {
  pendencias: readonly PendenciaVarredura[]
  /** Leva o perito até o lugar que resolve a pendência. */
  onIr: (pendencia: PendenciaVarredura) => void
}

// ============================================================
// O que falta para emitir, no alto da etapa — cada item com um botão que
// leva ao campo.
//
// O aviso na hora de emitir já dizia o que faltava, e o perito elogiou. Mas
// ele "ainda teve dificuldade para concluir a etapa": o aviso sumia, e cabia
// a ele achar, numa tela longa, o anexo ou a avaliação de que a frase
// falava. Agora a lista fica à vista enquanto ele trabalha e some sozinha,
// item por item, à medida que resolve.
// ============================================================

export const ID_PENDENCIAS_EMISSAO = 'pendencias-emissao'

interface Entrada {
  chave: string
  texto: string
  acao: string
  alvo: PendenciaVarredura
}

const VISIVEIS = 6

function montarEntradas(pendencias: readonly PendenciaVarredura[]): Entrada[] {
  const entradas: Entrada[] = []
  const agrupadas = new Set<string>()
  pendencias.forEach((pendencia, indice) => {
    if (pendencia.motivo === 'não avaliado') {
      if (agrupadas.has(pendencia.norma)) return
      agrupadas.add(pendencia.norma)
      const doGrupo = pendencias.filter((p) => p.motivo === 'não avaliado' && p.norma === pendencia.norma)
      entradas.push({
        chave: `${pendencia.norma}-sem-decisao`,
        texto: doGrupo.length === 1
          ? descreverPendencia(pendencia)
          : `${pendencia.norma}: ${doGrupo.length} anexos sem decisão (${doGrupo.map((p) => p.anexo).join(', ')})`,
        acao: 'Ir ao anexo',
        alvo: pendencia,
      })
      return
    }
    entradas.push({
      chave: `${pendencia.norma}-${pendencia.agenteId ?? pendencia.anexoId ?? ''}-${pendencia.campo ?? pendencia.motivo}-${indice}`,
      texto: descreverPendencia(pendencia),
      acao: pendencia.motivo === 'sem avaliação registrada'
        ? 'Registrar avaliação NR-16'
        : pendencia.motivo === 'sem avaliação detalhada'
          ? exigeEscolhaDeSubtipo(pendencia.anexoId) ? 'Escolher subtipo' : 'Abrir avaliação'
          : 'Ir ao campo',
      alvo: pendencia,
    })
  })
  return entradas
}

export function PendenciasEmissao({ pendencias, onIr }: Props) {
  const [todas, setTodas] = useState(false)
  const entradas = montarEntradas(pendencias)

  if (!entradas.length) {
    return (
      <p
        id={ID_PENDENCIAS_EMISSAO}
        tabIndex={-1}
        className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 outline-none"
      >
        <CheckCircle2 size={16} aria-hidden="true" />
        Nenhuma pendência nesta etapa: as avaliações já podem ir ao documento.
      </p>
    )
  }

  const exibidas = todas ? entradas : entradas.slice(0, VISIVEIS)
  const ocultas = entradas.length - exibidas.length

  return (
    <section
      id={ID_PENDENCIAS_EMISSAO}
      tabIndex={-1}
      aria-label="Pendências para emitir"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 outline-none focus:ring-2 focus:ring-amber-400"
    >
      <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <AlertTriangle size={16} aria-hidden="true" />
        {entradas.length === 1 ? 'Falta 1 item para emitir o documento' : `Faltam ${entradas.length} itens para emitir o documento`}
      </h3>
      <ul className="mt-2 divide-y divide-amber-200">
        {exibidas.map((entrada) => (
          <li key={entrada.chave} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0 flex-1 text-sm text-ink-800">{entrada.texto}</span>
            <Button size="sm" variant="outline" onClick={() => onIr(entrada.alvo)}>
              {entrada.acao}
            </Button>
          </li>
        ))}
      </ul>
      {ocultas > 0 && (
        <Button size="sm" variant="ghost" className="mt-1" onClick={() => setTodas(true)}>
          Mostrar mais {ocultas}
        </Button>
      )}
    </section>
  )
}
