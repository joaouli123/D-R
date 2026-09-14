# Varredura obrigatória dos anexos da NR-15 e da NR-16

## Objetivo

Garantir que a perícia registre a análise de todos os anexos aplicáveis, mesmo quando a petição inicial menciona apenas um agente. O preenchimento deve ser rápido para situações sem exposição e completo quando houver risco, seguindo o fluxo **Avaliar → Analisar → Concluir**.

Este trabalho evolui o cadastro atual de agentes sem substituir as regras específicas, as consultas de CAS/CA, os vínculos por função, os EPIs ou as conclusões já existentes.

## Escopo normativo da varredura

### NR-15

O painel apresentará os anexos numerados de 1 a 14 como uma lista obrigatória. O Anexo 4 permanecerá visível, porém fixo como **Revogado — não aplicável**, para que a sequência normativa fique completa sem exigir uma decisão tecnicamente impossível.

O Anexo 13-A será tratado como verificação complementar do Anexo 13. Ele ficará visível dentro do grupo de agentes químicos e passará a exigir avaliação própria quando houver indicação de benzeno. Não será contado artificialmente como um “15º anexo” no progresso principal de 1 a 14.

Os detalhamentos já existentes permanecem disponíveis, incluindo as subdivisões do Anexo 8 e do Anexo 12. Essas subdivisões são avaliações filhas do respectivo anexo legal e não aumentam a quantidade da varredura.

### NR-16

O painel apresentará todos os anexos vigentes já mapeados no sistema:

1. Explosivos;
2. Inflamáveis;
3. Segurança pessoal ou patrimonial;
4. Energia elétrica;
5. Motocicleta;
6. Agentes das autoridades de trânsito;
7. Radiações ionizantes ou substâncias radioativas, identificado como anexo sem número.

## Modelo de dados

O conteúdo técnico da perícia ganhará duas coleções de varredura, uma para cada norma. Cada item será identificado pela norma e pelo anexo, com um dos estados:

- `nao_avaliado`: ainda exige decisão do usuário;
- `sem_exposicao`: o anexo foi examinado e não houve exposição ou enquadramento;
- `exposicao_identificada`: exige pelo menos uma avaliação técnica detalhada vinculada ao anexo;
- `nao_aplicavel`: reservado a uma condição normativa objetiva, inicialmente o Anexo 4 revogado.

O estado não substituirá os agentes cadastrados. Uma avaliação detalhada continuará sendo um registro independente e poderá existir mais de uma vez no mesmo anexo, inclusive separada por função ou posto.

Para manter compatibilidade, perícias antigas serão interpretadas assim:

- anexo com agente já cadastrado: `exposicao_identificada`;
- Anexo 4 da NR-15: `nao_aplicavel`;
- anexo sem evidência anterior: `nao_avaliado`, exigindo apenas confirmação;
- nenhum agente, EPI, texto ou conclusão existente será removido.

## Experiência de preenchimento

Na etapa “Agentes e EPIs”, cada norma aplicável terá um painel próprio com contador de progresso, por exemplo `NR-15: 9 de 14 anexos avaliados`.

Cada linha mostrará número, tema e três situações visuais:

- pendente;
- sem exposição;
- exposição identificada.

Ao escolher **Sem exposição**, o sistema registrará imediatamente a avaliação negativa e exibirá o texto conclusivo padronizado. O usuário poderá avançar para o próximo anexo sem abrir o formulário completo.

Ao escolher **Exposição identificada**, o sistema abrirá o detalhamento daquele anexo e permitirá cadastrar uma ou várias avaliações. Cada avaliação seguirá:

1. **Avaliar:** agente, função/posto, atividade, fonte ou condição, medição quando aplicável;
2. **Analisar:** critério normativo, limite, enquadramento e EPI;
3. **Concluir:** conclusão individual e resultado técnico.

Na NR-15, um EPI associado continuará levando CA, dados técnicos e avaliação de eficácia. A ausência de EPI não será mascarada por um registro fictício: o usuário poderá concluir tecnicamente sem proteção associada. Havendo EPI, a eficácia precisará estar registrada antes da emissão.

Na NR-16, o detalhamento continuará tratando risco, condição encontrada, área ou atividade, enquadramento e conclusão. O sistema não aplicará a lógica de neutralização por EPI da NR-15 à periculosidade.

## Regras de validação

A validação respeitará a modalidade selecionada:

- insalubridade: exige a varredura da NR-15;
- periculosidade: exige a varredura da NR-16;
- ambas: exige as duas varreduras.

PDF, DOCX e envio por e-mail serão bloqueados quando:

- existir anexo obrigatório em `nao_avaliado`;
- um anexo estiver em `exposicao_identificada` sem avaliação detalhada vinculada;
- uma avaliação detalhada não tiver conclusão individual;
- houver EPI associado sem registro de eficácia aplicável.

A mensagem indicará exatamente a norma e os anexos pendentes. Salvar rascunho continuará permitido a qualquer momento.

## Apresentação nos documentos

O documento apresentará um quadro compacto de varredura, com norma, anexo, tema, status e síntese conclusiva. Assim, será possível comprovar que todos os anexos foram examinados sem gerar quatorze tabelas extensas para respostas negativas.

Somente anexos com exposição identificada gerarão os quadros técnicos detalhados já usados no parecer e no laudo. Avaliações múltiplas do mesmo anexo permanecerão separadas por agente e, quando informado, por função/posto.

As conclusões individuais continuarão logo após cada avaliação detalhada. A conclusão geral de NR-15 e/ou NR-16 continuará no encerramento normativo do documento, sem ser substituída pelo quadro de varredura.

## Componentes e responsabilidades

- catálogo normativo: fornece a lista legal única da NR-15 e da NR-16 e relaciona subdivisões ao anexo principal;
- motor de varredura: deriva o progresso, reconhece registros antigos e lista pendências;
- painel de varredura: recebe somente decisões de status e abre os detalhes sob demanda;
- editor de avaliações: mantém os formulários específicos já existentes e vincula cada avaliação ao anexo legal;
- validadores do cliente e da API: aplicam as mesmas regras antes da emissão;
- renderizadores de prévia, HTML/PDF e DOCX: geram o mesmo quadro compacto e os mesmos detalhes.

As regras puras ficarão fora dos componentes visuais para que a tela, a API e os documentos usem a mesma interpretação.

## Testes e critérios de aceite

A implementação será conduzida por testes. Os cenários mínimos são:

- modalidade insalubridade começa com os anexos 1 a 14 rastreáveis;
- Anexo 4 aparece como revogado e não bloqueia a emissão;
- NR-16 apresenta os seis anexos numerados e o anexo sem número;
- marcar “Sem exposição” registra e renderiza uma conclusão negativa compacta;
- marcar “Exposição identificada” exige ao menos uma avaliação do anexo;
- o mesmo anexo aceita vários agentes, EPIs e funções sem substituição;
- avaliação com EPI exige registro de eficácia;
- perícias antigas preservam todos os dados e reconhecem anexos já preenchidos;
- a modalidade selecionada determina quais varreduras são obrigatórias;
- prévia, PDF e DOCX exibem o mesmo conteúdo e a mesma ordem;
- salvar rascunho funciona com varredura incompleta;
- emissão e envio são recusados com uma lista objetiva de pendências;
- os testes existentes de CAS, CA, NR-15, NR-16, fotos e documentos continuam aprovados.

## Fora deste pacote

- alteração das fontes oficiais de CAS ou CA;
- criação de novos anexos normativos sem base oficial;
- conclusão automática de caracterização baseada apenas na alegação da inicial;
- aplicação da neutralização por EPI da NR-15 às avaliações da NR-16;
- mudança do modelo visual geral do parecer ou do laudo fora do novo quadro de varredura.
