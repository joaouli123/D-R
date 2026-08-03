// ============================================================
// Smoke test do contrato HTTP — roda sem banco.
//
//   npm run smoke:api
//
// Exercita roteamento, CORS, exigência de sessão e o middleware
// de erro. Todas as respostas verificadas acontecem antes de
// qualquer consulta ao PostgreSQL.
// ============================================================
import type { Server } from 'node:http'
import { criarApp } from '../src/app.js'

interface Caso {
  nome: string
  caminho: string
  metodo?: string
  corpo?: unknown
  origem?: string
  statusEsperado: number
  /** Trecho que a mensagem de erro precisa conter. */
  contem?: string
}

const CASOS: Caso[] = [
  { nome: 'healthcheck', caminho: '/saude', statusEsperado: 200 },

  // Sem cookie de sessão, tudo que é protegido responde 401 —
  // e nenhuma dessas chamadas chega ao banco.
  { nome: 'perícias exigem sessão', caminho: '/pericias', statusEsperado: 401, contem: 'login' },
  { nome: 'empresas exigem sessão', caminho: '/empresas', statusEsperado: 401 },
  { nome: 'documentos exigem sessão', caminho: '/documentos', statusEsperado: 401 },
  { nome: 'quesitos exigem sessão', caminho: '/quesitos', statusEsperado: 401 },
  { nome: 'textos exigem sessão', caminho: '/textos', statusEsperado: 401 },
  { nome: 'agenda exige sessão', caminho: '/agenda', statusEsperado: 401 },
  { nome: 'modelos exigem sessão', caminho: '/modelos', statusEsperado: 401 },
  { nome: 'usuários exigem sessão', caminho: '/usuarios', statusEsperado: 401 },
  { nome: 'quem sou eu sem sessão', caminho: '/auth/eu', statusEsperado: 401 },
  {
    nome: 'upload de fotos exige sessão',
    caminho: '/pericias/abc/fotos',
    metodo: 'POST',
    statusEsperado: 401,
  },

  // Validação acontece antes de tocar o banco.
  {
    nome: 'login sem corpo é rejeitado',
    caminho: '/auth/login',
    metodo: 'POST',
    corpo: {},
    statusEsperado: 422,
    contem: 'inválidos',
  },
  {
    nome: 'login com e-mail malformado',
    caminho: '/auth/login',
    metodo: 'POST',
    corpo: { email: 'nao-e-email', senha: '12345678' },
    statusEsperado: 422,
  },

  { nome: 'rota inexistente', caminho: '/nao-existe', statusEsperado: 404, contem: 'não encontrada' },

  // Logout é idempotente: limpa o cookie mesmo sem sessão.
  { nome: 'logout sem sessão', caminho: '/auth/logout', metodo: 'POST', statusEsperado: 204 },

  {
    nome: 'origem não autorizada é barrada',
    caminho: '/saude',
    origem: 'https://site-invasor.example',
    statusEsperado: 403,
  },
]

const servidor: Server = criarApp().listen(0)
await new Promise<void>((r) => servidor.once('listening', () => r()))

const porta = (servidor.address() as { port: number }).port
const base = `http://127.0.0.1:${porta}`

let falhas = 0

for (const caso of CASOS) {
  const res = await fetch(`${base}${caso.caminho}`, {
    method: caso.metodo ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(caso.origem ? { Origin: caso.origem } : {}),
    },
    body: caso.corpo ? JSON.stringify(caso.corpo) : undefined,
  })

  const texto = await res.text()
  const okStatus = res.status === caso.statusEsperado
  const okTexto = !caso.contem || texto.toLowerCase().includes(caso.contem.toLowerCase())
  const ok = okStatus && okTexto

  if (!ok) falhas++

  const detalhe = okStatus
    ? okTexto
      ? ''
      : `  ← esperava conter "${caso.contem}", veio: ${texto.slice(0, 90)}`
    : `  ← esperava ${caso.statusEsperado}, veio ${res.status}`

  console.log(`${ok ? '✓' : '✗'} ${caso.nome.padEnd(34)} ${res.status}${detalhe}`)
}

// O cookie de sessão precisa ser httpOnly — é o que impede uma
// sessão forjada pelo devtools, como acontecia na fase mock.
const resLogout = await fetch(`${base}/auth/logout`, { method: 'POST' })
const cookie = resLogout.headers.get('set-cookie') ?? ''
const httpOnly = cookie.toLowerCase().includes('httponly')
if (!httpOnly) falhas++
console.log(`${httpOnly ? '✓' : '✗'} cookie de sessão é httpOnly`)

servidor.close()

console.log(`\n${CASOS.length + 1} verificações · ${falhas} ${falhas === 1 ? 'falha' : 'falhas'}\n`)
process.exit(falhas ? 1 : 0)
