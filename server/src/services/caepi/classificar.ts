// ============================================================
// De-para entre o tipo de equipamento do CAEPI e os anexos da NR-15.
//
// A base oficial tem 148 descrições de equipamento e nenhuma relação
// com a NR-15 — essa ponte é nossa. As regras abaixo são o ponto de
// partida técnico; o perito pode ajustar a aplicação de qualquer EPI
// pelo catálogo, e o ajuste dele nunca é sobrescrito pela sincronização.
//
// Ordem importa: vale a primeira regra que casar, da mais específica
// para a mais genérica.
// ============================================================

export interface ClassificacaoEpi {
  /** Categoria de proteção usada no catálogo e no seletor de EPI. */
  categoria: string
  /** Anexos da NR-15 em que esse equipamento é pertinente. */
  anexos: string[]
  /** true quando o NRRsf é exigido para o cálculo (protetor auditivo). */
  exigeNrrsf: boolean
  /** Tipos marcados com "x - " no CAEPI são layouts descontinuados. */
  descontinuado: boolean
}

interface Regra {
  padrao: RegExp
  categoria: string
  anexos: string[]
  exigeNrrsf?: boolean
}

/**
 * Anexos da NR-15 citados aqui:
 *   1  ruído contínuo ou intermitente      2  ruído de impacto
 *   3  calor                               7  radiações não-ionizantes
 *   8  vibrações                           9  frio
 *   10 umidade                             11 agentes químicos (quantitativo)
 *   12 poeiras minerais                    13 agentes químicos (qualitativo)
 *   14 agentes biológicos
 */
const REGRAS: Regra[] = [
  // --- Auditiva: a única que alimenta o cálculo de atenuação ---
  {
    padrao: /PROTETOR\s+AUDITIVO/,
    categoria: 'Proteção auditiva',
    anexos: ['Anexo 1', 'Anexo 2'],
    exigeNrrsf: true,
  },

  // --- Respiratória ---
  {
    padrao: /SEMIFACIAL\s+FILTRANTE|PFF\d?/,
    categoria: 'Proteção respiratória — partículas (PFF)',
    anexos: ['Anexo 11', 'Anexo 12', 'Anexo 13'],
  },
  {
    padrao: /RESPIRADOR\s+DE\s+ADU[ÇC][ÃA]O/,
    categoria: 'Proteção respiratória — adução de ar',
    anexos: ['Anexo 11', 'Anexo 12', 'Anexo 13'],
  },
  {
    padrao: /FILTRO\s+QU[ÍI]MICO/,
    categoria: 'Proteção respiratória — filtro químico',
    anexos: ['Anexo 11', 'Anexo 13'],
  },
  {
    padrao: /RESPIRADOR/,
    categoria: 'Proteção respiratória',
    anexos: ['Anexo 11', 'Anexo 12', 'Anexo 13'],
  },

  // --- Mãos: a ordem separa os agentes combinados ---
  {
    padrao: /LUVA.*VIBRA[ÇC][ÃO]/,
    categoria: 'Proteção das mãos — vibração',
    anexos: ['Anexo 8'],
  },
  {
    padrao: /LUVA\s+ISOLANTE|MANGA\s+ISOLANTE/,
    categoria: 'Proteção contra eletricidade',
    anexos: [],
  },
  {
    padrao: /LUVA.*(BIOL[ÓO]GICO|CIR[ÚU]RGIC|PROCEDIMENTO)/,
    categoria: 'Proteção das mãos — agentes biológicos',
    anexos: ['Anexo 14'],
  },
  {
    padrao: /LUVA.*UMIDADE/,
    categoria: 'Proteção das mãos — umidade',
    anexos: ['Anexo 10'],
  },
  {
    padrao: /LUVA.*QU[ÍI]MICO/,
    categoria: 'Proteção das mãos — agentes químicos',
    anexos: ['Anexo 11', 'Anexo 13'],
  },
  {
    padrao: /LUVA.*T[ÉE]RMICO/,
    categoria: 'Proteção das mãos — agentes térmicos',
    anexos: ['Anexo 3', 'Anexo 9'],
  },
  { padrao: /LUVA|DEDEIRA|MANGOTE|MANGA|BRA[ÇC]ADEIRA/, categoria: 'Proteção das mãos e braços', anexos: [] },

  // --- Corpo ---
  { padrao: /RADIOL[ÓO]GICA|RADIA[ÇC][ÕO]ES\s+IONIZANTES/, categoria: 'Proteção contra radiação ionizante', anexos: [] },
  { padrao: /VESTIMENTA\s+CONDUTIVA/, categoria: 'Proteção contra eletricidade', anexos: [] },
  { padrao: /COMBATE\s+A\s+INC[ÊE]NDIO/, categoria: 'Proteção para combate a incêndio', anexos: ['Anexo 3'] },
  { padrao: /COLETE\s+[ÀA]\s+PROVA\s+DE\s+BALAS/, categoria: 'Proteção balística', anexos: [] },
  {
    padrao: /VESTIMENTA|CAL[ÇC]A|MACAC[ÃA]O|CAMISA|JAQUETA|BLUS[ÃA]O|AVENTAL|JAPONA|CAPA|CASACO|BLUSA|JARDINEIRA|JALECO|GUARDA-P[ÓO]|PALET[ÓO]|CAPOTE|COLETE|BATA|TOUCA|BON[ÉE]|MANTA|APICULTOR/,
    categoria: 'Proteção do tronco e corpo',
    anexos: ['Anexo 9', 'Anexo 13'],
  },
  { padrao: /CREME\s+PROTETOR/, categoria: 'Proteção dérmica', anexos: ['Anexo 13'] },

  // --- Pés e pernas ---
  { padrao: /IMPERME[ÁA]VEL/, categoria: 'Proteção dos pés — umidade', anexos: ['Anexo 10'] },
  {
    padrao: /CAL[ÇC]ADO|BOTINA|BOTA|SOBRE-BOTA|PERNEIRA|MEIA|SAND[ÁA]LIA|COTURNO|T[ÊE]NIS|SAPATO/,
    categoria: 'Proteção dos pés',
    anexos: [],
  },

  // --- Cabeça, face e olhos ---
  { padrao: /M[ÁA]SCARA\s+DE\s+SOLDA/, categoria: 'Proteção facial — solda', anexos: ['Anexo 7'] },
  {
    padrao: /[ÓO]CULOS|PROTETOR\s+FACIAL|CAPUZ|BALACLAVA|M[ÁA]SCARA\s+DE\s+SEGURAN[ÇC]A/,
    categoria: 'Proteção facial e dos olhos',
    anexos: ['Anexo 7'],
  },
  { padrao: /CAPACETE/, categoria: 'Proteção da cabeça', anexos: [] },

  // --- Altura ---
  {
    padrao: /CINTUR[ÃA]O|TALABARTE|TRAVA[\s-]?QUEDA|P[ÁA]RA-QUEDISTA|CADEIRA\s+SUSPENSA/,
    categoria: 'Proteção contra quedas',
    anexos: [],
  },
]

const CLASSIFICACAO_PADRAO: Omit<ClassificacaoEpi, 'descontinuado'> = {
  categoria: 'Outros equipamentos',
  anexos: [],
  exigeNrrsf: false,
}

/** Tira acentos e uniformiza a caixa para as regras casarem sem duplicar padrão. */
function normalizarParaRegra(texto: string): string {
  return texto.trim().toUpperCase()
}

/**
 * Classifica um tipo de equipamento do CAEPI.
 *
 * Nunca lança: tipo desconhecido cai em "Outros equipamentos" sem
 * anexo, o que deixa o registro pesquisável sem afirmar enquadramento
 * que o perito não revisou.
 */
export function classificarEquipamento(equipamento: string | null | undefined): ClassificacaoEpi {
  const bruto = (equipamento ?? '').trim()
  const descontinuado = /^x\s*-\s*/i.test(bruto)
  const limpo = normalizarParaRegra(bruto.replace(/^x\s*-\s*/i, ''))

  if (!limpo) return { ...CLASSIFICACAO_PADRAO, descontinuado }

  for (const regra of REGRAS) {
    if (regra.padrao.test(limpo)) {
      return {
        categoria: regra.categoria,
        anexos: [...regra.anexos],
        exigeNrrsf: regra.exigeNrrsf ?? false,
        descontinuado,
      }
    }
  }

  return { ...CLASSIFICACAO_PADRAO, descontinuado }
}

/** Atalho usado pelo sincronizador para decidir de quem buscar o NRRsf. */
export function ehProtetorAuditivo(equipamento: string | null | undefined): boolean {
  return classificarEquipamento(equipamento).exigeNrrsf
}
