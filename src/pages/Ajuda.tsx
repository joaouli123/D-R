import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, HelpCircle, LifeBuoy, Mail, Rocket } from 'lucide-react'
import { Badge, Card, CardHeader } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'

// ============================================================
// AJUDA — mapa dos módulos e passo a passo de uso
// ============================================================

const MODULOS = [
  { id: 'A', nome: 'Acesso e Gestão de Usuários', onde: '/configuracoes', desc: 'Login protegido e cadastro dos usuários autorizados.' },
  { id: 'B', nome: 'Cadastro de Empresas', onde: '/clientes', desc: 'Empresa cadastrada uma vez e reutilizada em todos os processos.' },
  { id: 'C', nome: 'Cadastro de Processo e Perícia', onde: '/pericias', desc: 'Processo, reclamadas ilimitadas, participantes, vistoria e modalidade.' },
  { id: 'D', nome: 'Preenchimento Técnico', onde: '/pericias', desc: 'Formulário estruturado seguindo o modelo em Word do Contratante.' },
  { id: 'E', nome: 'Fotografias', onde: '/pericias', desc: 'Imagens organizadas por seção do documento, com legenda.' },
  { id: 'F', nome: 'Biblioteca Pessoal de Textos', onde: '/biblioteca', desc: 'Trechos técnicos reutilizáveis inseridos com um clique.' },
  { id: 'G', nome: 'Salvamento, Edição e Título', onde: '/pericias', desc: 'Rascunho, edição posterior e escolha entre Parecer e Laudo.' },
  { id: 'H', nome: 'Geração do Documento', onde: '/pericias', desc: 'Montagem automática, anexo de PDF externo e exportação PDF/DOCX.' },
  { id: 'I', nome: 'Envio por E-mail', onde: '/documentos', desc: 'Envio direto pela tela, sem baixar e anexar manualmente.' },
  { id: 'J', nome: 'Histórico de Pareceres', onde: '/documentos', desc: 'Busca, visualização, edição e vínculo com empresa e processo.' },
  { id: 'K', nome: 'Quesitos Técnicos (item 17)', onde: '/quesitos', desc: 'Banco pré-cadastrado: selecionar, responder, editar e exportar.' },
  { id: 'L', nome: 'Manifestação ao Laudo (item 18)', onde: '/manifestacao/concordancia', desc: 'Concordância, impugnação ao laudo e ao esclarecimento por agente.' },
]

const FAQ = [
  {
    q: 'Como o sistema monta a Manifestação ao Laudo automaticamente?',
    a: 'Em Manifestação ao Laudo você escolhe o posicionamento (18.1 Concordância, 18.2 Impugnação ao laudo ou 18.3 Impugnação ao esclarecimento) e o agente avaliado (Ruído, Calor, Biológico ou Periculosidade). Ao clicar em "Montar documento automaticamente", a fundamentação legal e os argumentos correspondentes são carregados prontos. Na concordância todos os blocos já vêm marcados — é o texto padrão pronto. Nas impugnações, você marca os argumentos que quiser e edita cada um livremente.',
  },
  {
    q: 'Os quesitos já vêm preenchidos?',
    a: 'Sim. O módulo Quesitos traz uma base pré-cadastrada, organizada por tema (insalubridade, ruído, calor, químicos, biológicos, EPI, periculosidade, ergonomia…) e por origem (Juízo, Reclamante, Reclamada ou do próprio perito). Você filtra, seleciona os aplicáveis ao caso, ajusta as respostas — que já vêm com texto padrão — e exporta. Também é possível cadastrar quesitos próprios, que ficam salvos na sua base.',
  },
  {
    q: 'Posso editar o texto depois que o sistema monta o documento?',
    a: 'Sim, em todos os módulos. Cada bloco carregado automaticamente é editável e você pode acrescentar novos parágrafos, remover argumentos ou inserir trechos da sua Biblioteca Pessoal.',
  },
  {
    q: 'O que são as variáveis {{campo}}?',
    a: 'São marcadores substituídos automaticamente pelos dados do processo vinculado — por exemplo {{funcao}}, {{admissao}}, {{dataVistoria}}. Ao vincular o quesito ou o texto a uma perícia, os valores são preenchidos sozinhos.',
  },
  {
    q: 'Como funciona a exportação?',
    a: 'O documento é gerado em PDF, pronto para assinatura eletrônica na ferramenta que você já utiliza (Clicksign, Autentique, gov.br), e também em formato editável (DOCX). É possível anexar um PDF externo — como um laudo complementar de dosimetria — ao final do documento gerado.',
  },
  {
    q: 'Esta versão já salva os dados no servidor?',
    a: 'Esta é a fase de frontend: as telas estão navegáveis com dados de demonstração e as alterações valem durante a sessão. A troca para o backend (Node + PostgreSQL) acontece em um único arquivo — src/services/api.ts — sem alterar nenhuma tela.',
  },
]

export default function Ajuda() {
  const [aberta, setAberta] = useState<number | null>(0)

  return (
    <>
      <PageHeader
        breadcrumb="Suporte"
        title="Ajuda"
        description="Mapa dos módulos, dúvidas frequentes e canais de suporte."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Mapa dos módulos"
              subtitle="Escopo da Proposta Comercial v1.1 (A–J) e os novos módulos K e L."
              icon={<Rocket size={18} />}
            />
            <div className="divide-y divide-ink-100">
              {MODULOS.map((m) => (
                <Link key={m.id} to={m.onde} className="flex items-start gap-3 px-5 py-3 hover:bg-brand-50/60">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-[12px] font-bold text-white">
                    {m.id}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink-900">{m.nome}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">{m.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Dúvidas frequentes" icon={<HelpCircle size={18} />} />
            <div className="divide-y divide-ink-100">
              {FAQ.map((f, i) => (
                <div key={f.q}>
                  <button
                    onClick={() => setAberta(aberta === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-ink-50"
                  >
                    <span className="text-[13.5px] font-semibold text-ink-800">{f.q}</span>
                    <ChevronDown
                      size={16}
                      className={cn('shrink-0 text-ink-400 transition-transform', aberta === i && 'rotate-180')}
                    />
                  </button>
                  {aberta === i && (
                    <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-600 animate-fade-in">
                      {f.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Suporte técnico" icon={<LifeBuoy size={18} />} />
            <div className="space-y-3 p-5 text-[13px]">
              <div>
                <p className="font-semibold text-ink-800">UX Code Desenvolvimento Web</p>
                <p className="text-ink-500">CNPJ 66.650.579/0001-46</p>
              </div>
              <a
                href="mailto:contato@uxcode.com.br"
                className="flex items-center gap-2 text-brand-700 hover:underline"
              >
                <Mail size={14} /> contato@uxcode.com.br
              </a>
              <div className="border-t border-ink-100 pt-3">
                <p className="text-[12px] text-ink-500">
                  Garantia de 45 dias corridos após a entrega final, cobrindo bugs e falhas de
                  funcionamento dentro do escopo contratado.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Fase atual" />
            <div className="space-y-2.5 p-5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Frontend</span>
                <Badge tone="green">Em desenvolvimento</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Backend / API</span>
                <Badge tone="gray">Próxima fase</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Banco de dados</span>
                <Badge tone="gray">Próxima fase</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Geração PDF/DOCX no servidor</span>
                <Badge tone="gray">Próxima fase</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
