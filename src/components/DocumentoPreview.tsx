import type { Empresa, Pericia, SecaoFoto, Usuario } from '@/types'
import { extenso, formatDate, maskCNPJ, maskCPF } from '@/lib/utils'
import { dadosPapel } from '@/lib/participantes'
import { montarApresentacaoAgente } from '@/lib/apresentacaoAgente'
import { intervaloDoPeriodo, periodoAvaliacaoEmpresa } from '@/lib/periodoAvaliacao'
import { dadosAssinatura } from '@/lib/assinaturaDocumento'
import { objetivoPadraoDaPericia } from '@/content/textosPadrao'
import { horarioDaVistoria } from '@/lib/vistoria'
import { Logo } from '@/components/Logo'

// ============================================================
// MÓDULO H — Prévia fiel do Parecer/Laudo.
// A ordem abaixo é compartilhada conceitualmente com os geradores
// de PDF e DOCX e segue o modelo enxuto aprovado pelo cliente.
// ============================================================

function Paragrafos({ texto }: { texto?: string | null }) {
  if (!texto?.trim()) return null
  return (
    <>
      {texto.split(/\n{2,}/).map((paragrafo, indice) => (
        <p key={indice}>{paragrafo.trim()}</p>
      ))}
    </>
  )
}

function ConteudoEstruturado({ texto }: { texto?: string | null }) {
  if (!texto?.trim()) return null

  return (
    <>
      {texto.split(/\n{2,}/).map((bloco, indice) => {
        const conteudo = bloco.trim()
        const titulo = conteudo.match(/^([45]\.\d+(?:\.\d+)?\.)\s+(.+)$/s)
        if (!titulo) return <p key={indice}>{conteudo}</p>
        const nivel = titulo[1].split('.').filter(Boolean).length
        return nivel >= 3
          ? <h4 key={indice}>{titulo[1]} {titulo[2]}</h4>
          : <h3 key={indice}>{titulo[1]} {titulo[2]}</h3>
      })}
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
  const empresasPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]))
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
  const temDivergencias = Boolean(
    t.divergenciasFaticas?.trim() ||
    t.alegacoesReclamante?.trim() ||
    t.informacoesReclamada?.trim() ||
    t.consideracoesDivergencias?.trim(),
  )
  const numeroDivergencias = temDivergencias ? `7.${++indiceSubsecao7}` : null
  const numeroConsideracoes = t.consideracoesDivergencias?.trim()
    ? `7.${++indiceSubsecao7}`
    : null
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
  const fecho = dadosAssinatura(pericia)

  const rotuloNatureza = (tipo: (typeof t.agentes)[number]['tipo']) => ({
    fisico: 'Agente Físico',
    quimico: 'Agente Químico',
    biologico: 'Agente Biológico',
    periculosidade: 'Atividade ou Operação Perigosa',
  } as Record<(typeof t.agentes)[number]['tipo'], string>)[tipo]

  const agentesSemProtecoes = (agentes: typeof t.agentes, prefixo?: string) =>
    agentes.length ? (
      <div className="space-y-4">
        {agentes.map((agente, indice) => {
          const apresentacao = montarApresentacaoAgente(agente)
          return (
            <section key={agente.id} className="agente-bloco">
              {prefixo
                ? <h4>{prefixo}.{indice + 1}. {rotuloNatureza(agente.tipo)} — {apresentacao.titulo}</h4>
                : <h3>{apresentacao.titulo}</h3>}
              <table className="agente-propriedades">
                <thead><tr><th>Propriedade</th><th>Informação</th></tr></thead>
                <tbody>
                  {apresentacao.linhas.map((linha) => (
                    <tr key={linha.rotulo}><th>{linha.rotulo}</th><td>{linha.valor}</td></tr>
                  ))}
                </tbody>
              </table>
              {agente.observacao?.trim() && <Paragrafos texto={agente.observacao} />}
            </section>
          )
        })}
      </div>
    ) : null

  const protecoes = t.agentes.flatMap((agente) => {
    const apresentacao = montarApresentacaoAgente(agente)
    return apresentacao.protecoes.length ? [{ agente, apresentacao }] : []
  })

  return (
    <article className="doc-sheet mx-auto w-full max-w-[820px] bg-white px-10 py-12 shadow-card print-area sm:px-14">
      <header className="marca-oficial mb-8 border-b-2 border-[#007a3d] pb-5 text-center">
        <Logo size="lg" className="mx-auto" />
        {perito && (
          <p className="no-indent mt-2 text-center text-[8.5pt] text-ink-500">
            {perito.nome}{perito.titulo ? ` — ${perito.titulo}` : ''}
            {perito.registroProfissional ? ` · ${perito.registroProfissional}` : ''}
          </p>
        )}
      </header>
      <section className="mb-8">
        <p className="no-indent font-bold uppercase">
          {`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA ${[pericia.vara, pericia.comarca]
            .filter(Boolean)
            .join(' — ')}`.toUpperCase()}
        </p>
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
              {pericia.cpfReclamante ? ` — CPF ${maskCPF(pericia.cpfReclamante)}` : ''}
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
      <Paragrafos texto={objetivoPadraoDaPericia(pericia)} />
      <table>
        <tbody>
          <tr><th>Função Inicial</th><td>{pericia.funcaoReclamante || '—'}</td></tr>
          <tr><th>Data de admissão</th><td>{formatDate(pericia.admissao)}</td></tr>
          <tr><th>Data de desligamento</th><td>{pericia.demissao ? formatDate(pericia.demissao) : 'Contrato vigente'}</td></tr>
          {pericia.dataAjuizamento && (
            <tr><th>Ajuizamento da ação</th><td>{formatDate(pericia.dataAjuizamento)}</td></tr>
          )}
          {periodo && (
            <tr>
              <th>Período avaliado</th>
              <td>{intervaloDoPeriodo(periodo)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>2. Da Diligência Técnica Pericial</h2>
      <p>
        A vistoria técnica foi realizada em {extenso(pericia.dataVistoria)}
        {horarioDaVistoria(pericia)}, no endereço{' '}
        {pericia.localVistoria || '—'}
        {pericia.numeroVistoria ? `, nº ${pericia.numeroVistoria}` : ''}
        {pericia.setorVistoriado ? `, no setor/local ${pericia.setorVistoriado}` : ''}, com a presença dos participantes abaixo relacionados.
      </p>
      {pericia.participantes.length > 0 && (
        <table>
          <thead><tr><th>Nome do Participante</th><th className="w-[32%]">Qualificação / Representação</th><th className="w-[38%]">Atuação no Ato</th></tr></thead>
          <tbody>
            {pericia.participantes.map((participante) => (
              <tr key={participante.id}>
                <td>{participante.nome}</td>
                <td>
                  {dadosPapel(participante.papel).label}
                  {participante.empresaId && empresasPorId.get(participante.empresaId)
                    ? ` — ${empresasPorId.get(participante.empresaId)?.razaoSocial}`
                    : ''}
                </td>
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
      <ConteudoEstruturado texto={t.normasReferencias} />

      <h2>5. Metodologia de Avaliação</h2>
      <ConteudoEstruturado texto={t.equipamentosAnalisados} />

      <h2>6. Descrição do Posto de Trabalho, Máquinas, Ferramentas e Produtos</h2>
      <h3>6.1. Descrição do Posto de Trabalho</h3>
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
      {temInsalubridade && <><h3>{numeroAvaliacaoNr15}. NR-15 — Avaliação da Exposição Ocupacional</h3>{agentesSemProtecoes(agentesNr15, numeroAvaliacaoNr15 ?? undefined)}</>}
      {temPericulosidade && <>
        <h3>{numeroAvaliacaoNr16}. NR-16 — Avaliação das Atividades e Operações Perigosas</h3>
        <h4>{numeroAvaliacaoNr16}.1. Critério de Avaliação</h4>
        <Paragrafos texto={t.criterioAvaliacaoPericulosidade} />
        {agentesSemProtecoes(agentesNr16)}
      </>}
      {numeroDivergencias && (
        <>
          <h3>{numeroDivergencias}. Divergências Fáticas</h3>
          {t.divergenciasFaticas?.trim() && <Paragrafos texto={t.divergenciasFaticas} />}
          {t.alegacoesReclamante?.trim() && (
            <><h4>{numeroDivergencias}.1. Alegações do Reclamante</h4><Paragrafos texto={t.alegacoesReclamante} /></>
          )}
          {t.informacoesReclamada?.trim() && (
            <><h4>{numeroDivergencias}.2. Informações prestadas pela Reclamada</h4><Paragrafos texto={t.informacoesReclamada} /></>
          )}
        </>
      )}
      {numeroConsideracoes && <><h3>{numeroConsideracoes}. Considerações sobre as divergências fáticas</h3><Paragrafos texto={t.consideracoesDivergencias} /></>}
      {fotosDasSecoes(['documentos'])}

      <h2>8. Dos Equipamentos de Proteção Individual (NR-06)</h2>
      <Paragrafos texto={t.notaTecnicaEpis} />
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
      )) : null}
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
      <p className="mt-6 no-indent text-center">{fecho.cidade}, {extenso(fecho.data)}.</p>
      <div className="mt-8 text-center">
        <div className="mx-auto w-72 border-t border-ink-800 pt-1.5">
          <p className="no-indent font-bold">{perito?.nome ?? '—'}</p>
          {(perito?.titulo ?? '').split(/\r?\n|;/).map((linha) => linha.trim()).filter(Boolean).map((linha) => (
            <p key={`titulo-${linha}`} className="no-indent text-[10pt]">{linha}</p>
          ))}
          {(perito?.registroProfissional ?? '').split(/\r?\n|;/).map((linha) => linha.trim()).filter(Boolean).map((linha) => (
            <p key={`registro-${linha}`} className="no-indent text-[10pt]">{linha}</p>
          ))}
        </div>
      </div>
    </article>
  )
}
