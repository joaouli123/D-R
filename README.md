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
npm run prisma:studio
```

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
| E-mail | Resend |
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
| **F** | Biblioteca pessoal de textos | `/biblioteca` + inserção rápida no editor |
| **G** | Rascunho, edição e título do documento | `/pericias/:id` — passo 6 |
| **H** | Montagem automática, anexo de PDF externo, exportação | `/pericias/:id` — passo 6 |
| **I** | Envio por e-mail | editor e `/documentos` |
| **J** | Histórico de documentos | `/documentos` |
| **K** | **Quesitos Técnicos (item 17)** | `/quesitos` |
| **L** | **Manifestação ao Laudo (item 18)** | `/manifestacao/:posicionamento` |

Telas de apoio: `/processos`, `/calendario`, `/calculadoras`, `/modelos`, `/relatorios`, `/ajuda`, `/esclarecimentos`.

---

## Módulo K — Quesitos (item 17)

Fluxo em três etapas: **cadastrar → selecionar → responder → exportar**.

- Banco com 39 quesitos pré-cadastrados, organizados por **tema** (gerais, insalubridade, periculosidade, ruído, calor, químicos, biológicos, EPI, ergonomia, eletricidade, inflamáveis) e por **origem** (Juízo, Reclamante, Reclamada, do próprio perito).
- Seleção múltipla com filtro, busca e "selecionar todos do filtro".
- Cada quesito traz **resposta padrão editável**, com variáveis `{{funcao}}`, `{{admissao}}`, `{{dataVistoria}}` etc. preenchidas automaticamente ao vincular o processo.
- Cadastro de quesitos próprios, que ficam salvos na base.
- Documento montado e exportável em PDF.

Banco de quesitos: `src/content/quesitos.ts`.

---

## Módulo L — Manifestação ao Laudo (item 18)

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
GET    /textos                  POST   /textos           DELETE /textos/:id
POST   /textos/:id/uso
GET    /quesitos                POST   /quesitos         DELETE /quesitos/:id
GET    /documentos              GET    /documentos/:id
POST   /documentos              DELETE /documentos/:id
POST   /documentos/:id/anexo    DELETE /documentos/:id/anexo
POST   /documentos/:id/pdf      POST   /documentos/:id/docx
POST   /documentos/:id/email
GET    /agenda                  POST   /agenda           DELETE /agenda/:id
GET    /modelos                 POST   /modelos          DELETE /modelos/:id
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
| `RESEND_API_KEY` | sem ela a API sobe e só o envio de e-mail fica indisponível |

O volume `uploads` guarda as fotos das vistorias e os anexos em PDF — **perdê-lo significa perder o relatório fotográfico dos laudos.**

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
│   ├── quesitos.ts               Quesitos do modo mock (a fonte passa a ser o banco)
│   ├── manifestacao.ts           Modelos 18.1 / 18.2 / 18.3 (Módulo L)
│   └── agentesQuimicos.ts        CAS, LT, anexos NR-15/NR-16, LINACH
├── pages/                        Uma tela por rota
├── services/api.ts               Camada única de integração (mock ↔ REST)
├── store/AppStore.tsx            Estado global, sessão e rollback otimista
├── mocks/db.ts                   Dados de demonstração
├── lib/utils.ts                  Máscaras, datas, interpolação de variáveis
└── types/index.ts                Modelo de dados completo

server/
├── prisma/
│   ├── schema.prisma             11 entidades
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
        └── armazenamento.ts      Uploads de fotos e anexos
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

## Próxima fase

- Assinatura digital ICP-Brasil nos documentos gerados
- Importação de modelo `.docx` do Contratante para servir de base à montagem
- Favoritos e contagem de uso por usuário nos quesitos do banco global (hoje são compartilhados)
- Busca global no cabeçalho e central de notificações
- Suíte de testes automatizados além dos smoke tests

---

UX Code Desenvolvimento Web · CNPJ 66.650.579/0001-46 · contato@uxcode.com.br
