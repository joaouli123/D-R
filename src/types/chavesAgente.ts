import type { AgenteAvaliado } from './index'

/**
 * As chaves de `AgenteAvaliado`, escritas à mão.
 *
 * `AgenteAvaliado` tem um gêmeo que nenhum compilador enxerga: o
 * `agenteSchema` de server/src/routes/esquemas-pericia.ts. Ele é um
 * `z.object` sem `.strict()`, e o Zod 3 REMOVE em silêncio a chave que não
 * declarou — o objeto podado é o que o Prisma grava. Um campo novo posto só
 * aqui some no primeiro "Salvar rascunho", com HTTP 200 e sem erro nenhum,
 * porque o editor troca o estado local pela resposta do servidor.
 *
 * Esta lista é o par de olhos que faltava. O `satisfies` recusa uma chave
 * que não exista no tipo; `ChaveDeAgenteForaDaLista` recusa uma chave do
 * tipo que não esteja na lista, e a mensagem do TypeScript nomeia qual é. O
 * teste server/src/routes/esquemas-pericia.test.ts fecha o círculo,
 * comparando a lista com as chaves reais do schema.
 *
 * Mora sob src/ porque só o tsconfig da raiz typecheca arquivo de teste; o
 * do servidor os exclui, e ainda prende `rootDir` em `src`.
 */
export const CHAVES_AGENTE_AVALIADO = [
  'id',
  'nome',
  'tipo',
  'periodoId',
  'identificadoNaAtividade',
  'cas',
  'anexoNr15',
  'anexoNr16',
  'referenciaNormativaId',
  'atividadeEnquadrada',
  'unidadeLimite',
  'limiteTolerancia',
  'medido',
  'valorMedido',
  'medicaoEmpresa',
  'medicaoEmpresaAte',
  'tipoMedicaoEmpresa',
  'fonteMedicaoEmpresa',
  'fonteRuido',
  'areaRisco',
  'analiseAnexos',
  'exposicaoPericulosidade',
  'resultadoPericulosidade',
  'exposicaoPericulosidadeTexto',
  'resultadoPericulosidadeTexto',
  'detalhesNr16',
  'enquadramentoNr16',
  'situacaoAreaRisco',
  'presencaAreaRisco',
  'delimitacaoAreaRisco',
  'distanciaAreaRisco',
  'tempoExposicaoNr16',
  'unidadeTempoExposicaoNr16',
  'frequenciaOperacionalNr16',
  'periodicidadeOperacionalNr16',
  'relacaoAtividadeNr16',
  'periodoCaracterizacaoNr16',
  'origemMedicao',
  'unidadeMedicao',
  'epis',
  'criterio',
  'grau',
  'epiEficaz',
  'observacao',
] as const satisfies readonly (keyof AgenteAvaliado)[]

/** Vazio quando a lista está completa. */
export type ChaveDeAgenteForaDaLista = Exclude<
  keyof AgenteAvaliado,
  (typeof CHAVES_AGENTE_AVALIADO)[number]
>

/**
 * Se isto parar de compilar, o erro do TypeScript diz o nome da chave que
 * ficou de fora. Acrescente-a aqui E em `agenteSchema`, nunca só num lado.
 */
export const TODAS_AS_CHAVES_LISTADAS: ChaveDeAgenteForaDaLista extends never
  ? true
  : ChaveDeAgenteForaDaLista = true
