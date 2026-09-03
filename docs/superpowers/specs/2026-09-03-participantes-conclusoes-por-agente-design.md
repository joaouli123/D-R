# Participantes e conclusões individuais por agente

## Objetivo

Adequar o cadastro de participantes e a apresentação das avaliações ocupacionais ao feedback de 01/09, mantendo a mesma informação na tela, na prévia, no Word e no PDF.

## Escopo

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

## Tratamento de erros

- A emissão indicará todas as avaliações sem conclusão antes de iniciar a exportação.
- Uma empresa com razão social vazia não produzirá pontuação ou separador órfão na qualificação.
- A ausência da parte reclamante não exigirá preenchimento artificial do campo Nome.
- A troca entre agente identificado e não identificado não apagará medições, EPIs ou outros dados já informados.

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
- independência entre dois ou mais agentes e suas conclusões.

Antes do deploy serão executados a suíte completa, o build do frontend, o build da API e os testes documentais existentes. Após o push, serão conferidos o workflow, a saúde da API e o bundle público do frontend.

## Fora do escopo

- Produzir conclusões técnicas ou jurídicas automaticamente.
- Alterar os textos gerais de conclusão de NR-15 e NR-16.
- Abreviar a empresa na identificação das partes.
- Alterar a matriz de periculosidade NR-16.
- Revisar os demais itens históricos do documento de feedback que não foram reiterados no pedido atual.
