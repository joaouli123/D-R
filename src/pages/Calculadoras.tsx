import { useState } from 'react'
import { Calculator, Copy, Thermometer, Volume2, Wallet } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Input, Select, Tabs, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'

// ============================================================
// CALCULADORAS TÉCNICAS — apoio à perícia
// Ruído (Anexo 1 NR-15 / NHO-01), Calor (Anexo 3 / NHO-06),
// atenuação de EPI e adicional devido.
// ============================================================

function Resultado({
  label,
  valor,
  unidade,
  destaque,
  nota,
}: {
  label: string
  valor: string
  unidade?: string
  destaque?: 'ok' | 'alerta' | 'neutro'
  nota?: string
}) {
  const tons = {
    ok: 'border-brand-300 bg-brand-50 text-brand-800',
    alerta: 'border-red-300 bg-red-50 text-red-800',
    neutro: 'border-ink-200 bg-ink-50 text-ink-800',
  }
  return (
    <div className={cn('rounded-lg border px-4 py-3', tons[destaque ?? 'neutro'])}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-[24px] font-bold leading-none">
        {valor}
        {unidade && <span className="ml-1 text-[14px] font-semibold opacity-70">{unidade}</span>}
      </p>
      {nota && <p className="mt-1.5 text-[12px] leading-snug opacity-80">{nota}</p>}
    </div>
  )
}

// ---------- Ruído ----------
function CalcRuido() {
  const [nivel, setNivel] = useState(88)
  const [jornada, setJornada] = useState(8)
  const [nrrsf, setNrrsf] = useState(15)

  // Anexo 1 da NR-15 — q = 5 dB, critério 85 dB(A) / 8 h
  const tempoPermitido = 8 / Math.pow(2, (nivel - 85) / 5)
  const dose = (jornada / tempoPermitido) * 100
  const nivelAtenuado = Math.max(0, nivel - nrrsf)
  const doseAtenuada = (jornada / (8 / Math.pow(2, (nivelAtenuado - 85) / 5))) * 100

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Parâmetros" icon={<Volume2 size={18} />} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input
            label="Nível de ruído — NEN"
            type="number"
            value={nivel}
            onChange={(e) => setNivel(Number(e.target.value))}
            hint="dB(A), circuito A, resposta lenta"
          />
          <Input
            label="Jornada de exposição"
            type="number"
            step="0.5"
            value={jornada}
            onChange={(e) => setJornada(Number(e.target.value))}
            hint="horas/dia"
          />
          <Input
            label="Atenuação do protetor (NRRsf)"
            type="number"
            value={nrrsf}
            onChange={(e) => setNrrsf(Number(e.target.value))}
            hint="dB — conforme CA do equipamento"
            className="sm:col-span-2"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Resultado — Anexo 1 da NR-15" subtitle="Critério q=5, referência 85 dB(A)/8h" />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Resultado
            label="Tempo máximo permitido"
            valor={tempoPermitido >= 8 ? '8,00+' : tempoPermitido.toFixed(2)}
            unidade="h"
          />
          <Resultado
            label="Dose diária de exposição"
            valor={dose.toFixed(1)}
            unidade="%"
            destaque={dose > 100 ? 'alerta' : 'ok'}
            nota={dose > 100 ? 'Acima do limite de tolerância.' : 'Dentro do limite de tolerância.'}
          />
          <Resultado label="Nível com protetor" valor={nivelAtenuado.toFixed(1)} unidade="dB(A)" />
          <Resultado
            label="Dose com protetor"
            valor={doseAtenuada.toFixed(1)}
            unidade="%"
            destaque={doseAtenuada > 100 ? 'alerta' : 'ok'}
          />
          <div className="sm:col-span-2 rounded-lg border border-navy-200 bg-navy-50 px-4 py-3 text-[12.5px] leading-relaxed text-navy-800">
            <strong>Conclusão técnica:</strong>{' '}
            {dose > 100
              ? `A exposição de ${nivel} dB(A) por ${jornada}h ultrapassa o limite de tolerância do Anexo 1 da NR-15, caracterizando insalubridade em grau médio (20%).`
              : `A exposição de ${nivel} dB(A) por ${jornada}h não ultrapassa o limite de tolerância do Anexo 1 da NR-15.`}{' '}
            {doseAtenuada <= 100 && dose > 100 &&
              'A atenuação do protetor auricular seria suficiente, desde que comprovados fornecimento, treinamento e fiscalização do uso ininterrupto (Súmulas 80 e 289 do TST).'}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ---------- Calor ----------
const TAXAS = [
  { label: 'Sentado em repouso', m: 115 },
  { label: 'Trabalho leve com as mãos (sentado)', m: 180 },
  { label: 'Trabalho moderado com braços (em pé)', m: 275 },
  { label: 'Trabalho pesado com braços e tronco', m: 440 },
  { label: 'Trabalho muito pesado / esforço intenso', m: 550 },
]

function CalcCalor() {
  const [tbn, setTbn] = useState(26)
  const [tg, setTg] = useState(35)
  const [tbs, setTbs] = useState(31)
  const [externo, setExterno] = useState(false)
  const [taxa, setTaxa] = useState(275)

  const ibutg = externo ? 0.7 * tbn + 0.2 * tg + 0.1 * tbs : 0.7 * tbn + 0.3 * tg
  // Anexo 3 NR-15 (Portaria SEPRT 1.359/2019) — LT ≈ 56,7 − 11,5·log10(M)
  const lt = 56.7 - 11.5 * Math.log10(taxa)
  const excede = ibutg > lt

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Parâmetros" icon={<Thermometer size={18} />} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Tbn — bulbo úmido natural" type="number" step="0.1" value={tbn} onChange={(e) => setTbn(Number(e.target.value))} hint="°C" />
          <Input label="Tg — globo" type="number" step="0.1" value={tg} onChange={(e) => setTg(Number(e.target.value))} hint="°C" />
          <Input
            label="Tbs — bulbo seco"
            type="number"
            step="0.1"
            value={tbs}
            onChange={(e) => setTbs(Number(e.target.value))}
            hint="°C — usado somente em ambiente externo com carga solar"
            disabled={!externo}
          />
          <Select
            label="Ambiente"
            value={externo ? 'externo' : 'interno'}
            onChange={(e) => setExterno(e.target.value === 'externo')}
          >
            <option value="interno">Interno / externo sem carga solar</option>
            <option value="externo">Externo com carga solar</option>
          </Select>
          <Select
            label="Taxa metabólica (M)"
            className="sm:col-span-2"
            value={taxa}
            onChange={(e) => setTaxa(Number(e.target.value))}
          >
            {TAXAS.map((t) => (
              <option key={t.m} value={t.m}>
                {t.label} — {t.m} W
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader title="Resultado — Anexo 3 da NR-15" subtitle="Portaria SEPRT nº 1.359/2019 · NHO-06" />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Resultado label="IBUTG apurado" valor={ibutg.toFixed(1)} unidade="°C" />
          <Resultado
            label="Limite de tolerância"
            valor={lt.toFixed(1)}
            unidade="°C"
            nota={`Para M = ${taxa} W`}
          />
          <div className="sm:col-span-2">
            <Resultado
              label="Situação"
              valor={excede ? 'Acima do LT' : 'Dentro do LT'}
              destaque={excede ? 'alerta' : 'ok'}
              nota={
                excede
                  ? 'Caracteriza sobrecarga térmica — insalubridade em grau médio (20%), salvo adoção de medidas de controle eficazes.'
                  : 'Não caracteriza sobrecarga térmica pelo critério do Anexo 3 da NR-15.'
              }
            />
          </div>
          <p className="sm:col-span-2 text-[12px] leading-relaxed text-ink-500">
            Fórmula aplicada: {externo ? 'IBUTG = 0,7·Tbn + 0,2·Tg + 0,1·Tbs' : 'IBUTG = 0,7·Tbn + 0,3·Tg'}.
            Limite de tolerância obtido pela expressão do Anexo 3 em função da taxa metabólica média
            ponderada no tempo.
          </p>
        </div>
      </Card>
    </div>
  )
}

// ---------- Adicional ----------
function CalcAdicional() {
  const toast = useToast()
  const [base, setBase] = useState(2000)
  const [grau, setGrau] = useState(20)
  const [meses, setMeses] = useState(24)
  const [reflexos, setReflexos] = useState(true)

  const mensal = (base * grau) / 100
  const principal = mensal * meses
  const decimo = reflexos ? mensal * (meses / 12) : 0
  const ferias = reflexos ? mensal * (meses / 12) * (1 + 1 / 3) : 0
  const fgts = reflexos ? (principal + decimo + ferias) * 0.08 : 0
  const total = principal + decimo + ferias + fgts

  const brl = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const resumo = `Base de cálculo: ${brl(base)} · Grau: ${grau}% · Período: ${meses} meses
Adicional mensal: ${brl(mensal)}
Principal: ${brl(principal)}
13º proporcional: ${brl(decimo)}
Férias + 1/3: ${brl(ferias)}
FGTS (8%): ${brl(fgts)}
TOTAL ESTIMADO: ${brl(total)}`

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Parâmetros" icon={<Wallet size={18} />} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input
            label="Base de cálculo"
            type="number"
            value={base}
            onChange={(e) => setBase(Number(e.target.value))}
            hint="Definida por V. Exa. (salário mínimo, base ou piso)"
            className="sm:col-span-2"
          />
          <Select label="Grau / adicional" value={grau} onChange={(e) => setGrau(Number(e.target.value))}>
            <option value={10}>Insalubridade mínima — 10%</option>
            <option value={20}>Insalubridade média — 20%</option>
            <option value={40}>Insalubridade máxima — 40%</option>
            <option value={30}>Periculosidade — 30%</option>
          </Select>
          <Input
            label="Período (meses)"
            type="number"
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
          />
          <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-[13px] text-ink-700">
            <input
              type="checkbox"
              checked={reflexos}
              onChange={(e) => setReflexos(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 accent-brand-700"
            />
            Incluir reflexos (13º, férias + 1/3 e FGTS)
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Estimativa"
          subtitle="Cálculo técnico de apoio — a fixação da base é matéria de direito."
          action={
            <Button
              size="sm"
              variant="outline"
              icon={<Copy size={14} />}
              onClick={() => {
                navigator.clipboard?.writeText(resumo)
                toast('Memória de cálculo copiada.')
              }}
            >
              Copiar
            </Button>
          }
        />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Resultado label="Adicional mensal" valor={brl(mensal)} />
          <Resultado label="Principal do período" valor={brl(principal)} />
          {reflexos && (
            <>
              <Resultado label="13º proporcional" valor={brl(decimo)} />
              <Resultado label="Férias + 1/3" valor={brl(ferias)} />
              <Resultado label="FGTS (8%)" valor={brl(fgts)} />
            </>
          )}
          <div className="sm:col-span-2">
            <Resultado label="Total estimado" valor={brl(total)} destaque="ok" />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function Calculadoras() {
  const [aba, setAba] = useState<'ruido' | 'calor' | 'adicional'>('ruido')

  return (
    <>
      <PageHeader
        breadcrumb="Ferramentas"
        title="Calculadoras Técnicas"
        description="Apoio ao enquadramento normativo — os resultados alimentam a análise técnica do parecer."
        action={<Badge tone="navy">NR-15 · NHO-01 · NHO-06</Badge>}
      />

      <Card className="mb-4 overflow-hidden">
        <Tabs
          value={aba}
          onChange={setAba}
          tabs={[
            { value: 'ruido', label: 'Ruído — dose e atenuação' },
            { value: 'calor', label: 'Calor — IBUTG' },
            { value: 'adicional', label: 'Adicional devido' },
          ]}
        />
        <div className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] text-ink-500">
          <Calculator size={14} />
          Os cálculos seguem os critérios legais da NR-15; confira sempre os dados de campo antes de
          transcrever ao documento.
        </div>
      </Card>

      {aba === 'ruido' && <CalcRuido />}
      {aba === 'calor' && <CalcCalor />}
      {aba === 'adicional' && <CalcAdicional />}
    </>
  )
}
