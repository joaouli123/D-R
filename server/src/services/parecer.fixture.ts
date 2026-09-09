import type { Empresa, Usuario } from '@prisma/client'

import type { PericiaCompleta } from './../mappers.js'

// Perícia mínima usada pelos testes dos DOIS renderizadores do servidor
// (documento-parecer.test.ts para o PDF, docx-parecer.test.ts para o DOCX).
// É a mesma fixture de propósito: se os dois divergirem, é porque o
// renderizador divergiu, não o dado de entrada.
export const perito = {
  id: 'usr-1',
  nome: 'Dinoel Ribeiro da Silva',
  titulo: 'Engenheiro de Segurança do Trabalho',
  registroProfissional: 'CREA/SP 5071814404/D',
} as Usuario

export const empresa = {
  id: 'emp-1',
  razaoSocial: 'Metalúrgica Exemplo Ltda.',
  cnpj: '12.345.678/0001-90',
  cidade: 'Cajamar',
  uf: 'SP',
} as Empresa

const foto = (id: string, secao: string, ordem: number, legenda: string) => ({
  id,
  periciaId: 'per-1',
  secao,
  ordem,
  arquivo: `${id}.jpg`,
  legenda,
})

export function periciaDeTeste(): PericiaCompleta {
  return {
    id: 'per-1',
    numeroProcesso: '1000675-40.2026.5.02.0264',
    reclamante: 'Jhonathan Victor Oliveira Fernandes',
    cpfReclamante: '418.292.838-55',
    funcaoReclamante: 'Operador de Máquinas',
    admissao: '2018-03-12',
    demissao: '2024-11-08',
    dataAjuizamento: '2026-06-10',
    dataVistoria: '2026-07-15',
    horaVistoria: '09:30',
    localVistoria: 'Rodovia Anhanguera, km 32 — Cajamar/SP',
    modalidade: 'insalubridade',
    status: 'em_andamento',
    responsavelId: 'usr-1',
    reclamadas: [{ id: 'rec-1', periciaId: 'per-1', empresaId: 'emp-1', principal: true }],
    participantes: [],
    // A 1ª foto de cada seção empata em `ordem` — é exatamente o dado que as
    // perícias gravadas antes da correção de routes/fotos.ts têm no banco.
    fotos: [
      foto('fot-epi', 'epi', 1, 'EPI reconhecido na diligência'),
      foto('fot-ambiente', 'ambiente', 1, 'Vista geral do galpão'),
    ],
    tecnico: {
      apresentacao: 'O signatário apresenta o presente parecer.',
      descricaoEmpresa: 'A Reclamada atua no ramo de usinagem.',
      descricaoAmbiente: 'Galpão industrial de alvenaria.',
      descricaoPostoTrabalho: 'Posto fixo junto aos tornos CNC.',
      maquinasFerramentas: 'Tornos CNC e retífica plana.',
      produtosUtilizados: 'Fluido de corte solúvel.',
      atividadesFuncoes: 'Operação de tornos CNC com manuseio de fluidos de corte.',
      periodos: [
        {
          id: 'prd-1',
          funcao: 'Auxiliar de Produção',
          setor: 'Usinagem',
          inicio: '2018-03-12',
          fim: '2024-11-08',
          descricaoAtividades: 'Apoio à operação e movimentação de peças.',
        },
      ],
      agentes: [
        {
          id: 'agn-1',
          nome: 'Óleos minerais (névoa)',
          tipo: 'quimico',
          anexoNr15: 'Anexo 13',
          criterio: 'qualitativo',
          grau: 'medio',
        },
      ],
      conclusao: 'Conclui-se pela caracterização da insalubridade em grau médio.',
    },
  } as unknown as PericiaCompleta
}

/**
 * Perícia SÓ de periculosidade que ainda carrega um agente NR-15 do cadastro.
 *
 * É o caso que expunha dois vazamentos: o agente NR-15 sumia de todos os
 * quadros (a modalidade o exclui) mas os EPIs dele continuavam impressos na
 * seção de Equipamentos de Proteção, atribuídos a um agente que o leitor não
 * achava em lugar nenhum do laudo. O agente NR-16, ao lado, comprova que a
 * seção continua saindo — o filtro tira o herdado, não a seção inteira.
 */
export function periciaSoPericulosidade(): PericiaCompleta {
  const pericia = periciaDeTeste() as unknown as {
    modalidade: string
    tecnico: { agentes: unknown[]; conclusaoPericulosidade?: string }
  }
  pericia.modalidade = 'periculosidade'
  pericia.tecnico.conclusaoPericulosidade = 'Conclui-se pela caracterização da periculosidade.'
  pericia.tecnico.agentes = [
    {
      id: 'agn-nr15',
      nome: 'Ruído contínuo herdado',
      tipo: 'fisico',
      anexoNr15: 'Anexo 1',
      criterio: 'quantitativo',
      epis: [{ id: 'epi-1', categoria: 'Protetor auricular', modelo: 'Plug 3M 1100', caUnico: '5745' }],
    },
    {
      id: 'agn-nr16',
      nome: 'Inflamáveis líquidos',
      tipo: 'periculosidade',
      anexoNr16: 'Anexo 2',
      criterio: 'qualitativo',
      areaRisco: 'Pátio de abastecimento',
      resultadoPericulosidade: 'caracterizada',
      epis: [{ id: 'epi-2', categoria: 'Luva', modelo: 'Nitrílica NL-30', caUnico: '9111' }],
    },
  ]
  return pericia as unknown as PericiaCompleta
}
