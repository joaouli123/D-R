/**
 * Mede a folha de rosto do parecer com muitas reclamadas: em que página cai
 * "APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA" e onde abre o item 1. O perito viu
 * até 8 reclamadas num processo real e pediu para aguentar 10.
 *
 * O cenário é o real, não o da fixture: razões sociais compridas (as do caso
 * NAKA que ele mandou) e uma apresentação de vários parágrafos — é a soma
 * das duas coisas que empurra a capa.
 *
 * Rodar com: npx tsx scripts/medir-capa.ts
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Empresa } from '@prisma/client'

import { empresa, periciaDeTeste, perito } from '../src/services/parecer.fixture.js'
import { htmlDoParecer } from '../src/services/documento-html.js'
import { gerarPdf } from '../src/services/pdf.js'

/**
 * `pdftotext` do Poppler. No Linux/macOS costuma estar no PATH; no Windows,
 * aponte PDFTOTEXT para o binário (o winget instala em
 * %LOCALAPPDATA%/Microsoft/WinGet/Packages/oschwartz10612.Poppler_*/...).
 */
const PDFTOTEXT = process.env.PDFTOTEXT ?? 'pdftotext'

const RAZOES = [
  'NAKA SERVICOS E MANUTENCOES EIRELI - EPP',
  'NAKA INSTRUMENTACAO INDUSTRIAL EIRELI',
  'NAKA COMERCIO E INDUSTRIA DE INSTRUMENTACAO INDUSTRIAL LTDA',
  'MARIE AKEMI NAKATANI CARTEIRO',
  'RUI MANUEL MORENO CARTEIRO',
  'METALURGICA E USINAGEM PRECISAO INDUSTRIAL LTDA - ME',
  'TRANSPORTES E LOGISTICA RODOVIARIA BANDEIRANTES S/A',
  'CONSTRUTORA E INCORPORADORA HORIZONTE EMPREENDIMENTOS EIRELI',
  'INDUSTRIA QUIMICA E PETROQUIMICA DO VALE LTDA',
  'COMERCIO ATACADISTA DE PRODUTOS ALIMENTICIOS SUL LTDA - EPP',
]

const APRESENTACAO = [
  'DINOEL RIBEIRO DA SILVA, Engenheiro de Segurança do Trabalho, inscrito no CREA/SP sob o nº 5071814404/D, nomeado Perito Judicial nos autos do processo em epígrafe, vem respeitosamente à presença de Vossa Excelência apresentar o presente Parecer Técnico Pericial.',
  'O signatário é Engenheiro Civil pela Universidade de São Paulo, com especialização em Engenharia de Segurança do Trabalho e em Higiene Ocupacional, atuando há mais de vinte anos na avaliação de agentes insalubres e periculosos em ambientes industriais, com centenas de laudos periciais elaborados perante a Justiça do Trabalho da 2ª e da 15ª Regiões.',
  'O presente trabalho foi elaborado com base em diligência técnica realizada no local de trabalho, entrevistas com as partes e seus assistentes, análise da documentação juntada aos autos e aplicação das Normas Regulamentadoras do Ministério do Trabalho e Emprego, em especial as NR-15 e NR-16.',
].join('\n\n')

function comReclamadas(n: number) {
  const pericia = periciaDeTeste()
  const empresas: Empresa[] = RAZOES.slice(0, n).map((razaoSocial, i) => ({
    ...empresa,
    id: `emp-${i + 1}`,
    razaoSocial,
    cnpj: `${String(10 + i).padStart(2, '0')}.345.678/0001-${String(10 + i).padStart(2, '0')}`,
  }))
  pericia.reclamadas = empresas.map((e, i) => ({
    id: `rec-${i + 1}`,
    periciaId: 'per-1',
    empresaId: e.id,
    principal: i === 0,
  }))
  ;(pericia.tecnico as { apresentacao: string }).apresentacao = APRESENTACAO
  return { pericia, empresas }
}

function paginas(pdf: Buffer): string[] {
  const tmp = path.join(import.meta.dirname, '.capa-medida.pdf')
  writeFileSync(tmp, pdf)
  const texto = execFileSync(PDFTOTEXT, ['-layout', '-enc', 'UTF-8', tmp, '-'], { encoding: 'utf8' })
  return texto.split('\f').filter((p) => p.trim())
}

for (const n of [1, 5, 8, 10]) {
  const { pericia, empresas } = comReclamadas(n)
  const html = await htmlDoParecer(pericia, empresas, perito, 'Parecer')
  const pdf = await gerarPdf(html)
  const pags = paginas(pdf)
  const acha = (marca: string) => pags.findIndex((p) => p.includes(marca)) + 1
  const pApresentacao = acha('APRESENTAÇÃO E QUALIFICAÇÃO TÉCNICA')
  const pItem1 = acha('OBJETO DA PERÍCIA')
  const ok = pApresentacao === 1 && pItem1 === 2
  console.log(
    `${String(n).padStart(2)} reclamadas → ${pags.length} págs | ` +
      `Apresentação na pág ${pApresentacao}, item 1 na pág ${pItem1}  ${ok ? 'OK' : '✗ ESTOUROU'}`,
  )
}
