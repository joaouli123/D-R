# CAS, Medições e EPIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estruturar CAS e medições dos agentes do Anexo 11, importar o catálogo recebido de respiradores e permitir associação manual de EPI/CA com sugestões por categoria em tela, PDF e DOCX.

**Architecture:** A base normativa permanece versionada no frontend, agora com CAS opcional e limites separados por unidade. O catálogo de EPIs será normalizado no PostgreSQL: cada configuração existe uma vez e possui vínculos independentes para anexos e categorias; a perícia guardará snapshots dos equipamentos selecionados dentro do JSON técnico para preservar documentos históricos. A interface filtrará por anexo e sugerirá equipamentos, mas somente uma ação explícita do usuário os associará ao agente.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Node.js, Fastify, Zod, Prisma 5, PostgreSQL, Puppeteer/PDF e `docx`.

## Global Constraints

- Importar somente números CAS existentes nos arquivos fornecidos pelo cliente.
- CAS ausente é válido e não deve impedir seleção ou salvamento.
- Não pesquisar CAS externamente nesta etapa.
- Não converter automaticamente ppm e mg/m³.
- Valor medido deve ser numérico e a unidade deve ser armazenada separadamente.
- Sugestão de EPI nunca equivale a seleção, fornecimento, validade, eficácia ou neutralização automática.
- Consolidar as três planilhas recebidas: 61 linhas válidas, 34 configurações exatas únicas por marca, modelo e CA, com aplicações independentes por anexo e categoria.
- Não duplicar equipamento para individualizar Anexos 11, 12 e 13; individualizar por vínculos e filtros.
- Preservar perícias antigas e medições textuais ambíguas sem perda silenciosa.
- Manter consistência entre tela, API, prévia, PDF e DOCX.
- Todo task deve terminar em commit próprio e revisão antes do próximo task.

---

## Mapa de arquivos e responsabilidades

- `src/content/nr15/tipos.ts`: contrato da referência normativa, incluindo CAS e limites por unidade.
- `src/content/nr15/anexo11.ts`: dados normativos e CAS presentes na planilha recebida.
- `src/lib/nr15.ts`: busca cruzada e aplicação da referência ao agente.
- `src/lib/medicoes.ts`: parsing compatível e validação de valor/unidade.
- `src/types/index.ts`: snapshots de medição e EPI usados no frontend.
- `server/prisma/schema.prisma`: catálogo persistente de EPI.
- `server/prisma/migrations/20260814_catalogo_epi/migration.sql`: estrutura normalizada e carga idempotente das configurações e aplicações.
- `server/src/routes/epis.ts`: consulta filtrável do catálogo.
- `server/src/routes/pericias.ts`: validação dos novos snapshots dentro de `tecnico.agentes`.
- `src/services/api.ts`: cliente da API de EPIs.
- `src/components/EpiSelector.tsx`: sugestões, pesquisa e confirmação manual.
- `src/pages/PericiaEditor.tsx`: edição integrada de agente, CAS, medição e EPIs.
- `src/components/DocumentoPreview.tsx`: visualização dos dados estruturados.
- `server/src/services/documento-comum.ts`: contratos e formatação compartilhada.
- `server/src/services/documento-html.ts`: saída HTML/PDF.
- `server/src/services/docx.ts`: saída DOCX.
- `server/scripts/smoke-documentos.ts`: regressão das saídas documentais.

---

### Task 1: Base do Anexo 11, CAS e medição estruturada

**Status:** concluído e revisado (`f54a8ed` e `f2e0722`).

**Files:**
- Modify: `src/content/nr15/tipos.ts`
- Modify: `src/content/nr15/anexo11.ts`
- Modify: `src/lib/nr15.ts`
- Create: `src/lib/medicoes.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/nr15.test.ts`
- Create: `src/lib/medicoes.test.ts`

**Interfaces:**
- Produces: `LimitesPorUnidade`, `normalizarNumeroMedido(valor: string): string | null`, `unidadesDisponiveis(referencia): UnidadeMedicao[]` e referências pesquisáveis por `cas`.
- Produces on `AgenteAvaliado`: `valorMedido?: string`, `unidadeMedicao?: UnidadeMedicao`, mantendo `medido?: string` para compatibilidade.

- [ ] **Step 1: escrever testes falhos de CAS, busca e unidades**

```ts
it('localiza a referência pelo CAS recebido', () => {
  expect(buscarReferenciasNr15('75-07-0')[0]).toMatchObject({ label: 'Acetaldeído', cas: '75-07-0' })
})

it('mantém agente sem CAS selecionável', () => {
  expect(SUBSTANCIAS_ANEXO_11.find((x) => x.label === 'Álcool terc-butílico')).toBeDefined()
})

it('separa unidades disponíveis sem converter valores', () => {
  expect(unidadesDisponiveis({ limites: { ppm: '78', 'mg/m³': '140' } })).toEqual(['ppm', 'mg/m³'])
})
```

- [ ] **Step 2: executar os testes e confirmar a falha**

Run: `npm.cmd run test -- --run src/lib/nr15.test.ts src/lib/medicoes.test.ts`

Expected: FAIL porque `cas`, `limites`, `unidadesDisponiveis` e `normalizarNumeroMedido` ainda não existem.

- [ ] **Step 3: criar os contratos estruturados**

```ts
export type UnidadeMedicao = 'ppm' | 'mg/m³' | '% O₂ em volume'
export type LimitesPorUnidade = Partial<Record<UnidadeMedicao, string>>

export interface ReferenciaNormativa {
  // campos existentes
  cas?: string
  limites?: LimitesPorUnidade
  categoriaProtecao?: string
}
```

Adicionar em `AgenteAvaliado`:

```ts
valorMedido?: string
unidadeMedicao?: UnidadeMedicao
epis?: EpiSelecionado[]
```

- [ ] **Step 4: importar somente os CAS presentes e preservar limites separados**

Adicionar `cas?: string` a `SubstanciaFonte`; preencher apenas linhas com CAS explícito na planilha. Mapear:

```ts
limites: {
  ...(item.ppm ? { ppm: item.ppm } : {}),
  ...(item.mgM3 ? { 'mg/m³': item.mgM3 } : {}),
},
cas: item.cas,
```

Não atribuir CAS a sinônimos “vide”; eles permanecem dentro de `sinonimos` da referência principal.

- [ ] **Step 5: implementar busca cruzada e parsing numérico compatível**

```ts
export function normalizarNumeroMedido(valor: string): string | null {
  const limpo = valor.trim().replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(limpo) ? limpo : null
}

export function unidadesDisponiveis(ref: Pick<ReferenciaNormativa, 'limites'>): UnidadeMedicao[] {
  return Object.keys(ref.limites ?? {}) as UnidadeMedicao[]
}
```

Incluir `referencia.cas` no índice normalizado de `buscarReferenciasNr15()` e copiar o CAS ao aplicar a referência.

- [ ] **Step 6: executar testes e builds**

Run: `npm.cmd run test -- --run src/lib/nr15.test.ts src/lib/medicoes.test.ts`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: commit**

```bash
git add src/content/nr15 src/lib/nr15.ts src/lib/nr15.test.ts src/lib/medicoes.ts src/lib/medicoes.test.ts src/types/index.ts
git commit -m "Estrutura CAS e medicoes do Anexo 11"
```

---

### Task 2: Catálogo normalizado de respiradores e aplicações

**Status:** concluído e revisado (`114df2e`, `7b0f047` e `97f9cbd`); execução da migração no PostgreSQL será comprovada no deploy.

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260814_catalogo_epi/migration.sql`
- Create: `server/src/catalogo-epis.ts`
- Create: `server/src/routes/epis.ts`
- Modify: `server/src/index.ts`
- Create: `server/scripts/smoke-epis.ts`
- Modify: `server/package.json`

**Interfaces:**
- Produces: `GET /epis?q=&categoria=&anexo=` retornando configurações únicas com aplicações filtradas.
- Produces: `sugerirEpis(categoriaProtecao, anexoId, itens): EpiCatalogo[]` como função pura testável.

- [ ] **Step 1: escrever smoke falho para catálogo e sugestões**

```ts
assert.equal(LINHAS_EPI_RECEBIDAS.length, 61)
assert.equal(configuracoesUnicas(LINHAS_EPI_RECEBIDAS).length, 34)
assert.deepEqual(
  separarCas('4115 / 5635'),
  { caPecaFacial: '4115', caFiltroCartucho: '5635', caUnico: null },
)
assert.deepEqual(
  separarCas('5657'),
  { caPecaFacial: null, caFiltroCartucho: null, caUnico: '5657' },
)
```

- [ ] **Step 2: executar e confirmar a falha**

Run: `cd server && npm.cmd run smoke:epis`

Expected: FAIL porque o script, os dados e `separarCas` ainda não existem.

- [ ] **Step 3: criar modelo Prisma e migração**

```prisma
model EpiCatalogo {
  id                String   @id @default(uuid())
  chave             String   @unique
  modelo            String
  marca              String
  caUnico            String?
  caPecaFacial       String?
  caFiltroCartucho   String?
  observacao         String?
  ativo              Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  aplicacoes         EpiAplicacao[]

  @@map("epis_catalogo")
}

model EpiAplicacao {
  id          String @id @default(uuid())
  epiId       String
  anexo       String
  categoria   String
  epi         EpiCatalogo @relation(fields: [epiId], references: [id], onDelete: Cascade)

  @@unique([epiId, anexo, categoria])
  @@index([anexo, categoria])
  @@map("epis_aplicacoes")
}
```

A migração deve criar as duas tabelas, consolidar cada configuração por marca + modelo + CAs e inserir aplicações independentes para cada combinação de anexo e categoria. `chave` será a concatenação normalizada e estável de marca, modelo e CAs; usar `ON CONFLICT (chave) DO UPDATE` e `ON CONFLICT (epiId, anexo, categoria) DO NOTHING` para manter idempotência mesmo quando algum CA for nulo.

- [ ] **Step 4: criar catálogo tipado e regra de sugestão**

```ts
export function sugerirEpis(categoria: string | undefined, anexo: string, itens: EpiCatalogoComAplicacoes[]) {
  return itens
    .filter((item) => item.ativo && item.aplicacoes.some((a) => a.anexo === anexo))
    .sort((a, b) => {
      const categoriasA = a.aplicacoes.filter((x) => x.anexo === anexo).map((x) => x.categoria)
      const categoriasB = b.aplicacoes.filter((x) => x.anexo === anexo).map((x) => x.categoria)
      const pa = categoriasA.includes(categoria ?? '') ? 0 : categoriasA.includes('Multigases') ? 1 : 2
      const pb = categoriasB.includes(categoria ?? '') ? 0 : categoriasB.includes('Multigases') ? 1 : 2
      return pa - pb || a.modelo.localeCompare(b.modelo, 'pt-BR')
    })
}
```

- [ ] **Step 5: expor endpoint validado e registrá-lo no servidor**

Aceitar `q`, `categoria` e `anexo` como strings opcionais; filtrar apenas registros ativos; aplicar `anexo` e `categoria` sobre `EpiAplicacao`; limitar a 100 configurações únicas; pesquisar `modelo`, `marca`, categorias e os três campos de CA sem interpolar SQL manual.

- [ ] **Step 6: executar Prisma, typecheck, build e smoke**

Run: `cd server && npm.cmd run prisma:generate && npm.cmd run typecheck && npm.cmd run build && npm.cmd run smoke:epis`

Expected: 61 linhas de origem consolidadas em 34 configurações exatas únicas, vínculos separados para Anexos 11, 12 e 13, duplicidades de categoria preservadas como aplicações e separação correta dos CAs duplos.

- [ ] **Step 7: commit**

```bash
git add server/prisma server/src/catalogo-epis.ts server/src/routes/epis.ts server/src/index.ts server/scripts/smoke-epis.ts server/package.json
git commit -m "Adiciona catalogo de respiradores e CAs"
```

---

### Task 3: Persistência compatível dos EPIs e medições na perícia

**Status:** concluído e revisado (`976b3e8` e `21c7168`).

**Files:**
- Modify: `server/src/routes/pericias.ts`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/scripts/smoke-validacao-pericia.ts`
- Modify: `server/scripts/smoke-api.ts`

**Interfaces:**
- Consumes: `UnidadeMedicao` e snapshot `EpiSelecionado` definidos no Task 1.
- Produces: payload validado com `valorMedido`, `unidadeMedicao` e `epis[]`, preservando `medido` legado.

- [ ] **Step 1: adicionar casos falhos ao smoke de validação**

```ts
const epi = {
  catalogoId: 'epi-1', categoria: 'Vapores Orgânicos', modelo: '3M 6200 + Cartucho 3M 6001',
  marca: '3M', caPecaFacial: '4115', caFiltroCartucho: '5635',
}
assert.equal(schema.safeParse({ ...agente, valorMedido: '12.5', unidadeMedicao: 'ppm', epis: [epi] }).success, true)
assert.equal(schema.safeParse({ ...agente, valorMedido: 'doze', unidadeMedicao: 'ppm' }).success, false)
```

- [ ] **Step 2: executar e confirmar a falha**

Run: `cd server && npm.cmd run smoke:pericia`

Expected: FAIL porque o schema ainda descarta ou não valida os campos.

- [ ] **Step 3: ampliar o schema Zod sem remover campos legados**

```ts
const epiSelecionadoSchema = z.object({
  catalogoId: texto.optional(), categoria: texto, modelo: texto, marca: texto,
  caUnico: texto.optional(), caPecaFacial: texto.optional(), caFiltroCartucho: texto.optional(),
  observacao: texto.optional(),
})

valorMedido: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
unidadeMedicao: z.enum(['ppm', 'mg/m³', '% O₂ em volume']).optional(),
epis: z.array(epiSelecionadoSchema).max(10).default([]),
```

Manter `medido: texto.optional()` para registros antigos.

- [ ] **Step 4: atualizar contrato documental comum**

Adicionar os mesmos campos ao `TecnicoJson.agentes`, usando propriedades opcionais para compatibilidade.

- [ ] **Step 5: executar smokes e build**

Run: `cd server && npm.cmd run smoke:pericia && npm.cmd run typecheck && npm.cmd run build`

Expected: casos novo e legado aprovados; texto não numérico rejeitado apenas no campo novo.

- [ ] **Step 6: commit**

```bash
git add server/src/routes/pericias.ts server/src/services/documento-comum.ts server/scripts/smoke-validacao-pericia.ts server/scripts/smoke-api.ts
git commit -m "Persiste medicoes e EPIs dos agentes"
```

---

### Task 4: Interface de busca cruzada, unidades e seleção de EPI

**Status:** concluído e revisado (`14ee70f`, `1f56d3d` e `3dc7fa1`).

**Files:**
- Modify: `src/services/api.ts`
- Create: `src/components/EpiSelector.tsx`
- Modify: `src/components/BuscaNormativa.tsx`
- Modify: `src/components/AgenteNr15Fields.tsx`
- Modify: `src/pages/PericiaEditor.tsx`
- Create: `src/components/EpiSelector.test.tsx`
- Modify: `src/lib/nr15.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `GET /epis`, `dadosPapel` não relacionado, `unidadesDisponiveis`, referências com `cas` e `limites`.
- Produces: `EpiSelector({ agente, onChange })` que só altera `agente.epis` após clique explícito.

- [ ] **Step 1: instalar infraestrutura mínima de teste DOM**

Run: `npm.cmd install --save-dev @testing-library/react@16.1.0 @testing-library/user-event@14.5.2 jsdom@25.0.1`

Adicionar `// @vitest-environment jsdom` no topo do teste e importar `render`, `screen` e `userEvent` diretamente; não criar configuração global que afete os testes puros existentes.

- [ ] **Step 2: escrever testes falhos da interação**

Cobrir:

```ts
expect(screen.getByRole('option', { name: /Acetaldeído.*75-07-0/ })).toBeVisible()
expect(onChange).not.toHaveBeenCalled() // somente carregar sugestões não seleciona
await user.click(screen.getByRole('button', { name: /Adicionar 3M 6200/ }))
expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ epis: [expect.objectContaining({ modelo: expect.stringContaining('3M 6200') })] }))
```

- [ ] **Step 3: executar e confirmar a falha**

Run: `npm.cmd run test -- --run src/components/EpiSelector.test.tsx src/lib/nr15.test.ts`

Expected: FAIL porque o componente e a renderização CAS ainda não existem.

- [ ] **Step 4: implementar cliente e seletor de EPI**

O componente deve exibir sugestões primeiro, permitir pesquisa, mostrar CAs separados, adicionar apenas por botão e remover snapshots já associados. Estado de loading, erro e lista vazia devem manter a entrada manual disponível.

- [ ] **Step 5: ajustar busca do agente e CAS**

Mostrar `Agente — CAS` quando houver CAS; aceitar a consulta digitada no mesmo componente; ao selecionar, usar `selecionarReferenciaNr15` para preencher ambos.

- [ ] **Step 6: substituir medição textual por número e unidade**

Renderizar `Input` com `inputMode="decimal"` e validação por `normalizarNumeroMedido`. Renderizar `Select` com `unidadesDisponiveis(ref)`. O limite deve ser somente leitura e derivado de `ref.limites[unidade]`. Se o agente for legado e `medido` for ambíguo, mostrar aviso e conservar o conteúdo até correção explícita.

- [ ] **Step 7: integrar `EpiSelector` ao cartão do agente**

Montar o seletor abaixo dos dados quantitativos e acima da indicação `epiEficaz`, sem marcar eficácia ao adicionar equipamento.

- [ ] **Step 8: executar testes, typecheck e build**

Run: `npm.cmd run test -- --run && npm.cmd run build`

Expected: PASS e nenhum erro TypeScript.

- [ ] **Step 9: commit**

```bash
git add package.json package-lock.json src/services/api.ts src/components/EpiSelector.tsx src/components/EpiSelector.test.tsx src/components/BuscaNormativa.tsx src/components/AgenteNr15Fields.tsx src/pages/PericiaEditor.tsx src/lib/nr15.test.ts
git commit -m "Integra CAS unidades e EPIs ao editor"
```

---

### Task 5: Prévia, PDF e DOCX

**Status:** concluído e revisado (`74609de`, `e2cc2ee` e `7454ff1`); PDF inspecionado visualmente e DOCX validado por estrutura OOXML.

**Files:**
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/src/services/docx.ts`
- Modify: `server/scripts/smoke-documentos.ts`

**Interfaces:**
- Consumes: snapshots de medição e `EpiSelecionado[]` persistidos nos tasks anteriores.
- Produces: `formatarMedicao(agente): string` e `formatarCasEpi(epi): string[]` compartilhados pelos geradores de servidor.

- [ ] **Step 1: adicionar fixtures e asserts documentais falhos**

Usar fixture com `12.5 ppm`, limite `78 ppm`, um EPI de CA duplo e um PFF de CA único. Verificar no HTML:

```ts
assert.match(html, /12,5 ppm/)
assert.match(html, /Limite de Tolerância.*78 ppm/s)
assert.match(html, /CA da peça facial: 4115/)
assert.match(html, /CA do cartucho\/filtro: 5635/)
assert.doesNotMatch(html, /undefined|null/)
```

- [ ] **Step 2: executar smoke e confirmar falha**

Run: `cd server && $env:DATABASE_URL='postgresql://test:test@localhost:5432/test'; $env:JWT_SECRET='test-only-secret-at-least-32-characters'; npm.cmd run smoke`

Expected: FAIL nos novos asserts.

- [ ] **Step 3: implementar formatação comum**

```ts
export function formatarMedicao(a: AgenteDocumento): string {
  if (a.valorMedido && a.unidadeMedicao) return `${a.valorMedido.replace('.', ',')} ${a.unidadeMedicao}`
  return a.medido?.trim() || '—'
}
```

Formatar CA único como `CA: 5657`; CA duplo em rótulos independentes.

- [ ] **Step 4: atualizar as três saídas**

Na prévia, HTML/PDF e DOCX, incluir medição, limite da unidade escolhida e uma lista de EPIs associados. Omitir bloco de EPI quando vazio; nunca usar dados atuais do catálogo para reescrever snapshots históricos.

- [ ] **Step 5: executar smoke, testes e builds**

Run: `cd server && npm.cmd run smoke && npm.cmd run typecheck && npm.cmd run build`

Run: `cd .. && npm.cmd run test -- --run && npm.cmd run build`

Expected: todas as saídas e builds aprovados.

- [ ] **Step 6: commit**

```bash
git add src/components/DocumentoPreview.tsx server/src/services/documento-comum.ts server/src/services/documento-html.ts server/src/services/docx.ts server/scripts/smoke-documentos.ts
git commit -m "Exibe medicoes e CAs nos documentos"
```

---

### Task 6: Verificação integrada, documentação e deploy

**Status:** em fechamento. Validações locais, revisão final, publicação e evidências de produção são registradas conforme executadas.

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-14-cas-medicoes-epis-implementation.md`

**Interfaces:**
- Consumes: todos os contratos e rotas anteriores.
- Produces: branch pronta para `main`, migração implantável e evidências de produção.

- [x] **Step 1: executar suíte completa local**

Run: `npm.cmd ci && npm.cmd run test -- --run && npm.cmd run build`

Run: `cd server && npm.cmd ci && npm.cmd run prisma:generate && npm.cmd run typecheck && npm.cmd run build && npm.cmd run smoke:pericia && npm.cmd run smoke:epis`

Run documental com `DATABASE_URL` e `JWT_SECRET` de teste, sem registrar segredos em arquivo.

Expected: todos os comandos PASS.

- [ ] **Step 2: validar migração em banco temporário PostgreSQL**

Aplicar `prisma migrate deploy` em banco descartável, executar novamente e confirmar idempotência da carga com `SELECT count(*) FROM epis_catalogo` igual a 34 e nenhuma duplicidade em `epis_aplicacoes` para `(epiId, anexo, categoria)`.

- [x] **Step 3: realizar teste manual da jornada**

Criar uma perícia de teste, selecionar agente por nome e por CAS, trocar a unidade, informar somente número, adicionar e remover EPI, salvar, recarregar e gerar PDF/DOCX. Confirmar que sugestões não são selecionadas automaticamente e que um agente sem CAS funciona.

Jornada local aprovada no aplicativo real com API simulada: login, seleção por CAS `75-07-0`, preenchimento de Acetaldeído/CAS, troca para `mg/m³`, normalização de `12,5` para `12.5`, associação manual de respirador/CA e marcação independente de eficácia, sem erros no console. A API simulada reinicia os dados ao recarregar; a persistência e a geração documental foram verificadas pelos contratos/smokes automatizados e serão confirmadas na API e no PostgreSQL de produção após o deploy.

- [x] **Step 4: atualizar README e checklist do plano**

Documentar catálogo, comportamento de CAS incompleto, ausência de conversão ppm/mg/m³ e comando `npm run smoke:epis`. Marcar os steps realmente concluídos neste plano.

- [x] **Step 5: revisão final do diff**

Revisar `git diff 23bb7d9..HEAD` para segurança, compatibilidade, migração, dados recebidos e consistência documental. Corrigir achados P0–P2 antes de prosseguir.

Revisão concluída. Foram corrigidos: priorização conservadora por categoria do agente (`5734db0`), remoção de unidade estruturada vazia antes do salvamento (`050493f`) e exibição explícita da eficácia dos EPIs na prévia, PDF e DOCX (`0a05366`).

- [x] **Step 6: commit final de documentação**

```bash
git add README.md docs/superpowers/plans/2026-08-14-cas-medicoes-epis-implementation.md
git commit -m "Documenta integracao de CAS medicoes e EPIs"
```

- [ ] **Step 7: push e deploy**

Enviar `HEAD:main`, confirmar o SHA remoto, acionar deploy forçado da API e do frontend no Coolify e acompanhar ambos até `finished`.

- [ ] **Step 8: validar produção**

Confirmar HTTP 200 na aplicação e em `/api/saude`; testar autenticação e a jornada principal em produção; registrar no relatório final SHA, IDs dos deploys e resultados observados.
