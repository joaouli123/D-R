import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { agenteSchema } from './esquemas-pericia'
import { CHAVES_AGENTE_AVALIADO } from '../../../src/types/chavesAgente'

// ============================================================
// `AgenteAvaliado` (src/types/index.ts) e `agenteSchema` são a mesma coisa
// escrita duas vezes, e nada no compilador liga uma à outra: o front é um
// projeto TypeScript, o esquema é um objeto de runtime do Zod.
//
// A divergência é silenciosa e é o pior tipo de silêncio. `agenteSchema` não
// tem `.strict()`, então o Zod 3 REMOVE a chave que não declarou em vez de
// recusar o corpo. O editor troca o estado local pela resposta do servidor
// depois de gravar, então o campo que só existe no tipo desaparece da tela
// no primeiro "Salvar rascunho", com HTTP 200 e nenhum erro em lugar nenhum.
//
// Estes testes são o que liga os dois lados.
// ============================================================

const caminho = (relativo: string) => fileURLToPath(new URL(relativo, import.meta.url))

const MINIMO = { id: 'ag-1', nome: 'Ruído', tipo: 'fisico', criterio: 'quantitativo' } as const

describe('agenteSchema e AgenteAvaliado', () => {
  it('declara exatamente as chaves do tipo', () => {
    // `CHAVES_AGENTE_AVALIADO` é conferida contra o tipo pelo compilador, com
    // `satisfies` de um lado e `Exclude` do outro. Aqui ela encontra o Zod.
    expect(Object.keys(agenteSchema.shape).sort()).toEqual([...CHAVES_AGENTE_AVALIADO].sort())
  })

  it('deixa o periodoId atravessar a validação', () => {
    // É o vínculo do agente com a função avaliada. Sem a linha no esquema o
    // perito lançaria ruído na prensa e ruído na expedição, gravaria, e os
    // dois voltariam do servidor sem função nenhuma.
    const validado = agenteSchema.parse({ ...MINIMO, periodoId: 'per-2' })

    expect(validado.periodoId).toBe('per-2')
  })

  it('aceita agente antigo, sem periodoId', () => {
    // Toda perícia gravada até aqui está nesse estado, e continua válida.
    expect(agenteSchema.parse(MINIMO).periodoId).toBeUndefined()
  })

  it('descarta em silêncio a chave que não declarou — o motivo de tudo isto', () => {
    const validado = agenteSchema.parse({ ...MINIMO, campoQueNinguemDeclarou: 'some daqui' })

    expect(validado).not.toHaveProperty('campoQueNinguemDeclarou')
  })

  it('mantém o aviso de espelhamento nos dois arquivos', () => {
    expect(readFileSync(caminho('./esquemas-pericia.ts'), 'utf8'))
      .toContain('src/types/chavesAgente.ts')
    expect(readFileSync(caminho('../../../src/types/chavesAgente.ts'), 'utf8'))
      .toContain('server/src/routes/esquemas-pericia.ts')
  })

  it('mantém os esquemas visíveis pela rota, que é por onde o smoke os lê', () => {
    // `server/scripts/smoke-validacao-pericia.ts` importa `pericias.js` e pega
    // os esquemas de lá. Eles moram noutro módulo desde a extração; a rota os
    // reexporta, e é essa reexportação que o smoke enxerga.
    expect(readFileSync(caminho('./pericias.ts'), 'utf8'))
      .toContain("export { agenteSchema, dataIsoSchema, tecnicoSchema } from './esquemas-pericia.js'")
  })
})
