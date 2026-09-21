# Laudo Pericial — quesitos, fotografias técnicas e honorários

## Objetivo

Completar o fluxo específico do Laudo Técnico Pericial com três recursos que não pertencem ao Parecer Técnico: respostas aos quesitos separadas por origem, evidências fotográficas vinculadas à avaliação de cada agente e proposta de honorários periciais.

O Parecer Técnico continuará com a estrutura atual. Os novos blocos serão oferecidos e impressos somente quando o documento for um Laudo Técnico Pericial.

## Decisões de produto

### Respostas aos quesitos

O atual campo único `respostasQuesitos` será preservado para compatibilidade com perícias antigas. Para laudos novos, o editor apresentará três campos opcionais e independentes:

- Quesitos da Reclamada;
- Quesitos do Reclamante;
- Quesitos do Juízo.

Cada campo aceitará texto livre com parágrafos, quebras de linha e numeração. A ação rápida **Não apresentado** preencherá a menção padronizada no bloco correspondente. O conteúdo não será transformado em HTML rico: essa escolha evita marcação incompatível entre navegador, PDF e Word e preserva a estabilidade do documento. Texto antigo existente em `respostasQuesitos` continuará sendo exibido em um bloco legado, sem perda.

No documento, somente blocos preenchidos serão impressos, sob o título geral **Respostas aos Quesitos Técnicos**, com subtítulos por origem. A ordem será Juízo, Reclamante e Reclamada.

### Fotografias das medições e avaliações

A fotografia será ligada ao identificador do agente avaliado, e não apenas a uma seção genérica do documento. O modelo `Foto` receberá `agenteId` opcional. Fotos antigas, sem esse vínculo, continuarão válidas e permanecerão em suas seções atuais.

Na interface, cada cartão de agente terá um bloco **Evidências fotográficas da avaliação**, logo após medição, proteção e conclusão. O bloco permitirá selecionar arquivos ou capturar imagens pela câmera do celular por meio de `accept="image/*"` e `capture="environment"`. Peritos e assistentes autenticados poderão enviar imagens; a autorização seguirá a mesma regra já usada pelo módulo fotográfico.

O bloco reutilizará preparo, compactação, limites, upload, legenda e exclusão já existentes. As fotos serão exibidas em miniaturas com legenda editável. No DOCX, PDF e prévia, as imagens vinculadas aparecerão imediatamente após a tabela do respectivo agente, mantendo medição e comprovação visual juntas.

Na etapa geral **Fotografias**, será mantida a organização atual. As fotos de agentes também aparecerão em um agrupamento próprio, identificadas pelo nome do agente, para revisão centralizada sem duplicação no documento.

### Honorários periciais

O Laudo terá o campo **Valor proposto dos honorários periciais**, com máscara monetária em reais. O sistema armazenará o valor em centavos para não depender de separador decimal e converterá automaticamente o total para português por extenso.

Quando houver valor preenchido, o documento incluirá **Dos Honorários Periciais** após o encerramento e antes da manifestação final, data e assinatura. A redação seguirá o arquivo revisado:

> Considerando a natureza, a complexidade e a responsabilidade técnica do trabalho realizado, incluindo diligência, análise dos elementos constantes dos autos e elaboração do Laudo Técnico Pericial, requer o Perito o arbitramento de seus honorários em R$ [VALOR] ([VALOR POR EXTENSO]).

> O valor tem como referência o Regulamento de Honorários para Avaliações e Perícias de Engenharia do IBAPE/SP, especialmente o Art. 4º, que trata da estimativa e do arbitramento dos honorários nas perícias judiciais, e o Art. 5º, acrescido das despesas diretas previstas no regulamento.

O valor será editável pelo perito ou assistente. A redação padrão ficará centralizada na matriz; alterações de texto continuarão restritas ao administrador. Se o valor não estiver preenchido, a seção não será impressa e nenhum marcador `[VALOR]` chegará ao documento final.

## Modelo de dados e compatibilidade

- `PreenchimentoTecnico` receberá `quesitosReclamada`, `quesitosReclamante`, `quesitosJuizo` e `honorariosPericiaisCentavos` como campos opcionais no JSON já persistido.
- `Foto` receberá `agenteId` opcional no frontend, API e banco PostgreSQL.
- A migração adicionará a coluna anulável e índice composto por perícia e agente.
- Perícias antigas continuam abrindo sem transformação obrigatória.
- O campo legado `respostasQuesitos` não será removido nem apagado.
- Fotos antigas continuam ordenadas nas seções atuais.

## Fluxo e tratamento de erros

1. O usuário salva o rascunho antes do primeiro upload, como já ocorre na etapa geral de fotos.
2. O upload envia a seção técnica e o `agenteId`.
3. A API valida que o agente existe no JSON técnico daquela perícia antes de gravar a relação.
4. Falha de upload mantém os dados digitados no cartão e informa quais arquivos foram recusados.
5. Exclusão remove banco e arquivo físico pela rota atual.
6. Excluir um agente exige remover ou desvincular previamente suas fotos; a interface apresentará confirmação para não criar evidências órfãs.

## Apresentação visual

O novo bloco fotográfico será discreto e integrado ao cartão do agente: cabeçalho pequeno com ícone de câmera, contador de fotos, botão **Adicionar fotos** e grade de miniaturas 4:3. Não haverá um segundo cartão grande dentro do agente. A hierarquia seguirá o fluxo real **Agente → Medição → Proteção → Conclusão → Evidências**.

Os três grupos de quesitos ficarão em cartões separados na etapa de conclusão, com rótulo de origem e ação **Não apresentado** no cabeçalho. Honorários ficará em cartão próprio no final da mesma etapa, visível apenas no modo Laudo.

## Testes e validação

- Persistência e compatibilidade dos três campos de quesitos.
- Ação **Não apresentado** sem sobrescrever outro grupo.
- Prévia, HTML/PDF e DOCX com títulos e ordem corretos.
- Upload de foto ligado a agente válido e recusa de agente inexistente.
- Duas avaliações com fotografias distintas sem mistura ou substituição.
- Fotos antigas sem `agenteId` mantidas na posição atual.
- Honorários formatados em reais e por extenso, incluindo centavos.
- Ausência da seção de honorários quando não houver valor.
- Regressão para Parecer Técnico: nenhum dos blocos exclusivos do Laudo deve aparecer.
- Suíte completa, typecheck e builds de frontend e API.
- Após o push, workflow de produção, saúde da API e bundle público verificados.

## Critérios de aceite

- O Laudo permite registrar separadamente os quesitos do Juízo, Reclamante e Reclamada.
- A formatação textual essencial — parágrafos, linhas e numeração — é preservada nos três formatos.
- Cada foto de medição permanece vinculada ao agente correto na tela e no documento.
- Perito e assistente conseguem selecionar arquivos ou abrir a captura de câmera em dispositivo compatível.
- O valor dos honorários aparece em reais e por extenso no local aprovado do Laudo.
- Pareceres e dados antigos permanecem inalterados.
