// ============================================================
// Paginação da pré-visualização em folhas A4.
//
// A prévia do documento era uma folha só, corrida, e o perito pediu as folhas
// A4 separadas, como sai no PDF. Na tela o navegador não pagina uma div (as
// regras de @page só valem na impressão), então esta rotina faz o que o
// Chromium faz ao gerar o PDF: copia o documento, bloco a bloco, para dentro
// de folhas de altura fixa e abre uma folha nova quando o bloco não cabe.
//
// As regras de corte espelham as do PDF (server/src/services/documento-html.ts):
//   - a tabela se parte entre linhas, e o cabeçalho (thead) se repete na
//     continuação;
//   - o parágrafo se parte entre linhas, sem deixar uma linha sozinha em
//     nenhuma das duas folhas;
//   - título nunca fica sozinho no pé da folha: desce com o que vem depois;
//   - `break-inside: avoid` (foto, fecho) desce inteiro, e só se parte se não
//     couber nem numa folha vazia;
//   - `break-before: avoid` (fecho) leva junto o parágrafo anterior;
//   - `break-after: page` (folha de rosto) encerra a folha.
//
// Tudo acontece sobre cópias: o documento original continua sendo do React e
// não é tocado.
// ============================================================

/** Uma folha criada por quem pagina: `corpo` é a área dentro das margens. */
export interface Folha {
  folha: HTMLElement
  corpo: HTMLElement
}

type Tipo = 'tabela' | 'caixa' | 'texto' | 'atomo'

interface Nivel {
  original: Element
  copia: HTMLElement
}

interface Regras {
  antes: string
  depois: string
  dentro: string
}

/** Arredondamento de subpixel: sem folga, uma linha exata desceria à toa. */
const TOLERANCIA_PX = 0.5

const TITULOS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
const ATOMICOS = new Set(['IMG', 'FIGURE', 'SVG', 'HR', 'CANVAS', 'VIDEO', 'IFRAME', 'PICTURE', 'svg'])

const forca = (valor: string) => ['page', 'always', 'left', 'right', 'recto', 'verso'].includes(valor)
const evita = (valor: string) => valor === 'avoid' || valor === 'avoid-page'

/** Conteúdo de verdade — uma casca vazia ou um espaçador não contam. */
const temConteudo = (el: Element): boolean =>
  (el.textContent ?? '').trim() !== '' || el.querySelector('img, svg, hr, canvas, table') !== null

/** Título ou bloco que pede para não ficar separado do que vem depois. */
const gruda = (el: Element): boolean => TITULOS.has(el.tagName) || evita(getComputedStyle(el).breakAfter)

function tipoDe(el: HTMLElement, display: string): Tipo {
  if (el.tagName === 'TABLE') return 'tabela'
  if (TITULOS.has(el.tagName) || ATOMICOS.has(el.tagName) || display.startsWith('inline')) return 'atomo'
  const temBloco = Array.from(el.children).some((filho) => {
    const d = getComputedStyle(filho).display
    return d !== 'none' && d !== 'contents' && !d.startsWith('inline')
  })
  if (temBloco) return 'caixa'
  return (el.textContent ?? '').trim() ? 'texto' : 'atomo'
}

function nosDeTexto(el: Element): Text[] {
  const nos: Text[] = []
  const caminho = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let no = caminho.nextNode(); no; no = caminho.nextNode()) nos.push(no as Text)
  return nos
}

class Paginador {
  readonly folhas: Folha[] = []
  private corpo!: HTMLElement
  private alturaCorpo = 0
  private cadeia: Nivel[] = []
  private quebraPendente = false

  constructor(private readonly criarFolha: () => Folha) {}

  executar(documento: Element): boolean {
    this.abrirFolha()
    this.alturaCorpo = this.corpo.getBoundingClientRect().height
    // Sem layout (jsdom, ou a prévia escondida numa aba): não há o que medir.
    if (this.alturaCorpo <= 0) return false
    for (const no of Array.from(documento.childNodes)) this.colocar(no)
    return true
  }

  private get pai(): HTMLElement {
    return this.cadeia.length ? this.cadeia[this.cadeia.length - 1].copia : this.corpo
  }

  /** Onde termina a área útil da folha atual, em coordenadas de tela. */
  private limite(): number {
    return this.corpo.getBoundingClientRect().top + this.alturaCorpo + TOLERANCIA_PX
  }

  private cabe(el: Element): boolean {
    return el.getBoundingClientRect().bottom <= this.limite()
  }

  /** Há conteúdo nesta folha além de `ignorar`? */
  private temConteudoNaFolha(ignorar?: Element): boolean {
    if (!ignorar?.parentNode) return temConteudo(this.corpo)
    const pai = ignorar.parentNode
    const proximo = ignorar.nextSibling
    pai.removeChild(ignorar)
    const tem = temConteudo(this.corpo)
    pai.insertBefore(ignorar, proximo)
    return tem
  }

  /** Folha nova, já com as cascas (seção, lista...) que estavam abertas. */
  private abrirFolha(): void {
    const folha = this.criarFolha()
    this.folhas.push(folha)
    this.corpo = folha.corpo
    let pai: HTMLElement = this.corpo
    this.cadeia = this.cadeia.map(({ original }) => {
      const copia = original.cloneNode(false) as HTMLElement
      copia.classList.add('continuacao')
      pai.appendChild(copia)
      pai = copia
      return { original, copia }
    })
  }

  /**
   * Abre a folha seguinte levando junto o que não pode ficar no pé desta: os
   * títulos (e blocos com `break-after: avoid`) que vinham logo antes do
   * ponto de quebra e, se `arrastarAnterior`, o parágrafo imediatamente
   * anterior. Sobe pelos níveis abertos enquanto o nível de dentro ficar
   * vazio — o título de uma seção desce junto com a seção.
   */
  private quebrar(arrastarAnterior: boolean, levarGrudados = true): void {
    const descer: Element[][] = []
    if (levarGrudados) {
      let arrastar = arrastarAnterior
      for (let nivel = this.cadeia.length; nivel >= 0; nivel--) {
        const pai = nivel === 0 ? this.corpo : this.cadeia[nivel - 1].copia
        let filho = pai.lastElementChild
        // Abaixo do nível de dentro, o último filho é a casca dele (vazia,
        // senão o laço já teria parado).
        if (nivel < this.cadeia.length) filho = filho?.previousElementSibling ?? null
        const grupo: Element[] = []
        while (filho && ((arrastar && filho.tagName === 'P') || gruda(filho))) {
          arrastar = false
          grupo.unshift(filho)
          filho = filho.previousElementSibling
        }
        arrastar = false
        grupo.forEach((no) => no.remove())
        descer[nivel] = grupo
        if (temConteudo(pai)) break
      }

      // Se descer tudo isso esvaziaria a folha, não adianta: a quebra sai
      // aqui mesmo e o título fica onde estava.
      if (!temConteudo(this.corpo)) {
        descer.forEach((grupo, nivel) => {
          const pai = nivel === 0 ? this.corpo : this.cadeia[nivel - 1].copia
          const antes = this.cadeia[nivel]?.copia ?? null
          grupo.forEach((no) => pai.insertBefore(no, antes))
        })
        descer.length = 0
      }
    }

    // Cascas que ficaram vazias saem desta folha; na seguinte, a mesma casca
    // deixa de ser "continuação" — é ali que ela começa de fato.
    const vazia = this.cadeia.findIndex(({ copia }) => !temConteudo(copia))
    if (vazia >= 0) this.cadeia[vazia].copia.remove()

    this.abrirFolha()
    if (vazia >= 0) {
      for (let nivel = vazia; nivel < this.cadeia.length; nivel++) {
        this.cadeia[nivel].copia.classList.remove('continuacao')
      }
    }
    descer.forEach((grupo, nivel) => {
      const pai = nivel === 0 ? this.corpo : this.cadeia[nivel - 1].copia
      const antes = this.cadeia[nivel]?.copia ?? null
      grupo.forEach((no) => pai.insertBefore(no, antes))
    })
  }

  private colocar(no: Node): void {
    if (no.nodeType === Node.TEXT_NODE) {
      if ((no.textContent ?? '').trim()) this.pai.appendChild(no.cloneNode())
      return
    }
    if (no.nodeType !== Node.ELEMENT_NODE) return
    const original = no as Element

    if (this.quebraPendente) {
      this.quebraPendente = false
      if (this.temConteudoNaFolha()) this.quebrar(false, false)
    }

    const havia = this.temConteudoNaFolha()
    const copia = original.cloneNode(true) as HTMLElement
    this.pai.appendChild(copia)
    const estilo = getComputedStyle(copia)
    const regras: Regras = { antes: estilo.breakBefore, depois: estilo.breakAfter, dentro: estilo.breakInside }
    if (estilo.display === 'none') return

    if (havia && forca(regras.antes)) {
      copia.remove()
      this.quebrar(false, false)
      this.pai.appendChild(copia)
    }

    if (this.cabe(copia)) {
      this.depois(regras)
      return
    }

    const tipo = tipoDe(copia, estilo.display)
    const arrastar = evita(regras.antes)

    // Bloco que pede para não se partir: tenta a folha seguinte inteira.
    if (evita(regras.dentro) && this.temConteudoNaFolha(copia)) {
      copia.remove()
      this.quebrar(arrastar)
      this.pai.appendChild(copia)
      if (this.cabe(copia)) {
        this.depois(regras)
        return
      }
    }

    copia.remove()
    if (tipo === 'tabela' && (original as HTMLTableElement).tBodies.length) {
      this.dividirTabela(original as HTMLTableElement, arrastar)
    } else if (tipo === 'caixa') {
      this.dividirCaixa(original)
    } else if (tipo === 'texto') {
      this.dividirTexto(copia, arrastar)
    } else {
      // Indivisível: desce para a folha seguinte. Numa folha vazia fica onde
      // está, mesmo sobrando — não há folha maior para onde ir.
      if (this.temConteudoNaFolha()) this.quebrar(arrastar)
      this.pai.appendChild(copia)
    }
    this.depois(regras)
  }

  private depois(regras: Regras): void {
    if (forca(regras.depois)) this.quebraPendente = true
  }

  private dividirCaixa(original: Element): void {
    const casca = original.cloneNode(false) as HTMLElement
    this.pai.appendChild(casca)
    this.cadeia.push({ original, copia: casca })
    for (const filho of Array.from(original.childNodes)) this.colocar(filho)
    this.cadeia.pop()
  }

  private dividirTabela(original: HTMLTableElement, arrastar: boolean): void {
    const cabecalho = original.tHead
    const novaCasca = (continuacao: boolean): HTMLTableElement => {
      const casca = original.cloneNode(false) as HTMLTableElement
      if (continuacao) casca.classList.add('continuacao')
      for (const filho of Array.from(original.children)) {
        if (filho === cabecalho || filho.tagName === 'COLGROUP' || (filho.tagName === 'CAPTION' && !continuacao)) {
          casca.appendChild(filho.cloneNode(true))
        }
      }
      this.pai.appendChild(casca)
      return casca
    }

    let casca = novaCasca(false)
    let linhasNaCasca = 0
    for (const secao of Array.from(original.children)) {
      if (secao.tagName !== 'TBODY' && secao.tagName !== 'TFOOT') continue
      let destino = secao.cloneNode(false) as HTMLElement
      casca.appendChild(destino)
      for (const linha of Array.from((secao as HTMLTableSectionElement).rows)) {
        const copia = linha.cloneNode(true) as HTMLElement
        destino.appendChild(copia)
        if (this.cabe(copia)) {
          linhasNaCasca++
          continue
        }
        // Numa folha vazia a linha fica e sobra: não há para onde descer.
        if (!this.temConteudoNaFolha(linhasNaCasca === 0 ? casca : copia)) {
          linhasNaCasca++
          continue
        }
        copia.remove()
        if (linhasNaCasca === 0) {
          // Nem a primeira linha coube: a tabela desce inteira, e o título
          // que a anuncia vai junto.
          casca.remove()
          this.quebrar(arrastar)
          casca = novaCasca(false)
        } else {
          if (!destino.firstChild) destino.remove()
          this.quebrar(false)
          casca = novaCasca(true)
        }
        destino = secao.cloneNode(false) as HTMLElement
        casca.appendChild(destino)
        destino.appendChild(copia)
        linhasNaCasca = 1
      }
    }
  }

  /** Parte um bloco de texto entre linhas até o que sobra caber. */
  private dividirTexto(copia: HTMLElement, arrastar: boolean): void {
    let resto = copia
    this.pai.appendChild(resto)
    for (let guarda = 0; guarda < 100 && !this.cabe(resto); guarda++) {
      const corte = this.pontoDeCorte(resto)
      if (!corte) {
        // Não sobram duas linhas aqui: o bloco desce inteiro. Se já está no
        // alto de uma folha, fica e sobra.
        if (!this.temConteudoNaFolha(resto)) return
        resto.remove()
        this.quebrar(arrastar)
        arrastar = false
        this.pai.appendChild(resto)
        continue
      }
      const justificado = getComputedStyle(resto).textAlign === 'justify'
      const faixa = document.createRange()
      faixa.setStart(resto, 0)
      faixa.setEnd(corte.no, corte.offset)
      const primeira = resto.cloneNode(false) as HTMLElement
      primeira.appendChild(faixa.extractContents())
      resto.parentNode!.insertBefore(primeira, resto)
      // A última linha da parte de cima é uma linha do meio do parágrafo:
      // justificada como as outras, e não alinhada à esquerda.
      if (justificado) primeira.style.textAlignLast = 'justify'
      primeira.classList.add('partido')
      resto.classList.add('continuacao')
      // O espaço entre as duas palavras do corte ficaria no começo da folha
      // seguinte (visível em `pre-wrap`, como na transcrição).
      for (const no of nosDeTexto(resto)) {
        no.data = no.data.replace(/^\s+/, '')
        if (no.data) break
      }
      resto.remove()
      this.quebrar(false, false)
      arrastar = false
      this.pai.appendChild(resto)
    }
  }

  /**
   * Onde partir o bloco `el` (já na folha, sobrando): o fim da última palavra
   * que ainda cabe, desde que fiquem ao menos duas linhas em cada folha.
   * `null` quando não dá — o bloco então desce inteiro.
   */
  private pontoDeCorte(el: HTMLElement): { no: Text; offset: number } | null {
    const fins: { no: Text; offset: number }[] = []
    for (const no of nosDeTexto(el)) {
      const palavra = /\S+/g
      for (let achado = palavra.exec(no.data); achado; achado = palavra.exec(no.data)) {
        fins.push({ no, offset: achado.index + achado[0].length })
      }
    }
    if (fins.length < 2) return null

    const faixa = document.createRange()
    const fundo = (indice: number) => {
      faixa.setStart(el, 0)
      faixa.setEnd(fins[indice].no, fins[indice].offset)
      return faixa.getBoundingClientRect().bottom
    }
    /** Último índice cujo fim de palavra fica até `y` (−1 se nenhum). */
    const ultimoAte = (y: number) => {
      let baixo = 0
      let alto = fins.length - 1
      let achado = -1
      while (baixo <= alto) {
        const meio = (baixo + alto) >> 1
        if (fundo(meio) <= y) {
          achado = meio
          baixo = meio + 1
        } else {
          alto = meio - 1
        }
      }
      return achado
    }

    faixa.setStart(el, 0)
    faixa.setEnd(fins[0].no, fins[0].offset)
    const retanguloInicial = faixa.getBoundingClientRect()
    const primeiraLinha = retanguloInicial.bottom
    const ultimaLinha = fundo(fins.length - 1)
    // Altura de uma linha, medida: a primeira palavra que cai na linha 2.
    const naSegunda = (() => {
      let baixo = 1
      let alto = fins.length - 1
      let achado = -1
      while (baixo <= alto) {
        const meio = (baixo + alto) >> 1
        if (fundo(meio) > primeiraLinha + 1) {
          achado = meio
          alto = meio - 1
        } else {
          baixo = meio + 1
        }
      }
      return achado
    })()
    if (naSegunda < 0) return null
    const alturaLinha = fundo(naSegunda) - primeiraLinha
    if (alturaLinha <= 0) return null
    const linhasAte = (y: number) => 1 + Math.round((y - primeiraLinha) / alturaLinha)

    // O retângulo do texto é o das letras; a linha, com o entrelinhamento de
    // 1,5, desce meia entrelinha além dele. É a linha que precisa caber.
    const meiaEntrelinha = Math.max(0, (alturaLinha - retanguloInicial.height) / 2)

    const total = linhasAte(ultimaLinha)
    let indice = ultimoAte(this.limite() - meiaEntrelinha)
    if (indice < 0) return null
    let acima = linhasAte(fundo(indice))
    // Viúva: se só uma linha desceria, desce mais uma junto.
    if (total - acima < 2) {
      acima = total - 2
      indice = ultimoAte(primeiraLinha + (acima - 1) * alturaLinha + alturaLinha / 2)
    }
    // Órfã: menos de duas linhas no pé da folha não compensa partir.
    if (acima < 2 || indice < 0 || indice >= fins.length - 1) return null
    return fins[indice]
  }
}

/**
 * Pagina `documento` (o <article> da prévia) em folhas criadas por
 * `criarFolha`, que já devem estar no DOM visível para poderem ser medidas.
 * Devolve as folhas, ou `null` quando não há layout para medir — aí quem
 * chamou mantém a prévia corrida.
 */
export function paginar(documento: Element, criarFolha: () => Folha): Folha[] | null {
  const paginador = new Paginador(criarFolha)
  return paginador.executar(documento) ? paginador.folhas : null
}
