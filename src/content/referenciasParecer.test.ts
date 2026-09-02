import { describe, expect, it } from 'vitest'

import { REFERENCIAS_PARECER } from './referenciasParecer'

describe('referências da biblioteca do parecer', () => {
  it('oferece o item 10.1.1 para todos os agentes físicos, sem restringir a ruído', () => {
    const item = REFERENCIAS_PARECER.find((referencia) => referencia.numero === '10.1.1')

    expect(item?.titulo).toBe('Agentes Físicos')
    expect(item?.titulo).not.toMatch(/ruído/i)
  })
})
