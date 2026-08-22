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
  it('qualifica o perito e nomeia as partes na apresentação', () => {
    const { apresentacao } = textosPadraoDaPericia(pericia(), PERITO, RECLAMADA)

    expect(apresentacao).toContain('Dinoel Ribeiro, Engenheiro de Segurança do Trabalho, CREA-SP 5063000000')
    expect(apresentacao).toContain('processo nº 0010001-11.2025.5.02.0001')
    expect(apresentacao).toContain('movido por Jhonathan da Silva em face de Cyklop do Brasil Ltda.')
  })

  it('não imprime lacuna nem "undefined" numa perícia recém-criada', () => {
    const vazia = { ...pericia(), numeroProcesso: '', reclamante: '' }
    const textos = textosPadraoDaPericia(vazia, null, undefined)

    for (const campo of CAMPOS_COM_TEXTO_PADRAO) {
      expect(textos[campo]).not.toMatch(/undefined|null|___|\[\s*\]/)
      expect(textos[campo].trim().length).toBeGreaterThan(0)
    }
    expect(textos.apresentacao).toContain('nos autos do processo em epígrafe')
  })

  it('o objeto e as normas seguem a modalidade escolhida', () => {
    const so15 = textosPadraoDaPericia(pericia('insalubridade'), PERITO)
    expect(so15.objetivoPericia).toContain('NR-15')
    expect(so15.objetivoPericia).not.toContain('NR-16')
    expect(so15.normasReferencias).not.toContain('NR-16')

    const so16 = textosPadraoDaPericia(pericia('periculosidade'), PERITO)
    expect(so16.objetivoPericia).toContain('artigo 193 da CLT')
    expect(so16.objetivoPericia).not.toContain('NR-15')
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

  it('a metodologia descreve o NRRsf e o critério do conjunto de protetores', () => {
    const { equipamentosAnalisados } = textosPadraoDaPericia(pericia(), PERITO)

    expect(equipamentosAnalisados).toContain('NRRsf')
    expect(equipamentosAnalisados).toContain('CAEPI')
    expect(equipamentosAnalisados).toContain('o de maior atenuação')
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

  it('não repete o patch quando já está tudo em dia', () => {
    const tecnico = { ...pericia().tecnico, ...padroes }

    expect(patchDeTextosPadrao(tecnico, padroes, padroes)).toEqual({})
  })
})
