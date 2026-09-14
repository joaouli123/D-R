# Varredura obrigatória da NR-15 e NR-16 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exigir e documentar a avaliação de todos os anexos aplicáveis da NR-15 e da NR-16, mantendo o preenchimento rápido quando não há exposição e os detalhes atuais quando há risco.

**Architecture:** A varredura será persistida dentro do JSON técnico da perícia e interpretada por motores puros espelhados no frontend e na API. O painel altera apenas o status do anexo; avaliações positivas continuam usando os registros de agentes existentes, permitindo vários agentes e funções. Os três renderizadores recebem uma apresentação compacta derivada da mesma regra e a emissão usa uma validação equivalente no cliente e no servidor.

**Tech Stack:** React 18, TypeScript, Vitest, Express, Zod, Prisma JSON, geradores HTML/PDF e DOCX.

## Global Constraints

- NR-15 deve registrar os anexos numerados de 1 a 14; o Anexo 4 é fixo como revogado e não aplicável.
- O Anexo 13-A é complementar ao Anexo 13 e não altera o contador principal de 14 anexos.
- NR-16 deve registrar os seis anexos numerados e o anexo sem número de radiações ionizantes.
- Salvar rascunho permanece permitido com a varredura incompleta.
- PDF, DOCX e envio por e-mail devem ser recusados enquanto houver pendências.
- Avaliações, agentes, EPIs, CAS, CA, funções e conclusões já salvos não podem ser removidos ou reescritos.
- EPI só exige eficácia quando estiver efetivamente associado a uma avaliação NR-15.
- A NR-16 não usa neutralização por EPI para decidir o adicional.
- Prévia, PDF e DOCX devem apresentar a mesma ordem e o mesmo conteúdo.

---

### Task 1: Contrato e motor puro da varredura

**Files:**
- Create: `src/lib/varreduraNormativa.ts`
- Create: `src/lib/varreduraNormativa.test.ts`
- Create: `server/src/services/varredura-normativa.ts`
- Create: `server/src/services/varredura-normativa.test.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/chavesAgente.ts`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/src/routes/esquemas-pericia.ts`
- Modify: `server/src/routes/esquemas-pericia.test.ts`

**Interfaces:**
- Produces: `StatusVarredura = 'nao_avaliado' | 'sem_exposicao' | 'exposicao_identificada' | 'nao_aplicavel'`.
- Produces: `ItemVarreduraNormativa { anexoId: string; status: StatusVarredura; conclusao?: string }`.
- Produces: `normalizarVarredura(tecnico, modalidade): VarreduraNormalizada`.
- Produces: `pendenciasVarredura(tecnico, modalidade): PendenciaVarredura[]`.
- Consumes: `ANEXOS_NR15`, `ANEXOS_NR16` e os agentes existentes.

- [ ] **Step 1: Escrever testes que descrevam a normalização**

```ts
it('oferece os anexos 1 a 14 e fixa o Anexo 4 como revogado', () => {
  const resultado = normalizarVarredura({ agentes: [] }, 'insalubridade')
  expect(resultado.nr15).toHaveLength(14)
  expect(resultado.nr15.find((item) => item.numero === '4')).toMatchObject({ status: 'nao_aplicavel' })
})

it('reconhece agente antigo como exposição identificada sem apagar o registro', () => {
  const tecnico = { agentes: [{ id: 'a1', tipo: 'fisico', anexoNr15: 'ANEXO_01' }] }
  expect(normalizarVarredura(tecnico, 'insalubridade').nr15[0].status).toBe('exposicao_identificada')
  expect(tecnico.agentes).toHaveLength(1)
})
```

- [ ] **Step 2: Executar os testes e confirmar falha pela ausência do motor**

Run: `npm test -- src/lib/varreduraNormativa.test.ts server/src/services/varredura-normativa.test.ts`

Expected: FAIL porque os módulos e tipos ainda não existem.

- [ ] **Step 3: Implementar tipos, catálogos legais e normalização mínima**

```ts
export type StatusVarredura =
  | 'nao_avaliado'
  | 'sem_exposicao'
  | 'exposicao_identificada'
  | 'nao_aplicavel'

export interface ItemVarreduraNormativa {
  anexoId: string
  status: StatusVarredura
  conclusao?: string
}
```

O motor deve agrupar `ANEXO_08_VMB`/`ANEXO_08_VCI` no Anexo 8 e todos os ids `ANEXO_12_*` no Anexo 12. O Anexo 13-A deve ser devolvido em uma coleção complementar, sem entrar no total 14.

- [ ] **Step 4: Declarar o mesmo contrato no Zod e testar que nenhuma chave é descartada**

```ts
varreduraNr15: z.array(itemVarreduraSchema).default([]),
varreduraNr16: z.array(itemVarreduraSchema).default([]),
```

Run: `npm test -- server/src/routes/esquemas-pericia.test.ts src/lib/varreduraNormativa.test.ts server/src/services/varredura-normativa.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types src/lib/varreduraNormativa* server/src/services/varredura-normativa* server/src/services/documento-comum.ts server/src/routes/esquemas-pericia*
git commit -m "feat(nr): criar motor da varredura normativa"
```

### Task 2: Painel de varredura e avaliações sob demanda

**Files:**
- Create: `src/components/PainelVarreduraNormativa.tsx`
- Create: `src/components/PainelVarreduraNormativa.test.tsx`
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `src/pages/PericiaEditor.agentes.test.tsx`
- Modify: `src/lib/varreduraNormativa.ts`

**Interfaces:**
- Consumes: `normalizarVarredura`, `ItemVarreduraNormativa`, `AgenteAvaliado`.
- Produces: `PainelVarreduraNormativa({ norma, tecnico, modalidade, onChange, onCriarAvaliacao })`.
- Produces: decisões persistidas em `tecnico.varreduraNr15` e `tecnico.varreduraNr16`.

- [ ] **Step 1: Escrever testes do comportamento visível**

```tsx
it('marca ausência sem abrir formulário e abre detalhes quando há exposição', async () => {
  render(<PainelVarreduraNormativa {...propsNr15} />)
  await user.click(screen.getByRole('button', { name: /Anexo 1.*Sem exposição/i }))
  expect(propsNr15.onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'sem_exposicao' }))
  await user.click(screen.getByRole('button', { name: /Anexo 2.*Exposição identificada/i }))
  expect(propsNr15.onCriarAvaliacao).toHaveBeenCalledWith('ANEXO_02')
})
```

- [ ] **Step 2: Executar e confirmar RED**

Run: `npm test -- src/components/PainelVarreduraNormativa.test.tsx src/pages/PericiaEditor.agentes.test.tsx`

Expected: FAIL porque o painel não existe e o editor ainda permite pular anexos.

- [ ] **Step 3: Implementar o painel compacto**

Cada linha deve conter assunto, estado atual e ações “Sem exposição” e “Exposição identificada”. O contador deve usar `avaliados / total`, considerar `nao_aplicavel` como avaliado e manter pendentes destacados.

- [ ] **Step 4: Integrar ao editor sem remover os cartões atuais**

Ao marcar exposição, criar uma avaliação somente quando ainda não houver nenhuma ligada ao anexo. Se já houver, apenas abrir o primeiro cartão. O botão atual “Novo agente” continua permitindo avaliações adicionais no mesmo anexo.

- [ ] **Step 5: Cobrir múltiplos agentes e mudança reversível de status**

O teste deve provar que dois agentes do mesmo anexo permanecem distintos e que mudar para “Sem exposição” não apaga agentes: o painel deve solicitar coerência visual e manter os dados, voltando o estado derivado para exposição enquanto existirem avaliações vinculadas.

Run: `npm test -- src/components/PainelVarreduraNormativa.test.tsx src/pages/PericiaEditor.agentes.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PainelVarreduraNormativa* src/pages/PericiaEditor* src/lib/varreduraNormativa.ts
git commit -m "feat(pericia): adicionar checklist dos anexos"
```

### Task 3: Validação idêntica no editor e na API

**Files:**
- Modify: `src/lib/varreduraNormativa.ts`
- Modify: `server/src/services/varredura-normativa.ts`
- Modify: `src/pages/PericiaEditor.tsx`
- Modify: `server/src/routes/documentos.ts`
- Modify: `server/src/services/conclusoes-agentes.test.ts`
- Modify: `src/lib/varreduraNormativa.test.ts`

**Interfaces:**
- Consumes: `pendenciasVarredura(tecnico, modalidade)`.
- Produces: mensagem com norma, anexo e motivo para cada pendência.

- [ ] **Step 1: Escrever casos de validação antes do código**

```ts
it('bloqueia anexo não avaliado e exposição sem detalhe', () => {
  expect(pendenciasVarredura(tecnicoPendente, 'ambas')).toEqual(expect.arrayContaining([
    expect.objectContaining({ norma: 'NR-15', anexo: '1', motivo: 'não avaliado' }),
    expect.objectContaining({ norma: 'NR-16', anexo: '2', motivo: 'sem avaliação detalhada' }),
  ]))
})
```

Adicionar caso com EPI NR-15 associado e eficácia vazia, e caso NR-16 com EPI que não recebe essa pendência.

- [ ] **Step 2: Executar e confirmar RED**

Run: `npm test -- src/lib/varreduraNormativa.test.ts server/src/services/varredura-normativa.test.ts server/src/services/conclusoes-agentes.test.ts`

Expected: FAIL com lista incompleta ou função ausente.

- [ ] **Step 3: Implementar as regras mínimas e ligar aos três caminhos de emissão**

`finalizarDocumento` deve levar o usuário para “Agentes e EPIs” e mostrar a lista. A API deve executar a mesma validação antes de PDF, DOCX e e-mail, devolvendo HTTP 422.

- [ ] **Step 4: Executar testes do editor e servidor**

Run: `npm test -- src/lib/varreduraNormativa.test.ts src/pages/PericiaEditor.agentes.test.tsx server/src/services/varredura-normativa.test.ts server/src/services/conclusoes-agentes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/varreduraNormativa* src/pages/PericiaEditor* server/src/services/varredura-normativa* server/src/routes/documentos.ts server/src/services/conclusoes-agentes.test.ts
git commit -m "feat(documento): exigir varredura antes da emissão"
```

### Task 4: Quadro compacto na prévia, PDF e DOCX

**Files:**
- Modify: `src/components/DocumentoPreview.tsx`
- Modify: `src/components/DocumentoPreview.test.tsx`
- Modify: `server/src/services/documento-comum.ts`
- Modify: `server/src/services/documento-html.ts`
- Modify: `server/src/services/docx.ts`
- Modify: `server/src/services/documento-parecer.test.ts`
- Modify: `server/src/services/docx-parecer.test.ts`
- Modify: `server/scripts/smoke-documentos.ts`

**Interfaces:**
- Consumes: varredura normalizada e avaliações existentes.
- Produces: quadro “Varredura dos anexos” com `Anexo`, `Tema`, `Status` e `Síntese conclusiva`.

- [ ] **Step 1: Escrever testes de paridade dos três renderizadores**

```ts
expect(documento).toContain('Varredura dos anexos da NR-15')
expect(documento).toContain('Anexo 4 — Revogado')
expect(documento).toContain('Sem exposição identificada')
expect(documento).not.toContain('Tabela técnica detalhada do Anexo 4')
```

O fixture deve conter um anexo negativo e dois agentes positivos no mesmo anexo para provar que o quadro é único e os detalhes continuam separados.

- [ ] **Step 2: Executar e confirmar RED**

Run: `npm test -- src/components/DocumentoPreview.test.tsx server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts`

Expected: FAIL porque o quadro compacto ainda não é renderizado.

- [ ] **Step 3: Implementar apresentação compartilhada e renderizadores**

O quadro deve aparecer antes dos detalhes da respectiva norma. Respostas negativas ficam apenas no quadro; respostas positivas apontam “Exposição identificada — ver avaliação detalhada”. A conclusão geral permanece na seção final.

- [ ] **Step 4: Executar testes de documento e smoke**

Run: `npm test -- src/components/DocumentoPreview.test.tsx server/src/services/documento-parecer.test.ts server/src/services/docx-parecer.test.ts`

Run: `npm run smoke:documentos --prefix server`

Expected: PASS e arquivos gerados sem divergência de ordem ou conteúdo.

- [ ] **Step 5: Commit**

```bash
git add src/components/DocumentoPreview* server/src/services/documento-* server/src/services/docx* server/scripts/smoke-documentos.ts
git commit -m "feat(documento): exibir varredura normativa compacta"
```

### Task 5: Verificação, integração e publicação

**Files:**
- Modify only if verification reveals a defect covered by a failing regression test.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: branch verified, merged into `main`, pushed and deployed.

- [ ] **Step 1: Executar a suíte completa e builds**

Run: `npm test -- --run`

Run: `npm run build`

Run: `npm run typecheck --prefix server`

Run: `npm run build --prefix server`

Expected: all commands exit 0.

- [ ] **Step 2: Executar os smokes de documentos**

Run: `npm run smoke:documentos --prefix server`

Run: `npm run smoke:docx-layout --prefix server`

Expected: PDF/DOCX generated and all assertions pass.

- [ ] **Step 3: Revisar diff e integrar**

Run: `git diff --check`

Run: `git status --short --branch`

Expected: no unstaged implementation files and no whitespace errors.

- [ ] **Step 4: Push e deploy**

Push `main`, acompanhar o workflow de produção e confirmar o commit implantado no Coolify.

- [ ] **Step 5: Verificar produção**

Confirmar HTTP 200 em `/api/saude`, carregar o bundle público e validar que os textos do novo painel estão presentes.
