import { useId, useState } from 'react'
import { Button, Input, Modal, Select, useToast } from '@/components/ui'
import { BuscaCnpj, type OrigemConsulta } from '@/components/BuscaCnpj'
import { CampoCep } from '@/components/CampoCep'
import { useApp } from '@/store/AppStore'
import type { DadosCnpj } from '@/services/api'
import type { Empresa } from '@/types'
import {
  cpfValido,
  emailValido,
  limparDocumento,
  mascararTelefone,
  problemaNoDocumento,
} from '@/lib/cadastro'
import { enderecoDoCep, patchDaReceita } from '@/lib/consultas'
import { uid, UFS } from '@/lib/utils'

// ============================================================
// Cadastro de empresa em janela — o mesmo formulário nos dois
// lugares em que ele aparece.
//
// Na tela de Clientes é o cadastro de sempre. Dentro da perícia é o
// atalho de quem descobriu a reclamada na hora da diligência: cadastra
// ali mesmo e a empresa já entra vinculada ao processo, sem passar pelo
// Módulo B e voltar.
//
// Quem chama decide o que fazer depois de salvar (`onSalvo`); a janela
// só cuida do formulário, da consulta à Receita e do salvamento.
// ============================================================

export const empresaVazia = (): Empresa => ({
  id: uid('emp'),
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  cnae: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: 'SP',
  cep: '',
  contatoNome: '',
  contatoEmail: '',
  contatoTelefone: '',
  ramoAtividade: '',
  criadoEm: new Date().toISOString().slice(0, 10),
})

export interface ModalEmpresaProps {
  /** Empresa a editar, ou `empresaVazia()` para um cadastro novo. */
  inicial: Empresa
  titulo: string
  subtitulo?: string
  onFechar: () => void
  /** Recebe a empresa como o servidor a devolveu. */
  onSalvo?: (empresa: Empresa) => void
}

export function ModalEmpresa({ inicial, titulo, subtitulo, onFechar, onSalvo }: ModalEmpresaProps) {
  const { salvarEmpresa } = useApp()
  const toast = useToast()
  const [empresa, setEmpresa] = useState<Empresa>(inicial)
  const [salvando, setSalvando] = useState(false)
  const idNumero = `${useId()}-numero`
  // Reclamada pessoa física (empregador doméstico, produtor rural): o mesmo
  // campo aceita o CPF, e a razão social vira o nome da pessoa.
  const pessoaFisica = cpfValido(empresa.cnpj)

  const set = (patch: Partial<Empresa>) => setEmpresa((e) => ({ ...e, ...patch }))

  /**
   * Cadastro da Receita chegando no formulário. O patch é calculado
   * dentro do setEmpresa porque a consulta é assíncrona: entre pedir
   * e receber, o perito pode ter digitado em outro campo.
   */
  function aplicarDadosDaReceita(dados: DadosCnpj, origem: OrigemConsulta) {
    setEmpresa((atual) => ({
      ...atual,
      ...patchDaReceita(atual, dados, { sobrescrever: origem === 'manual' }),
    }))
    toast(
      origem === 'manual'
        ? 'Cadastro atualizado com os dados da Receita Federal.'
        : 'Dados da empresa preenchidos pela Receita Federal.',
    )
  }

  async function salvar() {
    if (!empresa.razaoSocial.trim() || !empresa.cnpj.trim()) {
      toast(`${pessoaFisica ? 'Nome' : 'Razão social'} e CPF/CNPJ são obrigatórios.`, 'error')
      return
    }
    // Número que já estava gravado não é reconferido: cadastro antigo com
    // dígito errado segue editável. Número novo ou trocado, sim.
    const problema =
      limparDocumento(empresa.cnpj) !== limparDocumento(inicial.cnpj)
        ? problemaNoDocumento(empresa.cnpj)
        : null
    if (problema) {
      toast(problema, 'error')
      return
    }
    if (empresa.contatoEmail?.trim() && !emailValido(empresa.contatoEmail)) {
      toast('E-mail de contato inválido.', 'error')
      return
    }

    setSalvando(true)
    try {
      const salva = await salvarEmpresa(empresa)
      toast('Empresa salva. Já pode ser reutilizada em qualquer processo.')
      onSalvo?.(salva)
      onFechar()
    } catch (e) {
      // Ex.: CNPJ já cadastrado — a mensagem vem do servidor.
      toast(e instanceof Error ? e.message : 'Não foi possível salvar a empresa.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onFechar}
      title={titulo}
      {...(subtitulo ? { subtitle: subtitulo } : {})}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button loading={salvando} onClick={() => void salvar()}>
            Salvar empresa
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* O CNPJ vem primeiro porque é ele que preenche o resto. */}
        <BuscaCnpj
          valor={empresa.cnpj}
          onChange={(cnpj) => set({ cnpj })}
          onDados={aplicarDadosDaReceita}
          autoBuscar={!empresa.razaoSocial.trim()}
          aceitarCpf
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={pessoaFisica ? 'Nome completo' : 'Razão social'}
            required
            value={empresa.razaoSocial}
            onChange={(e) => set({ razaoSocial: e.target.value })}
          />
          <Input
            label="Nome fantasia"
            value={empresa.nomeFantasia}
            onChange={(e) => set({ nomeFantasia: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Input
            label="CNAE"
            value={empresa.cnae}
            onChange={(e) => set({ cnae: e.target.value })}
            placeholder="00.00-0-00"
          />
          <Select
            label="Grau de risco"
            value={empresa.grauRisco ?? ''}
            onChange={(e) => set({
              grauRisco: e.target.value
                ? e.target.value as NonNullable<Empresa['grauRisco']>
                : undefined,
            })}
            hint="NR-04, conforme a classe do CNAE; ajuste se necessário."
          >
            <option value="">Não informado</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </Select>
          <div className="sm:col-span-2">
            <Input
              label="Ramo de atividade"
              value={empresa.ramoAtividade}
              onChange={(e) => set({ ramoAtividade: e.target.value })}
              hint="Texto reaproveitado na seção 'Descrição da Empresa' do parecer."
            />
          </div>
        </div>

        <div className="border-t border-ink-100 pt-4">
          <p className="section-title mb-3">Endereço</p>
          {/* O CEP antes da rua: fechou os 8 dígitos, o endereço vem sozinho. */}
          <div className="grid gap-4 sm:grid-cols-6">
            <CampoCep
              className="sm:col-span-2"
              valor={empresa.cep ?? ''}
              onChange={(cep) => set({ cep })}
              onEndereco={(dados) => set(enderecoDoCep(dados))}
              focarAoPreencher={idNumero}
            />
            <div className="sm:col-span-4">
              <Input
                label="Logradouro"
                value={empresa.endereco}
                onChange={(e) => set({ endereco: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                id={idNumero}
                label="Número"
                value={empresa.numero}
                onChange={(e) => set({ numero: e.target.value })}
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                label="Complemento"
                placeholder="Sala, bloco, galpão…"
                value={empresa.complemento ?? ''}
                onChange={(e) => set({ complemento: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Input label="Bairro" value={empresa.bairro} onChange={(e) => set({ bairro: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <Input label="Cidade" value={empresa.cidade} onChange={(e) => set({ cidade: e.target.value })} />
            </div>
            <Select label="UF" value={empresa.uf} onChange={(e) => set({ uf: e.target.value })}>
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="border-t border-ink-100 pt-4">
          <p className="section-title mb-3">Contato</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Responsável"
              value={empresa.contatoNome}
              onChange={(e) => set({ contatoNome: e.target.value })}
            />
            <Input
              label="E-mail"
              type="email"
              value={empresa.contatoEmail}
              onChange={(e) => set({ contatoEmail: e.target.value })}
            />
            <Input
              label="Telefone"
              type="tel"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={empresa.contatoTelefone}
              onChange={(e) => set({ contatoTelefone: mascararTelefone(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
