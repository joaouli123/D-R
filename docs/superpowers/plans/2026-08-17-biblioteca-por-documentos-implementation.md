# Biblioteca por Documentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizar os textos pessoais por Parecer, Laudo, Quesitos, Manifestação, Impugnação, Esclarecimentos e Uso geral, mantendo seção, busca e compatibilidade com registros existentes.

**Architecture:** A classificação documental será uma segunda dimensão de `TextoBiblioteca`, persistida como lista do enum PostgreSQL/Prisma `TipoDocumento`; lista vazia significa `Uso geral`. Regras puras no frontend concentrarão contagens e filtros, enquanto componentes focados renderizarão a estante de categorias e reutilizarão o contexto no drawer. A API manterá payloads antigos válidos com padrão vazio e normalizará duplicidades.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, Testing Library, Node.js, Express, Zod, Prisma 5 e PostgreSQL.

## Global Constraints

- Preservar todos os textos existentes, classificando-os como `Uso geral` sem alterar título, seção, tags ou conteúdo.
- Permitir que um texto pertença a vários dos seis tipos documentais sem duplicar o registro.
- Manter `secao` e `tiposDocumento` como dimensões independentes.
- Lista vazia de tipos significa `Uso geral`; `geral` não será acrescentado ao enum `TipoDocumento`.
- Não alterar o Histórico de Documentos gerados.
- Não inserir nem selecionar textos automaticamente.
- Manter favoritos, usos, busca, seção, copiar, editar e excluir.
- Manter isolamento por usuário em todas as operações da API.
- API deve ser publicada antes do frontend.
- Todo código de produção deve ser precedido por teste falho e cada task deve terminar em commit próprio.
- A entrega final deve incluir um resumo pronto para o cliente validar.

---

## Mapa de arquivos e responsabilidades

- `server/prisma/schema.prisma`: acrescenta a classificação documental ao texto pessoal.
- `server/prisma/migrations/20260817_biblioteca_tipos_documento/migration.sql`: adiciona a coluna com padrão vazio e sem backfill subjetivo.
- `server/src/biblioteca.ts`: enum compartilhado, schema Zod e normalização de duplicidades.
- `server/src/routes/textos.ts`: aceita e persiste o novo campo sem enfraquecer a propriedade por usuário.
- `server/src/mappers.ts`: expõe `tiposDocumento` no contrato REST.
- `server/scripts/smoke-biblioteca.ts`: regressão executável do contrato do backend.
- `src/types/index.ts`: amplia `TextoBiblioteca` com `tiposDocumento`.
- `src/lib/biblioteca.ts`: fonte única para metadados, filtros, contagens e contexto do drawer.
- `src/lib/biblioteca.test.ts`: testes puros das regras de organização.
- `src/components/BibliotecaCategorias.tsx`: estante navegável e acessível de categorias.
- `src/components/BibliotecaCategorias.test.tsx`: comportamento DOM da navegação.
- `src/pages/Biblioteca.tsx`: integra navegação, cartões, estados vazios e edição múltipla.
- `src/components/BibliotecaDrawer.tsx`: filtra pelo tipo e seção do documento aberto.
- `src/pages/PericiaEditor.tsx`: informa `parecer` ou `laudo` ao drawer.
- `src/mocks/db.ts`: mantém o modo demonstrativo compatível com o novo contrato.
- `README.md` e `src/pages/Ajuda.tsx`: documentam a organização e o uso.

---

### Task 1: Contrato persistente e migração compatível

**Files:**
- Create: `server/src/biblioteca.ts`
- Create: `server/scripts/smoke-biblioteca.ts`
- Create: `server/prisma/migrations/20260817_biblioteca_tipos_documento/migration.sql`
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/routes/textos.ts`
- Modify: `server/src/mappers.ts`
- Modify: `server/package.json`
- Modify: `src/types/index.ts`
- Modify: `src/mocks/db.ts`
- Modify: `src/pages/Biblioteca.tsx`

**Interfaces:**
- Produces: `TIPOS_DOCUMENTO_BIBLIOTECA`, `tiposDocumentoSchema` e `normalizarTiposDocumento(tipos)`.
- Produces on `TextoBiblioteca`: `tiposDocumento: TipoDocumento[]`.
- Produces on REST: `GET/POST /textos` with `tiposDocumento`.

- [ ] **Step 1: escrever o smoke falho do contrato**

Criar `server/scripts/smoke-biblioteca.ts`:

```ts
import assert from 'node:assert/strict'
import { normalizarTiposDocumento, tiposDocumentoSchema } from '../src/biblioteca.js'

const legado = tiposDocumentoSchema.parse(undefined)
assert.deepEqual(legado, [])

const varios = tiposDocumentoSchema.parse(['parecer', 'laudo'])
assert.deepEqual(varios, ['parecer', 'laudo'])

assert.deepEqual(
  normalizarTiposDocumento(['parecer', 'parecer', 'quesitos']),
  ['parecer', 'quesitos'],
)

assert.equal(tiposDocumentoSchema.safeParse(['contrato']).success, false)
assert.equal(
  tiposDocumentoSchema.safeParse([
    'parecer', 'laudo', 'quesitos', 'manifestacao',
    'impugnacao', 'esclarecimento', 'parecer',
  ]).success,
  false,
)

console.log('5 verificações · 0 falhas')
```

Adicionar temporariamente o script em `server/package.json`:

```json
"smoke:biblioteca": "tsx scripts/smoke-biblioteca.ts"
```

- [ ] **Step 2: executar o smoke e confirmar a falha correta**

Run: `cd server && npm.cmd run smoke:biblioteca`

Expected: FAIL porque `server/src/biblioteca.ts` ainda não existe.

- [ ] **Step 3: implementar o domínio mínimo do backend**

Criar `server/src/biblioteca.ts`:

```ts
import { z } from 'zod'

export const TIPOS_DOCUMENTO_BIBLIOTECA = [
  'parecer',
  'laudo',
  'quesitos',
  'manifestacao',
  'impugnacao',
  'esclarecimento',
] as const

export type TipoDocumentoBiblioteca = (typeof TIPOS_DOCUMENTO_BIBLIOTECA)[number]

export function normalizarTiposDocumento(
  tipos: readonly TipoDocumentoBiblioteca[],
): TipoDocumentoBiblioteca[] {
  return [...new Set(tipos)]
}

export const tiposDocumentoSchema = z
  .array(z.enum(TIPOS_DOCUMENTO_BIBLIOTECA))
  .max(TIPOS_DOCUMENTO_BIBLIOTECA.length)
  .default([])
  .transform(normalizarTiposDocumento)
```

O limite deve ser verificado antes da transformação; assim um payload com sete entradas, ainda que duplicadas, continua inválido.

- [ ] **Step 4: executar o smoke e confirmar verde**

Run: `cd server && npm.cmd run smoke:biblioteca`

Expected: `5 verificações · 0 falhas`.

- [ ] **Step 5: criar schema Prisma e SQL da migração**

Adicionar ao modelo `TextoBiblioteca`:

```prisma
tiposDocumento TipoDocumento[] @default([])
```

Criar `server/prisma/migrations/20260817_biblioteca_tipos_documento/migration.sql`:

```sql
ALTER TABLE "textos_biblioteca"
ADD COLUMN "tiposDocumento" "TipoDocumento"[] NOT NULL DEFAULT ARRAY[]::"TipoDocumento"[];
```

Não atualizar linhas existentes: o padrão vazio materializa `Uso geral` de forma determinística.

- [ ] **Step 6: gerar o cliente e escrever a segunda regressão falha**

Run: `cd server && npm.cmd run prisma:generate`

Ampliar `server/scripts/smoke-biblioteca.ts` antes de alterar rota e mapper:

```ts
import type { TextoBiblioteca } from '@prisma/client'
import { textoParaApi } from '../src/mappers.js'
import { textoBibliotecaCorpoSchema } from '../src/routes/textos.js'

const payloadLegado = textoBibliotecaCorpoSchema.parse({
  titulo: 'Trecho legado',
  conteudo: 'Conteúdo técnico',
})
assert.deepEqual(payloadLegado.tiposDocumento, [])
assert.equal(
  textoBibliotecaCorpoSchema.safeParse({
    titulo: 'Inválido',
    conteudo: 'Conteúdo técnico',
    tiposDocumento: ['contrato'],
  }).success,
  false,
)

const persistido: TextoBiblioteca = {
  id: 'texto-1',
  usuarioId: 'usuario-1',
  titulo: 'Parecer e laudo',
  secao: 'analise',
  tiposDocumento: ['parecer', 'laudo'],
  tags: [],
  conteudo: 'Conteúdo técnico',
  favorito: false,
  usos: 0,
  criadoEm: new Date('2026-08-17T00:00:00Z'),
  atualizadoEm: new Date('2026-08-17T00:00:00Z'),
}
assert.deepEqual(textoParaApi(persistido).tiposDocumento, ['parecer', 'laudo'])
```

Run: `cd server && npm.cmd run smoke:biblioteca`

Expected: FAIL porque `textoBibliotecaCorpoSchema` ainda não é exportado e o mapper ainda não devolve `tiposDocumento`.

- [ ] **Step 7: integrar schema, rota, mapper e contratos do frontend**

Em `server/src/routes/textos.ts`, importar `tiposDocumentoSchema`, exportar o schema como `textoBibliotecaCorpoSchema` e acrescentar ao corpo:

```ts
tiposDocumento: tiposDocumentoSchema,
```

e acrescentar aos dados persistidos:

```ts
tiposDocumento: d.tiposDocumento,
```

Em `server/src/mappers.ts`, devolver:

```ts
tiposDocumento: t.tiposDocumento,
```

Em `src/types/index.ts`:

```ts
export interface TextoBiblioteca {
  // campos atuais
  tiposDocumento: TipoDocumento[]
}
```

Em cada item de `src/mocks/db.ts`, incluir `tiposDocumento`. Os modelos de Parecer/Laudo devem usar `['parecer', 'laudo']`; nenhum mock deve omitir a propriedade.

Em `src/pages/Biblioteca.tsx`, acrescentar `tiposDocumento: []` ao construtor `vazio()` para que novos textos permaneçam em `Uso geral` até a integração visual da Task 3.

- [ ] **Step 8: verificar backend e frontend tipado**

Run: `cd server && npm.cmd run prisma:generate && npm.cmd run smoke:biblioteca && npm.cmd run typecheck && npm.cmd run build`

Expected: oito verificações comportamentais PASS, seguidas de typecheck e build aprovados.

Run: `cd .. && npm.cmd run typecheck`

Expected: PASS após todos os mocks receberem `tiposDocumento`.

- [ ] **Step 9: commit do contrato**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/20260817_biblioteca_tipos_documento/migration.sql server/src/biblioteca.ts server/src/routes/textos.ts server/src/mappers.ts server/scripts/smoke-biblioteca.ts server/package.json src/types/index.ts src/mocks/db.ts src/pages/Biblioteca.tsx
git commit -m "feat(biblioteca): persiste tipos de documento"
```

---

### Task 2: Regras puras de categorias, contagens e contexto

**Files:**
- Create: `src/lib/biblioteca.ts`
- Create: `src/lib/biblioteca.test.ts`

**Interfaces:**
- Consumes: `TipoDocumento` and `TextoBiblioteca` from Task 1.
- Produces: `BibliotecaAtiva`, `BIBLIOTECAS_DOCUMENTO`, `filtrarTextosBiblioteca`, `contarTextosBiblioteca`, `tiposIniciaisNovoTexto` and `textoDisponivelNoContexto`.

- [ ] **Step 1: escrever testes falhos das regras**

Criar `src/lib/biblioteca.test.ts` com fixtures reais mínimas:

```ts
import { describe, expect, it } from 'vitest'
import type { TextoBiblioteca } from '@/types'
import {
  contarTextosBiblioteca,
  filtrarTextosBiblioteca,
  textoDisponivelNoContexto,
  tiposIniciaisNovoTexto,
} from './biblioteca'

const texto = (
  id: string,
  tiposDocumento: TextoBiblioteca['tiposDocumento'],
  secao: TextoBiblioteca['secao'] = 'analise',
): TextoBiblioteca => ({
  id,
  titulo: `Texto ${id}`,
  secao,
  tiposDocumento,
  tags: id === 'epi' ? ['epi'] : [],
  conteudo: `Conteúdo ${id}`,
  favorito: id === 'favorito',
  usos: id === 'usado' ? 8 : 0,
  criadoEm: '2026-08-17',
})

const textos = [
  texto('geral', []),
  texto('parecer', ['parecer']),
  texto('duplo', ['parecer', 'laudo'], 'conclusao'),
]

describe('biblioteca por documentos', () => {
  it('não duplica um texto multibiblioteca em Todos', () => {
    expect(filtrarTextosBiblioteca(textos, { biblioteca: 'todas' }).map((t) => t.id))
      .toEqual(['geral', 'parecer', 'duplo'])
  })

  it('separa Uso geral de Parecer', () => {
    expect(filtrarTextosBiblioteca(textos, { biblioteca: 'geral' }).map((t) => t.id))
      .toEqual(['geral'])
    expect(filtrarTextosBiblioteca(textos, { biblioteca: 'parecer' }).map((t) => t.id))
      .toEqual(['parecer', 'duplo'])
  })

  it('combina documento, seção e busca', () => {
    expect(filtrarTextosBiblioteca(textos, {
      biblioteca: 'parecer', secao: 'conclusao', busca: 'duplo',
    }).map((t) => t.id)).toEqual(['duplo'])
  })

  it('conta múltiplas categorias sem inflar Todos', () => {
    expect(contarTextosBiblioteca(textos)).toMatchObject({
      todas: 3, geral: 1, parecer: 2, laudo: 1,
    })
  })

  it('pré-seleciona somente uma categoria documental ativa', () => {
    expect(tiposIniciaisNovoTexto('laudo')).toEqual(['laudo'])
    expect(tiposIniciaisNovoTexto('todas')).toEqual([])
    expect(tiposIniciaisNovoTexto('geral')).toEqual([])
  })

  it('drawer combina tipo atual com gerais e seção', () => {
    expect(textoDisponivelNoContexto(textos[0], 'parecer', 'analise')).toBe(true)
    expect(textoDisponivelNoContexto(textos[1], 'parecer', 'analise')).toBe(true)
    expect(textoDisponivelNoContexto(textos[2], 'parecer', 'analise')).toBe(false)
    expect(textoDisponivelNoContexto(textos[1], 'laudo', 'analise')).toBe(false)
  })
})
```

- [ ] **Step 2: executar e confirmar a falha correta**

Run: `npm.cmd run test -- --run src/lib/biblioteca.test.ts`

Expected: FAIL porque `src/lib/biblioteca.ts` ainda não existe.

- [ ] **Step 3: implementar metadados e regras mínimas**

Criar `src/lib/biblioteca.ts`:

```ts
import type { SecaoTexto, TextoBiblioteca, TipoDocumento } from '@/types'

export type BibliotecaAtiva = 'todas' | 'geral' | TipoDocumento

export const BIBLIOTECAS_DOCUMENTO: ReadonlyArray<{
  value: Exclude<BibliotecaAtiva, 'todas' | 'geral'>
  label: string
  curto: string
}> = [
  { value: 'parecer', label: 'Parecer Técnico Pericial', curto: 'Parecer' },
  { value: 'laudo', label: 'Laudo Técnico Pericial', curto: 'Laudo' },
  { value: 'quesitos', label: 'Quesitos Técnicos', curto: 'Quesitos' },
  { value: 'manifestacao', label: 'Manifestação ao Laudo', curto: 'Manifestação' },
  { value: 'impugnacao', label: 'Impugnação de Laudos', curto: 'Impugnação' },
  { value: 'esclarecimento', label: 'Esclarecimentos Técnicos', curto: 'Esclarecimentos' },
]

const tiposDe = (texto: TextoBiblioteca) => texto.tiposDocumento ?? []

export function filtrarTextosBiblioteca(
  textos: TextoBiblioteca[],
  filtros: { biblioteca: BibliotecaAtiva; secao?: 'todas' | SecaoTexto; busca?: string },
): TextoBiblioteca[] {
  const q = filtros.busca?.toLowerCase().trim() ?? ''
  return textos
    .filter((texto) => {
      const tipos = tiposDe(texto)
      if (filtros.biblioteca === 'todas') return true
      if (filtros.biblioteca === 'geral') return tipos.length === 0
      return tipos.includes(filtros.biblioteca)
    })
    .filter((texto) => !filtros.secao || filtros.secao === 'todas' || texto.secao === filtros.secao)
    .filter((texto) => !q || [texto.titulo, texto.conteudo, ...texto.tags].join(' ').toLowerCase().includes(q))
    .sort((a, b) => Number(b.favorito) - Number(a.favorito) || b.usos - a.usos)
}

export function contarTextosBiblioteca(textos: TextoBiblioteca[]): Record<BibliotecaAtiva, number> {
  const contagens = Object.fromEntries(
    ['todas', 'geral', ...BIBLIOTECAS_DOCUMENTO.map((item) => item.value)].map((tipo) => [tipo, 0]),
  ) as Record<BibliotecaAtiva, number>
  contagens.todas = textos.length
  textos.forEach((texto) => {
    const tipos = tiposDe(texto)
    if (!tipos.length) contagens.geral += 1
    tipos.forEach((tipo) => { contagens[tipo] += 1 })
  })
  return contagens
}

export function tiposIniciaisNovoTexto(biblioteca: BibliotecaAtiva): TipoDocumento[] {
  return biblioteca === 'todas' || biblioteca === 'geral' ? [] : [biblioteca]
}

export function textoDisponivelNoContexto(
  texto: TextoBiblioteca,
  tipo?: TipoDocumento,
  secao?: SecaoTexto,
): boolean {
  const tipos = tiposDe(texto)
  const tipoCompativel = !tipo || !tipos.length || tipos.includes(tipo)
  const secaoCompativel = !secao || texto.secao === secao || texto.secao === 'generico'
  return tipoCompativel && secaoCompativel
}
```

- [ ] **Step 4: executar testes e refatorar mantendo verde**

Run: `npm.cmd run test -- --run src/lib/biblioteca.test.ts`

Expected: 6 testes PASS. Se a ordenação das fixtures interferir nos três primeiros testes, ajustar apenas os dados de `favorito/usos`, não remover a ordenação de produção.

- [ ] **Step 5: commit das regras puras**

```bash
git add src/lib/biblioteca.ts src/lib/biblioteca.test.ts
git commit -m "feat(biblioteca): adiciona filtros por documento"
```

---

### Task 3: Estante visual e edição das categorias

**Files:**
- Create: `src/components/BibliotecaCategorias.tsx`
- Create: `src/components/BibliotecaCategorias.test.tsx`
- Modify: `src/pages/Biblioteca.tsx`

**Interfaces:**
- Consumes: `BibliotecaAtiva`, `BIBLIOTECAS_DOCUMENTO`, `contarTextosBiblioteca`, `filtrarTextosBiblioteca` and `tiposIniciaisNovoTexto` from Task 2.
- Produces: `BibliotecaCategorias({ ativa, contagens, onChange })`.

- [ ] **Step 1: escrever teste DOM falho da estante**

Criar `src/components/BibliotecaCategorias.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BibliotecaCategorias } from './BibliotecaCategorias'

describe('BibliotecaCategorias', () => {
  it('expõe categorias, contagens e seleção acessível', async () => {
    const onChange = vi.fn()
    render(
      <BibliotecaCategorias
        ativa="parecer"
        contagens={{
          todas: 8, parecer: 3, laudo: 2, quesitos: 1,
          manifestacao: 0, impugnacao: 1, esclarecimento: 0, geral: 2,
        }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('button', { name: /Parecer.*3/ }).getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(screen.getByRole('button', { name: /Laudo.*2/ }))
    expect(onChange).toHaveBeenCalledWith('laudo')
  })
})
```

- [ ] **Step 2: executar e confirmar a falha correta**

Run: `npm.cmd run test -- --run src/components/BibliotecaCategorias.test.tsx`

Expected: FAIL porque o componente ainda não existe.

- [ ] **Step 3: implementar a estante acessível**

Criar o componente usando `BookOpen`, `FileText`, `FileCheck2`, `HelpCircle`, `MessageSquareText`, `ShieldAlert`, `ScrollText` e `LibraryBig` do Lucide. Renderizar todos os itens como botões dentro de uma região `aria-label="Bibliotecas por documento"`.

Cada botão deve conter:

```tsx
<button
  type="button"
  aria-pressed={ativa === item.value}
  aria-label={`${item.label}: ${contagens[item.value]} textos`}
  onClick={() => onChange(item.value)}
  className={cn(
    'group min-w-[150px] rounded-xl border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
    ativa === item.value
      ? 'border-navy-700 bg-navy-800 text-white shadow-sm'
      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50/50',
  )}
>
  {/* ícone, nome curto e contagem */}
</button>
```

Usar `overflow-x-auto`, `scroll-smooth` e `motion-reduce:scroll-auto`; a categoria ativa precisa de ícone, contraste e `aria-pressed`, não apenas cor.

- [ ] **Step 4: executar o teste DOM e confirmar verde**

Run: `npm.cmd run test -- --run src/components/BibliotecaCategorias.test.tsx`

Expected: PASS.

- [ ] **Step 5: escrever testes falhos para alternância de tipos no modal**

Ampliar `src/lib/biblioteca.test.ts` com uma função desejada:

```ts
import { alternarTipoDocumento } from './biblioteca'

it('adiciona e remove um tipo sem duplicar os demais', () => {
  expect(alternarTipoDocumento(['parecer'], 'laudo')).toEqual(['parecer', 'laudo'])
  expect(alternarTipoDocumento(['parecer', 'laudo'], 'parecer')).toEqual(['laudo'])
})
```

Run: `npm.cmd run test -- --run src/lib/biblioteca.test.ts`

Expected: FAIL porque `alternarTipoDocumento` não existe.

- [ ] **Step 6: implementar alternância e integrar a página**

Implementar:

```ts
export function alternarTipoDocumento(
  atuais: TipoDocumento[],
  tipo: TipoDocumento,
): TipoDocumento[] {
  return atuais.includes(tipo) ? atuais.filter((item) => item !== tipo) : [...atuais, tipo]
}
```

Em `src/pages/Biblioteca.tsx`:

- adicionar estado `biblioteca` iniciado em `todas`;
- obter `contagens` por `contarTextosBiblioteca(textos)`;
- substituir os filtros inline por `filtrarTextosBiblioteca`;
- renderizar `BibliotecaCategorias` acima da busca;
- ao criar, usar `tiposIniciaisNovoTexto(biblioteca)`;
- renderizar badges de documento ou `Uso geral` nos cartões;
- acrescentar ao modal um `fieldset` chamado `Bibliotecas do documento`, com seis checkboxes e texto “Sem seleção, este texto ficará disponível em Uso geral.”;
- alterar checkboxes com `alternarTipoDocumento`;
- manter título, seção, tags, conteúdo e ações existentes.

O estado vazio deve distinguir:

```tsx
description={
  busca || secao !== 'todas'
    ? 'Ajuste a busca ou os filtros para localizar outros textos.'
    : 'Cadastre o primeiro texto desta biblioteca documental.'
}
```

- [ ] **Step 7: executar testes e build do frontend**

Run: `npm.cmd run test -- --run src/lib/biblioteca.test.ts src/components/BibliotecaCategorias.test.tsx`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 8: commit da experiência principal**

```bash
git add src/lib/biblioteca.ts src/lib/biblioteca.test.ts src/components/BibliotecaCategorias.tsx src/components/BibliotecaCategorias.test.tsx src/pages/Biblioteca.tsx
git commit -m "feat(biblioteca): organiza textos em estante documental"
```

---

### Task 4: Inserção rápida contextual e documentação

**Files:**
- Modify: `src/components/BibliotecaDrawer.tsx`
- Create: `src/components/BibliotecaDrawer.test.tsx`
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `README.md`
- Modify: `src/pages/Ajuda.tsx`

**Interfaces:**
- Consumes: `textoDisponivelNoContexto` and `TipoDocumento`.
- Extends: `BibliotecaDrawer` with `tipoDocumento?: TipoDocumento`.

- [ ] **Step 1: escrever teste DOM falho do contexto**

Criar `src/components/BibliotecaDrawer.test.tsx`, mockando apenas `useApp` para devolver três textos: geral, Parecer e Laudo. Renderizar:

```tsx
render(
  <BibliotecaDrawer
    open
    onClose={vi.fn()}
    secao="analise"
    tipoDocumento="parecer"
    onInserir={vi.fn()}
  />,
)

expect(screen.queryByText('Texto geral')).not.toBeNull()
expect(screen.queryByText('Texto de parecer')).not.toBeNull()
expect(screen.queryByText('Texto de laudo')).toBeNull()
```

Depois clicar em `Mostrar toda a biblioteca` e esperar que o texto de Laudo apareça.

- [ ] **Step 2: executar e confirmar a falha correta**

Run: `npm.cmd run test -- --run src/components/BibliotecaDrawer.test.tsx`

Expected: FAIL porque `tipoDocumento` e o filtro conjunto ainda não existem.

- [ ] **Step 3: integrar o contexto ao drawer**

Adicionar prop:

```ts
tipoDocumento?: TipoDocumento
```

Substituir `apenasSecao` por `apenasContexto`. Quando ativo, filtrar com:

```ts
textoDisponivelNoContexto(texto, tipoDocumento, secao)
```

Usar o rótulo:

```tsx
{tipoDocumento || secao ? 'Somente para este documento e seção' : 'Filtrar por contexto'}
```

Com o filtro desligado, mostrar toda a Biblioteca e manter busca, favoritos, seleção múltipla e contagem de usos.

- [ ] **Step 4: informar o tipo em `PericiaEditor`**

No uso existente:

```tsx
<BibliotecaDrawer
  open={!!bibliotecaPara}
  onClose={() => setBibliotecaPara(null)}
  secao={bibliotecaPara?.secao}
  tipoDocumento={tipoDoc}
  onInserir={...}
/>
```

`tipoDoc` já é restrito a `'parecer' | 'laudo'`; não criar estado duplicado.

- [ ] **Step 5: executar teste, suíte e build**

Run: `npm.cmd run test -- --run src/components/BibliotecaDrawer.test.tsx`

Expected: PASS.

Run: `npm.cmd run test -- --run && npm.cmd run build`

Expected: todos os testes e build PASS.

- [ ] **Step 6: documentar o fluxo**

No `README.md`, acrescentar à Biblioteca:

- seis bibliotecas documentais e `Uso geral`;
- classificação múltipla sem duplicação;
- combinação com seção, busca e inserção contextual.

Em `src/pages/Ajuda.tsx`, atualizar a descrição do Módulo F para explicar que um trecho pode atender a vários documentos e que os antigos permanecem em `Uso geral`.

- [ ] **Step 7: commit do contexto e documentação**

```bash
git add src/components/BibliotecaDrawer.tsx src/components/BibliotecaDrawer.test.tsx src/pages/PericiaEditor.tsx README.md src/pages/Ajuda.tsx
git commit -m "feat(biblioteca): prioriza textos do documento aberto"
```

---

### Task 5: Revisão, produção e resumo para validação

**Files:**
- Modify only if findings require corrections.

**Interfaces:**
- Consumes all previous tasks.
- Produces verified GitHub/Coolify release and client-facing validation summary.

- [ ] **Step 1: revisar o diff completo**

Run: `git diff d942dcdf8aa0c6abd46b1507f5ea39217bf94de3..HEAD --check`

Revisar também:

- migração preserva linhas existentes;
- nenhum filtro duplica cartões;
- nenhuma rota perde `usuarioId`;
- drawer nunca insere automaticamente;
- controles possuem foco e nome acessível;
- nenhum segredo foi adicionado.

- [ ] **Step 2: executar verificação local completa**

Run: `npm.cmd ci && npm.cmd run test -- --run && npm.cmd run build`

Run no backend com `DATABASE_URL` e `JWT_SECRET` temporários apenas no processo:

```powershell
npm.cmd ci
npm.cmd run prisma:generate
npm.cmd run smoke:biblioteca
npm.cmd run smoke:pericia
npm.cmd run smoke:epis
npm.cmd run typecheck
npm.cmd run build
npm.cmd run smoke
```

Expected: todos PASS.

- [ ] **Step 3: teste manual local**

Validar no navegador:

1. abrir Biblioteca e alternar as oito categorias;
2. combinar categoria, seção e busca;
3. criar texto em Parecer, adicionar também Laudo e salvar;
4. confirmar um único cartão em `Todos` e o mesmo texto nas duas bibliotecas;
5. editar e remover uma associação;
6. abrir Parecer e confirmar no drawer textos de Parecer mais `Uso geral`;
7. desligar o filtro contextual e confirmar acesso às demais bibliotecas;
8. validar teclado e largura móvel.

- [ ] **Step 4: push para `main`**

Buscar o remoto, confirmar ausência de divergência e executar sem force:

```bash
git fetch origin
git rev-list --left-right --count origin/main...HEAD
git push origin HEAD:main
git ls-remote origin refs/heads/main
```

Expected: SHA remoto igual ao `HEAD` local.

- [ ] **Step 5: deploy compatível no Coolify**

1. acionar API e acompanhar até `finished`;
2. confirmar nos logs a aplicação de `20260817_biblioteca_tipos_documento`;
3. autenticar e verificar que `GET /api/textos` retorna `tiposDocumento` e que registros antigos possuem `[]`;
4. acionar frontend e acompanhar até `finished`;
5. confirmar ambos `running:healthy` no mesmo SHA.

- [ ] **Step 6: jornada de produção reversível**

Com uma sessão autenticada:

1. criar um texto de teste com `tiposDocumento: ['parecer', 'laudo']`;
2. recarregar e confirmar persistência;
3. editar para `['parecer']` e confirmar;
4. excluir o registro de teste;
5. confirmar site, `www`, `/api/saude` e bloqueio 401 sem sessão.

Nenhum documento ou texto real do cliente deve ser alterado.

- [ ] **Step 7: entregar resumo ao usuário**

O resumo deve conter:

- bibliotecas criadas;
- comportamento de múltiplas categorias e `Uso geral`;
- preservação dos textos existentes;
- busca, seção e drawer contextual;
- testes locais executados;
- SHA do GitHub;
- IDs e estado dos deploys;
- roteiro curto para o cliente validar visual e funcionalmente.
