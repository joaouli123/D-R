export type LinhaEpiRecebida = {
  categoria: string
  modelo: string
  marca: string
  ca: string
  anexos: string
  observacao: string
}

export type AplicacaoEpi = {
  anexo: string
  categoria: string
}

type CasSeparados = {
  caUnico: string | null
  caPecaFacial: string | null
  caFiltroCartucho: string | null
}

export type EpiCatalogoComAplicacoes = {
  id: string
  chave: string
  modelo: string
  marca: string
  caUnico: string | null
  caPecaFacial: string | null
  caFiltroCartucho: string | null
  observacao: string | null
  ativo: boolean
  aplicacoes: AplicacaoEpi[]
}

const OBSERVACAO_CA_DUPLO = 'CA peça facial / CA cartucho. Ambos necessários para a validade do conjunto.'
const OBSERVACAO_CA_UNICO = 'CA único (Peça Facial Filtrante - PFF).'

const linha = (
  categoria: string,
  modelo: string,
  marca: string,
  ca: string,
  anexos: string,
): LinhaEpiRecebida => ({
  categoria,
  modelo,
  marca,
  ca,
  anexos,
  observacao: ca.includes('/') ? OBSERVACAO_CA_DUPLO : OBSERVACAO_CA_UNICO,
})

// Transcrição das 61 linhas não vazias das três planilhas recebidas.
export const LINHAS_EPI_RECEBIDAS: LinhaEpiRecebida[] = [
  linha('Vapores Orgânicos', '3M 6200 + Cartucho 3M 6001', '3M', '4115 / 5635', 'Anexo 11'),
  linha('Vapores Orgânicos', '3M 7502 + Cartucho 3M 6001', '3M', '12069 / 5635', 'Anexo 11'),
  linha('Vapores Orgânicos', '3M 6800 + Cartucho 3M 6001', '3M', '3943 / 5635', 'Anexo 11'),
  linha('Vapores Orgânicos', 'Honeywell North 5500 + Cartucho N75001', 'Honeywell', '13694 / 16843', 'Anexo 11'),
  linha('Vapores Orgânicos', 'Honeywell North 7700 + Cartucho N75001', 'Honeywell', '13694 / 16843', 'Anexo 11'),
  linha('Gases Ácidos', '3M 6200 + Cartucho 3M 6002', '3M', '4115 / 5636', 'Anexo 11'),
  linha('Gases Ácidos', '3M 7502 + Cartucho 3M 6002', '3M', '12069 / 5636', 'Anexo 11'),
  linha('Amônia e Aminas', '3M 6200 + Cartucho 3M 6004', '3M', '4115 / 5638', 'Anexo 11'),
  linha('Amônia e Aminas', '3M 7502 + Cartucho 3M 6004', '3M', '12069 / 5638', 'Anexo 11'),
  linha('Multigases', '3M 6200 + Cartucho 3M 60926', '3M', '4115 / 5640', 'Anexo 11'),
  linha('Multigases', '3M 7502 + Cartucho 3M 6006', '3M', '12069 / 5640', 'Anexo 11'),
  linha('Multigases', '3M 6800 + Cartucho 3M 6006', '3M', '3943 / 5640', 'Anexo 11'),
  linha('Particulados', 'PFF2 (S) 3M 8210', '3M', '5657', 'Anexo 12, 13'),
  linha('Particulados', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
  linha('Particulados', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
  linha('Particulados', 'PFF1 3M 8110S', '3M', '38389', 'Anexo 12'),
  linha('Vapores Orgânicos', 'MSA Advantage 200 LS + Cartucho GME', 'MSA', '8558 / 12693', 'Anexo 11'),
  linha('Vapores Orgânicos', 'Libus Série 9000 + Cartucho Libus A1', 'Libus', '37706 / 37707', 'Anexo 11'),
  linha('Gases Ácidos', 'MSA Advantage 200 LS + Cartucho GA', 'MSA', '8558 / 12694', 'Anexo 11'),
  linha('Gases Ácidos', 'Libus Série 9000 + Cartucho Libus AG1', 'Libus', '37706 / 37708', 'Anexo 11'),
  linha('Formaldeído', '3M 6200 + Cartucho 3M 6003', '3M', '4115 / 5637', 'Anexo 11, 13'),
  linha('Formaldeído', 'MSA Advantage 200 LS + Cartucho Multi', 'MSA', '8558 / 14757', 'Anexo 11, 13'),
  linha('Mercúrio', '3M 6200 + Cartucho 3M 6005', '3M', '4115 / 12067', 'Anexo 11, 13'),
  linha('Mercúrio', 'MSA Advantage 200 LS + Cartucho Mercúrio', 'MSA', '8558 / 31393', 'Anexo 11, 13'),
  linha('Particulados', 'PFF2 (S) 3M 8210', '3M', '5657', 'Anexo 12, 13'),
  linha('Particulados', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
  linha('Particulados', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
  linha('Formaldeído', '3M 6200 + Cartucho 3M 6003', '3M', '4115 / 5637', 'Anexo 11, 13'),
  linha('Formaldeído', 'MSA Advantage 200 LS + Cartucho Multi', 'MSA', '8558 / 14757', 'Anexo 11, 13'),
  linha('Mercúrio', '3M 6200 + Cartucho 3M 6005', '3M', '4115 / 12067', 'Anexo 11, 13'),
  linha('Mercúrio', 'MSA Advantage 200 LS + Cartucho Mercúrio', 'MSA', '8558 / 31393', 'Anexo 11, 13'),
  linha('Negro de Fumo', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
  linha('Negro de Fumo', 'PFF2 MSA Affinity', 'MSA', '39420', 'Anexo 12, 13'),
  linha('Negro de Fumo', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
  linha('Particulados / PFF2', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
  linha('Particulados / PFF2', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
  linha('Particulados / PFF2', 'PFF2 MSA Affinity 1100', 'MSA', '39420', 'Anexo 12, 13'),
  linha('Particulados / PFF2', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 Delta Plus FFP3', 'Delta Plus', '41503', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 MSA Advantage PFF3', 'MSA', '40123', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 Libus 1800', 'Libus', '40500', 'Anexo 12, 13'),
  linha('Particulados', 'PFF2 (S) 3M 8210', '3M', '5657', 'Anexo 12, 13'),
  linha('Particulados', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
  linha('Particulados', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
  linha('Particulados', 'PFF1 3M 8110S', '3M', '38389', 'Anexo 12'),
  linha('Negro de Fumo', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
  linha('Negro de Fumo', 'PFF2 MSA Affinity', 'MSA', '39420', 'Anexo 12, 13'),
  linha('Negro de Fumo', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
  linha('Particulados / PFF1', 'PFF1 3M 8110S', '3M', '38389', 'Anexo 12'),
  linha('Particulados / PFF1', 'PFF1 Delta Plus FFP1', 'Delta Plus', '41500', 'Anexo 12'),
  linha('Particulados / PFF1', 'PFF1 Libus 1500', 'Libus', '37975', 'Anexo 12'),
  linha('Particulados / PFF1', 'PFF1 Air Safety Classic PFF1', 'Air Safety', '18010', 'Anexo 12'),
  linha('Particulados / PFF2', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
  linha('Particulados / PFF2', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
  linha('Particulados / PFF2', 'PFF2 MSA Affinity 1100', 'MSA', '39420', 'Anexo 12, 13'),
  linha('Particulados / PFF2', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 Delta Plus FFP3', 'Delta Plus', '41503', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 MSA Advantage PFF3', 'MSA', '40123', 'Anexo 12, 13'),
  linha('Particulados / PFF3', 'PFF3 Libus 1800', 'Libus', '40500', 'Anexo 12, 13'),
]

export function separarCas(ca: string): CasSeparados {
  const partes = ca.split('/').map((parte) => parte.trim()).filter(Boolean)
  return partes.length > 1
    ? { caPecaFacial: partes[0] ?? null, caFiltroCartucho: partes[1] ?? null, caUnico: null }
    : { caPecaFacial: null, caFiltroCartucho: null, caUnico: partes[0] ?? null }
}

function anexosIndependentes(anexos: string): string[] {
  return anexos.split(',').map((parte, indice) => {
    const valor = parte.trim()
    return indice === 0 || valor.startsWith('Anexo') ? valor : `Anexo ${valor}`
  })
}

function chaveEpi(linhaRecebida: LinhaEpiRecebida) {
  const cas = separarCas(linhaRecebida.ca)
  return [
    linhaRecebida.marca,
    linhaRecebida.modelo,
    cas.caUnico ?? '',
    cas.caPecaFacial ?? '',
    cas.caFiltroCartucho ?? '',
  ]
    .join('|')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
}

export function configuracoesUnicas(linhas: LinhaEpiRecebida[]): EpiCatalogoComAplicacoes[] {
  const porChave = new Map<string, EpiCatalogoComAplicacoes>()

  for (const linhaRecebida of linhas) {
    const chave = chaveEpi(linhaRecebida)
    const cas = separarCas(linhaRecebida.ca)
    const configuracao: EpiCatalogoComAplicacoes = porChave.get(chave) ?? {
      id: chave,
      chave,
      modelo: linhaRecebida.modelo,
      marca: linhaRecebida.marca,
      ...cas,
      observacao: linhaRecebida.observacao,
      ativo: true,
      aplicacoes: [],
    }
    const aplicacoes = anexosIndependentes(linhaRecebida.anexos).map((anexo) => ({
      anexo,
      categoria: linhaRecebida.categoria,
    }))
    for (const aplicacao of aplicacoes) {
      if (!configuracao.aplicacoes.some((atual) => atual.anexo === aplicacao.anexo && atual.categoria === aplicacao.categoria)) {
        configuracao.aplicacoes.push(aplicacao)
      }
    }
    porChave.set(chave, configuracao)
  }

  return [...porChave.values()]
}

export function sugerirEpis(categoria: string | undefined, anexo: string, itens: EpiCatalogoComAplicacoes[]) {
  return itens
    .filter((item) => item.ativo && item.aplicacoes.some((a) => a.anexo === anexo))
    .sort((a, b) => {
      const categoriasA = a.aplicacoes.filter((x) => x.anexo === anexo).map((x) => x.categoria)
      const categoriasB = b.aplicacoes.filter((x) => x.anexo === anexo).map((x) => x.categoria)
      const pa = categoriasA.includes(categoria ?? '') ? 0 : categoriasA.includes('Multigases') ? 1 : 2
      const pb = categoriasB.includes(categoria ?? '') ? 0 : categoriasB.includes('Multigases') ? 1 : 2
      return pa - pb || a.modelo.localeCompare(b.modelo, 'pt-BR')
    })
}
