# Feedback NR 18/09 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o feedback de 18/09 com conclusões dos agentes NR-15 exclusivamente no item 10, login completo em telas baixas e assinatura sempre obtida do responsável atual pela perícia.

**Architecture:** A regra de conclusão será mantida simétrica nos três renderizadores (prévia React, HTML/PDF e DOCX) e coberta por uma matriz única de anexos. A identidade do signatário será resolvida por uma função pura no servidor e pelo usuário responsável no editor. O login ganhará classes semânticas e uma media query por altura para compactação progressiva, sem alterar o fluxo mobile.

**Tech Stack:** React 18, TypeScript 5.6, Tailwind CSS 3, Vitest, Express, Prisma, `docx` e Puppeteer.

## Global Constraints

- Não criar migração nem alterar o formato dos registros existentes.
- Preservar `DocumentoGerado.criadoPorId` como trilha de auditoria.
- Para documento vinculado, assinar com `Pericia.responsavelId`; sem perícia, usar `DocumentoGerado.criadoPorId`.
- A conclusão de qualquer avaliação NR-15, identificada ou não, deve aparecer apenas no item 10.
- Cobrir Anexos 1 a 14 e 13-A; o Anexo 4 revogado continua representável apenas para regressão estrutural.
- Preservar o login mobile somente com o formulário e os avisos “Em desenvolvimento”.
- Não adicionar dependências.

---

### Task 1: Conclusões NR-15 somente no item 10

**Files:**
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `src/components/DocumentoPreview.test.tsx`
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/src/services/documento-parecer.test.ts`
- Modify: `server/src/services/docx.ts`
- Modify: `server/src/services/docx-parecer.test.ts`
- Create: `server/src/services/anexos-nr15.fixture.ts`

**Interfaces:**
- Consumes: `agenteExibeConclusao(agente)` e os renderizadores já existentes.
- Produces: `agentesNr15DeRegressao(): AgenteAmbiental[]`, com uma observação exclusiva por anexo para localizar cada conclusão no documento.

- [ ] **Step 1: Criar a matriz de agentes dos anexos**

```ts
export const anexosNr15DeRegressao = [
  'Anexo 1', 'Anexo 2', 'Anexo 3', 'Anexo 4', 'Anexo 5',
  'Anexo 6', 'Anexo 7', 'Anexo 8', 'Anexo 9', 'Anexo 10',
  'Anexo 11', 'Anexo 12', 'Anexo 13', 'Anexo 13-A', 'Anexo 14',
] as const

export function agentesNr15DeRegressao() {
  return anexosNr15DeRegressao.map((anexo, indice) => ({
    id: `agente-regressao-${indice + 1}`,
    nome: `Agente de regressão ${anexo}`,
    tipo: indice % 3 === 0 ? 'fisico' : indice % 3 === 1 ? 'quimico' : 'biologico',
    anexoNr15: anexo,
    criterio: 'qualitativo',
    identificadoNaAtividade: indice % 2 === 0,
    observacao: `Conclusão exclusiva ${anexo}.`,
  }))
}
```

- [ ] **Step 2: Escrever testes que falham nos três formatos**

```ts
for (const anexo of anexosNr15DeRegressao) {
  const conclusao = `Conclusão exclusiva ${anexo}.`
  expect(ocorrencias(documentoCompleto, conclusao)).toBe(1)
  expect(documentoCompleto.indexOf(conclusao)).toBeGreaterThan(documentoCompleto.indexOf('10.1. NR-15'))
}
```

No React, use `container.textContent`; no HTML, a string retornada por `htmlDoParecer`; no DOCX, o texto extraído de `word/document.xml`.

- [ ] **Step 3: Executar os testes focados e confirmar a falha**

Run: `npm test -- src/components/DocumentoPreview.test.tsx server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts`

Expected: FAIL porque agentes com `identificadoNaAtividade: false` ainda imprimem a conclusão no item 7.

- [ ] **Step 4: Corrigir os três renderizadores**

Na prévia, o item 7 não deve renderizar tabela de conclusão para o ramo não identificado:

```tsx
{identificado && (
  <table className="agente-propriedades">...</table>
)}
```

No HTML e no DOCX, o ramo não identificado deve respeitar `comConclusao`:

```ts
if (!identificado) {
  return opcoes.comConclusao && conclusao ? tabelaSomenteConclusao(conclusao) : vazio
}
```

- [ ] **Step 5: Executar novamente os testes focados**

Run: `npm test -- src/components/DocumentoPreview.test.tsx server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts`

Expected: PASS e exatamente uma ocorrência de cada conclusão depois do cabeçalho do item 10.

- [ ] **Step 6: Commitar a correção de conclusões**

```bash
git add src/components/DocumentoPreview.tsx src/components/DocumentoPreview.test.tsx server/src/services/documento-html.ts server/src/services/docx.ts server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts server/src/services/anexos-nr15.fixture.ts
git commit -m "fix(documentos): manter conclusoes NR-15 apenas no item 10"
```

### Task 2: Assinatura do responsável atual

**Files:**
- Create: `server/src/services/signatario-documento.ts`
- Create: `server/src/services/signatario-documento.test.ts`
- Modify: `server/src/routes/documentos.ts`
- Modify: `src/pages/PericiaEditor.tsx`
- Create: `src/lib/responsavelPericia.ts`
- Create: `src/lib/responsavelPericia.test.ts`

**Interfaces:**
- Produces: `idDoSignatario(documento, pericia): string`.
- Produces: `responsavelDaPericia(pericia, usuarios, usuarioAtual): Usuario | null`.
- Consumes: `Pericia.responsavelId`, `DocumentoGerado.criadoPorId` e `AppStore.usuarios`.

- [ ] **Step 1: Escrever testes da resolução de identidade**

```ts
expect(idDoSignatario({ criadoPorId: 'criador' }, { responsavelId: 'responsavel' }))
  .toBe('responsavel')
expect(idDoSignatario({ criadoPorId: 'criador' }, null)).toBe('criador')
```

```ts
expect(responsavelDaPericia(pericia, [responsavel], criador)?.id).toBe('responsavel')
expect(responsavelDaPericia(periciaDoCriador, [], criador)?.id).toBe('criador')
```

- [ ] **Step 2: Executar os testes e confirmar a falha**

Run: `npm test -- server/src/services/signatario-documento.test.ts src/lib/responsavelPericia.test.ts`

Expected: FAIL porque os helpers ainda não existem.

- [ ] **Step 3: Implementar os helpers puros**

```ts
export function idDoSignatario(
  documento: { criadoPorId: string },
  pericia: { responsavelId: string } | null,
): string {
  return pericia?.responsavelId ?? documento.criadoPorId
}
```

```ts
export function responsavelDaPericia(
  pericia: Pick<Pericia, 'responsavelId'>,
  usuarios: Usuario[],
  usuarioAtual?: Usuario | null,
): Usuario | null {
  return usuarios.find((u) => u.id === pericia.responsavelId)
    ?? (usuarioAtual?.id === pericia.responsavelId ? usuarioAtual : null)
}
```

- [ ] **Step 4: Integrar servidor e prévia**

Em `carregarContexto`, buscar `usuario` com `idDoSignatario(documento, pericia)`. No editor, obter `usuarios` do store, calcular `peritoResponsavel` e passá-lo para `DocumentoPreview` no lugar de `usuario`.

- [ ] **Step 5: Executar testes e typecheck focados**

Run: `npm test -- server/src/services/signatario-documento.test.ts src/lib/responsavelPericia.test.ts src/components/DocumentoPreview.test.tsx`

Run: `npm run typecheck && npm --prefix server run typecheck`

Expected: PASS; nenhuma mudança de banco.

- [ ] **Step 6: Commitar a correção de assinatura**

```bash
git add server/src/services/signatario-documento.ts server/src/services/signatario-documento.test.ts server/src/routes/documentos.ts src/lib/responsavelPericia.ts src/lib/responsavelPericia.test.ts src/pages/PericiaEditor.tsx
git commit -m "fix(documentos): assinar com responsavel atual da pericia"
```

### Task 3: Login compacto sem rolagem interna

**Files:**
- Modify: `src/pages/Login.tsx`
- Modify: `src/components/Logo.tsx`
- Modify: `src/index.css`
- Create: `src/pages/Login.test.tsx`

**Interfaces:**
- Produces: classes `login-shell`, `login-brand-panel`, `login-brand-logo`, `login-brand-content`, `login-credential-seal` e `login-form-panel`.
- Consumes: componentes `Logo` e `SeloCredenciado` sem alterar suas APIs públicas.

- [ ] **Step 1: Escrever o teste estrutural que falha**

```tsx
render(<MemoryRouter><Login /></MemoryRouter>)
const painel = screen.getByTestId('login-brand-panel')
expect(painel).toHaveClass('login-brand-panel')
expect(painel).not.toHaveClass('overflow-y-auto')
expect(screen.getByTestId('login-form-panel')).toHaveClass('login-form-panel')
```

O teste também deve validar que os dois textos “Em desenvolvimento” continuam presentes.

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `npm test -- src/pages/Login.test.tsx`

Expected: FAIL por ausência dos identificadores/classes e presença da rolagem interna.

- [ ] **Step 3: Aplicar classes semânticas e remover a rolagem interna**

Use `data-testid` somente nos painéis, preserve o conteúdo e conecte as classes ao `Logo` e ao `SeloCredenciado`.

- [ ] **Step 4: Adicionar compactação por altura**

```css
@media (min-width: 1024px) and (max-height: 760px) {
  .login-brand-panel { padding: 1.5rem 2rem; }
  .login-brand-logo { width: min(340px, 100%); }
  .login-brand-content { margin-block: .75rem; gap: .65rem; }
  .login-credential-seal { padding: .65rem 1rem; }
  .login-form-panel { justify-content: flex-start; padding-top: 3rem; }
}
```

Completar a regra com redução dos espaçamentos e alturas internas do selo, mantendo legibilidade e sem esconder os módulos disponíveis.

- [ ] **Step 5: Executar teste e build**

Run: `npm test -- src/pages/Login.test.tsx src/components/Logo.test.tsx`

Run: `npm run build`

Expected: PASS e bundle de produção gerado.

- [ ] **Step 6: Validar visualmente em 1365 × 665**

Iniciar `npm run dev -- --host 127.0.0.1`, abrir `/login` em viewport 1365 × 665 e confirmar: conteúdo institucional completo, nenhuma barra de rolagem interna, selo inteiro e formulário deslocado para cima.

- [ ] **Step 7: Commitar o ajuste visual**

```bash
git add src/pages/Login.tsx src/components/Logo.tsx src/index.css src/pages/Login.test.tsx
git commit -m "fix(login): compactar tela institucional em notebooks"
```

### Task 4: Verificação integrada, publicação e servidor

**Files:**
- Modify only if a verification failure reveals a defect in files from Tasks 1–3.

**Interfaces:**
- Consumes: all outputs of Tasks 1–3.
- Produces: one verified commit chain on `main`, pushed to `origin/main`, with successful deployment.

- [ ] **Step 1: Executar a suíte completa**

Run: `npm test`

Run: `npm run typecheck && npm --prefix server run typecheck`

Run: `npm run build && npm --prefix server run build`

Expected: all commands exit 0.

- [ ] **Step 2: Revisar o diff e o estado do repositório**

Run: `git diff main...HEAD --check`

Run: `git status --short`

Expected: sem erros de whitespace e sem arquivos de trabalho não rastreados além de artefatos conscientemente ignorados.

- [ ] **Step 3: Atualizar a branch com o remoto e integrar em main**

Run: `git fetch origin`

Run: `git rebase origin/main`

Run: `git switch main && git merge --ff-only feature/feedback-nr-1809`

Expected: fast-forward limpo, sem sobrescrever alterações externas.

- [ ] **Step 4: Publicar**

Run: `git push origin main`

Expected: `origin/main` aponta para o SHA local.

- [ ] **Step 5: Acompanhar o deploy**

Consultar o workflow do SHA publicado até estado concluído. Exigir conclusão `success`.

- [ ] **Step 6: Verificar produção**

Run: `Invoke-WebRequest https://drpericiatrabalhista.com.br/api/saude -UseBasicParsing`

Run: `Invoke-WebRequest https://drpericiatrabalhista.com.br -UseBasicParsing`

Expected: HTTP 200 nos dois endpoints; o bundle servido deve conter os marcadores da versão nova.

## Self-Review

- Cobertura da especificação: Task 1 cobre todos os anexos e os três formatos; Task 2 cobre responsável, fallback e prévia; Task 3 cobre viewport baixo, desktop e preservação mobile; Task 4 cobre testes, Git e produção.
- Placeholder scan: não há `TBD`, `TODO`, “implementar depois” nem passos sem comando ou comportamento verificável.
- Consistência de tipos: `idDoSignatario` recebe apenas os campos existentes no Prisma; `responsavelDaPericia` usa `Pericia.responsavelId` e `Usuario.id`; os renderizadores continuam recebendo `Usuario | null`.
