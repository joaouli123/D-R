// Espelha server/src/services/documento-comum.ts. Os dois precisam mudar juntos.
//
// O front e a API são projetos TypeScript separados (o servidor tem rootDir
// próprio e o alias "@" do Vite só enxerga ./src), então a convenção do repo
// é duplicar e travar a paridade num teste — ver src/lib/periodoAvaliacao.ts.
//
// A matriz do perito usa dois formatos de lista dentro de um mesmo bloco de
// texto, e os três renderizadores (pré-visualização, PDF e DOCX) precisam
// lê-los do mesmo jeito:
//   "• item"  → item de lista com marcador (marcador em 1,25 cm, texto em
//               2,25 cm, alinhado à esquerda);
//   "\titem"  → linha recuada SEM marcador (os Anexos da NR-16, item 4.2.1).
// Qualquer outra linha continua sendo parágrafo justificado.

export type TipoLinhaBloco = 'texto' | 'item' | 'item-sem-marcador'

export interface LinhaBloco {
  tipo: TipoLinhaBloco
  texto: string
}

export const MARCADOR_LISTA = '•'

/**
 * Texto livre → parágrafos, quebrando nas linhas em branco.
 *
 * O recorte das pontas preserva o TAB inicial de propósito: ele é o marcador
 * de "linha recuada sem marcador" e some com `trim()` puro quando a primeira
 * linha do bloco já é um item recuado.
 */
export function emParagrafos(texto?: string | null): string[] {
  if (!texto?.trim()) return []
  return texto
    .split(/\n{2,}/)
    .map((p) => p.replace(/^[ \r\n]+/, '').replace(/\s+$/, ''))
    .filter(Boolean)
}

/**
 * Classifica cada linha de um bloco. O marcador e o TAB são REMOVIDOS do
 * texto — quem devolve o glifo é o renderizador.
 *
 * Só o TAB conta como recuo sem marcador: os mesmos campos guardam texto
 * colado de outros documentos, que costuma vir indentado com espaços sem
 * nenhuma intenção de lista.
 */
export function linhasDoBloco(bloco: string): LinhaBloco[] {
  return bloco.split(/\r?\n/).flatMap<LinhaBloco>((linha) => {
    const comMarcador = linha.match(/^\s*•\s*(.*)$/)
    if (comMarcador) {
      const conteudo = (comMarcador[1] ?? '').trim()
      return conteudo ? [{ tipo: 'item', texto: conteudo }] : []
    }
    const recuada = linha.match(/^\t+(.*)$/)
    if (recuada) {
      const conteudo = (recuada[1] ?? '').trim()
      return conteudo ? [{ tipo: 'item-sem-marcador', texto: conteudo }] : []
    }
    const conteudo = linha.trim()
    return conteudo ? [{ tipo: 'texto', texto: conteudo }] : []
  })
}
