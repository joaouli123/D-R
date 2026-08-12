// Fonte oficial vigente: Ministério do Trabalho e Emprego.
// https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-15-nr-15
// https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-15-anexo-13.pdf
// Consulta: 2026-08-12.

import type { ReferenciaNormativa } from './tipos'

type GrauNormativo = 'minimo' | 'medio' | 'maximo'
const LIMITE_QUALITATIVO = 'Não aplicável (análise qualitativa por inspeção da operação prevista no Anexo 13)'

function atividade(
  id: string,
  grupo: string,
  label: string,
  atividadeEnquadrada: string,
  grau: GrauNormativo,
  sinonimos: readonly string[] = [],
): ReferenciaNormativa {
  return {
    id: `ANEXO_13_${id}`,
    anexoId: 'ANEXO_13',
    label: `${grupo} — ${label}`,
    sinonimos: [grupo, ...sinonimos],
    tipo: 'quimico',
    criterio: 'qualitativo',
    limiteTolerancia: LIMITE_QUALITATIVO,
    grau,
    atividadeEnquadrada,
  }
}

function atividadeSemGrau(
  id: 'SUBSTANCIAS_CANCERIGENAS_01',
  grupo: string,
  label: string,
  atividadeEnquadrada: string,
  sinonimos: readonly string[] = [],
): ReferenciaNormativa {
  return {
    id: `ANEXO_13_${id}`,
    anexoId: 'ANEXO_13',
    label: `${grupo} — ${label}`,
    sinonimos: [grupo, ...sinonimos],
    tipo: 'quimico',
    criterio: 'qualitativo',
    limiteTolerancia: LIMITE_QUALITATIVO,
    atividadeEnquadrada,
  }
}

export const ATIVIDADES_ANEXO_13: readonly ReferenciaNormativa[] = [
  atividade(
    'ARSENICO_MAX_01',
    'ARSÊNICO',
    'Extração, manipulação e preparação',
    'Extração e manipulação de arsênico e preparação de seus compostos. Fabricação e preparação de tintas à base de arsênico.',
    'maximo',
  ),
  atividade('ARSENICO_MAX_02', 'ARSÊNICO', 'Produtos parasiticidas', 'Fabricação de produtos parasiticidas, inseticidas e raticidas contendo compostos de arsênico.', 'maximo'),
  atividade('ARSENICO_MAX_03', 'ARSÊNICO', 'Pintura a pistola em recintos limitados ou fechados', 'Pintura a pistola com pigmentos de compostos de arsênico, em recintos limitados ou fechados.', 'maximo'),
  atividade('ARSENICO_MAX_04', 'ARSÊNICO', 'Preparação do Secret', 'Preparação do Secret.', 'maximo'),
  atividade('ARSENICO_MAX_05', 'ARSÊNICO', 'Produção de trióxido', 'Produção de trióxido de arsênico.', 'maximo'),
  atividade('ARSENICO_MED_01', 'ARSÊNICO', 'Bronzeamento em negro e verde', 'Bronzeamento em negro e verde com compostos de arsênico.', 'medio'),
  atividade('ARSENICO_MED_02', 'ARSÊNICO', 'Conservação e depilação de peles', 'Conservação e peles e plumas; depilação de peles à base de compostos de arsênico.', 'medio'),
  atividade('ARSENICO_MED_03', 'ARSÊNICO', 'Descoloração de vidros e cristais', 'Descoloração de vidros e cristais à base de compostos de arsênico.', 'medio'),
  atividade('ARSENICO_MED_04', 'ARSÊNICO', 'Emprego de produtos parasiticidas', 'Emprego de produtos parasiticidas, inseticidas e raticidas à base de compostos de arsênico.', 'medio'),
  atividade('ARSENICO_MED_05', 'ARSÊNICO', 'Cartas, papéis e flores artificiais', 'Fabricação de cartas de jogar, papéis pintados e flores artificiais à base de compostos de arsênico.', 'medio'),
  atividade('ARSENICO_MED_06', 'ARSÊNICO', 'Metalurgia de minérios arsenicais', 'Metalurgia de minérios arsenicais (ouro, prata, chumbo, zinco, níquel, antimônio, cobalto e ferro).', 'medio'),
  atividade('ARSENICO_MED_07', 'ARSÊNICO', 'Operações de galvanotécnica', 'Operações de galvanotécnica à base de compostos de arsênico.', 'medio'),
  atividade('ARSENICO_MED_08', 'ARSÊNICO', 'Pintura manual em recintos limitados ou fechados', 'Pintura manual (pincel, rolo e escova) com pigmentos de compostos de arsênico em recintos limitados ou fechados, exceto com pincel capilar.', 'medio'),
  atividade('ARSENICO_MIN_01', 'ARSÊNICO', 'Empalhamento de animais', 'Empalhamento de animais à base de compostos de arsênico.', 'minimo'),
  atividade('ARSENICO_MIN_02', 'ARSÊNICO', 'Fabricação de tafetá', 'Fabricação de tafetá “sire”.', 'minimo'),
  atividade('ARSENICO_MIN_03', 'ARSÊNICO', 'Pintura ao ar livre', 'Pintura a pistola ou manual com pigmentos de compostos de arsênico ao ar livre.', 'minimo'),

  atividade('CARVAO_MAX_01', 'CARVÃO', 'Trabalho permanente no subsolo', 'Trabalho permanente no subsolo em operações de corte, furação e desmonte, de carregamento no local de desmonte, em atividades de manobra, nos pontos de transferência de carga e de viradores.', 'maximo'),
  atividade('CARVAO_MED_01', 'CARVÃO', 'Demais atividades permanentes do subsolo', 'Demais atividades permanentes do subsolo compreendendo serviços, tais como: operações de locomotiva, condutores, engatadores, bombeiros, madeireiros, trilheiros e eletricistas.', 'medio'),
  atividade('CARVAO_MIN_01', 'CARVÃO', 'Atividades permanentes de superfícies', 'Atividades permanentes de superfícies nas operações a seco, com britadores, peneiras, classificadores, carga e descarga de silos, de transportadores de correia e de teleférreos.', 'minimo'),

  atividade('CHUMBO_MAX_01', 'CHUMBO', 'Fabricação de compostos', 'Fabricação de compostos de chumbo, carbonato, arseniato, cromato mínio, litargírio e outros.', 'maximo'),
  atividade('CHUMBO_MAX_02', 'CHUMBO', 'Esmaltes, vernizes e pigmentos', 'Fabricação de esmaltes, vernizes, cores, pigmentos, tintas, ungüentos, óleos, pastas, líquidos e pós à base de compostos de chumbo.', 'maximo'),
  atividade('CHUMBO_MAX_03', 'CHUMBO', 'Acumuladores, pilhas e baterias', 'Fabricação e restauração de acumuladores, pilhas e baterias elétricas contendo compostos de chumbo.', 'maximo'),
  atividade('CHUMBO_MAX_04', 'CHUMBO', 'Chumbo tetraetila e tetrametila', 'Fabricação e emprego de chumbo tetraetila e chumbo tetrametila.', 'maximo'),
  atividade('CHUMBO_MAX_05', 'CHUMBO', 'Fundição e laminação', 'Fundição e laminação de chumbo, de zinco velho cobre e latão.', 'maximo'),
  atividade('CHUMBO_MAX_06', 'CHUMBO', 'Tanques e gasolina com chumbo tetraetila', 'Limpeza, raspagem e reparação de tanques de mistura, armazenamento e demais trabalhos com gasolina contendo chumbo tetraetila.', 'maximo'),
  atividade('CHUMBO_MAX_07', 'CHUMBO', 'Pintura a pistola em recintos limitados ou fechados', 'Pintura a pistola com pigmentos de compostos de chumbo em recintos limitados ou fechados.', 'maximo'),
  atividade('CHUMBO_MAX_08', 'CHUMBO', 'Vulcanização de borracha', 'Vulcanização de borracha pelo litargírio ou outros compostos de chumbo.', 'maximo'),
  atividade('CHUMBO_MED_01', 'CHUMBO', 'Aplicação de esmaltes, vernizes e pigmentos', 'Aplicação e emprego de esmaltes, vernizes, cores, pigmentos, tintas, ungüentos, óleos, pastas, líquidos e pós à base de compostos de chumbo.', 'medio'),
  atividade('CHUMBO_MED_02', 'CHUMBO', 'Porcelana com esmaltes', 'Fabricação de porcelana com esmaltes de compostos de chumbo.', 'medio'),
  atividade('CHUMBO_MED_03', 'CHUMBO', 'Pintura e decoração manual', 'Pintura e decoração manual (pincel, rolo e escova) com pigmentos de compostos de chumbo (exceto pincel capilar), em recintos limitados ou fechados.', 'medio'),
  atividade('CHUMBO_MED_04', 'CHUMBO', 'Tinturaria e estamparia', 'Tinturaria e estamparia com pigmentos à base de compostos de chumbo.', 'medio'),
  atividade('CHUMBO_MIN_01', 'CHUMBO', 'Pintura ao ar livre', 'Pintura a pistola ou manual com pigmentos de compostos de chumbo ao ar livre.', 'minimo'),

  atividade('CROMO_MAX_01', 'CROMO', 'Fabricação de cromatos e bicromatos', 'Fabricação de cromatos e bicromatos.', 'maximo'),
  atividade('CROMO_MAX_02', 'CROMO', 'Pintura a pistola em recintos limitados ou fechados', 'Pintura a pistola com pigmentos de compostos de cromo, em recintos limitados ou fechados.', 'maximo'),
  atividade('CROMO_MED_01', 'CROMO', 'Cromagem eletrolítica', 'Cromagem eletrolítica dos metais.', 'medio'),
  atividade('CROMO_MED_02', 'CROMO', 'Palitos fosfóricos', 'Fabricação de palitos fosfóricos à base de compostos de cromo (preparação da pasta e trabalho nos secadores).', 'medio'),
  atividade('CROMO_MED_03', 'CROMO', 'Manipulação de cromatos e bicromatos', 'Manipulação de cromatos e bicromatos.', 'medio'),
  atividade('CROMO_MED_04', 'CROMO', 'Pintura manual em recintos limitados ou fechados', 'Pintura manual com pigmentos de compostos de cromo em recintos limitados ou fechados (exceto pincel capilar).', 'medio'),
  atividade('CROMO_MED_05', 'CROMO', 'Processos fotomecânicos', 'Preparação por processos fotomecânicos de clichês para impressão à base de compostos de cromo.', 'medio'),
  atividade('CROMO_MED_06', 'CROMO', 'Tanagem', 'Tanagem a cromo.', 'medio'),

  atividade('FOSFORO_MAX_01', 'FÓSFORO', 'Extração e preparação', 'Extração e preparação de fósforo branco e seus compostos.', 'maximo'),
  atividade('FOSFORO_MAX_02', 'FÓSFORO', 'Defensivos fosforados', 'Fabricação de defensivos fosforados e organofosforados.', 'maximo'),
  atividade('FOSFORO_MAX_03', 'FÓSFORO', 'Projéteis, explosivos e gases', 'Fabricação de projéteis incendiários, explosivos e gases asfixiantes à base de fósforo branco.', 'maximo'),
  atividade('FOSFORO_MED_01', 'FÓSFORO', 'Emprego de defensivos organofosforados', 'Emprego de defensivos organofosforados.', 'medio'),
  atividade('FOSFORO_MED_02', 'FÓSFORO', 'Bronze fosforado', 'Fabricação de bronze fosforado.', 'medio'),
  atividade('FOSFORO_MED_03', 'FÓSFORO', 'Mechas fosforadas', 'Fabricação de mechas fosforadas para lâmpadas de mineiros.', 'medio'),

  atividade('HIDROCARBONETOS_MAX_01', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Destilação do alcatrão', 'Destilação do alcatrão da hulha.', 'maximo'),
  atividade('HIDROCARBONETOS_MAX_02', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Destilação do petróleo', 'Destilação do petróleo.', 'maximo'),
  atividade('HIDROCARBONETOS_MAX_03', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Manipulação de alcatrão e substâncias afins', 'Manipulação de alcatrão, breu, betume, antraceno, óleos minerais, óleo queimado, parafina ou outras substâncias cancerígenas afins.', 'maximo'),
  atividade('HIDROCARBONETOS_MAX_04', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Fabricação de derivados tóxicos', 'Fabricação de fenóis, cresóis, naftóis, nitroderivados, aminoderivados, derivados halogenados e outras substâncias tóxicas derivadas de hidrocarbonetos cíclicos.', 'maximo'),
  atividade('HIDROCARBONETOS_MAX_05', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Pintura a pistola', 'Pintura a pistola com esmaltes, tintas, vernizes e solventes contendo hidrocarbonetos aromáticos.', 'maximo'),
  atividade('HIDROCARBONETOS_MED_01', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Defensivos organoclorados', 'Emprego de defensivos organoclorados: DDT (diclorodifeniltricloretano) DDD (diclorodifenildicloretano), metoxicloro (dimetoxidifeniltricloretano), BHC (hexacloreto de benzeno) e seus compostos e isômeros.', 'medio'),
  atividade('HIDROCARBONETOS_MED_02', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Defensivos derivados do ácido carbônico', 'Emprego de defensivos derivados do ácido carbônico.', 'medio'),
  atividade('HIDROCARBONETOS_MED_03', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Aminoderivados aromáticos', 'Emprego de aminoderivados de hidrocarbonetos aromáticos (homólogos da anilina).', 'medio'),
  atividade('HIDROCARBONETOS_MED_04', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Cresol e naftaleno', 'Emprego de cresol, naftaleno e derivados tóxicos.', 'medio'),
  atividade('HIDROCARBONETOS_MED_05', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Isocianatos na formação de poliuretanas', 'Emprego de isocianatos na formação de poliuretanas (lacas de desmoldagem, lacas de dupla composição, lacas protetoras de madeira e metais, adesivos especiais e outros produtos à base de poliisocianetos e poliuretanas).', 'medio'),
  atividade('HIDROCARBONETOS_MED_06', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Solventes e limpeza de peças', 'Emprego de produtos contendo hidrocarbonetos aromáticos como solventes ou em limpeza de peças.', 'medio'),
  atividade('HIDROCARBONETOS_MED_07', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Artigos de borracha e impermeabilização', 'Fabricação de artigos de borracha, de produtos para impermeabilização e de tecidos impermeáveis à base de hidrocarbonetos.', 'medio'),
  atividade('HIDROCARBONETOS_MED_08', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Linóleos, tintas e solventes', 'Fabricação de linóleos, celulóides, lacas, tintas, esmaltes, vernizes, solventes, colas, artefatos de ebonite, guta-percha, chapéus de palha e outros à base de hidrocarbonetos.', 'medio'),
  atividade('HIDROCARBONETOS_MED_09', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Óleo diesel sob pressão', 'Limpeza de peças ou motores com óleo diesel aplicado sob pressão (nebulização).', 'medio'),
  atividade('HIDROCARBONETOS_MED_10', 'HIDROCARBONETOS E OUTROS COMPOSTOS DE CARBONO', 'Pintura a pincel', 'Pintura a pincel com esmaltes, tintas e vernizes em solvente contendo hidrocarbonetos aromáticos.', 'medio'),

  atividade('MERCURIO_MAX_01', 'MERCÚRIO', 'Compostos orgânicos', 'Fabricação e manipulação de compostos orgânicos de mercúrio.', 'maximo'),

  atividade('SILICATOS_MAX_01', 'SILICATOS', 'Poeira no subsolo', 'Operações que desprendam poeira de silicatos em trabalhos permanentes no subsolo, em minas e túneis (operações de corte, furação, desmonte, carregamentos e outras atividades exercidas no local do desmonte e britagem no subsolo).', 'maximo'),
  atividade('SILICATOS_MAX_02', 'SILICATOS', 'Extração, trituração e moagem de talco', 'Operações de extração, trituração e moagem de talco.', 'maximo'),
  atividade('SILICATOS_MAX_03', 'SILICATOS', 'Material refratário', 'Fabricação de material refratário, como refratários para fôrmas, chaminés e cadinhos; recuperação de resíduos.', 'maximo'),

  // O texto oficial vigente não explicita um grau neste item; por isso ele
  // permanece sem grau, sem inferência jurídica silenciosa.
  atividadeSemGrau(
    'SUBSTANCIAS_CANCERIGENAS_01',
    'SUBSTÂNCIAS CANCERÍGENAS',
    'Exposição ou contato por qualquer via',
    'Para as substâncias ou processos as seguir relacionados, não deve ser permitida nenhuma exposição ou contato, por qualquer via:\n- 4 - amino difenil (p-xenilamina);\n- Produção de Benzidina;\n- Betanaftilamina;\n- 4 - nitrodifenil,\n\nEntende-se por nenhuma exposição ou contato significa hermetizar o processo ou operação, através dos melhores métodos praticáveis de engenharia, sendo que o trabalhador deve ser protegido adequadamente de modo a não permitir nenhum contato com o carcinogênico.\n\nSempre que os processos ou operações não forem hermetizados, será considerada como situação de risco grave e iminente para o trabalhador.\n\nPara o Benzeno, deve ser observado o disposto no anexo 13-A.',
    ['4 - amino difenil', 'p-xenilamina', 'Produção de Benzidina', 'Betanaftilamina', '4 - nitrodifenil'],
  ),

  atividade('OPERACOES_DIVERSAS_MAX_01', 'OPERAÇÕES DIVERSAS', 'Cádmio e seus compostos', 'Operações com cádmio e seus compostos, extração, tratamento, preparação de ligas, fabricação e emprego de seus compostos, solda com cádmio, utilização em fotografia com luz ultravioleta, em fabricação de vidros, como antioxidante, em revestimentos metálicos, e outros produtos.', 'maximo'),
  atividade(
    'OPERACOES_DIVERSAS_MAX_02',
    'OPERAÇÕES DIVERSAS',
    'Operações com substâncias relacionadas',
    "Operações com as seguintes substâncias:\n- Éter bis (cloro-metílico)\n- Benzopireno\n- Berílio\n- Cloreto de dimetil-carbamila\n- 3,3' – dicloro-benzidina\n- Dióxido de vinil ciclohexano\n- Epicloridrina\n- Hexametilfosforamida\n- 4,4' - metileno bis (2-cloro anilina)\n- 4,4' - metileno dianilina\n- Nitrosaminas\n- Propano sultone\n- Betapropiolactona\n- Tálio\n- Produção de trióxido de amônio ustulação de sulfeto de níquel.",
    'maximo',
    ['Éter bis (cloro-metílico)', 'Benzopireno', 'Berílio', 'Cloreto de dimetil-carbamila', "3,3' – dicloro-benzidina", 'Dióxido de vinil ciclohexano', 'Epicloridrina', 'Hexametilfosforamida', "4,4' - metileno bis (2-cloro anilina)", "4,4' - metileno dianilina", 'Nitrosaminas', 'Propano sultone', 'Betapropiolactona', 'Tálio', 'Sulfeto de níquel'],
  ),
  atividade('OPERACOES_DIVERSAS_MED_01', 'OPERAÇÕES DIVERSAS', 'Tintas de alumínio', 'Aplicação a pistola de tintas de alumínio.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_02', 'OPERAÇÕES DIVERSAS', 'Pós de alumínio', 'Fabricação de pós de alumínio (trituração e moagem).', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_03', 'OPERAÇÕES DIVERSAS', 'Emetina e ipeca', 'Fabricação de emetina e pulverização de ipeca.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_04', 'OPERAÇÕES DIVERSAS', 'Ácidos', 'Fabricação e manipulação de ácido oxálico, nítrico sulfúrico, bromídrico, fosfórico, pícrico.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_05', 'OPERAÇÕES DIVERSAS', 'Metalização a pistola', 'Metalização a pistola.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_06', 'OPERAÇÕES DIVERSAS', 'Timbó', 'Operações com o timbó.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_07', 'OPERAÇÕES DIVERSAS', 'Bagaço de cana', 'Operações com bagaço de cana nas fases de grande exposição à poeira.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_08', 'OPERAÇÕES DIVERSAS', 'Galvanoplastia', 'Operações de galvanoplastia: douração, prateação, niquelagem, cromagem, zincagem, cobreagem, anodização de alumínio.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_09', 'OPERAÇÕES DIVERSAS', 'Telegrafia e radiotelegrafia', 'Telegrafia e radiotelegrafia, manipulação em aparelhos do tipo Morse e recepção de sinais em fones.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_10', 'OPERAÇÕES DIVERSAS', 'Escórias de Thomás', 'Trabalhos com escórias de Thomás: remoção, trituração, moagem e acondicionamento.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_11', 'OPERAÇÕES DIVERSAS', 'Retirada e queima de pinturas', 'Trabalho de retirada, raspagem a seco e queima de pinturas.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_12', 'OPERAÇÕES DIVERSAS', 'Extração de sal', 'Trabalhos na extração de sal (salinas).', 'medio'),
  atividade('OPERACOES_DIVERSAS_MED_13', 'OPERAÇÕES DIVERSAS', 'Álcalis cáusticos', 'Fabricação e manuseio de álcalis cáusticos.', 'medio'),
  atividade('OPERACOES_DIVERSAS_MIN_01', 'OPERAÇÕES DIVERSAS', 'Cal e cimento', 'Fabricação e transporte de cal e cimento nas fases de grande exposição a poeiras.', 'minimo'),
  atividade('OPERACOES_DIVERSAS_MIN_02', 'OPERAÇÕES DIVERSAS', 'Enxofre ou sulfitos', 'Trabalhos de carregamento, descarregamento ou remoção de enxofre ou sulfitos em geral, em sacos ou a granel.', 'minimo'),
]
