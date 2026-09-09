import { Fragment } from 'react'
import type { Empresa, Pericia, SecaoFoto, Usuario } from '@/types'
import { extenso, formatDate, maskCNPJ, maskCPF } from '@/lib/utils'
import {
  dadosPapel,
  participanteAusente,
  qualificacaoParticipante,
  TEXTO_AUSENCIA_RECLAMANTE,
} from '@/lib/participantes'
import { montarApresentacaoAgente, resumoProtecoesAssociadas } from '@/lib/apresentacaoAgente'
import { agenteExibeConclusao } from '@/lib/conclusoesAgentes'
import { intervaloDoPeriodo, periodoAvaliacaoEmpresa } from '@/lib/periodoAvaliacao'
import { dadosAssinatura } from '@/lib/assinaturaDocumento'
import { objetivoPadraoDaPericia } from '@/content/textosPadrao'
import { quadrosNr16DoItem10 } from '@/content/anexosNr16'
import { horarioDaVistoria } from '@/lib/vistoria'
import { atividadesDoPeriodo } from '@/lib/periodos'
import { emParagrafos, linhasDoBloco } from '@/lib/listasDocumento'
import { fotosEmOrdemDeDocumento } from '@/lib/fotosDocumento'
import { Logo } from '@/components/Logo'

// ============================================================
// MÓDULO H — Prévia fiel do Parecer/Laudo.
// A ordem abaixo é compartilhada conceitualmente com os geradores
// de PDF e DOCX e segue o modelo enxuto aprovado pelo cliente.
// ============================================================

/**
 * Um bloco vira uma sequência de parágrafos: linha comum é parágrafo
 * justificado, "• " é item de lista e TAB é linha recuada sem marcador.
 * O glifo do marcador vem do CSS (::before), nunca do texto — é o que
 * garante o alinhamento em 1,25 cm / 2,25 cm da matriz do perito.
 */
function LinhasDoBloco({ bloco }: { bloco: string }) {
  return (
    <>
      {linhasDoBloco(bloco).map((linha, indice) => {
        if (linha.tipo === 'item') return <p key={indice} className="item-lista">{linha.texto}</p>
        if (linha.tipo === 'item-sem-marcador') {
          return <p key={indice} className="item-lista-sem-marcador">{linha.texto}</p>
        }
        return <p key={indice}>{linha.texto}</p>
      })}
    </>
  )
}

function Paragrafos({ texto }: { texto?: string | null }) {
  const partes = emParagrafos(texto)
  if (!partes.length) return null
  return (
    <>
      {partes.map((parte, indice) => (
        <LinhasDoBloco key={indice} bloco={parte} />
      ))}
    </>
  )
}

/**
 * Transcrição literária de uma peça do processo — hoje, o risco que a parte
 * Reclamante alegou na inicial.
 *
 * Vai entre aspas e em itálico porque não é texto do perito: o laudo precisa
 * registrar o que foi alegado antes de examinar se procede, e o leitor tem de
 * distinguir as duas vozes sem depender do contexto.
 */
function Transcricao({ texto }: { texto?: string | null }) {
  const linhas = emParagrafos(texto)
    .flatMap((parte) => parte.split('\n'))
    .map((linha) => linha.trim())
    .filter(Boolean)
  if (!linhas.length) return null
  return (
    <>
      {linhas.map((linha, indice) => (
        <p key={indice} className="transcricao">
          {indice === 0 ? '\u201c' : ''}{linha}{indice === linhas.length - 1 ? '\u201d' : ''}
        </p>
      ))}
    </>
  )
}

/**
 * Valor de célula que pode ter mais de uma linha.
 *
 * O quadro conclusivo da NR-16 traz a lista dos anexos observados dentro de
 * uma célula só. Enquanto isto era `{linha.valor}` puro, o `\n` virava espaço e
 * a lista saía como parágrafo corrido — na tela, note-se, enquanto o PDF (que
 * já troca `\n` por `<br>`) saía certo. Divergência entre o que o perito
 * revisa e o que ele assina é exatamente o que não pode acontecer.
 */
function valorDeCelula(valor: string) {
  const linhas = valor.split('\n')
  if (linhas.length === 1) return valor
  return linhas.map((linha, indice) => <div key={indice}>{linha || '\u00a0'}</div>)
}

function ConteudoEstruturado({ texto }: { texto?: string | null }) {
  const partes = emParagrafos(texto)
  if (!partes.length) return null

  return (
    <>
      {partes.map((parte, indice) => {
        const titulo = parte.trim().match(/^([45]\.\d+(?:\.\d+)?\.)\s+([^\n]+)$/)
        if (!titulo) return <LinhasDoBloco key={indice} bloco={parte} />
        const prefixo = titulo[1] ?? ''
        const textoTitulo = titulo[2] ?? ''
        const nivel = prefixo.split('.').filter(Boolean).length
        return nivel >= 3
          ? <h4 key={indice}>{prefixo} {textoTitulo}</h4>
          : <h3 key={indice}>{prefixo} {textoTitulo}</h3>
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

  const fotosOrdenadas = fotosEmOrdemDeDocumento(pericia.fotos)
  const numeroDaFoto = new Map(fotosOrdenadas.map((foto, indice) => [foto.id, indice + 1]))
  const fotosDasSecoes = (secoes: SecaoFoto[]) => {
    const fotos = fotosOrdenadas.filter((foto) => secoes.includes(foto.secao))
    if (!fotos.length) return null

    return (
      <div className="fotos space-y-4">
        {fotos.map((foto) => {
          const legenda = foto.legenda?.trim() || 'Sem legenda'
          const legendaComFonte = /\bfonte\s*:/i.test(legenda)
            ? legenda
            : `${legenda} - Fonte: Ato pericial.`
          return <figure key={foto.id} className="break-inside-avoid text-center">
            <div className="flex items-center justify-center overflow-hidden border border-ink-300 bg-white p-2">
              {foto.url ? (
                // 11 cm é o teto do PDF (documento-html.ts, figure img) e do
                // DOCX (docx.ts, alturaMaxima). Os três precisam do mesmo teto,
                // senão a mesma foto quebra de página em lugar diferente em
                // cada saída.
                <img
                  src={foto.url}
                  alt={foto.legenda}
                  className="max-h-[11cm] max-w-full object-contain"
                />
              ) : (
                <span className="py-20 text-[9pt] text-ink-400">Imagem indisponível</span>
              )}
            </div>
            <figcaption className="mt-1 text-[9pt] italic text-ink-600">
              Fotografia {numeroDaFoto.get(foto.id)} – {legendaComFonte}
            </figcaption>
          </figure>
        })}
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
  let indiceGrupoAnalise = 0
  const numeroAnaliseNr15 = temInsalubridade ? `10.${++indiceGrupoAnalise}` : null
  const numeroAnaliseNr16 = temPericulosidade ? `10.${++indiceGrupoAnalise}` : null
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
          const identificado = agente.identificadoNaAtividade !== false
          return (
            <section key={agente.id} className="agente-bloco">
              {prefixo
                ? <h4>{prefixo}.{indice + 1}. {rotuloNatureza(agente.tipo)} — {apresentacao.titulo}</h4>
                : <h3>{apresentacao.titulo}</h3>}
              {identificado && <table className="agente-propriedades">
                <thead><tr><th>Propriedade</th><th>Informação</th></tr></thead>
                <tbody>
                  {apresentacao.linhas.map((linha) => (
                    <tr key={linha.rotulo}>
                      <th>{linha.rotulo}</th>
                      <td className={linha.destaque ? `resultado-${linha.destaque}` : ''}>{valorDeCelula(linha.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
              {agenteExibeConclusao(agente) && <><h4>Conclusão</h4><Paragrafos texto={agente.observacao} /></>}
            </section>
          )
        })}
      </div>
    ) : null

  const quadrosDeAnalise = (
    agentes: typeof t.agentes,
    prefixo: string | null,
    tituloGrupo: string,
  ) => prefixo && agentes.length ? (
    <section>
      <h3>{prefixo}. {tituloGrupo}</h3>
      <div className="space-y-4">
        {agentes.map((agente, indice) => {
          const apresentacao = montarApresentacaoAgente(agente)
          const identificado = agente.identificadoNaAtividade !== false
          const protecoesAssociadas = resumoProtecoesAssociadas(agente.epis)

          return (
            <section key={`analise-${agente.id}`} className="agente-bloco">
              <h4>{prefixo}.{indice + 1}. {apresentacao.titulo}</h4>
              {identificado && <table className="agente-propriedades">
                <thead><tr><th>Propriedade</th><th>Informação</th></tr></thead>
                <tbody>
                  {apresentacao.linhas.map((linha) => (
                    <tr key={linha.rotulo}>
                      <th>{linha.rotulo}</th>
                      <td className={linha.destaque ? `resultado-${linha.destaque}` : ''}>{valorDeCelula(linha.valor)}</td>
                    </tr>
                  ))}
                  {identificado && protecoesAssociadas && (
                    <tr>
                      <th>Proteções associadas</th>
                      <td>{valorDeCelula(protecoesAssociadas)}</td>
                    </tr>
                  )}
                </tbody>
              </table>}
              {agenteExibeConclusao(agente) && <><h4>Conclusão</h4><Paragrafos texto={agente.observacao} /></>}
            </section>
          )
        })}
      </div>
    </section>
  ) : null

  /**
   * Item 10 da NR-16: os sete anexos, na ordem deles, e o quadro de conclusão
   * em cada um que foi efetivamente avaliado.
   *
   * Diferente do item 7 (que levanta) e do quadro da NR-15 (que descreve): a
   * tabela daqui tem duas linhas — o que foi examinado e a que se concluiu.
   */
  const quadrosNr16DeAnalise = (prefixo: string | null) => prefixo && agentesNr16.length ? (
    <section>
      <h3>{prefixo}. NR-16 — Avaliação das Atividades e Operações Perigosas</h3>
      {quadrosNr16DoItem10(agentesNr16, prefixo).map((quadro, indice) => {
        const apresentacao = quadro.agente && quadro.agente.identificadoNaAtividade !== false
          ? montarApresentacaoAgente(quadro.agente, { conclusiva: true })
          : null
        const chave = `nr16-${quadro.numero}-${indice}`
        if (!apresentacao) return <h4 key={chave}>{quadro.numero}. {quadro.titulo}</h4>
        return (
          <section key={chave} className="agente-bloco">
            <h4>{quadro.numero}. {quadro.titulo}</h4>
            <table className="agente-propriedades">
              <tbody>
                {apresentacao.linhas.map((linha) => (
                  <tr key={linha.rotulo}>
                    <th>{linha.rotulo}</th>
                    <td className={linha.destaque ? `resultado-${linha.destaque}` : ''}>{valorDeCelula(linha.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </section>
  ) : null

  // A seção de EPIs precisa enxergar exatamente os mesmos agentes que o resto
  // do documento. Enquanto varria a lista inteira, uma perícia só de
  // periculosidade imprimia aqui os EPIs de agentes NR-15 herdados do
  // cadastro — agentes que nenhum outro item do laudo mencionava, porque a
  // modalidade já os tinha excluído. Ficavam proteções órfãs, atribuídas a
  // um agente que o leitor não encontrava em lugar nenhum.
  const protecoes = t.agentes.filter((agente) =>
    agente.identificadoNaAtividade !== false
    && (agente.tipo === 'periculosidade' ? temPericulosidade : temInsalubridade),
  ).flatMap((agente) => {
    const apresentacao = montarApresentacaoAgente(agente)
    return apresentacao.protecoes.length ? [{ agente, apresentacao }] : []
  })
  let numeroProtecao = 1
  const protecoesNumeradas = protecoes.map(({ agente, apresentacao }) => ({
    agente,
    apresentacao: {
      ...apresentacao,
      protecoes: apresentacao.protecoes.map((protecao) => ({
        ...protecao,
        titulo: /^Proteção \d+$/.test(protecao.titulo)
          ? `Proteção ${numeroProtecao++}`
          : protecao.titulo,
      })),
    },
  }))

  return (
    <article className="doc-sheet mx-auto w-full max-w-[820px] bg-white px-10 py-12 shadow-card print-area sm:px-14">
      <header className="marca-oficial mb-8 border-b-2 border-[#007a3d] pb-5 text-center">
        <Logo size="lg" className="mx-auto" perito={perito} />
        {perito && (
          <p className="no-indent mt-2 text-center text-[8.5pt] text-ink-500">
            {perito.nome}{perito.titulo ? ` — ${perito.titulo}` : ''}
            {perito.registroProfissional ? ` · ${perito.registroProfissional}` : ''}
          </p>
        )}
      </header>
      <p className="no-indent font-bold uppercase mb-[34px]">
        {`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA ${[pericia.vara, pericia.comarca]
          .filter(Boolean)
          .join(' — ')}`.toUpperCase()}
      </p>

      <h3 className="mt-0 mb-2">IDENTIFICAÇÃO DAS PARTES</h3>
      <table className="ficha-processual">
        <tbody>
          <tr>
            <th>Processo nº</th>
            <td>{pericia.numeroProcesso}</td>
          </tr>
          <tr>
            <th>Reclamante</th>
            <td>
              {pericia.reclamante}
              {pericia.cpfReclamante ? ` — CPF: ${maskCPF(pericia.cpfReclamante)}` : ''}
            </td>
          </tr>
          <tr>
            <th>Reclamada</th>
            <td>
              {empresaPrincipal
                ? `${empresaPrincipal.razaoSocial} — CNPJ ${maskCNPJ(empresaPrincipal.cnpj)}`
                : '—'}
            </td>
          </tr>
          {outras.map((e) => (
            <tr key={e.id}>
              <th>Reclamada</th>
              <td>
                {e.razaoSocial} — CNPJ {maskCNPJ(e.cnpj)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h1>{titulo}</h1>
      <h3 className="mt-0 mb-2">APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA</h3>
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
                {participanteAusente(participante) ? (
                  <td colSpan={3}>{TEXTO_AUSENCIA_RECLAMANTE}</td>
                ) : <>
                  <td>{participante.nome}</td>
                  <td>{qualificacaoParticipante(
                    participante,
                    participante.empresaId ? empresasPorId.get(participante.empresaId)?.razaoSocial : undefined,
                  )}</td>
                  <td>{dadosPapel(participante.papel).atuacao}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Título de nível 1 sem texto próprio: o 3.1 sobe colado no 3 (pedido
          do perito). `t.descricaoEmpresa` continua no modelo por causa das
          perícias já gravadas, mas não aparece mais em nenhum renderizador. */}
      <h2>3. Descrição das Instalações da Reclamada</h2>
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
      <h3>7.1. Atividades Efetivamente Exercidas</h3>
      <Paragrafos texto={t.atividadesFuncoes} />
      {t.periodos.length > 0 && (
        <table>
          <tbody>
            {t.periodos.map((periodo) => (
              <Fragment key={periodo.id}>
                <tr>
                  <th className="w-[34%]">Função: {periodo.funcao}</th>
                  <th className="w-[28%]">Setor: {periodo.setor || '—'}</th>
                  <th>Período: {formatDate(periodo.inicio)} a {periodo.fim ? formatDate(periodo.fim) : 'atual'}</th>
                </tr>
                <tr>
                  <td colSpan={3}>
                    <strong>Atividades</strong>
                    {atividadesDoPeriodo(periodo.descricaoAtividades).length ? (
                      <ul className="ml-6 mt-1 list-disc">
                        {atividadesDoPeriodo(periodo.descricaoAtividades).map((atividade) => (
                          <li key={atividade}>{atividade}</li>
                        ))}
                      </ul>
                    ) : <div>—</div>}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      {temInsalubridade && <><h3>{numeroAvaliacaoNr15}. NR-15 — Avaliação da Exposição Ocupacional</h3>{agentesSemProtecoes(agentesNr15, numeroAvaliacaoNr15 ?? undefined)}</>}
      {temPericulosidade && <>
        <h3>{numeroAvaliacaoNr16}. NR-16 — Avaliação das Atividades e Operações Perigosas</h3>
        <h4>{numeroAvaliacaoNr16}.1. Critério de Avaliação</h4>
        <Paragrafos texto={t.criterioAvaliacaoPericulosidade} />
        {t.riscoAlegadoPericulosidade?.trim() && <>
          <h4>{numeroAvaliacaoNr16}.2. Risco de Periculosidade Alegado pela Parte Reclamante</h4>
          <Transcricao texto={t.riscoAlegadoPericulosidade} />
          {t.fonteRiscoAlegado?.trim() && (
            <p className="no-indent fonte-transcricao">Fonte: {t.fonteRiscoAlegado.trim()}</p>
          )}
        </>}
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
      {protecoesNumeradas.length ? protecoesNumeradas.map(({ agente, apresentacao }) => (
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
      {quadrosDeAnalise(agentesNr15, numeroAnaliseNr15, 'NR-15 — Avaliação da Exposição Ocupacional')}
      {quadrosNr16DeAnalise(numeroAnaliseNr16)}

      {numeroConclusaoNr15 && <><h2>{numeroConclusaoNr15}. NR-15 — Conclusão e Fundamentação</h2><Paragrafos texto={conclusaoNr15} /></>}
      {numeroConclusaoNr16 && <><h2>{numeroConclusaoNr16}. NR-16 — Conclusão e Fundamentação</h2><Paragrafos texto={conclusaoNr16} /></>}
      {numeroQuesitos && <><h2>{numeroQuesitos}. Respostas aos Quesitos Técnicos</h2><Paragrafos texto={t.respostasQuesitos} /></>}

      <h2>{numeroEncerramento}. Encerramento</h2>
      <Paragrafos texto={encerramento} />
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
