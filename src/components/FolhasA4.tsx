import { useEffect, useRef, useState, type ReactNode } from 'react'
import { paginar, type Folha } from '@/lib/paginacao'
import { cn } from '@/lib/utils'

// ============================================================
// Pré-visualização do documento em folhas A4 separadas, como no PDF.
//
// `children` é o documento de sempre (o <article class="doc-sheet">), que
// continua sendo do React. Depois de cada renderização, uma cópia dele é
// paginada em folhas de 210 x 297 mm com as margens da ABNT (src/lib/
// paginacao.ts), e são essas folhas que aparecem na tela; o original fica
// escondido e é o que vai para a impressora, paginado pelo próprio navegador.
//
// Sem layout para medir (os testes, em jsdom), fica o documento corrido.
// ============================================================

/** Mesmo texto do rodapé do PDF (textoDoRodape em server/src/services/pdf.ts) e do DOCX. */
export const RODAPE_DA_MARCA =
  '© DR Perícias Trabalhista — Propriedade intelectual exclusiva e protegida.'
/** 210 mm em pixels de CSS (96 px por polegada). */
const LARGURA_FOLHA_PX = (210 / 25.4) * 96
/** Quanto esperar por fonte e imagem antes de paginar assim mesmo. */
const ESPERA_RECURSOS_MS = 3000
/** Agrupa uma rajada de mudanças (digitação, imagens chegando) numa paginação só. */
const ATRASO_MS = 200
/** Imagem que ainda não carregou quando as folhas ficaram prontas: repagina, até este tanto. */
const MAX_REPAGINACOES_POR_IMAGEM = 3

function novaFolha(destino: HTMLElement, textoDoRodape: string): Folha {
  const folha = document.createElement('div')
  folha.className = 'folha-a4'
  folha.setAttribute('role', 'group')
  const corpo = document.createElement('div')
  corpo.className = 'doc-sheet folha-a4__corpo'
  const rodape = document.createElement('div')
  rodape.className = 'folha-a4__rodape'
  const marca = document.createElement('span')
  marca.textContent = textoDoRodape
  const numero = document.createElement('span')
  numero.className = 'folha-a4__numero'
  rodape.append(marca, numero)
  folha.append(corpo, rodape)
  destino.appendChild(folha)
  return { folha, corpo }
}

/** Fonte e imagens prontas: uma foto que chega depois muda a altura do texto. */
function esperarRecursos(raiz: HTMLElement): Promise<unknown> {
  const imagens = Array.from(raiz.querySelectorAll('img')).filter((img) => !img.complete)
  const prontos = Promise.all([
    document.fonts?.ready,
    ...imagens.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  ])
  return Promise.race([
    prontos,
    new Promise((resolve) => window.setTimeout(resolve, ESPERA_RECURSOS_MS)),
  ])
}

export function FolhasA4({
  children,
  className,
  rodape = RODAPE_DA_MARCA,
}: {
  children: ReactNode
  className?: string
  /** No laudo, só o nome do profissional. */
  rodape?: string
}) {
  const raizRef = useRef<HTMLDivElement>(null)
  const fonteRef = useRef<HTMLDivElement>(null)
  const janelaRef = useRef<HTMLDivElement>(null)
  const folhasRef = useRef<HTMLDivElement>(null)
  const [paginado, setPaginado] = useState(false)

  useEffect(() => {
    const raiz = raizRef.current
    const fonte = fonteRef.current
    const janela = janelaRef.current
    const folhas = folhasRef.current
    if (!raiz || !fonte || !janela || !folhas) return
    if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return

    let ativo = true
    let rodada = 0
    let temporizador: number | undefined
    let repaginacoesPorImagem = 0

    // Tela mais estreita que a folha: a folha encolhe inteira, sem mexer na
    // paginação (scale não altera o layout, e as quebras continuam as mesmas).
    const ajustarEscala = () => {
      const escala = Math.min(1, raiz.clientWidth / LARGURA_FOLHA_PX)
      if (escala < 1) {
        folhas.style.transform = `scale(${escala})`
        janela.style.height = `${folhas.offsetHeight * escala}px`
        janela.style.overflow = 'hidden'
      } else {
        folhas.style.transform = ''
        janela.style.height = ''
        janela.style.overflow = ''
      }
    }

    const agendar = () => {
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(() => void executar(), ATRASO_MS)
    }

    const executar = async () => {
      const esta = ++rodada
      await esperarRecursos(fonte)
      if (!ativo || esta !== rodada) return
      const documento = fonte.querySelector(':scope > .doc-sheet') ?? fonte

      // As folhas são montadas fora da tela, numa área invisível da mesma
      // largura, e só então trocam de lugar com as antigas: a prévia não
      // pisca nem pula de posição enquanto repagina.
      const obra = document.createElement('div')
      obra.setAttribute('aria-hidden', 'true')
      obra.style.cssText =
        'position:fixed;left:0;top:0;width:210mm;height:0;overflow:hidden;visibility:hidden;pointer-events:none;'
      document.body.appendChild(obra)
      let novas: Folha[] | null = null
      try {
        novas = paginar(documento, () => novaFolha(obra, rodape))
      } catch (erro) {
        console.error('Não foi possível dividir a prévia em folhas A4.', erro)
      }
      obra.remove()
      if (!novas) {
        setPaginado(false)
        return
      }

      const total = novas.length
      novas.forEach(({ folha }, indice) => {
        folha.setAttribute('aria-label', `Folha ${indice + 1} de ${total}`)
        const numero = folha.querySelector('.folha-a4__numero')
        if (numero) numero.textContent = `Página ${indice + 1} de ${total}`
      })
      folhas.replaceChildren(...novas.map(({ folha }) => folha))
      setPaginado(true)
      ajustarEscala()

      const atrasadas = Array.from(folhas.querySelectorAll('img')).filter((img) => !img.complete)
      if (atrasadas.length && repaginacoesPorImagem < MAX_REPAGINACOES_POR_IMAGEM) {
        repaginacoesPorImagem++
        atrasadas.forEach((img) => {
          img.addEventListener('load', agendar, { once: true })
          img.addEventListener('error', agendar, { once: true })
        })
      }
    }

    const mudancas = new MutationObserver(() => {
      repaginacoesPorImagem = 0
      agendar()
    })
    mudancas.observe(fonte, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    })
    const tamanho = new ResizeObserver(ajustarEscala)
    tamanho.observe(raiz)
    tamanho.observe(folhas)
    void executar()

    return () => {
      ativo = false
      window.clearTimeout(temporizador)
      mudancas.disconnect()
      tamanho.disconnect()
    }
  }, [rodape])

  return (
    <div ref={raizRef} className={cn('folhas-a4', paginado && 'paginado', className)}>
      <div ref={fonteRef} className="folhas-a4__fonte">
        {children}
      </div>
      <div ref={janelaRef} className="folhas-a4__janela">
        <div ref={folhasRef} className="folhas-a4__folhas" />
      </div>
    </div>
  )
}
