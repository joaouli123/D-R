# Revisão em português e diferenciação dos fluxos de criação

## Objetivo

Permitir que o profissional revise e corrija o texto diretamente no sistema, com apoio ortográfico do navegador em português do Brasil, e eliminar a ambiguidade entre os botões “Nova Perícia” e “Novo Documento”.

## Decisões de produto

- “Nova Perícia” inicia um novo registro de vistoria e mantém o fluxo técnico atual: processo, preenchimento, agentes e EPIs, fotografias, conclusão e documento.
- “Novo Documento” abre um seletor com os seis tipos disponíveis: Parecer, Laudo, Quesitos, Manifestação, Impugnação e Esclarecimentos.
- Parecer e Laudo podem partir de uma perícia existente ou de uma nova perícia.
- Os demais tipos seguem para os editores especializados que já existem no sistema.
- A revisão ortográfica é local, feita pelo navegador. Nenhum texto processual será enviado a um serviço externo.
- Uma revisão automática por IA fica fora deste escopo porque exige provedor, credencial, custo e decisão explícita sobre privacidade.

## Revisão e edição de português

- O componente compartilhado de texto multilinha usará `lang="pt-BR"` e `spellCheck`, preservando a possibilidade de o chamador sobrescrever essas propriedades quando necessário.
- Os campos continuam totalmente editáveis. Palavras identificadas pelo navegador aparecem sublinhadas e podem ser corrigidas pelo menu de contexto.
- A etapa de conclusão exibirá uma orientação curta sobre a revisão ortográfica e a edição direta antes da geração do PDF ou Word.
- Os textos fixos utilizados no Parecer e no Laudo passarão por revisão conservadora de ortografia, concordância, pontuação e digitação.
- A revisão não poderá alterar enquadramentos, limites, percentuais, referências normativas nem o sentido técnico-jurídico.
- Quando um texto fixo existir no frontend e no backend, as duas cópias deverão permanecer equivalentes e cobertas por teste.

## Fluxo de “Novo Documento”

### Seleção do tipo

O botão da página “Documentos” abre uma janela de escolha, sem criar dados antecipadamente. Cada opção mostra nome e finalidade do documento.

### Parecer e Laudo

Depois da escolha, o usuário seleciona uma das alternativas:

1. usar uma perícia existente, escolhida por processo e reclamante; ou
2. iniciar uma nova perícia.

Uma perícia existente abre `/pericias/{id}?tipo=parecer|laudo`. Uma nova abre `/pericias/nova?tipo=parecer|laudo`. O parâmetro mantém o título e a emissão correspondentes.

Se não houver perícias cadastradas, a alternativa de usar uma existente fica indisponível e o sistema explica que é necessário iniciar uma nova.

### Outros documentos

- Quesitos abre `/quesitos`.
- Manifestação abre `/manifestacao/concordancia`.
- Impugnação abre `/manifestacao/impugnacao_laudo`.
- Esclarecimentos abre `/esclarecimentos`.

Esses destinos preservam os fluxos especializados atuais e não criam uma perícia vazia por engano.

## Componentes e dados

- Um componente isolado concentrará o seletor de documentos e receberá a lista de perícias, o estado de abertura e a função de navegação.
- A página “Documentos” continuará responsável apenas pelo histórico e por abrir o seletor.
- Não haverá alteração no banco de dados, na API nem nos documentos já salvos.
- A matriz NR-16 continuará usando os campos já existentes para atividade, condição ou área de risco, exposição e resultado técnico.
- As divergências fáticas continuarão editáveis nos campos já existentes: resumo, alegações do Reclamante, informações da Reclamada e considerações técnicas.

## Tratamento de erros e estados

- Fechar ou cancelar o seletor não cria nem modifica registros.
- Nenhuma navegação ocorre sem a escolha necessária.
- A falta de perícias existentes conduz o usuário para a criação de uma nova, sem tela vazia ou botão inoperante.
- Se o navegador não oferecer dicionário em português, os campos permanecem editáveis; apenas o sublinhado ortográfico pode não aparecer.

## Testes e validação

- Testar que “Novo Documento” abre o seletor, em vez de navegar diretamente para uma nova perícia.
- Testar os seis destinos e as rotas distintas de Parecer e Laudo para perícia nova ou existente.
- Testar o estado sem perícias cadastradas e o cancelamento sem efeitos colaterais.
- Testar `lang="pt-BR"` e `spellCheck` nos campos multilinha.
- Preservar os testes existentes dos quatro campos da NR-16 e dos quatro campos de divergências fáticas.
- Executar a suíte completa, os builds do frontend e da API e os testes de geração de PDF e DOCX.
- Validar visualmente o seletor em desktop e celular e conferir a correção direta em um campo longo.

## Critérios de aceite

- O usuário entende a diferença entre iniciar uma perícia e iniciar um documento.
- “Novo Documento” não encaminha automaticamente para um Parecer.
- Parecer e Laudo podem reutilizar uma perícia cadastrada.
- Os textos técnicos podem ser corrigidos diretamente antes da emissão.
- A revisão ortográfica não transmite dados processuais a terceiros.
- Nenhuma estrutura já aprovada de NR-15, NR-16, divergências, PDF ou Word sofre regressão.
