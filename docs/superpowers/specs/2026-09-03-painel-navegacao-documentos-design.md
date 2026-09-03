# Painel de navegação por documentos

## Objetivo

Substituir a navegação genérica por um painel lateral orientado às ações e aos documentos solicitados pelo cliente, deixando explícita a diferença entre funcionalidades disponíveis e módulos futuros.

## Navegação disponível

O menu principal será exibido nesta ordem:

1. Início
2. Cadastrar Empresa
3. Gerar Parecer Técnico Pericial
4. Gerar Laudo Técnico Pericial
5. Elaborar Quesitos Técnicos
6. Elaborar Manifestação sobre o Laudo
7. Elaborar Impugnação ao Laudo
8. Elaborar Esclarecimentos Técnicos
9. Biblioteca
10. Configurações
11. Ajuda

Cada opção usará um ícone Lucide coerente com o sistema. Os atalhos apontarão para as rotas já existentes e abrirão diretamente o fluxo correspondente. Os nomes da tela inicial serão alinhados aos nomes do painel.

As páginas de histórico de perícias e documentos não serão excluídas. Elas continuarão acessíveis pela tela inicial, pelos cartões de registros e pela busca global.

## Em desenvolvimento

Após os módulos disponíveis, haverá uma seção visualmente separada com o título **Em desenvolvimento** e estes itens:

1. Gerar PGR
2. Gerar Laudo de Insalubridade
3. Gerar Laudo de Periculosidade
4. Gerar LTCAT
5. Entrega de EPIs por biometria/facial

Esses itens serão apresentados como controles desabilitados, com contraste reduzido e selo **Em breve**. Eles não terão rota, clique ou comportamento simulado.

Os dois laudos específicos permanecerão nessa seção até existirem como fluxos próprios, mesmo que o gerador atual de Laudo Técnico Pericial já permita selecionar insalubridade ou periculosidade internamente.

## Layout e responsividade

- O painel lateral será ampliado apenas o necessário para comportar os títulos com leitura confortável.
- Títulos longos poderão ocupar duas linhas, sem truncamento e sem reduzir excessivamente a fonte.
- A área principal terá seu recuo ajustado à nova largura do painel.
- O painel continuará rolável em telas de menor altura.
- No celular, o comportamento atual de abrir e fechar o menu será preservado.
- A seção **Em desenvolvimento** terá hierarquia secundária e não competirá visualmente com as ações disponíveis.

## Acessibilidade

- Links disponíveis manterão indicação de página ativa, foco visível e rótulo textual completo.
- Itens futuros usarão semântica de controle desabilitado e não entrarão no fluxo de navegação por teclado.
- O título da seção e o selo **Em breve** não dependerão somente de cor.

## Testes e aceite

Serão verificados:

- ordem e rótulos exatos dos itens disponíveis;
- destinos corretos para cada documento;
- estado desabilitado dos cinco módulos futuros;
- ausência de navegação nos itens futuros;
- destaque da rota ativa;
- fechamento do menu após navegação em dispositivos móveis;
- ausência de truncamento destrutivo dos títulos;
- funcionamento do build e da suíte completa.

Após o push, o workflow de produção deverá concluir frontend e API, e o bundle público deverá conter o novo painel.

## Fora do escopo

- Implementar PGR, LTCAT ou entrega biométrica/facial.
- Criar geradores independentes de laudo de insalubridade e periculosidade.
- Remover históricos, rotas existentes ou a busca global.
