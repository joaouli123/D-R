// Smoke test do contrato de agentes de perícia.
//
//   npm run smoke:pericia
//
// Confere que registros legados continuam válidos, que os novos
// metadados normativos são preservados e que enums inválidos são rejeitados.
process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@127.0.0.1:5432/smoke'
process.env.JWT_SECRET ??= 'smoke-test-secret-with-at-least-32-characters'

const { agenteSchema } = await import('../src/routes/pericias.js')

const agenteLegado = {
  id: 'agn-legado',
  nome: 'Ruído contínuo',
  tipo: 'fisico',
  criterio: 'quantitativo',
}

const agenteCompleto = {
  ...agenteLegado,
  id: 'agn-completo',
  referenciaNormativaId: 'nr15-anexo-1',
  atividadeEnquadrada: 'Operação de prensa',
  unidadeLimite: 'dB(A)',
}

const agenteComEnumInvalido = {
  ...agenteLegado,
  tipo: 'ergonomico',
}

const legado = agenteSchema.safeParse(agenteLegado)
const completo = agenteSchema.safeParse(agenteCompleto)
const enumInvalido = agenteSchema.safeParse(agenteComEnumInvalido)

const resultados = [
  {
    nome: 'registro legado é aceito',
    ok: legado.success,
  },
  {
    nome: 'novos metadados normativos são preservados',
    ok:
      completo.success &&
      completo.data.referenciaNormativaId === 'nr15-anexo-1' &&
      completo.data.atividadeEnquadrada === 'Operação de prensa' &&
      completo.data.unidadeLimite === 'dB(A)',
  },
  {
    nome: 'tipo de agente inválido é rejeitado',
    ok: !enumInvalido.success,
  },
]

for (const resultado of resultados) {
  console.log(`${resultado.ok ? '✓' : '✗'} ${resultado.nome}`)
}

const falhas = resultados.filter((resultado) => !resultado.ok).length
console.log(`\n${resultados.length} verificações · ${falhas} falhas\n`)
process.exitCode = falhas ? 1 : 0
