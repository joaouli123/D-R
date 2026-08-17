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
| **F** | Biblioteca pessoal de textos | `/biblioteca` + inserção rápida no editor |
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

Tela de apoio: `/ajuda` — orientação de uso, prevista no item 7 da proposta.

**Fora desta fase** (Cláusula 5ª): assinatura digital nativa e envio automático por WhatsApp, ambos dependentes de API paga de terceiro. O PDF sai pronto para assinatura na ferramenta que o Contratante já utiliza.

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

## Fora do escopo contratado

O sistema implementa exclusivamente o que a proposta descreve. Estes itens **não** fazem parte
desta fase e são tratados como proposta avulsa (Cláusula 5ª):

- Assinatura eletrônica/digital nativa — o PDF sai pronto para assinar em Clicksign, Autentique ou gov.br
- Envio automático por WhatsApp
- Integração com inteligência artificial generativa
- Leitura automática de FISPQ/FDS — substituída pela Biblioteca Pessoal de Textos (Módulo F), conforme item 6 da proposta

---

UX Code Desenvolvimento Web · CNPJ 66.650.579/0001-46 · contato@uxcode.com.br
