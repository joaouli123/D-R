# CAS, medições e proteção respiratória — desenho aprovado

## Objetivo

Otimizar a avaliação de agentes químicos da NR-15, principalmente do Anexo 11, estruturando CAS, valores e unidades de medição e vinculando equipamentos de proteção respiratória com seus Certificados de Aprovação (CA). A solução deve reduzir digitação sem indicar automaticamente que um EPI foi efetivamente utilizado.

## Fontes recebidas e limites dos dados

- `nr-15-anexo-11_preenchido_completo.xlsx`: contém agentes, referências “vide”, limites em ppm e mg/m³ e alguns números CAS. Somente os CAS presentes no arquivo serão importados nesta etapa.
- `ANEXOS 11. 12 e 13.Lista_Respiradores_Com_Mais_PFFs.xlsx`: contém 24 configurações válidas de respiradores, categorias, marca, CA, anexos aplicáveis e explicação para conjuntos com dois CAs.
- Agentes sem CAS continuam pesquisáveis e selecionáveis. O CAS permanece vazio até o cliente fornecer arquivos complementares.
- O sistema não pesquisará nem completará CAS usando fontes externas nesta etapa.

## Experiência de uso

### Busca cruzada agente e CAS

- A busca normativa do Anexo 11 pesquisará nome principal, sinônimos e CAS.
- Selecionar um agente preenche automaticamente o CAS quando ele existir na base.
- Pesquisar ou selecionar um CAS identifica e preenche o agente correspondente.
- Linhas “vide” são sinônimos do agente principal e não criam referências duplicadas.
- O usuário poderá informar manualmente um CAS ausente, sem alterar o catálogo global.

### Medição estruturada

- `Valor medido` aceitará somente valor numérico decimal, com vírgula ou ponto na entrada.
- A unidade será armazenada separadamente do número.
- O seletor mostrará apenas unidades disponíveis para a referência selecionada, normalmente `ppm` e/ou `mg/m³`.
- O limite de tolerância exibido acompanhará a unidade selecionada.
- Quando uma referência possuir os dois limites, ambos serão preservados separadamente no catálogo.
- Não haverá conversão automática entre ppm e mg/m³.
- Registros antigos que contenham número e unidade no mesmo texto continuarão legíveis; ao editar, serão normalizados quando a separação for inequívoca. Conteúdo ambíguo será preservado para correção manual.

### Proteção e CA

- Cada agente avaliado poderá ter nenhum, um ou vários EPIs associados.
- O sistema sugerirá equipamentos pela categoria de proteção e pelo anexo aplicável.
- A sugestão nunca selecionará nem marcará automaticamente o equipamento como fornecido ou eficaz.
- O usuário confirmará manualmente o EPI efetivamente utilizado.
- A busca de EPI aceitará categoria, marca, modelo e número de CA.
- Permanecerá disponível uma entrada manual para equipamentos ainda não existentes no catálogo.

## Modelo de dados

### Catálogo de agentes do Anexo 11

Cada referência poderá conter:

- nome principal;
- sinônimos;
- CAS opcional;
- limite em ppm opcional;
- limite em mg/m³ opcional;
- valor teto;
- absorção pela pele;
- grau e demais marcadores normativos já existentes.

O CAS será tratado como identificador pesquisável, mas não obrigatório nem presumido como único enquanto a base estiver incompleta.

### Catálogo de EPIs

Será criada uma entidade persistente de equipamento com:

- categoria de proteção;
- modelo/configuração;
- marca;
- CA da peça facial, quando aplicável;
- CA do filtro/cartucho, quando aplicável;
- CA único para PFF, quando aplicável;
- anexos NR-15 relacionados;
- explicação/observação;
- estado ativo/inativo.

Os valores `4115 / 5635`, por exemplo, serão armazenados como CA da peça facial e CA do cartucho, não como um único texto opaco.

### Associação na perícia

O agente avaliado manterá:

- referência normativa e CAS;
- valor medido numérico e unidade;
- limite aplicável e unidade;
- associações aos EPIs confirmados;
- indicação de eficácia já existente;
- cópia dos dados essenciais do EPI selecionado para que documentos antigos não mudem caso o catálogo seja atualizado.

## Regras de sugestão

- Equipamentos serão filtrados primeiro pelo anexo da referência.
- Para agentes com categoria específica reconhecida, serão priorizadas categorias como vapores orgânicos, gases ácidos, amônia e aminas, formaldeído ou mercúrio.
- `Multigases` poderá aparecer como alternativa compatível, nunca como escolha automática.
- Para agentes sem mapeamento específico, o catálogo continuará pesquisável, mas não haverá recomendação técnica presumida.
- Itens de particulados relacionados aos Anexos 12 e 13 serão importados, mesmo que a primeira tela otimizada seja o Anexo 11.

## Documentos

A prévia, o PDF e o DOCX apresentarão, quando preenchidos:

- agente e CAS;
- valor medido e unidade;
- limite correspondente e unidade;
- proteção utilizada;
- marca/modelo;
- CA único ou CAs de peça facial e cartucho;
- resultado de eficácia do EPI.

Campos ausentes serão omitidos ou exibidos como `—`, sem inventar informações.

## Backend e importação

- A planilha de respiradores será convertida em seed/migração idempotente do catálogo.
- Atualizações futuras poderão complementar o catálogo sem duplicar equipamentos.
- A API validará valores numéricos, unidades permitidas e referências de EPI.
- Alterações de catálogo não apagarão associações históricas.
- A importação rejeitará linhas sem modelo e registrará duplicidades ou CAs malformados.

## Compatibilidade e erros

- Perícias antigas continuarão abrindo e gerando documentos.
- Campos legados de medição textual não serão descartados silenciosamente.
- Se o catálogo estiver indisponível, o preenchimento manual continuará possível.
- CAS ausente será um estado válido, não um erro.
- Um EPI sugerido não implica adequação, fornecimento, treinamento, validade do CA ou neutralização do risco; essas conclusões permanecem sob responsabilidade do profissional.

## Testes e aceite

- Busca por agente, sinônimo e CAS.
- Preenchimento agente → CAS e CAS → agente.
- Agente sem CAS continua selecionável.
- Valor medido rejeita texto e preserva decimais.
- Unidade altera o limite exibido sem realizar conversão.
- Importação idempotente dos 24 equipamentos válidos.
- Separação correta de CA único e CA duplo.
- Sugestões por categoria sem seleção automática.
- Associação manual de mais de um EPI.
- Compatibilidade com perícias antigas.
- Consistência entre tela, API, PDF e DOCX.
- Builds, testes automatizados e smokes documentais aprovados antes do deploy.

## Fora do escopo desta etapa

- Pesquisa externa para completar números CAS.
- Verificação online da validade atual dos CAs.
- Conversão automática entre ppm e mg/m³.
- Afirmação automática de que o EPI neutraliza o agente.
- Importação automática de futuras planilhas com estrutura desconhecida.
