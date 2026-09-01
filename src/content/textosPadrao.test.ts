import { describe, expect, it } from 'vitest'

import { CAMPOS_COM_TEXTO_PADRAO, patchDeTextosPadrao, textosPadraoDaPericia } from './textosPadrao'
import type { Empresa, ModalidadePericia, Pericia, Usuario } from '@/types'

const PERITO: Usuario = {
  id: 'usr-1',
  nome: 'Dinoel Ribeiro',
  email: 'dinoel@drpericiaelite.com.br',
  perfil: 'perito',
  registroProfissional: 'CREA-SP 5063000000',
  titulo: 'Engenheiro de Segurança do Trabalho',
  ativo: true,
}

const RECLAMADA: Empresa = {
  id: 'emp-1',
  razaoSocial: 'Cyklop do Brasil Ltda.',
  cnpj: '00.000.000/0001-00',
  endereco: 'Rua das Indústrias, 100',
  cidade: 'São Paulo',
  uf: 'SP',
  criadoEm: '2026-08-01',
}

function pericia(modalidade: ModalidadePericia = 'insalubridade'): Pericia {
  return {
    id: 'per-1',
    numeroProcesso: '0010001-11.2025.5.02.0001',
    vara: '1ª Vara do Trabalho',
    comarca: 'São Paulo',
    reclamante: 'Jhonathan da Silva',
    reclamadas: [],
    participantes: [],
    modalidade,
    status: 'rascunho',
    responsavelId: 'usr-1',
    criadoEm: '2026-08-01',
    atualizadoEm: '2026-08-01',
    tecnico: {
      apresentacao: '',
      enderecamento: '',
      objetivoPericia: '',
      descricaoEmpresa: '',
      descricaoAmbiente: '',
      descricaoPostoTrabalho: '',
      maquinasFerramentas: '',
      produtosUtilizados: '',
      atividadesFuncoes: '',
      periodos: [],
      agentes: [],
      normasReferencias: '',
      equipamentosAnalisados: '',
      informacoesLevantadas: '',
      divergenciasFaticas: '',
      protecoesColetivas: '',
      analiseTecnica: '',
      conclusao: '',
      conclusaoInsalubridade: '',
      conclusaoPericulosidade: '',
      respostasQuesitos: '',
      encerramento: '',
      observacoesAdicionais: '',
    },
    fotos: [],
  }
}

describe('textosPadraoDaPericia', () => {
  it('qualifica o assistente técnico conforme o modelo aprovado', () => {
    const { apresentacao } = textosPadraoDaPericia(pericia(), PERITO, RECLAMADA)

    expect(apresentacao).toContain('Dinoel Ribeiro, Engenheiro de Segurança do Trabalho, CREA-SP 5063000000')
    expect(apresentacao).toContain('qualificado nos autos como Assistente Técnico da Reclamada')
    expect(apresentacao).not.toContain('qualificado(a)')
    expect(apresentacao).not.toContain('Técnico(a)')
    expect(apresentacao).toContain('apresentar o presente PARECER TÉCNICO')
    expect(apresentacao).not.toContain('perito(a) do Juízo')
  })

  it('não imprime lacuna nem "undefined" numa perícia recém-criada', () => {
    const vazia = { ...pericia(), numeroProcesso: '', reclamante: '' }
    const textos = textosPadraoDaPericia(vazia, null, undefined)

    for (const campo of CAMPOS_COM_TEXTO_PADRAO) {
      expect(textos[campo]).not.toMatch(/undefined|null|___|\[\s*\]/)
      expect(textos[campo].trim().length).toBeGreaterThan(0)
    }
    expect(textos.apresentacao).toContain('O profissional responsável')
  })

  it('o objeto e as normas seguem a modalidade escolhida', () => {
    const so15 = textosPadraoDaPericia(pericia('insalubridade'), PERITO)
    expect(so15.objetivoPericia).toContain('NR-15')
    expect(so15.objetivoPericia).not.toContain('NR-16')
    expect(so15.objetivoPericia).not.toContain('direito ao adicional')
    expect(so15.normasReferencias).not.toContain('NR-16')

    const so16 = textosPadraoDaPericia(pericia('periculosidade'), PERITO)
    expect(so16.objetivoPericia).toContain('NR-16')
    expect(so16.objetivoPericia).not.toContain('NR-15')
    expect(so16.objetivoPericia).not.toContain('direito ao adicional')
    expect(so16.normasReferencias).not.toContain('NR-15')

    const ambas = textosPadraoDaPericia(pericia('ambas'), PERITO)
    expect(ambas.objetivoPericia).toContain('NR-15')
    expect(ambas.objetivoPericia).toContain('NR-16')
    expect(ambas.normasReferencias).toContain('NR-15')
    expect(ambas.normasReferencias).toContain('NR-16')
  })

  it('a metodologia só invoca o item 15.4.1 quando há insalubridade em jogo', () => {
    expect(textosPadraoDaPericia(pericia('insalubridade'), PERITO).equipamentosAnalisados).toContain('15.4.1')
    expect(textosPadraoDaPericia(pericia('periculosidade'), PERITO).equipamentosAnalisados).not.toContain('15.4.1')
  })

  it('usa a metodologia de EPI aprovada sem criar presunção por falta documental', () => {
    const { equipamentosAnalisados } = textosPadraoDaPericia(pericia(), PERITO)

    expect(equipamentosAnalisados).toContain('NRRsf')
    expect(equipamentosAnalisados).toContain('características de proteção e correspondência com o agente de risco')
    expect(equipamentosAnalisados).toContain('sem que, isoladamente, seja estabelecida presunção')
    expect(equipamentosAnalisados).toContain('item 15.4.1 da NR-15 e do artigo 191 da CLT')
    expect(equipamentosAnalisados).not.toContain('A validade e a adequação serão conferidas na base oficial')
  })

  it('incorpora os complementos técnicos aprovados na planilha de 26/08', () => {
    const textos = textosPadraoDaPericia(pericia('ambas'), PERITO)

    expect(textos.normasReferencias).toContain('Frequência: quantidade de ocorrências')
    expect(textos.normasReferencias).toContain('Habitualidade: integração da atividade à rotina laboral')
    expect(textos.normasReferencias).toContain('Anexo 5 da NR-15')
    expect(textos.normasReferencias).toContain('não caracteriza, isoladamente, a periculosidade')
    expect(textos.normasReferencias).toContain('diesel S10 ou S500')
    expect(textos.normasReferencias).not.toContain('Gera Direito à Periculosidade')
    expect(textos.criterioAvaliacaoPericulosidade).toContain('atividades e operações efetivamente desenvolvidas')
    expect(textos.criterioAvaliacaoPericulosidade).not.toContain('mediante avaliação qualitativa')
    expect(textos.notaTecnicaEpis).not.toContain('Primazia da Realidade')
    expect(textos.notaTecnicaEpis).toContain('nos termos do art. 369 do CPC')
    expect(textos.notaTecnicaEpis).toContain('identificação e o reconhecimento, pelo próprio Reclamante')
    expect(textos.notaTecnicaEpis).not.toContain('não substituem automaticamente a ficha de entrega')
    expect(textos.protecoesColetivas).toContain('Sistemas de Ventilação e Exaustão')
    expect(textos.encerramento).not.toContain('No melhor conhecimento e crédito')
    expect(textos.encerramento).toContain('Código de Ética Profissional do Sistema Confea/Crea')
    expect(textos.encerramento).not.toContain('Código de Ética Profissional do Conselho Federal')
  })
})

describe('patchDeTextosPadrao', () => {
  const padroes = textosPadraoDaPericia(pericia(), PERITO, RECLAMADA)

  it('preenche o que está vazio', () => {
    const patch = patchDeTextosPadrao(pericia().tecnico, padroes, {})

    expect(Object.keys(patch).sort()).toEqual([...CAMPOS_COM_TEXTO_PADRAO].sort())
  })

  it('não encosta no que o perito escreveu', () => {
    const tecnico = { ...pericia().tecnico, apresentacao: 'Texto que eu mesmo redigi.' }

    expect(patchDeTextosPadrao(tecnico, padroes, {})).not.toHaveProperty('apresentacao')
  })

  it('atualiza o campo que ainda tem o padrão que nós colocamos', () => {
    // Trocar a modalidade tem de reescrever o objeto — mas só porque
    // ninguém tinha mexido nele.
    const anteriores = textosPadraoDaPericia(pericia('insalubridade'), PERITO, RECLAMADA)
    const tecnico = { ...pericia().tecnico, objetivoPericia: anteriores.objetivoPericia }
    const novos = textosPadraoDaPericia(pericia('periculosidade'), PERITO, RECLAMADA)

    expect(patchDeTextosPadrao(tecnico, novos, anteriores).objetivoPericia).toBe(novos.objetivoPericia)
  })

  it('migra o texto normativo da versão anterior sem confundi-lo com texto do perito', () => {
    const tecnico = {
      ...pericia().tecnico,
      normasReferencias:
        'A análise da exposição deverá considerar, quando pertinentes ao agente avaliado: frequência, duração, periodicidade, habitualidade e permanência.',
    }

    const patch = patchDeTextosPadrao(tecnico, padroes, {})

    expect(patch.normasReferencias).toBe(padroes.normasReferencias)
  })

  it('migra a apresentação automática que ainda usa flexões entre parênteses', () => {
    const tecnico = {
      ...pericia().tecnico,
      apresentacao:
        'Dinoel Ribeiro, Engenheiro de Segurança do Trabalho, CREA-SP 5063000000, qualificado(a) nos autos como Assistente Técnico(a) da Reclamada, vem, respeitosamente, apresentar o presente PARECER TÉCNICO, elaborado com base na diligência realizada, nas condições efetivamente constatadas e na documentação analisada, à luz das Normas Regulamentadoras aplicáveis, apresentando suas conclusões técnicas de forma objetiva e fundamentada.',
    }

    const patch = patchDeTextosPadrao(tecnico, padroes, {})

    expect(patch.apresentacao).toBe(padroes.apresentacao)
  })

  it('migra os textos automáticos anteriores à revisão técnica sem apagar texto personalizado', () => {
    const tecnico = {
      ...pericia('ambas').tecnico,
      objetivoPericia:
        'Apurar o direito ao adicional de insalubridade, nos termos da NR-15, e, se devido, seu respectivo grau: mínimo, médio ou máximo.\n\nApurar o direito ao adicional de periculosidade, nos termos da NR-16, e o respectivo percentual aplicável.',
      normasReferencias:
        'Texto automático.\n\nLíquidos Inflamáveis (Gera Direito à Periculosidade): são os líquidos com ponto de fulgor menor ou igual a 60 ºC.',
      equipamentosAnalisados:
        'Texto automático. Para a proteção auditiva, a conclusão considerará o de maior atenuação.',
      criterioAvaliacaoPericulosidade:
        'A caracterização da periculosidade é realizada mediante avaliação qualitativa, considerando as atividades efetivamente desenvolvidas.',
      notaTecnicaEpis:
        'Do ponto de vista técnico, a identificação dos próprios EPIs do Reclamante, por ele reconhecidos na presença de todos, constitui elemento objetivo.',
      encerramento:
        '3 - No melhor conhecimento e crédito, as vistorias, análises e conclusões expressas no presente trabalho são baseadas em dados verdadeiros.',
      protecoesColetivas: 'Texto personalizado pelo perito.',
    }
    const novosPadroes = textosPadraoDaPericia(pericia('ambas'), PERITO, RECLAMADA)

    const patch = patchDeTextosPadrao(tecnico, novosPadroes, {})

    expect(patch.objetivoPericia).toBe(novosPadroes.objetivoPericia)
    expect(patch.normasReferencias).toBe(novosPadroes.normasReferencias)
    expect(patch.equipamentosAnalisados).toBe(novosPadroes.equipamentosAnalisados)
    expect(patch.criterioAvaliacaoPericulosidade).toBe(novosPadroes.criterioAvaliacaoPericulosidade)
    expect(patch.notaTecnicaEpis).toBe(novosPadroes.notaTecnicaEpis)
    expect(patch.encerramento).toBe(novosPadroes.encerramento)
    expect(patch).not.toHaveProperty('protecoesColetivas')
  })

  it('migra a metodologia e a nota técnica que estavam em produção antes do feedback noturno', () => {
    const tecnico = {
      ...pericia().tecnico,
      equipamentosAnalisados:
        '5.2.3. Equipamentos de Proteção Individual – EPI\n\nOs registros de fornecimento de EPI serão analisados em conjunto com os demais elementos disponíveis, considerando-se o equipamento fornecido, respectivo CA, adequação ao agente, período de utilização, treinamentos e demais evidências pertinentes.',
      notaTecnicaEpis:
        'Nota Técnica sobre a Primazia da Realidade\n\nQuanto aos EPIs, os registros de entrega, o Certificado de Aprovação, a adequação ao agente, os treinamentos, a periodicidade de substituição, o uso efetivo e as demais evidências disponíveis devem ser analisados conjuntamente. PGR, laudos ocupacionais, entrevistas ou outros documentos não substituem automaticamente a ficha de entrega.',
    }

    const patch = patchDeTextosPadrao(tecnico, padroes, {})

    expect(patch.equipamentosAnalisados).toBe(padroes.equipamentosAnalisados)
    expect(patch.notaTecnicaEpis).toBe(padroes.notaTecnicaEpis)
  })

  it('não repete o patch quando já está tudo em dia', () => {
    const tecnico = { ...pericia().tecnico, ...padroes }

    expect(patchDeTextosPadrao(tecnico, padroes, padroes)).toEqual({})
  })
})

describe('fidelidade à matriz canônica do Parecer Jhonathan Victor', () => {
  it('mantém os objetivos revisados exatamente como aprovados', () => {
    const textos = textosPadraoDaPericia(pericia('ambas'), PERITO)

    expect(textos.objetivoPericia).toBe(
      'Avaliar, sob o ponto de vista técnico, a caracterização ou não de insalubridade, nos termos da NR-15, e, quando caracterizada, indicar o respectivo grau: mínimo, médio ou máximo.\n\nAvaliar, sob o ponto de vista técnico, a caracterização ou não de periculosidade, nos termos da NR-16, e, quando caracterizada, indicar o respectivo percentual.',
    )
  })

  it('não reintroduz trechos removidos na revisão do cliente', () => {
    const textos = textosPadraoDaPericia(pericia('ambas'), PERITO)

    expect(textos.notaTecnicaEpis).toMatch(/^Quanto aos EPIs,/)
    expect(textos.notaTecnicaEpis).not.toContain('Nota Técnica sobre a Primazia da Realidade')
    expect(textos.equipamentosAnalisados).toContain('PPP; PGR; laudos ambientais;')
    expect(textos.equipamentosAnalisados).not.toContain('LTCAT')
    expect(textos.normasReferencias).toContain('Anexo 1 – Explosivos;')
    expect(textos.normasReferencias).toContain('Anexo (*) – Radiações ionizantes ou substâncias radioativas.')
    expect(textos.normasReferencias).not.toContain('Anexo VII')
  })

  it('usa o encerramento de três parágrafos do parecer aprovado', () => {
    const textos = textosPadraoDaPericia(pericia('ambas'), PERITO)

    expect(textos.encerramento.split('\n\n')).toEqual([
      'As considerações e conclusões apresentadas neste parecer são fundamentadas nos elementos técnicos, documentais e fáticos pertinentes ao objeto da perícia, considerados à luz da legislação aplicável, das Normas Regulamentadoras e das normas técnicas pertinentes.',
      'O presente parecer técnico foi elaborado por este Assistente Técnico com fundamento nos elementos disponíveis para análise e em observância ao Código de Ética Profissional do Sistema Confea/Crea, à legislação trabalhista, às Normas Regulamentadoras e às normas técnicas aplicáveis.',
      'Diante do exposto, o signatário coloca-se à disposição dos envolvidos para os esclarecimentos técnicos que se fizerem necessários.',
    ])
  })
})
