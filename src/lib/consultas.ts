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
// A UF foge à regra do "só se estiver vazio": ela nasce com "SP" no
// formulário, e esse "SP" é padrão de tela, não algo digitado.
// ============================================================

export const digitos = (valor: string) => (valor ?? '').replace(/\D/g, '')

export const cnpjCompleto = (valor: string) => digitos(valor).length === 14

export const numeroProcessoCompleto = (valor: string) => digitos(valor).length === 20

const vazio = (valor: unknown) => !String(valor ?? '').trim()

type CampoDaReceita =
  | 'razaoSocial'
  | 'nomeFantasia'
  | 'cnae'
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

function apenasVazios<C extends string>(
  vindos: Partial<Record<C, string>>,
  jaTem: (campo: C) => boolean,
): Partial<Record<C, string>> {
  const patch: Partial<Record<C, string>> = {}
  for (const campo of Object.keys(vindos) as C[]) {
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
  const vindos: Partial<Record<CampoDaReceita, string>> = {}
  const por = (campo: CampoDaReceita, valor: string | null | undefined) => {
    const limpo = String(valor ?? '').trim()
    if (limpo) vindos[campo] = limpo
  }

  por('razaoSocial', dados.razaoSocial)
  por('nomeFantasia', dados.nomeFantasia)
  por('cnae', dados.cnae)
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

  return apenasVazios(vindos, (campo) => campo !== 'uf' && !vazio(atual[campo]))
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
