// ============================================================
// Normalização dos dados brutos do CAEPI/MTE.
//
// A base oficial é gerada por um sistema legado e chega suja de um
// jeito bem específico. Tudo que depende desses defeitos mora aqui,
// em funções puras, para poder ser testado sem rede e sem banco:
//
//   · o CSV vem com BOM DUPLO (EF BB BF duas vezes);
//   · o NRRsf da ficha vem como texto livre — "27dB", "21 dB",
//     "17", "5,1" — nunca como número;
//   · as datas vêm "dd/mm/aaaa" no CSV e "dd/mm/aaaa 00:00:00"
//     na ficha individual.
// ============================================================

/** Situação de um CA em uma data de referência. */
export type SituacaoCa = 'VALIDO' | 'VENCIDO' | 'CANCELADO' | 'SUSPENSO' | 'DESCONHECIDA'

/**
 * Remove o BOM do início do texto. O export do CAEPI traz dois BOMs
 * seguidos; `utf-8-sig`/`stripBom` convencionais removem só o primeiro
 * e deixam um `` grudado no primeiro cabeçalho.
 */
export function removerBom(texto: string): string {
  return texto.replace(/^\uFEFF+/, '')
}

/**
 * Normaliza o número do CA para a forma canônica usada como chave:
 * só dígitos, sem zeros à esquerda. O portal aceita "01234" e "1234"
 * como o mesmo registro.
 */
export function normalizarNumeroCa(bruto: string | null | undefined): string | null {
  if (!bruto) return null
  const digitos = removerBom(String(bruto)).replace(/\D/g, '')
  if (!digitos) return null
  const semZeros = digitos.replace(/^0+/, '')
  return semZeros || null
}

/**
 * Converte o NRRsf da ficha para número.
 *
 * O campo é texto livre preenchido por gente diferente ao longo de
 * décadas. Aceita vírgula decimal e sufixo "dB" colado ou separado.
 * Devolve null quando não houver número reconhecível.
 *
 * Faixa aceita: 0 a 50 dB. Protetor auditivo real fica entre ~5 e 35;
 * acima de 50 é com certeza lixo de digitação e é melhor descartar do
 * que gravar um valor que vai subestimar a exposição num laudo.
 */
export function normalizarNrrsf(bruto: string | null | undefined): number | null {
  if (bruto == null) return null
  const texto = String(bruto).trim()
  if (!texto) return null

  const casado = /(-?\d+(?:[.,]\d+)?)/.exec(texto)
  if (!casado?.[1]) return null

  const valor = Number(casado[1].replace(',', '.'))
  if (!Number.isFinite(valor)) return null
  if (valor < 0 || valor > 50) return null

  return Number(valor.toFixed(1))
}

/**
 * "23/03/2028" ou "23/03/2028 00:00:00" → "2028-03-23".
 *
 * Devolve null para data ausente ou impossível. Valida o dia de fato
 * (31/02 não passa) porque a base tem registros antigos com data ruim.
 */
export function normalizarData(bruto: string | null | undefined): string | null {
  if (!bruto) return null
  const casado = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(bruto).trim())
  if (!casado) return null

  const [, dia, mes, ano] = casado
  const d = Number(dia)
  const m = Number(mes)
  const a = Number(ano)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null

  const data = new Date(Date.UTC(a, m - 1, d))
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) {
    return null
  }
  return `${ano}-${mes}-${dia}`
}

/** Texto do CSV → enum. Tolera acento ausente e caixa trocada. */
export function normalizarSituacao(bruto: string | null | undefined): SituacaoCa {
  const texto = removerBom(String(bruto ?? ''))
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')

  if (texto === 'VALIDO') return 'VALIDO'
  if (texto === 'VENCIDO') return 'VENCIDO'
  if (texto === 'CANCELADO') return 'CANCELADO'
  if (texto === 'SUSPENSO') return 'SUSPENSO'
  return 'DESCONHECIDA'
}

export interface ValidadeNaData {
  situacao: SituacaoCa
  /** true apenas quando dá para afirmar que o CA valia na data. */
  valido: boolean
  /** Frase pronta para o laudo, sempre explicitando a data avaliada. */
  motivo: string
  /** true quando falta informação para afirmar com segurança. */
  incerto: boolean
}

/**
 * Responde "este CA valia em tal data?" — que é a pergunta da perícia,
 * não "está válido hoje".
 *
 * É por isso que o espelho guarda a DATA DE VALIDADE em vez de um
 * carimbo de situação: o processo trabalhista costuma olhar os últimos
 * 5 anos, e um CA vencido em 2024 valia normalmente em 2022.
 *
 * Limite conhecido: a base não publica a data da decisão de
 * cancelamento/suspensão nem a data de expedição. Nesses casos a
 * função marca `incerto` em vez de fingir certeza.
 */
export function validadeNaData(
  ca: { dataValidade?: string | null; situacao?: SituacaoCa | string | null },
  dataReferencia: string,
): ValidadeNaData {
  const situacao = typeof ca.situacao === 'string' ? normalizarSituacao(ca.situacao) : (ca.situacao ?? 'DESCONHECIDA')
  const referencia = /^\d{4}-\d{2}-\d{2}$/.test(dataReferencia) ? dataReferencia : null
  const validade = ca.dataValidade && /^\d{4}-\d{2}-\d{2}$/.test(ca.dataValidade) ? ca.dataValidade : null

  if (!referencia) {
    return { situacao, valido: false, incerto: true, motivo: 'Data de referência inválida.' }
  }

  // Cancelamento e suspensão são decisões administrativas e a base não
  // publica a data em que passaram a valer. Não dá para projetar para trás.
  if (situacao === 'CANCELADO' || situacao === 'SUSPENSO') {
    const rotulo = situacao === 'CANCELADO' ? 'cancelado' : 'suspenso'
    return {
      situacao,
      valido: false,
      incerto: true,
      motivo: `CA ${rotulo} pelo MTE. A base não informa a data da decisão, então não é possível afirmar a situação em ${formatarBr(referencia)}.`,
    }
  }

  if (!validade) {
    return { situacao, valido: false, incerto: true, motivo: 'CA sem data de validade na base oficial.' }
  }

  if (referencia <= validade) {
    return {
      situacao: 'VALIDO',
      valido: true,
      incerto: false,
      motivo: `CA válido em ${formatarBr(referencia)} (validade até ${formatarBr(validade)}).`,
    }
  }

  return {
    situacao: 'VENCIDO',
    valido: false,
    incerto: false,
    motivo: `CA vencido em ${formatarBr(referencia)} — a validade terminou em ${formatarBr(validade)}.`,
  }
}

/** "2028-03-23" → "23/03/2028". Devolve a entrada se não casar. */
export function formatarBr(iso: string | null | undefined): string {
  if (!iso) return ''
  const casado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return casado ? `${casado[3]}/${casado[2]}/${casado[1]}` : iso
}

/** Colapsa espaços e tira sujeira de digitação das descrições. */
export function limparTexto(bruto: string | null | undefined): string | null {
  if (bruto == null) return null
  const texto = removerBom(String(bruto)).replace(/\s+/g, ' ').trim()
  return texto || null
}
