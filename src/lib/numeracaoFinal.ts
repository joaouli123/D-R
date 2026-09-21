import type { ModalidadePericia } from '@/types'

// O item 10 (análise técnica) é o último número fixo do documento. Depois dele
// a numeração segue o que realmente entra no papel: a conclusão de cada NR, os
// quesitos e os honorários só ganham número quando existem. A prévia e o
// editor usam esta função; o PDF e o DOCX chegam ao mesmo resultado porque
// numeram na ordem em que escrevem as seções.
const ULTIMO_ITEM_FIXO = 10

export interface EntradaNumeracaoFinal {
  modalidade: ModalidadePericia
  temQuesitos: boolean
  temHonorarios: boolean
}

export interface NumeracaoFinal {
  conclusaoNr15: number | null
  conclusaoNr16: number | null
  quesitos: number | null
  encerramento: number
  honorarios: number | null
}

export function numerarItensFinais({ modalidade, temQuesitos, temHonorarios }: EntradaNumeracaoFinal): NumeracaoFinal {
  let ultimo = ULTIMO_ITEM_FIXO
  const proximo = (entra: boolean) => (entra ? ++ultimo : null)
  const conclusaoNr15 = proximo(modalidade !== 'periculosidade')
  const conclusaoNr16 = proximo(modalidade !== 'insalubridade')
  const quesitos = proximo(temQuesitos)
  const encerramento = ++ultimo
  const honorarios = proximo(temHonorarios)
  return { conclusaoNr15, conclusaoNr16, quesitos, encerramento, honorarios }
}
