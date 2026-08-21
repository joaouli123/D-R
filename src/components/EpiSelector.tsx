import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, BadgeCheck, History, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react'

import { Button, Input } from '@/components/ui'
import { categoriaProtecaoDoAgente, usaAtenuacaoRuido } from '@/lib/nr15'
import { calcularProtecaoAuditiva } from '@/lib/protecaoAuditiva'
import { formatDate } from '@/lib/utils'
import * as api from '@/services/api'
import type { AgenteAvaliado, EpiSelecionado } from '@/types'

interface EpiSelectorProps {
  agente: AgenteAvaliado
  onChange: (agente: AgenteAvaliado) => void
  /**
   * Data da vistoria (aaaa-mm-dd). A validade do CA é julgada NELA, não
   * em hoje: um CA vencido em 2024 valia normalmente no período de um
   * processo de 2022, e é essa a pergunta que o laudo responde.
   */
  dataReferencia?: string
}

interface FormularioManual {
  categoria: string
  modelo: string
  validadeCa: string
  caUnico: string
  caPecaFacial: string
  caFiltroCartucho: string
  nivelProtecaoDb: string
}

type CampoCa = 'caUnico' | 'caPecaFacial' | 'caFiltroCartucho'

const MANUAL_VAZIO: FormularioManual = {
  categoria: '',
  modelo: '',
  validadeCa: '',
  caUnico: '',
  caPecaFacial: '',
  caFiltroCartucho: '',
  nivelProtecaoDb: '',
}

const FOCO_VISIVEL = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2'

function anexoParaApi(anexoNr15?: string): string | undefined {
  if (!anexoNr15) return undefined
  const numero = /^ANEXO_(\d+)(?:_([A-Z]))?$/.exec(anexoNr15)
  if (!numero) return undefined
  return `Anexo ${Number(numero[1])}${numero[2] ? `-${numero[2]}` : ''}`
}

function descricaoCas(epi: {
  caUnico?: string | null
  caPecaFacial?: string | null
  caFiltroCartucho?: string | null
}) {
  return [
    epi.caUnico && `CA único: ${epi.caUnico}`,
    epi.caPecaFacial && `CA peça facial: ${epi.caPecaFacial}`,
    epi.caFiltroCartucho && `CA cartucho/filtro: ${epi.caFiltroCartucho}`,
  ].filter((texto): texto is string => Boolean(texto))
}

function sugestoesPorCategoria(
  itens: api.EpiCatalogo[],
  categoria: string,
  anexo: string | undefined,
): api.EpiCatalogo[] {
  return itens
    .filter((item) => item.aplicacoes.some((aplicacao) =>
      (!anexo || aplicacao.anexo === anexo)
      && (aplicacao.categoria === categoria || aplicacao.categoria === 'Multigases'),
    ))
    .sort((a, b) => {
      const prioridade = (item: api.EpiCatalogo) => item.aplicacoes.some((aplicacao) =>
        (!anexo || aplicacao.anexo === anexo) && aplicacao.categoria === categoria,
      ) ? 0 : 1
      return prioridade(a) - prioridade(b) || a.modelo.localeCompare(b.modelo, 'pt-BR')
    })
}

/** 17 → "17 dB"; 21.5 → "21,5 dB". */
function emDb(valor: number) {
  return `${String(valor).replace('.', ',')} dB`
}

/**
 * Três estados, não dois. "Incerto" existe porque a base do MTE não
 * publica a data em que um CA foi cancelado ou suspenso — afirmar
 * qualquer coisa ali seria inventar.
 */
function tomValidade(validade: api.ValidadeNaData, dataReferencia: string) {
  if (validade.incerto) {
    return { cartao: 'border-amber-200 bg-amber-50', pilula: 'bg-amber-100 text-amber-900', rotulo: 'Confirmar situação' }
  }
  if (validade.valido) {
    return { cartao: 'border-emerald-200 bg-emerald-50', pilula: 'bg-emerald-100 text-emerald-900', rotulo: `Válido em ${formatDate(dataReferencia)}` }
  }
  return { cartao: 'border-red-200 bg-red-50', pilula: 'bg-red-100 text-red-900', rotulo: `Sem validade em ${formatDate(dataReferencia)}` }
}

export function EpiSelector({ agente, onChange, dataReferencia }: EpiSelectorProps) {
  const tituloId = useId()
  const caId = useId()
  const nrrsfId = useId()
  const [consulta, setConsulta] = useState('')
  const [catalogo, setCatalogo] = useState<api.EpiCatalogo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [manual, setManual] = useState<FormularioManual>(MANUAL_VAZIO)
  const [erroManual, setErroManual] = useState('')

  // --- consulta ao espelho oficial do CAEPI ---
  const [numeroCa, setNumeroCa] = useState('')
  const [ficha, setFicha] = useState<api.FichaCa | null>(null)
  const [consultandoCa, setConsultandoCa] = useState(false)
  const [erroCa, setErroCa] = useState('')
  const [campoCaQuimico, setCampoCaQuimico] = useState<'caPecaFacial' | 'caFiltroCartucho'>('caPecaFacial')
  const [nrrsf, setNrrsf] = useState('')
  const [salvandoNrrsf, setSalvandoNrrsf] = useState(false)
  const [erroNrrsf, setErroNrrsf] = useState('')
  const [avisoNrrsf, setAvisoNrrsf] = useState('')
  // Sem isso, uma base ainda não carregada devolveria "esse CA não
  // existe" para um CA que existe — e o perito passaria a desconfiar
  // da consulta em vez do servidor.
  const [statusBase, setStatusBase] = useState<api.StatusCaepi | null>(null)

  const requisicaoAtual = useRef(0)
  const selecionados = agente.epis ?? []
  const limiteAtingido = selecionados.length >= 10
  const categoriaProtecao = categoriaProtecaoDoAgente(agente)
  const ehRuido = usaAtenuacaoRuido(agente)
  const ehProdutoQuimico = agente.tipo === 'quimico'
  const medicaoRuido = agente.valorMedido == null ? null : Number(agente.valorMedido)
  // dB(A) no Anexo 1; dB(C) ou dB(Linear) no Anexo 2 — cada um com o
  // seu limite de tolerância.
  const unidadeRuido = agente.unidadeMedicao
  const dataVistoria = dataReferencia?.slice(0, 10) || ''
  const campoCa: CampoCa = ehProdutoQuimico ? campoCaQuimico : 'caUnico'
  const baseVazia = statusBase != null && statusBase.totais.homologacoes === 0

  async function carregar(q = '', sinal?: AbortSignal) {
    const requisicao = ++requisicaoAtual.current
    setCarregando(true)
    setErro('')
    const termo = q.trim()
    if (!termo && !categoriaProtecao) {
      setCatalogo([])
      setCarregando(false)
      return
    }
    try {
      const anexo = anexoParaApi(agente.anexoNr15)
      const itens = await api.epis.listar({
        ...(termo ? { q: termo } : {}),
        ...(anexo ? { anexo } : {}),
      })
      if (!sinal?.aborted && requisicao === requisicaoAtual.current) {
        setCatalogo(termo || !categoriaProtecao ? itens : sugestoesPorCategoria(itens, categoriaProtecao, anexo))
      }
    } catch {
      if (!sinal?.aborted && requisicao === requisicaoAtual.current) {
        setCatalogo([])
        setErro('Não foi possível carregar o catálogo. Pesquise novamente ou informe o EPI manualmente.')
      }
    } finally {
      if (!sinal?.aborted && requisicao === requisicaoAtual.current) setCarregando(false)
    }
  }

  useEffect(() => {
    const controle = new AbortController()
    void carregar('', controle.signal)
    return () => {
      controle.abort()
      requisicaoAtual.current += 1
    }
  }, [agente.anexoNr15, agente.referenciaNormativaId])

  // Uma vez por montagem. Falha em silêncio de propósito: é um dado de
  // apoio, e derrubar o seletor por causa dele seria pior que não tê-lo.
  useEffect(() => {
    let vivo = true
    void (async () => {
      try {
        const situacao = await api.caepi.status()
        if (vivo) setStatusBase(situacao ?? null)
      } catch {
        // segue sem o rodapé de status
      }
    })()
    return () => { vivo = false }
  }, [])

  function limparConsultaCa() {
    setFicha(null)
    setNumeroCa('')
    setNrrsf('')
    setErroCa('')
    setErroNrrsf('')
    setAvisoNrrsf('')
  }

  async function consultarCa() {
    const numero = numeroCa.replace(/\D/g, '').replace(/^0+/, '')
    setErroNrrsf('')
    setAvisoNrrsf('')
    if (!numero) {
      setFicha(null)
      setErroCa('Digite o número do CA que está na etiqueta do equipamento.')
      return
    }

    setConsultandoCa(true)
    setErroCa('')
    try {
      const encontrada = await api.caepi.consultar(numero, dataVistoria || undefined)
      if (!encontrada) {
        setFicha(null)
        setErroCa(baseVazia
          ? 'A base do Ministério do Trabalho ainda não foi carregada neste servidor, então nenhum CA é encontrado. Avise o suporte e, por enquanto, informe o EPI manualmente logo abaixo.'
          : `O CA ${numero} não consta na base do Ministério do Trabalho. Confira o número na etiqueta ou informe o EPI manualmente, logo abaixo.`)
        return
      }
      setFicha(encontrada)
      setNrrsf(encontrada.atenuacao?.nrrsfDb == null ? '' : String(encontrada.atenuacao.nrrsfDb).replace('.', ','))
    } catch (e) {
      setFicha(null)
      setErroCa(e instanceof api.ErroApi
        ? e.message
        : 'Não foi possível consultar o CA agora. Tente de novo ou informe o EPI manualmente.')
    } finally {
      setConsultandoCa(false)
    }
  }

  async function salvarNrrsf() {
    if (!ficha) return
    const bruto = nrrsf.trim().replace(',', '.')
    const valor = bruto ? Number(bruto) : null
    if (valor != null && (!Number.isFinite(valor) || valor < 0 || valor > 50)) {
      setErroNrrsf('Informe o NRRsf em dB, entre 0 e 50. Ex.: 17 ou 21,5.')
      return
    }

    setSalvandoNrrsf(true)
    setErroNrrsf('')
    setAvisoNrrsf('')
    try {
      const salvo = await api.caepi.salvarNrrsf(ficha.numeroCa, { nrrsfDb: valor })
      setFicha({
        ...ficha,
        atenuacao: {
          nrrsfDb: salvo.nrrsfDb,
          fonte: salvo.fonte,
          bandas: ficha.atenuacao?.bandas ?? null,
          observacao: salvo.observacao,
          fichaConsultadaEm: ficha.atenuacao?.fichaConsultadaEm ?? null,
        },
      })
      setAvisoNrrsf(salvo.nrrsfDb == null
        ? 'NRRsf apagado.'
        : `NRRsf de ${emDb(salvo.nrrsfDb)} salvo. Fica guardado para as próximas perícias com este CA.`)
    } catch (e) {
      setErroNrrsf(e instanceof api.ErroApi ? e.message : 'Não foi possível salvar o NRRsf agora.')
    } finally {
      setSalvandoNrrsf(false)
    }
  }

  function adicionar(epi: EpiSelecionado) {
    if (limiteAtingido) return
    onChange({ ...agente, epis: [...selecionados, epi] })
  }

  function adicionarDoCaepi() {
    if (!ficha) return
    adicionar(api.snapshotCa(ficha, campoCa))
    limparConsultaCa()
  }

  function adicionarManual() {
    const categoria = manual.categoria.trim()
    const modelo = manual.modelo.trim()
    const validadeCa = manual.validadeCa.trim()
    if (!categoria || !modelo || !validadeCa) {
      setErroManual('Preencha equipamento, descrição e validade do CA para adicionar o EPI manual.')
      return
    }
    const nivelProtecaoDb = manual.nivelProtecaoDb.trim()
      ? Number(manual.nivelProtecaoDb)
      : null
    if (nivelProtecaoDb != null && (!Number.isFinite(nivelProtecaoDb) || nivelProtecaoDb < 0 || nivelProtecaoDb > 100)) {
      setErroManual('Informe um NRRsf entre 0 e 100 dB.')
      return
    }

    adicionar({
      categoria,
      modelo,
      validadeCa,
      ...(!ehProdutoQuimico && manual.caUnico.trim() ? { caUnico: manual.caUnico.trim() } : {}),
      ...(ehProdutoQuimico && manual.caPecaFacial.trim() ? { caPecaFacial: manual.caPecaFacial.trim() } : {}),
      ...(ehProdutoQuimico && manual.caFiltroCartucho.trim() ? { caFiltroCartucho: manual.caFiltroCartucho.trim() } : {}),
      ...(ehRuido && nivelProtecaoDb != null
        ? { nivelProtecaoDb, metodoAtenuacao: 'NRRsf' as const }
        : ehRuido ? { nivelProtecaoDb: null } : {}),
    })
    setManual(MANUAL_VAZIO)
    setErroManual('')
  }

  const registroVigente = ficha?.vigente ?? ficha?.homologacoes[0] ?? null
  const jaAdicionadoCa = Boolean(ficha) && selecionados.some((epi) =>
    [epi.caUnico, epi.caPecaFacial, epi.caFiltroCartucho].includes(ficha!.numeroCa),
  )

  return (
    <section aria-labelledby={tituloId} className="mt-3 rounded-lg border border-navy-100 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-md bg-navy-50 p-1.5 text-navy-700" aria-hidden="true">
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <h4 id={tituloId} className="text-sm font-semibold text-ink-900">Proteção associada</h4>
            <p className="mt-0.5 text-xs leading-5 text-ink-500">
              {ehRuido
                ? 'Digite o CA da etiqueta. O sistema busca na base oficial, desconta o NRRsf da medição e avalia cada CA separadamente.'
                : 'Digite o CA da etiqueta e o sistema preenche o equipamento pela base oficial do Ministério do Trabalho.'}
            </p>
          </div>
        </div>
        <p className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${dataVistoria ? 'bg-navy-50 text-navy-800' : 'bg-amber-50 text-amber-900'}`}>
          {dataVistoria
            ? `Validade conferida em ${formatDate(dataVistoria)}`
            : 'Validade conferida em hoje'}
        </p>
      </div>

      {/* ---- Consulta ao CAEPI: caminho principal ---- */}
      <div className="mt-3 rounded-md border border-brand-200 bg-brand-50/40 p-2.5">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(evento) => {
            evento.preventDefault()
            void consultarCa()
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor={caId} className="text-xs font-semibold text-ink-800">
              Número do CA
            </label>
            <input
              id={caId}
              type="text"
              inputMode="numeric"
              value={numeroCa}
              placeholder="Ex.: 11882"
              autoComplete="off"
              className={`mt-1 h-9 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 hover:border-ink-400 ${FOCO_VISIVEL}`}
              onChange={(evento) => {
                setNumeroCa(evento.target.value.replace(/\D/g, '').slice(0, 10))
                setErroCa('')
              }}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className={FOCO_VISIVEL}
            loading={consultandoCa}
            icon={<BadgeCheck size={14} />}
          >
            Consultar CA
          </Button>
          {ficha && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={FOCO_VISIVEL}
              icon={<X size={14} />}
              onClick={limparConsultaCa}
            >
              Limpar
            </Button>
          )}
        </form>

        {!dataVistoria && (
          <p className="mt-2 text-[11px] leading-4 text-ink-500">
            Preencha a data da vistoria no cabeçalho da perícia para o sistema conferir a validade
            na data certa — e não em hoje.
          </p>
        )}

        {baseVazia ? (
          <p role="status" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-900">
            A base oficial ainda não foi carregada neste servidor. Até lá, cadastre o EPI manualmente
            mais abaixo.
          </p>
        ) : statusBase && (
          <p className="mt-2 text-[11px] leading-4 text-ink-500">
            Base oficial com {statusBase.totais.cas.toLocaleString('pt-BR')} CAs
            {statusBase.ultimaSincronizacao?.concluidoEm
              ? `, atualizada em ${formatDate(statusBase.ultimaSincronizacao.concluidoEm)}`
              : ''}.
          </p>
        )}

        {erroCa && (
          <p role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-900">
            {erroCa}
          </p>
        )}

        {ficha && registroVigente && (() => {
          const tom = tomValidade(registroVigente.validade, ficha.dataReferencia)
          const nrrsfAtual = ficha.atenuacao?.nrrsfDb ?? null
          return (
            <div role="status" className={`mt-2.5 rounded-md border p-2.5 ${tom.cartao}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">CA {ficha.numeroCa} · {registroVigente.equipamento}</p>
                  {registroVigente.descricao && (
                    <p className="mt-0.5 text-xs leading-5 text-ink-700">{registroVigente.descricao}</p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-600">
                    {[registroVigente.marca, registroVigente.referencia && `Ref.: ${registroVigente.referencia}`, registroVigente.razaoSocial]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tom.pilula}`}>
                  {tom.rotulo}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-ink-800">{registroVigente.validade.motivo}</p>

              {registroVigente.anexos.length > 0 && (
                <p className="mt-1 text-[11px] text-ink-600">
                  Enquadramento NR-15: {registroVigente.anexos.join(', ')} · {registroVigente.categoria}
                </p>
              )}

              {registroVigente.restricaoLaudo && (
                <p className="mt-1 text-[11px] leading-4 text-ink-600">
                  Restrição do laudo: {registroVigente.restricaoLaudo}
                </p>
              )}

              {ficha.temHistorico && (
                <p className="mt-2 flex items-start gap-1.5 rounded-md border border-navy-200 bg-white/70 px-2 py-1.5 text-[11px] leading-4 text-navy-900">
                  <History size={13} className="mt-px shrink-0" aria-hidden="true" />
                  <span>
                    Este CA foi homologado {ficha.homologacoes.length} vezes, com validades diferentes.
                    O sistema usou a que valia em {formatDate(ficha.dataReferencia)}.
                  </span>
                </p>
              )}

              {registroVigente.descontinuado && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-ink-600">
                  <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden="true" />
                  <span>O Ministério marcou este tipo de equipamento como layout descontinuado.</span>
                </p>
              )}

              {/* NRRsf: o único campo que o perito preenche, e o único
                  que a atualização do MTE nunca sobrescreve. */}
              {ficha.exigeNrrsf && (
                <div className="mt-2.5 rounded-md border border-ink-200 bg-white p-2.5">
                  <label htmlFor={nrrsfId} className="text-xs font-semibold text-ink-800">
                    NRRsf (atenuação do protetor)
                  </label>
                  <p className="mt-0.5 text-[11px] leading-4 text-ink-500">
                    {nrrsfAtual == null
                      ? 'Não consta na base do MTE. Pegue na ficha do CA ou na embalagem e preencha uma vez — vale para todas as perícias.'
                      : `${emDb(nrrsfAtual)} · ${ficha.atenuacao?.fonte === 'PERITO' ? 'preenchido por você' : 'lido da ficha do MTE'}.`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id={nrrsfId}
                      type="text"
                      inputMode="decimal"
                      value={nrrsf}
                      placeholder="Ex.: 17"
                      className={`h-9 w-28 rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 hover:border-ink-400 ${FOCO_VISIVEL}`}
                      onChange={(evento) => {
                        setNrrsf(evento.target.value)
                        setErroNrrsf('')
                        setAvisoNrrsf('')
                      }}
                    />
                    <span className="text-xs text-ink-500">dB</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={FOCO_VISIVEL}
                      loading={salvandoNrrsf}
                      onClick={() => void salvarNrrsf()}
                    >
                      Salvar NRRsf
                    </Button>
                  </div>
                  {erroNrrsf && <p role="alert" className="mt-2 text-[11px] text-red-700">{erroNrrsf}</p>}
                  {avisoNrrsf && <p role="status" className="mt-2 text-[11px] text-emerald-800">{avisoNrrsf}</p>}

                  {ehRuido && medicaoRuido != null && Number.isFinite(medicaoRuido) && (() => {
                    const previa = calcularProtecaoAuditiva(medicaoRuido, nrrsfAtual, unidadeRuido)
                    return (
                      <p className={`mt-2 rounded-md px-2 py-1.5 text-[11px] font-semibold ${previa.eficaz ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                        Com este CA: {previa.medicaoDbA} − {previa.atenuacaoDb} = {previa.resultadoDbA} {previa.unidade} ·{' '}
                        {previa.eficaz ? 'proteção eficaz' : 'proteção ineficaz'} (limite {previa.limiteDb} {previa.unidade})
                      </p>
                    )
                  })()}
                </div>
              )}

              {ehProdutoQuimico && (
                <fieldset className="mt-2.5">
                  <legend className="text-xs font-semibold text-ink-800">Este CA é de:</legend>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {([['caPecaFacial', 'Peça facial'], ['caFiltroCartucho', 'Cartucho / filtro']] as const).map(([valor, rotulo]) => (
                      <label key={valor} className="flex items-center gap-1.5 text-xs text-ink-700">
                        <input
                          type="radio"
                          name={`${caId}-destino`}
                          value={valor}
                          checked={campoCaQuimico === valor}
                          className={`h-3.5 w-3.5 accent-brand-600 ${FOCO_VISIVEL}`}
                          onChange={() => setCampoCaQuimico(valor)}
                        />
                        {rotulo}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <Button
                type="button"
                size="sm"
                className={`mt-2.5 ${FOCO_VISIVEL}`}
                icon={<Plus size={14} />}
                disabled={jaAdicionadoCa || limiteAtingido}
                onClick={adicionarDoCaepi}
              >
                {jaAdicionadoCa ? 'Já adicionado' : 'Adicionar ao laudo'}
              </Button>
            </div>
          )
        })()}
      </div>

      {selecionados.length > 0 && (
        <ul aria-label="EPIs associados" className="mt-3 space-y-2">
          {selecionados.map((epi, indice) => (
            <li key={`${epi.catalogoId ?? 'manual'}-${indice}`} className="flex flex-col gap-2 rounded-md border border-brand-100 bg-brand-50/50 p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{epi.validadeCa ? epi.categoria : epi.modelo}</p>
                <p className="text-xs text-ink-600">
                  {epi.validadeCa ? `Descrição: ${epi.modelo}` : `${epi.marca ?? 'Marca não informada'} · ${epi.categoria}`}
                </p>
                {epi.validadeCa && <p className="text-xs text-ink-600">Validade do CA: {epi.validadeCa}</p>}
                {descricaoCas(epi).map((ca) => <p key={ca} className="text-xs text-ink-500">{ca}</p>)}
                {/* A atenuação em linha própria: dentro da conta ela some, e é
                    o número que o perito confere contra a etiqueta do CA. */}
                {ehRuido && (
                  <p className="text-xs font-semibold text-navy-700">
                    {epi.nivelProtecaoDb != null
                      ? `Atenuação (NRRsf): ${epi.nivelProtecaoDb} dB`
                      : 'Atenuação (NRRsf): não informada'}
                  </p>
                )}
                {ehRuido && medicaoRuido != null && Number.isFinite(medicaoRuido) && (() => {
                  const resultado = calcularProtecaoAuditiva(medicaoRuido, epi.nivelProtecaoDb, unidadeRuido)
                  return (
                    <div className={`mt-2 rounded-md border px-2.5 py-2 ${resultado.eficaz ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                      <p className="text-xs font-semibold">{resultado.medicaoDbA} - {resultado.atenuacaoDb} = {resultado.resultadoDbA} {resultado.unidade}</p>
                      <p className="text-xs font-bold">{resultado.eficaz ? 'Proteção eficaz' : 'Proteção ineficaz'} · limite {resultado.limiteDb} {resultado.unidade}</p>
                      {!resultado.nivelInformado && <p className="mt-1 text-[11px]">NRRsf não informado; considerado 0 dB.</p>}
                    </div>
                  )
                })()}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`self-start text-red-700 hover:bg-red-50 sm:self-center ${FOCO_VISIVEL}`}
                icon={<Trash2 size={14} />}
                aria-label={`Remover ${epi.modelo}`}
                onClick={() => onChange({ ...agente, epis: selecionados.filter((_, item) => item !== indice) })}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(evento) => {
          evento.preventDefault()
          void carregar(consulta)
        }}
      >
        <input
          type="search"
          value={consulta}
          aria-label="Pesquisar EPI, marca ou CA"
          placeholder="Pesquisar modelo, marca ou CA"
          className={`h-9 min-w-0 flex-1 rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 hover:border-ink-400 ${FOCO_VISIVEL}`}
          onChange={(evento) => setConsulta(evento.target.value)}
        />
        <Button type="submit" size="sm" variant="outline" className={FOCO_VISIVEL} icon={<Search size={14} />}>
          Pesquisar EPI
        </Button>
      </form>

      {erro && <p role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">{erro}</p>}
      {carregando ? (
        <p role="status" className="mt-3 text-xs text-ink-500">Carregando sugestões de EPI…</p>
      ) : catalogo.length ? (
        <ul aria-label="Sugestões de EPI" className="mt-3 grid gap-2 lg:grid-cols-2">
          {catalogo.map((item) => {
            const jaAdicionado = selecionados.some((epi) => epi.catalogoId === item.id)
            const snapshot = api.snapshotEpi(item)
            return (
              <li key={item.id} className="flex flex-col justify-between gap-2 rounded-md border border-ink-200 bg-ink-50/60 p-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{item.modelo}</p>
                  <p className="text-xs text-ink-600">{item.marca} · {snapshot.categoria}</p>
                  {descricaoCas(item).map((ca) => <p key={ca} className="text-xs text-ink-500">{ca}</p>)}
                  {item.nivelProtecaoDb != null && <p className="mt-1 text-xs font-semibold text-navy-700">NRRsf: {item.nivelProtecaoDb} dB</p>}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`self-start ${FOCO_VISIVEL}`}
                  icon={<Plus size={14} />}
                  disabled={jaAdicionado || limiteAtingido}
                  aria-label={jaAdicionado ? `${item.modelo} já adicionado` : `Adicionar ${item.modelo}`}
                  onClick={() => adicionar(snapshot)}
                >
                  {jaAdicionado ? 'Adicionado' : 'Adicionar'}
                </Button>
              </li>
            )
          })}
        </ul>
      ) : !erro ? (
        <p role="status" className="mt-3 text-xs text-ink-500">
          {!categoriaProtecao && !consulta.trim()
            ? 'Pesquise o catálogo ou informe o EPI manualmente.'
            : 'Nenhum EPI sugerido para este agente.'}
        </p>
      ) : null}

      <details className="mt-3 rounded-md border border-dashed border-ink-300 bg-ink-50/40 p-2.5">
        <summary className={`cursor-pointer text-xs font-semibold text-brand-800 ${FOCO_VISIVEL}`}>
          Informar EPI manualmente
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Input aria-label="Equipamento" placeholder="Equipamento" value={manual.categoria} onChange={(evento) => setManual({ ...manual, categoria: evento.target.value })} />
          <Input aria-label="Descrição" placeholder="Descrição" value={manual.modelo} onChange={(evento) => setManual({ ...manual, modelo: evento.target.value })} />
          <Input aria-label="Validade do CA" placeholder="Validade do CA" value={manual.validadeCa} onChange={(evento) => setManual({ ...manual, validadeCa: evento.target.value })} />
          {!ehProdutoQuimico && <Input aria-label="CA único" placeholder="CA único" value={manual.caUnico} onChange={(evento) => setManual({ ...manual, caUnico: evento.target.value })} />}
          {ehProdutoQuimico && <Input aria-label="CA da peça facial" placeholder="CA da peça facial" value={manual.caPecaFacial} onChange={(evento) => setManual({ ...manual, caPecaFacial: evento.target.value })} />}
          {ehProdutoQuimico && <Input aria-label="CA do cartucho ou filtro" placeholder="CA do cartucho/filtro" value={manual.caFiltroCartucho} onChange={(evento) => setManual({ ...manual, caFiltroCartucho: evento.target.value })} />}
          {ehRuido && <Input type="number" min="0" max="100" step="0.1" aria-label="NRRsf em dB" placeholder="NRRsf (dB)" value={manual.nivelProtecaoDb} onChange={(evento) => setManual({ ...manual, nivelProtecaoDb: evento.target.value })} />}
        </div>
        {erroManual && <p role="alert" className="mt-2 text-xs text-red-700">{erroManual}</p>}
        <Button type="button" size="sm" className={`mt-3 ${FOCO_VISIVEL}`} disabled={limiteAtingido} onClick={adicionarManual}>
          Adicionar EPI manual
        </Button>
      </details>

      {limiteAtingido && <p role="alert" className="mt-2 text-xs text-amber-800">Limite de 10 EPIs por agente atingido.</p>}
    </section>
  )
}
