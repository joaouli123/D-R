import type { DadosCnpj, DadosProcesso } from '@/services/api'
import type { Empresa, Pericia } from '@/types'
import { formatDate } from '@/lib/utils'

// ============================================================
// Regras de preenchimento a partir das fontes públicas.
//
// A consulta em si é do servidor; aqui fica a decisão de o que fazer
// com o que voltou — que é onde mora a única escolha delicada:
//
//   · busca automática (o perito acabou de digitar o número num
//     cadastro em branco) preenche apenas o que está vazio. Nada do
//     que ele escreveu é reescrito por um efeito colateral;
//   · busca pelo botão é pedido explícito de atualizar, e aí o dado
//     oficial substitui o que estiver lá.
//
// UF e grau de risco fogem à regra do "só se estiver vazio": o
// formulário nasce com "SP" e com grau 3, e esses valores são padrão
// de tela, não algo digitado. Como a busca automática só sai em
// cadastro em branco, o que está neles ali é sempre o padrão.
// ============================================================

export const digitos = (valor: string) => (valor ?? '').replace(/\D/g, '')

export const cnpjCompleto = (valor: string) => digitos(valor).length === 14

export const numeroProcessoCompleto = (valor: string) => digitos(valor).length === 20

const vazio = (valor: unknown) => !String(valor ?? '').trim()

type CampoDaReceita =
  | 'razaoSocial'
  | 'nomeFantasia'
  | 'cnae'
  | 'grauRisco'
  | 'endereco'
  | 'numero'
  | 'complemento'
  | 'bairro'
  | 'cidade'
  | 'uf'
  | 'cep'
  | 'contatoEmail'
  | 'contatoTelefone'
  | 'ramoAtividade'

export interface OpcoesPreenchimento {
  /** true quando o perito pediu a consulta pelo botão. */
  sobrescrever?: boolean
}

/** Campos que o formulário já traz preenchidos por conta própria. */
const PADRAO_DE_TELA = new Set<CampoDaReceita>(['uf', 'grauRisco'])

function apenasVazios<T extends object>(vindos: T, jaTem: (campo: keyof T) => boolean): T {
  const patch = {} as T
  for (const campo of Object.keys(vindos) as (keyof T)[]) {
    if (!jaTem(campo)) patch[campo] = vindos[campo]
  }
  return patch
}

/** O que o cadastro da Receita tem a dizer sobre os campos da empresa. */
export function patchDaReceita(
  atual: Empresa,
  dados: DadosCnpj,
  opcoes: OpcoesPreenchimento = {},
): Partial<Empresa> {
  const vindos: Partial<Pick<Empresa, CampoDaReceita>> = {}
  const por = (campo: Exclude<CampoDaReceita, 'grauRisco'>, valor: string | null | undefined) => {
    const limpo = String(valor ?? '').trim()
    if (limpo) vindos[campo] = limpo
  }

  por('razaoSocial', dados.razaoSocial)
  por('nomeFantasia', dados.nomeFantasia)
  por('cnae', dados.cnae)
  // Grau do Anexo I da NR-04 para a classe deste CNAE. É transcrição
  // de norma, não estimativa — mas o perito confere pela atividade do
  // setor avaliado, que nem sempre é a atividade principal da empresa.
  if (dados.grauRisco) vindos.grauRisco = dados.grauRisco
  por('endereco', dados.endereco)
  por('numero', dados.numero)
  por('complemento', dados.complemento)
  por('bairro', dados.bairro)
  por('cidade', dados.cidade)
  por('uf', dados.uf)
  por('cep', dados.cep)
  por('contatoEmail', dados.email)
  por('contatoTelefone', dados.telefone)
  // Ramo de atividade é texto do perito na maior parte dos cadastros;
  // a descrição do CNAE entra como ponto de partida.
  por('ramoAtividade', dados.cnaeDescricao)

  if (opcoes.sobrescrever) return vindos

  return apenasVazios(vindos, (campo) => !PADRAO_DE_TELA.has(campo) && !vazio(atual[campo]))
}

/** Vara e comarca a partir do que o CNJ publica. As partes, não: ver `aviso`. */
export function patchDoProcesso(
  atual: Pericia,
  dados: DadosProcesso,
  opcoes: OpcoesPreenchimento = {},
): Partial<Pericia> {
  const vindos: Partial<Record<'vara' | 'comarca', string>> = {}
  if (dados.vara?.trim()) vindos.vara = dados.vara.trim()
  if (dados.comarca?.trim()) vindos.comarca = dados.comarca.trim()

  if (opcoes.sobrescrever) return vindos

  return apenasVazios(vindos, (campo) => !vazio(atual[campo]))
}

/** Linha de conferência mostrada embaixo do campo de CNPJ. */
export function resumoDaReceita(dados: DadosCnpj): string {
  return [
    dados.razaoSocial,
    dados.situacao,
    dados.cidade && dados.uf ? `${dados.cidade}/${dados.uf}` : dados.cidade,
  ]
    .filter((parte) => !!parte && String(parte).trim())
    .join(' · ')
}

/**
 * De onde saiu o grau de risco preenchido. O perito precisa ver a
 * premissa: o grau é o da classe do CNAE principal, e o setor avaliado
 * pode ter atividade diferente da que a empresa registrou.
 */
export function origemDoGrauRisco(dados: DadosCnpj): string | null {
  if (!dados.grauRisco) return null
  const classe = dados.grauRiscoClasse ? ` para a classe ${dados.grauRiscoClasse}` : ''
  return `Grau de risco ${dados.grauRisco} pelo Anexo I da NR-04${classe} — confira pela atividade do setor avaliado.`
}

/** A empresa está baixada, suspensa ou inapta? O laudo precisa saber. */
export function situacaoIrregular(dados: DadosCnpj): boolean {
  const situacao = (dados.situacao ?? '').trim().toUpperCase()
  return !!situacao && situacao !== 'ATIVA'
}

/** Linha de conferência mostrada embaixo do número do processo. */
export function resumoDoProcesso(dados: DadosProcesso): string {
  return [
    dados.tribunal,
    dados.grauRotulo,
    dados.classe,
    dados.dataAjuizamento ? `ajuizado em ${formatDate(dados.dataAjuizamento)}` : '',
  ]
    .filter((parte) => !!parte && String(parte).trim())
    .join(' · ')
}

/** "Também consta em 2º grau: 9ª Turma — Recurso Ordinário Trabalhista." */
export function outrasInstancias(dados: DadosProcesso): string[] {
  return dados.instancias
    .slice(1)
    .map((instancia) =>
      [instancia.grauRotulo, instancia.orgao, instancia.classe].filter(Boolean).join(' · '),
    )
    .filter((linha) => !!linha)
}
