# Automacao completa dos agentes da NR-15 - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a base normativa, a injecao automatica e a persistencia completa dos Anexos 1 a 14 da NR-15, incluindo buscas especializadas para os Anexos 11, 13 e 14.

**Architecture:** Os dados oficiais serao modulos TypeScript imutaveis e versionados no frontend. Funcoes puras transformarao uma selecao normativa em `AgenteAvaliado`; a interface apenas consumira essas funcoes. O backend continuara persistindo `tecnico` como JSON, validara os campos opcionais e os geradores de documentos os exibirao.

**Tech Stack:** React 18, TypeScript 5.6, Vite 5, Vitest, Node.js 20+, Express, Zod, Prisma JSON, Puppeteer, pdf-lib e docx.

## Global Constraints

- Preservar o layout aprovado do passo "Agentes".
- Nao apagar `medido`, `epiEficaz` ou `observacao` ao mudar anexo ou referencia.
- Manter compatibilidade com pericias antigas e textos livres.
- Nao criar editor administrativo nem consulta externa em tempo de execucao.
- Nao calcular automaticamente IBUTG ou concentracao de silica.
- Usar os textos oficiais vigentes do Ministerio do Trabalho e Emprego.

---

## File Structure

- `src/content/nr15/tipos.ts`: contratos dos registros normativos.
- `src/content/nr15/anexo11.ts`: substancias e limites do Quadro 1.
- `src/content/nr15/anexo13.ts`: atividades quimicas e graus.
- `src/content/nr15/anexo14.ts`: atividades biologicas e graus.
- `src/lib/nr15.ts`: busca e regras puras de injecao.
- `src/components/BuscaNormativa.tsx`: combobox acessivel reutilizavel.
- `src/components/AgenteNr15Fields.tsx`: controles condicionais.
- `server/src/routes/pericias.ts`: validacao/persistencia dos campos.
- `server/src/services/documento-*.ts` e `server/src/services/docx.ts`: documentos.
- `src/lib/nr15.test.ts` e scripts smoke: verificacao automatizada.

### Task 1: Contratos e motor de regras

**Files:**
- Create: `src/content/nr15/tipos.ts`
- Create: `src/lib/nr15.ts`
- Create: `src/lib/nr15.test.ts`
- Modify: `src/types/index.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `normalizarBuscaNr15(texto: string): string`, `buscarReferencias<T>(itens: readonly T[], consulta: string): T[]`, `aplicarAnexo(agente, anexoId)` e `aplicarReferencia(agente, referencia)`.

- [ ] **Step 1: Instalar Vitest e adicionar `"test": "vitest run"`**

Run: `npm install --save-dev vitest`

- [ ] **Step 2: Escrever testes que falham**

```ts
expect(normalizarBuscaNr15('Ácido Nítrico')).toBe('acido nitrico')
expect(aplicarAnexo({
  id: 'a1', nome: 'Legado', tipo: 'quimico', criterio: 'quantitativo',
  medido: '12 ppm', epiEficaz: false, observacao: 'Jornada completa',
}, 'ANEXO_07')).toMatchObject({
  medido: '12 ppm', epiEficaz: false, observacao: 'Jornada completa',
  tipo: 'fisico', criterio: 'qualitativo',
})
```

- [ ] **Step 3: Confirmar a falha**

Run: `npm test -- --run src/lib/nr15.test.ts`

Expected: FAIL porque o motor ainda nao existe.

- [ ] **Step 4: Ampliar `AgenteAvaliado`**

```ts
referenciaNormativaId?: string
atividadeEnquadrada?: string
unidadeLimite?: string
```

- [ ] **Step 5: Implementar tipos e funcoes puras**

`aplicarAnexo` remove referencias especificas do anexo anterior, mas preserva medicao, EPI e observacao. `aplicarReferencia` injeta apenas os campos derivados da norma.

- [ ] **Step 6: Testar e commitar**

Run: `npm test -- --run src/lib/nr15.test.ts; npm run typecheck`

```powershell
git add package.json package-lock.json src/types/index.ts src/content/nr15/tipos.ts src/lib/nr15.ts src/lib/nr15.test.ts
git commit -m "Cria motor de regras para agentes da NR-15"
```

### Task 2: Bases oficiais dos Anexos 11, 13 e 14

**Files:**
- Create: `src/content/nr15/anexo11.ts`
- Create: `src/content/nr15/anexo13.ts`
- Create: `src/content/nr15/anexo14.ts`
- Modify: `src/content/anexosNr15.ts`
- Modify: `src/lib/nr15.test.ts`

**Interfaces:**
- Produces: `SUBSTANCIAS_ANEXO_11`, `ATIVIDADES_ANEXO_13` e `ATIVIDADES_ANEXO_14`.

- [ ] **Step 1: Conferir fontes oficiais**

Usar a pagina vigente da NR-15 e os PDFs oficiais. Registrar URL e data de consulta `2026-08-12` no cabecalho de cada modulo.

- [ ] **Step 2: Escrever testes de integridade que falham**

```ts
expect(SUBSTANCIAS_ANEXO_11.length).toBeGreaterThan(100)
expect(SUBSTANCIAS_ANEXO_11.every(x => x.id && x.label && x.limiteTolerancia && x.grau)).toBe(true)
expect(new Set(ATIVIDADES_ANEXO_14.map(x => x.grau))).toEqual(new Set(['medio', 'maximo']))
expect(ATIVIDADES_ANEXO_13.some(x => x.grau === 'minimo')).toBe(true)
expect(ATIVIDADES_ANEXO_13.some(x => x.grau === 'maximo')).toBe(true)
```

- [ ] **Step 3: Confirmar a falha**

Run: `npm test -- --run src/lib/nr15.test.ts`

- [ ] **Step 4: Transcrever o Quadro 1 do Anexo 11**

Cada entrada tera ID estavel, nome, sinonimos, ppm e/ou mg/m3, limite pronto, unidade, grau e marcadores normativos. Entradas "vide..." apontam para o registro principal.

- [ ] **Step 5: Transcrever atividades dos Anexos 13 e 14**

Preservar texto integral, grupo e grau. O `label` pode ser resumido sem alterar `atividade`.

- [ ] **Step 6: Revisar o mapeamento geral contra o PDF**

Corrigir limites estaticos/editaveis/dinamicos. Manter Anexos 6 e 13-A como entradas legadas quando nao houver regra contratada.

- [ ] **Step 7: Testar e commitar**

Run: `npm test -- --run src/lib/nr15.test.ts; npm run typecheck`

```powershell
git add src/content/nr15 src/content/anexosNr15.ts src/lib/nr15.test.ts
git commit -m "Adiciona bases oficiais dos Anexos 11 13 e 14"
```

### Task 3: Busca normativa e interface especializada

**Files:**
- Create: `src/components/BuscaNormativa.tsx`
- Create: `src/components/AgenteNr15Fields.tsx`
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `src/lib/nr15.test.ts`

**Interfaces:**
- Produces: `BuscaNormativa<T>({ itens, value, onSelect, placeholder })` e `AgenteNr15Fields({ agente, onChange })`.

- [ ] **Step 1: Testar selecoes especializadas**

Testar que Anexo 11 aplica nome/limite/unidade/grau; Anexo 13 aplica atividade/grau; Anexo 14 aplica natureza biologica/grau; e a troca remove referencias incompatíveis sem apagar dados periciais.

- [ ] **Step 2: Confirmar a falha**

Run: `npm test -- --run src/lib/nr15.test.ts`

- [ ] **Step 3: Implementar `BuscaNormativa`**

Usar `role="combobox"`, `aria-expanded`, `role="listbox"`, setas, Enter e Escape. Mostrar no maximo 30 resultados e a mensagem "Nenhum item normativo encontrado".

- [ ] **Step 4: Implementar `AgenteNr15Fields`**

Anexo 11 pesquisa substancias; Anexo 13 pesquisa grupo/atividade; Anexo 14 pesquisa atividades agrupadas por grau. Referencia ausente ao reabrir preserva o texto salvo e exibe aviso.

- [ ] **Step 5: Integrar ao editor**

Substituir a mutacao inline por `aplicarAnexo`. Bloquear grau e campos normativos quando houver referencia selecionada; permitir grau enquanto a selecao dinamica estiver vazia.

- [ ] **Step 6: Verificar e commitar**

Run: `npm test; npm run typecheck; npm run build`

```powershell
git add src/components/BuscaNormativa.tsx src/components/AgenteNr15Fields.tsx src/pages/PericiaEditor.tsx src/lib/nr15.test.ts
git commit -m "Adiciona buscas normativas aos agentes avaliados"
```

### Task 4: Persistencia e compatibilidade da API

**Files:**
- Modify: `server/src/routes/pericias.ts`
- Create: `server/scripts/smoke-validacao-pericia.ts`
- Modify: `server/package.json`

**Interfaces:**
- Produces: schema Zod compatível com registros novos e legados.

- [ ] **Step 1: Criar smoke test do schema**

Exportar o schema do agente. Testar uma entrada legada, uma entrada completa e uma entrada com enum invalido. Adicionar `"smoke:pericia": "tsx scripts/smoke-validacao-pericia.ts"`.

- [ ] **Step 2: Confirmar a falha**

Run: `Set-Location server; npm run smoke:pericia`

- [ ] **Step 3: Ampliar o schema**

```ts
referenciaNormativaId: texto.optional(),
atividadeEnquadrada: texto.optional(),
unidadeLimite: texto.optional(),
```

- [ ] **Step 4: Verificar backend e commitar**

Run: `npm run smoke:pericia; npm run smoke:api; npm run typecheck; npm run build`

```powershell
git add src/routes/pericias.ts scripts/smoke-validacao-pericia.ts package.json
git commit -m "Persiste referencias normativas das pericias"
```

### Task 5: Previa, PDF e DOCX

**Files:**
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/src/services/docx.ts`
- Modify: `server/scripts/smoke-documentos.ts`

**Interfaces:**
- Consumes: `atividadeEnquadrada`, `unidadeLimite` e campos existentes.
- Produces: representacao consistente na previa, PDF e DOCX.

- [ ] **Step 1: Criar fixtures para Anexos 11, 13 e 14**

Fazer o smoke exigir no HTML as substancias, atividades, unidades e graus plantados.

- [ ] **Step 2: Confirmar a falha**

Run: `Set-Location server; npm run smoke`

- [ ] **Step 3: Atualizar contratos e geradores**

Exibir "Atividade ou referencia normativa" quando existir, escapar todo texto e nao repetir unidade se ela ja estiver no limite.

- [ ] **Step 4: Atualizar previa React**

Exibir atividade como texto secundario abaixo do agente, sem adicionar coluna larga.

- [ ] **Step 5: Verificar arquivos visualmente**

Run: `Set-Location server; npm run smoke; npm run typecheck; npm run build`

Renderizar todas as paginas do PDF com `pdftoppm` e inspecionar. Converter/abrir o DOCX e confirmar que nenhuma tabela corta texto.

- [ ] **Step 6: Commit**

```powershell
git add ../src/components/DocumentoPreview.tsx src/services/documento-comum.ts src/services/documento-html.ts src/services/docx.ts scripts/smoke-documentos.ts
git commit -m "Exibe enquadramentos NR-15 nos documentos"
```

### Task 6: Verificacao integrada, publicacao e producao

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-12-automacao-nr15-implementation.md`

- [ ] **Step 1: Documentar comportamento e fontes no README**

Incluir Anexos 11/13/14, dados versionados e preservacao de medicao/observacoes.

- [ ] **Step 2: Executar a suite completa**

```powershell
npm test
npm run typecheck
npm run build
Set-Location server
npm run smoke:pericia
npm run smoke:api
npm run smoke
npm run typecheck
npm run build
```

Expected: todos com exit code 0.

- [ ] **Step 3: Revisar seguranca e regressao**

Confirmar que nao ha segredos, campos novos obrigatorios, migracao destrutiva ou alteracoes fora do escopo.

- [ ] **Step 4: Commit final**

```powershell
git add README.md docs/superpowers/plans/2026-08-12-automacao-nr15-implementation.md
git commit -m "Documenta automacao normativa da NR-15"
```

- [ ] **Step 5: Publicar e acompanhar Coolify**

Run: `git push origin main`. Acompanhar frontend e API ate ambos ficarem saudaveis; corrigir falhas de deploy antes de prosseguir.

- [ ] **Step 6: Testar producao**

Criar/editar pericia de teste com Anexos 11, 13 e 14; salvar; recarregar; gerar PDF/DOCX; conferir uma pericia legada. Remover apenas o registro criado para teste, se descartavel.

- [ ] **Step 7: Registrar resultado**

Marcar as caixas e adicionar `## Resultado da execucao` com commits, comandos aprovados, saude dos servicos e limitacoes encontradas.

