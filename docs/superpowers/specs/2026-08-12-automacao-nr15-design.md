# Automacao completa dos agentes e riscos da NR-15

## Objetivo

Completar o modulo "Agentes e Riscos Avaliados" conforme a quinta otimizacao, transformando a selecao do enquadramento normativo em uma fonte confiavel para preenchimento, persistencia e geracao documental.

O sistema deve continuar aceitando pericias antigas e campos livres, mas novos cadastros orientados pelos Anexos 1 a 14 devem aplicar automaticamente as regras descritas nesta especificacao.

## Fontes normativas

- Especificacao funcional entregue pelo cliente: `Quinta otimizacao - Agentes e riscos avaliados - Injecao Automatica de Dados (1).pdf`.
- Pagina oficial da NR-15 do Ministerio do Trabalho e Emprego.
- Textos oficiais vigentes dos Anexos 11, 13 e 14 disponibilizados pelo Ministerio do Trabalho e Emprego.

Os dados normativos serao versionados no repositorio. Cada conjunto indicara o anexo e a fonte de origem para permitir revisoes futuras sem depender de servicos externos em tempo de execucao.

## Abordagem escolhida

Manter bases normativas tipadas no frontend e regras puras de preenchimento, com os valores selecionados salvos dentro de `tecnico.agentes`, que ja e persistido como JSON pelo backend.

Essa abordagem evita criar tabelas administrativas para dados que nao serao editados pelos usuarios, elimina dependencia de rede e preserva o modelo atual. O backend passara a validar os novos campos opcionais sem rejeitar registros antigos.

## Modelo de dados do agente

Cada agente continuara contendo os campos atuais e podera armazenar:

- `anexoNr15`: identificador do anexo ou enquadramento;
- `referenciaNormativaId`: identificador estavel da substancia, atividade ou subcategoria;
- `atividadeEnquadrada`: descricao normativa selecionada nos Anexos 13 ou 14;
- `unidadeLimite`: unidade associada ao limite do Anexo 11;
- os campos existentes `nome`, `cas`, `tipo`, `grau`, `criterio`, `limiteTolerancia`, `medido`, `epiEficaz` e `observacao`.

Todos os novos campos serao opcionais para manter compatibilidade com dados existentes. O backend deve aceitar, salvar e devolver esses valores sem migracao destrutiva do banco, pois `tecnico` ja utiliza JSON.

## Regras gerais de injecao

Ao selecionar um anexo, o sistema deve preencher natureza, grau, criterio e limite conforme o mapeamento. A alteracao nao deve apagar `medido`, `epiEficaz` ou `observacao`.

- Limite estatico: valor injetado e campo somente leitura.
- Limite editavel: campo aberto com valor inicial ou placeholder normativo.
- Avaliacao qualitativa: texto de enquadramento injetado, sem exigir unidade ou medicao.
- Grau dinamico: definido pela substancia ou atividade escolhida; antes dessa escolha, fica sem valor.
- Se o usuario mudar para outro anexo, referencias especificas do anexo anterior devem ser removidas para evitar dados incoerentes.
- Entradas legadas ou anexos sem automacao permanecem editaveis.

## Anexos 1 a 12

O mapeamento atual sera revisado contra o PDF e as fontes oficiais. Os valores fixos permanecerao bloqueados. Calor e silica continuarao editaveis nos pontos em que o calculo depende do caso concreto.

### Anexo 11 - agentes quimicos

Ao selecionar o Anexo 11, o campo de agente se transforma em busca pesquisavel sobre a base interna do Quadro 1. A busca deve aceitar trechos do nome e ignorar diferencas de maiusculas, minusculas e acentos.

Ao escolher uma substancia, o sistema preenche:

- nome do agente;
- referencia normativa;
- limite em ppm e/ou mg/m3 conforme a linha oficial;
- unidade apresentada;
- grau minimo, medio ou maximo;
- indicacoes normativas adicionais disponiveis na tabela, quando relevantes para identificacao.

O valor medido permanece manual. Se houver mais de um limite oficial para a mesma substancia, a interface deve apresentar as opcoes de forma explicita, sem escolher silenciosamente uma condicao que dependa do caso.

## Anexo 13 - atividades com agentes quimicos

Ao selecionar o Anexo 13, a interface exibe uma busca/selecao de atividades agrupadas pelo agente ou grupo quimico e pelo grau previsto na norma.

Ao escolher uma atividade, o sistema preenche o nome resumido, a descricao normativa em `atividadeEnquadrada`, o grau, o criterio qualitativo e o texto de limite nao aplicavel. O grau fica bloqueado enquanto houver uma atividade normativa selecionada.

## Anexo 14 - agentes biologicos

Ao selecionar o Anexo 14, a interface exibe as atividades e condicoes de contato permanente previstas na norma, agrupadas em grau maximo e grau medio.

Ao escolher uma subcategoria, o sistema preenche a atividade, o grau correspondente, a natureza biologica, o criterio qualitativo e o texto de limite nao aplicavel. O grau fica bloqueado enquanto houver uma subcategoria normativa selecionada.

## Interface

O cartao de cada agente continuara dentro do passo atual da pericia, preservando o layout aprovado. Os controles especializados aparecerao somente quando o anexo selecionado exigir:

- Anexo 11: busca de substancia;
- Anexo 13: busca de atividade quimica;
- Anexo 14: selecao de atividade biologica.

Campos preenchidos automaticamente devem comunicar visualmente que derivam da norma. Campos somente leitura devem continuar legiveis e acessiveis, sem parecer desativados de forma excessivamente apagada. Mensagens curtas devem explicar placeholders, selecoes pendentes e ausencia de resultados.

## Persistencia e documentos

O schema de validacao da API sera ampliado para os campos opcionais. Salvar e reabrir uma pericia deve reproduzir exatamente a substancia ou atividade selecionada.

PDF e DOCX devem exibir, quando existentes:

- agente ou atividade;
- natureza;
- anexo;
- criterio;
- limite e unidade;
- valor medido;
- grau;
- observacoes relevantes.

Documentos de pericias antigas devem continuar sendo gerados com os campos disponiveis, sem exigir as novas referencias.

## Erros e estados excepcionais

- Busca sem resultado: informar que nenhum item normativo foi encontrado e permitir revisar o texto pesquisado.
- Registro legado: preservar o texto livre e nao tentar convertê-lo automaticamente.
- Referencia normativa desconhecida ao reabrir: mostrar os dados salvos e sinalizar que a referencia nao esta na versao atual da base, sem descartar informacao.
- Troca de anexo: limpar somente os campos derivados incompatíveis; nunca apagar medicao e observacoes do perito.

## Testes e criterios de aceite

1. Cada anexo do PDF injeta natureza, grau, criterio e limite corretos.
2. Limites estaticos nao podem ser editados; calor e silica permitem os ajustes previstos.
3. A busca do Anexo 11 encontra itens por nome sem diferenciar acentos ou caixa e aplica limite, unidade e grau.
4. Anexos 13 e 14 aplicam a atividade e o grau correspondentes.
5. Trocar o anexo remove referencias incompatíveis, preservando medicao, EPI e observacoes.
6. Salvar e reabrir mantem todos os novos campos.
7. O backend aceita dados novos e registros legados.
8. PDF e DOCX mostram os novos dados sem regressao visual.
9. Build, verificacao de tipos e testes automatizados passam no frontend e backend.
10. Um teste de producao cria, salva, reabre e gera um documento com representantes dos Anexos 11, 13 e 14.

## Fora do escopo

- Editor administrativo da base normativa.
- Consulta a APIs externas em tempo de execucao.
- Calculo automatico de IBUTG ou de concentracao de silica a partir de resultados laboratoriais.
- Interpretacao automatica de laudos para escolher enquadramento sem acao do perito.

