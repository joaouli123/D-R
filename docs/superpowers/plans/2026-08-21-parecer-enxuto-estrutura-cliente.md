# Parecer Enxuto Conforme Estrutura do Cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar Parecer e Laudo com a estrutura técnica aprovada pelo cliente, sem sobreposição de imagens, texto encoberto ou páginas vazias artificiais.

**Architecture:** O preenchimento técnico continua armazenado no JSON da perícia, com novos campos opcionais e fallback para registros antigos. Preview React, HTML/PDF e DOCX usam a mesma ordem semântica e distribuem fotografias por seção, mantendo imagens inline e legendas vinculadas.

**Tech Stack:** React 19, TypeScript, Express, Zod, Prisma JSON, `docx`, Sharp, Puppeteer, Vitest e scripts smoke com `tsx`.

## Global Constraints

- Não importar conteúdo específico do processo usado como referência.
- Não criar migração de banco; os novos campos permanecem opcionais no JSON `tecnico`.
- Manter Arial 18 pt no título, 14 pt nas seções, 11 pt no corpo e 10 pt nas tabelas.
- Manter fotografias inline, proporcionais e com legenda no mesmo bloco.
- Preservar leitura de perícias antigas por fallback.

---

### Task 1: Contrato de dados compatível

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `src/mocks/db.ts`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/src/routes/pericias.ts`
- Modify: `server/src/seed.ts`
- Test: `server/scripts/smoke-validacao-pericia.ts`

**Interfaces:**
- Produces: campos opcionais `descricaoPostoTrabalho`, `maquinasFerramentas`, `produtosUtilizados`, `divergenciasFaticas`, `protecoesColetivas`, `conclusaoInsalubridade`, `conclusaoPericulosidade`, `respostasQuesitos` e `encerramento` em `TecnicoJson`/`PreenchimentoTecnico`.

- [ ] Escrever validação smoke que envia os novos campos e confirma que o schema os preserva.
- [ ] Executar `npm run smoke:pericia` em `server` e confirmar falha por campos removidos pelo parse.
- [ ] Adicionar os campos opcionais aos tipos e ao `tecnicoSchema`.
- [ ] Inicializar os campos em perícias novas, mocks e seed sem alterar registros existentes.
- [ ] Executar `npm run smoke:pericia` e confirmar zero falhas.

### Task 2: Preview e editor com a estrutura aprovada

**Files:**
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `src/components/DocumentoPreview.test.tsx`

**Interfaces:**
- Consumes: novos campos opcionais de `PreenchimentoTecnico`.
- Produces: preview com números jurídicos fixos de 1 a 14 e seções 11/12 condicionadas à modalidade.

- [ ] Criar teste do preview para a ordem `1`, `4`, `6`, `7`, `8`, `9`, `10`, `11/12`, `13` e `14`.
- [ ] Executar o teste e confirmar que a estrutura atual falha.
- [ ] Reorganizar os campos do editor em blocos coerentes e manter acesso à Biblioteca.
- [ ] Reorganizar o preview, separar agentes de EPIs e distribuir fotos por seção.
- [ ] Executar `npm test -- DocumentoPreview.test.tsx` e confirmar aprovação.

### Task 3: HTML/PDF com fotos no fluxo correto

**Files:**
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/scripts/smoke-documentos.ts`

**Interfaces:**
- Consumes: `TecnicoJson`, modalidade e fotos agrupadas por `SecaoFoto`.
- Produces: `htmlDoParecer()` com estrutura 1–14 e helper de fotografias por seção.

- [ ] Adicionar asserts de ordem das seções, modalidade, EPI separado e ausência de relatório fotográfico agregado.
- [ ] Executar `npm run smoke` e confirmar falha na estrutura antiga.
- [ ] Criar helper que consome apenas as seções de foto solicitadas e mantém `figure` indivisível.
- [ ] Montar os 14 blocos com fallbacks para campos legados.
- [ ] Executar `npm run smoke` e confirmar PDF válido e todos os asserts aprovados.

### Task 4: DOCX com a mesma estrutura e imagens estáveis

**Files:**
- Modify: `server/src/services/docx.ts`
- Modify: `server/scripts/smoke-documentos.ts`
- Test: `server/scripts/smoke-docx-layout.ts`

**Interfaces:**
- Consumes: o mesmo mapeamento semântico do HTML.
- Produces: `docParecer()` com fotos inline em tabelas sem borda, `cantSplit`, proporção preservada e cabeçalhos repetidos.

- [ ] Adicionar asserts no XML para a ordem dos títulos, ausência de âncoras e presença de imagens inline.
- [ ] Executar os smokes e confirmar falha antes da mudança.
- [ ] Extrair renderização de fotos por grupos e inserir cada grupo na seção correspondente.
- [ ] Separar tabelas de agentes e proteção, mantendo EPIs somente na seção 8.
- [ ] Executar `npm run smoke` e `npm run smoke:docx-layout` e confirmar aprovação.

### Task 5: Verificação visual, versionamento e produção

**Files:**
- Verify: `server/saida-teste/parecer.pdf`
- Verify: `server/saida-teste/parecer.docx`

**Interfaces:**
- Produces: commit publicado na `main` e implantação Coolify saudável no mesmo SHA.

- [ ] Executar `npm run typecheck`, `npm run build`, `npm run smoke`, `npm run smoke:docx-layout` e `npm run smoke:pericia`.
- [ ] Renderizar PDF e DOCX em PNG e inspecionar todas as páginas a 100%.
- [ ] Corrigir qualquer corte, sobreposição, legenda órfã ou página vazia e repetir a renderização.
- [ ] Executar `git diff --check`, revisar o diff e criar commit Conventional Commit em português.
- [ ] Fazer push para `origin/main`, disparar o Coolify e verificar SHA, `running:healthy`, página pública HTTP 200 e `/api/saude` HTTP 200.
