import { describe, expect, it } from 'vitest'

import {
  ANALISE_ATIVIDADES_NR16,
  LAPSO_TEMPORAL_NR16,
  conclusaoSemRiscoNr16,
  montarApresentacaoAgente,
  quadrosNr16DoItem10,
} from './documento-comum'
import { montarApresentacaoAgente as montarNoFront } from '../../../src/lib/apresentacaoAgente'
import { PADRAO_NR16_SEM_ENQUADRAMENTO } from '../../../src/content/anexosNr16'
import type { AgenteAvaliado } from '../../../src/types'

// ============================================================
// A tabela do agente é montada por duas cópias da mesma função: a do front
// desenha a pré-visualização, a da API desenha o PDF e o DOCX. Enquanto elas
// divergirem, o perito revisa uma coisa na tela e assina outra no arquivo.
//
// Cada agente tem DOIS quadros, e os dois têm de casar nas duas cópias:
//   • item 7 — o levantamento (natureza, critério, lapso, adicional
//     pretendido, anexos examinados, exposição). Não conclui nada;
//   • item 10 (`{ conclusiva: true }`) — duas linhas: o que foi examinado e
//     a que se concluiu, com a redação própria vencendo a opção do seletor.
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
      // O mesmo conteúdo que o botão "Aplicar texto padrão sem enquadramento"
      // grava: é o cenário "quando não tem nada" do perito.
      ...PADRAO_NR16_SEM_ENQUADRAMENTO,
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
    nome: 'agente com EPI e observação, que só saem no quadro do item 10',
    agente: {
      id: 'nr16-com-epi',
      nome: 'Inflamáveis',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_02',
      resultadoPericulosidade: 'caracterizada',
      observacao: 'Ressalva quanto ao período anterior à reforma do pátio.',
      epis: [{ categoria: 'Luva', modelo: 'Nitrílica NL-30', caUnico: '9111' }],
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

describe('tabela da NR-16 nos dois quadros', () => {
  for (const caso of CASOS) {
    it(`a API e o front montam o mesmo quadro do item 7 — ${caso.nome}`, () => {
      expect(montarApresentacaoAgente(caso.agente)).toEqual(montarNoFront(caso.agente))
    })

    it(`a API e o front montam o mesmo quadro do item 10 — ${caso.nome}`, () => {
      expect(montarApresentacaoAgente(caso.agente, { conclusiva: true }))
        .toEqual(montarNoFront(caso.agente, { conclusiva: true }))
    })
  }

  it('o item 7 levanta e não conclui, nos dois cenários', () => {
    const negativo = montarApresentacaoAgente(CASOS[0]!.agente)
    const comAgente = montarApresentacaoAgente(CASOS[1]!.agente)

    // O adicional pretendido é a pretensão da inicial, não o reconhecimento
    // do laudo: sai nos dois cenários, com o rótulo por extenso.
    for (const quadro of [negativo, comAgente]) {
      expect(quadro.linhas).toContainEqual({ rotulo: 'Adicional Pretendido', valor: '30%' })
      expect(quadro.linhas).toContainEqual({ rotulo: 'Lapso temporal', valor: LAPSO_TEMPORAL_NR16 })
      expect(quadro.linhas).not.toContainEqual(expect.objectContaining({ rotulo: 'Resultado técnico' }))
    }
    expect(negativo.linhas).toContainEqual({ rotulo: 'Análise dos Anexos', valor: PADRAO_NR16_SEM_ENQUADRAMENTO.analiseAnexos })
    expect(comAgente.linhas).toContainEqual({
      rotulo: 'Produto inflamável ou combustível',
      valor: 'Óleo diesel S10',
    })
    // Ponto deixado em branco não vira linha vazia no documento assinado.
    expect(comAgente.linhas.map((linha) => linha.rotulo)).not.toContain('Ponto de fulgor indicado na FDS')
  })

  it('o item 10 conclui — e no cenário negativo percorre os sete anexos', () => {
    const negativo = montarApresentacaoAgente(CASOS[0]!.agente, { conclusiva: true })

    expect(negativo.linhas).toEqual([
      {
        rotulo: 'Condição / Atividades',
        valor: `${ANALISE_ATIVIDADES_NR16}\n${LAPSO_TEMPORAL_NR16}`,
      },
      {
        rotulo: 'Resultado técnico / Conclusão',
        valor: conclusaoSemRiscoNr16(),
        destaque: 'positivo',
      },
    ])
  })

  it('lista os sete anexos mesmo sem agente nenhum enquadrado', () => {
    const quadros = quadrosNr16DoItem10([{ id: 'sem-anexo', nome: 'Sem risco' }], '10.2')

    // Sete linhas de anexo + o quadro do agente sem enquadramento.
    expect(quadros).toHaveLength(8)
    expect(quadros.slice(0, 7).every((quadro) => !quadro.agente)).toBe(true)
    expect(quadros[0]).toEqual({ numero: '10.2.1', titulo: 'Explosivos;' })
    // Ponto e vírgula em todos menos no último da lista.
    expect(quadros[6]).toEqual({
      numero: '10.2.7',
      titulo: 'Anexo (*) – Radiações ionizantes ou substâncias radioativas',
    })
    expect(quadros[7]?.titulo).toBe('Sem Risco – Avaliação, Resultado e Conclusão')
  })

  it('o anexo avaliado troca a linha da lista pelo quadro, sem mudar de número', () => {
    const agente = { id: 'a', nome: 'Inflamáveis líquidos', anexoNr16: 'ANEXO_02' }
    const quadros = quadrosNr16DoItem10([agente], '10.2')

    expect(quadros).toHaveLength(7)
    expect(quadros[1]).toEqual({
      numero: '10.2.2',
      titulo: 'Inflamáveis – Avaliação, Resultado e Conclusão',
      agente,
    })
  })

  it('agente com anexo fora da lista não some do item 10', () => {
    // Valor de antes dos ids. Não casa com anexo nenhum e, até aqui, também
    // não caía na sobra: o quadro inteiro sumia do laudo, calado.
    const legado = { id: 'legado', nome: 'Inflamáveis líquidos', anexoNr16: 'Anexo 2' }
    const quadros = quadrosNr16DoItem10([legado], '10.2')

    expect(quadros.map((quadro) => quadro.agente)).toContain(legado)
    expect(quadros.filter((quadro) => quadro.agente)).toHaveLength(1)
    // Vai para o último subitem, o "Sem Risco" do modelo do perito.
    expect(quadros.find((quadro) => quadro.agente)?.numero).toBe('10.2.8')
  })

  it('os EPIs do agente de periculosidade só têm onde sair no item 10', () => {
    const comEpi = CASOS[3]!.agente
    const protecoes = { rotulo: 'Proteções associadas', valor: 'Proteção 1: Nitrílica NL-30 — CA 9111' }

    // No item 7 não entram: lá só vai o levantamento da exposição.
    expect(montarApresentacaoAgente(comEpi).linhas).not.toContainEqual(protecoes)
    expect(montarApresentacaoAgente(comEpi, { conclusiva: true }).linhas).toContainEqual(protecoes)
    // A seção de EPIs do laudo só alcança agente com bloco de proteção, e o
    // de periculosidade nunca tem: sem a linha acima, o EPI sumia do laudo.
    expect(montarApresentacaoAgente(comEpi, { conclusiva: true }).protecoes).toEqual([])
  })
})
