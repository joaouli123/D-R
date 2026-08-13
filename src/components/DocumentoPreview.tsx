import { Logo } from '@/components/Logo'
import type { Empresa, Pericia, Usuario } from '@/types'
import { extenso, formatDate } from '@/lib/utils'
import { labelAnexoNr15 } from '@/content/anexosNr15'
import { dadosPapel } from '@/lib/participantes'

// ============================================================
// MÓDULO H — Montagem automática do documento
// Reproduz a identidade visual D&R e a estrutura do modelo
// em Word fornecido pelo Contratante.
// ============================================================

const CRITERIO: Record<string, string> = {
  qualitativo: 'Qualitativo',
  quantitativo: 'Quantitativo',
  nao_aplicavel: 'Não aplicável',
}

const GRAU: Record<string, string> = {
  minimo: 'Mínimo (10%)',
  medio: 'Médio (20%)',
  maximo: 'Máximo (40%)',
  nao_caracterizado: 'Não caracterizado',
}

function limiteComUnidade(limite?: string, unidade?: string): string {
  const valor = limite?.trim() ?? ''
  const medida = unidade?.trim() ?? ''
  if (!medida) return valor || '—'
  if (!valor) return medida

  const componentes = medida.split('|').map((parte) => parte.trim()).filter(Boolean)
  return componentes.length > 0 && componentes.every((parte) => valor.includes(parte))
    ? valor
    : `${valor} (${medida})`
}

function Paragrafos({ texto }: { texto: string }) {
  if (!texto?.trim()) {
    return <p className="italic text-ink-400">[Seção não preenchida]</p>
  }
  return (
    <>
      {texto.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p.trim()}</p>
      ))}
    </>
  )
}

export function DocumentoPreview({
  pericia,
  empresas,
  perito,
  titulo,
}: {
  pericia: Pericia
  empresas: Empresa[]
  perito?: Usuario | null
  titulo: string
}) {
  const t = pericia.tecnico
  const principal = pericia.reclamadas.find((r) => r.principal)
  const empresaPrincipal = empresas.find((e) => e.id === principal?.empresaId)
  const outras = pericia.reclamadas
    .filter((r) => !r.principal)
    .map((r) => empresas.find((e) => e.id === r.empresaId))
    .filter(Boolean) as Empresa[]

  const fotosPorSecao = pericia.fotos.reduce<Record<string, typeof pericia.fotos>>((acc, f) => {
    ;(acc[f.secao] ??= []).push(f)
    return acc
  }, {})

  const SECAO_LABEL: Record<string, string> = {
    ambiente: 'Ambiente de Trabalho',
    atividades: 'Atividades Desenvolvidas',
    equipamentos: 'Equipamentos e Máquinas',
    epi: 'Equipamentos de Proteção Individual',
    produtos: 'Produtos Químicos Utilizados',
    documentos: 'Documentos Apresentados',
  }

  let secao = 0
  const n = () => ++secao

  return (
    <article className="doc-sheet mx-auto w-full max-w-[820px] bg-white px-10 py-12 shadow-card print-area sm:px-14">
      {/* Cabeçalho com identidade visual */}
      <header className="mb-10 border-b-2 border-brand-700 pb-5 text-center">
        <Logo size="lg" />
        <p className="mt-3 text-[9pt] font-bold uppercase tracking-[0.2em] text-navy-600">
          Plataforma Inteligente de Perícia Trabalhista
        </p>
        {perito && (
          <p className="mt-2 text-[9pt] text-ink-500">
            {perito.nome} — {perito.titulo}
            {perito.registroProfissional ? ` · ${perito.registroProfissional}` : ''}
          </p>
        )}
      </header>

      <h1>{titulo}</h1>

      {/* Endereçamento */}
      <section className="mb-8">
        <p className="no-indent font-bold">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO</p>
        <p className="no-indent font-bold uppercase">{pericia.vara}</p>
        {t.enderecamento && (
          <div className="mt-4">
            <Paragrafos texto={t.enderecamento} />
          </div>
        )}
      </section>

      {/* Identificação */}
      <h2>{n()}. Identificação do Processo</h2>
      <table>
        <tbody>
          <tr>
            <th className="w-[32%]">Processo nº</th>
            <td>{pericia.numeroProcesso}</td>
          </tr>
          <tr>
            <th>Vara / Comarca</th>
            <td>
              {pericia.vara} — {pericia.comarca}
            </td>
          </tr>
          <tr>
            <th>Reclamante</th>
            <td>
              {pericia.reclamante}
              {pericia.funcaoReclamante ? ` — ${pericia.funcaoReclamante}` : ''}
            </td>
          </tr>
          <tr>
            <th>Reclamada principal</th>
            <td>
              {empresaPrincipal
                ? `${empresaPrincipal.razaoSocial} — CNPJ ${empresaPrincipal.cnpj}`
                : '—'}
            </td>
          </tr>
          {outras.map((e) => (
            <tr key={e.id}>
              <th>Reclamada solidária</th>
              <td>
                {e.razaoSocial} — CNPJ {e.cnpj}
              </td>
            </tr>
          ))}
          <tr>
            <th>Período contratual</th>
            <td>
              {formatDate(pericia.admissao)} a {pericia.demissao ? formatDate(pericia.demissao) : 'atual'}
            </td>
          </tr>
          <tr>
            <th>Modalidade da perícia</th>
            <td className="capitalize">
              {pericia.modalidade === 'ambas'
                ? 'Insalubridade e Periculosidade'
                : pericia.modalidade}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Apresentação */}
      <h2>{n()}. Apresentação</h2>
      <Paragrafos texto={t.apresentacao} />

      {/* Objetivo */}
      <h2>{n()}. Objetivo da Perícia</h2>
      <Paragrafos texto={t.objetivoPericia} />

      {/* Vistoria */}
      <h2>{n()}. Da Vistoria</h2>
      <p>
        A vistoria técnica foi realizada em {extenso(pericia.dataVistoria)}
        {pericia.horaVistoria ? `, às ${pericia.horaVistoria}` : ''}, no endereço{' '}
        {pericia.localVistoria || '—'}, com a presença dos participantes abaixo relacionados.
      </p>
      {pericia.participantes.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nome do Participante</th>
              <th className="w-[32%]">Qualificação / Representação</th>
              <th className="w-[38%]">Atuação no Ato</th>
            </tr>
          </thead>
          <tbody>
            {pericia.participantes.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{dadosPapel(p.papel).label}</td>
                <td>{dadosPapel(p.papel).atuacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Empresa */}
      <h2>{n()}. Descrição da Empresa</h2>
      <Paragrafos texto={t.descricaoEmpresa} />

      {/* Ambiente */}
      <h2>{n()}. Descrição do Ambiente de Trabalho</h2>
      <Paragrafos texto={t.descricaoAmbiente} />

      {/* Atividades */}
      <h2>{n()}. Atividades e Funções Exercidas</h2>
      <Paragrafos texto={t.atividadesFuncoes} />
      {t.periodos.length > 0 && (
        <table>
          <thead>
            <tr>
              <th className="w-[28%]">Função</th>
              <th className="w-[18%]">Setor</th>
              <th className="w-[24%]">Período</th>
              <th>Atividades</th>
            </tr>
          </thead>
          <tbody>
            {t.periodos.map((p) => (
              <tr key={p.id}>
                <td>{p.funcao}</td>
                <td>{p.setor || '—'}</td>
                <td>
                  {formatDate(p.inicio)} a {p.fim ? formatDate(p.fim) : 'atual'}
                </td>
                <td>{p.descricaoAtividades || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Agentes */}
      <h2>{n()}. Agentes e Riscos Avaliados</h2>
      {t.agentes.length === 0 ? (
        <p className="italic text-ink-400">[Nenhum agente cadastrado]</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Agente</th>
              <th className="w-[10%]">CAS</th>
              <th className="w-[16%]">Anexo NR-15</th>
              <th className="w-[12%]">Critério</th>
              <th className="w-[12%]">Grau</th>
              <th className="w-[20%]">Limite de Tolerância</th>
              <th className="w-[12%]">Valor Medido</th>
            </tr>
          </thead>
          <tbody>
            {t.agentes.map((a) => (
              <tr key={a.id}>
                <td>
                  <p>{a.nome}</p>
                  {a.atividadeEnquadrada && (
                    <p className="mt-1 text-xs text-ink-500">
                      Atividade ou referência normativa: {a.atividadeEnquadrada}
                    </p>
                  )}
                </td>
                <td>{a.cas || '—'}</td>
                <td>{labelAnexoNr15(a.anexoNr15) || '—'}</td>
                <td>{CRITERIO[a.criterio]}</td>
                <td>{a.grau ? GRAU[a.grau] : '—'}</td>
                <td>{limiteComUnidade(a.limiteTolerancia, a.unidadeLimite)}</td>
                <td>{a.medido || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Normas */}
      <h2>{n()}. Normas e Referências Técnicas Utilizadas</h2>
      <Paragrafos texto={t.normasReferencias} />

      {/* Equipamentos */}
      <h2>{n()}. Equipamentos e Procedimentos Analisados</h2>
      <Paragrafos texto={t.equipamentosAnalisados} />

      {/* Informações levantadas */}
      <h2>{n()}. Informações Levantadas na Vistoria</h2>
      <Paragrafos texto={t.informacoesLevantadas} />

      {/* Análise */}
      <h2>{n()}. Análise Técnica</h2>
      <Paragrafos texto={t.analiseTecnica} />

      {/* Fotos */}
      {pericia.fotos.length > 0 && (
        <>
          <h2>{n()}. Relatório Fotográfico</h2>
          {Object.entries(fotosPorSecao).map(([sec, fotos]) => (
            <div key={sec} className="mb-4">
              <h3>{SECAO_LABEL[sec] ?? sec}</h3>
              <div className="grid grid-cols-2 gap-3">
                {fotos
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((f, i) => (
                    <figure key={f.id} className="text-center">
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden border border-ink-300 bg-ink-100">
                        {f.url ? (
                          <img src={f.url} alt={f.legenda} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[9pt] text-ink-400">Foto {i + 1}</span>
                        )}
                      </div>
                      <figcaption className="mt-1 text-[9pt] italic text-ink-600">
                        Figura {i + 1} — {f.legenda || 'sem legenda'}
                      </figcaption>
                    </figure>
                  ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Conclusão */}
      <h2>{n()}. Conclusão</h2>
      <Paragrafos texto={t.conclusao} />

      {/* Observações */}
      {t.observacoesAdicionais?.trim() && (
        <>
          <h2>{n()}. Observações Adicionais</h2>
          <Paragrafos texto={t.observacoesAdicionais} />
        </>
      )}

      {/* Encerramento e assinatura */}
      <p className="mt-10 no-indent">
        Sendo o que se apresenta para o momento, o signatário coloca-se à disposição deste MM. Juízo
        para os esclarecimentos que se fizerem necessários.
      </p>

      <p className="mt-8 no-indent text-center">
        {pericia.comarca}, {extenso(new Date().toISOString().slice(0, 10))}.
      </p>

      <div className="mt-14 text-center">
        <div className="mx-auto w-72 border-t border-ink-800 pt-1.5">
          <p className="no-indent font-bold">{perito?.nome ?? '—'}</p>
          <p className="no-indent text-[10pt]">{perito?.titulo ?? ''}</p>
          <p className="no-indent text-[10pt]">{perito?.registroProfissional ?? ''}</p>
        </div>
      </div>
    </article>
  )
}
