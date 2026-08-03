# D&R Perícia Elite

**Plataforma Inteligente de Perícia Trabalhista** — Elaboração de documentos técnicos com agilidade e precisão.

Frontend do sistema descrito na *Proposta Comercial de Desenvolvimento v1.1* (UX Code), incluindo os módulos novos levantados posteriormente pelo Contratante: **Quesitos (item 17)** e **Manifestação/Impugnação/Esclarecimento (item 18)**.

---

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
```

Outros comandos:

```bash
npm run build      # build de produção em dist/
npm run preview    # serve o build
npm run typecheck  # verificação de tipos
```

**Acesso de demonstração:** `dinoel@drpericiaelite.com.br` + qualquer senha com 4 ou mais caracteres.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite 5 |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS 3 |
| Rotas | React Router 6 |
| Ícones | lucide-react |

Alinhada à proposta: front-end React, back-end Node.js com API REST e PostgreSQL.

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

## Trocar mock por backend

Nenhuma tela precisa ser alterada. Toda a comunicação passa por `src/services/api.ts`, que já tem os dois adaptadores implementados:

```bash
# .env
VITE_API_MODE=rest
VITE_API_URL=https://api.drpericiaelite.com.br
```

Endpoints esperados pelo frontend:

```
POST   /auth/login              POST   /auth/logout
GET    /usuarios                POST   /usuarios
GET    /empresas                POST   /empresas         DELETE /empresas/:id
GET    /pericias                GET    /pericias/:id
POST   /pericias                DELETE /pericias/:id
GET    /textos                  POST   /textos           DELETE /textos/:id
GET    /quesitos                POST   /quesitos
GET    /documentos              POST   /documentos       DELETE /documentos/:id
POST   /documentos/:id/pdf      POST   /documentos/:id/docx
POST   /documentos/:id/email
GET    /agenda                  GET    /modelos
```

---

## Estrutura

```
src/
├── components/
│   ├── layout/AppLayout.tsx      Sidebar, topbar e PageHeader
│   ├── ui/index.tsx              Design system (Button, Input, Modal, Tabs…)
│   ├── BibliotecaDrawer.tsx      Inserção rápida de textos (Módulo F)
│   ├── DocumentoPreview.tsx      Montagem automática do parecer/laudo (Módulo H)
│   └── Logo.tsx                  Marca e selo de credenciamento
├── content/
│   ├── quesitos.ts               Banco de quesitos (Módulo K)
│   ├── manifestacao.ts           Modelos 18.1 / 18.2 / 18.3 (Módulo L)
│   └── agentesQuimicos.ts        CAS, LT, anexos NR-15/NR-16, LINACH
├── pages/                        Uma tela por rota
├── services/api.ts               Camada única de integração (mock ↔ REST)
├── store/AppStore.tsx            Estado global e sessão
├── mocks/db.ts                   Dados de demonstração
├── lib/utils.ts                  Máscaras, datas, interpolação de variáveis
└── types/index.ts                Modelo de dados completo
```

---

## Identidade visual

| Uso | Cor |
|---|---|
| Verde principal (logotipo, ações) | `brand-700` — `#0A4A2D` |
| Verde escuro (sidebar, login) | `brand-800` — `#073722` |
| Azul institucional (credenciais) | `navy-600` — `#1B3A6B` |
| Neutros | escala `ink-50` → `ink-900` |

Documentos gerados usam serifa em corpo 11,5 pt, texto justificado, recuo de 1,25 cm e margens A4 (3 cm à esquerda) — a classe `.doc-sheet` em `src/index.css` concentra essa formatação.

---

## Próxima fase

- API REST em Node.js e banco PostgreSQL
- Motor de geração de PDF no servidor e exportação DOCX a partir do modelo em Word
- Upload real de imagens e concatenação do PDF externo
- Disparo de e-mail transacional (Resend/SendGrid)

---

UX Code Desenvolvimento Web · CNPJ 66.650.579/0001-46 · contato@uxcode.com.br
