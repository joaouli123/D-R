# Participantes e conclusões individuais por agente

## Objetivo

Adequar o cadastro de participantes e a apresentação das avaliações ocupacionais ao feedback de 01/09, mantendo a mesma informação na tela, na prévia, no Word e no PDF.

## Escopo

### Origem oficial dos agentes químicos e números CAS

> Revisto em 05/09/2026. O desenho original previa importar os números CAS da
> API pública do PubChem. A auditoria feita antes de implementar mostrou que a
> importação resolveria um problema que a base não tem, e criaria outro — o
> texto abaixo descreve o que foi implementado.

- A lista de agentes, anexos, limites, unidades e graus continua vinculada à
  publicação vigente da NR-15 pelo Ministério do Trabalho e Emprego. Ela foi
  conferida contra o PDF oficial dos Anexos 11, 12 e 13.
- Os números CAS continuam mantidos no frontend, gravados na avaliação e
  impressos no parecer. Eles foram auditados em 04–05/09/2026: 150 números, os
  150 com dígito de controle válido e formato correto, 143 confirmados por nome
  e fórmula molecular no PubChem e 4 conferidos à mão (misturas e genéricos que
  o PubChem não indexa) — **nenhuma divergência**.
- Não haverá preenchimento automático de CAS a partir de fonte externa. A
  auditoria não achou erro para corrigir, e o próprio PubChem devolve composto
  errado em casos reais de sinônimo ambíguo (o CAS 19624-22-7, pentaborano,
  retorna EPN); um autopreenchimento silencioso trocaria um número correto por
  um errado sem o perito perceber.
- Em vez da importação, cada agente químico da tela oferece a consulta a um
  clique, levando o CAS já gravado para a busca de duas bases públicas e sem
  cadastro: **CAS Common Chemistry**, publicado pela própria CAS — que atribui o
  número —, e **PubChem**, do NIH, como cobertura complementar. É o mesmo padrão
  do link para o portal do CAEPI usado na conferência do CA do EPI.
- O link usa a busca da base, e não a ficha direta. O Common Chemistry cobre um
  recorte de substâncias e sua rota de ficha (`/detail?cas_rn=`) abre em branco
  para um CAS ausente; a busca responde que não encontrou, e o link do PubChem
  fica ao lado.
- Sem CAS gravado, o link abre a base sem termo. O nome do agente não é enviado
  na URL: as duas bases respondem em inglês.
- Agentes coletivos, misturas e categorias dos Anexos 12 e 13 que não possuam um
  CAS único não recebem número forçado. O perito pesquisa e associa a substância
  específica identificada na FDS/FISPQ.
- A base CAS Common Chemistry não é integrada por API: a API exige `X-API-KEY` e
  a licença pública é CC BY-NC. Só o site é livre — daí o link, e não a
  importação. A CETESB foi avaliada e descartada: sua listagem pública tem 96
  produtos e cobre 40 dos 146 agentes do Anexo 11, além de não aceitar termo de
  busca na URL.

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

1. O usuário pesquisa pelo nome, sinônimo ou número CAS na lista do anexo.
2. Ao selecionar o agente, nome e CAS são preenchidos em conjunto a partir da lista normativa.
3. Limites, unidades e grau continuam vindo exclusivamente da matriz normativa do anexo aplicável, sem serem substituídos por dados toxicológicos externos.
4. Ao lado do campo CAS, o link de consulta leva o número às bases públicas para conferência antes da emissão.

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
- Não há tabela de espelho de identificadores químicos: sem importação externa, não há o que espelhar.
- Os pareceres existentes mantêm os nomes e CAS já salvos, sem migração.

## Tratamento de erros

- A emissão indicará todas as avaliações sem conclusão antes de iniciar a exportação.
- Uma empresa com razão social vazia não produzirá pontuação ou separador órfão na qualificação.
- A ausência da parte reclamante não exigirá preenchimento artificial do campo Nome.
- A troca entre agente identificado e não identificado não apagará medições, EPIs ou outros dados já informados.
- A indisponibilidade das bases externas não afeta o preenchimento nem a emissão: elas são apenas destino de link, abertas em nova aba pelo navegador do perito.
- Revisão de 05/09/2026: o campo CAS só fica travado quando o número vem de quem o impõe — substância do Anexo 11 (a lista traz o CAS) ou agente fixo do Anexo 12. Nas atividades do Anexo 13, que enquadram a operação e não uma substância, o campo fica livre para o perito registrar o CAS do composto específico. O número digitado à mão passa por conferência de formato e de dígito verificador (`src/lib/cas.ts`); o aviso aparece no campo, não bloqueia o registro e some enquanto o número ainda está pela metade.

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
- busca por nome e CAS na lista normativa do anexo;
- montagem do link de consulta com o CAS gravado, nas duas bases;
- link sem termo quando o agente ainda não tem CAS;
- ausência do link em agente físico;
- preservação dos limites normativos do MTE após selecionar um agente químico;
- validação do CAS digitado (formato, dígito verificador, número pela metade e campo vazio);
- campo CAS livre no Anexo 13 e travado no Anexo 11 e no Anexo 12, dentro do editor;
- link de consulta com o CAS da substância quando o registro antigo gravou o campo vazio.

Antes do deploy serão executados a suíte completa, o build do frontend, o build da API e os testes documentais existentes. Após o push, serão conferidos o workflow, a saúde da API e o bundle público do frontend.

## Fora do escopo

- Produzir conclusões técnicas ou jurídicas automaticamente.
- Alterar os textos gerais de conclusão de NR-15 e NR-16.
- Abreviar a empresa na identificação das partes.
- Alterar a matriz de periculosidade NR-16.
- Revisar os demais itens históricos do documento de feedback que não foram reiterados no pedido atual.
