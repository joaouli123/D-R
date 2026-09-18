import { describe, expect, it } from 'vitest'

import { formatDateTime } from './utils'

describe('formatDateTime', () => {
  it('converte instante UTC para o fuso oficial de Sao Paulo', () => {
    expect(formatDateTime('2026-09-18T17:49:00.000Z')).toBe('18/09/2026 às 14:49')
  })
})
