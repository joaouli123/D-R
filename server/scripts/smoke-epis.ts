import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import cookieParser from 'cookie-parser'
import express from 'express'
import jwt from 'jsonwebtoken'

process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@127.0.0.1:5432/smoke'
process.env.JWT_SECRET ??= 'smoke-test-secret-with-at-least-32-characters'

const {
  LINHAS_EPI_RECEBIDAS,
  configuracoesUnicas,
  separarCas,
  sugerirEpis,
} = await import('../src/catalogo-epis.js')
const { criarEpisRouter } = await import('../src/routes/epis.js')
const { tratarErros } = await import('../src/erros.js')
type EpiCatalogoComAplicacoes = import('../src/catalogo-epis.js').EpiCatalogoComAplicacoes

const migracao = (await readFile(
  new URL('../prisma/migrations/20260814_catalogo_epi/migration.sql', import.meta.url),
  'utf8',
)).trim()
assert.ok(migracao.startsWith('BEGIN;'))
assert.ok(migracao.endsWith('COMMIT;'))

assert.equal(LINHAS_EPI_RECEBIDAS.length, 61)
const catalogoRecebido = configuracoesUnicas(LINHAS_EPI_RECEBIDAS)
assert.equal(catalogoRecebido.length, 34)

const aplicacoesRecebidas = catalogoRecebido.flatMap((item) => item.aplicacoes)
assert.equal(aplicacoesRecebidas.length, 57)
assert.deepEqual(
  Object.fromEntries(
    ['Anexo 11', 'Anexo 12', 'Anexo 13'].map((anexo) => [
      anexo,
      aplicacoesRecebidas.filter((aplicacao) => aplicacao.anexo === anexo).length,
    ]),
  ),
  { 'Anexo 11': 20, 'Anexo 12': 19, 'Anexo 13': 18 },
)

const primeiraLinha = LINHAS_EPI_RECEBIDAS[0]
assert.ok(primeiraLinha)
assert.equal(
  configuracoesUnicas([
    primeiraLinha,
    {
      ...primeiraLinha,
      marca: `  ${primeiraLinha.marca}  `,
      modelo: `  ${primeiraLinha.modelo}  `,
      ca: `  ${primeiraLinha.ca}  `,
    },
  ]).length,
  1,
)
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
app.use(cookieParser())
app.use(
  '/epis',
  criarEpisRouter(async (consulta) => {
    consultas.push(consulta)
    return [itens[1]]
  }),
)
app.use(tratarErros)
const servidor = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
  const instancia = app.listen(0, () => resolve(instancia))
})
try {
  const endereco = servidor.address()
  assert.ok(endereco && typeof endereco !== 'string')
  const url = `http://127.0.0.1:${endereco.port}/epis?q=cartucho&categoria=Vapores%20Org%C3%A2nicos&anexo=Anexo%2011`
  const respostaSemSessao = await fetch(url)
  assert.equal(respostaSemSessao.status, 401)
  assert.equal(consultas.length, 0)

  const token = jwt.sign(
    { id: 'smoke-user', email: 'smoke@example.test', perfil: 'admin' },
    process.env.JWT_SECRET,
  )
  const resposta = await fetch(url, {
    headers: { cookie: `dr_sessao=${token}` },
  })
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
console.log('✓ 57 vínculos independentes distribuídos entre os Anexos 11, 12 e 13')
console.log('✓ CAs simples e compostos separados')
console.log('✓ sugestão prioriza categoria e mantém Multigases como alternativa')
console.log('✓ endpoint aplica filtros ativos e de aplicações sem SQL manual')
