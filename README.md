# D&R Perícia Elite

**Plataforma Inteligente de Perícia Trabalhista** — Elaboração de documentos técnicos com agilidade e precisão.

Sistema descrito na *Proposta Comercial de Desenvolvimento v1.1* (UX Code), incluindo os módulos novos levantados posteriormente pelo Contratante: **Quesitos (item 17)** e **Manifestação/Impugnação/Esclarecimento (item 18)**.

```
.
├── src/       frontend React
└── server/    API REST + PostgreSQL
```

---

## Como rodar

**1. Banco de dados**

```bash
docker compose up -d banco
```

**2. API** — copie `server/.env.example` para `server/.env`, defina `JWT_SECRET` e `ADMIN_SENHA`:

```bash
cd server
npm install
npm run prisma:deploy   # aplica as migrations
npm run seed            # administrador + 39 quesitos + modelos
npm run dev             # http://localhost:3333
```

**3. Frontend** — copie `.env.example` para `.env.local`:

```bash
npm install
npm run dev             # http://localhost:5173
```

O Vite encaminha `/api` para a porta 3333, então o cookie de sessão fica same-site e não há CORS em desenvolvimento.

Para navegar sem servidor nenhum, use `VITE_API_MODE=mock` — os dados de demonstração voltam, mas nada persiste.

Outros comandos:

```bash
npm run build       # build de produção em dist/
npm run typecheck   # verificação de tipos

cd server
npm run smoke       # gera os 4 tipos de documento em PDF e DOCX
npm run smoke:api   # verifica o contrato HTTP (sem banco)
npm run smoke:pericia # valida o payload técnico e os snapshots salvos
npm run smoke:epis  # valida a consolidação e a consulta do catálogo de EPIs
npm run smoke:biblioteca # valida tipos documentais e compatibilidade dos textos
npm run smoke:caepi # valida o espelho do CAEPI de ponta a ponta (sem banco)
npm run prisma:studio
```

Para carregar a base oficial de CAs, veja [Espelho oficial do CAEPI](#espelho-oficial-do-caepi-módulo-l).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind 3 + React Router 6 |
| API | Node 22 + Express 4 |
| Banco | PostgreSQL 16 + Prisma |
| Sessão | JWT em cookie httpOnly + bcrypt |
| PDF | Puppeteer (Chromium headless) |
| DOCX | biblioteca `docx` — estilos nativos do Word |
| E-mail | Brevo (API transacional + fallback SMTP) |
| Linguagem | TypeScript strict nas duas pontas |

---

## Mapa dos módulos

| Módulo | Escopo | Onde está |
|---|---|---|
| **A** | Acesso e gestão de usuários | `/` (login) e `/configuracoes` |
| **B** | Cadastro reutilizável de empresas | `/clientes` |
| **C** | Processo, reclamadas ilimitadas, participantes, vistoria | `/pericias/:id` — passo 1 |
| **D** | Preenchimento técnico estruturado | `/pericias/:id` — passos 2, 3 e 5 |
| **E** | Fotografias organizadas por seção | `/pericias/:id` — passo 4 |
| **F** | Biblioteca por documentos e seções | `/biblioteca` + inserção rápida no editor |
| **G** | Rascunho, edição e título do documento | `/pericias/:id` — passo 6 |
| **H** | Montagem automática, anexo de PDF externo, exportação | `/pericias/:id` — passo 6 |
| **I** | Envio por e-mail | editor e `/documentos` |
| **J** | Histórico de documentos | `/documentos` |
Módulos A–J são o escopo da Cláusula 1ª da proposta.

**Itens levantados depois da v1.1** — fora dos Módulos A–J:

| Item | Escopo | Onde está |
|---|---|---|
| **17** | Quesitos Técnicos | `/quesitos` |
| **18** | Manifestação, Impugnação e Esclarecimento | `/manifestacao/:posicionamento` e `/esclarecimentos` |
| **L** | Espelho oficial do CAEPI — consulta de CA pelo número | passo 3 do editor, dentro do seletor de EPIs |

Tela de apoio: `/ajuda` — orientação de uso, prevista no item 7 da proposta.

**Fora desta fase** (Cláusula 5ª): assinatura digital nativa e envio automático por WhatsApp, ambos dependentes de API paga de terceiro. O PDF sai pronto para assinatura na ferramenta que o Contratante já utiliza.

---

## Biblioteca por Documentos

A Biblioteca pessoal separa os trechos por **Parecer Técnico, Laudo Técnico, Quesitos, Manifestação, Impugnação e Esclarecimentos**, além de `Uso geral`.

- Um mesmo texto pode atender a vários documentos sem ser duplicado.
- A classificação documental funciona em conjunto com seção, busca, tags, favoritos e contagem de usos.
- Textos sem categoria ficam em `Uso geral`; esse também é o destino seguro dos registros criados antes da classificação.
- Ao editar Parecer ou Laudo, a inserção rápida prioriza textos do tipo aberto e textos gerais. O usuário pode desativar o filtro e consultar toda a Biblioteca.

---

## Item 17 — Quesitos Técnicos

Fluxo em três etapas: **cadastrar → selecionar → responder → exportar**.

- Banco com 39 quesitos pré-cadastrados, organizados por **tema** (gerais, insalubridade, periculosidade, ruído, calor, químicos, biológicos, EPI, ergonomia, eletricidade, inflamáveis) e por **origem** (Juízo, Reclamante, Reclamada, do próprio perito).
- Seleção múltipla com filtro, busca e "selecionar todos do filtro".
- Cada quesito traz **resposta padrão editável**, com variáveis `{{funcao}}`, `{{admissao}}`, `{{dataVistoria}}` etc. preenchidas automaticamente ao vincular o processo.
- Cadastro de quesitos próprios, que ficam salvos na base.
- Documento montado e exportável em PDF.

Banco inicial em `server/src/quesitos-base.ts`; depois do primeiro seed a fonte de verdade é o banco.

---

## Item 18 — Manifestação ao Laudo

Seleciona-se o **agente** (Ruído · Calor · Biológico · Periculosidade) e o **posicionamento**; o sistema monta o documento automaticamente.

| Item | Posicionamento | Comportamento |
|---|---|---|
| **18.1** | Concordância com o laudo | Texto padrão pronto — todos os blocos já vêm marcados |
| **18.2** | Impugnação ao laudo | Modelos prontos editáveis, 5 argumentos técnicos por agente |
| **18.3** | Impugnação ao esclarecimento | Continuação da impugnação, com blocos específicos |

Saída em **folha única**: título, dados do caso, fundamentação legal, argumentos e requerimento — exatamente como pedido.

Os **Esclarecimentos Técnicos** (`/esclarecimentos`) seguem a mesma lógica: extensão do parecer, com pontos de questionamento do Juízo/partes e respostas padrão por agente.

Textos e modelos: `src/content/manifestacao.ts`.

---

## Agentes químicos, medições e EPIs (NR-15)

- O Anexo 11 permite localizar o agente pelo nome ou pelo número CAS. A base contém somente os CAS presentes nos arquivos recebidos; a ausência de CAS é aceita e não impede o cadastro.
- Valor medido e unidade são armazenados separadamente. As unidades disponíveis são `ppm`, `mg/m³` e `% O₂ em volume`, conforme a referência selecionada. O sistema não converte automaticamente valores entre unidades.
- O catálogo normalizado contém 34 configurações de respiradores, derivadas de 61 linhas recebidas, com aplicações independentes para os Anexos 11, 12 e 13. A mesma configuração não é duplicada quando atende mais de um anexo.
- A busca de EPI filtra por anexo, categoria, marca, modelo e CA. Sugestões nunca são associadas automaticamente: o usuário precisa confirmar cada equipamento.
- Ao salvar a perícia, os dados do equipamento e seus CAs são preservados como snapshot. Assim, a prévia, o PDF e o DOCX históricos não mudam se o catálogo for atualizado posteriormente.

---

## Espelho oficial do CAEPI (Módulo L)

Cópia local da base de Certificados de Aprovação do MTE, para que o perito digite o número do CA e receba o equipamento pronto — em vez de cadastrar tudo à mão.

**A validade é julgada na data da vistoria, nunca em "hoje".** É a regra central do módulo. Um CA vencido em 2024 valia normalmente no período de um processo de 2022, e é essa a pergunta que o laudo responde. O editor passa `dataVistoria` ao seletor de EPIs; sem ela, a consulta cai em hoje e a tela avisa.

- **Grão `(CA, processo)`.** Um mesmo CA pode ter mais de uma homologação ao longo do tempo — na base recebida, 22 CAs têm esse histórico. Guardar só a última apagaria justamente a informação que interessa a um processo antigo, então cada homologação é uma linha e a tela avisa quando existe mais de uma.
- **Três situações, não duas.** Além de válido e vencido existe o **incerto**: a base do MTE não publica a data em que um CA foi cancelado ou suspenso, então para esses o sistema pede confirmação em vez de afirmar.
- **NRRsf.** O atributo de atenuação não vem no CSV — só na ficha individual do portal. O que o perito digitar na mão fica em `cas_atenuacao`, tabela separada, com `fonte = 'PERITO'`. **A atualização do Ministério nunca sobrescreve o que é do perito**: o upsert do CSV não toca nessa tabela, e o `UPDATE` das fichas tem `WHERE fonte <> 'PERITO'`.
- **Enquadramento NR-15** derivado do equipamento (de-para em `classificar.ts`), com cobertura de 100% da base recebida — nenhum registro fica sem anexo.
- A busca usa índice GIN sobre `to_tsvector('portuguese', …)`; texto livre é sanitizado em `montarTsQuery` antes de virar `to_tsquery`, então uma expressão malformada nunca chega ao Postgres.

**Carregar a base:**

```bash
npm run sync:caepi -- --arquivo ~/Downloads/RelatorioCA.csv.gz
```

Aceita `.csv` e `.csv.gz`. O caminho por arquivo é o principal: o portal do MTE fica atrás do Cloudflare e responde com o desafio *"Just a moment…"*, que exige navegador de verdade — quando isso acontece, `npm run sync:caepi` sem `--arquivo` falha com `ErroDesafioCloudflare` e a mensagem manda baixar o arquivo pelo navegador. O CSV oficial sai de `caepi.trabalho.gov.br`, atualizado diariamente às 20h.

O `.gz` do portal vem com HTML da própria página colado depois do fim do membro gzip — `createGunzip` lê a base inteira e só então estoura `incorrect header check`, descartando tudo em arquivos pequenos. Por isso `arquivo.ts` remove o cabeçalho gzip na mão e infla o corpo com `inflateRaw`, que termina no bloco final e ignora o resto. Arquivo corrompido ou download cortado no meio continuam falhando, de propósito: importar meia base seria pior que não importar.

`--fichas <n>` busca o NRRsf de até *n* protetores auditivos pendentes; `--so-fichas` pula o CSV. `npm run sync:caepi -- --ajuda` lista o resto.

**Conferir:**

```bash
npm run validar:caepi -- ~/Downloads/RelatorioCA.csv.gz
```

Roda 9 premissas do modelo contra a base real e sai com código 1 se alguma falhar. Na base de 20/08/2026: 42.343 registros, 27.361 vencidos e 14.903 válidos, 543 protetores auditivos (205 válidos na data), 0 linhas ignoradas.

`npm run smoke:caepi` cobre os 13 blocos do módulo — parser, de-para, agregação, SQL da sincronização, busca, histórico, rotas HTTP e o pipeline completo de sincronização — sem precisar de banco.

---

## API

Toda a comunicação do frontend passa por `src/services/api.ts`. Nenhuma tela conhece o modo em uso.

```
POST   /auth/login              POST   /auth/logout
GET    /auth/eu                 POST   /auth/senha
GET    /usuarios                POST   /usuarios         POST   /usuarios/:id/senha
GET    /empresas                POST   /empresas         DELETE /empresas/:id
GET    /pericias                GET    /pericias/:id
POST   /pericias                DELETE /pericias/:id
POST   /pericias/:id/fotos      DELETE /pericias/:id/fotos/:fotoId
GET    /epis?q=&categoria=&anexo=
GET    /caepi/status              GET    /caepi/cas?q=&categoria=&anexo=&em=
GET    /caepi/cas/:numero?em=     PATCH  /caepi/cas/:numero/atenuacao
GET    /textos                  POST   /textos           DELETE /textos/:id
POST   /textos/:id/uso
GET    /quesitos                POST   /quesitos         DELETE /quesitos/:id
GET    /documentos              GET    /documentos/:id
POST   /documentos              DELETE /documentos/:id
POST   /documentos/:id/anexo    DELETE /documentos/:id/anexo
POST   /documentos/:id/pdf      POST   /documentos/:id/docx
POST   /documentos/:id/email
GET    /saude
```

`POST` em coleção é upsert: com `id` conhecido atualiza, sem ele cria. Reemitir um documento não gera duplicata no histórico.

**Sessão.** JWT em cookie `httpOnly`, restaurado em `GET /auth/eu` no boot do frontend. O token não é legível por JavaScript, então não há como forjar sessão pelo devtools.

**Perfis.** `admin` gerencia usuários e modelos; `perito` e `assistente` trabalham nas próprias perícias. A biblioteca de textos é privada de cada usuário; o banco de quesitos é compartilhado pelo escritório, e só o administrador reescreve a pergunta de um quesito global.

---

## Geração de documentos

O PDF é montado **no servidor**, a partir do que está no banco — não do que está na tela. Um parecer arquivado há dois anos é reimpresso sem nenhuma tela aberta, com as fotos embutidas e o anexo externo concatenado ao final (`pdf-lib`).

O Chromium roda com a rede bloqueada durante a renderização: todo recurso já vai embutido como data URI. O DOCX é gerado dos mesmos dados, com estilos nativos do Word — títulos na navegação, tabelas reais, recuo de primeira linha — em vez de HTML importado.

`server/src/services/documento-comum.ts` concentra o vocabulário compartilhado pelos dois formatos, para que o rótulo de um grau de insalubridade não divirja entre o PDF e o editável.

---

## Deploy (Coolify)

`docker-compose.yml` sobe API e PostgreSQL. A imagem da API usa o Chromium do Debian em vez do que o Puppeteer baixa — menor e com as atualizações de segurança do sistema.

Defina no painel do Coolify, nunca no repositório:

| Variável | Observação |
|---|---|
| `POSTGRES_PASSWORD` | — |
| `JWT_SECRET` | mínimo 32 caracteres — `openssl rand -base64 48` |
| `CORS_ORIGINS` | URL pública do frontend |
| `API_PUBLIC_URL` | URL pública da API — monta o endereço das fotos |
| `ADMIN_EMAIL` / `ADMIN_SENHA` | carga inicial, idempotente |
| `BREVO_API_KEY` | chave preferencial da API transacional da Brevo |
| `BREVO_SMTP_USER` / `BREVO_SMTP_PASSWORD` | fallback opcional pelo relay SMTP da Brevo |

O volume `uploads` guarda as fotos das vistorias e os anexos em PDF — **perdê-lo significa perder o relatório fotográfico dos laudos.**

**Primeira subida com o Módulo L:** depois do `prisma migrate deploy`, a tabela do CAEPI sobe vazia e a consulta por CA responde "base não carregada" até a primeira carga. Rode uma vez, no container da API, `npm run sync:caepi -- --arquivo <caepi.csv.gz>` com o arquivo baixado do portal. A partir daí a atualização é periódica, e o que o perito preencheu de NRRsf sobrevive a todas elas.

---

## Estrutura

```
src/
├── components/
│   ├── layout/AppLayout.tsx      Sidebar, topbar e PageHeader
│   ├── ui/index.tsx              Design system (Button, Input, Modal, Tabs…)
│   ├── BibliotecaDrawer.tsx      Inserção rápida de textos (Módulo F)
│   ├── DocumentoPreview.tsx      Pré-visualização do parecer/laudo
│   └── Logo.tsx                  Marca e selo de credenciamento
├── content/
│   ├── quesitos.ts               Quesitos do modo demonstração (item 17)
│   ├── manifestacao.ts           Modelos 18.1 / 18.2 / 18.3
│   └── anexosNr15.ts             Anexos da NR-15 para o cadastro de agentes
├── pages/                        Uma tela por rota
├── services/api.ts               Camada única de integração (mock ↔ REST)
├── store/AppStore.tsx            Estado global, sessão e rollback otimista
├── mocks/db.ts                   Dados de demonstração
├── lib/utils.ts                  Máscaras, datas, interpolação de variáveis
└── types/index.ts                Modelo de dados completo

server/
├── prisma/
│   ├── schema.prisma             9 entidades
│   └── migrations/
├── scripts/                      Smoke tests que rodam sem banco
└── src/
    ├── app.ts                    Montagem do Express (separada do boot)
    ├── index.ts                  Bootstrap e encerramento gracioso
    ├── auth.ts                   Sessão JWT httpOnly e controle de perfil
    ├── erros.ts                  Tradução de erro do Prisma/Zod para HTTP
    ├── mappers.ts                Prisma → formato consumido pelo frontend
    ├── seed.ts                   Carga inicial idempotente
    ├── routes/                   Uma rota por módulo
    └── services/
        ├── documento-comum.ts    Vocabulário compartilhado PDF/DOCX
        ├── documento-html.ts     Montagem do documento (Módulo H)
        ├── pdf.ts                Puppeteer + concatenação do anexo
        ├── docx.ts               Exportação editável
        ├── email.ts              Envio com PDF anexado (Módulo I)
        ├── armazenamento.ts      Uploads de fotos e anexos
        └── caepi/                Espelho da base do MTE (Módulo L)
            ├── arquivo.ts        Leitura do .csv/.csv.gz baixado do portal
            ├── csv.ts            Parser do CSV oficial (19 colunas)
            ├── mapear.ts         Linha → registro, no grão (CA, processo)
            ├── normalizar.ts     Situação, datas e validade na data
            ├── classificar.ts    De-para equipamento → anexo da NR-15
            ├── portal.ts         Ficha individual (NRRsf) e Cloudflare
            ├── sync.ts           Upsert em lote e busca de fichas
            ├── repositorio.ts    Consultas Prisma/SQL
            └── consulta.ts       Montagem da ficha entregue ao front
```

---

## Identidade visual

| Uso | Cor |
|---|---|
| Azul principal (logotipo, ações) | `brand-700` — `#173F9B` |
| Azul escuro (painel de login) | `brand-800` — `#12317A` |
| Azul institucional (credenciais) | `navy-600` — `#1B3A6B` |
| Neutros | escala `ink-50` → `ink-900` |

Documentos gerados usam serifa em corpo 11,5 pt, texto justificado, recuo de 1,25 cm e margens A4 (3 cm à esquerda) — a classe `.doc-sheet` em `src/index.css` concentra essa formatação.

---

## Fora do escopo contratado

O sistema implementa exclusivamente o que a proposta descreve. Estes itens **não** fazem parte
desta fase e são tratados como proposta avulsa (Cláusula 5ª):

- Assinatura eletrônica/digital nativa — o PDF sai pronto para assinar em Clicksign, Autentique ou gov.br
- Envio automático por WhatsApp
- Integração com inteligência artificial generativa
- Leitura automática de FISPQ/FDS — substituída pela Biblioteca Pessoal de Textos (Módulo F), conforme item 6 da proposta

---

UX Code Desenvolvimento Web · CNPJ 66.650.579/0001-46 · contato@uxcode.com.br
