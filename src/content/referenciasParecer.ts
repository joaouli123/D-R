import { ANEXOS_NR16, itemListaAnexoNr16 } from './anexosNr16'
import type { Pericia, SecaoTexto } from '@/types'

export interface ReferenciaParecer {
  numero: string
  titulo: string
  secao: SecaoTexto
}

/**
 * Índice editorial do Parecer Técnico aprovado pelo cliente.
 *
 * A referência fica separada do texto para que a Biblioteca, o formulário
 * e o documento falem o mesmo idioma mesmo quando o conteúdo é reescrito.
 */
export const REFERENCIAS_PARECER: readonly ReferenciaParecer[] = [
  { numero: '1', titulo: 'Objeto da Perícia e Dados Contratuais', secao: 'objetivo' },
  { numero: '2', titulo: 'Da Diligência Técnica Pericial', secao: 'objetivo' },
  { numero: '3', titulo: 'Descrição das Instalações da Reclamada', secao: 'empresa' },
  { numero: '3.1', titulo: 'Instalações Físicas', secao: 'ambiente' },
  { numero: '4', titulo: 'Critérios Técnicos para Avaliação Pericial', secao: 'analise' },
  { numero: '4.1', titulo: 'Insalubridade — NR-15', secao: 'analise' },
  { numero: '4.1.1', titulo: 'Critérios Quantitativos', secao: 'analise' },
  { numero: '4.1.2', titulo: 'Critérios Qualitativos', secao: 'analise' },
  { numero: '4.1.3', titulo: 'Frequência, Duração e Habitualidade', secao: 'analise' },
  { numero: '4.2', titulo: 'Periculosidade — NR-16', secao: 'analise' },
  { numero: '4.2.1', titulo: 'Anexos da NR-16', secao: 'analise' },
  { numero: '5', titulo: 'Metodologia de Avaliação', secao: 'analise' },
  { numero: '5.1', titulo: 'Metodologia — NR-15', secao: 'analise' },
  { numero: '5.1.1', titulo: 'Avaliações Quantitativas', secao: 'analise' },
  { numero: '5.1.2', titulo: 'Avaliações Qualitativas', secao: 'analise' },
  { numero: '5.1.3', titulo: 'Registro Fotográfico e Evidências', secao: 'analise' },
  { numero: '5.2', titulo: 'Análise Documental e PPP', secao: 'analise' },
  { numero: '5.2.1', titulo: 'PPP — Perfil Profissiográfico Previdenciário', secao: 'analise' },
  { numero: '5.2.2', titulo: 'Critérios de Avaliação de Ruído — NHO-01 e NR-15', secao: 'analise' },
  { numero: '5.2.3', titulo: 'Equipamentos de Proteção Individual — EPI', secao: 'analise' },
  { numero: '5.3', titulo: 'Metodologia — NR-16', secao: 'analise' },
  { numero: '5.3.1', titulo: 'Áreas de Risco', secao: 'analise' },
  { numero: '5.3.2', titulo: 'Inspeção e Constatação Técnica', secao: 'analise' },
  { numero: '5.4', titulo: 'Critério Conclusivo', secao: 'analise' },
  { numero: '6', titulo: 'Descrição do Posto de Trabalho, Máquinas, Ferramentas e Produtos', secao: 'ambiente' },
  { numero: '6.1', titulo: 'Características do Posto de Trabalho', secao: 'ambiente' },
  { numero: '6.2', titulo: 'Máquinas, Ferramentas e Equipamentos Utilizados', secao: 'atividades' },
  { numero: '6.3', titulo: 'Constatações da Vistoria Pericial', secao: 'ambiente' },
  { numero: '6.4', titulo: 'Produtos Utilizados Habitualmente nas Atividades', secao: 'atividades' },
  { numero: '7', titulo: 'Histórico Laboral, Períodos e Atividades Habituais Exercidas', secao: 'atividades' },
  { numero: '7.1', titulo: 'Atividades Efetivamente Exercidas', secao: 'atividades' },
  { numero: '7.2', titulo: 'NR-15 — Avaliação da Exposição Ocupacional', secao: 'analise' },
  { numero: '7.2.1', titulo: 'Agente Físico — Ruído Contínuo ou Intermitente', secao: 'analise' },
  { numero: '7.2.2', titulo: 'Agentes Químicos — Anexos 11, 12 e 13', secao: 'analise' },
  { numero: '7.2.3', titulo: 'Agentes Biológicos — Anexo 14', secao: 'analise' },
  { numero: '7.3', titulo: 'NR-16 — Avaliação das Atividades e Operações Perigosas', secao: 'analise' },
  { numero: '7.3.1', titulo: 'Critério de Avaliação', secao: 'analise' },
  { numero: '7.3.2', titulo: 'Risco de Periculosidade Alegado pela Parte Reclamante', secao: 'analise' },
  { numero: '7.4', titulo: 'Divergências Fáticas', secao: 'analise' },
  { numero: '7.4.1', titulo: 'Alegações do Reclamante', secao: 'analise' },
  { numero: '7.4.2', titulo: 'Informações Prestadas pela Reclamada', secao: 'analise' },
  { numero: '7.5', titulo: 'Considerações sobre as Divergências Fáticas', secao: 'analise' },
  { numero: '8', titulo: 'Dos Equipamentos de Proteção Individual — NR-06', secao: 'analise' },
  { numero: '8.1', titulo: 'Ruído Contínuo ou Intermitente', secao: 'analise' },
  { numero: '8.1.2', titulo: 'Agentes Químicos', secao: 'analise' },
  { numero: '9', titulo: 'Das Proteções Coletivas', secao: 'analise' },
  { numero: '10', titulo: 'Análise Técnica dos Agentes, Atividades e Riscos Identificados', secao: 'analise' },
  { numero: '10.1', titulo: 'NR-15 — Avaliação da Exposição Ocupacional', secao: 'analise' },
  { numero: '10.1.1', titulo: 'Agentes Físicos', secao: 'analise' },
  { numero: '10.1.2', titulo: 'Agentes Químicos', secao: 'analise' },
  { numero: '10.1.3', titulo: 'Agentes Biológicos', secao: 'analise' },
  { numero: '10.2', titulo: 'NR-16 — Avaliação das Atividades e Operações Perigosas', secao: 'analise' },
  // Os subitens do 10.2 são os sete anexos da NR-16, na ordem e com o rótulo
  // que `quadrosNr16DoItem10` imprime — mais o oitavo, "Sem Risco". Escritos
  // à mão, o índice ainda oferecia "10.2.1 Critério de Avaliação" e "10.2.2
  // Agente de Risco", números que no modelo novo pertencem a Explosivos e a
  // Inflamáveis: o texto que o perito salvasse na Biblioteca ia reaparecer
  // sob o anexo errado. Derivado da lista viva, um anexo novo entra sozinho.
  ...ANEXOS_NR16.map((anexo, indice) => ({
    numero: `10.2.${indice + 1}`,
    titulo: itemListaAnexoNr16(anexo),
    secao: 'analise' as const,
  })),
  { numero: `10.2.${ANEXOS_NR16.length + 1}`, titulo: 'Sem Risco', secao: 'analise' },
  { numero: '11', titulo: 'NR-15 — Conclusão e Fundamentação', secao: 'conclusao' },
  { numero: '12', titulo: 'NR-16 — Conclusão e Fundamentação', secao: 'conclusao' },
  // O documento fecha em Respostas aos Quesitos e Encerramento; o catálogo
  // parava no 13 e chamava o 13 de “Encerramento”. O editor já pedia ‘14’
  // para o encerramento de uma perícia “ambas” — nada casava.
  { numero: '13', titulo: 'Respostas aos Quesitos Técnicos', secao: 'conclusao' },
  { numero: '14', titulo: 'Encerramento', secao: 'conclusao' },
]

/**
 * Onde cada campo do editor é catalogado na Biblioteca.
 *
 * O número IMPRESSO no documento muda com a modalidade; a chave do catálogo,
 * não. `REFERENCIAS_PARECER` está inteiro na numeração de “ambas”, e é por
 * ela que `textoDisponivelNoContexto` casa o texto salvo com o campo. Numa
 * perícia só de periculosidade o documento imprime “7.2.2” no risco alegado
 * — e 7.2.2, no catálogo, é “Agentes Químicos”: sem esta tabela, abrir a
 * Biblioteca naquele campo oferecia os textos do agente errado.
 *
 * Só entram aqui os campos cujo número impresso pode divergir do canônico.
 */
export const CHAVE_BIBLIOTECA_POR_CAMPO: Partial<Record<keyof Pericia['tecnico'], string>> = {
  divergenciasFaticas: '7.4',
  alegacoesReclamante: '7.4.1',
  informacoesReclamada: '7.4.2',
  consideracoesDivergencias: '7.5',
  criterioAvaliacaoPericulosidade: '7.3.1',
  riscoAlegadoPericulosidade: '7.3.2',
  fonteRiscoAlegado: '7.3.2',
  conclusaoPericulosidade: '12',
  respostasQuesitos: '13',
  encerramento: '14',
}
