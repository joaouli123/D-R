import type { SecaoTexto } from '@/types'

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
  { numero: '7.3.2', titulo: 'Risco de Periculosidade Alegado pelo Reclamante', secao: 'analise' },
  { numero: '7.4', titulo: 'Divergências Fáticas', secao: 'analise' },
  { numero: '7.4.1', titulo: 'Alegações do Reclamante', secao: 'analise' },
  { numero: '7.4.2', titulo: 'Informações Prestadas pela Reclamada', secao: 'analise' },
  { numero: '8', titulo: 'Dos Equipamentos de Proteção Individual — NR-06', secao: 'analise' },
  { numero: '8.1', titulo: 'Ruído Contínuo ou Intermitente', secao: 'analise' },
  { numero: '8.1.2', titulo: 'Agentes Químicos', secao: 'analise' },
  { numero: '9', titulo: 'Das Proteções Coletivas', secao: 'analise' },
  { numero: '10', titulo: 'Análise Técnica dos Agentes, Atividades e Riscos Identificados', secao: 'analise' },
  { numero: '10.1', titulo: 'NR-15 — Avaliação da Exposição Ocupacional', secao: 'analise' },
  { numero: '10.1.1', titulo: 'Agente Físico — Ruído', secao: 'analise' },
  { numero: '10.1.2', titulo: 'Agentes Químicos', secao: 'analise' },
  { numero: '10.1.3', titulo: 'Agentes Biológicos', secao: 'analise' },
  { numero: '10.2', titulo: 'NR-16 — Avaliação das Atividades e Operações Perigosas', secao: 'analise' },
  { numero: '10.2.1', titulo: 'Critério de Avaliação', secao: 'analise' },
  { numero: '10.2.2', titulo: 'Agente de Risco', secao: 'analise' },
  { numero: '11', titulo: 'NR-15 — Conclusão e Fundamentação', secao: 'conclusao' },
  { numero: '12', titulo: 'NR-16 — Conclusão e Fundamentação', secao: 'conclusao' },
  { numero: '13', titulo: 'Encerramento', secao: 'conclusao' },
]

