// ============================================================
// Smoke test do módulo CAEPI.
//
// Cobre a cadeia inteira sem rede e sem banco: CSV bruto → linha
// nomeada → registro normalizado → SQL de gravação → resposta HTTP.
//
// A pergunta que este arquivo existe para responder é uma só: o que
// sai daqui pode virar frase de laudo? Por isso as asserções mais
// duras são sobre validade em data passada, sobre o NRRsf do perito
// não poder ser sobrescrito, e sobre o layout do CSV do MTE.
//
//   npm run smoke:caepi
// ============================================================

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import cookieParser from 'cookie-parser'
import express from 'express'
import jwt from 'jsonwebtoken'

process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@127.0.0.1:5432/smoke'
process.env.JWT_SECRET ??= 'smoke-test-secret-with-at-least-32-characters'

const {
  formatarBr,
  normalizarData,
  normalizarNrrsf,
  normalizarNumeroCa,
  normalizarSituacao,
  removerBom,
  validadeNaData,
} = await import('../src/services/caepi/normalizar.js')
const { COLUNAS_CAEPI, ErroLayoutCaepi, lerCaepi } = await import('../src/services/caepi/csv.js')
const { classificarEquipamento, ehProtetorAuditivo } = await import('../src/services/caepi/classificar.js')
const { chaveRegistro, mapearLinha, mesclarRegistros } = await import('../src/services/caepi/mapear.js')
const { COLUNAS_CSV, TAMANHO_LOTE, montarUpsert } = await import('../src/services/caepi/sync.js')
const { escolherHomologacao, montarTsQuery, EXPRESSAO_BUSCA } = await import('../src/services/caepi/consulta.js')
const { montarBusca } = await import('../src/services/caepi/repositorio.js')
const { ehDesafioCloudflare, ErroDesafioCloudflare, extrairFicha } = await import('../src/services/caepi/portal.js')
const { criarBuscadorNrrsf } = await import('../src/services/caepi/nrrsf.js')
const { criarCaepiRouter } = await import('../src/routes/caepi.js')
const { tratarErros } = await import('../src/erros.js')

type LinhaCaepi = import('../src/services/caepi/csv.js').LinhaCaepi
type RegistroCa = import('../src/services/caepi/mapear.js').RegistroCa
type Homologacao = import('../src/services/caepi/consulta.js').Homologacao
type RepositorioCaepi = import('../src/services/caepi/repositorio.js').RepositorioCaepi
type Atenuacao = import('../src/services/caepi/repositorio.js').Atenuacao
type Buscador = import('../src/services/caepi/nrrsf.js').Buscador
type FichaCa = import('../src/services/caepi/portal.js').FichaCa

const conferidos: string[] = []
const marcar = (texto: string) => conferidos.push(texto)

// ------------------------------------------------------------
// 1. Migração
// ------------------------------------------------------------

const migracao = (
  await readFile(new URL('../prisma/migrations/20260820_espelho_caepi/migration.sql', import.meta.url), 'utf8')
).trim()
assert.ok(migracao.startsWith('BEGIN;'))
assert.ok(migracao.endsWith('COMMIT;'))
assert.ok(migracao.includes('PRIMARY KEY ("numeroCa", "processo")'))
assert.ok(migracao.includes('CHECK ("fonte" IN (\'CAEPI\', \'PERITO\'))'))
// A semente do perito precisa entrar sem apagar valor já existente.
assert.ok(migracao.includes('ON CONFLICT ("numeroCa") DO NOTHING'))
marcar('migração é transacional, tem chave composta e protege a semente do perito')

// ------------------------------------------------------------
// 2. Normalização dos defeitos da base oficial
// ------------------------------------------------------------

assert.equal(removerBom('﻿﻿NR Registro CA'), 'NR Registro CA')
assert.equal(normalizarNumeroCa('﻿011882'), '11882')
assert.equal(normalizarNumeroCa('CA 18.189'), '18189')
assert.equal(normalizarNumeroCa('0000'), null)
assert.equal(normalizarNumeroCa(''), null)

// O NRRsf da ficha é texto livre preenchido por gente diferente.
assert.equal(normalizarNrrsf('17'), 17)
assert.equal(normalizarNrrsf('13 dB'), 13)
assert.equal(normalizarNrrsf('21dB'), 21)
assert.equal(normalizarNrrsf('5,1'), 5.1)
assert.equal(normalizarNrrsf('99'), null, 'acima de 50 dB é lixo de digitação')
assert.equal(normalizarNrrsf('-3'), null)
assert.equal(normalizarNrrsf(''), null)
assert.equal(normalizarNrrsf(null), null)

assert.equal(normalizarData('23/03/2028'), '2028-03-23')
assert.equal(normalizarData('01/04/2027 00:00:00'), '2027-04-01')
assert.equal(normalizarData('31/02/2020'), null, 'dia impossível não pode virar data')
assert.equal(normalizarData(''), null)
assert.equal(formatarBr('2028-03-23'), '23/03/2028')

assert.equal(normalizarSituacao('VÁLIDO'), 'VALIDO')
assert.equal(normalizarSituacao('valido'), 'VALIDO')
assert.equal(normalizarSituacao('VENCIDO'), 'VENCIDO')
assert.equal(normalizarSituacao('qualquer coisa'), 'DESCONHECIDA')
marcar('BOM duplo, CA com zero à esquerda, NRRsf em texto livre e data ruim tratados')

// ------------------------------------------------------------
// 3. Validade NA DATA DA PERÍCIA — o coração do módulo
// ------------------------------------------------------------

const vencidoHoje = { dataValidade: '2024-03-10', situacao: 'VENCIDO' as const }

const em2022 = validadeNaData(vencidoHoje, '2022-05-01')
assert.equal(em2022.valido, true, 'CA vencido hoje valia em 2022 — é essa a pergunta da perícia')
assert.equal(em2022.situacao, 'VALIDO')
assert.ok(em2022.motivo.includes('01/05/2022'), 'o motivo tem de citar a data avaliada')

const em2026 = validadeNaData(vencidoHoje, '2026-05-01')
assert.equal(em2026.valido, false)
assert.ok(em2026.motivo.includes('10/03/2024'))

// O último dia de validade ainda é válido.
assert.equal(validadeNaData(vencidoHoje, '2024-03-10').valido, true)
assert.equal(validadeNaData(vencidoHoje, '2024-03-11').valido, false)

// Cancelado/suspenso: a base não publica a data da decisão.
const cancelado = validadeNaData({ dataValidade: '2030-01-01', situacao: 'CANCELADO' }, '2022-05-01')
assert.equal(cancelado.valido, false)
assert.equal(cancelado.incerto, true, 'sem a data da decisão não dá para afirmar nada')

assert.equal(validadeNaData({ dataValidade: null, situacao: 'VALIDO' }, '2022-05-01').incerto, true)
assert.equal(validadeNaData(vencidoHoje, '01/05/2022').incerto, true, 'data de referência torta não passa')
marcar('validade é respondida na data da perícia, e o que é incerto vem marcado como incerto')

// ------------------------------------------------------------
// 4. Parser do CSV
// ------------------------------------------------------------

async function coletar(fonte: Iterable<string>): Promise<LinhaCaepi[]> {
  const linhas: LinhaCaepi[] = []
  for await (const linha of lerCaepi(fonte)) linhas.push(linha)
  return linhas
}

const cabecalho = COLUNAS_CAEPI.join(';')
function linhaCsv(valores: Partial<Record<(typeof COLUNAS_CAEPI)[number], string>>): string {
  return COLUNAS_CAEPI.map((coluna) => valores[coluna] ?? '').join(';')
}

const csv =
  `﻿﻿${cabecalho}\r\n` +
  linhaCsv({
    'NR Registro CA': '11882',
    'DATA DE VALIDADE': '23/03/2028',
    SITUACAO: 'VÁLIDO',
    'NR DO PROCESSO': '19980.011882/2015-11',
    EQUIPAMENTO: 'PROTETOR AUDITIVO',
    'DESCRICAO EQUIPAMENTO': '"Protetor auditivo de inserção; com cordão."',
    'MARCA CA': '3M',
    REFERENCIA: '3M Millenium',
    NORMA: 'ANSI S3.19-1974',
    'NR LAUDO': 'L-001',
  }) +
  '\r\n' +
  // Mesma homologação, outra norma: é redundância do CSV, não histórico.
  linhaCsv({
    'NR Registro CA': '011882',
    'DATA DE VALIDADE': '23/03/2028',
    SITUACAO: 'VÁLIDO',
    'NR DO PROCESSO': '19980.011882/2015-11',
    EQUIPAMENTO: 'PROTETOR AUDITIVO',
    'MARCA CA': '3M',
    NORMA: 'NBR 16076',
    'NR LAUDO': 'L-002',
  }) +
  '\r\n' +
  // Campo entre aspas com ";" e quebra de linha dentro.
  linhaCsv({
    'NR Registro CA': '31810',
    'DATA DE VALIDADE': '01/01/2020',
    SITUACAO: 'VENCIDO',
    'NR DO PROCESSO': '19980.031810/2010-00',
    EQUIPAMENTO: 'x - LUVA DE SEGURANCA',
    'DESCRICAO EQUIPAMENTO': '"Luva; tricotada\r\nem fio de algodão"',
    'MARCA CA': 'ACME',
  }) +
  '\r\n'

// Entregue em pedaços de 7 caracteres: força o parser a atravessar a
// fronteira de chunk no meio de um campo entre aspas.
const pedacos: string[] = []
for (let i = 0; i < csv.length; i += 7) pedacos.push(csv.slice(i, i + 7))

const lidas = await coletar(pedacos)
assert.equal(lidas.length, 3)
assert.equal(lidas[0]?.['MARCA CA'], '3M')
assert.ok(lidas[0]?.['DESCRICAO EQUIPAMENTO'].includes('inserção; com cordão'), 'o ";" entre aspas não separou campo')
assert.ok(lidas[2]?.['DESCRICAO EQUIPAMENTO'].includes('em fio de algodão'), 'campo com quebra de linha sobreviveu')

await assert.rejects(
  () => coletar(['NR Registro CA;OUTRA COISA\r\n1;2\r\n']),
  (erro: unknown) => erro instanceof ErroLayoutCaepi,
  'layout diferente tem de explodir, não importar torto',
)
marcar('CSV com BOM duplo, CRLF e campo entre aspas atravessando chunk é lido corretamente')

// ------------------------------------------------------------
// 5. De-para com a NR-15
// ------------------------------------------------------------

const auditivo = classificarEquipamento('PROTETOR AUDITIVO')
assert.equal(auditivo.categoria, 'Proteção auditiva')
assert.deepEqual(auditivo.anexos, ['Anexo 1', 'Anexo 2'])
assert.equal(auditivo.exigeNrrsf, true)
assert.equal(auditivo.descontinuado, false)

const descontinuado = classificarEquipamento('x - PROTETOR AUDITIVO')
assert.equal(descontinuado.descontinuado, true)
assert.equal(descontinuado.exigeNrrsf, true, 'layout descontinuado ainda é protetor auditivo')

assert.ok(classificarEquipamento('LUVA DE SEGURANCA CONTRA AGENTES QUIMICOS').anexos.includes('Anexo 13'))
assert.equal(classificarEquipamento('COISA QUE NAO EXISTE').categoria, 'Outros equipamentos')
assert.deepEqual(classificarEquipamento('COISA QUE NAO EXISTE').anexos, [], 'desconhecido não inventa enquadramento')
assert.equal(ehProtetorAuditivo('PROTETOR AUDITIVO'), true)
assert.equal(ehProtetorAuditivo('CAPACETE DE SEGURANCA'), false)
marcar('equipamento vira categoria e anexo da NR-15; desconhecido fica sem enquadramento')

// ------------------------------------------------------------
// 6. Grão (CA, processo) e agregação
// ------------------------------------------------------------

const registro1 = mapearLinha(lidas[0] as LinhaCaepi)
const registro2 = mapearLinha(lidas[1] as LinhaCaepi)
assert.ok(registro1 && registro2)
assert.equal(registro1.numeroCa, '11882')
assert.equal(registro2.numeroCa, '11882', 'zero à esquerda não pode gerar dois registros')
assert.equal(chaveRegistro(registro1), chaveRegistro(registro2))

const mesclado = mesclarRegistros(registro1, registro2)
assert.deepEqual(mesclado.normas, ['ANSI S3.19-1974', 'NBR 16076'], 'normas se acumulam e ficam ordenadas')
assert.equal(mesclado.laudos.length, 2)
assert.equal(mesclado.dataValidade, '2028-03-23')
assert.equal(mesclado.exigeNrrsf, true)

// Idempotência: mesclar a mesma linha duas vezes não duplica nada.
const remesclado = mesclarRegistros(mesclado, registro2)
assert.deepEqual(remesclado.normas, mesclado.normas)
assert.equal(remesclado.laudos.length, 2)

assert.equal(mapearLinha({ ...(lidas[0] as LinhaCaepi), 'NR Registro CA': '' }), null)
assert.equal(mapearLinha({ ...(lidas[0] as LinhaCaepi), 'NR DO PROCESSO': '' }), null)
marcar('(CA, processo) é a identidade; normas e laudos agregam sem duplicar')

// ------------------------------------------------------------
// 7. SQL da sincronização
// ------------------------------------------------------------

const upsert = montarUpsert(3)
assert.equal(COLUNAS_CSV.length, 21)
assert.equal((upsert.match(/\$\d+/g) ?? []).length, 21 * 3)
assert.ok(upsert.includes('ON CONFLICT ("numeroCa", "processo")'))
assert.ok(upsert.includes('RETURNING (xmax = 0) AS inserido'))
assert.ok(upsert.includes('::jsonb'), 'laudos precisa do cast')
assert.ok(!upsert.includes('"numeroCa" = EXCLUDED'), 'a chave não entra no SET')

// A promessa feita ao perito, virada em asserção: o caminho do CSV
// não escreve na tabela do NRRsf em hipótese alguma.
assert.ok(!upsert.includes('cas_atenuacao'), 'a sincronização do CSV nunca toca em cas_atenuacao')
assert.ok(TAMANHO_LOTE * COLUNAS_CSV.length < 65535, 'o lote precisa caber no teto de parâmetros do Postgres')
marcar(`upsert de ${COLUNAS_CSV.length} colunas conta novos por xmax e não encosta em cas_atenuacao`)

// ------------------------------------------------------------
// 8. Busca — tsquery e SQL parametrizado
// ------------------------------------------------------------

assert.equal(montarTsQuery('3M 1100'), "'3m':* & '1100':*")
assert.equal(montarTsQuery('proteção'), "'proteção':*")
assert.equal(montarTsQuery(''), null)
assert.equal(montarTsQuery('   '), null)
assert.equal(montarTsQuery('a'), null, 'termo de 1 caractere não vira busca')

// Campo livre: nada que o perito digitar pode virar operador de tsquery,
// que derrubaria a consulta com erro de sintaxe do Postgres.
assert.equal(montarTsQuery("' | ' & !("), null)
assert.equal(montarTsQuery("3M' OR 1=1--"), "'3m':* & 'or':*")
const FORMATO_SEGURO = /^'[\p{L}\p{N}]+':\*(?: & '[\p{L}\p{N}]+':\*)*$/u
for (const bruto of ["'; DROP TABLE cas_oficiais; --", '&|!():*<>', 'a & b | c', '3M<>|| 1100']) {
  const consulta = montarTsQuery(bruto)
  if (consulta) assert.ok(FORMATO_SEGURO.test(consulta), `tsquery insegura para ${bruto}: ${consulta}`)
}

const busca = montarBusca({
  termo: '3m millenium',
  anexo: 'Anexo 1',
  auditivo: true,
  dataReferencia: '2022-05-01',
  limite: 40,
})
assert.ok(busca.sql.includes(EXPRESSAO_BUSCA), 'a expressão precisa bater com a do índice GIN, letra por letra')
assert.equal(busca.parametros[0], "'3m':* & 'millenium':*")
assert.equal(busca.parametros[3], 'Anexo 1')
assert.equal(busca.parametros[4], true)
assert.equal(busca.parametros[5], '2022-05-01')
assert.ok(busca.sql.includes('LIMIT 40'))
assert.ok(!busca.sql.includes('3m'), 'nenhum valor do usuário concatenado no texto do comando')
assert.ok(busca.sql.includes('o."descontinuado" = FALSE'), 'layout descontinuado fica de fora por padrão')
assert.ok(
  !montarBusca({ dataReferencia: '2022-05-01', limite: 30, incluirDescontinuados: true }).sql.includes('descontinuado'),
)
assert.ok(montarBusca({ dataReferencia: '2022-05-01', limite: 9999 }).sql.includes('LIMIT 200'), 'limite tem teto')
assert.equal(montarBusca({ dataReferencia: '2022-05-01', limite: 30 }).parametros[0], null)
marcar('busca usa a expressão indexada, respeita teto de limite e não concatena entrada do usuário')

// ------------------------------------------------------------
// 9. Histórico de homologação — os 22 CAs que a base tem
// ------------------------------------------------------------

function homologacao(processo: string, dataValidade: string | null, extra: Partial<Homologacao> = {}): Homologacao {
  return {
    numeroCa: '14168',
    processo,
    dataValidade,
    situacao: 'VENCIDO',
    equipamento: 'PROTETOR AUDITIVO',
    descricao: 'Protetor auditivo circum-auricular.',
    marca: 'ACME',
    referencia: 'MOD-1',
    cor: null,
    cnpj: null,
    razaoSocial: null,
    natureza: null,
    aprovadoParaLaudo: null,
    restricaoLaudo: null,
    observacaoLaudo: null,
    normas: [],
    laudos: [],
    categoria: 'Proteção auditiva',
    anexos: ['Anexo 1', 'Anexo 2'],
    exigeNrrsf: true,
    descontinuado: false,
    ...extra,
  }
}

// Caso real da base: o CA 14168 valeu até 07/01/2009 num processo e
// até 12/06/2014 em outro. Numa perícia sobre 2010, colapsar os dois
// num registro só produziria afirmação errada no laudo.
const historico = [homologacao('P-2004', '2009-01-07'), homologacao('P-2009', '2014-06-12')]

const em2010 = escolherHomologacao(historico, '2010-06-01')
assert.equal(em2010?.processo, 'P-2009')
assert.equal(em2010?.validade.valido, true)

assert.equal(escolherHomologacao(historico, '2007-06-01')?.validade.valido, true, 'em 2007 as duas valiam')

const em2020 = escolherHomologacao(historico, '2020-06-01')
assert.equal(em2020?.processo, 'P-2009', 'sem nenhuma válida, cita a de validade mais recente')
assert.equal(em2020?.validade.valido, false)

assert.equal(escolherHomologacao([], '2020-01-01'), null)
// Estabilidade: a ordem de entrada não pode mudar a resposta.
assert.equal(escolherHomologacao([...historico].reverse(), '2010-06-01')?.processo, 'P-2009')
assert.equal(escolherHomologacao([...historico].reverse(), '2020-06-01')?.processo, 'P-2009')
marcar('CA com mais de uma homologação escolhe a que valia na data — não a mais nova por acaso')

// ------------------------------------------------------------
// 10. Ficha individual do portal (única fonte do NRRsf)
// ------------------------------------------------------------

const FICHAS = [
  { numeroCa: '11882', nrrsf: 17, banda125: '21', banda8000: '36', validade: '23/03/2028 00:00:00', referencia: '3M Millenium.' },
  { numeroCa: '18189', nrrsf: 13, banda125: '19', banda8000: '37', validade: '01/04/2027 00:00:00', referencia: "FREITAS EPl'S / F001 / SILICONE." },
] as const

for (const esperado of FICHAS) {
  const html = await readFile(new URL(`./fixtures/ficha-ca-${esperado.numeroCa}.html`, import.meta.url), 'utf8')
  const ficha = extrairFicha(html, esperado.numeroCa)

  assert.equal(normalizarNrrsf(ficha.nrrsfBruto), esperado.nrrsf, `NRRsf do CA ${esperado.numeroCa}`)
  assert.equal(ficha.equipamento, 'PROTETOR AUDITIVO')
  assert.equal(ficha.referencia, esperado.referencia)
  assert.equal(ficha.validadeBruta, esperado.validade)
  assert.equal(normalizarData(ficha.validadeBruta), normalizarData(esperado.validade))
  assert.equal(ficha.situacaoBruta, 'VÁLIDO', 'o rótulo "Situação:" tem de sair, com acento e tudo')
  assert.equal(normalizarSituacao(ficha.situacaoBruta), 'VALIDO')
  assert.equal(ficha.bandas['125'], esperado.banda125)
  assert.equal(ficha.bandas['8000'], esperado.banda8000)
  assert.ok(!('3150' in ficha.bandas), 'banda em branco não vira chave')
}
marcar('ficha do MTE devolve NRRsf 17 dB (CA 11882) e 13 dB (CA 18189), batendo com a planilha do perito')

// ------------------------------------------------------------
// 11. Bloqueio do Cloudflare — falha com mensagem útil
// ------------------------------------------------------------

assert.equal(ehDesafioCloudflare(403, '<title>Just a moment...</title>'), true)
assert.equal(ehDesafioCloudflare(503, 'src="/cdn-cgi/challenges.cloudflare.com/turnstile.js"'), true)
assert.equal(ehDesafioCloudflare(500, 'erro interno do portal'), false)
assert.equal(ehDesafioCloudflare(200, 'Just a moment...'), false, 'página normal não pode ser confundida')
marcar('desafio do Cloudflare é reconhecido e vira instrução de baixar o arquivo à mão')

// ------------------------------------------------------------
// 12. Busca do NRRsf sob demanda
//
// O valor só existe na ficha individual, e o portal cai. O que se
// garante aqui: uma ida por CA, ninguém pagando ida perdida durante um
// bloqueio, e o CA que falhou voltando para a fila em vez de sumir.
// ------------------------------------------------------------

const fichaDoPortal = (nrrsfBruto: string | null): FichaCa => ({
  numeroCa: '11512',
  nrrsfBruto,
  bandas: nrrsfBruto ? { '125': '21' } : {},
  validadeBruta: null,
  situacaoBruta: null,
  equipamento: 'PROTETOR AUDITIVO',
  referencia: null,
})

const gravacoes: { numeroCa: string; nrrsfDb: number | null; bandas: string | null }[] = []
const gravarFicha = async (numeroCa: string, nrrsfDb: number | null, bandas: string | null) => {
  gravacoes.push({ numeroCa, nrrsfDb, bandas })
}

// 12.1 — dois peritos no mesmo CA fazem uma ida só ao portal
let idasAoPortal = 0
const buscadorFeliz = criarBuscadorNrrsf({
  buscar: async () => {
    idasAoPortal += 1
    return fichaDoPortal('17 dB')
  },
  gravar: gravarFicha,
  pausaEntreRepescagensMs: 0,
})
const juntos = await Promise.all([buscadorFeliz.garantir('11512'), buscadorFeliz.garantir('11512')])
assert.deepEqual(juntos[0], { estado: 'encontrado', nrrsfDb: 17 })
assert.deepEqual(juntos[1], { estado: 'encontrado', nrrsfDb: 17 })
assert.equal(idasAoPortal, 1)
assert.equal(gravacoes.length, 1)
assert.equal(gravacoes[0]?.nrrsfDb, 17)
assert.ok(gravacoes[0]?.bandas?.includes('125'), 'a tabela de atenuação vem junto')
assert.deepEqual(buscadorFeliz.situacao().naFila, [], 'deu certo, nada a repescar')

// 12.2 — ficha sem a coluna: registra a visita para não tentar de novo
gravacoes.length = 0
const semColuna = criarBuscadorNrrsf({
  buscar: async () => fichaDoPortal(null),
  gravar: gravarFicha,
  pausaEntreRepescagensMs: 0,
})
assert.deepEqual(await semColuna.garantir('11512'), { estado: 'sem_valor_na_ficha' })
assert.equal(gravacoes.length, 1)
assert.equal(gravacoes[0]?.nrrsfDb, null)
assert.deepEqual(semColuna.situacao().naFila, [])

// 12.3 — CA que o portal não conhece não vira gravação nem fila
gravacoes.length = 0
const semCa = criarBuscadorNrrsf({
  buscar: async () => null,
  gravar: gravarFicha,
  pausaEntreRepescagensMs: 0,
})
assert.deepEqual(await semCa.garantir('99999999'), { estado: 'ca_inexistente' })
assert.equal(gravacoes.length, 0)
assert.deepEqual(semCa.situacao().naFila, [])

// 12.4 — Cloudflare abre o disjuntor; o perito ainda pode forçar
let instante = 1_000_000
let tentativasBloqueadas = 0
const comBloqueio = criarBuscadorNrrsf({
  buscar: async () => {
    tentativasBloqueadas += 1
    throw new ErroDesafioCloudflare()
  },
  gravar: gravarFicha,
  agora: () => instante,
  pausaAposBloqueioMs: 600_000,
  // Sem timer: a repescagem é exercitada na mão, e o smoke não
  // fica com relógio pendurado.
  pausaEntreRepescagensMs: 0,
})

assert.deepEqual(await comBloqueio.garantir('11512'), { estado: 'portal_bloqueado' })
assert.deepEqual(comBloqueio.situacao().naFila, ['11512'], 'o CA volta para a fila')
assert.equal(comBloqueio.situacao().portalBloqueadoAte, instante + 600_000)

assert.deepEqual(await comBloqueio.garantir('18189'), { estado: 'portal_bloqueado' })
assert.equal(tentativasBloqueadas, 1, 'durante a pausa ninguém paga ida perdida ao portal')
assert.deepEqual(comBloqueio.situacao().naFila, ['11512', '18189'])

assert.deepEqual(await comBloqueio.garantir('11512', true), { estado: 'portal_bloqueado' })
assert.equal(tentativasBloqueadas, 2, 'pedido do perito passa por cima da pausa')

instante += 600_001
assert.deepEqual(await comBloqueio.garantir('18189'), { estado: 'portal_bloqueado' })
assert.equal(tentativasBloqueadas, 3, 'passada a pausa, volta a tentar sozinho')

// 12.5 — falha comum: insiste algumas vezes e desiste
const comFalha = criarBuscadorNrrsf({
  buscar: async () => {
    throw new Error('conexão caiu')
  },
  gravar: gravarFicha,
  tentativasPorCa: 2,
  pausaEntreRepescagensMs: 0,
})
assert.deepEqual(await comFalha.garantir('11512'), { estado: 'falhou' })
assert.deepEqual(await comFalha.garantir('11512'), { estado: 'falhou' })
assert.deepEqual(comFalha.situacao().naFila, ['11512'])
assert.deepEqual(await comFalha.garantir('11512'), { estado: 'falhou' })
assert.deepEqual(comFalha.situacao().naFila, [], 'depois de insistir demais, o CA sai da fila')

// 12.6 — portal fora do ar não vira fila crescendo sem limite
const filaCheia = criarBuscadorNrrsf({
  buscar: async () => {
    throw new Error('conexão caiu')
  },
  gravar: gravarFicha,
  tamanhoMaximoDaFila: 2,
  pausaEntreRepescagensMs: 0,
})
for (const numero of ['11512', '18189', '11882']) await filaCheia.garantir(numero)
assert.deepEqual(filaCheia.situacao().naFila, ['11512', '18189'])

// 12.7 — a gravação em si precisa de banco; o que dá para garantir sem
// ele é que o SQL compartilhado nunca encosta no valor do perito.
const fonteNrrsf = await readFile(new URL('../src/services/caepi/nrrsf.ts', import.meta.url), 'utf8')
assert.ok(fonteNrrsf.includes(`WHERE "cas_atenuacao"."fonte" <> 'PERITO'`))
assert.ok(fonteNrrsf.includes('COALESCE(EXCLUDED."nrrsfDb"'), 'ficha sem valor não apaga o que já havia')
const fonteSync = await readFile(new URL('../src/services/caepi/sync.ts', import.meta.url), 'utf8')
assert.ok(
  fonteSync.includes('gravarAtenuacaoDaFicha'),
  'o lote e a busca sob demanda gravam pelo mesmo caminho',
)
marcar('NRRsf é buscado na hora, uma vez por CA, com disjuntor no bloqueio e fila para tentar de novo')

// ------------------------------------------------------------
// 13. Rotas HTTP
// ------------------------------------------------------------

const chamadas: { metodo: string; argumentos: unknown[] }[] = []
let atenuacaoGravada: { nrrsfDb: number | null; observacao: string | null } | null = null

// O CA 11512 é o caso real: protetor auditivo sem NRRsf no espelho. É
// ele que a rota tem de ir buscar na ficha do MTE, em vez de deixar o
// perito baixar o certificado à mão.
let atenuacaoDoPortal: Atenuacao | null = null

const repositorioFalso: RepositorioCaepi = {
  async homologacoesDe(numeroCa) {
    chamadas.push({ metodo: 'homologacoesDe', argumentos: [numeroCa] })
    return numeroCa === '14168' || numeroCa === '11512' ? historico : []
  },
  async atenuacaoDe(numeroCa) {
    chamadas.push({ metodo: 'atenuacaoDe', argumentos: [numeroCa] })
    if (numeroCa === '11512') return atenuacaoDoPortal
    return {
      numeroCa,
      nrrsfDb: 17,
      fonte: 'PERITO',
      bandas: null,
      observacao: 'Conferido com a planilha do perito.',
      fichaConsultadaEm: null,
      atualizadoEm: new Date('2026-08-20T12:00:00Z'),
    }
  },
  async buscar(filtros) {
    chamadas.push({ metodo: 'buscar', argumentos: [filtros] })
    return [{ ...homologacao('P-2009', '2014-06-12'), nrrsfDb: 17, fonteNrrsf: 'PERITO' }]
  },
  async salvarAtenuacao(numeroCa, dados) {
    chamadas.push({ metodo: 'salvarAtenuacao', argumentos: [numeroCa, dados] })
    atenuacaoGravada = dados
    return {
      numeroCa,
      nrrsfDb: dados.nrrsfDb,
      fonte: 'PERITO',
      bandas: null,
      observacao: dados.observacao,
      fichaConsultadaEm: null,
      atualizadoEm: new Date('2026-08-20T12:00:00Z'),
    }
  },
  async status(dataReferencia) {
    chamadas.push({ metodo: 'status', argumentos: [dataReferencia] })
    return {
      ultimaSincronizacao: null,
      totais: {
        homologacoes: 42343,
        cas: 42321,
        validosHoje: 14903,
        protetoresAuditivos: 543,
        comNrrsf: 2,
        nrrsfDoPerito: 2,
      },
    }
  },
}

// Buscador injetado: nenhum teste pode acabar batendo no portal do MTE.
const buscadorFalso: Buscador = {
  async garantir(numeroCa, forcar = false) {
    chamadas.push({ metodo: 'garantir', argumentos: [numeroCa, forcar] })
    atenuacaoDoPortal = {
      numeroCa,
      nrrsfDb: 13,
      fonte: 'CAEPI',
      bandas: null,
      observacao: null,
      fichaConsultadaEm: new Date('2026-08-22T10:00:00Z'),
      atualizadoEm: new Date('2026-08-22T10:00:00Z'),
    }
    return { estado: 'encontrado', nrrsfDb: 13 }
  },
  situacao: () => ({ portalBloqueadoAte: 0, naFila: [] }),
  pararRepescagem: () => {},
}

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/caepi', criarCaepiRouter(repositorioFalso, buscadorFalso))
app.use(tratarErros)

const servidor = await new Promise<ReturnType<typeof app.listen>>((resolver) => {
  const instancia = app.listen(0, () => resolver(instancia))
})

try {
  const endereco = servidor.address()
  assert.ok(endereco && typeof endereco !== 'string')
  const base = `http://127.0.0.1:${endereco.port}`

  const token = jwt.sign(
    { id: 'smoke-user', email: 'smoke@example.test', perfil: 'admin' },
    process.env.JWT_SECRET as string,
  )
  const pedir = (caminho: string, init?: RequestInit) =>
    fetch(`${base}${caminho}`, {
      ...init,
      headers: { cookie: `dr_sessao=${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })

  // 13.1 — sem sessão não passa nada
  assert.equal((await fetch(`${base}/caepi/cas/14168`)).status, 401)
  assert.equal((await fetch(`${base}/caepi/status`)).status, 401)
  assert.equal(chamadas.length, 0, 'nenhuma consulta ao repositório antes de autenticar')

  // 13.2 — ficha do CA na data da perícia
  const resposta = await pedir('/caepi/cas/014168?em=2010-06-01')
  assert.equal(resposta.status, 200)
  const ficha = (await resposta.json()) as {
    numeroCa: string
    dataReferencia: string
    exigeNrrsf: boolean
    buscaNrrsf: string
    temHistorico: boolean
    vigente: { processo: string; validade: { valido: boolean; motivo: string } }
    homologacoes: { processo: string; validade: { valido: boolean } }[]
    atenuacao: { nrrsfDb: number; fonte: string }
  }
  assert.equal(ficha.numeroCa, '14168', 'zero à esquerda normalizado na rota')
  assert.equal(ficha.dataReferencia, '2010-06-01')
  assert.equal(ficha.temHistorico, true)
  assert.equal(ficha.exigeNrrsf, true)
  assert.equal(ficha.homologacoes.length, 2, 'as duas homologações aparecem, nenhuma é escondida')
  assert.equal(ficha.vigente.processo, 'P-2009')
  assert.equal(ficha.vigente.validade.valido, true)
  assert.ok(ficha.vigente.validade.motivo.includes('01/06/2010'), 'a frase do laudo cita a data avaliada')
  assert.equal(ficha.homologacoes.find((h) => h.processo === 'P-2004')?.validade.valido, false)
  assert.equal(ficha.atenuacao.nrrsfDb, 17)
  assert.equal(ficha.atenuacao.fonte, 'PERITO')

  // 13.2b — CA com NRRsf do perito não vai ao portal
  assert.equal(ficha.buscaNrrsf, 'ja_tinha', 'com valor gravado não se incomoda o portal do MTE')
  assert.equal(chamadas.some((c) => c.metodo === 'garantir'), false)

  // 13.2c — o caso do CA 11512: sem NRRsf no espelho, a rota busca a
  // ficha na hora e devolve o valor já gravado.
  const semNrrsf = await pedir('/caepi/cas/11512?em=2010-06-01')
  assert.equal(semNrrsf.status, 200)
  const buscada = (await semNrrsf.json()) as {
    buscaNrrsf: string
    atenuacao: { nrrsfDb: number; fonte: string } | null
  }
  assert.equal(buscada.buscaNrrsf, 'encontrado')
  assert.equal(buscada.atenuacao?.nrrsfDb, 13, 'o valor da ficha volta na mesma resposta')
  assert.equal(buscada.atenuacao?.fonte, 'CAEPI')
  assert.deepEqual(chamadas.find((c) => c.metodo === 'garantir')?.argumentos, ['11512', false])

  // 13.2d — já tendo valor, só busca de novo se o perito pedir
  const deNovo = (await (await pedir('/caepi/cas/11512?buscarNrrsf=forcar')).json()) as { buscaNrrsf: string }
  assert.equal(deNovo.buscaNrrsf, 'encontrado')
  assert.deepEqual(
    chamadas.filter((c) => c.metodo === 'garantir').at(-1)?.argumentos,
    ['11512', true],
    'o pedido do perito ignora a pausa automática',
  )
  assert.equal(
    ((await (await pedir('/caepi/cas/11512')).json()) as { buscaNrrsf: string }).buscaNrrsf,
    'ja_tinha',
    'sem forçar, o valor já buscado basta',
  )
  assert.equal((await pedir('/caepi/cas/11512?buscarNrrsf=sim')).status, 422)

  // 13.3 — sem ?em= a referência é hoje, e a resposta diz qual data usou
  const semData = (await (await pedir('/caepi/cas/14168')).json()) as { dataReferencia: string }
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(semData.dataReferencia))

  // 13.4 — CA inexistente explica o que fazer
  const inexistente = await pedir('/caepi/cas/99999999')
  assert.equal(inexistente.status, 404)
  assert.ok(((await inexistente.json()) as { erro: string }).erro.includes('manualmente'))

  // 13.5 — entradas inválidas
  assert.equal((await pedir('/caepi/cas/abc')).status, 400)
  assert.equal((await pedir('/caepi/cas/14168?em=01/06/2010')).status, 422)

  // 13.6 — busca repassa os filtros já normalizados
  const listagem = await pedir('/caepi/cas?q=3m&anexo=Anexo%201&auditivo=1&em=2010-06-01&limite=5')
  assert.equal(listagem.status, 200)
  const lista = (await listagem.json()) as {
    total: number
    itens: { validade: { valido: boolean }; nrrsfDb: number }[]
  }
  assert.equal(lista.total, 1)
  assert.equal(lista.itens[0]?.nrrsfDb, 17)
  assert.equal(lista.itens[0]?.validade.valido, true, 'a listagem também responde na data de referência')
  assert.deepEqual(chamadas.find((c) => c.metodo === 'buscar')?.argumentos[0], {
    termo: '3m',
    anexo: 'Anexo 1',
    auditivo: true,
    incluirDescontinuados: false,
    dataReferencia: '2010-06-01',
    limite: 5,
  })

  // 13.7 — NRRsf do perito: aceita vírgula, recusa fora de faixa, permite limpar
  const gravado = await pedir('/caepi/cas/14168/atenuacao', {
    method: 'PATCH',
    body: JSON.stringify({ nrrsfDb: '21,5', observacao: '  Medido em campo.  ' }),
  })
  assert.equal(gravado.status, 200)
  const confirmado = (await gravado.json()) as { numeroCa: string; nrrsfDb: number; fonte: string; observacao: string }
  assert.equal(confirmado.numeroCa, '14168')
  assert.equal(confirmado.nrrsfDb, 21.5)
  assert.equal(confirmado.fonte, 'PERITO', 'o que o perito grava é sempre marcado como dele')
  assert.equal(confirmado.observacao, 'Medido em campo.')
  assert.deepEqual(atenuacaoGravada, { nrrsfDb: 21.5, observacao: 'Medido em campo.' })

  const foraDeFaixa = await pedir('/caepi/cas/14168/atenuacao', {
    method: 'PATCH',
    body: JSON.stringify({ nrrsfDb: 99 }),
  })
  assert.equal(foraDeFaixa.status, 422)
  assert.ok(((await foraDeFaixa.json()) as { erro: string }).erro.includes('0 e 50'))

  await pedir('/caepi/cas/14168/atenuacao', { method: 'PATCH', body: JSON.stringify({ nrrsfDb: null }) })
  assert.deepEqual(atenuacaoGravada, { nrrsfDb: null, observacao: null }, 'erro de digitação pode ser apagado')

  assert.equal(
    (await pedir('/caepi/cas/99999999/atenuacao', { method: 'PATCH', body: JSON.stringify({ nrrsfDb: 10 }) })).status,
    404,
    'não grava NRRsf para CA que não existe na base',
  )

  // 13.8 — status
  const status = (await (await pedir('/caepi/status')).json()) as { totais: { cas: number } }
  assert.equal(status.totais.cas, 42321)

  // 13.9 — carga da base pelo painel: quem pode e o que é aceito.
  //
  // Só as recusas são exercitadas aqui, e de propósito: todas param
  // antes de `sincronizar`, que precisa de banco. A carga em si é o
  // bloco 13, que roda o pipeline inteiro com gravador falso.
  assert.equal(
    (await fetch(`${base}/caepi/importar?nome=RelatorioCA.csv.gz`, { method: 'POST' })).status,
    401,
    'importar sem sessão não passa',
  )

  const tokenPerito = jwt.sign(
    { id: 'smoke-perito', email: 'perito@example.test', perfil: 'perito' },
    process.env.JWT_SECRET as string,
  )
  const comoPerito = await fetch(`${base}/caepi/importar?nome=RelatorioCA.csv.gz`, {
    method: 'POST',
    headers: { cookie: `dr_sessao=${tokenPerito}` },
  })
  assert.equal(comoPerito.status, 403, 'trocar a base oficial é ação de admin, não de perito')

  const semNome = await pedir('/caepi/importar', { method: 'POST' })
  assert.equal(semNome.status, 422, 'sem o nome do arquivo não dá para saber se veio comprimido')

  const extensaoErrada = await pedir('/caepi/importar?nome=planilha.xlsx', { method: 'POST' })
  assert.equal(extensaoErrada.status, 422)
  assert.ok(
    ((await extensaoErrada.json()) as { erro: string }).erro.includes('.csv.gz'),
    'a recusa diz qual arquivo o portal entrega',
  )
} finally {
  await new Promise<void>((resolver, rejeitar) => servidor.close((erro) => (erro ? rejeitar(erro) : resolver())))
}
marcar('rotas exigem sessão, respondem na data de referência, validam NRRsf e só deixam admin trocar a base')

// ------------------------------------------------------------
// 14. Sincronização de ponta a ponta (sem banco)
// ------------------------------------------------------------

const { sincronizarBase } = await import('../src/services/caepi/sync.js')

const lotesGravados: RegistroCa[][] = []
const gravarFalso = async (lote: RegistroCa[]) => {
  // O gravador recebe uma cópia viva: guardar a referência deixaria
  // todos os lotes apontando para o mesmo array reaproveitado.
  lotesGravados.push([...lote])
  return { novos: lote.length, atualizados: 0 }
}

const resultado = await sincronizarBase({ fonte: Readable.from([csv]), gravar: gravarFalso })
assert.equal(resultado.linhasLidas, 3)
assert.equal(resultado.registros, 2, 'as duas linhas do CA 11882 são a mesma homologação')
assert.equal(resultado.linhasIgnoradas, 0)
assert.equal(resultado.novos, 2)
assert.equal(lotesGravados.length, 1)

const gravado11882 = lotesGravados[0]?.find((registro) => registro.numeroCa === '11882')
assert.ok(gravado11882)
assert.deepEqual(gravado11882.normas, ['ANSI S3.19-1974', 'NBR 16076'], 'as normas das duas linhas chegam juntas')
assert.equal(gravado11882.laudos.length, 2)
assert.equal(gravado11882.exigeNrrsf, true)
assert.equal(lotesGravados[0]?.find((registro) => registro.numeroCa === '31810')?.descontinuado, true)

// Lotes: 1.200 registros distintos precisam sair em 500 + 500 + 200.
const muitos =
  `﻿${cabecalho}\r\n` +
  Array.from({ length: 1200 }, (_, i) =>
    linhaCsv({
      'NR Registro CA': String(10_000 + i),
      'NR DO PROCESSO': `19980.${String(10_000 + i)}/2015-11`,
      'DATA DE VALIDADE': '01/01/2030',
      SITUACAO: 'VÁLIDO',
      EQUIPAMENTO: 'CAPACETE DE SEGURANCA',
    }),
  ).join('\r\n') +
  '\r\n'

lotesGravados.length = 0
const emLotes = await sincronizarBase({ fonte: Readable.from([muitos]), gravar: gravarFalso })
assert.equal(emLotes.registros, 1200)
assert.deepEqual(lotesGravados.map((lote) => lote.length), [500, 500, 200])
assert.ok(TAMANHO_LOTE * COLUNAS_CSV.length < 65535)
marcar('sincronização agrega o CSV, mescla o mesmo CA e grava em lotes de 500')

// ------------------------------------------------------------
// 15. Leitura do .csv.gz do portal
//
// É o caminho que a produção usa (`sync:caepi --arquivo`). O arquivo
// do MTE traz lixo colado depois do fim do membro gzip: o gunzip
// entrega a base inteira e só então estoura "incorrect header check".
// Ler 42 mil registros e morrer no fim é pior que não ler nada, então
// esse fim de arquivo tem que ser tratado como ruído.
// ------------------------------------------------------------
{
  const { gzipSync } = await import('node:zlib')
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { abrirCsvCaepi } = await import('../src/services/caepi/arquivo.js')

  const pasta = await mkdtemp(join(tmpdir(), 'smoke-caepi-'))
  try {
    const conteudo = `﻿${cabecalho}\r\n${linhaCsv({ 'NR Registro CA': '11882' })}\r\n`

    const comLixo = join(pasta, 'base.csv.gz')
    await writeFile(comLixo, Buffer.concat([
      gzipSync(Buffer.from(conteudo, 'utf8')),
      Buffer.from('<html>Just a moment...</html>', 'utf8'),
    ]))

    const lidas: LinhaCaepi[] = []
    for await (const linha of lerCaepi(abrirCsvCaepi(comLixo) as AsyncIterable<string>)) lidas.push(linha)
    assert.equal(lidas.length, 1, 'o lixo depois do gzip não pode derrubar a leitura')
    assert.equal(lidas[0]?.['NR Registro CA'], '11882')

    // .csv puro continua funcionando pelo mesmo caminho.
    const puro = join(pasta, 'base.csv')
    await writeFile(puro, conteudo, 'utf8')
    const doPuro: LinhaCaepi[] = []
    for await (const linha of lerCaepi(abrirCsvCaepi(puro) as AsyncIterable<string>)) doPuro.push(linha)
    assert.deepEqual(doPuro, lidas, 'o .gz e o .csv precisam render exatamente a mesma leitura')

    // Corrompido de verdade (nenhum byte válido) ainda tem que falhar.
    const corrompido = join(pasta, 'ruim.csv.gz')
    await writeFile(corrompido, Buffer.from('isto não é gzip nenhum', 'utf8'))
    await assert.rejects(
      (async () => {
        for await (const _ of lerCaepi(abrirCsvCaepi(corrompido) as AsyncIterable<string>)) void _
      })(),
      /não começa com um cabeçalho gzip/i,
      'arquivo corrompido do início precisa continuar estourando',
    )

    // Download cortado no meio do deflate: importar meia base seria pior
    // que não importar, então isso também tem que falhar.
    const cortado = join(pasta, 'cortado.csv.gz')
    const inteiro = gzipSync(Buffer.from(conteudo, 'utf8'))
    await writeFile(cortado, inteiro.subarray(0, inteiro.length - 12))
    await assert.rejects(
      (async () => {
        for await (const _ of lerCaepi(abrirCsvCaepi(cortado) as AsyncIterable<string>)) void _
      })(),
      'arquivo truncado não pode passar por completo',
    )
  } finally {
    await rm(pasta, { recursive: true, force: true })
  }
}
marcar('leitura do .csv.gz ignora o lixo do portal mas ainda recusa arquivo corrompido')

for (const linha of conferidos) console.log(`✓ ${linha}`)
console.log(`\n${conferidos.length} blocos conferidos.`)
