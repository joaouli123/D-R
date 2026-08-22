// ============================================================
// Preenchimento automático por CNPJ e por número de processo.
//
// Nenhuma chamada real sai daqui: a ida à rede é injetada, então o
// smoke roda no CI, em máquina sem internet e sem gastar cota das
// fontes públicas. O que se verifica é o que a tela depende:
// dígito verificador, tradução do JSON, mensagem de erro em
// português e cache.
// ============================================================

import assert from 'node:assert/strict'

process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@127.0.0.1:5432/smoke'
process.env.JWT_SECRET ??= 'smoke-test-secret-with-at-least-32-characters'

const {
  cnpjValido,
  consultarCnpj,
  formatarCnae,
  formatarCep,
  formatarCnpj,
  formatarTelefone,
  limparCacheDeCnpj,
  mapearCnpj,
  montarLogradouro,
  normalizarCnpj,
} = await import('../src/services/consultas/cnpj.js')
const {
  AVISO_PARTES,
  cidadeDoOrgao,
  consultarProcesso,
  dataDoCnj,
  digitoVerificadorCnj,
  formatarNumeroCnj,
  indiceDataJud,
  limparCacheDeProcessos,
  mapearProcesso,
  numeroCnjValido,
  rotuloDoGrau,
} = await import('../src/services/consultas/processo.js')
const { limparCacheDeMunicipios, municipioPorCodigo } = await import(
  '../src/services/consultas/ibge.js'
)
const { criarCache, FonteIndisponivel } = await import('../src/services/consultas/fonte.js')
const { ErroHttp } = await import('../src/erros.js')

let verificacoes = 0
const confere = (feito: () => void) => {
  feito()
  verificacoes += 1
}

/** fetch de mentira: responde conforme a URL pedida. */
function rede(
  responder: (url: string, opcoes: RequestInit | undefined) => { status: number; corpo?: unknown },
) {
  const chamadas: string[] = []
  const buscar = (async (url: unknown, opcoes: unknown) => {
    chamadas.push(String(url))
    const { status, corpo } = responder(String(url), opcoes as RequestInit | undefined)
    return {
      status,
      text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)),
    } as Response
  }) as typeof fetch
  return { buscar, chamadas }
}

type ErroDeRota = import('../src/erros.js').ErroHttp

async function erroDe(feito: () => Promise<unknown>): Promise<ErroDeRota> {
  try {
    await feito()
  } catch (erro) {
    assert.ok(erro instanceof ErroHttp, `esperava ErroHttp, veio ${String(erro)}`)
    return erro
  }
  throw new Error('a consulta deveria ter falhado')
}

function limparCaches() {
  limparCacheDeCnpj()
  limparCacheDeProcessos()
  limparCacheDeMunicipios()
}

// ---------------- CNPJ: funções puras ----------------

// CNPJs reais, de empresas públicas — servem de referência do dígito.
confere(() => assert.equal(cnpjValido('00.000.000/0001-91'), true)) // Banco do Brasil
confere(() => assert.equal(cnpjValido('34028316000103'), true)) // Correios
confere(() => assert.equal(cnpjValido('34028316000104'), false))
confere(() => assert.equal(cnpjValido('11111111111111'), false))
confere(() => assert.equal(cnpjValido('123'), false))
confere(() => assert.equal(normalizarCnpj('34.028.316/0001-03'), '34028316000103'))
confere(() => assert.equal(formatarCnpj('34028316000103'), '34.028.316/0001-03'))
confere(() => assert.equal(formatarCnae(9430800), '94.30-8-00'))
confere(() => assert.equal(formatarCnae('2511-0/00'), '25.11-0-00'))
confere(() => assert.equal(formatarCnae('943'), null))
confere(() => assert.equal(formatarCep('09750000'), '09750-000'))
confere(() => assert.equal(formatarCep(null), null))
confere(() => assert.equal(formatarTelefone('1123851939'), '(11) 2385-1939'))
confere(() => assert.equal(formatarTelefone('11987651234'), '(11) 98765-1234'))
confere(() => assert.equal(formatarTelefone('1199'), null))
confere(() => assert.equal(montarLogradouro('AVENIDA', 'PAULISTA'), 'AVENIDA PAULISTA'))
// Registro que já traz o tipo embutido não pode virar "RUA RUA DAS FLORES".
confere(() => assert.equal(montarLogradouro('RUA', 'RUA DAS FLORES'), 'RUA DAS FLORES'))
confere(() => assert.equal(montarLogradouro(null, 'PRACA DA SE'), 'PRACA DA SE'))

const RESPOSTA_BRASILAPI = {
  cnpj: '34028316000103',
  razao_social: 'EMPRESA BRASILEIRA DE CORREIOS E TELEGRAFOS',
  nome_fantasia: 'CORREIOS',
  descricao_situacao_cadastral: 'ATIVA',
  data_situacao_cadastral: '2005-11-03',
  cnae_fiscal: 5310501,
  cnae_fiscal_descricao: 'Atividades do Correio Nacional',
  natureza_juridica: '201-1 Empresa Pública',
  porte: 'DEMAIS',
  data_inicio_atividade: '1969-03-20',
  descricao_tipo_de_logradouro: 'SBN QUADRA',
  logradouro: '01 BLOCO A',
  numero: 'S/N',
  complemento: 'EDIFICIO SEDE',
  bairro: 'ASA NORTE',
  municipio: 'BRASILIA',
  codigo_municipio_ibge: 5300108,
  uf: 'df',
  cep: '70002900',
  ddd_telefone_1: '6134263000',
  email: 'ATENDIMENTO@CORREIOS.COM.BR',
}

const mapeado = mapearCnpj(RESPOSTA_BRASILAPI, {
  cidade: 'Brasília',
  agora: () => new Date('2026-08-22T12:00:00Z'),
})
confere(() => assert.equal(mapeado.razaoSocial, 'EMPRESA BRASILEIRA DE CORREIOS E TELEGRAFOS'))
confere(() => assert.equal(mapeado.cnpjFormatado, '34.028.316/0001-03'))
confere(() => assert.equal(mapeado.cnae, '53.10-5-01'))
confere(() => assert.equal(mapeado.endereco, 'SBN QUADRA 01 BLOCO A'))
// A cidade é o único campo trocado pelo nome do IBGE; o resto fica
// como a Receita registra, que é a forma que vai para a qualificação.
confere(() => assert.equal(mapeado.cidade, 'Brasília'))
confere(() => assert.equal(mapeado.uf, 'DF'))
confere(() => assert.equal(mapeado.cep, '70002-900'))
confere(() => assert.equal(mapeado.telefone, '(61) 3426-3000'))
confere(() => assert.equal(mapeado.email, 'atendimento@correios.com.br'))
confere(() => assert.equal(mapeado.consultadoEm, '2026-08-22T12:00:00.000Z'))

// Sem o IBGE fica o texto da Receita — nunca campo em branco.
const semIbge = mapearCnpj(RESPOSTA_BRASILAPI)
confere(() => assert.equal(semIbge.cidade, 'BRASILIA'))

// ---------------- CNPJ: consulta ----------------

const IBGE_BRASILIA = {
  id: 5300108,
  nome: 'Brasília',
  microrregiao: { mesorregiao: { UF: { sigla: 'DF' } } },
}

limparCaches()
{
  const { buscar, chamadas } = rede((url) =>
    url.includes('ibge')
      ? { status: 200, corpo: IBGE_BRASILIA }
      : { status: 200, corpo: RESPOSTA_BRASILAPI },
  )

  const dados = await consultarCnpj('34.028.316/0001-03', { buscar })
  confere(() => assert.equal(dados.razaoSocial, 'EMPRESA BRASILEIRA DE CORREIOS E TELEGRAFOS'))
  confere(() => assert.equal(dados.cidade, 'Brasília'))
  confere(() => assert.equal(dados.fonte, 'Receita Federal (via BrasilAPI)'))

  // Segunda consulta do mesmo número não volta à fonte pública.
  const idas = chamadas.length
  await consultarCnpj('34028316000103', { buscar })
  confere(() => assert.equal(chamadas.length, idas))
}

limparCaches()
{
  // Dígito verificador errado nem chega a sair pela rede.
  const { buscar, chamadas } = rede(() => ({ status: 200, corpo: RESPOSTA_BRASILAPI }))
  const erro = await erroDe(() => consultarCnpj('34028316000104', { buscar }))
  confere(() => assert.equal(erro.status, 422))
  confere(() => assert.match(erro.message, /dígito verificador/))
  confere(() => assert.equal(chamadas.length, 0))
}

limparCaches()
{
  const erro = await erroDe(() => consultarCnpj('123', { buscar: rede(() => ({ status: 200 })).buscar }))
  confere(() => assert.equal(erro.status, 422))
  confere(() => assert.match(erro.message, /14 dígitos/))
}

limparCaches()
{
  const { buscar } = rede(() => ({ status: 404, corpo: { message: 'não encontrado', type: 'not_found' } }))
  const erro = await erroDe(() => consultarCnpj('34028316000103', { buscar }))
  confere(() => assert.equal(erro.status, 404))
  confere(() => assert.match(erro.message, /preencha à mão/i))
}

limparCaches()
{
  const { buscar } = rede(() => ({ status: 429 }))
  const erro = await erroDe(() => consultarCnpj('34028316000103', { buscar }))
  confere(() => assert.equal(erro.status, 503))
}

limparCaches()
{
  // Fonte fora do ar vira 504 com instrução, não erro cru na tela.
  const buscar = (async () => {
    throw new Error('getaddrinfo ENOTFOUND brasilapi.com.br')
  }) as typeof fetch
  const erro = await erroDe(() => consultarCnpj('34028316000103', { buscar }))
  confere(() => assert.equal(erro.status, 504))
  confere(() => assert.match(erro.message, /à mão/))
}

limparCaches()
{
  // Resposta 200 sem razão social é resposta imprestável.
  const { buscar } = rede((url) =>
    url.includes('ibge') ? { status: 200, corpo: IBGE_BRASILIA } : { status: 200, corpo: { cnpj: '34028316000103' } },
  )
  const erro = await erroDe(() => consultarCnpj('34028316000103', { buscar }))
  confere(() => assert.equal(erro.status, 502))
}

limparCaches()
{
  // IBGE mudo não pode derrubar a consulta do CNPJ.
  const { buscar } = rede((url) =>
    url.includes('ibge') ? { status: 500 } : { status: 200, corpo: RESPOSTA_BRASILAPI },
  )
  const dados = await consultarCnpj('34028316000103', { buscar })
  confere(() => assert.equal(dados.cidade, 'BRASILIA'))
}

// ---------------- IBGE ----------------

limparCaches()
{
  const { buscar, chamadas } = rede(() => ({ status: 200, corpo: IBGE_BRASILIA }))
  const municipio = await municipioPorCodigo(5300108, { buscar })
  confere(() => assert.deepEqual(municipio, { codigo: 5300108, nome: 'Brasília', uf: 'DF' }))

  await municipioPorCodigo(5300108, { buscar })
  confere(() => assert.equal(chamadas.length, 1))
}

limparCaches()
{
  const semCodigo = await municipioPorCodigo(null)
  confere(() => assert.equal(semCodigo, null))
}
{
  const { buscar } = rede(() => ({
    status: 200,
    corpo: {
      id: 3550308,
      nome: 'São Paulo',
      'regiao-imediata': { 'regiao-intermediaria': { UF: { sigla: 'SP' } } },
    },
  }))
  const municipio = await municipioPorCodigo(3550308, { buscar })
  confere(() => assert.equal(municipio?.uf, 'SP'))
}

// ---------------- Processo: funções puras ----------------

// Número real de processo trabalhista — confere o módulo 97.
confere(() => assert.equal(numeroCnjValido('1000890-38.2022.5.02.0011'), true))
confere(() => assert.equal(numeroCnjValido('10008903920225020011'), false))
confere(() => assert.equal(digitoVerificadorCnj('10008900020225020011'), '38'))
confere(() => assert.equal(formatarNumeroCnj('10008903820225020011'), '1000890-38.2022.5.02.0011'))

confere(() => assert.deepEqual(indiceDataJud('10008903820225020011'), {
  alias: 'api_publica_trt2',
  tribunal: 'TRT2',
}))
confere(() => assert.equal(indiceDataJud('10000008920225000000')?.tribunal, 'TST'))
confere(() => assert.equal(indiceDataJud('10008900620224036183')?.alias, 'api_publica_trf3'))
// Justiça estadual fica de fora de propósito: sem índice, sem chute.
confere(() => assert.equal(indiceDataJud('10008902020228260011'), null))

confere(() => assert.equal(rotuloDoGrau('G1'), '1º grau'))
confere(() => assert.equal(rotuloDoGrau('G2'), '2º grau'))
confere(() => assert.equal(rotuloDoGrau(null), 'Grau não informado'))
confere(() => assert.equal(dataDoCnj('20220223165523'), '2022-02-23'))
confere(() => assert.equal(dataDoCnj('2022-02-23T16:55:23.000Z'), '2022-02-23'))
confere(() => assert.equal(dataDoCnj(''), null))
confere(() => assert.equal(cidadeDoOrgao('11ª Vara do Trabalho de São Paulo'), 'São Paulo'))
confere(() => assert.equal(cidadeDoOrgao('9ª Turma'), null))

const HIT_G1 = {
  _source: {
    numeroProcesso: '10008903820225020011',
    tribunal: 'TRT2',
    grau: 'G1',
    dataAjuizamento: '20220223165523',
    dataHoraUltimaAtualizacao: '20240301100000',
    classe: { nome: 'Ação Trabalhista - Rito Ordinário' },
    orgaoJulgador: { nome: '11ª Vara do Trabalho de São Paulo', codigoMunicipioIBGE: 3550308 },
    assuntos: [{ nome: 'Adicional de Insalubridade' }],
  },
}
const HIT_G2 = {
  _source: {
    numeroProcesso: '10008903820225020011',
    tribunal: 'TRT2',
    grau: 'G2',
    dataHoraUltimaAtualizacao: '20250610100000',
    classe: { nome: 'Recurso Ordinário Trabalhista' },
    orgaoJulgador: { nome: '9ª Turma' },
    assuntos: [],
  },
}

// O CNJ devolve na ordem dele; a vara de origem é que interessa.
const processo = mapearProcesso([HIT_G2, HIT_G1], '10008903820225020011', {
  municipio: { nome: 'São Paulo', uf: 'SP' },
  agora: () => new Date('2026-08-22T12:00:00Z'),
})
confere(() => assert.equal(processo?.grau, 'G1'))
confere(() => assert.equal(processo?.vara, '11ª Vara do Trabalho de São Paulo'))
confere(() => assert.equal(processo?.comarca, 'São Paulo/SP'))
confere(() => assert.equal(processo?.classe, 'Ação Trabalhista - Rito Ordinário'))
confere(() => assert.equal(processo?.dataAjuizamento, '2022-02-23'))
confere(() => assert.deepEqual(processo?.assuntos, ['Adicional de Insalubridade']))
confere(() => assert.equal(processo?.instancias.length, 2))
confere(() => assert.equal(processo?.instancias[1]?.orgao, '9ª Turma'))
confere(() => assert.equal(processo?.aviso, AVISO_PARTES))
confere(() => assert.equal(mapearProcesso([], '10008903820225020011'), null))

// Sem IBGE, a comarca sai do nome da vara e da região do TRT.
const semMunicipio = mapearProcesso([HIT_G1], '10008903820225020011', { ufDoTribunal: 'SP' })
confere(() => assert.equal(semMunicipio?.comarca, 'São Paulo/SP'))

// ---------------- Processo: consulta ----------------

const RESPOSTA_DATAJUD = { hits: { total: { value: 2 }, hits: [HIT_G2, HIT_G1] } }
const IBGE_SAO_PAULO = {
  id: 3550308,
  nome: 'São Paulo',
  microrregiao: { mesorregiao: { UF: { sigla: 'SP' } } },
}

limparCaches()
{
  const { buscar, chamadas } = rede((url, opcoes) => {
    if (url.includes('ibge')) return { status: 200, corpo: IBGE_SAO_PAULO }
    const cabecalhos = (opcoes?.headers ?? {}) as Record<string, string>
    assert.equal(cabecalhos.Authorization, 'APIKey chave-de-teste')
    assert.equal(opcoes?.method, 'POST')
    return { status: 200, corpo: RESPOSTA_DATAJUD }
  })

  const dados = await consultarProcesso('1000890-38.2022.5.02.0011', {
    chave: 'chave-de-teste',
    buscar,
  })
  confere(() => assert.equal(dados.tribunal, 'TRT2'))
  confere(() => assert.equal(dados.vara, '11ª Vara do Trabalho de São Paulo'))
  confere(() => assert.equal(dados.comarca, 'São Paulo/SP'))
  confere(() => assert.match(chamadas[0] ?? '', /api_publica_trt2\/_search$/))

  const idas = chamadas.length
  await consultarProcesso('10008903820225020011', { chave: 'chave-de-teste', buscar })
  confere(() => assert.equal(chamadas.length, idas))
}

limparCaches()
{
  const { buscar, chamadas } = rede(() => ({ status: 200, corpo: RESPOSTA_DATAJUD }))
  const erro = await erroDe(() =>
    consultarProcesso('10008903920225020011', { chave: 'x', buscar }),
  )
  confere(() => assert.equal(erro.status, 422))
  confere(() => assert.match(erro.message, /dígito verificador/))
  confere(() => assert.equal(chamadas.length, 0))
}

limparCaches()
{
  const { buscar, chamadas } = rede(() => ({ status: 200, corpo: RESPOSTA_DATAJUD }))
  const erro = await erroDe(() =>
    consultarProcesso('10008902020228260011', { chave: 'x', buscar }),
  )
  confere(() => assert.equal(erro.status, 422))
  confere(() => assert.match(erro.message, /Justiça do Trabalho/))
  confere(() => assert.equal(chamadas.length, 0))
}

limparCaches()
{
  const { buscar } = rede(() => ({ status: 401, corpo: { message: 'unauthorized' } }))
  const erro = await erroDe(() =>
    consultarProcesso('10008903820225020011', { chave: 'antiga', buscar }),
  )
  confere(() => assert.equal(erro.status, 502))
  confere(() => assert.match(erro.message, /DATAJUD_API_KEY/))
}

limparCaches()
{
  const { buscar } = rede((url) =>
    url.includes('ibge') ? { status: 200, corpo: IBGE_SAO_PAULO } : { status: 200, corpo: { hits: { hits: [] } } },
  )
  const erro = await erroDe(() =>
    consultarProcesso('10008903820225020011', { chave: 'x', buscar }),
  )
  confere(() => assert.equal(erro.status, 404))
  confere(() => assert.match(erro.message, /segredo de justiça/))
}

limparCaches()
{
  const { buscar } = rede(() => ({ status: 429 }))
  const erro = await erroDe(() =>
    consultarProcesso('10008903820225020011', { chave: 'x', buscar }),
  )
  confere(() => assert.equal(erro.status, 503))
}

limparCaches()
{
  const buscar = (async () => {
    throw Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
  }) as typeof fetch
  const erro = await erroDe(() =>
    consultarProcesso('10008903820225020011', { chave: 'x', buscar }),
  )
  confere(() => assert.equal(erro.status, 504))
  confere(() => assert.match(erro.message, /à mão/))
}

// ---------------- Cache ----------------

{
  let instante = 0
  const cache = criarCache<string>(1_000, 2, () => instante)
  cache.gravar('a', 'primeiro')
  confere(() => assert.equal(cache.ler('a'), 'primeiro'))

  instante = 1_001
  confere(() => assert.equal(cache.ler('a'), undefined))

  instante = 0
  cache.gravar('a', '1')
  cache.gravar('b', '2')
  cache.gravar('c', '3')
  confere(() => assert.equal(cache.ler('a'), undefined))
  confere(() => assert.equal(cache.ler('c'), '3'))
}

confere(() =>
  assert.equal(new FonteIndisponivel('A fonte', 'sem resposta em 12s').message, 'A fonte não respondeu (sem resposta em 12s).'),
)

limparCaches()
console.log(`${verificacoes} verificações · 0 falhas`)
