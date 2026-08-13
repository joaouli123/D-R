# Participantes da pericia com atuacao automatica

## Objetivo

Adequar o cadastro e os documentos ao modelo aprovado pelo cliente: o participante informa nome e qualificacao/representacao, enquanto o sistema determina automaticamente sua atuacao no ato. O registro OAB/CREA deixa de ser solicitado e exibido para participantes.

## Interface

Cada linha do cadastro tera `Nome` e `Qualificacao / Representacao`. O campo `Registro` sera removido. A atuacao correspondente sera apresentada como informacao somente leitura para que o usuario saiba o texto que sairá no documento.

As opcoes serao:

| Qualificacao / Representacao | Atuacao no Ato |
| --- | --- |
| Reclamante | Apresentacao das suas alegacoes. |
| Eng. Seguranca do Trabalho - Assistente Tecnico | Acompanhamento Tecnico - Reclamante |
| Tec. Seguranca do Trabalho - Assistente Tecnico | Acompanhamento Tecnico - Reclamante |
| Advogado(a) | Representante Juridico - Reclamante. |
| Eng. Seguranca do Trabalho - Assistente Tecnico | Acompanhamento Tecnico - Reclamada |
| Tec. Seguranca do Trabalho - Assistente Tecnico | Acompanhamento Tecnico - Reclamada |
| Advogado(a) | Representante Juridico - Reclamada. |
| Preposto | Representacao da Reclamada, prestacao de esclarecimentos e narrativa da defesa |
| Perito Judicial do Trabalho | Conducao da diligencia pericial |
| Auxiliar do Perito | Auxilio e suporte ao Perito |
| Paradigma | Demonstracao das atividades exercidas |
| Entrevistado | Prestacao de informacoes complementares |

As opcoes visualmente iguais de assistente e advogado serao diferenciadas internamente pelo polo processual e apresentadas no seletor com o polo entre parenteses.

## Dados e compatibilidade

O enum `PapelParticipante` sera ampliado com identificadores especificos para reclamante, engenheiro/tecnico de cada polo, auxiliar, paradigma e entrevistado. Os identificadores antigos continuarao aceitos e serao mapeados para a nova apresentacao, garantindo que pericias existentes abram e gerem documentos.

O campo `registro` permanecerá no banco como opcional apenas para compatibilidade historica. A interface nao o enviara em novos participantes e os documentos nao o exibirao.

## Documentos

A previa, PDF e DOCX terao exatamente tres colunas:

1. Nome do Participante;
2. Qualificacao / Representacao;
3. Atuacao no Ato.

Os textos de qualificacao e atuacao serao centralizados em um unico mapeamento conceitual, com equivalentes no frontend e backend protegidos por testes.

## Criterios de aceite

- Nenhum cadastro novo solicita OAB/CREA de participante.
- Todas as 12 opcoes aparecem no seletor e geram a atuacao correta.
- Registros antigos continuam abrindo e salvando.
- Previa, PDF e DOCX exibem as tres colunas aprovadas.
- Backend valida os novos papeis e continua aceitando os legados.
- Testes, typecheck, builds e smoke documental passam.
- GitHub e os dois servicos do Coolify executam o mesmo commit publicado.

