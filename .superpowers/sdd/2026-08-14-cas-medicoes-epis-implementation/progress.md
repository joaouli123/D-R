# SDD ledger — plan: docs/superpowers/plans/2026-08-14-cas-medicoes-epis-implementation.md

Baseline: frontend 22 tests PASS; frontend build PASS; backend typecheck/build PASS. HEAD 37c6668.
Task 1: minor (deferred): filtrar em runtime as chaves retornadas por unidadesDisponiveis.
Task 1: fix round 1/5 (3 addressed, 0 open; commits f54a8ed..f2e0722)
Task 1: complete (commits 37c6668..f2e0722, review clean)
Task 2: minor (deferred): smoke não afirma where.aplicacoes.some e take: 100.
Task 2: fix round 1/5 (2 addressed, 0 open; commits 04969e5..0cdb157)
Task 2: verification pending at deploy: executar migração em PostgreSQL real e conferir 34 catálogos/57 aplicações.
Task 2: complete (commits f2e0722..0cdb157, review clean)
Task 3: ruling — manter `% O₂ em volume` conforme especificação aprovada; finding do revisor usou lente abreviada incorreta.
Task 3: minor (deferred): ampliar smokes para todas as unidades permitidas e snapshots incompletos.
Task 3: fix round 1/5 (1 addressed, 0 open; commits 976b3e8..21c7168)
Task 3: complete (commits 0cdb157..21c7168, review clean)
Task 4: cross-task finding carried to Task 5: DocumentoPreview ainda usa `medido` e deve renderizar medição estruturada.
Task 4: minor (deferred): associar erro numérico com aria-invalid/aria-describedby/role alert.
Task 4: minor (deferred): ampliar DOM tests para integração completa, teclado e concorrência.
Task 4: fix round 1/5 (3 addressed, 0 open; commits 14ee70f..3dc7fa1)
Task 4: complete (commits 21c7168..3dc7fa1, review clean)
Task 2: complete (commits f2e0722..7b0f047, self-review clean; PostgreSQL execution deferred by user)
Task 2: fix round 1/5 (2 addressed, 0 open; commit 97f9cbd; minor deferred)
Task 5: fix round 1/5 (2 Important addressed, 0 open; commit e2cc2ee)
Task 5: verification — smoke HTML/PDF/DOCX, frontend 45 tests, builds e inspeção PDF/OOXML aprovados; render visual DOCX indisponível sem LibreOffice.
Task 6: pendências menores resolvidas no commit 7c71fb9 (unidades runtime, contrato da rota, snapshots e acessibilidade).
Task 6: verificação limpa — npm ci em ambos; frontend 46/46 + build; backend Prisma generate, typecheck, build, smoke:pericia 8/8, smoke:epis 61/34/57 e smoke documental aprovados.
Task 6: auditoria de produção — 2 avisos moderados no React Router sem navegação externa controlada por usuário; 4 avisos altos no downloader do Puppeteer, não executado no Docker (PUPPETEER_SKIP_DOWNLOAD e Chromium do Debian). Atualizações principais ficam fora deste release para evitar regressão sem relação com a entrega.
Task 6: PostgreSQL local indisponível; migration deploy e contagens reais serão comprovados no Coolify antes da conclusão.
Task 6: revisão final encontrou e corrigiu a ausência de priorização por categoria do agente (`5734db0`), o envio de unidade estruturada vazia (`050493f`) e a ausência da eficácia dos EPIs nas saídas documentais (`0a05366`).
Task 6: jornada manual local aprovada no aplicativo com API simulada: login, busca por CAS 75-07-0, Acetaldeído/CAS preenchidos, troca para mg/m³, normalização 12,5 -> 12.5, inclusão manual de respirador/CA e eficácia independente; console sem erros. O recarregamento não persiste no mock e será coberto pela validação da API/banco em produção.
Task 6: revisão final do diff limpa após as correções; nenhuma recomendação de EPI é aplicada automaticamente e agentes sem categoria reconhecida continuam com pesquisa manual do catálogo.
