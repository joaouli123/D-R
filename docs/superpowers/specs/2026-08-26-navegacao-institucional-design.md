# Navegação institucional e aplicação da marca D&R

## Objetivo

Transformar a barra lateral em um painel de ações alinhado ao trabalho pericial, integrar visualmente a logo oficial ao sistema e eliminar a aparência de imagem colada sobre o fundo escuro.

## Direção aprovada

A solução adotada é a “Faixa institucional”, opção A da comparação visual aprovada em 26/08/2026.

- A lateral permanece azul-marinho para preservar a identidade já reconhecida no sistema.
- A logo ocupa uma faixa branca contínua em toda a largura superior da lateral.
- A faixa não usa cartão interno, sombra, contorno ou bordas arredondadas.
- Uma linha verde de 3 px separa a marca da navegação.
- A arte oficial permanece intacta: não será recortada, redesenhada, filtrada nem distorcida.
- A lateral passa de 236 px para 280 px no desktop, permitindo rótulos orientados à ação sem abreviações inadequadas.

## Sistema visual

### Cores

- Azul-marinho estrutural: `#07192B`.
- Azul institucional e estado ativo: `#173F9B`.
- Verde institucional e linha de assinatura: `#007A3D`.
- Azul-claro do indicador ativo e foco: `#5F8FE6`.
- Branco da marca e superfícies: `#FFFFFF`.
- Texto secundário na lateral: `#AAB7C8`.
- Fundo geral do produto: `#F3F6FA`.

### Tipografia

- A navegação mantém a família sem serifa do sistema, em tamanho de 13 a 13,5 px e peso 500.
- O item ativo usa peso 700.
- Os títulos de grupo usam 10 px, caixa alta e espaçamento entre letras moderado.
- A identidade tipográfica existente nas páginas e documentos não será alterada.

### Assinatura visual

A linha verde abaixo da faixa da logo funciona como “lombada institucional”: ela conecta a marca à coluna de navegação e substitui o cartão branco isolado por uma estrutura intencional.

## Estrutura da lateral

### Marca

- Faixa superior branca com aproximadamente 108 px de altura.
- Logo centralizada com largura visual aproximada de 238 px e proporção original preservada.
- No modo móvel, o botão de fechar fica posicionado no canto superior direito da faixa, em azul-marinho sobre branco, sem sobrepor a área útil da arte.

### Menu

O menu será organizado em três grupos.

#### Principal

1. Início.
2. Cadastrar Empresa.

#### Documentos técnicos

1. Gerar Parecer Técnico Pericial.
2. Gerar Laudo Técnico Pericial.
3. Elaborar Quesitos Técnicos.
4. Elaborar Manifestação sobre o Laudo.
5. Elaborar Impugnação ao Laudo.
6. Elaborar Esclarecimentos Técnicos.

#### Apoio

1. Biblioteca.
2. Configurações.
3. Ajuda.

Os ícones serão da biblioteca Lucide já usada no projeto. Emojis não serão incorporados à interface final.

## Rotas e comportamento

| Item | Destino |
| --- | --- |
| Início | `/` |
| Cadastrar Empresa | `/clientes` |
| Gerar Parecer Técnico Pericial | `/pericias/nova?tipo=parecer` |
| Gerar Laudo Técnico Pericial | `/pericias/nova?tipo=laudo` |
| Elaborar Quesitos Técnicos | `/quesitos` |
| Elaborar Manifestação sobre o Laudo | `/manifestacao/concordancia` |
| Elaborar Impugnação ao Laudo | `/manifestacao/impugnacao_laudo` |
| Elaborar Esclarecimentos Técnicos | `/esclarecimentos` |
| Biblioteca | `/biblioteca` |
| Configurações | `/configuracoes` |
| Ajuda | `/ajuda` |

- O item ativo combina caminho e parâmetro de consulta. Parecer e Laudo não podem aparecer ativos simultaneamente.
- Ao editar uma perícia sem parâmetro `tipo`, o sistema mantém o comportamento atual e considera Parecer como padrão.
- As páginas de histórico de Perícias e Documentos continuam existentes e acessíveis pelos cartões, links “Ver todas” e busca da tela inicial.
- Nenhuma rota atual será removida.

## Estados de interação

- Estado normal: texto em azul-acinzentado claro e ícone com o mesmo contraste.
- Hover: fundo branco com baixa opacidade e texto branco.
- Ativo: fundo azul institucional, texto branco e linha lateral `#5F8FE6` para reforçar localização.
- Foco por teclado: contorno visível, com contraste mínimo compatível com WCAG 2.1 AA.
- Os títulos dos grupos não recebem interação.

## Responsividade

- No desktop, a lateral mede 280 px e o recuo do conteúdo acompanha exatamente essa largura.
- Em telas menores, a lateral funciona como gaveta com largura de `min(280px, 88vw)`.
- A navegação possui rolagem própria para comportar todos os itens em telas de pouca altura.
- O fundo da página recebe sobreposição ao abrir a gaveta e fecha o menu ao clicar fora, escolher uma ação ou acionar o botão de fechar.
- A faixa da marca e o rodapé da lateral não encolhem durante a rolagem.

## Componentes

- O componente `Logo` receberá uma variante integrada, sem fundo, preenchimento ou arredondamento próprios. As aplicações existentes no login, prévia e documentos mantêm o tratamento atual.
- A configuração do menu será dividida por grupos e manterá rótulo, ícone, rota e regra de estado ativo em uma única fonte.
- A barra lateral continuará dentro de `AppLayout`; não haverá alteração na API, no banco de dados ou nos documentos gerados.

## Tratamento de erros e compatibilidade

- Se uma rota especializada não carregar, o comportamento de erro atual do aplicativo permanece responsável pela recuperação.
- A ausência de JavaScript não é um cenário suportado pelo produto; nenhuma navegação alternativa será criada.
- A mudança não altera permissões, sessão, salvamento de perícias, geração de documentos nem histórico.
- A logo integrada usa o mesmo arquivo oficial já publicado, evitando divergência entre interface, PDF e Word.

## Testes e validação

- Testar a presença, a ordem e os destinos dos onze itens do menu.
- Testar que Parecer e Laudo resolvem corretamente o estado ativo pelo parâmetro `tipo`.
- Testar que as rotas de histórico continuam acessíveis pela tela inicial.
- Testar a variante integrada da logo sem reconstrução textual da marca.
- Testar abertura, fechamento e navegação da gaveta móvel.
- Executar a suíte completa e o build de produção.
- Validar visualmente em larguras de 1440 px, 1024 px, 768 px e 390 px.
- Conferir contraste, foco por teclado, ausência de corte nos rótulos e rolagem em altura de 650 px.

## Critérios de aceite

- A logo parece parte da estrutura do produto, sem cartão branco flutuante.
- Todos os rótulos solicitados pelo cliente aparecem completos e legíveis.
- O menu comunica ações reais, em vez de nomes genéricos de módulos.
- A página ativa é identificada sem ambiguidade.
- A lateral não cobre nem desloca incorretamente o conteúdo em nenhuma largura validada.
- A interface mantém acesso aos históricos e não causa regressão nos fluxos existentes.
