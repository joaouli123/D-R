import { useMemo, useState } from 'react'
import { Copy, ShieldCheck } from 'lucide-react'

import { Badge, Button, Card, CardHeader, SecaoColapsavel, Select, useToast } from '@/components/ui'
import { textosOficiaisDaMatriz } from '@/content/textosPadrao'
import { emParagrafos, linhasDoBloco } from '@/lib/listasDocumento'
import { contarPalavras } from '@/lib/utils'
import { useApp } from '@/store/AppStore'
import type { ModalidadePericia } from '@/types'

// ============================================================
// TEXTOS OFICIAIS DA MATRIZ — só leitura
//
// Resposta à pergunta do perito ("Estão ocultos, certo? Onde consigo vê-lo?").
// No formulário da perícia estes textos vivem em caixas travadas de poucas
// linhas; aqui ele abre cada um inteiro, escolhe a modalidade e copia o
// conteúdo se quiser levar para outro lugar.
//
// Continua sendo LEITURA: quem personaliza a matriz é o administrador, dentro
// da perícia. Por isso não há <Textarea> nem botão de salvar nesta tela.
// ============================================================

const MODALIDADES: { value: ModalidadePericia; label: string }[] = [
  { value: 'ambas', label: 'Insalubridade e periculosidade' },
  { value: 'insalubridade', label: 'Somente insalubridade' },
  { value: 'periculosidade', label: 'Somente periculosidade' },
]

type LinhaDoBloco = ReturnType<typeof linhasDoBloco>[number]

/**
 * Junta as linhas seguidas de lista num grupo só, mantendo cada linha de
 * texto sozinha.
 *
 * É o que permite renderizar &lt;ul&gt; de verdade sem perder a frase que abre a
 * lista: `linhasDoBloco` devolve tudo achatado, e um bloco misto é o caso
 * comum na matriz do perito.
 */
function agruparEmListas(linhas: LinhaDoBloco[]): { tipo: 'texto' | 'lista'; linhas: LinhaDoBloco[] }[] {
  const grupos: { tipo: 'texto' | 'lista'; linhas: LinhaDoBloco[] }[] = []

  for (const linha of linhas) {
    const tipo = linha.tipo === 'texto' ? 'texto' : 'lista'
    const ultimo = grupos[grupos.length - 1]
    if (tipo === 'lista' && ultimo?.tipo === 'lista') ultimo.linhas.push(linha)
    else grupos.push({ tipo, linhas: [linha] })
  }

  return grupos
}

/**
 * Renderiza o texto oficial do jeito que ele sai no documento.
 *
 * Espelha `ConteudoEstruturado`/`Paragrafos` de
 * src/components/DocumentoPreview.tsx: as linhas "4.1.", "5.2.3." etc. viram
 * título, "• " vira item com marcador e o TAB vira linha recuada sem
 * marcador. Divergir daquilo aqui não estraga nenhum documento — só faria
 * esta tela mentir sobre a aparência do texto.
 */
function TextoFormatado({ conteudo }: { conteudo: string }) {
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-ink-700">
      {emParagrafos(conteudo).map((bloco, indice) => {
        const titulo = bloco.trim().match(/^([45]\.\d+(?:\.\d+)?\.)\s+([^\n]+)$/)
        if (titulo) {
          return (
            <p key={indice} className="pt-1 font-semibold text-ink-900">
              {titulo[1] ?? ''} {titulo[2] ?? ''}
            </p>
          )
        }

        // Linha a linha, como o preview faz: um mesmo bloco costuma abrir com
        // uma frase e seguir com a lista (“Serão considerados, quando
        // pertinentes:” + os itens). Enquanto isso virava um parágrafo único,
        // esta tela mentia sobre a aparência do texto que ele assina.
        return (
          <div key={indice} className="space-y-1">
            {agruparEmListas(linhasDoBloco(bloco)).map((grupo, i) =>
              grupo.tipo === 'texto' ? (
                <p key={i} className="text-justify">{grupo.linhas[0]?.texto}</p>
              ) : (
                <ul key={i} className="space-y-1 pl-1">
                  {grupo.linhas.map((linha, j) => (
                    <li key={j} className="flex gap-2">
                      {/* O marcador é do renderizador, não do texto: `linhasDoBloco`
                          já tirou o "•" e o TAB do conteúdo. */}
                      <span aria-hidden="true" className="select-none text-ink-400">
                        {linha.tipo === 'item' ? '\u2022' : ''}
                      </span>
                      <span className={linha.tipo === 'item' ? '' : 'pl-3'}>{linha.texto}</span>
                    </li>
                  ))}
                </ul>
              ),
            )}
          </div>
        )
      })}
    </div>
  )
}

export function TextosOficiaisMatriz() {
  const { usuario } = useApp()
  const toast = useToast()
  const [modalidade, setModalidade] = useState<ModalidadePericia>('ambas')

  const oficiais = useMemo(() => textosOficiaisDaMatriz(modalidade, usuario), [modalidade, usuario])

  return (
    <Card className="mb-4">
      <CardHeader
        title="Textos oficiais da matriz"
        subtitle="São os textos que o sistema preenche sozinho no parecer e no laudo. Aqui você lê cada um por inteiro; a edição continua reservada ao administrador."
        icon={<ShieldCheck size={18} />}
        action={
          <Select
            aria-label="Modalidade da perícia"
            value={modalidade}
            onChange={(e) => setModalidade(e.target.value as ModalidadePericia)}
          >
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        }
      />

      <div className="divide-y divide-ink-100">
        {oficiais.map((texto) => (
          <div key={texto.campo} className="px-5 py-3">
            <SecaoColapsavel
              abertoInicial={false}
              titulo={
                texto.referencia ? `${texto.referencia}. ${texto.titulo}` : texto.titulo
              }
              resumo={`${contarPalavras(texto.conteudo)} palavras`}
              acoes={
                <div className="flex items-center gap-2">
                  <Badge tone="navy">Protegido</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Copy size={14} />}
                    aria-label={`Copiar o texto oficial: ${texto.titulo}`}
                    onClick={() => {
                      navigator.clipboard?.writeText(texto.conteudo)
                      toast('Texto oficial copiado.')
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              }
            >
              <div className="mt-2 rounded-lg border border-ink-200 bg-ink-50 p-4">
                <TextoFormatado conteudo={texto.conteudo} />
              </div>
            </SecaoColapsavel>
          </div>
        ))}
      </div>
    </Card>
  )
}
