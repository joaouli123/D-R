import { describe, expect, it } from 'vitest'

import { montarApresentacaoAgente } from './documento-comum'
import { montarApresentacaoAgente as montarNoFront } from '../../../src/lib/apresentacaoAgente'
import type { AgenteAvaliado } from '../../../src/types'

// ============================================================
// A tabela do agente é montada por duas cópias da mesma função: a do front
// desenha a pré-visualização, a da API desenha o PDF e o DOCX. Enquanto elas
// divergirem, o perito revisa uma coisa na tela e assina outra no arquivo.
//
// Este teste é o que impede a divergência nos dois cenários da NR-16:
//   • sem enquadramento — a tabela enxuta, sem a linha do adicional;
//   • com enquadramento — com os pontos de verificação do anexo e com a
//     redação própria vencendo a opção do seletor.
// Mudou de um lado, tem de mudar do outro.
// ============================================================

const CASOS: { nome: string; agente: AgenteAvaliado }[] = [
  {
    nome: 'cenário negativo, sem anexo escolhido',
    agente: {
      id: 'nr16-negativo',
      nome: 'Ausência de atividade ou operação perigosa enquadrável na NR-16',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      atividadeEnquadrada: 'Avaliada a atividade efetivamente desempenhada pelo trabalhador.',
      areaRisco: 'Não identificada condição ou área de risco enquadrável na NR-16 e seus anexos.',
      exposicaoPericulosidade: 'nao_constatada',
      resultadoPericulosidade: 'nao_caracterizada',
    },
  },
  {
    nome: 'cenário com agente, pontos de verificação do Anexo 2',
    agente: {
      id: 'nr16-inflamaveis',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      atividadeEnquadrada: 'Operação em bomba de abastecimento',
      areaRisco: 'Área de operação da bomba de inflamáveis líquidos',
      exposicaoPericulosidade: 'intermitente',
      resultadoPericulosidade: 'caracterizada',
      detalhesNr16: [
        { id: 'produto', rotulo: 'Produto inflamável ou combustível', valor: 'Óleo diesel S10' },
        { id: 'fds', rotulo: 'Ficha com Dados de Segurança (FDS)', valor: 'Apresentada pela reclamada e examinada' },
        { id: 'vazio', rotulo: 'Ponto de fulgor indicado na FDS', valor: '  ' },
      ],
    },
  },
  {
    nome: 'redação própria por cima das duas opções da lista',
    agente: {
      id: 'nr16-redacao-propria',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      exposicaoPericulosidade: 'permanente',
      resultadoPericulosidade: 'nao_caracterizada',
      exposicaoPericulosidadeTexto: 'Exposição nas três horas diárias de abastecimento da frota.',
      resultadoPericulosidadeTexto: 'Caracterizada a periculosidade apenas de 2019 a 2022.',
    },
  },
  {
    nome: 'agente recém-criado, ainda sem nada preenchido',
    agente: {
      id: 'nr16-vazio',
      nome: '',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
    },
  },
]

describe('tabela da NR-16 nos dois cenários', () => {
  for (const caso of CASOS) {
    it(`a API e o front montam a mesma tabela — ${caso.nome}`, () => {
      expect(montarApresentacaoAgente(caso.agente)).toEqual(montarNoFront(caso.agente))
    })
  }

  it('sem enquadramento a tabela sai enxuta; com enquadramento, completa', () => {
    const negativo = montarApresentacaoAgente(CASOS[0]!.agente)
    const comAgente = montarApresentacaoAgente(CASOS[1]!.agente)

    expect(negativo.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Adicional' }))
    expect(comAgente.linhas).toContainEqual({ rotulo: 'Adicional', valor: '30%' })
    expect(comAgente.linhas).toContainEqual({
      rotulo: 'Produto inflamável ou combustível',
      valor: 'Óleo diesel S10',
    })
    // Ponto deixado em branco não vira linha vazia no documento assinado.
    expect(comAgente.linhas.map((linha) => linha.rotulo)).not.toContain('Ponto de fulgor indicado na FDS')
  })
})
