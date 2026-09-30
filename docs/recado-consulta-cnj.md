# Consulta de processo no CNJ — o que foi feito

## O problema

A busca automática de vara e comarca pelo número do processo estava
falhando com "Falha na comunicação com o servidor (504)".

## A causa

A base pública do CNJ (DataJud) está muito lenta e sobrecarregada.
Isso não é impressão nossa: nas medições que fizemos, o próprio CNJ
informa na resposta que gastou **39 segundos** processando a consulta
— e às vezes recusa a busca de saída, porque a fila de pedidos dele
está cheia.

Conferimos a nossa parte contra a documentação oficial do CNJ: o
endereço, a autenticação e o formato do pedido estão corretos. Também
testamos cinco formas diferentes de montar a consulta: todas demoram
o mesmo. O limite de uso permitido é de 120 consultas por minuto e nós
fazemos uma. Ou seja: não há nada a otimizar do nosso lado para a
consulta ficar mais rápida. A lentidão é da base do CNJ.

## O que mudou no sistema

**1. A busca não desiste mais.**

Antes o sistema esperava 15 segundos e desistia. Como o CNJ demora
mais que isso, praticamente nunca dava tempo.

Agora a busca continua rodando no nosso servidor, e tenta de novo
sozinha quando o CNJ está lento ou ocupado. Na tela o perito vê um
aviso de que a consulta está em andamento e **pode seguir preenchendo
o resto do cadastro** — não fica travado esperando.

Quando os dados chegam, a vara e a comarca se preenchem sozinhas e
aparece um aviso: "Os dados do processo chegaram do CNJ."

Se em três minutos o CNJ não responder, a tela avisa e orienta a
tentar novamente em instantes — ou preencher à mão, que continua
sempre disponível.

Cada processo consultado fica guardado por uma hora, então consultar
o mesmo processo de novo é instantâneo.

**2. Correção importante: o sistema não afirma mais "processo não
encontrado" sem ter certeza.**

Durante os testes descobrimos uma situação séria. Quando o CNJ está
sobrecarregado, ele às vezes responde "tudo certo" tendo consultado
apenas parte da base — e a lista volta incompleta. Um processo que
existe pode simplesmente não aparecer.

O sistema, nesse caso, dizia com toda a confiança: *"O processo não
foi encontrado na base pública; pode estar em segredo de justiça."*
Uma informação errada, e dita com convicção — o que num laudo é pior
do que não ter informação nenhuma.

Agora o sistema reconhece essa resposta incompleta, avisa que a
consulta voltou pela metade e tenta novamente, em vez de afirmar algo
que não sabe.

**3. Ajuste visual.**

O botão "Buscar no CNJ" havia se desalinhado do campo do número do
processo. Corrigido.

## Situação

Tudo testado e publicado. A conferência automática do sistema passou
por completo (129 verificações da área de consultas e a bateria geral
de 1.167 testes, sem falhas), e validamos contra o CNJ de verdade: a
consulta que antes dava erro agora conclui e preenche os campos.

## Ponto de atenção — erro na base do CNJ

Encontramos um dado incorreto vindo do próprio CNJ. Em um processo da
Vara do Trabalho de **Itanhaém**, o CNJ informa o código de município
de **Sorocaba**. Como o sistema confia nesse código, a comarca é
preenchida como "Sorocaba/SP".

Não é um erro nosso, mas afeta o laudo. Dá para corrigir: passar a
usar a cidade que consta no nome da vara quando os dois dados
discordarem. Aguardamos a definição para implementar.

Em qualquer caso, vara e comarca continuam editáveis à mão na tela.
