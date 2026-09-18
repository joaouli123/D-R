# Feedback NR de 18 de setembro de 2026

## Objetivo

Aplicar os três ajustes pendentes do feedback da tarde de 18 de setembro sem alterar os itens já aprovados: folha de rosto com múltiplas reclamadas, identidade visual, logos institucionais, textos da tela inicial e módulos sinalizados como em desenvolvimento.

## Escopo

### Conclusões dos agentes da NR-15

A conclusão individual de cada agente deve aparecer somente no item 10, dentro do quadro de análise técnica. As tabelas do item 7 não devem repetir essa conclusão, independentemente do anexo avaliado. A regra vale de forma genérica para os Anexos 1 a 14 e para o complemento 13-A, sem listas parciais ou tratamento limitado aos primeiros agentes cadastrados.

Os registros de agente não identificado permanecem representados no documento, mas o texto conclusivo também deve ser concentrado no item 10. O item 7 descreve a avaliação; o item 10 apresenta o resultado e a conclusão.

### Tela inicial e login

O layout atual será preservado em telas com altura confortável. Para notebooks e janelas de menor altura, será aplicada uma composição compacta:

- logo D&R menor;
- conteúdo institucional deslocado para cima;
- espaçamentos verticais e tipografia secundária reduzidos;
- selo Profissional Inscrito com menor altura, imagens e margens;
- texto institucional menos prioritário ocultado apenas quando necessário;
- formulário Acessar o sistema deslocado para cima;
- eliminação da rolagem interna no painel esquerdo no tamanho de tela mostrado no feedback.

O conteúdo e os avisos Em desenvolvimento serão preservados. A compactação não deve afetar a apresentação móvel, que continua mostrando apenas o formulário com a marca.

### Assinatura nos documentos

Pareceres, laudos e demais documentos vinculados a uma perícia devem utilizar a assinatura e os dados do responsável técnico da própria perícia (`responsavelId`). O campo `criadoPorId` do documento continuará registrando autoria e histórico, mas não decidirá quem assina uma perícia.

Documentos sem perícia vinculada continuarão usando o usuário que os criou. Assim, trocar a assinatura em Configurações será refletido na prévia e nas próximas gerações de PDF e DOCX, inclusive em documentos antigos reabertos, sem permitir que uma exportação feita por administrador troque o signatário técnico.

## Fluxo de dados

1. O usuário troca a assinatura em Configurações.
2. A API trata a fotografia, grava um novo PNG no volume persistente e atualiza `Usuario.assinaturaArquivo`.
3. A tela adota a resposta atualizada e mostra a nova assinatura.
4. Ao gerar o documento, a API carrega o responsável técnico da perícia.
5. Prévia, PDF e DOCX recebem o mesmo responsável e a assinatura atual armazenada para ele.

## Compatibilidade e segurança

- Nenhuma migração de banco é necessária.
- Perícias e documentos existentes continuam válidos.
- A assinatura não será copiada para o JSON da perícia nem congelada dentro do documento.
- A rota de upload e o volume persistente existentes serão reutilizados.
- Folha de rosto, logos, textos oficiais e estrutura dos documentos não serão remodelados nesta rodada.

## Testes e validação

- Teste de regressão cobrindo agentes de todos os anexos da NR-15 e confirmando uma única conclusão no item 10.
- Testes equivalentes para prévia, HTML/PDF e DOCX.
- Teste da escolha do signatário: responsável da perícia vence o criador do documento; documento sem perícia usa o criador.
- Teste responsivo da tela de login em viewport semelhante ao feedback e em tela ampla.
- Suíte completa, build do frontend e build/typecheck da API.
- Após o push: acompanhamento do workflow, HTTP 200 da aplicação e da API e confirmação do novo bundle em produção.

## Critérios de aceite

- Nenhuma conclusão individual é repetida no item 7 dos anexos da NR-15.
- O item 10 continua apresentando a conclusão de cada avaliação.
- A tela de login cabe sem rolagem no tamanho apresentado pelo cliente.
- A assinatura exibida em Configurações é a mesma usada na prévia, no PDF e no DOCX da perícia.
- Os itens já aprovados permanecem inalterados.
