import { describe, expect, it } from 'vitest'
import { dadosPapel, grupoDoParticipante, PAPEIS, PAPEIS_POR_GRUPO } from './participantes'

describe('qualificação e atuação dos participantes', () => {
  it('oferece os 18 papéis aprovados', () => {
    expect(PAPEIS).toHaveLength(18)
  })

  it('inclui representantes de SST e liderança da empresa', () => {
    expect(dadosPapel('engenheiro_sst_empresa').atuacao).toContain('Departamento de SST')
    expect(dadosPapel('tecnico_sst_empresa').atuacao).toContain('Departamento de SST')
    expect(dadosPapel('gestor_lideranca').atuacao).toContain('atividades habituais')
  })

  it('oferece ausência neutra na parte reclamante e representantes setoriais nas reclamadas', () => {
    expect(PAPEIS_POR_GRUPO.reclamante).toContainEqual({
      value: 'parte_reclamante_ausente',
      label: 'Parte reclamante ausente',
    })
    for (const grupo of ['reclamada_principal', 'reclamadas_envolvidas'] as const) {
      expect(PAPEIS_POR_GRUPO[grupo]).toEqual(expect.arrayContaining([
        { value: 'representante_setorial', label: 'Representante Setorial' },
        { value: 'recursos_humanos', label: 'Recursos Humanos' },
      ]))
    }
    expect(dadosPapel('representante_setorial').atuacao).toBe(
      'Acompanhamento e esclarecimentos pertinentes ao setor.',
    )
    expect(dadosPapel('recursos_humanos').atuacao).toBe(
      'Acompanhamento e esclarecimentos pertinentes à área administrativa.',
    )
  })

  it('diferencia a atuação dos assistentes da reclamante e da reclamada', () => {
    expect(dadosPapel('engenheiro_assistente_reclamante').atuacao).toContain('Reclamante')
    expect(dadosPapel('engenheiro_assistente_reclamada').atuacao).toContain('Reclamada')
  })

  it('mantém os papéis legados legíveis', () => {
    expect(dadosPapel('assistente_reclamante').label).toBe('Assistente Técnico do Reclamante')
    expect(dadosPapel('acompanhante').label).toBe('Participante Autorizado')
    expect(dadosPapel('acompanhante').atuacao).toBe('Pessoa autorizada pelo juiz para acompanhar na diligência.')
  })

  it('agrupa representantes das reclamadas pela atuação processual', () => {
    expect(
      grupoDoParticipante(
        { id: 'p-1', nome: 'Preposto da segunda empresa', papel: 'preposto', empresaId: 'empresa-2' },
        'empresa-1',
      ),
    ).toBe('reclamadas_envolvidas')

    expect(
      grupoDoParticipante(
        { id: 'p-2', nome: 'Preposto da principal', papel: 'preposto', empresaId: 'empresa-1' },
        'empresa-1',
      ),
    ).toBe('reclamada_principal')
  })

  it('organiza participante legado sem vínculo pela parte que seu papel representa', () => {
    expect(
      grupoDoParticipante(
        { id: 'p-1', nome: 'Advogado do reclamante', papel: 'advogado_reclamante' },
        'empresa-1',
      ),
    ).toBe('reclamante')
    expect(
      grupoDoParticipante(
        { id: 'p-2', nome: 'Preposto legado', papel: 'preposto' },
        'empresa-1',
      ),
    ).toBe('reclamada_principal')
    expect(
      grupoDoParticipante(
        { id: 'p-3', nome: 'Perito judicial', papel: 'perito_judicial' },
        'empresa-1',
      ),
    ).toBe('outros')
  })
})
