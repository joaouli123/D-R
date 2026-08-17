# Task 6 — verificação integrada, documentação e deploy

## Verificação local

- `npm.cmd ci`: aprovado no frontend e no backend.
- Frontend: 5 arquivos de teste, 46 testes aprovados; build Vite aprovado com 1.608 módulos.
- Backend: Prisma Client gerado; typecheck e build aprovados.
- Validação de perícia: 8 verificações, 0 falhas.
- Catálogo de EPI: 61 linhas, 34 configurações únicas e 57 aplicações; rota e filtros aprovados.
- Documentos: quatro tipos gerados em HTML, PDF e DOCX; escaping, NR-15, unidades e seções aprovados.
- `git diff --check`: aprovado antes da publicação.

## Banco e produção

O computador local não possui PostgreSQL nem Docker. A migração real, a idempotência e as contagens persistidas serão validadas no PostgreSQL do Coolify durante o deploy. A publicação só será considerada concluída após API e frontend terminarem saudáveis e os endpoints públicos responderem.

## Segurança e rollback

- O audit do frontend aponta avisos moderados que exigem React Router 7; a aplicação usa apenas destinos internos controlados e não usa SSR/hydration.
- O audit do backend aponta o downloader do Puppeteer. A imagem de produção define `PUPPETEER_SKIP_DOWNLOAD=true` e usa o Chromium atualizado do Debian, portanto o caminho vulnerável de extração não é executado no build ou runtime.
- Atualizações principais dessas bibliotecas devem ser tratadas em ciclo separado, com testes de regressão próprios.
- Gatilhos de rollback: falha da migração, healthcheck da API diferente de 200, frontend diferente de 200, autenticação quebrada ou catálogo sem 34 equipamentos/57 aplicações.
