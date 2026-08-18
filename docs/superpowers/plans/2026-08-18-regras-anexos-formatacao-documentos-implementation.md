# Regras por anexo e formatação dos documentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar “Agentes e riscos avaliados” específica por anexo da NR-15, calcular automaticamente a eficácia de protetores auditivos no Anexo 1 e padronizar preview, PDF e DOCX em Arial nos tamanhos aprovados.

**Architecture:** Um registro declarativo tipado será a fonte única das regras de campos, graus, unidades e cálculos de cada anexo. O cálculo auditivo será uma função pura compartilhada entre tela e documentos, enquanto o NRRsf será persistido como retrato do EPI. Os geradores continuarão independentes, mas consumirão os mesmos dados derivados e aplicarão a mesma hierarquia tipográfica.

**Tech Stack:** React 18, TypeScript 5.6, Vitest, Express, Zod, Prisma 5/PostgreSQL, Puppeteer, docx 9, Vite.

## Global Constraints

- O arquivo Word e a imagem são referências; somente as solicitações explícitas do usuário definem comportamento.
- Anexo 1 usa Ruído, Físico, Quantitativo, 85 dB(A)/8h e somente Médio — 20%.
- A medição do Anexo 1 é o único valor normativo digitado manualmente e o CAS não aparece.
- `nivelResultanteDb = medicaoDbA - (nivelProtecaoDb ?? 0)`; resultado `<= 85` é eficaz.
- EPIs múltiplos são alternativas calculadas separadamente; suas atenuações nunca são somadas.
- CA sem nível informado usa 0 dB no cálculo e mostra aviso explícito.
- PDF, DOCX e preview usam Arial: h1 18 pt, h2 14 pt, corpo/caixas 11 pt, tabelas 10 pt e h3 11 pt em negrito.
- Alterações de banco são aditivas e compatíveis com perícias antigas.
- A API deve ser implantada e validada antes do frontend.

---

### Task 1: Registro declarativo e cálculo puro da NR-15

**Files:**
- Create: `src/content/nr15/regrasAnexos.ts`
- Create: `src/lib/protecaoAuditiva.ts`
- Create: `src/lib/protecaoAuditiva.test.ts`
- Modify: `src/content/nr15/tipos.ts`
- Modify: `src/content/anexosNr15.ts`
- Modify: `src/lib/nr15.ts`
- Modify: `src/lib/nr15.test.ts`

**Interfaces:**
- Produces: `RegraAnexoNr15`, `obterRegraAnexo(anexoId)`, `camposDoAnexo(anexoId)`, `calcularProtecaoAuditiva(medicaoDbA, nivelProtecaoDb)`.
- Consumes: `AnexoNr15`, `AgenteAvaliado`, `GrauInsalubridade`, `UnidadeMedicao`.

- [ ] **Step 1: Escrever testes falhos das regras e do cálculo**

```ts
expect(obterRegraAnexo('ANEXO_1')).toMatchObject({
  agenteFixo: 'Ruído', tipoFixo: 'fisico', criterioFixo: 'quantitativo',
  limiteFixo: '85 dB(A) para jornada de 8h/dia', grausPermitidos: ['medio20'],
  unidadePadrao: 'dB(A)', exibeCas: false, calculo: 'ruido_nrrsf',
})
expect(calcularProtecaoAuditiva(90, 17)).toMatchObject({ resultadoDbA: 73, eficaz: true })
expect(calcularProtecaoAuditiva(99, 13)).toMatchObject({ resultadoDbA: 86, eficaz: false })
expect(calcularProtecaoAuditiva(99, null)).toMatchObject({ resultadoDbA: 99, eficaz: false, nivelInformado: false })
```

- [ ] **Step 2: Executar os testes e confirmar falha por interfaces ausentes**

Run: `npm test -- src/lib/nr15.test.ts src/lib/protecaoAuditiva.test.ts`
Expected: FAIL por módulos/funções ainda não existentes.

- [ ] **Step 3: Implementar tipos, registro e cálculo mínimo**

```ts
export type CalculoAnexo = 'nenhum' | 'comparacao_limite' | 'ruido_nrrsf'
export interface RegraAnexoNr15 {
  agenteFixo?: string
  tipoFixo?: TipoAgente
  criterioFixo?: CriterioAvaliacao
  limiteFixo?: string
  grausPermitidos: readonly GrauInsalubridade[]
  unidades: readonly UnidadeMedicao[]
  unidadePadrao?: UnidadeMedicao
  exibeCas: boolean
  exibeMedicao: boolean
  calculo: CalculoAnexo
}
export function calcularProtecaoAuditiva(medicaoDbA: number, nivelProtecaoDb?: number | null) {
  const atenuacaoDb = nivelProtecaoDb ?? 0
  const resultadoDbA = Number((medicaoDbA - atenuacaoDb).toFixed(2))
  return { medicaoDbA, atenuacaoDb, resultadoDbA, eficaz: resultadoDbA <= 85, nivelInformado: nivelProtecaoDb != null }
}
```

- [ ] **Step 4: Fazer `aplicarAnexo` limpar campos irrelevantes e aplicar valores fixos**

Ao trocar anexo, definir agente/tipo/critério/limite/grau/unidade pela regra e remover `cas` quando `exibeCas` for falso; preservar identificador, descrição e EPIs já válidos.

- [ ] **Step 5: Executar testes e typecheck**

Run: `npm test -- src/lib/nr15.test.ts src/lib/protecaoAuditiva.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/nr15 src/content/anexosNr15.ts src/lib/nr15.ts src/lib/nr15.test.ts src/lib/protecaoAuditiva.ts src/lib/protecaoAuditiva.test.ts
git commit -m "feat(nr15): centralizar regras e cálculo auditivo"
```

### Task 2: Persistência do NRRsf no catálogo e no retrato da perícia

**Files:**
- Create: `server/prisma/migrations/20260818120000_add_epi_nivel_protecao/migration.sql`
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/seed.ts`
- Modify: `server/src/routes/pericias.ts`
- Modify: `server/src/routes/epis.ts`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/scripts/smoke-epis.ts`
- Modify: `src/types/index.ts`
- Modify: `src/services/api.ts`

**Interfaces:**
- Consumes: `calcularProtecaoAuditiva` conceitualmente; backend mantém o retrato sem recalcular no CRUD.
- Produces: `EpiCatalogo.nivelProtecaoDb?: number | null`, `metodoAtenuacao?: 'NRRsf' | null` e os mesmos campos em `EpiSelecionado`.

- [ ] **Step 1: Ampliar o smoke para criar, consultar e atualizar nível de proteção**

```ts
assert.equal(criado.nivelProtecaoDb, 17)
assert.equal(criado.metodoAtenuacao, 'NRRsf')
assert.equal(listados.find((item) => item.id === criado.id)?.nivelProtecaoDb, 17)
```

- [ ] **Step 2: Executar smoke contra banco de desenvolvimento e confirmar falha de contrato**

Run: `cd server; npm run smoke:epis`
Expected: FAIL porque os campos ainda não são aceitos/devolvidos.

- [ ] **Step 3: Criar migração aditiva e atualizar Prisma/Zod/TypeScript**

```sql
ALTER TABLE "EpiCatalogo" ADD COLUMN "nivelProtecaoDb" DOUBLE PRECISION;
ALTER TABLE "EpiCatalogo" ADD COLUMN "metodoAtenuacao" TEXT;
```

Validar `nivelProtecaoDb` com `z.number().min(0).max(100).nullable().optional()` e `metodoAtenuacao` com `z.enum(['NRRsf']).nullable().optional()` tanto no catálogo quanto no retrato da perícia.

- [ ] **Step 4: Semear os dados aprovados pelo cliente de forma idempotente**

```ts
{ categoria: 'Proteção auditiva', ca: '11882', nivelProtecaoDb: 17, metodoAtenuacao: 'NRRsf', aplicacoes: ['ANEXO_1'] }
{ categoria: 'Proteção auditiva', ca: '18189', nivelProtecaoDb: 13, metodoAtenuacao: 'NRRsf', aplicacoes: ['ANEXO_1'] }
```

- [ ] **Step 5: Gerar cliente, migrar e repetir smoke/build**

Run: `cd server; npm run prisma:generate && npm run prisma:migrate -- --name add_epi_nivel_protecao && npm run smoke:epis && npm run build`
Expected: migração aplicada, smoke e build PASS.

- [ ] **Step 6: Commit**

```bash
git add server/prisma server/src server/scripts/smoke-epis.ts src/types/index.ts src/services/api.ts
git commit -m "feat(epis): persistir nivel de proteção NRRsf"
```

### Task 3: Formulário específico por anexo e avaliação auditiva automática

**Files:**
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `src/components/AgenteNr15Fields.tsx`
- Modify: `src/components/EpiSelector.tsx`
- Modify: `src/components/EpiSelector.test.tsx`
- Create: `src/components/AgenteNr15Fields.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `obterRegraAnexo`, `calcularProtecaoAuditiva`, `EpiSelecionado.nivelProtecaoDb`.
- Produces: formulário progressivo com valores fixos somente leitura e painel de resultado por EPI.

- [ ] **Step 1: Escrever testes de interface falhos**

```tsx
expect(screen.queryByLabelText(/CAS/i)).not.toBeInTheDocument()
expect(screen.getByDisplayValue('Médio — 20%')).toBeDisabled()
expect(screen.getByLabelText(/Medição registrada/i)).toHaveAttribute('inputmode', 'decimal')
expect(screen.getByText(/90 - 17 = 73 dB\(A\)/i)).toBeInTheDocument()
expect(screen.getByText(/proteção eficaz/i)).toBeInTheDocument()
```

- [ ] **Step 2: Executar testes e confirmar falha**

Run: `npm test -- src/components/AgenteNr15Fields.test.tsx src/components/EpiSelector.test.tsx`
Expected: FAIL porque o formulário atual ainda é genérico.

- [ ] **Step 3: Renderizar somente campos definidos pela regra**

No editor, ocultar CAS quando `exibeCas=false`; para graus fixos usar campo somente leitura; para graus variáveis mapear apenas `grausPermitidos`; ocultar medição em anexos qualitativos; manter seletores especializados dos anexos 11, 13 e 14.

- [ ] **Step 4: Ampliar o seletor de EPI**

Copiar `nivelProtecaoDb` e `metodoAtenuacao` para o retrato ao selecionar catálogo. Na entrada manual de proteção auditiva, mostrar campo numérico “NRRsf (dB)”; vazio permanece `null`.

- [ ] **Step 5: Exibir cálculo independente por protetor no Anexo 1**

```tsx
const resultado = calcularProtecaoAuditiva(Number(agente.valorMedido), epi.nivelProtecaoDb)
// Renderizar: “99 - 13 = 86 dB(A)” e badge “Proteção ineficaz”.
// Se !resultado.nivelInformado, renderizar “NRRsf não informado; considerado 0 dB”.
```

- [ ] **Step 6: Executar testes, typecheck e build**

Run: `npm test -- src/components/AgenteNr15Fields.test.tsx src/components/EpiSelector.test.tsx && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/PericiaEditor.tsx src/components src/index.css
git commit -m "feat(pericia): adaptar agentes às regras de cada anexo"
```

### Task 4: Modelo compartilhado para apresentação dos agentes

**Files:**
- Create: `src/lib/apresentacaoAgente.ts`
- Create: `src/lib/apresentacaoAgente.test.ts`
- Modify: `server/src/services/documento-comum.ts`

**Interfaces:**
- Produces: `montarLinhasAgente(agente): LinhaAgente[]` no frontend e espelho backend com `{ rotulo, valor, destaque? }`.
- Consumes: regras por anexo, retrato do EPI e cálculo auditivo.

- [ ] **Step 1: Escrever teste falho das linhas aplicáveis**

```ts
const linhas = montarLinhasAgente(ruidoComCa11882)
expect(linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'CAS' }))
expect(linhas).toContainEqual(expect.objectContaining({ rotulo: 'Cálculo', valor: '90 - 17 = 73 dB(A)' }))
expect(linhas).toContainEqual(expect.objectContaining({ rotulo: 'Conclusão', valor: 'Proteção eficaz' }))
```

- [ ] **Step 2: Executar e confirmar falha**

Run: `npm test -- src/lib/apresentacaoAgente.test.ts`
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar montagem determinística**

Gerar linhas de identificação, natureza, critério, limite, grau, medição e proteção somente quando aplicáveis. Para cada EPI do Anexo 1, acrescentar CA, NRRsf, cálculo, aviso quando ausente e conclusão.

- [ ] **Step 4: Espelhar a regra no backend sem depender do bundle frontend**

Adicionar funções puras equivalentes em `documento-comum.ts`, mantendo nomes e fórmulas idênticos e cobrindo entradas antigas sem `nivelProtecaoDb`.

- [ ] **Step 5: Executar testes e builds**

Run: `npm test -- src/lib/apresentacaoAgente.test.ts && npm run build && cd server && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/apresentacaoAgente.ts src/lib/apresentacaoAgente.test.ts server/src/services/documento-comum.ts
git commit -m "feat(documentos): estruturar apresentação dos agentes"
```

### Task 5: Preview e PDF em Arial com blocos compactos

**Files:**
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `src/components/DocumentoPreview.test.tsx`
- Modify: `src/index.css`
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/scripts/smoke-documentos.ts`

**Interfaces:**
- Consumes: linhas de apresentação da Task 4.
- Produces: preview e HTML de PDF semanticamente equivalentes.

- [ ] **Step 1: Escrever testes falhos de conteúdo e tipografia**

```ts
expect(html).toContain('font-family: Arial, sans-serif')
expect(html).toContain('font-size: 18pt')
expect(html).toContain('font-size: 14pt')
expect(html).toContain('font-size: 11pt')
expect(html).toContain('font-size: 10pt')
expect(html).toContain('90 - 17 = 73 dB(A)')
expect(html).not.toContain('<th>CAS</th>')
```

- [ ] **Step 2: Executar testes/smoke e confirmar falha**

Run: `npm test -- src/components/DocumentoPreview.test.tsx; cd server; npm run smoke`
Expected: pelo menos uma falha de fonte, tamanho ou tabela antiga.

- [ ] **Step 3: Substituir a tabela de sete colunas por blocos de duas colunas**

Renderizar um título por agente e uma tabela `Propriedade | Informação`, omitindo linhas vazias e não aplicáveis. Repetir blocos de proteção dentro do agente e manter quebras de página seguras.

- [ ] **Step 4: Aplicar a hierarquia tipográfica aprovada**

No CSS do preview e do HTML do servidor usar Arial; h1 18 pt, h2 14 pt, h3/corpo/box 11 pt e células/cabeçalhos de tabela 10 pt.

- [ ] **Step 5: Executar testes, smoke e build**

Run: `npm test -- src/components/DocumentoPreview.test.tsx && npm run build && cd server && npm run smoke && npm run build`
Expected: PASS e PDF gerado sem tabela horizontal de agentes.

- [ ] **Step 6: Commit**

```bash
git add src/components/DocumentoPreview.tsx src/components/DocumentoPreview.test.tsx src/index.css server/src/services/documento-html.ts server/scripts/smoke-documentos.ts
git commit -m "feat(pdf): aplicar tipografia e blocos de agentes"
```

### Task 6: DOCX em Arial e paridade de conteúdo

**Files:**
- Modify: `server/src/services/docx.ts`
- Modify: `server/scripts/smoke-documentos.ts`

**Interfaces:**
- Consumes: linhas derivadas no backend pela Task 4.
- Produces: DOCX com Arial e tamanhos em half-points: h1 36, h2 28, corpo/h3 22 e tabela 20.

- [ ] **Step 1: Ampliar smoke para inspecionar o XML do DOCX**

Descompactar o DOCX gerado no próprio script e verificar `w:rFonts w:ascii="Arial"`, `w:sz w:val="36"`, `28`, `22` e `20`, além da fórmula e conclusão do Anexo 1.

- [ ] **Step 2: Executar smoke e confirmar falha**

Run: `cd server; npm run smoke`
Expected: FAIL porque o gerador usa Times New Roman e tamanhos antigos.

- [ ] **Step 3: Atualizar estilos e tabela de agentes**

Definir `FONTE = 'Arial'`, `CORPO = 22`, estilos h1/h2/h3 nos valores aprovados e tabelas em 20 half-points. Substituir a grade horizontal pelos blocos de propriedades equivalentes ao PDF.

- [ ] **Step 4: Executar smoke e build do backend**

Run: `cd server; npm run smoke && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/docx.ts server/scripts/smoke-documentos.ts
git commit -m "feat(docx): alinhar tipografia e agentes ao parecer"
```

### Task 7: Regressão, revisão visual e compatibilidade

**Files:**
- Modify only if a failing test identifies a defect in files already listed.

**Interfaces:**
- Consumes: toda a funcionalidade das Tasks 1–6.
- Produces: evidência de compatibilidade e experiência responsiva.

- [ ] **Step 1: Executar toda a suíte frontend**

Run: `npm test && npm run typecheck && npm run build`
Expected: todos os testes PASS e build sem erros.

- [ ] **Step 2: Executar toda a suíte backend**

Run: `cd server; npm run typecheck && npm run build && npm run smoke && npm run smoke:api && npm run smoke:pericia && npm run smoke:epis && npm run smoke:biblioteca`
Expected: todos os comandos PASS.

- [ ] **Step 3: Validar manualmente no navegador**

Em viewport desktop e móvel: criar Anexo 1, registrar 90 dB(A), selecionar CA 11882, confirmar 73 dB(A)/eficaz; trocar para CA 18189 e 99 dB(A), confirmar 86 dB(A)/ineficaz; inserir EPI manual sem NRRsf e confirmar aviso/99 dB(A). Verificar CAS oculto, grau fixo, Anexo 11 com Agente/CAS e anexos qualitativos sem medição indevida.

- [ ] **Step 4: Gerar e inspecionar PDF e DOCX**

Confirmar visualmente Arial, hierarquia 18/14/11/10 pt, ausência de sobreposição de imagens, blocos compactos e cálculo completo de ruído.

- [ ] **Step 5: Revisar diff e corrigir apenas defeitos encontrados**

Run: `git diff --check && git status --short && git log --oneline -8`
Expected: sem whitespace inválido e somente alterações do escopo.

- [ ] **Step 6: Commit de correções de regressão, se houver**

```bash
git add -u
git commit -m "fix(nr15): corrigir regressões da validação final"
```

Se não houver correções, não criar commit vazio.

### Task 8: Publicação e verificação de produção

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: commits verificados da branch.
- Produces: `origin/main`, API e frontend de produção no mesmo commit.

- [ ] **Step 1: Confirmar branch limpa e registrar SHA**

Run: `git status --short --branch && git rev-parse HEAD`
Expected: branch limpa; guardar o SHA para conferir os deployments.

- [ ] **Step 2: Publicar a branch no GitHub como `main`**

Run: `git push origin HEAD:main`
Expected: push aceito e `git ls-remote origin refs/heads/main` igual ao SHA local.

- [ ] **Step 3: Implantar API e acompanhar até sucesso**

Disparar o deploy da aplicação API `qq4b71f64chmiwc8kgj6qkgd`, confirmar migração Prisma, health check HTTP 200 e versão/commit esperados. Em caso de falha, examinar logs, corrigir a causa no código, testar e publicar novo commit.

- [ ] **Step 4: Executar smoke autenticado em produção da API**

Criar perícia temporária com Anexo 1 e retrato NRRsf, consultar, gerar documentos e remover somente os dados temporários criados pelo smoke. Confirmar fórmula, status e compatibilidade do CRUD.

- [ ] **Step 5: Implantar frontend e acompanhar até sucesso**

Disparar o deploy da aplicação frontend `sphdvh6tw67r2mr4bi0afg2n`, confirmar status de sucesso e bundle correspondente ao SHA publicado.

- [ ] **Step 6: Fazer smoke final no domínio público**

Em `https://drpericiatrabalhista.com.br`, validar login, carregamento sem erro, edição do Anexo 1, cálculo 90-17=73, geração de PDF/DOCX e comportamento responsivo. Confirmar health da API após o teste.

- [ ] **Step 7: Registrar resultado final**

Informar ao usuário SHA do commit publicado, estado de API/frontend, verificações executadas e resumo objetivo das melhorias disponíveis para validação do cliente.
