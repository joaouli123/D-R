# Parecer enxuto conforme estrutura do cliente

## Objetivo

Reorganizar o Parecer e o Laudo gerados pelo sistema conforme o arquivo de referência de 21/08/2026, preservando a identidade visual aprovada e corrigindo os defeitos do Word legado: imagens flutuantes, texto sob imagens, grandes vazios e quebras frágeis.

## Escopo

- Aplicar a nova estrutura ao preview, PDF e DOCX de Parecer e Laudo.
- Manter os demais documentos sem mudança estrutural.
- Preservar compatibilidade com perícias existentes salvas no campo JSON `tecnico`.
- Não importar dados, conclusões ou instruções específicas do processo usado como exemplo.

## Estrutura do documento

1. Objeto da Perícia e Dados Contratuais.
2. Da Diligência Técnica Pericial.
3. Descrição das Instalações da Reclamada.
4. Critérios Técnicos para Avaliação Pericial.
5. Metodologia de Avaliação.
6. Descrição do Posto de Trabalho, Máquinas, Ferramentas e Produtos.
7. Histórico Laboral, Períodos e Atividades Habituais Exercidas.
8. Dos Equipamentos de Proteção Individual (NR-06).
9. Das Proteções Coletivas.
10. Análise Técnica dos Agentes Identificados.
11. Conclusão de NR-15, quando houver insalubridade.
12. Conclusão de NR-16, quando houver periculosidade.
13. Respostas aos Quesitos Técnicos, quando preenchidas.
14. Encerramento.

## Mapeamento de dados

- Campos atuais continuam sendo usados para apresentação, objeto, instalações, critérios, metodologia, períodos, agentes, análise e conclusão.
- Novos campos opcionais: descrição do posto, máquinas e ferramentas, produtos utilizados, divergências fáticas, proteções coletivas, conclusões separadas de NR-15/NR-16, respostas aos quesitos e encerramento.
- Dados antigos usam fallback para `atividadesFuncoes`, `conclusao` e `observacoesAdicionais`; nenhuma migração de banco é necessária.
- EPIs são derivados dos equipamentos associados aos agentes e apresentados em seção própria, sem duplicação integral na seção de agentes.

## Fotografias

- Fotografias de ambiente ficam após as instalações.
- Fotografias de atividades, equipamentos e produtos ficam dentro da seção 6.
- Fotografias de EPI ficam na seção 8.
- Fotografias documentais ficam na seção 7.
- Cada figura é inserida em linha, com proporção preservada, largura máxima fixa, legenda imediatamente abaixo e bloco indivisível sempre que couber na página.
- O gerador nunca usa âncoras flutuantes ou texto contornando imagens.

## Compatibilidade e testes

- Preview, HTML/PDF e DOCX devem manter a mesma ordem e a mesma numeração.
- Seções condicionais seguem a modalidade e os dados preenchidos sem quebrar a sequência.
- Tabelas repetem cabeçalho quando atravessam páginas.
- Testes cobrem a ordem dos 14 blocos, ausência de duplicação de EPI, fallback legado e posicionamento das figuras.
- A validação final exige build, testes e renderização visual completa de PDF e DOCX.
