import { useId } from 'react'
import { BuscaCnpj, type OrigemConsulta } from '@/components/BuscaCnpj'
import { CampoCep } from '@/components/CampoCep'
import { Input, Select } from '@/components/ui'
import * as api from '@/services/api'
import type { DadosCnpj } from '@/services/api'
import type { CadastroDaLicenca, Licenca } from '@/types'
import {
  cpfValido,
  emailValido,
  limparDocumento,
  mascararCep,
  mascararTelefone,
  problemaNoDocumento,
} from '@/lib/cadastro'
import { enderecoDoCep } from '@/lib/consultas'
import { UFS } from '@/lib/utils'

// ---------------- Dados da empresa cliente ----------------

/** Como o formulário guarda a empresa: tudo texto, vazio = sem dado. */
export interface FormDaEmpresa {
  documento: string
  nome: string
  nomeFantasia: string
  telefone: string
  email: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

const CAMPOS_DE_CADASTRO = [
  'nomeFantasia',
  'email',
  'telefone',
  'cep',
  'endereco',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
] as const satisfies ReadonlyArray<keyof CadastroDaLicenca & keyof FormDaEmpresa>

export const EMPRESA_EM_BRANCO: FormDaEmpresa = {
  documento: '',
  nome: '',
  nomeFantasia: '',
  telefone: '',
  email: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
}

export function formDaLicenca(l: Licenca): FormDaEmpresa {
  const form: FormDaEmpresa = {
    ...EMPRESA_EM_BRANCO,
    nome: l.nome,
    documento: l.documento ?? '',
  }
  for (const campo of CAMPOS_DE_CADASTRO) form[campo] = l[campo] ?? ''
  return form
}

/**
 * Contato e endereço para a API. Na criação o vazio nem vai; na edição vai
 * como '' — é o que o servidor entende como "apagar".
 */
export function cadastroParaEnviar(
  form: FormDaEmpresa,
  { comVazios }: { comVazios: boolean },
): CadastroDaLicenca {
  const saida: CadastroDaLicenca = {}
  for (const campo of CAMPOS_DE_CADASTRO) {
    const valor = form[campo].trim()
    if (valor || comVazios) saida[campo] = valor
  }
  return saida
}

/**
 * O que o servidor recusaria, dito antes de chamar. O documento só é
 * conferido se for novo: licença antiga com número errado segue editável.
 */
export function problemaNaEmpresa(form: FormDaEmpresa, documentoAnterior?: string): string | null {
  if (form.nome.trim().length < 2) return 'Informe o nome da empresa.'
  const documento = limparDocumento(form.documento)
  if (documento && documento !== limparDocumento(documentoAnterior)) {
    const problema = problemaNoDocumento(documento)
    if (problema) return problema
  }
  if (form.email.trim() && !emailValido(form.email)) return 'E-mail da empresa inválido.'
  return null
}

/**
 * CPF ou CNPJ primeiro: o CNPJ traz da Receita o nome, o contato e o
 * endereço. Depois o CEP, antes da rua, que também preenche o que sabe.
 */
export function CamposDaEmpresa({
  form,
  onChange,
  autoBuscar,
  hintDoNome,
  publico = false,
}: {
  form: FormDaEmpresa
  onChange: (atualizar: (atual: FormDaEmpresa) => FormDaEmpresa) => void
  autoBuscar: boolean
  hintDoNome?: string
  /** Cadastro público, sem login: as consultas saem pelas rotas abertas. */
  publico?: boolean
}) {
  const idNumero = `${useId()}-numero`
  const campo =
    (chave: keyof FormDaEmpresa, mascara?: (valor: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const valor = mascara ? mascara(e.target.value) : e.target.value
      onChange((atual) => ({ ...atual, [chave]: valor }))
    }

  function preencherDaReceita(dados: DadosCnpj, origem: OrigemConsulta) {
    const vindos: Array<[keyof FormDaEmpresa, string | null]> = [
      ['nome', dados.razaoSocial],
      ['nomeFantasia', dados.nomeFantasia],
      ['telefone', dados.telefone],
      ['email', dados.email?.toLowerCase() ?? null],
      ['cep', dados.cep ? mascararCep(dados.cep) : null],
      ['endereco', dados.endereco],
      ['numero', dados.numero],
      ['complemento', dados.complemento],
      ['bairro', dados.bairro],
      ['cidade', dados.cidade],
      ['uf', dados.uf?.toUpperCase() ?? null],
    ]
    // Automática só completa o que está vazio; pelo botão, a Receita manda.
    onChange((atual) => {
      const novo = { ...atual }
      for (const [chave, valor] of vindos) {
        if (!valor?.trim()) continue
        if (origem === 'manual' || !atual[chave].trim()) novo[chave] = valor.trim()
      }
      return novo
    })
  }

  const pessoaFisica = cpfValido(form.documento)

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <BuscaCnpj
        className="sm:col-span-6"
        aceitarCpf
        required={false}
        autoBuscar={autoBuscar}
        valor={form.documento}
        onChange={(documento) => onChange((atual) => ({ ...atual, documento }))}
        onDados={preencherDaReceita}
        consultar={publico ? api.cadastroPublico.cnpj : undefined}
      />
      <div className="sm:col-span-3">
        <Input
          label={pessoaFisica ? 'Nome completo' : 'Nome da empresa'}
          required
          value={form.nome}
          onChange={campo('nome')}
          hint={hintDoNome}
        />
      </div>
      <div className="sm:col-span-3">
        <Input label="Nome fantasia" value={form.nomeFantasia} onChange={campo('nomeFantasia')} />
      </div>
      <div className="sm:col-span-2">
        <Input
          label="Telefone"
          type="tel"
          inputMode="tel"
          placeholder="(00) 00000-0000"
          value={form.telefone}
          onChange={campo('telefone', mascararTelefone)}
        />
      </div>
      <div className="sm:col-span-4">
        <Input
          label="E-mail da empresa"
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={campo('email')}
        />
      </div>

      <p className="border-t border-ink-200 pt-4 text-sm font-semibold text-ink-900 sm:col-span-6">
        Endereço
      </p>
      <CampoCep
        className="sm:col-span-2"
        valor={form.cep}
        onChange={(cep) => onChange((atual) => ({ ...atual, cep }))}
        onEndereco={(dados) => onChange((atual) => ({ ...atual, ...enderecoDoCep(dados) }))}
        focarAoPreencher={idNumero}
        consultar={publico ? api.cadastroPublico.cep : undefined}
      />
      <div className="sm:col-span-4">
        <Input
          label="Endereço"
          placeholder="Rua, avenida, rodovia…"
          value={form.endereco}
          onChange={campo('endereco')}
        />
      </div>
      <div className="sm:col-span-2">
        <Input id={idNumero} label="Número" value={form.numero} onChange={campo('numero')} />
      </div>
      <div className="sm:col-span-4">
        <Input
          label="Complemento"
          placeholder="Sala, bloco, galpão…"
          value={form.complemento}
          onChange={campo('complemento')}
        />
      </div>
      <div className="sm:col-span-2">
        <Input label="Bairro" value={form.bairro} onChange={campo('bairro')} />
      </div>
      <div className="sm:col-span-3">
        <Input label="Cidade" value={form.cidade} onChange={campo('cidade')} />
      </div>
      <div className="sm:col-span-1">
        <Select label="UF" value={form.uf} onChange={campo('uf')}>
          <option value="">—</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}
