import type { DocumentoGerado, Empresa, Usuario } from '@prisma/client'
import type { PericiaCompleta } from '../mappers.js'
import { comoDataUri } from './armazenamento.js'
import {
  AGENTE_LABEL,
  type ConteudoEsclarecimento,
  type ConteudoManifestacao,
  type ConteudoQuesitos,
  MARCA,
  ORIGEM_PONTO,
  PAPEL,
  type TecnicoJson,
  VAZIO,
  css,
  data,
  emParagrafos,
  extenso,
  intervaloDoPeriodo,
  mascaraCnpj,
  montarApresentacaoAgente,
  motivoDoPeriodo,
  numeradorDeSecoes,
  periodoAvaliacaoDocumento,
  hoje,
  ATUACAO,
} from './documento-comum.js'

// ============================================================
// MÓDULO H — Montagem automática do documento (lado servidor).
//
// Reproduz src/components/DocumentoPreview.tsx e as folhas dos
// módulos K e L. O HTML daqui é o que o Puppeteer imprime, então
// ele — e não o navegador do perito — é a fonte de verdade do PDF:
// um documento do histórico pode ser reimpresso anos depois sem
// nenhuma tela aberta.
// ============================================================

/** Escapa tudo que vem do banco — nada de HTML do usuário no PDF. */
function esc(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function paragrafos(texto?: string | null): string {
  const partes = emParagrafos(texto)
  if (!partes.length) return `<p class="vazio">${VAZIO}</p>`
  return partes.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
}

const blocoConteudo = (conteudo: string): string => `<div class="bloco-conteudo">${conteudo}</div>`

const linha = (rotulo: string, valor: string): string =>
  `<tr><th>${esc(rotulo)}</th><td>${valor}</td></tr>`

// ---------------- moldura ----------------

const CSS = `
  @page { size: A4; margin: 2.5cm 2cm 2cm 3cm; }
  :root {
    --documento-titulo: ${css(MARCA.documentoTitulo)};
    --documento-secao: ${css(MARCA.documentoSecao)};
    --documento-texto: ${css(MARCA.documentoTexto)};
    --documento-borda: ${css(MARCA.documentoBorda)};
    --documento-fundo: ${css(MARCA.documentoFundo)};
    --documento-tabela: ${css(MARCA.documentoTabela)};
  }
  * { box-sizing: border-box; }
  /* Fixa o esquema claro: sem isto, um servidor com preferência
     dark faz o Chromium imprimir o documento com fundo escuro. */
  html { color-scheme: light; background: #ffffff; }
  body {
    margin: 0;
    background: #ffffff;
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: var(--documento-texto);
    text-align: justify;
  }
  header.marca {
    text-align: center;
    border-bottom: 2px solid ${css(MARCA.primaria)};
    padding-bottom: 14px;
    margin-bottom: 32px;
  }
  .logo { font-family: Arial, sans-serif; font-weight: 800; font-size: 32pt; letter-spacing: -1px; line-height: 1; }
  .logo .primaria { color: ${css(MARCA.primaria)}; }
  .logo .neutra { color: ${css(MARCA.tinta900)}; }
  .regua {
    font-family: Arial, sans-serif;
    font-size: 8pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.42em; color: ${css(MARCA.primaria)}; margin-top: 2px;
  }
  .tagline {
    font-family: Arial, sans-serif;
    font-size: 8pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.2em; color: ${css(MARCA.credencial)}; margin-top: 10px;
  }
  .perito-cabecalho { font-size: 8.5pt; color: ${css(MARCA.tinta500)}; margin-top: 6px; }
  h1 {
    color: var(--documento-titulo);
    font-size: 18pt;
    font-weight: 700;
    text-align: left;
    margin: 0 0 12px;
    padding: 0 0 6px;
    border-bottom: 2px solid var(--documento-titulo);
  }
  h2 { color: var(--documento-secao); font-size: 14pt; font-weight: 700; text-align: left; margin: 16px 0 7px; page-break-after: avoid; }
  h3 { color: var(--documento-secao); font-size: 11pt; font-weight: 700; text-align: left; margin: 12px 0 4px; page-break-after: avoid; }
  h4 { font-size: 10pt; font-weight: 700; margin: 10px 0 4px; page-break-after: avoid; }
  p { margin: 0 0 8px; text-indent: 1.25cm; }
  p.sem-recuo { text-indent: 0; }
  p.vazio { font-style: italic; color: ${css(MARCA.tinta400)}; text-indent: 0; }
  .nota { font-size: 8.5pt; color: ${css(MARCA.tinta500)}; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; page-break-inside: avoid; }
  th, td { border: 1px solid var(--documento-borda); padding: 6px 9px; vertical-align: top; text-align: left; text-indent: 0; }
  th { background: var(--documento-tabela); color: var(--documento-titulo); font-weight: 700; }
  td { background: var(--documento-fundo); }
  .box { font-size: 11pt; }
  /* Sem caixa: o texto corre em parágrafos justificados, como uma peça
     técnica padrão. A classe segue existindo só para agrupar o conteúdo. */
  .bloco-conteudo { margin: 0 0 8px; }
  .agente-bloco { page-break-inside: auto; break-inside: auto; margin: 0 0 16px; }
  .agente-resumo { page-break-inside: avoid; break-inside: avoid; }
  .agente-bloco h3 { margin: 12px 0 6px; padding: 0 0 4px; color: var(--documento-titulo); border-bottom: 1px solid var(--documento-borda); page-break-after: avoid; break-after: avoid; }
  .parecer-manual .agente-bloco h3.agente-titulo { color: var(--documento-titulo); }
  .agente-bloco table { margin: 0; page-break-inside: avoid; }
  .agente-bloco th { width: 32%; }
  .protecao-bloco { margin: 10px 0 0; }
  /* Sem verde/vermelho/âmbar: o resultado se destaca só pelo negrito. */
  .resultado-positivo,
  .resultado-negativo,
  .resultado-aviso { font-weight: 700; }
  .parecer-manual h1 { color: var(--documento-titulo); text-align: center; }
  .parecer-manual h2,
  .parecer-manual h3 { color: var(--documento-titulo); }
  .parecer-manual .enderecamento-judicial { margin: 0 0 34px; font-weight: 700; }
  .parecer-manual .ficha-processual { margin: 0 0 34px; }
  .parecer-manual .ficha-processual th { width: 25%; background: transparent; }
  .parecer-manual .titulo-qualificacao {
    margin: 0 0 8px;
    color: var(--documento-secao);
    font-size: 11pt;
    font-weight: 700;
    text-transform: none;
  }
  .fotos { display: block; margin-bottom: 14px; }
  figure { margin: 0 0 18px; text-align: center; page-break-inside: avoid; break-inside: avoid; }
  figure img {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 11cm;
    object-fit: contain;
    border: 1px solid ${css(MARCA.tinta300)};
    display: block;
    margin: 0 auto;
  }
  figcaption { font-size: 9pt; font-style: italic; color: ${css(MARCA.tinta600)}; margin-top: 4px; }
  .local-data { text-align: center; text-indent: 0; margin-top: 20px; }
  .assinatura { margin-top: 24px; margin-bottom: 12px; text-align: center; page-break-inside: avoid; }
  .assinatura .traco { width: 280px; margin: 0 auto; border-top: 1px solid ${css(MARCA.tinta800)}; padding-top: 6px; }
  .assinatura p { text-indent: 0; margin: 0; }
  .assinatura .nome { font-weight: 700; }
  .assinatura .dado { font-size: 10pt; }
`

function moldura(
  titulo: string,
  perito: Usuario | null,
  corpo: string,
  opcoes: { comMarca?: boolean; classeCorpo?: string } = {},
): string {
  const credencial = perito
    ? `<p class="perito-cabecalho">${esc(perito.nome)}${perito.titulo ? ` — ${esc(perito.titulo)}` : ''}${
        perito.registroProfissional ? ` · ${esc(perito.registroProfissional)}` : ''
      }</p>`
    : ''

  const comMarca = opcoes.comMarca === true
  const cabecalho = comMarca
    ? `<header class="marca">
    <div class="logo"><span class="primaria">D</span><span class="neutra">&amp;</span><span class="primaria">R</span></div>
    <div class="regua">— Perícia —</div>
    <div class="tagline">Plataforma Inteligente de Perícia Trabalhista</div>
    ${credencial}
  </header>`
    : ''
  const classe = opcoes.classeCorpo ? ` class="${opcoes.classeCorpo}"` : ''

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS}</style></head>
<body>
  ${cabecalho}
  <main${classe}>${corpo}</main>
</body></html>`
}

function assinatura(perito: Usuario | null, comarca?: string | null): string {
  return `
  <p class="local-data">${esc(comarca || 'São Paulo/SP')}, ${extenso(hoje())}.</p>
  <div class="assinatura">
    <div class="traco">
      <p class="nome">${esc(perito?.nome ?? '—')}</p>
      <p class="dado">${esc(perito?.titulo ?? '')}</p>
      <p class="dado">${esc(perito?.registroProfissional ?? '')}</p>
    </div>
  </div>`
}

function enderecamento(vara?: string | null): string {
  return `
  <p class="sem-recuo"><strong>EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO</strong></p>
  <p class="sem-recuo"><strong>${esc((vara ?? '').toUpperCase())}</strong></p>`
}

function enderecamentoDoParecer(
  vara?: string | null,
  comarca?: string | null,
  personalizado?: string | null,
): string {
  const linhas = emParagrafos(personalizado)
  if (linhas.length) {
    return linhas
      .map((texto) => `<p class="sem-recuo enderecamento-judicial">${esc(texto).replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  const destino = [vara, comarca].filter(Boolean).join(' — ')
  return `<p class="sem-recuo enderecamento-judicial">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA ${esc(destino.toUpperCase())}</p>`
}

// ---------------- parecer / laudo ----------------

export async function htmlDoParecer(
  pericia: PericiaCompleta,
  empresas: Empresa[],
  perito: Usuario | null,
  titulo: string,
): Promise<string> {
  const t = pericia.tecnico as unknown as TecnicoJson

  const porId = new Map(empresas.map((e) => [e.id, e]))
  const principal = porId.get(pericia.reclamadas.find((r) => r.principal)?.empresaId ?? '')
  const solidarias = pericia.reclamadas
    .filter((r) => !r.principal)
    .map((r) => porId.get(r.empresaId))
    .filter((e): e is Empresa => Boolean(e))

  const identificacao = `
  <table class="ficha-processual"><tbody>
    ${linha('Processo nº', esc(pericia.numeroProcesso))}
    ${linha('Reclamante', `${esc(pericia.reclamante)}${pericia.funcaoReclamante ? ` — ${esc(pericia.funcaoReclamante)}` : ''}`)}
    ${linha('Reclamada', principal ? `${esc(principal.razaoSocial)} — CNPJ ${esc(mascaraCnpj(principal.cnpj))}` : '—')}
    ${solidarias.map((e) => linha('Reclamada', `${esc(e.razaoSocial)} — CNPJ ${esc(mascaraCnpj(e.cnpj))}`)).join('')}
  </tbody></table>`

  // O período avaliado só entra quando a data de ajuizamento existe:
  // sem ela a conta dos cinco anos não fecha, e uma janela chutada no
  // laudo é pior do que janela nenhuma.
  const periodo = periodoAvaliacaoDocumento(pericia)

  const dadosContratuais = `
  <table><tbody>
    ${linha('Função / Cargo', esc(pericia.funcaoReclamante || '—'))}
    ${linha('Data de admissão', data(pericia.admissao))}
    ${linha('Data de desligamento', pericia.demissao ? data(pericia.demissao) : 'Contrato vigente')}
    ${pericia.dataAjuizamento ? linha('Ajuizamento da ação', data(pericia.dataAjuizamento)) : ''}
    ${periodo ? linha('Período avaliado', `${esc(intervaloDoPeriodo(periodo))}<br><span class="nota">${esc(motivoDoPeriodo(periodo, pericia.dataAjuizamento))}</span>`) : ''}
  </tbody></table>`

  const tabelaParticipantes = pericia.participantes.length
    ? `<table>
        <thead><tr><th>Nome do Participante</th><th style="width:32%">Qualificação / Representação</th><th style="width:38%">Atuação no Ato</th></tr></thead>
        <tbody>${pericia.participantes
          .map(
            (p) =>
              `<tr><td>${esc(p.nome)}</td><td>${esc(PAPEL[p.papel] ?? p.papel)}</td><td>${esc(ATUACAO[p.papel] ?? '—')}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
    : ''

  const textoVistoria = `<p>A vistoria técnica foi realizada em ${extenso(pericia.dataVistoria)}${
    pericia.horaVistoria ? `, às ${esc(pericia.horaVistoria)}` : ''
  }, no endereço ${esc(pericia.localVistoria || '—')}, com a presença dos participantes abaixo relacionados.</p>`

  const tabelaPeriodos = t.periodos?.length
    ? `<table>
        <thead><tr><th style="width:28%">Função</th><th style="width:18%">Setor</th><th style="width:24%">Período</th><th>Atividades</th></tr></thead>
        <tbody>${t.periodos
          .map(
            (p) =>
              `<tr><td>${esc(p.funcao)}</td><td>${esc(p.setor || '—')}</td><td>${data(p.inicio)} a ${
                p.fim ? data(p.fim) : 'atual'
              }</td><td>${esc(p.descricaoAtividades || '—')}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
    : ''

  const tabelaLinhasAgente = (linhas: ReturnType<typeof montarApresentacaoAgente>['linhas'], cabecalho = false) =>
    `<table>${cabecalho ? '<thead><tr><th>Propriedade</th><th>Informação</th></tr></thead>' : ''}<tbody>${linhas
      .map((item) => `<tr><th>${esc(item.rotulo)}</th><td${item.destaque ? ` class="resultado-${item.destaque}"` : ''}>${esc(item.valor).replace(/\n/g, '<br>')}</td></tr>`)
      .join('')}</tbody></table>`

  const agentes = t.agentes ?? []
  const agentesNr15 = agentes.filter((agente) => agente.tipo !== 'periculosidade')
  const agentesNr16 = agentes.filter((agente) => agente.tipo === 'periculosidade')
  const temInsalubridade = pericia.modalidade !== 'periculosidade'
  const temPericulosidade = pericia.modalidade !== 'insalubridade'

  const tabelaAgentes = (lista: typeof agentes) => lista.length
    ? lista.map((agente) => {
        const apresentacao = montarApresentacaoAgente(agente)
        return `<section class="agente-bloco"><div class="agente-resumo"><h3 class="agente-titulo">${esc(apresentacao.titulo)}</h3>${tabelaLinhasAgente(apresentacao.linhas, true)}</div></section>`
      }).join('')
    : '<p class="vazio">[Nenhum agente cadastrado]</p>'

  const blocoProtecoes = agentes.flatMap((agente) => {
    const apresentacao = montarApresentacaoAgente(agente)
    if (!apresentacao.protecoes.length) return []
    return [
      `<section class="agente-bloco"><h3 class="agente-titulo">${esc(apresentacao.titulo)}</h3>${apresentacao.protecoes
        .map((protecao) =>
          `<div class="protecao-bloco"><h4>${esc(protecao.titulo)}</h4>${tabelaLinhasAgente(protecao.linhas)}</div>`,
        )
        .join('')}</section>`,
    ]
  }).join('') || '<p class="vazio">[Nenhum EPI associado aos agentes]</p>'

  // Fotos viram data URI: o Chromium roda com a rede bloqueada.
  const fotosOrdenadas = [...pericia.fotos].sort((a, b) => a.ordem - b.ordem)
  const numeroDaFoto = new Map(fotosOrdenadas.map((foto, indice) => [foto.id, indice + 1]))
  const fotosDasSecoes = async (secoes: string[]) => {
    const fotos = fotosOrdenadas.filter((foto) => secoes.includes(foto.secao))
    if (!fotos.length) return ''
    const figuras = await Promise.all(
      fotos.map(async (f) => {
          const numeroAtual = numeroDaFoto.get(f.id)
          const uri = await comoDataUri(f.arquivo)
          const img = uri
            ? `<img src="${uri}" alt="${esc(f.legenda)}">`
            : `<div style="height:180px;border:1px solid ${css(MARCA.tinta300)};display:flex;align-items:center;justify-content:center;font-size:9pt;color:${css(MARCA.tinta400)}">imagem indisponível</div>`
          return `<figure>${img}<figcaption>Figura ${numeroAtual} — ${esc(f.legenda || 'sem legenda')}</figcaption></figure>`
      }),
    )
    return `<div class="fotos">${figuras.join('')}</div>`
  }

  const fotosAmbiente = await fotosDasSecoes(['ambiente'])
  const fotosAtividades = await fotosDasSecoes(['atividades'])
  const fotosEquipamentos = await fotosDasSecoes(['equipamentos'])
  const fotosProdutos = await fotosDasSecoes(['produtos'])
  const fotosDocumentos = await fotosDasSecoes(['documentos'])
  const fotosEpis = await fotosDasSecoes(['epi'])
  const conclusaoNr15 =
    t.conclusaoInsalubridade?.trim() ||
    (pericia.modalidade === 'insalubridade' || !t.conclusaoPericulosidade?.trim() ? t.conclusao : '')
  const conclusaoNr16 =
    t.conclusaoPericulosidade?.trim() || (pericia.modalidade === 'periculosidade' ? t.conclusao : '')
  const encerramento = t.encerramento?.trim() || t.observacoesAdicionais

  // Numeração contada, não escrita à mão: as seções finais são
  // condicionais e o documento não pode pular de "11." para "13.".
  const num = numeradorDeSecoes()

  const partes: string[] = [
    enderecamentoDoParecer(pericia.vara, pericia.comarca, t.enderecamento),
    identificacao,
    `<h1>${esc(titulo)}</h1>`,
    '<h3 class="titulo-qualificacao">APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA</h3>',
    blocoConteudo(paragrafos(t.apresentacao)),
    `<h2>${num.secao('OBJETO DA PERÍCIA E DADOS CONTRATUAIS')}</h2>`,
    blocoConteudo(paragrafos(t.objetivoPericia) + dadosContratuais),
    `<h2>${num.secao('DA DILIGÊNCIA TÉCNICA PERICIAL')}</h2>`,
    blocoConteudo(textoVistoria + tabelaParticipantes),
    `<h2>${num.secao('DESCRIÇÃO DAS INSTALAÇÕES DA RECLAMADA')}</h2>`,
    blocoConteudo(
      paragrafos(t.descricaoEmpresa) +
        `<h3>${num.sub('Instalações Físicas')}</h3>` +
        paragrafos(t.descricaoAmbiente) +
        fotosAmbiente,
    ),
    `<h2>${num.secao('CRITÉRIOS TÉCNICOS PARA AVALIAÇÃO PERICIAL')}</h2>`,
    blocoConteudo(paragrafos(t.normasReferencias)),
    `<h2>${num.secao('METODOLOGIA DE AVALIAÇÃO')}</h2>`,
    blocoConteudo(paragrafos(t.equipamentosAnalisados)),
    `<h2>${num.secao('DESCRIÇÃO DO POSTO DE TRABALHO, MÁQUINAS, FERRAMENTAS E PRODUTOS')}</h2>`,
    blocoConteudo(
      `<h3>${num.sub('Características do Posto de Trabalho')}</h3>` +
        paragrafos(t.descricaoPostoTrabalho || t.descricaoAmbiente) +
        fotosAtividades +
        `<h3>${num.sub('Máquinas, Ferramentas e Equipamentos Utilizados')}</h3>` +
        paragrafos(t.maquinasFerramentas) +
        fotosEquipamentos +
        `<h3>${num.sub('Constatações da Vistoria Pericial')}</h3>` +
        paragrafos(t.informacoesLevantadas) +
        `<h3>${num.sub('Produtos Utilizados Habitualmente nas Atividades')}</h3>` +
        paragrafos(t.produtosUtilizados) +
        fotosProdutos,
    ),
    `<h2>${num.secao('HISTÓRICO LABORAL, PERÍODOS E ATIVIDADES HABITUAIS EXERCIDAS')}</h2>`,
    blocoConteudo(
      tabelaPeriodos +
        `<h3>${num.sub('Atividades Efetivamente Exercidas')}</h3>` +
        paragrafos(t.atividadesFuncoes) +
        (temInsalubridade
          ? `<h3>${num.sub('NR-15 — Avaliação da Exposição Ocupacional')}</h3>` + tabelaAgentes(agentesNr15)
          : '') +
        (temPericulosidade
          ? `<h3>${num.sub('NR-16 — Avaliação das Atividades e Operações Perigosas')}</h3>` +
            tabelaAgentes(agentesNr16)
          : '') +
        (t.divergenciasFaticas?.trim()
          ? `<h3>${num.sub('Divergências Fáticas')}</h3>` + paragrafos(t.divergenciasFaticas)
          : '') +
        fotosDocumentos,
    ),
    `<h2>${num.secao('DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (NR-06)')}</h2>`,
    blocoConteudo(blocoProtecoes + fotosEpis),
    `<h2>${num.secao('DAS PROTEÇÕES COLETIVAS')}</h2>`,
    blocoConteudo(paragrafos(t.protecoesColetivas)),
    `<h2>${num.secao('ANÁLISE TÉCNICA DOS AGENTES IDENTIFICADOS')}</h2>`,
    blocoConteudo(paragrafos(t.analiseTecnica)),
  ]

  if (temInsalubridade) partes.push(`<h2>${num.secao('NR-15 — CONCLUSÃO E FUNDAMENTAÇÃO')}</h2>`, blocoConteudo(paragrafos(conclusaoNr15)))
  if (temPericulosidade) partes.push(`<h2>${num.secao('NR-16 — CONCLUSÃO E FUNDAMENTAÇÃO')}</h2>`, blocoConteudo(paragrafos(conclusaoNr16)))
  if (t.respostasQuesitos?.trim()) partes.push(`<h2>${num.secao('RESPOSTAS AOS QUESITOS TÉCNICOS')}</h2>`, blocoConteudo(paragrafos(t.respostasQuesitos)))

  partes.push(
    `<h2>${num.secao('ENCERRAMENTO')}</h2>`,
    blocoConteudo(paragrafos(encerramento)),
    '<p class="sem-recuo" style="margin-top:24px">Sendo o que se apresenta para o momento, o signatário coloca-se à disposição deste MM. Juízo para os esclarecimentos que se fizerem necessários.</p>',
    assinatura(perito, pericia.comarca),
  )

  return moldura(titulo, perito, partes.join('\n'), {
    comMarca: false,
    classeCorpo: 'parecer-manual',
  })
}

// ---------------- quesitos (Módulo K) ----------------

function htmlDosQuesitos(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
): string {
  const conteudo = (doc.conteudo ?? {}) as ConteudoQuesitos
  const itens = conteudo.quesitos ?? []

  const identificacao = pericia
    ? `<table><tbody>
        ${linha('Processo nº', esc(pericia.numeroProcesso))}
        ${linha('Vara', esc(pericia.vara))}
        ${linha('Reclamante', esc(pericia.reclamante))}
        ${linha('Reclamada', esc(empresa?.razaoSocial ?? '—'))}
      </tbody></table>`
    : ''

  const lista = itens.length
    ? itens
        .map(
          (q, i) => `
          <section class="bloco-conteudo">
            <p class="sem-recuo"><strong>${i + 1}. ${esc(q.pergunta)}</strong></p>
            <p><strong>Resposta: </strong>${esc(q.resposta || '[resposta não preenchida]')}</p>
          </section>`,
        )
        .join('')
    : '<p class="vazio">[Nenhum quesito respondido]</p>'

  return moldura(
    doc.titulo,
    perito,
    `<h1>Quesitos Técnicos</h1>
     ${identificacao}
     <h2>Quesitos e Respostas</h2>
     ${lista}
     ${assinatura(perito, pericia?.comarca)}`,
  )
}

// ---------------- manifestação / impugnação (Módulo L) ----------------

function htmlDaManifestacao(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
): string {
  const c = (doc.conteudo ?? {}) as ConteudoManifestacao
  const ehConcordancia = c.posicionamento === 'concordancia'

  const identificacao = pericia
    ? `${enderecamento(pericia.vara)}
       <table><tbody>
         ${linha('Processo nº', esc(pericia.numeroProcesso))}
         ${linha('Reclamante', esc(pericia.reclamante))}
         ${linha('Reclamada', esc(empresa?.razaoSocial ?? '—'))}
         ${linha('Agente objeto', esc(AGENTE_LABEL[c.agente ?? ''] ?? c.agente ?? '—'))}
       </tbody></table>`
    : ''

  const argumentos = c.blocos?.length
    ? c.blocos
        .map((b, i) => blocoConteudo(`<h3>${i + 1}. ${esc(b.titulo)}</h3>${paragrafos(b.conteudo)}`))
        .join('')
    : '<p class="vazio">[Nenhum argumento selecionado]</p>'

  return moldura(
    doc.titulo,
    perito,
    `<h1>${esc(doc.titulo)}</h1>
     ${identificacao}
     <h2>I — Fundamentação Técnica</h2>
     ${blocoConteudo(paragrafos(c.fundamentacao))}
     <h2>II — ${ehConcordancia ? 'Razões da Concordância' : 'Razões da Impugnação'}</h2>
     ${argumentos}
     <h2>III — Requerimento</h2>
     ${blocoConteudo(paragrafos(c.encerramento))}
     ${assinatura(perito, pericia?.comarca)}`,
  )
}

// ---------------- esclarecimentos ----------------

function htmlDoEsclarecimento(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresa: Empresa | null,
  perito: Usuario | null,
): string {
  const c = (doc.conteudo ?? {}) as ConteudoEsclarecimento

  const identificacao = pericia
    ? `${enderecamento(pericia.vara)}
       <table><tbody>
         ${linha('Processo nº', esc(pericia.numeroProcesso))}
         ${linha('Reclamante', esc(pericia.reclamante))}
         ${linha('Reclamada', esc(empresa?.razaoSocial ?? '—'))}
         ${linha('Agente objeto', esc(AGENTE_LABEL[c.agente ?? ''] ?? c.agente ?? '—'))}
         ${c.referencia ? linha('Referência', esc(c.referencia)) : ''}
       </tbody></table>`
    : ''

  const pontos = c.pontos?.length
    ? c.pontos
        .map(
          (p, i) => `
          <section class="bloco-conteudo"><h3>${i + 1}. Questionamento ${esc(ORIGEM_PONTO[p.origem] ?? p.origem)}</h3>
          <p style="font-style:italic">${esc(p.questionamento || '[questionamento não informado]')}</p>
          <p><strong>Esclarecimento: </strong>${esc(p.resposta || '[esclarecimento não preenchido]')}</p></section>`,
        )
        .join('')
    : '<p class="vazio">[Nenhum ponto informado]</p>'

  return moldura(
    doc.titulo,
    perito,
    `<h1>Esclarecimentos Técnicos</h1>
     ${identificacao}
     <h2>I — Da Intimação</h2>
     ${blocoConteudo(paragrafos(c.introducao))}
     <h2>II — Dos Esclarecimentos Prestados</h2>
     ${pontos}
     <h2>III — Conclusão</h2>
     ${blocoConteudo(paragrafos(c.conclusao))}
     ${assinatura(perito, pericia?.comarca)}`,
  )
}

// ---------------- despacho por tipo ----------------

export async function montarHtml(
  doc: DocumentoGerado,
  pericia: PericiaCompleta | null,
  empresas: Empresa[],
  perito: Usuario | null,
): Promise<string> {
  const principal =
    empresas.find((e) => e.id === pericia?.reclamadas.find((r) => r.principal)?.empresaId) ?? null

  switch (doc.tipo) {
    case 'parecer':
    case 'laudo':
      if (!pericia) {
        return moldura(
          doc.titulo,
          perito,
          `<h1>${esc(doc.titulo)}</h1><p class="vazio">[A perícia vinculada a este documento não existe mais.]</p>`,
        )
      }
      return htmlDoParecer(pericia, empresas, perito, doc.titulo)

    case 'quesitos':
      return htmlDosQuesitos(doc, pericia, principal, perito)

    case 'manifestacao':
    case 'impugnacao':
      return htmlDaManifestacao(doc, pericia, principal, perito)

    case 'esclarecimento':
      return htmlDoEsclarecimento(doc, pericia, principal, perito)
  }
}
