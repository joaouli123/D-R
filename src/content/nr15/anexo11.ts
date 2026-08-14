// Fonte oficial vigente: Ministério do Trabalho e Emprego.
// https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-15-nr-15
// https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-15-anexo-11.pdf
// Consulta: 2026-08-12.

import type { ReferenciaNormativa } from './tipos'

type GrauNormativo = NonNullable<ReferenciaNormativa['grau']>

interface SubstanciaFonte {
  id: string
  label: string
  sinonimos?: readonly string[]
  cas?: string
  ppm?: string
  mgM3?: string
  grau: GrauNormativo
  valorTeto?: true
  absorcaoPele?: true
  asfixianteSimples?: true
  nota?: string
}

// As linhas "vide..." do Quadro 1 são sinônimos do registro principal,
// evitando limites duplicados e mantendo uma única referência aplicável.
// Para asfixiantes simples, "nao_caracterizado" representa o traço da
// coluna de grau; o limite de 18% de oxigênio vem do item 3 do Anexo.
const SUBSTANCIAS_FONTE: readonly SubstanciaFonte[] = [
  { id: 'ACETALDEIDO', label: 'Acetaldeído', sinonimos: ['Aldeído acético', 'Etanol'], cas: '75-07-0', ppm: '78', mgM3: '140', grau: 'maximo' },
  {
    id: 'ACETATO_DE_CELLOSOLVE',
    label: 'Acetato de cellosolve',
    sinonimos: ['Acetato de éter monoetílico de etileno glicol', 'Acetato de 2-etóxi etila'],
    cas: '111-15-9',
    ppm: '78',
    mgM3: '420',
    grau: 'medio',
    absorcaoPele: true,
  },
  { id: 'ACETATO_DE_ETILA', label: 'Acetato de etila', cas: '141-78-6', ppm: '310', mgM3: '1090', grau: 'minimo' },
  { id: 'ACETILENO', label: 'Acetileno', cas: '74-86-2', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'ACETONA', label: 'Acetona', sinonimos: ['Propanona'], cas: '67-64-1', ppm: '780', mgM3: '1870', grau: 'minimo' },
  { id: 'ACETONITRILA', label: 'Acetonitrila', sinonimos: ['Cianeto de metila'], cas: '75-05-8', ppm: '30', mgM3: '55', grau: 'maximo' },
  { id: 'ACIDO_ACETICO', label: 'Ácido acético', sinonimos: ['Ácido etanóico'], cas: '64-19-7', ppm: '8', mgM3: '20', grau: 'medio' },
  { id: 'ACIDO_CIANIDRICO', label: 'Ácido cianídrico', sinonimos: ['Gás cianídrico'], cas: '74-90-8', ppm: '8', mgM3: '9', grau: 'maximo', absorcaoPele: true },
  { id: 'ACIDO_CLORIDRICO', label: 'Ácido clorídrico', sinonimos: ['Gás clorídrico'], cas: '7647-01-0', ppm: '4', mgM3: '5,5', grau: 'maximo', valorTeto: true },
  { id: 'ACIDO_CROMICO_NEVOA', label: 'Ácido crômico (névoa)', cas: '7738-94-5', mgM3: '0,04', grau: 'maximo' },
  { id: 'ACIDO_FLUORIDRICO', label: 'Ácido fluorídrico', cas: '7664-39-3', ppm: '2,5', mgM3: '1,5', grau: 'maximo' },
  { id: 'ACIDO_FORMICO', label: 'Ácido fórmico', sinonimos: ['Ácido metanóico'], cas: '64-18-6', ppm: '4', mgM3: '7', grau: 'medio' },
  { id: 'ACRILATO_DE_METILA', label: 'Acrilato de metila', cas: '96-33-3', ppm: '8', mgM3: '27', grau: 'maximo', absorcaoPele: true },
  { id: 'ACRILONITRILA', label: 'Acrilonitrila', sinonimos: ['Cianeto de vinila'], cas: '107-13-1', ppm: '16', mgM3: '35', grau: 'maximo', absorcaoPele: true },
  { id: 'ALCOOL_ISOAMILICO', label: 'Álcool isoamílico', cas: '123-51-3', ppm: '78', mgM3: '280', grau: 'minimo' },
  {
    id: 'ALCOOL_N_BUTILICO',
    label: 'Álcool n-butílico',
    sinonimos: ['n-Butano'],
    ppm: '40',
    mgM3: '115',
    grau: 'maximo',
    valorTeto: true,
    absorcaoPele: true,
  },
  { id: 'ALCOOL_ISOBUTILICO', label: 'Álcool isobutílico', sinonimos: ['Isobutanol'], ppm: '40', mgM3: '115', grau: 'medio' },
  { id: 'ALCOOL_SEC_BUTILICO', label: 'Álcool sec-butílico (2-butanol)', sinonimos: ['sec-Butanol'], ppm: '115', mgM3: '350', grau: 'medio' },
  { id: 'ALCOOL_TERC_BUTILICO', label: 'Álcool terc-butílico', ppm: '78', mgM3: '235', grau: 'medio' },
  { id: 'ALCOOL_ETILICO', label: 'Álcool etílico', sinonimos: ['Etanol'], ppm: '780', mgM3: '1480', grau: 'minimo' },
  { id: 'ALCOOL_FURFURILICO', label: 'Álcool furfurílico', ppm: '4', mgM3: '15,5', grau: 'medio', absorcaoPele: true },
  { id: 'ALCOOL_METILICO', label: 'Álcool metílico', sinonimos: ['Metanol'], ppm: '156', mgM3: '200', grau: 'maximo', absorcaoPele: true },
  { id: 'ALCOOL_N_PROPILICO', label: 'Álcool n-propílico', sinonimos: ['n-Propanol'], ppm: '156', mgM3: '390', grau: 'medio', absorcaoPele: true },
  { id: 'ALCOOL_ISOPROPILICO', label: 'Álcool isopropílico', sinonimos: ['iso-Propanol'], ppm: '310', mgM3: '765', grau: 'medio', absorcaoPele: true },
  { id: 'AMONIA', label: 'Amônia', sinonimos: ['Gás amoníaco'], ppm: '20', mgM3: '14', grau: 'medio' },
  { id: 'ANILINA', label: 'Anilina', ppm: '4', mgM3: '15', grau: 'maximo', absorcaoPele: true },
  { id: 'ARGONIO', label: 'Argônio', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'ARSINA', label: 'Arsina (arsenamina)', ppm: '0,04', mgM3: '0,16', grau: 'maximo' },
  { id: 'BROMETO_DE_ETILA', label: 'Brometo de etila', sinonimos: ['Bromoetano'], ppm: '156', mgM3: '695', grau: 'maximo' },
  { id: 'BROMETO_DE_METILA', label: 'Brometo de metila', sinonimos: ['Bromometano'], ppm: '12', mgM3: '47', grau: 'maximo', absorcaoPele: true },
  { id: 'BROMO', label: 'Bromo', ppm: '0,08', mgM3: '0,6', grau: 'maximo' },
  { id: 'BROMOFORMIO', label: 'Bromofórmio', sinonimos: ['Tribromometano'], ppm: '0,4', mgM3: '4', grau: 'medio', absorcaoPele: true },
  { id: 'BUTADIENO_1_3', label: '1,3 Butadieno', ppm: '780', mgM3: '1720', grau: 'medio' },
  { id: 'N_BUTANO', label: 'n-Butano', ppm: '470', mgM3: '1090', grau: 'medio' },
  { id: 'N_BUTILAMINA', label: 'n-Butilamina', ppm: '4', mgM3: '12', grau: 'maximo', valorTeto: true, absorcaoPele: true },
  {
    id: 'BUTIL_CELLOSOLVE',
    label: 'Butil cellosolve',
    sinonimos: ['2-Butóxi etanol', 'Éter monobutílico do etileno glicol'],
    ppm: '39',
    mgM3: '190',
    grau: 'medio',
    absorcaoPele: true,
  },
  { id: 'N_BUTIL_MERCAPTANA', label: 'n-Butil mercaptana', sinonimos: ['1-Butanotiol'], ppm: '0,4', mgM3: '1,2', grau: 'medio' },
  { id: 'CHUMBO', label: 'Chumbo', mgM3: '0,1', grau: 'maximo' },
  { id: 'CIANOGENIO', label: 'Cianogênio', ppm: '8', mgM3: '16', grau: 'maximo' },
  { id: 'CICLOHEXANO', label: 'Ciclohexano', ppm: '235', mgM3: '820', grau: 'medio' },
  { id: 'CICLOHEXANOL', label: 'Ciclohexanol', ppm: '40', mgM3: '160', grau: 'maximo' },
  { id: 'CICLOHEXILAMINA', label: 'Ciclohexilamina', ppm: '8', mgM3: '32', grau: 'maximo', absorcaoPele: true },
  { id: 'CLORETO_DE_ETILA', label: 'Cloreto de etila', sinonimos: ['Cloroetano'], ppm: '780', mgM3: '2030', grau: 'medio' },
  { id: 'CLORETO_DE_METILA', label: 'Cloreto de metila', ppm: '78', mgM3: '165', grau: 'maximo' },
  { id: 'CLORETO_DE_METILENO', label: 'Cloreto de metileno', sinonimos: ['Diclorometano'], ppm: '156', mgM3: '560', grau: 'maximo' },
  { id: 'CLORETO_DE_VINILA', label: 'Cloreto de vinila', sinonimos: ['Cloroetílico'], ppm: '156', mgM3: '398', grau: 'maximo', valorTeto: true },
  { id: 'CLORETO_DE_VINILIDENO', label: 'Cloreto de vinilideno', sinonimos: ['1,1 Dicloreotileno'], ppm: '8', mgM3: '31', grau: 'maximo' },
  { id: 'CLORO', label: 'Cloro', ppm: '0,8', mgM3: '2,3', grau: 'maximo' },
  { id: 'CLOROBENZENO', label: 'Clorobenzeno', sinonimos: ['Cloreto de fenila'], ppm: '59', mgM3: '275', grau: 'medio' },
  { id: 'CLOROBROMOMETANO', label: 'Clorobromometano', ppm: '156', mgM3: '820', grau: 'maximo' },
  { id: 'CLORODIFLUOMETANO', label: 'Clorodifluometano (freon 22)', sinonimos: ['Freon 22'], ppm: '780', mgM3: '2730', grau: 'minimo' },
  { id: 'CLOROFORMIO', label: 'Clorofórmio', sinonimos: ['Triclorometano'], ppm: '20', mgM3: '94', grau: 'maximo' },
  { id: 'CLORO_1_NITROPROPANO', label: '1-Cloro 1-nitropropano', ppm: '16', mgM3: '78', grau: 'maximo' },
  { id: 'CLOROPRENE', label: 'Cloroprene', ppm: '20', mgM3: '70', grau: 'maximo', absorcaoPele: true },
  { id: 'CUMENO', label: 'Cumeno', sinonimos: ['Isopropil benzeno'], ppm: '39', mgM3: '190', grau: 'maximo', absorcaoPele: true },
  { id: 'DECABORANO', label: 'Decaborano', ppm: '0,04', mgM3: '0,25', grau: 'maximo', absorcaoPele: true },
  { id: 'DEMETON', label: 'Demeton', sinonimos: ['Systox'], ppm: '0,008', mgM3: '0,08', grau: 'maximo', absorcaoPele: true },
  { id: 'DIBORANO', label: 'Diborano', ppm: '0,08', mgM3: '0,08', grau: 'maximo' },
  { id: 'DIBRAMOETANO_1_2', label: '1,2-Dibramoetano', ppm: '16', mgM3: '110', grau: 'medio', absorcaoPele: true },
  { id: 'O_DICLOROBENZENO', label: 'o-Diclorobenzeno', ppm: '39', mgM3: '235', grau: 'maximo' },
  { id: 'DICLORODIFLUORMETANO', label: 'Diclorodifluormetano (freon 12)', sinonimos: ['Freon 12'], ppm: '780', mgM3: '3860', grau: 'minimo', valorTeto: true },
  { id: 'DICLOROETANO_1_1', label: '1,1 Dicloroetano', ppm: '156', mgM3: '640', grau: 'medio' },
  { id: 'DICLOROETANO_1_2', label: '1,2 Dicloroetano', ppm: '39', mgM3: '156', grau: 'maximo' },
  { id: 'DICLOROETILENO_1_2', label: '1,2 Dicloroetileno', ppm: '155', mgM3: '615', grau: 'medio' },
  { id: 'DICLORO_1_NITROETANO_1_1', label: '1,1 Dicloro-1-nitroetano', ppm: '8', mgM3: '47', grau: 'maximo', valorTeto: true },
  { id: 'DICLOROPROPANO_1_2', label: '1,2 Dicloropropano', ppm: '59', mgM3: '275', grau: 'maximo' },
  { id: 'DICLOROTETRAFLUORETANO', label: 'Diclorotetrafluoretano (freon 114)', sinonimos: ['Freon 114'], ppm: '780', mgM3: '5460', grau: 'minimo' },
  { id: 'DIETIL_AMINA', label: 'Dietil amina', ppm: '20', mgM3: '59', grau: 'medio' },
  { id: 'ETER_ETILICO', label: 'Éter etílico', sinonimos: ['Dietil éter'], ppm: '310', mgM3: '940', grau: 'medio' },
  {
    id: 'DIISOCIANATO_DE_TOLUENO_2_4',
    label: '2,4 Diisocianato de tolueno (TDI)',
    sinonimos: ['Tolueno-2,4-diisocianato (TDI)'],
    ppm: '0,016',
    mgM3: '0,11',
    grau: 'maximo',
    valorTeto: true,
  },
  { id: 'DIISOPROPILAMINA', label: 'Diisopropilamina', ppm: '4', mgM3: '16', grau: 'maximo', absorcaoPele: true },
  { id: 'DIMETILACETAMIDA', label: 'Dimetilacetamida', ppm: '8', mgM3: '28', grau: 'maximo', absorcaoPele: true },
  { id: 'DIMETILAMINA', label: 'Dimetilamina', ppm: '8', mgM3: '14', grau: 'medio' },
  { id: 'DIMETIFORMAMIDA', label: 'Dimetiformamida', ppm: '8', mgM3: '24', grau: 'medio' },
  { id: 'DIMETIL_HIDRAZINA', label: 'l,l Dimetil hidrazina', ppm: '0,4', mgM3: '0,8', grau: 'maximo', absorcaoPele: true },
  { id: 'DIOXIDO_DE_CARBONO', label: 'Dióxido de carbono', sinonimos: ['Gás carbônico'], ppm: '3900', mgM3: '7020', grau: 'minimo' },
  { id: 'DIOXIDO_DE_CLORO', label: 'Dióxido de cloro', ppm: '0,08', mgM3: '0,25', grau: 'maximo' },
  { id: 'DIOXIDO_DE_ENXOFRE', label: 'Dióxido de enxofre', sinonimos: ['Anidro sulfuroso'], ppm: '4', mgM3: '10', grau: 'maximo' },
  { id: 'DIOXIDO_DE_NITROGENIO', label: 'Dióxido de nitrogênio', ppm: '4', mgM3: '7', grau: 'maximo', valorTeto: true },
  { id: 'DISSULFETO_DE_CARBONO', label: 'Dissulfeto de carbono', ppm: '16', mgM3: '47', grau: 'maximo', absorcaoPele: true },
  { id: 'ESTIBINA', label: 'Estibina', sinonimos: ['Hidreto de antimônio'], ppm: '0,08', mgM3: '0,4', grau: 'maximo' },
  { id: 'ESTIRENO', label: 'Estireno', sinonimos: ['Vinibenzeno'], ppm: '78', mgM3: '328', grau: 'medio' },
  { id: 'ETANO', label: 'Etano', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'ETANOTIOL', label: 'Etil mercaptana', sinonimos: ['Etanotiol'], ppm: '0,4', mgM3: '0,8', grau: 'medio' },
  { id: 'ETER_DECLOROETILICO', label: 'Éter decloroetílico', ppm: '4', mgM3: '24', grau: 'maximo', absorcaoPele: true },
  {
    id: 'ETOXIETANOL_2',
    label: '2-Etoxietanol',
    sinonimos: ['Cellosolve', 'Éter monoetílico do etileno glicol'],
    ppm: '78',
    mgM3: '290',
    grau: 'medio',
    absorcaoPele: true,
  },
  { id: 'ETILAMINA', label: 'Etilamina', ppm: '8', mgM3: '14', grau: 'maximo' },
  { id: 'ETILBENZENO', label: 'Etilbenzeno', ppm: '78', mgM3: '340', grau: 'medio' },
  { id: 'ETILENO', label: 'Etileno', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'ETILENOIMINA', label: 'Etilenoimina', ppm: '0,4', mgM3: '0,8', grau: 'maximo', absorcaoPele: true },
  { id: 'N_ETIL_MORFOLINA', label: 'n-Etil morfolina', ppm: '16', mgM3: '74', grau: 'medio', absorcaoPele: true },
  { id: 'FENOL', label: 'Fenol', ppm: '4', mgM3: '15', grau: 'maximo', absorcaoPele: true },
  { id: 'FLUORTRICLOROMETANO', label: 'Fluortriclorometano (freon 11)', sinonimos: ['Freon 11'], ppm: '780', mgM3: '4370', grau: 'medio' },
  { id: 'FORMALDEIDO', label: 'Formaldeído (formol)', sinonimos: ['Aldeído fórmico'], ppm: '1,6', mgM3: '2,3', grau: 'maximo', valorTeto: true },
  { id: 'FOSFINA', label: 'Fosfina (fosfamina)', ppm: '0,23', mgM3: '0,3', grau: 'maximo' },
  { id: 'FOSGENIO', label: 'Fosgênio', sinonimos: ['Cloreto de carbonila'], ppm: '0,08', mgM3: '0,3', grau: 'maximo' },
  { id: 'GAS_SULFIDRICO', label: 'Gás sulfídrico', sinonimos: ['Sulfeto de hidrogênio'], ppm: '8', mgM3: '12', grau: 'maximo' },
  { id: 'HELIO', label: 'Hélio', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'HIDRAZINA', label: 'Hidrazina', sinonimos: ['Diamina'], ppm: '0,08', mgM3: '0,08', grau: 'maximo', absorcaoPele: true },
  { id: 'HIDROGENIO', label: 'Hidrogênio', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'ISOPROPILAMINA', label: 'Isopropilamina', ppm: '4', mgM3: '9,5', grau: 'medio' },
  { id: 'MERCURIO', label: 'Mercúrio (todas as formas exceto orgânicas)', mgM3: '0,04', grau: 'maximo' },
  { id: 'METACRILATO_DE_METILA', label: 'Metacrilato de metila', ppm: '78', mgM3: '320', grau: 'minimo' },
  { id: 'METANO', label: 'Metano', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'METILAMINA', label: 'Metilamina', ppm: '8', mgM3: '9,5', grau: 'maximo' },
  {
    id: 'METIL_CELLOSOLVE',
    label: 'Metil cellosolve',
    sinonimos: ['Éter monometílico do etileno glicol', '2-Metoxi etanol'],
    ppm: '20',
    mgM3: '60',
    grau: 'maximo',
    absorcaoPele: true,
  },
  { id: 'METIL_CICLOHEXANOL', label: 'Metil ciclohexanol', ppm: '39', mgM3: '180', grau: 'medio' },
  { id: 'METILCLOROFORMIO', label: 'Metilclorofórmio', sinonimos: ['1,1,1 Tricloroetano'], ppm: '275', mgM3: '1480', grau: 'medio' },
  { id: 'METIL_DEMETON', label: 'Metil demeton', mgM3: '0,4', grau: 'maximo', absorcaoPele: true },
  { id: 'METIL_ETIL_CETONA', label: 'metil etil cetona', sinonimos: ['Butanona'], ppm: '155', mgM3: '460', grau: 'medio' },
  { id: 'METIL_ISOBUTILCARBINOL', label: 'Metil isobutilcarbinol', sinonimos: ['Álcool metil amílico'], ppm: '20', mgM3: '78', grau: 'maximo', absorcaoPele: true },
  { id: 'METIL_MERCAPTANA', label: 'Metil mercaptana (metanotiol)', ppm: '0,4', mgM3: '0,8', grau: 'medio' },
  { id: 'MONOMETIL_HIDRAZINA', label: 'Monometil hidrazina', ppm: '0,16', mgM3: '0,27', grau: 'maximo', valorTeto: true, absorcaoPele: true },
  { id: 'MONOXIDO_DE_CARBONO', label: 'Monóxido de carbono', ppm: '39', mgM3: '43', grau: 'maximo' },
  {
    id: 'NEGRO_DE_FUMO',
    label: 'Negro de fumo',
    mgM3: '3,5',
    grau: 'maximo',
    nota: 'Incluído pela Portaria DNSST n.º 09, de 09 de outubro de 1992.',
  },
  { id: 'NEONIO', label: 'Neônio', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'NIQUEL_CARBONILA', label: 'Níquel carbonila (níquel tetracarbonila)', ppm: '0,04', mgM3: '0,28', grau: 'maximo' },
  { id: 'NITRATO_DE_N_PROPILA', label: 'Nitrato de n-propila', ppm: '20', mgM3: '85', grau: 'maximo' },
  { id: 'NITROETANO', label: 'Nitroetano', ppm: '78', mgM3: '245', grau: 'medio' },
  { id: 'NITROMETANO', label: 'Nitrometano', ppm: '78', mgM3: '195', grau: 'maximo' },
  { id: 'NITROPROPANO_1', label: '1 - Nitropropano', ppm: '20', mgM3: '70', grau: 'medio' },
  { id: 'NITROPROPANO_2', label: '2 - Nitropropano', ppm: '20', mgM3: '70', grau: 'medio' },
  { id: 'OXIDO_DE_ETILENO', label: 'Óxido de etileno', ppm: '39', mgM3: '70', grau: 'maximo' },
  { id: 'OXIDO_NITRICO', label: 'Óxido nítrico (NO)', ppm: '20', mgM3: '23', grau: 'maximo' },
  { id: 'OXIDO_NITROSO', label: 'Óxido nitroso (N₂O)', sinonimos: ['N2O'], grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'OZONA', label: 'Ozona', ppm: '0,08', mgM3: '0,16', grau: 'maximo' },
  { id: 'PENTABORANO', label: 'Pentaborano', ppm: '0,004', mgM3: '0,008', grau: 'maximo' },
  { id: 'N_PENTANO', label: 'n-Pentano', ppm: '470', mgM3: '1400', grau: 'minimo' },
  { id: 'PERCLOROETILENO', label: 'Percloroetileno', sinonimos: ['Tetracloroetileno'], ppm: '78', mgM3: '525', grau: 'medio', absorcaoPele: true },
  { id: 'PIRIDINA', label: 'Piridina', ppm: '4', mgM3: '12', grau: 'medio' },
  { id: 'N_PROPANO', label: 'n-propano', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'PROPILENO', label: 'Propileno', grau: 'nao_caracterizado', asfixianteSimples: true },
  { id: 'PROPILENO_IMINA', label: 'Propileno imina', ppm: '1,6', mgM3: '4', grau: 'maximo', absorcaoPele: true },
  { id: 'SULFATO_DE_DIMETILA', label: 'Sulfato de dimetila', ppm: '0,08', mgM3: '0,4', grau: 'maximo', valorTeto: true, absorcaoPele: true },
  { id: 'TETRABROMOETANO_1_1_2_2', label: '1,1,2,2,Tetrabromoetano', ppm: '0,8', mgM3: '11', grau: 'medio' },
  { id: 'TETRACLORETO_DE_CARBONO', label: 'Tetracloreto de carbono', ppm: '8', mgM3: '50', grau: 'maximo', absorcaoPele: true },
  { id: 'TETRACLOROETANO', label: 'Tetracloroetano', ppm: '4', mgM3: '27', grau: 'maximo', absorcaoPele: true },
  { id: 'TETRAHIDROFURANO', label: 'Tetrahidrofurano', ppm: '156', mgM3: '460', grau: 'maximo' },
  { id: 'TOLUENO', label: 'Tolueno (toluol)', ppm: '78', mgM3: '290', grau: 'medio', absorcaoPele: true },
  { id: 'TRICLOROETANO_1_1_2', label: '1,1,2 Tricloroetano', sinonimos: ['Tricloreto de vinila'], ppm: '8', mgM3: '35', grau: 'medio', absorcaoPele: true },
  { id: 'TRICLOROETILENO', label: 'Tricloroetileno', ppm: '78', mgM3: '420', grau: 'maximo' },
  { id: 'TRICLOROPROPANO_1_2_3', label: '1,2,3 Tricloropropano', ppm: '40', mgM3: '235', grau: 'maximo' },
  {
    id: 'TRICLORO_TRIFLUORETANO_1_1_2',
    label: '1,1,2 Tricloro-1,2,2 trifluoretano (freon 113)',
    sinonimos: ['Freon 113'],
    ppm: '780',
    mgM3: '5930',
    grau: 'medio',
  },
  { id: 'TRIETILAMINA', label: 'Trietilamina', ppm: '20', mgM3: '78', grau: 'maximo' },
  { id: 'TRIFLUORMONOBRAMOMETANO', label: 'Trifluormonobramometano', ppm: '780', mgM3: '4760', grau: 'medio' },
  { id: 'XILENO', label: 'Xileno (xilol)', ppm: '78', mgM3: '340', grau: 'medio', absorcaoPele: true },
]

function limiteTolerancia(item: SubstanciaFonte): string {
  if (item.asfixianteSimples) {
    return 'Asfixiante simples (oxigênio mínimo de 18% em volume)'
  }

  return [
    item.ppm ? `${item.ppm} ppm` : undefined,
    item.mgM3 ? `${item.mgM3} mg/m³` : undefined,
  ].filter(Boolean).join(' | ')
}

function unidadeLimite(item: SubstanciaFonte): string {
  if (item.asfixianteSimples) return '% O₂ em volume'
  if (item.ppm && item.mgM3) return 'ppm | mg/m³'
  return item.ppm ? 'ppm' : 'mg/m³'
}

function marcadoresNormativos(item: SubstanciaFonte): string | undefined {
  const marcadores = [
    item.valorTeto ? 'Valor teto.' : undefined,
    item.absorcaoPele ? 'Absorção também pela pele.' : undefined,
    item.asfixianteSimples
      ? 'Asfixiante simples: concentração mínima de oxigênio de 18% em volume.'
      : undefined,
    item.nota,
  ].filter(Boolean)

  return marcadores.length > 0 ? marcadores.join(' ') : undefined
}

export const SUBSTANCIAS_ANEXO_11: readonly ReferenciaNormativa[] = SUBSTANCIAS_FONTE.map(item => ({
  id: `ANEXO_11_${item.id}`,
  anexoId: 'ANEXO_11',
  label: item.label,
  sinonimos: item.sinonimos,
  cas: item.cas,
  limites: {
    ...(item.ppm ? { ppm: item.ppm } : {}),
    ...(item.mgM3 ? { 'mg/m³': item.mgM3 } : {}),
    ...(item.asfixianteSimples ? { '% O₂ em volume': '18' } : {}),
  },
  tipo: 'quimico',
  criterio: 'quantitativo',
  limiteTolerancia: limiteTolerancia(item),
  unidadeLimite: unidadeLimite(item),
  grau: item.grau,
  atividadeEnquadrada: marcadoresNormativos(item),
}))
