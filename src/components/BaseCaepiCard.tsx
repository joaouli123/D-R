import { useCallback, useEffect, useRef, useState } from 'react'
import { Database, ExternalLink, FileUp, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, CardHeader, useToast } from '@/components/ui'
import * as api from '@/services/api'
import { cn, formatDateTime } from '@/lib/utils'

// ============================================================
// MÓDULO L — carga da base oficial do CAEPI pelo painel.
//
// Por que existe um upload em vez de um botão "atualizar agora":
// o portal do MTE fica atrás do Cloudflare e responde ao servidor
// com desafio de navegador. Não há como o sistema baixar sozinho.
//
// Então o caminho honesto é este: quem tem o arquivo arrasta aqui e
// o servidor faz o resto — mesmo parser, mesmo histórico e mesma
// proteção do NRRsf digitado pelo perito, que nunca é sobrescrito.
// ============================================================

const URL_PORTAL = 'https://caepi.trabalho.gov.br/internet/ConsultaCAInternet.aspx'

/** Depois de quantos dias a base merece um aviso na tela. */
const DIAS_PARA_AVISAR = 30

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null
  const dias = (Date.now() - new Date(iso).getTime()) / 86_400_000
  return Number.isFinite(dias) ? Math.max(0, Math.floor(dias)) : null
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR')
}

export function BaseCaepiCard({ podeAtualizar }: { podeAtualizar: boolean }) {
  const toast = useToast()
  const [status, setStatus] = useState<api.StatusCaepi | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const seletor = useRef<HTMLInputElement>(null)

  const recarregar = useCallback(async () => {
    try {
      setStatus(await api.caepi.status())
    } catch {
      // Sem status a tela ainda serve para enviar o arquivo.
      setStatus(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  async function enviar(arquivo: File | undefined) {
    if (!arquivo || enviando) return

    if (!/\.(csv|gz)$/i.test(arquivo.name)) {
      toast('Envie o arquivo .csv ou .csv.gz baixado do portal do MTE.', 'error')
      return
    }

    setEnviando(true)
    try {
      const resultado = await api.caepi.importar(arquivo)
      toast(
        `Base atualizada: ${numero(resultado.registros)} registros ` +
          `(${numero(resultado.novos)} novos, ${numero(resultado.atualizados)} atualizados).`,
      )
      await recarregar()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.', 'error')
    } finally {
      setEnviando(false)
      if (seletor.current) seletor.current.value = ''
    }
  }

  const totais = status?.totais
  const ultima = status?.ultimaSincronizacao
  const vazia = totais != null && totais.homologacoes === 0
  const dias = diasDesde(ultima?.concluidoEm)
  const velha = dias != null && dias > DIAS_PARA_AVISAR

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Base oficial do CAEPI"
        subtitle="Espelho dos Certificados de Aprovação publicados pelo Ministério do Trabalho."
        icon={<Database size={18} />}
        action={
          carregando ? null : vazia || !totais ? (
            <Badge tone="red">Não carregada</Badge>
          ) : velha ? (
            <Badge tone="amber">Atualizada há {dias} dias</Badge>
          ) : (
            <Badge tone="green">Em dia</Badge>
          )
        }
      />

      <div className="p-5">
        {totais && !vazia && (
          <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['CAs na base', numero(totais.cas)],
              ['Homologações', numero(totais.homologacoes)],
              ['Válidos hoje', numero(totais.validosHoje)],
              ['Protetores auditivos', numero(totais.protetoresAuditivos)],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-2.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  {rotulo}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-ink-900">{valor}</dd>
              </div>
            ))}
          </dl>
        )}

        {ultima && (
          <p className="mb-5 text-[13px] text-ink-600">
            Última carga em <strong>{formatDateTime(ultima.concluidoEm ?? ultima.iniciadoEm)}</strong>
            {ultima.origem ? ` · origem: ${ultima.origem}` : ''}
            {ultima.status === 'falhou' && ultima.erro ? (
              <span className="mt-1 block text-red-700">Falhou: {ultima.erro}</span>
            ) : null}
          </p>
        )}

        {podeAtualizar ? (
          <>
            <ol className="mb-4 space-y-1.5 text-[13px] leading-relaxed text-ink-600">
              <li>
                <strong>1.</strong> Abra o portal do MTE e clique em{' '}
                <em>&ldquo;Baixar tabela completa&rdquo;</em>.{' '}
                <a
                  href={URL_PORTAL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                >
                  Abrir portal <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <strong>2.</strong> Arraste o arquivo baixado (<code>.csv.gz</code>) para a área
                abaixo. A leitura leva menos de um minuto.
              </li>
            </ol>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault()
                setArrastando(false)
                void enviar(e.dataTransfer.files[0])
              }}
              className={cn(
                'rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors',
                arrastando ? 'border-brand-600 bg-brand-50' : 'border-ink-300 bg-ink-50/60',
                enviando && 'opacity-70',
              )}
            >
              <FileUp size={26} className="mx-auto text-ink-400" />
              <p className="mt-2 text-sm font-semibold text-ink-800">
                {enviando ? 'Lendo o arquivo do MTE…' : 'Arraste o arquivo aqui'}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                {enviando
                  ? 'Não feche esta página até terminar.'
                  : 'RelatorioCA.csv.gz — cerca de 21 MB'}
              </p>

              <input
                ref={seletor}
                type="file"
                accept=".csv,.gz,application/gzip"
                className="hidden"
                onChange={(e) => void enviar(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                loading={enviando}
                onClick={() => seletor.current?.click()}
              >
                Escolher arquivo
              </Button>
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-[13px] text-ink-600">
            A atualização da base é feita por um administrador. Se algum CA não estiver sendo
            encontrado, avise quem administra o sistema.
          </p>
        )}

        {!carregando && (
          <button
            type="button"
            onClick={() => void recarregar()}
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-500 hover:text-ink-700"
          >
            <RefreshCw size={13} /> Recarregar situação
          </button>
        )}
      </div>
    </Card>
  )
}
