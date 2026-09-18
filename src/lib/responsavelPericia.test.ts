import { describe, expect, it } from 'vitest'
import type { Pericia, Usuario } from '@/types'
import { responsavelDaPericia } from './responsavelPericia'

const usuario = (id: string): Usuario => ({
  id,
  nome: `Usuário ${id}`,
  email: `${id}@exemplo.com`,
  perfil: 'perito',
  ativo: true,
})

describe('responsavelDaPericia', () => {
  it('seleciona da lista o usuário responsável pela perícia', () => {
    const criador = usuario('criador')
    const responsavel = usuario('responsavel')
    const pericia = { responsavelId: responsavel.id } as Pericia

    expect(responsavelDaPericia(pericia, [criador, responsavel], criador)).toBe(responsavel)
  })

  it('usa o usuário atual quando ele é o responsável e a lista ainda não carregou', () => {
    const responsavel = usuario('responsavel')
    const pericia = { responsavelId: responsavel.id } as Pericia

    expect(responsavelDaPericia(pericia, [], responsavel)).toBe(responsavel)
  })

  it('não assina com outro usuário quando o responsável não foi carregado', () => {
    const criador = usuario('criador')
    const pericia = { responsavelId: 'responsavel' } as Pericia

    expect(responsavelDaPericia(pericia, [], criador)).toBeNull()
  })

  it('trata a lista ainda ausente sem interromper a prévia', () => {
    const criador = usuario('criador')
    const pericia = { responsavelId: 'responsavel' } as Pericia

    expect(responsavelDaPericia(
      pericia,
      undefined,
      criador,
    )).toBeNull()
  })
})
