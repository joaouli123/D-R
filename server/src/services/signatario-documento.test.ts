import { describe, expect, it } from 'vitest'

import { idDoSignatario } from './signatario-documento.js'

describe('idDoSignatario', () => {
  it('usa o responsável atual quando o documento está vinculado a uma perícia', () => {
    expect(idDoSignatario(
      { criadoPorId: 'usuario-criador' },
      { responsavelId: 'usuario-responsavel' },
    )).toBe('usuario-responsavel')
  })

  it('usa o criador quando o documento não está vinculado a uma perícia', () => {
    expect(idDoSignatario({ criadoPorId: 'usuario-criador' }, null)).toBe('usuario-criador')
  })
})
