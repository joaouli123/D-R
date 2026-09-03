# Participantes e conclusões individuais por agente

## Objetivo

Adequar o cadastro de participantes e a apresentação das avaliações ocupacionais ao feedback de 01/09, mantendo a mesma informação na tela, na prévia, no Word e no PDF.

## Escopo

### Origem oficial dos agentes químicos e números CAS

- A lista fixa de números CAS mantida no frontend deixará de ser a fonte de consulta do sistema.
- Os dados normativos — agente, anexo, limite, unidade, grau e observações legais — continuarão vinculados à publicação vigente da NR-15 pelo Ministério do Trabalho e Emprego.
- A identificação química e os números CAS serão consultados na API pública governamental PubChem PUG REST, mantida pelo National Institutes of Health dos Estados Unidos, sem geração ou complementação por IA.
- O resultado será importado e armazenado em uma tabela própria do backend, com:
  - nome preferencial;
  - número CAS;
  - sinônimos;
  - identificador PubChem;
  - fonte;
  - data da consulta e da última atualização;
  - vínculo com o agente e o anexo da NR-15, quando aplicável.
- O sistema fará busca cruzada por nome, sinônimo ou CAS primeiro no espelho local. Quando não houver resultado, o backend consultará a fonte pública, validará a resposta e armazenará o resultado para as próximas buscas.
- A integração respeitará o limite público de até cinco requisições por segundo e terá tentativas controladas para indisponibilidade temporária.
- Um resultado externo somente será aceito automaticamente quando identificar um único composto e um CAS válido. Ambiguidades serão apresentadas como opções ao usuário; não haverá escolha silenciosa.
- A tela mostrará a origem e a data de atualização do registro selecionado.
- Se a fonte estiver indisponível e não houver registro local, o sistema não inventará nem reutilizará um CAS aproximado; permitirá tentar novamente e manterá o campo sem preenchimento automático.
- Agentes coletivos, misturas e categorias dos Anexos 12 e 13 que não possuam um CAS único não receberão um número forçado. Nesses casos, o usuário poderá pesquisar e associar a substância específica efetivamente identificada na FDS/FISPQ.
- A base CAS Common Chemistry não será integrada sem licença comercial, pois seus termos públicos são não comerciais. A arquitetura permitirá trocar o provedor por uma API licenciada da CAS no futuro sem mudar o fluxo da tela.

### Ausência da parte reclamante

- O grupo **Parte Reclamante** terá a opção **Parte reclamante ausente**.
- Essa opção não exigirá nome de participante.
- No documento, será apresentada uma única linha ocupando as três colunas da tabela de participantes com o texto: **A parte reclamante não compareceu para a apresentação de suas alegações.**
- O texto é neutro e não varia conforme gênero.
- Os demais participantes da parte reclamante continuam podendo ser cadastrados normalmente no mesmo processo.

### Novas representações das reclamadas

- Os grupos **Reclamada Principal** e **Reclamadas Envolvidas no Processo** terão as opções:
  - **Representante Setorial** — “Acompanhamento e esclarecimentos pertinentes ao setor.”
  - **Recursos Humanos** — “Acompanhamento e esclarecimentos pertinentes à área administrativa.”
- As opções existentes permanecem disponíveis.

### Nome abreviado da empresa na representação

- Somente na coluna **Qualificação / Representação** da tabela de participantes, o vínculo empresarial será exibido como `Qualificação, PrimeiroNome`.
- `PrimeiroNome` será a primeira palavra não vazia da razão social cadastrada.
- A razão social completa e o CNPJ continuarão sendo usados na seção **Identificação das Partes** e nos demais locais do documento.
- Se a empresa não estiver disponível, será exibida somente a qualificação, sem vírgula ou sufixo vazio.

### Conclusão individual por avaliação

- Cada avaliação de agente físico, químico ou biológico terá um campo explícito **Conclusão da avaliação**.
- O valor será persistido por agente, sem compartilhamento entre avaliações.
- Para preservar os pareceres já cadastrados, o conteúdo existente no campo técnico individual será reutilizado como conclusão; não haverá migração destrutiva.
- Na tela, a conclusão ficará no mesmo cartão da avaliação e poderá receber conteúdo selecionado da biblioteca.
- A conclusão individual não substitui as conclusões gerais de NR-15 e NR-16 no fim do documento.

### Presença ou ausência do agente

- Cada avaliação NR-15 terá a opção **Agente identificado na atividade**.
- O estado padrão será identificado, inclusive para registros antigos sem o novo valor salvo.
- Quando identificado:
  - a tabela de propriedades será gerada;
  - a conclusão individual será exibida imediatamente abaixo da tabela.
- Quando não identificado:
  - os dados cadastrados serão preservados para permitir reversão;
  - a tabela de propriedades e as proteções associadas não serão exibidas no documento;
  - será exibido diretamente o título do agente e sua conclusão de ausência.
- A opção se aplica a agentes físicos, químicos e biológicos. Avaliações de periculosidade permanecem fora deste ajuste.

## Fluxo na interface

1. O usuário adiciona uma avaliação NR-15.
2. Informa se o agente foi identificado na atividade.
3. Se identificado, preenche propriedades, medição e EPIs.
4. Preenche a conclusão individual no cartão do agente, diretamente ou pela biblioteca.
5. A prévia apresenta a mesma estrutura que será exportada.

Para agentes químicos, a seleção seguirá este fluxo:

1. O usuário pesquisa pelo nome, sinônimo ou número CAS.
2. O backend consulta o espelho local e, se necessário, a fonte pública oficial.
3. Ao selecionar uma correspondência inequívoca, nome e CAS são preenchidos em conjunto.
4. Limites, unidades e grau continuam vindo exclusivamente da matriz normativa do anexo aplicável, sem serem substituídos por dados toxicológicos externos.

O campo de conclusão será visível e identificado como obrigatório para a emissão. O sistema impedirá a geração de Word/PDF quando houver uma avaliação NR-15 sem conclusão, informando qual agente precisa ser completado.

## Geração documental

A regra será compartilhada conceitualmente pelos três geradores:

- prévia React;
- HTML usado no PDF;
- DOCX.

Para agente identificado, a ordem será:

1. título numerado da avaliação;
2. tabela de propriedades;
3. proteções associadas, quando houver;
4. subtítulo **Conclusão**;
5. texto da conclusão individual.

Para agente não identificado, a ordem será:

1. título numerado da avaliação;
2. subtítulo **Conclusão**;
3. texto da conclusão de ausência.

As avaliações continuarão numeradas individualmente e não poderão substituir ou incorporar dados de outro agente.

## Dados e compatibilidade

- Será acrescentado ao agente um booleano opcional para registrar a presença do agente.
- Ausência do valor será interpretada como `true`, preservando o comportamento dos registros antigos.
- O texto individual continuará no campo persistido atualmente para a observação técnica, evitando perda de conteúdo e migração desnecessária.
- Os novos papéis de participantes serão aceitos pela validação da API e persistidos na estrutura atual de participantes.
- Uma nova tabela armazenará o espelho dos identificadores químicos e sua procedência.
- Os pareceres existentes manterão os nomes e CAS já salvos; a nova fonte será aplicada às novas seleções e às consultas feitas pelo usuário.
- A tabela fixa atual poderá ser usada apenas em teste de migração e comparação, mas não será apresentada como fonte oficial nem prevalecerá sobre a consulta importada.

## Tratamento de erros

- A emissão indicará todas as avaliações sem conclusão antes de iniciar a exportação.
- Uma empresa com razão social vazia não produzirá pontuação ou separador órfão na qualificação.
- A ausência da parte reclamante não exigirá preenchimento artificial do campo Nome.
- A troca entre agente identificado e não identificado não apagará medições, EPIs ou outros dados já informados.
- Falhas do PubChem não impedirão a edição de avaliações já salvas e não apagarão resultados previamente importados.
- A validação de CAS verificará formato e dígito de controle antes da persistência.

## Testes e aceite

Serão cobertos por testes automatizados:

- classificação e opções dos novos papéis de participantes;
- linha mesclada de ausência na prévia, HTML e DOCX;
- abreviação da empresa apenas na qualificação dos participantes;
- manutenção da razão social completa na identificação das partes;
- tabela seguida imediatamente pela conclusão para agente identificado;
- ausência de tabela e presença da conclusão para agente não identificado;
- compatibilidade de registros antigos sem o novo booleano;
- bloqueio de emissão quando faltar conclusão individual;
- independência entre dois ou mais agentes e suas conclusões;
- busca bidirecional por nome e CAS no espelho local;
- importação e cache de resposta inequívoca da fonte pública;
- recusa de CAS inválido ou ambíguo;
- preservação dos limites normativos do MTE após selecionar um identificador químico;
- funcionamento em contingência quando a fonte externa estiver indisponível.

Antes do deploy serão executados a suíte completa, o build do frontend, o build da API e os testes documentais existentes. Após o push, serão conferidos o workflow, a saúde da API e o bundle público do frontend.

## Fora do escopo

- Produzir conclusões técnicas ou jurídicas automaticamente.
- Alterar os textos gerais de conclusão de NR-15 e NR-16.
- Abreviar a empresa na identificação das partes.
- Alterar a matriz de periculosidade NR-16.
- Revisar os demais itens históricos do documento de feedback que não foram reiterados no pedido atual.
