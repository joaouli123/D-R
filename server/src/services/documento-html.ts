import type { DocumentoGerado, Empresa, Usuario } from '@prisma/client'
import type { PericiaCompleta } from '../mappers.js'
import { comoDataUri } from './armazenamento.js'
import {
  AGENTE_LABEL,
  type ConteudoEsclarecimento,
  type ConteudoManifestacao,
  type ConteudoQuesitos,
  CRITERIO,
  GRAU,
  MARCA,
  MODALIDADE_LABEL,
  ORIGEM_PONTO,
  PAPEL,
  SECAO_FOTO,
  type TecnicoJson,
  VAZIO,
  css,
  data,
  emParagrafos,
  extenso,
  hoje,
  limiteComUnidade,
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

const linha = (rotulo: string, valor: string): string =>
  `<tr><th>${esc(rotulo)}</th><td>${valor}</td></tr>`

// ---------------- moldura ----------------

const CSS = `
  @page { size: A4; margin: 2.5cm 2cm 2cm 3cm; }
  * { box-sizing: border-box; }
  /* Fixa o esquema claro: sem isto, um servidor com preferência
     dark faz o Chromium imprimir o documento com fundo escuro. */
  html { color-scheme: light; background: #ffffff; }
  body {
    margin: 0;
    background: #ffffff;
    font-family: "Liberation Serif", Georgia, "Times New Roman", serif;
    font-size: 11.5pt;
    line-height: 1.6;
    color: ${css(MARCA.tinta900)};
    text-align: justify;
  }
  header.marca {
    text-align: center;
    border-bottom: 2px solid ${css(MARCA.primaria)};
    padding-bottom: 14px;
    margin-bottom: 32px;
  }
  .logo { font-family: Inter, Arial, sans-serif; font-weight: 800; font-size: 32pt; letter-spacing: -1px; line-height: 1; }
  .logo .primaria { color: ${css(MARCA.primaria)}; }
  .logo .neutra { color: ${css(MARCA.tinta900)}; }
  .regua {
    font-family: Inter, Arial, sans-serif;
    font-size: 8pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.42em; color: ${css(MARCA.primaria)}; margin-top: 2px;
  }
  .tagline {
    font-family: Inter, Arial, sans-serif;
    font-size: 8pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.2em; color: ${css(MARCA.credencial)}; margin-top: 10px;
  }
  .perito-cabecalho { font-size: 8.5pt; color: ${css(MARCA.tinta500)}; margin-top: 6px; }
  h1 { font-size: 14pt; font-weight: 700; text-align: center; text-transform: uppercase; margin: 0 0 18px; }
  h2 { font-size: 12pt; font-weight: 700; text-transform: uppercase; text-align: left; margin: 22px 0 8px; page-break-after: avoid; }
  h3 { font-size: 11.5pt; font-weight: 700; text-align: left; margin: 14px 0 4px; page-break-after: avoid; }
  p { margin: 0 0 10px; text-indent: 1.25cm; }
  p.sem-recuo { text-indent: 0; }
  p.vazio { font-style: italic; color: ${css(MARCA.tinta400)}; text-indent: 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; page-break-inside: avoid; }
  th, td { border: 1px solid ${css(MARCA.tinta400)}; padding: 4px 8px; vertical-align: top; text-align: left; text-indent: 0; }
  th { background: ${css(MARCA.tinta100)}; font-weight: 700; }
  .fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  figure { margin: 0; text-align: center; page-break-inside: avoid; }
  figure img { width: 100%; height: 180px; object-fit: cover; border: 1px solid ${css(MARCA.tinta300)}; display: block; }
  figcaption { font-size: 9pt; font-style: italic; color: ${css(MARCA.tinta600)}; margin-top: 4px; }
  .local-data { text-align: center; text-indent: 0; margin-top: 36px; }
  .assinatura { margin-top: 56px; text-align: center; page-break-inside: avoid; }
  .assinatura .traco { width: 280px; margin: 0 auto; border-top: 1px solid ${css(MARCA.tinta800)}; padding-top: 6px; }
  .assinatura p { text-indent: 0; margin: 0; }
  .assinatura .nome { font-weight: 700; }
  .assinatura .dado { font-size: 10pt; }
`

function moldura(titulo: string, perito: Usuario | null, corpo: string): string {
  const credencial = perito
    ? `<p class="perito-cabecalho">${esc(perito.nome)}${perito.titulo ? ` — ${esc(perito.titulo)}` : ''}${
        perito.registroProfissional ? ` · ${esc(perito.registroProfissional)}` : ''
      }</p>`
    : ''

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS}</style></head>
<body>
  <header class="marca">
    <div class="logo"><span class="primaria">D</span><span class="neutra">&amp;</span><span class="primaria">R</span></div>
    <div class="regua">— Perícia —</div>
    <div class="tagline">Plataforma Inteligente de Perícia Trabalhista</div>
    ${credencial}
  </header>
  ${corpo}
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

  let n = 0
  const secao = () => ++n

  const identificacao = `
  <table><tbody>
    ${linha('Processo nº', esc(pericia.numeroProcesso))}
    ${linha('Vara / Comarca', `${esc(pericia.vara)} — ${esc(pericia.comarca)}`)}
    ${linha('Reclamante', `${esc(pericia.reclamante)}${pericia.funcaoReclamante ? ` — ${esc(pericia.funcaoReclamante)}` : ''}`)}
    ${linha('Reclamada principal', principal ? `${esc(principal.razaoSocial)} — CNPJ ${esc(principal.cnpj)}` : '—')}
    ${solidarias.map((e) => linha('Reclamada solidária', `${esc(e.razaoSocial)} — CNPJ ${esc(e.cnpj)}`)).join('')}
    ${linha('Período contratual', `${data(pericia.admissao)} a ${pericia.demissao ? data(pericia.demissao) : 'atual'}`)}
    ${linha('Modalidade da perícia', esc(MODALIDADE_LABEL[pericia.modalidade] ?? pericia.modalidade))}
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

  const tabelaAgentes = t.agentes?.length
    ? `<table>
        <thead><tr><th>Agente</th><th style="width:12%">CAS</th><th style="width:13%">Anexo NR-15</th><th style="width:12%">Critério</th><th style="width:14%">Grau</th><th style="width:20%">Limite de Tolerância</th></tr></thead>
        <tbody>${t.agentes
          .map(
            (a) =>
              `<tr><td><strong>${esc(a.nome)}</strong>${
                a.atividadeEnquadrada?.trim()
                  ? `<br><small>Atividade ou referência normativa: ${esc(a.atividadeEnquadrada).replace(/\n/g, '<br>')}</small>`
                  : ''
              }</td><td>${esc(a.cas || '—')}</td><td>${esc(a.anexoNr15 || '—')}</td><td>${esc(
                CRITERIO[a.criterio] ?? a.criterio,
              )}</td><td>${esc(a.grau ? (GRAU[a.grau] ?? a.grau) : '—')}</td><td>${esc(
                limiteComUnidade(a.limiteTolerancia, a.unidadeLimite),
              )}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
    : '<p class="vazio">[Nenhum agente cadastrado]</p>'

  // Fotos viram data URI: o Chromium roda com a rede bloqueada.
  const porSecao = new Map<string, typeof pericia.fotos>()
  for (const f of [...pericia.fotos].sort((a, b) => a.ordem - b.ordem)) {
    const lista = porSecao.get(f.secao) ?? []
    lista.push(f)
    porSecao.set(f.secao, lista)
  }

  let blocoFotos = ''
  if (pericia.fotos.length) {
    const partes: string[] = []
    for (const [sec, fotos] of porSecao) {
      const figuras = await Promise.all(
        fotos.map(async (f, i) => {
          const uri = await comoDataUri(f.arquivo)
          const img = uri
            ? `<img src="${uri}" alt="${esc(f.legenda)}">`
            : `<div style="height:180px;border:1px solid ${css(MARCA.tinta300)};display:flex;align-items:center;justify-content:center;font-size:9pt;color:${css(MARCA.tinta400)}">imagem indisponível</div>`
          return `<figure>${img}<figcaption>Figura ${i + 1} — ${esc(f.legenda || 'sem legenda')}</figcaption></figure>`
        }),
      )
      partes.push(`<h3>${esc(SECAO_FOTO[sec] ?? sec)}</h3><div class="fotos">${figuras.join('')}</div>`)
    }
    blocoFotos = partes.join('')
  }

  // Montado em sequência: cada chamada de secao() acontece na ordem
  // em que a seção aparece no documento, e a numeração sai contínua.
  const partes: string[] = [
    `<h1>${esc(titulo)}</h1>`,
    enderecamento(pericia.vara),
    t.enderecamento?.trim() ? paragrafos(t.enderecamento) : '',
    `<h2>${secao()}. Identificação do Processo</h2>`,
    identificacao,
    `<h2>${secao()}. Apresentação</h2>`,
    paragrafos(t.apresentacao),
    `<h2>${secao()}. Objetivo da Perícia</h2>`,
    paragrafos(t.objetivoPericia),
    `<h2>${secao()}. Da Vistoria</h2>`,
    textoVistoria,
    tabelaParticipantes,
    `<h2>${secao()}. Descrição da Empresa</h2>`,
    paragrafos(t.descricaoEmpresa),
    `<h2>${secao()}. Descrição do Ambiente de Trabalho</h2>`,
    paragrafos(t.descricaoAmbiente),
    `<h2>${secao()}. Atividades e Funções Exercidas</h2>`,
    paragrafos(t.atividadesFuncoes),
    tabelaPeriodos,
    `<h2>${secao()}. Agentes e Riscos Avaliados</h2>`,
    tabelaAgentes,
    `<h2>${secao()}. Normas e Referências Técnicas Utilizadas</h2>`,
    paragrafos(t.normasReferencias),
    `<h2>${secao()}. Equipamentos e Procedimentos Analisados</h2>`,
    paragrafos(t.equipamentosAnalisados),
    `<h2>${secao()}. Informações Levantadas na Vistoria</h2>`,
    paragrafos(t.informacoesLevantadas),
    `<h2>${secao()}. Análise Técnica</h2>`,
    paragrafos(t.analiseTecnica),
  ]

  if (blocoFotos) {
    partes.push(`<h2>${secao()}. Relatório Fotográfico</h2>`, blocoFotos)
  }

  partes.push(`<h2>${secao()}. Conclusão</h2>`, paragrafos(t.conclusao))

  if (t.observacoesAdicionais?.trim()) {
    partes.push(
      `<h2>${secao()}. Observações Adicionais</h2>`,
      paragrafos(t.observacoesAdicionais),
    )
  }

  partes.push(
    '<p class="sem-recuo" style="margin-top:36px">Sendo o que se apresenta para o momento, o signatário coloca-se à disposição deste MM. Juízo para os esclarecimentos que se fizerem necessários.</p>',
    assinatura(perito, pericia.comarca),
  )

  return moldura(titulo, perito, partes.join('\n'))
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
          <div style="margin-bottom:16px">
            <p class="sem-recuo"><strong>${i + 1}. ${esc(q.pergunta)}</strong></p>
            <p><strong>Resposta: </strong>${esc(q.resposta || '[resposta não preenchida]')}</p>
          </div>`,
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
        .map((b, i) => `<h3>${i + 1}. ${esc(b.titulo)}</h3>${paragrafos(b.conteudo)}`)
        .join('')
    : '<p class="vazio">[Nenhum argumento selecionado]</p>'

  return moldura(
    doc.titulo,
    perito,
    `<h1>${esc(doc.titulo)}</h1>
     ${identificacao}
     <h2>I — Fundamentação Técnica</h2>
     ${paragrafos(c.fundamentacao)}
     <h2>II — ${ehConcordancia ? 'Razões da Concordância' : 'Razões da Impugnação'}</h2>
     ${argumentos}
     <h2>III — Requerimento</h2>
     ${paragrafos(c.encerramento)}
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
          <h3>${i + 1}. Questionamento ${esc(ORIGEM_PONTO[p.origem] ?? p.origem)}</h3>
          <p style="font-style:italic">${esc(p.questionamento || '[questionamento não informado]')}</p>
          <p><strong>Esclarecimento: </strong>${esc(p.resposta || '[esclarecimento não preenchido]')}</p>`,
        )
        .join('')
    : '<p class="vazio">[Nenhum ponto informado]</p>'

  return moldura(
    doc.titulo,
    perito,
    `<h1>Esclarecimentos Técnicos</h1>
     ${identificacao}
     <h2>I — Da Intimação</h2>
     ${paragrafos(c.introducao)}
     <h2>II — Dos Esclarecimentos Prestados</h2>
     ${pontos}
     <h2>III — Conclusão</h2>
     ${paragrafos(c.conclusao)}
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
