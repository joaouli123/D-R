export const anexosNr15DeRegressao = [
  'Anexo 1',
  'Anexo 2',
  'Anexo 3',
  'Anexo 4',
  'Anexo 5',
  'Anexo 6',
  'Anexo 7',
  'Anexo 8',
  'Anexo 9',
  'Anexo 10',
  'Anexo 11',
  'Anexo 12',
  'Anexo 13',
  'Anexo 13-A',
  'Anexo 14',
] as const

export function agentesNr15DeRegressao() {
  return anexosNr15DeRegressao.map((anexo, indice) => ({
    id: `agente-regressao-${indice + 1}`,
    nome: `Agente de regressão ${anexo}`,
    tipo: (['fisico', 'quimico', 'biologico'] as const)[indice % 3],
    anexoNr15: anexo,
    criterio: 'qualitativo' as const,
    identificadoNaAtividade: indice % 2 === 0,
    observacao: `Conclusão exclusiva ${anexo}.`,
  }))
}
