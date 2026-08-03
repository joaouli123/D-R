import type { AgenteQuimicoCAS } from '@/types'

// ============================================================
// Biblioteca técnica — Agentes químicos por número CAS
// Base: relatório "FDS / Relatório IA" e quadro comparativo NR-15
// (Portaria MTb nº 3.214/78) + cruzamento com a LINACH.
// ============================================================

export const AGENTES_QUIMICOS: AgenteQuimicoCAS[] = [
  {
    cas: '64475-85-0',
    nome: 'White Spirit (Aguarrás Mineral / Solvente Mineral)',
    nomeIngles: 'White Spirit',
    ltPpm: '—',
    ltMgM3: '—',
    valorTeto: false,
    pele: false,
    anexo11: false,
    anexo13: true,
    anexo13A: 'Não',
    linach: '—',
    grauPrevisto: 'Médio (20%)',
    resumo:
      'Mistura de hidrocarbonetos derivados do petróleo, sem Limite de Tolerância específico no Anexo 11 da NR-15. Não há valores em ppm ou mg/m³, nem indicação de Valor Teto ou notação "Pele". Sob o aspecto qualitativo, sua utilização poderá caracterizar insalubridade quando as atividades se enquadrarem nas hipóteses do Anexo 13 da NR-15, especialmente em operações envolvendo hidrocarbonetos e solventes orgânicos, devendo ser analisadas a natureza da atividade, a forma de utilização, a frequência de exposição, a possibilidade de contato cutâneo, a volatilidade do produto e as medidas de proteção adotadas.',
  },
  {
    cas: '64742-95-6',
    nome: 'Nafta Solvente Aromática Leve',
    nomeIngles: 'Light Aromatic Solvent Naphtha',
    ltPpm: '—',
    ltMgM3: '—',
    valorTeto: false,
    pele: false,
    anexo11: false,
    anexo13: true,
    anexo13A: 'Somente se houver benzeno na composição',
    linach: '—',
    grauPrevisto: 'Médio (20%)',
    resumo:
      'Não possui Limite de Tolerância específico no Anexo 11 da NR-15. Trata-se de mistura composta predominantemente por hidrocarbonetos aromáticos, podendo haver enquadramento qualitativo no Anexo 13 da NR-15 conforme a atividade efetivamente desempenhada. O enquadramento pelo Anexo 13-A não decorre do número CAS da substância, sendo aplicável apenas quando houver presença de benzeno na composição do produto, condição que deverá ser confirmada mediante consulta à respectiva FDS/FISPQ.',
  },
  {
    cas: '111-76-2',
    nome: '2-Butoxietanol (Éter Monobutílico do Etilenoglicol)',
    nomeIngles: '2-Butoxyethanol',
    ltPpm: '39 ppm',
    ltMgM3: '190 mg/m³',
    valorTeto: false,
    pele: true,
    anexo11: true,
    anexo13: false,
    anexo13A: 'Não',
    linach: '—',
    grauPrevisto: 'Médio (20%), se excedido o LT',
    resumo:
      'Possui Limite de Tolerância estabelecido no Anexo 11 da NR-15, correspondente a 39 ppm (190 mg/m³), com indicação de absorção cutânea ("Pele"). Sua caracterização ocorre mediante avaliação quantitativa da concentração ambiental, não sendo prevista caracterização exclusivamente qualitativa pelo Anexo 13. Quando constatada exposição acima do Limite de Tolerância, caracteriza-se insalubridade em grau médio (20%).',
  },
  {
    cas: '1330-20-7',
    nome: 'Xileno',
    nomeIngles: 'Xylene',
    ltPpm: '78 ppm',
    ltMgM3: '340 mg/m³',
    valorTeto: false,
    pele: true,
    anexo11: true,
    anexo13: true,
    anexo13A: 'Não',
    linach: '—',
    grauPrevisto: 'Médio (20%), se excedido o LT',
    resumo:
      'Possui Limite de Tolerância estabelecido no Anexo 11 da NR-15, correspondente a 78 ppm (340 mg/m³), com indicação de absorção por via cutânea ("Pele"). Embora determinadas operações envolvendo hidrocarbonetos aromáticos possam ser analisadas sob a ótica do Anexo 13 da NR-15, a avaliação da exposição ao xileno deve ocorrer prioritariamente mediante quantificação da concentração ambiental e comparação com o respectivo Limite de Tolerância.',
  },
]

// Texto técnico reaproveitável — Considerações sobre avaliação
// qualitativa quando não houve quantificação ambiental.
export const CONSIDERACOES_QUALITATIVAS = `No presente caso, a conclusão pericial fundamenta-se na avaliação qualitativa, nos termos do Anexo 13 da NR-15, considerando a natureza das atividades desenvolvidas e a utilização de produtos contendo hidrocarbonetos e solventes orgânicos passíveis de enquadramento qualitativo.

Em relação aos agentes cuja caracterização pelo Anexo 11 depende de avaliação quantitativa, verifica-se que não foram realizadas medições das concentrações ambientais, inexistindo elementos técnicos que permitam comparar a exposição ocupacional aos respectivos Limites de Tolerância estabelecidos na NR-15.

Assim, resta prejudicada qualquer conclusão baseada em critério quantitativo, uma vez que a caracterização da insalubridade por esse método exige, obrigatoriamente, a quantificação da concentração ambiental do agente químico mediante metodologia reconhecida e sua comparação com os Limites de Tolerância previstos na legislação.

Dessa forma, eventual enquadramento por avaliação quantitativa não pode ser tecnicamente afirmado nem afastado, em razão da inexistência de monitoramento ambiental dos agentes químicos. Consequentemente, a conclusão pericial permanece fundamentada exclusivamente no critério qualitativo previsto no Anexo 13 da NR-15, quando presentes os requisitos técnicos e legais para sua caracterização.

Observação técnica: a manutenção dos nomes em inglês e em português, acompanhados do respectivo número CAS, está em conformidade com as FDS/FISPQ dos fabricantes e facilita a rastreabilidade e identificação inequívoca das substâncias durante a instrução processual.`

// Anexos da NR-15 (referência rápida na Biblioteca)
export const ANEXOS_NR15 = [
  { anexo: 'Anexo 1', titulo: 'Ruído contínuo ou intermitente', criterio: 'Quantitativo', grau: 'Médio (20%)' },
  { anexo: 'Anexo 2', titulo: 'Ruído de impacto', criterio: 'Quantitativo', grau: 'Médio (20%)' },
  { anexo: 'Anexo 3', titulo: 'Exposição ao calor (IBUTG)', criterio: 'Quantitativo', grau: 'Médio (20%)' },
  { anexo: 'Anexo 5', titulo: 'Radiações ionizantes', criterio: 'Quantitativo', grau: 'Máximo (40%)' },
  { anexo: 'Anexo 6', titulo: 'Trabalho sob condições hiperbáricas', criterio: 'Quantitativo', grau: 'Máximo (40%)' },
  { anexo: 'Anexo 7', titulo: 'Radiações não ionizantes', criterio: 'Qualitativo', grau: 'Médio (20%)' },
  { anexo: 'Anexo 8', titulo: 'Vibrações', criterio: 'Quantitativo', grau: 'Médio (20%)' },
  { anexo: 'Anexo 9', titulo: 'Frio', criterio: 'Qualitativo', grau: 'Médio (20%)' },
  { anexo: 'Anexo 10', titulo: 'Umidade', criterio: 'Qualitativo', grau: 'Médio (20%)' },
  { anexo: 'Anexo 11', titulo: 'Agentes químicos com limite de tolerância', criterio: 'Quantitativo', grau: 'Mín./Méd./Máx.' },
  { anexo: 'Anexo 12', titulo: 'Poeiras minerais (asbesto, sílica)', criterio: 'Quantitativo', grau: 'Máximo (40%)' },
  { anexo: 'Anexo 13', titulo: 'Agentes químicos — avaliação qualitativa', criterio: 'Qualitativo', grau: 'Mín./Méd./Máx.' },
  { anexo: 'Anexo 13-A', titulo: 'Benzeno', criterio: 'Qualitativo', grau: 'Máximo (40%)' },
  { anexo: 'Anexo 14', titulo: 'Agentes biológicos', criterio: 'Qualitativo', grau: 'Médio/Máximo' },
]

export const ANEXOS_NR16 = [
  { anexo: 'Anexo 1', titulo: 'Explosivos', adicional: '30%' },
  { anexo: 'Anexo 2', titulo: 'Inflamáveis líquidos e gasosos liquefeitos', adicional: '30%' },
  { anexo: 'Anexo 3', titulo: 'Segurança pessoal ou patrimonial', adicional: '30%' },
  { anexo: 'Anexo 4', titulo: 'Energia elétrica (Sistema Elétrico de Potência)', adicional: '30%' },
  { anexo: 'Anexo 5', titulo: 'Atividades com motocicleta', adicional: '30%' },
]
