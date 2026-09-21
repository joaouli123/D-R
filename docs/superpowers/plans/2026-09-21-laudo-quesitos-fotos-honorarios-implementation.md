# Laudo Pericial Quesitos Fotografias e Honorários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o Laudo Técnico registre quesitos por origem, fotografias vinculadas a cada agente e uma proposta de honorários em reais e por extenso, preservando Pareceres e perícias antigas.

**Architecture:** Os textos e o valor dos honorários permanecem no JSON `tecnico` da perícia, porque pertencem ao conteúdo editável do laudo. As fotografias continuam no modelo relacional `Foto`, acrescido de `agenteId` anulável, e reutilizam o pipeline atual de upload. Prévia React, HTML/PDF e DOCX consomem os mesmos campos e aplicam a mesma ordem de seções.

**Tech Stack:** React 18, TypeScript, Vitest, Express, Zod, Prisma/PostgreSQL, `docx`, Puppeteer e Tailwind CSS.

## Global Constraints

- Os novos blocos aparecem somente quando `tipoDoc === 'laudo'` ou `DocumentoGerado.tipo === 'laudo'`.
- O Parecer Técnico e documentos antigos permanecem visual e semanticamente inalterados.
- Quebras de linha, parágrafos e numeração digitada devem sobreviver à prévia, ao PDF e ao DOCX.
- Fotos antigas sem `agenteId` continuam nas seções atuais.
- Nenhum documento final pode conter os marcadores `[VALOR]` ou `[VALOR POR EXTENSO]`.
- Cada alteração comportamental segue RED → GREEN e termina em commit próprio.

---

### Task 1: Contrato persistido do Laudo

**Files:**
- Modify: `src/types/index.ts:353-415`
- Modify: `server/src/routes/esquemas-pericia.ts:120-155`
- Modify: `server/prisma/schema.prisma:208-230`
- Create: `server/prisma/migrations/20260921120000_fotos_por_agente/migration.sql`
- Modify: `server/src/mappers.ts:123-131`
- Modify: `server/src/routes/pericias.ts:89-93`
- Test: `server/src/routes/esquemas-pericia.test.ts`
- Test: `server/src/mappers.test.ts`

**Interfaces:**
- Produces: `PreenchimentoTecnico.quesitosJuizo?: string`, `quesitosReclamante?: string`, `quesitosReclamada?: string`, `honorariosPericiaisCentavos?: number`.
- Produces: `Foto.agenteId?: string` e coluna PostgreSQL `fotos.agenteId TEXT NULL`.
- Consumes: `AgenteAvaliado.id` como chave estável dentro de `tecnico.agentes`.

- [ ] **Step 1: Write failing schema and mapper tests**

```ts
it('preserva os campos exclusivos do laudo', () => {
  const tecnico = tecnicoSchema.parse({
    ...TECNICO_VALIDO,
    quesitosJuizo: '1. Informe...\nResposta: Sim.',
    quesitosReclamante: 'Não apresentado',
    quesitosReclamada: '',
    honorariosPericiaisCentavos: 450000,
  })
  expect(tecnico).toMatchObject({
    quesitosJuizo: expect.stringContaining('Resposta'),
    quesitosReclamante: 'Não apresentado',
    honorariosPericiaisCentavos: 450000,
  })
})

it('expõe o vínculo opcional da fotografia com o agente', () => {
  expect(periciaParaApi(PERICIA_COM_FOTO).fotos[0]).toMatchObject({ agenteId: 'ag-ruido' })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- server/src/routes/esquemas-pericia.test.ts server/src/mappers.test.ts --maxWorkers=1 --minWorkers=1`

Expected: FAIL porque o Zod remove os quatro campos e o mapper não devolve `agenteId`.

- [ ] **Step 3: Add optional fields and migration**

```ts
// src/types/index.ts
quesitosJuizo?: string
quesitosReclamante?: string
quesitosReclamada?: string
honorariosPericiaisCentavos?: number

// Foto
agenteId?: UUID
```

```ts
// server/src/routes/esquemas-pericia.ts
quesitosJuizo: texto.optional(),
quesitosReclamante: texto.optional(),
quesitosReclamada: texto.optional(),
honorariosPericiaisCentavos: z.number().int().min(0).max(100_000_000_00).optional(),
```

```sql
ALTER TABLE "fotos" ADD COLUMN "agenteId" TEXT;
CREATE INDEX "fotos_periciaId_agenteId_idx" ON "fotos"("periciaId", "agenteId");
```

Add `agenteId String?` and `@@index([periciaId, agenteId])` to `Foto`; include the field in `periciaParaApi` and in the lightweight `fotos` payload schema.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- server/src/routes/esquemas-pericia.test.ts server/src/mappers.test.ts --maxWorkers=1 --minWorkers=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts server/src/routes/esquemas-pericia.ts server/prisma/schema.prisma server/prisma/migrations/20260921120000_fotos_por_agente/migration.sql server/src/mappers.ts server/src/routes/pericias.ts server/src/routes/esquemas-pericia.test.ts server/src/mappers.test.ts
git commit -m "feat(laudo): persistir quesitos honorários e fotos por agente"
```

### Task 2: Quesitos separados por origem

**Files:**
- Create: `src/lib/quesitosLaudo.ts`
- Modify: `src/pages/PericiaEditor.tsx:2168-2258`
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `server/src/services/documento-comum.ts:1480-1513`
- Modify: `server/src/services/documento-html.ts:810-818`
- Modify: `server/src/services/docx.ts:1110-1118`
- Test: `src/pages/PericiaEditor.feedback.test.tsx`
- Test: `src/components/DocumentoPreview.test.tsx`
- Test: `server/src/services/documento-parecer.test.ts`
- Test: `server/src/services/docx-parecer.test.ts`

**Interfaces:**
- Consumes: the three optional fields from Task 1.
- Produces: helper `gruposQuesitosDoLaudo(tecnico)` returning non-empty groups in Juízo → Reclamante → Reclamada order.

- [ ] **Step 1: Write failing UI and renderer tests**

```ts
it('oferece três respostas independentes apenas no laudo', async () => {
  renderEditor('/pericias/nova?tipo=laudo')
  await irParaConclusao()
  expect(screen.getByText('Quesitos do Juízo')).toBeDefined()
  expect(screen.getByText('Quesitos do Reclamante')).toBeDefined()
  expect(screen.getByText('Quesitos da Reclamada')).toBeDefined()
  fireEvent.click(screen.getAllByRole('button', { name: 'Não apresentado' })[1])
  expect(screen.getAllByRole('textbox').some((campo) => campo.getAttribute('value') === 'Não apresentado')).toBe(true)
})

it('imprime os grupos preenchidos na ordem jurídica', () => {
  const html = renderDocumento(periciaComQuesitos, { tipoDocumento: 'laudo' })
  expect(html.indexOf('QUESITOS DO JUÍZO')).toBeLessThan(html.indexOf('QUESITOS DO RECLAMANTE'))
  expect(html).not.toContain('QUESITOS DA RECLAMADA')
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/pages/PericiaEditor.feedback.test.tsx src/components/DocumentoPreview.test.tsx server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts --maxWorkers=1 --minWorkers=1`

Expected: FAIL porque só existe `respostasQuesitos`.

- [ ] **Step 3: Implement shared grouping and editor cards**

```ts
export function gruposQuesitosDoLaudo(t: PreenchimentoTecnico) {
  return [
    { titulo: 'Quesitos do Juízo', texto: t.quesitosJuizo?.trim() },
    { titulo: 'Quesitos do Reclamante', texto: t.quesitosReclamante?.trim() },
    { titulo: 'Quesitos da Reclamada', texto: t.quesitosReclamada?.trim() },
  ].filter((grupo): grupo is { titulo: string; texto: string } => Boolean(grupo.texto))
}
```

Create three compact cards only when `tipoDoc === 'laudo'`; each `Textarea` writes only its own key and its quick action sets exactly that key to `Não apresentado`. Keep a legacy card for `respostasQuesitos` when it already contains text.

Use one numbered section **RESPOSTAS AOS QUESITOS TÉCNICOS** and `h3`/`<h3>` subtitles for each non-empty group in Preview, HTML and DOCX. Paragraph helpers must continue splitting on blank lines.

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PericiaEditor.tsx src/components/DocumentoPreview.tsx src/lib/quesitosLaudo.ts server/src/services/documento-comum.ts server/src/services/documento-html.ts server/src/services/docx.ts src/pages/PericiaEditor.feedback.test.tsx src/components/DocumentoPreview.test.tsx server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts
git commit -m "feat(laudo): separar respostas aos quesitos por origem"
```

### Task 3: Valor dos honorários e número por extenso

**Files:**
- Create: `src/lib/honorarios.ts`
- Create: `src/lib/honorarios.test.ts`
- Create: `server/src/services/honorarios.ts`
- Create: `server/src/services/honorarios.test.ts`
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/src/services/docx.ts`
- Test: `server/src/services/documento-parecer.test.ts`
- Test: `server/src/services/docx-parecer.test.ts`

**Interfaces:**
- Produces in both runtimes: `formatarReais(centavos: number): string` and `reaisPorExtenso(centavos: number): string`.
- Consumes: `honorariosPericiaisCentavos` from Task 1 and document type.

- [ ] **Step 1: Write failing money tests**

```ts
it.each([
  [450000, 'R$ 4.500,00', 'quatro mil e quinhentos reais'],
  [100001, 'R$ 1.000,01', 'mil reais e um centavo'],
  [250, 'R$ 2,50', 'dois reais e cinquenta centavos'],
])('formata %d centavos', (centavos, moeda, extenso) => {
  expect(formatarReais(centavos)).toBe(moeda)
  expect(reaisPorExtenso(centavos)).toBe(extenso)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/lib/honorarios.test.ts server/src/services/honorarios.test.ts --maxWorkers=1 --minWorkers=1`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement deterministic BRL formatting and wording**

Implement integer groups from zero to 999, then compose thousands and millions. Handle `100` as `cem`, `1_000` as `mil`, singular/plural real and centavo, and reject negative/non-integer input with `RangeError`.

```ts
export const formatarReais = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
```

The frontend input accepts digits and punctuation, normalizes to cents, displays the formatted amount on blur, and writes only the integer to the persisted model.

- [ ] **Step 4: Add failing renderer tests, then implement the section**

```ts
expect(htmlLaudo).toContain('DOS HONORÁRIOS PERICIAIS')
expect(htmlLaudo).toContain('R$ 4.500,00 (quatro mil e quinhentos reais)')
expect(htmlParecer).not.toContain('DOS HONORÁRIOS PERICIAIS')
expect(htmlLaudoSemValor).not.toContain('[VALOR]')
```

Insert the section after **ENCERRAMENTO** content and before final availability sentence/date/signature. Use the exact two paragraphs approved in the design spec.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- src/lib/honorarios.test.ts server/src/services/honorarios.test.ts src/components/DocumentoPreview.test.tsx server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts --maxWorkers=1 --minWorkers=1`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/honorarios.ts src/lib/honorarios.test.ts server/src/services/honorarios.ts server/src/services/honorarios.test.ts src/pages/PericiaEditor.tsx src/components/DocumentoPreview.tsx server/src/services/documento-comum.ts server/src/services/documento-html.ts server/src/services/docx.ts server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts
git commit -m "feat(laudo): gerar proposta de honorários periciais"
```

### Task 4: Upload vinculado ao agente

**Files:**
- Modify: `src/services/api.ts:788-830`
- Modify: `server/src/routes/fotos.ts`
- Modify: `server/src/routes/fotos.test.ts`
- Modify: `server/src/services/fotos-pericia.ts`
- Test: `src/services/api.test.ts`

**Interfaces:**
- Changes: `fotos.enviar(periciaId, secao, arquivos, agenteId?)`.
- Produces: API multipart field `agenteId` and response `Foto.agenteId`.

- [ ] **Step 1: Write failing route and client tests**

```ts
it('envia o id do agente no multipart', async () => {
  await fotos.enviar('per-1', 'documentos', [arquivo], 'ag-ruido')
  expect(formDataEnviado.get('agenteId')).toBe('ag-ruido')
})

it('recusa vínculo com agente ausente da perícia', async () => {
  const resposta = await postarFoto({ periciaId: 'per-1', agenteId: 'ag-inexistente' })
  expect(resposta.status).toBe(422)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/services/api.test.ts server/src/routes/fotos.test.ts --maxWorkers=1 --minWorkers=1`

Expected: FAIL porque o multipart e a rota ignoram `agenteId`.

- [ ] **Step 3: Validate and persist the relationship**

```ts
const agenteId = z.string().trim().min(1).optional().parse(req.body.agenteId || undefined)
const tecnico = pericia.tecnico as { agentes?: { id?: string }[] }
if (agenteId && !tecnico.agentes?.some((agente) => agente.id === agenteId)) {
  await Promise.all(arquivos.map((arquivo) => apagarUpload(arquivo.filename)))
  throw new ErroHttp(422, 'A avaliação escolhida não existe mais nesta perícia.')
}
```

Persist `agenteId`, return it in the API object, and keep it when legends/order are synchronized.

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/api.ts src/services/api.test.ts server/src/routes/fotos.ts server/src/routes/fotos.test.ts server/src/services/fotos-pericia.ts
git commit -m "feat(fotos): vincular evidências à avaliação do agente"
```

### Task 5: Bloco fotográfico no cartão e nos documentos

**Files:**
- Create: `src/components/FotosAgente.tsx`
- Create: `src/components/FotosAgente.test.tsx`
- Modify: `src/pages/PericiaEditor.tsx:979-1076,2046-2058,2071-2165`
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `src/lib/fotosDocumento.ts`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/src/services/docx.ts`
- Modify: `server/src/services/fotos-ordem.test.ts`
- Test: `server/src/services/documento-parecer.test.ts`
- Test: `server/src/services/docx-parecer.test.ts`

**Interfaces:**
- `FotosAgente` receives `{ agente, fotos, enviando, onAdicionar, onLegenda, onRemover }`.
- `onAdicionar(agenteId: string, arquivos: File[]): Promise<void>` reuses the existing preparation/upload path.
- `fotosDoAgente(fotos, agenteId)` returns only directly linked images.

- [ ] **Step 1: Write failing component and ordering tests**

```tsx
it('mantém as evidências de duas avaliações separadas', () => {
  render(<FotosAgente agente={ruido} fotos={[fotoRuido, fotoCalor]} {...acoes} />)
  expect(screen.getByAltText('Dosímetro instalado')).toBeDefined()
  expect(screen.queryByAltText('Termômetro de globo')).toBeNull()
})

it('abre a câmera traseira em dispositivo compatível', () => {
  render(<FotosAgente agente={ruido} fotos={[]} {...acoes} />)
  const input = screen.getByLabelText('Adicionar fotos da avaliação')
  expect(input.getAttribute('accept')).toBe('image/*')
  expect(input.getAttribute('capture')).toBe('environment')
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/components/FotosAgente.test.tsx server/src/services/fotos-ordem.test.ts --maxWorkers=1 --minWorkers=1`

Expected: FAIL because the component/helper does not exist.

- [ ] **Step 3: Build the compact photo block and central review group**

Place `<FotosAgente>` after `EficaciaEpiCampo` and before `BotaoInserirNoLaudo`. Reuse `prepararFotosParaEnvio`, six-file batches, progress copy, captions and delete behavior. In the general photo step, add a final group **Medições e avaliações técnicas**, grouped by agent name, while excluding those photos from generic section counts.

When deleting an agent with linked photos, show confirmation and call the existing delete route for each linked photo before removing the agent from `tecnico.agentes`.

- [ ] **Step 4: Add failing document tests and implement placement**

```ts
expect(html.indexOf('Ruído contínuo')).toBeLessThan(html.indexOf('Dosímetro instalado'))
expect(html.indexOf('Dosímetro instalado')).toBeLessThan(html.indexOf('Calor'))
expect(docxText).toContain('Fotografia 1 — Dosímetro instalado')
```

In Preview, HTML and DOCX, render linked photos directly after each agent table. Keep global numbering stable by using `fotosEmOrdemDeDocumento`; add an explicit `agente` order bucket after legacy section photos and sort linked photos by agent order then `ordem`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- src/components/FotosAgente.test.tsx src/pages/PericiaEditor.feedback.test.tsx src/components/DocumentoPreview.test.tsx server/src/services/fotos-ordem.test.ts server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts --maxWorkers=1 --minWorkers=1`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/FotosAgente.tsx src/components/FotosAgente.test.tsx src/pages/PericiaEditor.tsx src/components/DocumentoPreview.tsx src/lib/fotosDocumento.ts server/src/services/documento-comum.ts server/src/services/documento-html.ts server/src/services/docx.ts server/src/services/fotos-ordem.test.ts server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts
git commit -m "feat(laudo): inserir evidências fotográficas por agente"
```

### Task 6: Verificação integrada e produção

**Files:**
- Modify only if verification reveals a regression in files already listed.

**Interfaces:**
- Consumes all functionality from Tasks 1–5.
- Produces a deploy verified against the exact final commit.

- [ ] **Step 1: Run full tests serially**

Run: `npm test -- --maxWorkers=1 --minWorkers=1`

Expected: all test files and tests PASS.

- [ ] **Step 2: Run frontend checks**

Run: `npm run typecheck`

Run: `npm run build`

Expected: exit code 0 for both.

- [ ] **Step 3: Run API checks**

Run from `server`: `npm run typecheck`

Run from `server`: `npm run build`

Run from `server`: `npm run smoke:docx-layout`

Expected: exit code 0 for all.

- [ ] **Step 4: Inspect the generated DOCX visually**

Generate a Laudo fixture containing the three groups of quesitos, two agents with different photos and `R$ 4.500,00` in honorários. Render it with the bundled document renderer and inspect every page. Confirm no overlap, orphan captions, stretched photos, broken table continuation or stray placeholders.

- [ ] **Step 5: Push and monitor deployment**

```bash
git fetch origin
git rebase origin/main
git push origin main
```

Wait for **Deploy de produção** to complete successfully for the final SHA. Verify `https://drpericiatrabalhista.com.br/api/saude`, the homepage HTTP 200 and that the served bundle contains `Quesitos do Juízo` and `Honorários Periciais`.

- [ ] **Step 6: Synchronize the principal local checkout**

Run `git pull --ff-only origin main` in `C:\Users\Lenovo\Desktop\Backup_Google_Drive\Desktop\D-R-Pericia-Elite` without altering unrelated untracked files.
