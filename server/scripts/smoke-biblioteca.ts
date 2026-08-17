import assert from 'node:assert/strict'
import type { TextoBiblioteca } from '@prisma/client'
import { normalizarTiposDocumento, tiposDocumentoSchema } from '../src/biblioteca.js'
import { textoParaApi } from '../src/mappers.js'
import { textoBibliotecaCorpoSchema } from '../src/routes/textos.js'

const legado = tiposDocumentoSchema.parse(undefined)
assert.deepEqual(legado, [])

const varios = tiposDocumentoSchema.parse(['parecer', 'laudo'])
assert.deepEqual(varios, ['parecer', 'laudo'])

assert.deepEqual(
  normalizarTiposDocumento(['parecer', 'parecer', 'quesitos']),
  ['parecer', 'quesitos'],
)

assert.equal(tiposDocumentoSchema.safeParse(['contrato']).success, false)
assert.equal(
  tiposDocumentoSchema.safeParse([
    'parecer',
    'laudo',
    'quesitos',
    'manifestacao',
    'impugnacao',
    'esclarecimento',
    'parecer',
  ]).success,
  false,
)

const payloadLegado = textoBibliotecaCorpoSchema.parse({
  titulo: 'Trecho legado',
  conteudo: 'Conteúdo técnico',
})
assert.deepEqual(payloadLegado.tiposDocumento, [])
assert.equal(
  textoBibliotecaCorpoSchema.safeParse({
    titulo: 'Inválido',
    conteudo: 'Conteúdo técnico',
    tiposDocumento: ['contrato'],
  }).success,
  false,
)

const persistido: TextoBiblioteca = {
  id: 'texto-1',
  usuarioId: 'usuario-1',
  titulo: 'Parecer e laudo',
  secao: 'analise',
  tiposDocumento: ['parecer', 'laudo'],
  tags: [],
  conteudo: 'Conteúdo técnico',
  favorito: false,
  usos: 0,
  criadoEm: new Date('2026-08-17T00:00:00Z'),
  atualizadoEm: new Date('2026-08-17T00:00:00Z'),
}
assert.deepEqual(textoParaApi(persistido).tiposDocumento, ['parecer', 'laudo'])

console.log('8 verificações · 0 falhas')
