# Biblioteca organizada por tipos de documento

**Data:** 17 de agosto de 2026
**Status:** aprovado para detalhamento técnico

## Objetivo

Organizar a Biblioteca Pessoal de Textos por tipo de documento para que o usuário localize rapidamente os trechos adequados a Parecer Técnico Pericial, Laudo Técnico Pericial, Quesitos Técnicos, Manifestação ao Laudo, Impugnação de Laudos e Esclarecimentos Técnicos.

A classificação por documento será adicional à classificação atual por seção. Um texto poderá atender a mais de um tipo documental sem ser duplicado.

## Escopo

### Incluído

- Navegação da Biblioteca pelas categorias `Todos`, `Parecer`, `Laudo`, `Quesitos`, `Manifestação`, `Impugnação`, `Esclarecimentos` e `Uso geral`.
- Contagem de textos em cada categoria.
- Busca e filtro por seção aplicados dentro da categoria selecionada.
- Seleção de um ou mais tipos de documento no cadastro e na edição de um texto.
- Identificação visual dos tipos documentais e da seção em cada cartão.
- Compatibilidade automática dos registros existentes por meio da categoria `Uso geral`.
- Priorização, na inserção rápida, dos textos do documento que está sendo editado e dos textos de uso geral.
- Persistência e validação da nova classificação na API e no PostgreSQL.

### Não incluído

- Alteração do Histórico de Documentos gerados, que já possui filtros próprios por tipo.
- Duplicação física de um texto para cada biblioteca.
- Criação de tipos documentais diferentes dos seis já suportados pelo sistema.
- Mudança no conteúdo dos textos já cadastrados.
- Inserção automática de um trecho sem ação explícita do usuário.

## Modelo de informação

`TextoBiblioteca` continuará tendo uma única `secao` e passará a ter `tiposDocumento`, uma lista baseada no enum `TipoDocumento` já existente:

```ts
type TipoDocumento =
  | 'parecer'
  | 'laudo'
  | 'quesitos'
  | 'manifestacao'
  | 'impugnacao'
  | 'esclarecimento'

interface TextoBiblioteca {
  // campos atuais
  tiposDocumento: TipoDocumento[]
}
```

Uma lista vazia representa `Uso geral`. Essa convenção evita criar um tipo de documento artificial chamado `geral` e permite que todos os textos existentes recebam o novo campo com valor padrão vazio, sem inferência e sem perda de dados.

No Prisma, o campo será uma lista do enum `TipoDocumento`, com padrão vazio. A migração adicionará a coluna não nula com o mesmo padrão. A rota de textos aceitará no máximo os seis valores conhecidos, removerá repetições e continuará restringindo leitura, edição e exclusão ao proprietário.

## Experiência da Biblioteca

### Navegação principal

Abaixo do cabeçalho será exibida uma faixa de bibliotecas documentais. Cada item terá ícone, nome curto e quantidade de textos. `Todos` será a entrada inicial; `Uso geral` mostrará somente itens sem tipo documental associado.

Em telas largas, a faixa será horizontal e permanecerá visualmente integrada ao painel de busca. Em telas menores, terá rolagem horizontal com foco visível, sem esconder categorias em menus difíceis de descobrir.

Ordem fixa:

1. Todos
2. Parecer Técnico
3. Laudo Técnico
4. Quesitos
5. Manifestação
6. Impugnação
7. Esclarecimentos
8. Uso geral

A faixa será o elemento de assinatura da tela: uma “estante técnica” sóbria em azul-marinho D&R, com a categoria ativa marcada por uma lâmina azul inspirada nos documentos periciais. O restante da página permanecerá contido para preservar a aparência profissional já aprovada.

### Busca e filtros

O resultado seguirá esta sequência:

1. limitar pela biblioteca documental ativa;
2. limitar pela seção selecionada, quando houver;
3. pesquisar título, conteúdo e tags;
4. ordenar favoritos primeiro e, depois, por quantidade de usos.

A busca será local e instantânea, como já ocorre hoje. O texto de vazio informará se não há itens naquela biblioteca ou se os filtros não produziram resultado.

### Cartões

Cada cartão continuará mostrando título, resumo, favoritos, usos, palavras e tags. A área de metadados passará a mostrar:

- um selo para cada tipo documental associado;
- `Uso geral` quando a lista estiver vazia;
- a seção do texto como informação separada.

Os botões Copiar, Editar, Favoritar e Excluir manterão o comportamento atual.

### Cadastro e edição

O modal ganhará o grupo `Bibliotecas do documento`, com seis opções de seleção múltipla e uma explicação curta: deixar todas desmarcadas mantém o texto em `Uso geral`.

Ao criar um texto com uma biblioteca ativa, essa categoria virá pré-selecionada. Ao criar em `Todos` ou `Uso geral`, nenhuma categoria virá marcada. Edição preservará as associações existentes.

Título, seção, tags e conteúdo continuarão com as validações atuais.

## Inserção rápida

`BibliotecaDrawer` receberá opcionalmente o tipo do documento em edição. Quando o filtro de contexto estiver ativo, serão mostrados:

- textos associados ao tipo documental atual; e
- textos de `Uso geral`.

O filtro atual por seção será mantido e combinado com o tipo documental. Desativar o filtro de contexto permitirá consultar toda a Biblioteca. Nenhum texto será selecionado ou inserido automaticamente.

O editor de Parecer/Laudo passará o tipo já escolhido pelo usuário ao drawer. As telas que ainda não abrem o drawer continuarão sem alteração funcional nesta entrega; seus textos, entretanto, já poderão ser organizados e encontrados nas respectivas categorias da Biblioteca.

## API e compatibilidade

### Contrato

- `GET /textos` retornará `tiposDocumento` em todos os itens.
- `POST /textos` aceitará `tiposDocumento`, usando `[]` quando o cliente antigo não enviar o campo.
- Valores fora do enum serão rejeitados com resposta 422 pelo tratamento Zod existente.
- Duplicidades enviadas serão consolidadas antes da gravação.

### Migração

A migração adicionará a coluna com padrão vazio. Assim:

- registros atuais permanecem íntegros;
- clientes antigos continuam salvando textos como `Uso geral`;
- a migração é aplicável sem backfill subjetivo;
- rollback de aplicação não torna os registros antigos ilegíveis, pois o campo adicional é ignorado pelo código anterior.

## Estados de erro e acessibilidade

- Falha ao salvar ou excluir continuará aparecendo no toast existente, sem remover o conteúdo do modal.
- Controles de categoria usarão semântica de abas ou botões com `aria-pressed`, foco visível e nome incluindo a contagem.
- O grupo de tipos documentais terá legenda e instrução associada.
- A rolagem horizontal será utilizável por teclado e não dependerá de cor para indicar a categoria ativa.
- O comportamento respeitará os estilos de foco e redução de movimento já existentes.

## Estratégia de testes

### Frontend

- filtro por cada tipo documental;
- `Uso geral` para lista vazia;
- contagens independentes e `Todos` sem duplicação;
- combinação de tipo, seção e busca;
- pré-seleção da categoria ativa ao criar;
- seleção múltipla no modal;
- drawer exibindo tipo atual mais `Uso geral`;
- preservação do comportamento quando o drawer não recebe tipo.

### Backend

- schema aceita zero, um ou vários tipos válidos;
- schema rejeita tipo desconhecido;
- duplicidades são removidas;
- payload antigo sem o campo resulta em lista vazia;
- mapper devolve o novo campo;
- propriedade por usuário permanece aplicada.

### Integração e deploy

- suíte completa e builds do frontend e backend;
- `prisma generate` e aplicação da migração no Coolify;
- login e leitura da Biblioteca em produção;
- confirmação de que textos preexistentes aparecem em `Uso geral`;
- criação, edição e recarga de um texto de teste com múltiplas categorias, seguida da remoção do registro de teste;
- deploy da API antes do frontend para manter compatibilidade durante a transição.

## Critérios de aceite

- O usuário encontra textos por cada um dos seis tipos documentais solicitados.
- Um texto pode aparecer em mais de uma biblioteca sem ser duplicado no banco.
- `Todos` nunca duplica cartões.
- Textos antigos continuam visíveis e editáveis em `Uso geral`.
- Busca, seção, favoritos, usos e ações existentes continuam funcionando.
- A inserção rápida de Parecer/Laudo prioriza o tipo atual e itens gerais.
- API, prévia e interface não quebram quando o campo não existe em payloads antigos.
- Migração, testes, builds, commit, push e deploy são verificados antes da conclusão.
