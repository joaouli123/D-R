import { describe, expect, it } from 'vitest'
import { dadosPapel, PAPEIS } from './participantes'

describe('qualificação e atuação dos participantes', () => {
  it('oferece os 15 papéis aprovados', () => {
    expect(PAPEIS).toHaveLength(15)
  })

  it('inclui representantes de SST e liderança da empresa', () => {
    expect(dadosPapel('engenheiro_sst_empresa').atuacao).toContain('Departamento de SST')
    expect(dadosPapel('tecnico_sst_empresa').atuacao).toContain('Departamento de SST')
    expect(dadosPapel('gestor_lideranca').atuacao).toContain('atividades habituais')
  })

  it('diferencia a atuação dos assistentes da reclamante e da reclamada', () => {
    expect(dadosPapel('engenheiro_assistente_reclamante').atuacao).toContain('Reclamante')
    expect(dadosPapel('engenheiro_assistente_reclamada').atuacao).toContain('Reclamada')
  })

  it('mantém os papéis legados legíveis', () => {
    expect(dadosPapel('assistente_reclamante').label).toBe('Assistente Técnico do Reclamante')
    expect(dadosPapel('acompanhante').atuacao).toBe('Prestação de informações complementares')
  })
})
