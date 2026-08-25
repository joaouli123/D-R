import type { Empresa, Pericia, SecaoFoto, Usuario } from '@/types'
import { extenso, formatDate, maskCNPJ } from '@/lib/utils'
import { dadosPapel } from '@/lib/participantes'
import { montarApresentacaoAgente } from '@/lib/apresentacaoAgente'
import { intervaloDoPeriodo, motivoDoPeriodo, periodoAvaliacaoEmpresa } from '@/lib/periodoAvaliacao'

// ============================================================
// MÓDULO H — Prévia fiel do Parecer/Laudo.
// A ordem abaixo é compartilhada conceitualmente com os geradores
// de PDF e DOCX e segue o modelo enxuto aprovado pelo cliente.
// ============================================================

function Paragrafos({ texto }: { texto?: string | null }) {
  if (!texto?.trim()) {
    return <p className="italic text-ink-400">[Seção não preenchida]</p>
  }
  return (
    <>
      {texto.split(/\n{2,}/).map((paragrafo, indice) => (
        <p key={indice}>{paragrafo.trim()}</p>
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
  const principal = pericia.reclamadas.find((reclamada) => reclamada.principal)
  const empresaPrincipal = empresas.find((empresa) => empresa.id === principal?.empresaId)
  const outras = pericia.reclamadas
    .filter((reclamada) => !reclamada.principal)
    .map((reclamada) => empresas.find((empresa) => empresa.id === reclamada.empresaId))
    .filter(Boolean) as Empresa[]

  // Sem data de ajuizamento a conta dos cinco anos não fecha, e a linha
  // simplesmente não aparece — janela chutada no laudo é pior que nenhuma.
  const periodo = periodoAvaliacaoEmpresa(pericia)

  const fotosOrdenadas = [...pericia.fotos].sort((a, b) => a.ordem - b.ordem)
  const numeroDaFoto = new Map(fotosOrdenadas.map((foto, indice) => [foto.id, indice + 1]))
  const fotosDasSecoes = (secoes: SecaoFoto[]) => {
    const fotos = fotosOrdenadas.filter((foto) => secoes.includes(foto.secao))
    if (!fotos.length) return null

    return (
      <div className="fotos space-y-4">
        {fotos.map((foto) => (
          <figure key={foto.id} className="break-inside-avoid text-center">
            <div className="flex items-center justify-center overflow-hidden border border-ink-300 bg-white p-2">
              {foto.url ? (
                <img
                  src={foto.url}
                  alt={foto.legenda}
                  className="max-h-[19cm] max-w-full object-contain"
                />
              ) : (
                <span className="py-20 text-[9pt] text-ink-400">Imagem indisponível</span>
              )}
            </div>
            <figcaption className="mt-1 text-[9pt] italic text-ink-600">
              Figura {numeroDaFoto.get(foto.id)} — {foto.legenda || 'sem legenda'}
            </figcaption>
          </figure>
        ))}
      </div>
    )
  }

  const agentesNr15 = t.agentes.filter((agente) => agente.tipo !== 'periculosidade')
  const agentesNr16 = t.agentes.filter((agente) => agente.tipo === 'periculosidade')
  const temInsalubridade = pericia.modalidade !== 'periculosidade'
  const temPericulosidade = pericia.modalidade !== 'insalubridade'
  let indiceSubsecao7 = 1
  const numeroAvaliacaoNr15 = temInsalubridade ? `7.${++indiceSubsecao7}` : null
  const numeroAvaliacaoNr16 = temPericulosidade ? `7.${++indiceSubsecao7}` : null
  const numeroDivergencias = t.divergenciasFaticas?.trim() ? `7.${++indiceSubsecao7}` : null
  let indiceSecaoFinal = 10
  const numeroConclusaoNr15 = temInsalubridade ? ++indiceSecaoFinal : null
  const numeroConclusaoNr16 = temPericulosidade ? ++indiceSecaoFinal : null
  const numeroQuesitos = t.respostasQuesitos?.trim() ? ++indiceSecaoFinal : null
  const numeroEncerramento = ++indiceSecaoFinal
  const conclusaoNr15 =
    t.conclusaoInsalubridade?.trim() ||
    (pericia.modalidade === 'insalubridade' || !t.conclusaoPericulosidade?.trim()
      ? t.conclusao
      : '')
  const conclusaoNr16 =
    t.conclusaoPericulosidade?.trim() ||
    (pericia.modalidade === 'periculosidade' ? t.conclusao : '')
  const encerramento = t.encerramento?.trim() || t.observacoesAdicionais

  const agentesSemProtecoes = (agentes: typeof t.agentes) =>
    agentes.length ? (
      <div className="space-y-4">
        {agentes.map((agente) => {
          const apresentacao = montarApresentacaoAgente(agente)
          return (
            <section key={agente.id} className="agente-bloco">
              <h3>{apresentacao.titulo}</h3>
              <table className="agente-propriedades">
                <thead><tr><th>Propriedade</th><th>Informação</th></tr></thead>
                <tbody>
                  {apresentacao.linhas.map((linha) => (
                    <tr key={linha.rotulo}><th>{linha.rotulo}</th><td>{linha.valor}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
    ) : (
      <p className="italic text-ink-400">[Nenhum agente cadastrado]</p>
    )

  const protecoes = t.agentes.flatMap((agente) => {
    const apresentacao = montarApresentacaoAgente(agente)
    return apresentacao.protecoes.length ? [{ agente, apresentacao }] : []
  })

  return (
    <article className="doc-sheet mx-auto w-full max-w-[820px] bg-white px-10 py-12 shadow-card print-area sm:px-14">
      <section className="mb-8">
        {t.enderecamento?.trim() ? (
          <Paragrafos texto={t.enderecamento} />
        ) : (
          <p className="no-indent font-bold uppercase">
            EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA{' '}
            {[pericia.vara, pericia.comarca].filter(Boolean).join(' — ')}
          </p>
        )}
      </section>

      <table className="ficha-processual">
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
                ? `${empresaPrincipal.razaoSocial} — CNPJ ${maskCNPJ(empresaPrincipal.cnpj)}`
                : '—'}
            </td>
          </tr>
          {outras.map((e) => (
            <tr key={e.id}>
              <th>Reclamada solidária</th>
              <td>
                {e.razaoSocial} — CNPJ {maskCNPJ(e.cnpj)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h1>{titulo}</h1>
      <h3>APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA</h3>
      <Paragrafos texto={t.apresentacao} />

      <h2>1. Objeto da Perícia e Dados Contratuais</h2>
      <Paragrafos texto={t.objetivoPericia} />
      <table>
        <tbody>
          <tr><th>Função / Cargo</th><td>{pericia.funcaoReclamante || '—'}</td></tr>
          <tr><th>Data de admissão</th><td>{formatDate(pericia.admissao)}</td></tr>
          <tr><th>Data de desligamento</th><td>{pericia.demissao ? formatDate(pericia.demissao) : 'Contrato vigente'}</td></tr>
          {pericia.dataAjuizamento && (
            <tr><th>Ajuizamento da ação</th><td>{formatDate(pericia.dataAjuizamento)}</td></tr>
          )}
          {periodo && (
            <tr>
              <th>Período avaliado</th>
              <td>
                {intervaloDoPeriodo(periodo)}
                <br />
                <span className="text-[0.85em] text-ink-500">
                  {motivoDoPeriodo(periodo, pericia.dataAjuizamento)}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>2. Da Diligência Técnica Pericial</h2>
      <p>
        A vistoria técnica foi realizada em {extenso(pericia.dataVistoria)}
        {pericia.horaVistoria ? `, às ${pericia.horaVistoria}` : ''}, no endereço{' '}
        {pericia.localVistoria || '—'}, com a presença dos participantes abaixo relacionados.
      </p>
      {pericia.participantes.length > 0 && (
        <table>
          <thead><tr><th>Nome do Participante</th><th className="w-[32%]">Qualificação / Representação</th><th className="w-[38%]">Atuação no Ato</th></tr></thead>
          <tbody>
            {pericia.participantes.map((participante) => (
              <tr key={participante.id}>
                <td>{participante.nome}</td>
                <td>{dadosPapel(participante.papel).label}</td>
                <td>{dadosPapel(participante.papel).atuacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>3. Descrição das Instalações da Reclamada</h2>
      <Paragrafos texto={t.descricaoEmpresa} />
      <h3>3.1. Instalações Físicas</h3>
      <Paragrafos texto={t.descricaoAmbiente} />
      {fotosDasSecoes(['ambiente'])}

      <h2>4. Critérios Técnicos para Avaliação Pericial</h2>
      <Paragrafos texto={t.normasReferencias} />

      <h2>5. Metodologia de Avaliação</h2>
      <Paragrafos texto={t.equipamentosAnalisados} />

      <h2>6. Descrição do Posto de Trabalho, Máquinas, Ferramentas e Produtos</h2>
      <h3>6.1. Características do Posto de Trabalho</h3>
      <Paragrafos texto={t.descricaoPostoTrabalho || t.descricaoAmbiente} />
      {fotosDasSecoes(['atividades'])}
      <h3>6.2. Máquinas, Ferramentas e Equipamentos Utilizados</h3>
      <Paragrafos texto={t.maquinasFerramentas} />
      {fotosDasSecoes(['equipamentos'])}
      <h3>6.3. Constatações da Vistoria Pericial</h3>
      <Paragrafos texto={t.informacoesLevantadas} />
      <h3>6.4. Produtos Utilizados Habitualmente nas Atividades</h3>
      <Paragrafos texto={t.produtosUtilizados} />
      {fotosDasSecoes(['produtos'])}

      <h2>7. Histórico Laboral, Períodos e Atividades Habituais Exercidas</h2>
      {t.periodos.length > 0 && (
        <table>
          <thead><tr><th className="w-[28%]">Função</th><th className="w-[18%]">Setor</th><th className="w-[24%]">Período</th><th>Atividades</th></tr></thead>
          <tbody>
            {t.periodos.map((periodo) => (
              <tr key={periodo.id}>
                <td>{periodo.funcao}</td><td>{periodo.setor || '—'}</td>
                <td>{formatDate(periodo.inicio)} a {periodo.fim ? formatDate(periodo.fim) : 'atual'}</td>
                <td>{periodo.descricaoAtividades || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3>7.1. Atividades Efetivamente Exercidas</h3>
      <Paragrafos texto={t.atividadesFuncoes} />
      {temInsalubridade && <><h3>{numeroAvaliacaoNr15}. NR-15 — Avaliação da Exposição Ocupacional</h3>{agentesSemProtecoes(agentesNr15)}</>}
      {temPericulosidade && <><h3>{numeroAvaliacaoNr16}. NR-16 — Avaliação das Atividades e Operações Perigosas</h3>{agentesSemProtecoes(agentesNr16)}</>}
      {numeroDivergencias && <><h3>{numeroDivergencias}. Divergências Fáticas</h3><Paragrafos texto={t.divergenciasFaticas} /></>}
      {fotosDasSecoes(['documentos'])}

      <h2>8. Dos Equipamentos de Proteção Individual (NR-06)</h2>
      {protecoes.length ? protecoes.map(({ agente, apresentacao }) => (
        <section key={agente.id} className="agente-bloco">
          <h3>{apresentacao.titulo}</h3>
          {apresentacao.protecoes.map((protecao) => (
            <div key={protecao.titulo} className="protecao-bloco">
              <h4>{protecao.titulo}</h4>
              <table><tbody>{protecao.linhas.map((linha) => (
                <tr key={linha.rotulo}><th>{linha.rotulo}</th><td className={linha.destaque ? `resultado-${linha.destaque}` : ''}>{linha.valor}</td></tr>
              ))}</tbody></table>
            </div>
          ))}
        </section>
      )) : <p className="italic text-ink-400">[Nenhum EPI associado aos agentes]</p>}
      {fotosDasSecoes(['epi'])}

      <h2>9. Das Proteções Coletivas</h2>
      <Paragrafos texto={t.protecoesColetivas} />

      <h2>10. {pericia.modalidade === 'insalubridade' ? 'Análise Técnica dos Agentes Identificados' : pericia.modalidade === 'periculosidade' ? 'Análise Técnica das Atividades e Riscos Identificados' : 'Análise Técnica dos Agentes, Atividades e Riscos Identificados'}</h2>
      <Paragrafos texto={t.analiseTecnica} />

      {numeroConclusaoNr15 && <><h2>{numeroConclusaoNr15}. NR-15 — Conclusão e Fundamentação</h2><Paragrafos texto={conclusaoNr15} /></>}
      {numeroConclusaoNr16 && <><h2>{numeroConclusaoNr16}. NR-16 — Conclusão e Fundamentação</h2><Paragrafos texto={conclusaoNr16} /></>}
      {numeroQuesitos && <><h2>{numeroQuesitos}. Respostas aos Quesitos Técnicos</h2><Paragrafos texto={t.respostasQuesitos} /></>}

      <h2>{numeroEncerramento}. Encerramento</h2>
      <Paragrafos texto={encerramento} />
      <p className="mt-6 no-indent">
        Sendo o que se apresenta para o momento, o signatário coloca-se à disposição deste MM. Juízo
        para os esclarecimentos que se fizerem necessários.
      </p>
      <p className="mt-8 no-indent text-center">{pericia.comarca}, {extenso(new Date().toISOString().slice(0, 10))}.</p>
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
