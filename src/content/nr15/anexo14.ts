// Fonte oficial vigente: Ministério do Trabalho e Emprego.
// https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-15-nr-15
// https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-15-anexo-14.pdf
// Consulta: 2026-08-12.

import type { ReferenciaNormativa } from './tipos'

function atividade(
  id: string,
  label: string,
  atividadeEnquadrada: string,
  grau: 'medio' | 'maximo',
): ReferenciaNormativa {
  const grupo = grau === 'maximo' ? 'Insalubridade de grau máximo' : 'Insalubridade de grau médio'

  return {
    id: `ANEXO_14_${id}`,
    anexoId: 'ANEXO_14',
    label,
    sinonimos: [grupo],
    tipo: 'biologico',
    criterio: 'qualitativo',
    limiteTolerancia: 'Não aplicável (contato permanente com agentes biológicos conforme rol do Anexo 14)',
    grau,
    atividadeEnquadrada,
  }
}

const CONTATO_MAXIMO = 'Trabalho ou operações, em contato permanente com:'
const CONTATO_MEDIO = 'Trabalhos e operações em contato permanente com pacientes, animais ou com material infecto-contagiante, em:'

export const ATIVIDADES_ANEXO_14: readonly ReferenciaNormativa[] = [
  atividade(
    'MAX_PACIENTES_EM_ISOLAMENTO',
    'Pacientes em isolamento por doenças infecto-contagiosas',
    `${CONTATO_MAXIMO}\npacientes em isolamento por doenças infecto-contagiosas, bem como objetos de seu uso, não previamente esterilizados;`,
    'maximo',
  ),
  atividade(
    'MAX_ANIMAIS_PORTADORES',
    'Animais portadores de doenças infecto-contagiosas',
    `${CONTATO_MAXIMO}\ncarnes, glândulas, vísceras, sangue, ossos, couros, pêlos e dejeções de animais portadores de doenças infecto-contagiosas (carbunculose, brucelose, tuberculose);`,
    'maximo',
  ),
  atividade(
    'MAX_ESGOTOS',
    'Esgotos',
    `${CONTATO_MAXIMO}\nesgotos (galerias e tanques); e`,
    'maximo',
  ),
  atividade(
    'MAX_LIXO_URBANO',
    'Lixo urbano',
    `${CONTATO_MAXIMO}\nlixo urbano (coleta e industrialização).`,
    'maximo',
  ),
  atividade(
    'MED_SAUDE_HUMANA',
    'Estabelecimentos destinados aos cuidados da saúde humana',
    `${CONTATO_MEDIO}\nhospitais, serviços de emergência, enfermarias, ambulatórios, postos de vacinação e outros estabelecimentos destinados aos cuidados da saúde humana (aplica-se unicamente ao pessoal que tenha contato com os pacientes, bem como aos que manuseiam objetos de uso desses pacientes, não previamente esterilizados);`,
    'medio',
  ),
  atividade(
    'MED_ATENDIMENTO_DE_ANIMAIS',
    'Estabelecimentos destinados ao atendimento e tratamento de animais',
    `${CONTATO_MEDIO}\nhospitais, ambulatórios, postos de vacinação e outros estabelecimentos destinados ao atendimento e tratamento de animais (aplica-se apenas ao pessoal que tenha contato com tais animais);`,
    'medio',
  ),
  atividade(
    'MED_LABORATORIOS_COM_ANIMAIS',
    'Laboratórios com animais destinados ao preparo de produtos',
    `${CONTATO_MEDIO}\ncontato em laboratórios, com animais destinados ao preparo de soro, vacinas e outros produtos;`,
    'medio',
  ),
  atividade(
    'MED_ANALISE_CLINICA_E_HISTOPATOLOGIA',
    'Laboratórios de análise clínica e histopatologia',
    `${CONTATO_MEDIO}\nlaboratórios de análise clínica e histopatologia (aplica-se tão-só ao pessoal técnico);`,
    'medio',
  ),
  atividade(
    'MED_AUTOPSIAS_E_ANATOMIA',
    'Gabinetes de autópsias, anatomia e histoanatomopatologia',
    `${CONTATO_MEDIO}\ngabinetes de autópsias, de anatomia e histoanatomopatologia (aplica-se somente ao pessoal técnico);`,
    'medio',
  ),
  atividade(
    'MED_CEMITERIOS',
    'Cemitérios',
    `${CONTATO_MEDIO}\ncemitérios (exumação de corpos);`,
    'medio',
  ),
  atividade(
    'MED_ESTABULOS_E_CAVALARICAS',
    'Estábulos e cavalariças',
    `${CONTATO_MEDIO}\nestábulos e cavalariças; e`,
    'medio',
  ),
  atividade(
    'MED_RESIDUOS_DE_ANIMAIS',
    'Resíduos de animais deteriorados',
    `${CONTATO_MEDIO}\nresíduos de animais deteriorados.`,
    'medio',
  ),
]
