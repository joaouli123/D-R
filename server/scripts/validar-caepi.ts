// ============================================================
// Passa a base oficial inteira pelo parser, pelo mapeamento e pelo
// de-para da NR-15, sem tocar no banco.
//
// Serve para três coisas:
//   1. conferir que o CSV do MTE continua no layout esperado antes
//      de rodar uma sincronização de verdade;
//   2. medir quanto da base o de-para de anexos ainda não cobre;
//   3. checar as premissas do modelo de dados — se qualquer uma
//      cair, o script sai com código 1.
//
// Uso:  npm run validar:caepi -- caminho/para/caepi.csv[.gz]
// ============================================================

import { abrirCsvCaepi } from '../src/services/caepi/arquivo.js'
import { lerCaepi } from '../src/services/caepi/csv.js'
import { chaveRegistro, mapearLinha, mesclarRegistros, type RegistroCa } from '../src/services/caepi/mapear.js'
import { validadeNaData } from '../src/services/caepi/normalizar.js'

const caminho = process.argv[2]
if (!caminho) {
  console.error('Uso: npm run validar:caepi -- <caminho.csv|.csv.gz>')
  process.exit(1)
}

const HOJE = new Date().toISOString().slice(0, 10)
const CINCO_ANOS = `${Number(HOJE.slice(0, 4)) - 5}${HOJE.slice(4)}`

function contar(mapa: Map<string, number>, chave: string) {
  mapa.set(chave, (mapa.get(chave) ?? 0) + 1)
}

function tabela(titulo: string, mapa: Map<string, number>, total: number, largura = 45) {
  console.log(`\n--- ${titulo} ---`)
  for (const [chave, valor] of [...mapa].sort((a, b) => b[1] - a[1])) {
    const pct = ((valor / total) * 100).toFixed(1)
    console.log(`  ${chave.padEnd(largura)} ${valor.toLocaleString('pt-BR').padStart(8)}  ${pct.padStart(5)}%`)
  }
}

const falhas: string[] = []
function checar(descricao: string, condicao: boolean, detalhe = '') {
  console.log(`  ${condicao ? '✓' : '✗'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`)
  if (!condicao) falhas.push(descricao)
}

// Aceita .csv e .csv.gz, igual ao sync — é .gz que o portal entrega.
const stream = abrirCsvCaepi(caminho)

const agrupados = new Map<string, RegistroCa>()
const processosPorCa = new Map<string, Set<string>>()

let linhasLidas = 0
let ignoradas = 0
const inicio = Date.now()

for await (const linha of lerCaepi(stream as AsyncIterable<string>)) {
  linhasLidas += 1
  const registro = mapearLinha(linha)
  if (!registro) {
    ignoradas += 1
    continue
  }

  const chave = chaveRegistro(registro)
  const anterior = agrupados.get(chave)
  agrupados.set(chave, anterior ? mesclarRegistros(anterior, registro) : registro)

  if (!processosPorCa.has(registro.numeroCa)) processosPorCa.set(registro.numeroCa, new Set())
  processosPorCa.get(registro.numeroCa)!.add(registro.processo)
}

const segundos = ((Date.now() - inicio) / 1000).toFixed(1)

const porEquipamento = new Map<string, number>()
const porCategoria = new Map<string, number>()
const porSituacao = new Map<string, number>()
const naoClassificados = new Map<string, number>()

let semData = 0
let descontinuados = 0
let vencidosEm5Anos = 0
let protetores = 0
let protetoresValidos = 0
let maxNormas = 0

for (const registro of agrupados.values()) {
  if (!registro.dataValidade) semData += 1
  if (registro.descontinuado) descontinuados += 1
  if (registro.normas.length > maxNormas) maxNormas = registro.normas.length

  contar(porEquipamento, registro.equipamento)
  contar(porCategoria, registro.categoria)
  contar(porSituacao, registro.situacao)
  if (registro.categoria === 'Outros equipamentos') contar(naoClassificados, registro.equipamento)

  if (registro.exigeNrrsf) {
    protetores += 1
    if (validadeNaData(registro, HOJE).valido) protetoresValidos += 1
  }

  if (registro.dataValidade && registro.dataValidade < HOJE && registro.dataValidade >= CINCO_ANOS) {
    vencidosEm5Anos += 1
  }
}

const comHistorico = [...processosPorCa.values()].filter((set) => set.size > 1).length
const somaNaoClassificados = [...naoClassificados.values()].reduce((a, b) => a + b, 0)
const cobertura = ((agrupados.size - somaNaoClassificados) / agrupados.size) * 100

console.log(`\n=== BASE CAEPI — validação (${segundos}s) ===`)
console.log(`linhas no CSV ................ ${linhasLidas.toLocaleString('pt-BR')}`)
console.log(`ignoradas (sem CA/processo) .. ${ignoradas}`)
console.log(`registros (CA, processo) ..... ${agrupados.size.toLocaleString('pt-BR')}`)
console.log(`números de CA distintos ...... ${processosPorCa.size.toLocaleString('pt-BR')}`)
console.log(`CAs com mais de um processo .. ${comHistorico}`)
console.log(`normas por registro (máx) .... ${maxNormas}`)
console.log(`sem data de validade ......... ${semData}`)
console.log(`layout descontinuado ("x - ").. ${descontinuados.toLocaleString('pt-BR')}`)
console.log(`vencidos nos últimos 5 anos .. ${vencidosEm5Anos.toLocaleString('pt-BR')}`)
console.log(`tipos de equipamento ......... ${porEquipamento.size}`)
console.log(`protetores auditivos ......... ${protetores} (${protetoresValidos} válidos em ${HOJE})`)

tabela('SITUAÇÃO', porSituacao, agrupados.size, 14)
tabela('CATEGORIAS NR-15', porCategoria, agrupados.size)

console.log(
  `\n--- SEM ENQUADRAMENTO: ${naoClassificados.size} tipos, ` +
    `${somaNaoClassificados.toLocaleString('pt-BR')} registros — cobertura ${cobertura.toFixed(1)}% ---`,
)
for (const [chave, valor] of [...naoClassificados].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(valor).padStart(7)}  ${chave}`)
}

console.log(`\n--- PREMISSAS DO MODELO ---`)
checar('CSV tem as 19 colunas esperadas', true, 'validado pelo parser ao ler o cabeçalho')
checar('nenhuma linha sem CA ou processo', ignoradas === 0, `${ignoradas} ignoradas`)
checar('toda linha tem data de validade', semData === 0, `${semData} sem data`)
checar('(CA, processo) identifica o registro', agrupados.size >= processosPorCa.size)
checar('há CAs com histórico de homologação', comHistorico > 0, `${comHistorico} CAs`)
checar('de-para cobre 100% da base', somaNaoClassificados === 0, `${cobertura.toFixed(1)}%`)
checar('existem protetores auditivos', protetores > 0, `${protetores}`)
checar('CA 11882 está na base', processosPorCa.has('11882'))
checar('CA 18189 está na base', processosPorCa.has('18189'))

if (falhas.length) {
  console.error(`\n${falhas.length} premissa(s) quebrada(s). A base do MTE mudou — revise o módulo antes de sincronizar.`)
  process.exit(1)
}
console.log('\nTodas as premissas conferem.')
