import assert from 'node:assert/strict'
import express from 'express'

process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@127.0.0.1:5432/smoke'
process.env.JWT_SECRET ??= 'smoke-test-secret-with-at-least-32-characters'

const {
  LINHAS_EPI_RECEBIDAS,
  configuracoesUnicas,
  separarCas,
  sugerirEpis,
} = await import('../src/catalogo-epis.js')
const { criarEpisRouter } = await import('../src/routes/epis.js')
type EpiCatalogoComAplicacoes = import('../src/catalogo-epis.js').EpiCatalogoComAplicacoes

assert.equal(LINHAS_EPI_RECEBIDAS.length, 61)
assert.equal(configuracoesUnicas(LINHAS_EPI_RECEBIDAS).length, 34)
assert.deepEqual(
  separarCas('4115 / 5635'),
  { caPecaFacial: '4115', caFiltroCartucho: '5635', caUnico: null },
)
assert.deepEqual(
  separarCas('5657'),
  { caPecaFacial: null, caFiltroCartucho: null, caUnico: '5657' },
)

const itens: EpiCatalogoComAplicacoes[] = [
  {
    id: 'multigases',
    chave: '3m|multigases|4115|5640',
    marca: '3M',
    modelo: '3M 6200 + Cartucho 3M 60926',
    caUnico: null,
    caPecaFacial: '4115',
    caFiltroCartucho: '5640',
    observacao: null,
    ativo: true,
    aplicacoes: [{ anexo: 'Anexo 11', categoria: 'Multigases' }],
  },
  {
    id: 'organico',
    chave: '3m|organico|4115|5635',
    marca: '3M',
    modelo: '3M 6200 + Cartucho 3M 6001',
    caUnico: null,
    caPecaFacial: '4115',
    caFiltroCartucho: '5635',
    observacao: null,
    ativo: true,
    aplicacoes: [{ anexo: 'Anexo 11', categoria: 'Vapores Orgânicos' }],
  },
  {
    id: 'inativo',
    chave: 'inativo',
    marca: '3M',
    modelo: 'Inativo',
    caUnico: '0000',
    caPecaFacial: null,
    caFiltroCartucho: null,
    observacao: null,
    ativo: false,
    aplicacoes: [{ anexo: 'Anexo 11', categoria: 'Vapores Orgânicos' }],
  },
]

assert.deepEqual(
  sugerirEpis('Vapores Orgânicos', 'Anexo 11', itens).map((item) => item.id),
  ['organico', 'multigases'],
)

const consultas: unknown[] = []
const app = express()
app.use(
  '/epis',
  criarEpisRouter(async (consulta) => {
    consultas.push(consulta)
    return [itens[1]]
  }),
)
const servidor = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
  const instancia = app.listen(0, () => resolve(instancia))
})
try {
  const endereco = servidor.address()
  assert.ok(endereco && typeof endereco !== 'string')
  const resposta = await fetch(
    `http://127.0.0.1:${endereco.port}/epis?q=cartucho&categoria=Vapores%20Org%C3%A2nicos&anexo=Anexo%2011`,
  )
  assert.equal(resposta.status, 200)
  assert.deepEqual(await resposta.json(), [itens[1]])

  const consulta = consultas[0] as { where: { ativo: boolean; OR: unknown[] }; include: { aplicacoes: { where: unknown } } }
  assert.equal(consulta.where.ativo, true)
  assert.equal(consulta.where.OR.length, 6)
  assert.deepEqual(consulta.include.aplicacoes.where, {
    anexo: 'Anexo 11',
    categoria: 'Vapores Orgânicos',
  })
} finally {
  await new Promise<void>((resolve, reject) => servidor.close((erro) => (erro ? reject(erro) : resolve())))
}

console.log('✓ 61 linhas consolidadas em 34 configurações únicas')
console.log('✓ CAs simples e compostos separados')
console.log('✓ sugestão prioriza categoria e mantém Multigases como alternativa')
console.log('✓ endpoint aplica filtros ativos e de aplicações sem SQL manual')
