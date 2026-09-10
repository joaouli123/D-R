import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  ANALISE_ATIVIDADES_NR16,
  LAPSO_TEMPORAL_NR16,
  comFuncaoPosto,
  conclusaoSemRiscoNr16,
  montarApresentacaoAgente,
  quadrosNr16DoItem10,
  rotuloFuncaoPosto,
} from './documento-comum'
import {
  comFuncaoPosto as comFuncaoPostoNoFront,
  montarApresentacaoAgente as montarNoFront,
  rotuloFuncaoPosto as rotuloNoFront,
} from '../../../src/lib/apresentacaoAgente'
import {
  PADRAO_NR16_SEM_ENQUADRAMENTO,
  quadrosNr16DoItem10 as quadrosNoFront,
} from '../../../src/content/anexosNr16'
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

const CASOS: { nome: string; agente: AgenteAvaliado & { funcaoPosto?: string } }[] = [
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
    // Perícia antiga: guardava o rótulo onde hoje vai o id. Não casa com
    // anexo nenhum, e por isso o item 10 o recolhe no quadro "Sem Risco" —
    // o que faz a célula de conclusão dele ter de imprimir o rol.
    nome: 'anexo gravado com o rótulo antigo, sem enquadramento',
    agente: {
      id: 'nr16-legado',
      nome: 'Inflamáveis líquidos',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'Anexo 2',
      resultadoPericulosidade: 'nao_caracterizada',
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
  {
    // O mesmo risco lançado numa das duas funções do período examinado. O
    // rótulo chega resolvido pelos renderizadores; aqui ele só tem de sair
    // igual nos dois quadros e nas duas cópias.
    nome: 'agente de uma função entre duas do período',
    agente: {
      id: 'nr16-por-funcao',
      nome: 'Energia elétrica',
      tipo: 'periculosidade',
      criterio: 'qualitativo',
      anexoNr16: 'ANEXO_04',
      periodoId: 'per-manutencao',
      funcaoPosto: 'Eletricista de manutenção — Subestação',
      exposicaoPericulosidade: 'permanente',
      resultadoPericulosidade: 'caracterizada',
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
      // `objectContaining({ rotulo: 'Resultado técnico' })` casa por igualdade
      // exata: não via o rótulo composto do item 10 se ele voltasse a aparecer
      // aqui. O `stringContaining` vê os dois.
      expect(quadro.linhas).not.toContainEqual(
        expect.objectContaining({ rotulo: expect.stringContaining('Resultado técnico') }),
      )
    }

    // A ORDEM também é o modelo do perito, não só a presença: o print põe
    // natureza, critério, lapso e adicional antes do que foi avaliado, e a
    // exposição por último. Reordenar uma linha não quebrava teste nenhum.
    expect(negativo.linhas.map((linha) => linha.rotulo)).toEqual([
      'Natureza',
      'Critério',
      'Lapso temporal',
      'Adicional Pretendido',
      'Atividade ou operação avaliada',
      'Análise dos Anexos',
      'Exposição',
    ])
    expect(comAgente.linhas.map((linha) => linha.rotulo)).toEqual([
      'Anexo NR-16',
      'Natureza',
      'Critério',
      'Lapso temporal',
      'Adicional Pretendido',
      'Atividade ou operação avaliada',
      'Condição ou área de risco',
      // Os pontos de verificação do anexo entram depois do levantamento fixo e
      // antes da exposição, na ordem em que o perito os cadastrou.
      'Produto inflamável ou combustível',
      'Ficha com Dados de Segurança (FDS)',
      'Exposição',
    ])
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

  it('a API e o front montam a mesma lista de subitens do item 10', () => {
    // `ANEXOS_NR16` × `ANEXOS_NR16_DOCUMENTO` e `itemListaAnexoNr16` ×
    // `itemListaAnexoNr16Documento` são cópias (o front não pode importar de
    // server/src). Sem esta comparação, o número e o rótulo de cada anexo
    // podem divergir entre a tela e o arquivo assinado sem ninguém ver.
    for (const agentes of [
      [{ id: 'sem-anexo', nome: 'Sem risco' }],
      [{ id: 'a', nome: 'Inflamáveis líquidos', anexoNr16: 'ANEXO_02' }],
      // Perícia antiga, que gravava o rótulo em vez do id.
      [{ id: 'legado', nome: 'Inflamáveis líquidos', anexoNr16: 'Anexo 2' }],
      // Dois anexos e uma sobra: pega divergência de ordem e de numeração.
      [
        { id: 'moto', nome: 'Motocicleta', anexoNr16: 'ANEXO_05' },
        { id: 'sobra', nome: 'Sem risco' },
        { id: 'inf', nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' },
      ],
      // O anexo sem número, que é o único a passar pelo ramo do "(*)".
      [{ id: 'rad', nome: 'Radiações', anexoNr16: 'ANEXO_RADIACOES' }],
    ]) {
      expect(quadrosNr16DoItem10(agentes, '10.2')).toEqual(quadrosNoFront(agentes, '10.2'))
    }
  })

  it('sem agente enquadrado, o item 10 sai só com o quadro Sem Risco', () => {
    const agente = { id: 'sem-anexo', nome: 'Sem risco' }
    const quadros = quadrosNr16DoItem10([agente], '10.2')

    // A lista solta dos sete anexos saiu do item 10 por determinação do
    // perito: o rol sai dentro da tabela, na célula de conclusão.
    expect(quadros).toEqual([{
      numero: '10.2.1',
      titulo: 'Sem Risco – Avaliação, Resultado e Conclusão',
      agente,
    }])
    expect(conclusaoSemRiscoNr16()).toContain('Todos os anexos foram observados:')
    expect(conclusaoSemRiscoNr16()).toContain('• Anexo 1 – Explosivos;')
    expect(conclusaoSemRiscoNr16())
      .toContain('• Anexo (*) – Radiações ionizantes ou substâncias radioativas;')
  })

  it('numera os quadros em sequência, sem buraco de anexo não avaliado', () => {
    const agente = { id: 'a', nome: 'Inflamáveis líquidos', anexoNr16: 'ANEXO_02' }
    const quadros = quadrosNr16DoItem10([agente], '10.2')

    // Inflamáveis é o Anexo 2, mas é o único quadro do item: enquanto a
    // numeração acompanhava o anexo, o item 10 abria em “10.2.2” e o 10.2.1
    // não existia em lugar nenhum.
    expect(quadros).toEqual([{
      numero: '10.2.1',
      titulo: 'Inflamáveis – Avaliação, Resultado e Conclusão',
      agente,
    }])
  })

  it('mantém a ordem dos anexos e deixa o Sem Risco por último', () => {
    const moto = { id: 'moto', nome: 'Motocicleta', anexoNr16: 'ANEXO_05' }
    const sobra = { id: 'sobra', nome: 'Sem risco' }
    const inflamaveis = { id: 'inf', nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }

    // Cadastrados fora de ordem de propósito: quem manda é o anexo.
    const quadros = quadrosNr16DoItem10([moto, sobra, inflamaveis], '10.2')

    expect(quadros.map((quadro) => `${quadro.numero}. ${quadro.titulo}`)).toEqual([
      '10.2.1. Inflamáveis – Avaliação, Resultado e Conclusão',
      '10.2.2. Motocicleta – Avaliação, Resultado e Conclusão',
      '10.2.3. Sem Risco – Avaliação, Resultado e Conclusão',
    ])
  })

  it('dois agentes no mesmo anexo ganham um subitem cada, com o nome no título', () => {
    // Dúvida do perito, respondida pelo comportamento: eles não dividem o
    // subitem. Cada um tem o seu quadro, e o nome do risco entra entre
    // parênteses para o leitor saber qual é qual.
    const diesel = { id: 'd', nome: 'Óleo diesel', anexoNr16: 'ANEXO_02' }
    const gasolina = { id: 'g', nome: 'Gasolina', anexoNr16: 'ANEXO_02' }
    const quadros = quadrosNr16DoItem10([diesel, gasolina], '10.2')

    expect(quadros.map((quadro) => `${quadro.numero}. ${quadro.titulo}`)).toEqual([
      '10.2.1. Inflamáveis – Avaliação, Resultado e Conclusão (Óleo diesel)',
      '10.2.2. Inflamáveis – Avaliação, Resultado e Conclusão (Gasolina)',
    ])
  })

  it('o anexo sem número mantém o "(*)" no título do quadro', () => {
    // `itemListaAnexoNr16` tem um ramo só para este anexo: os outros seis
    // saem pelo assunto puro ("Inflamáveis"), porque o número já vem do
    // subitem, mas o das radiações não tem número na norma. Sem o "(*)" o
    // leitor toma o quadro por um "Anexo 7", que a NR-16 não tem.
    //
    // Travado no LITERAL de propósito: os testes de paridade comparam os
    // gêmeos com o próprio gerador, então apagar o ramo nos dois lados
    // passava por eles sem acusar nada.
    const radiacoes = { id: 'rad', nome: 'Radiações', anexoNr16: 'ANEXO_RADIACOES' }

    expect(quadrosNr16DoItem10([radiacoes], '10.2')[0]?.titulo)
      .toBe('Anexo (*) – Radiações ionizantes ou substâncias radioativas – Avaliação, Resultado e Conclusão')
    // E o outro lado escreve o mesmo, não só "o que o gerador dele der".
    expect(quadrosNoFront([radiacoes], '10.2')[0]?.titulo)
      .toBe('Anexo (*) – Radiações ionizantes ou substâncias radioativas – Avaliação, Resultado e Conclusão')
  })

  it('os outros seis anexos saem pelo assunto, sem repetir o número', () => {
    // A contraprova do teste acima: se o ramo do "(*)" fosse generalizado,
    // o item 10 passaria a dizer "Anexo 2 – Inflamáveis" onde o modelo do
    // perito diz só "Inflamáveis" — e o número já está no subitem.
    const inflamaveis = { id: 'inf', nome: 'Inflamáveis', anexoNr16: 'ANEXO_02' }

    expect(quadrosNr16DoItem10([inflamaveis], '10.2')[0]?.titulo)
      .toBe('Inflamáveis – Avaliação, Resultado e Conclusão')
  })

  it('a função avaliada abre os dois quadros, nas duas cópias', () => {
    const agente = CASOS[CASOS.length - 1]!.agente
    const primeiraLinha = { rotulo: 'Função / Posto', valor: 'Eletricista de manutenção — Subestação' }

    expect(montarApresentacaoAgente(agente).linhas[0]).toEqual(primeiraLinha)
    expect(montarNoFront(agente).linhas[0]).toEqual(primeiraLinha)
    expect(montarApresentacaoAgente(agente, { conclusiva: true }).linhas[0]).toEqual(primeiraLinha)
    expect(montarNoFront(agente, { conclusiva: true }).linhas[0]).toEqual(primeiraLinha)
  })

  it('as duas cópias resolvem função e posto do mesmo jeito', () => {
    const periodos = [
      { id: 'per-prensa', funcao: 'Prensista', setor: 'Estamparia' },
      { id: 'per-expedicao', funcao: 'Auxiliar de expedição' },
      { id: 'per-so-setor', funcao: '', setor: 'Almoxarifado' },
    ]
    for (const periodo of [...periodos, undefined]) {
      expect(rotuloFuncaoPosto(periodo)).toBe(rotuloNoFront(periodo))
    }

    const agentes = [
      { id: 'a1', periodoId: 'per-prensa' },
      { id: 'a2', periodoId: 'per-expedicao' },
      { id: 'a3', periodoId: 'per-so-setor' },
      { id: 'a4', periodoId: 'per-apagado' },
      { id: 'a5' },
    ]
    expect(comFuncaoPosto(agentes, periodos)).toEqual(comFuncaoPostoNoFront(agentes, periodos))
    expect(comFuncaoPosto(agentes, periodos).map((agente) => agente.funcaoPosto)).toEqual([
      'Prensista — Estamparia',
      'Auxiliar de expedição',
      'Almoxarifado',
      undefined,
      undefined,
    ])
  })

  it('mantém o aviso de espelhamento nos dois arquivos', () => {
    const caminho = (relativo: string) => fileURLToPath(new URL(relativo, import.meta.url))
    expect(readFileSync(caminho('./documento-comum.ts'), 'utf8'))
      .toContain('src/lib/apresentacaoAgente.ts')
    expect(readFileSync(caminho('../../../src/lib/apresentacaoAgente.ts'), 'utf8'))
      .toContain('server/src/services/documento-comum.ts')
  })

  it('agente com anexo fora da lista não some do item 10', () => {
    // Valor de antes dos ids. Não casa com anexo nenhum e, até aqui, também
    // não caía na sobra: o quadro inteiro sumia do laudo, calado.
    const legado = { id: 'legado', nome: 'Inflamáveis líquidos', anexoNr16: 'Anexo 2' }
    const quadros = quadrosNr16DoItem10([legado], '10.2')

    expect(quadros.map((quadro) => quadro.agente)).toContain(legado)
    expect(quadros).toHaveLength(1)
    // Cai no "Sem Risco" do modelo do perito, aqui o único subitem.
    expect(quadros[0]?.numero).toBe('10.2.1')
    expect(quadros[0]?.titulo).toBe('Sem Risco – Avaliação, Resultado e Conclusão')
  })

  it('o quadro Sem Risco por anexo legado também imprime o rol na conclusão', () => {
    // O título e o corpo têm de responder à MESMA pergunta. Enquanto a
    // conclusão olhava só se `anexoNr16` estava preenchido, este agente
    // entrava no quadro "Sem Risco" e saía com a frase curta do seletor:
    // cabeçalho dizendo que nenhum anexo se aplica, corpo sem dizer quais
    // foram observados. Com a lista solta fora do item 10, o rol não tem
    // outro lugar onde aparecer.
    const legado = {
      id: 'legado',
      nome: 'Inflamáveis líquidos',
      tipo: 'periculosidade' as const,
      criterio: 'qualitativo' as const,
      anexoNr16: 'Anexo 2',
      resultadoPericulosidade: 'nao_caracterizada' as const,
    }

    const conclusiva = montarApresentacaoAgente(legado, { conclusiva: true })

    expect(conclusiva.linhas).toContainEqual({
      rotulo: 'Resultado técnico / Conclusão',
      valor: conclusaoSemRiscoNr16(),
      destaque: 'positivo',
    })
  })

  it('agente de anexo válido não caracterizado NÃO puxa o rol', () => {
    // A contraprova: aqui o quadro se chama "Inflamáveis", não "Sem Risco".
    // O rol responderia por sete anexos quando o laudo examinou um.
    const valido = {
      id: 'valido',
      nome: 'Inflamáveis',
      tipo: 'periculosidade' as const,
      criterio: 'qualitativo' as const,
      anexoNr16: 'ANEXO_02',
      resultadoPericulosidade: 'nao_caracterizada' as const,
    }

    const conclusiva = montarApresentacaoAgente(valido, { conclusiva: true })
    const conclusao = conclusiva.linhas.find(
      (linha) => linha.rotulo === 'Resultado técnico / Conclusão',
    )

    expect(conclusao?.valor).toBeTruthy()
    expect(conclusao?.valor).not.toContain('Todos os anexos foram observados:')
    expect(quadrosNr16DoItem10([valido], '10.2')[0]?.titulo)
      .toBe('Inflamáveis – Avaliação, Resultado e Conclusão')
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
