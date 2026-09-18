import { extenso } from '@/lib/utils'
import type { Usuario } from '@/types'

type Signatario = Pick<Usuario, 'nome' | 'titulo' | 'registroProfissional' | 'assinaturaUrl'>

/** Títulos e registros aceitam mais de um valor, separados por linha ou ";". */
function linhas(valor?: string): string[] {
  return (valor ?? '').split(/\r?\n|;/).map((linha) => linha.trim()).filter(Boolean)
}

/**
 * "Cidade, data." e a assinatura do perito — o fecho de todo documento.
 *
 * Espelha `assinatura()` de server/src/services/documento-html.ts (PDF) e de
 * docx.ts: data e assinatura formam um bloco só, que não se parte entre
 * folhas. Com assinatura manuscrita cadastrada (Configurações › Meu perfil)
 * a imagem pousa sobre a linha; sem ela, a linha fica em branco para
 * assinar à mão. `espacado` é o respiro maior do parecer/laudo — a
 * impugnação continua compacta para caber numa folha.
 */
export function FechoDoDocumento({
  cidade,
  data,
  perito,
  espacado = false,
}: {
  cidade: string
  data: string
  perito?: Signatario | null
  espacado?: boolean
}) {
  const manuscrita = perito?.assinaturaUrl?.trim()
  return (
    <div className={espacado ? 'fecho fecho-parecer' : 'fecho'}>
      <p className="local-data no-indent text-center">{cidade}, {extenso(data)}.</p>
      <div className={manuscrita ? 'assinatura com-imagem' : 'assinatura'}>
        {manuscrita && (
          <img className="assinatura-imagem" src={manuscrita} alt={`Assinatura de ${perito?.nome ?? 'perito'}`} />
        )}
        <div className="traco">
          <p className="no-indent font-bold">{perito?.nome ?? '—'}</p>
          {linhas(perito?.titulo).map((linha) => (
            <p key={`titulo-${linha}`} className="no-indent text-[10pt]">{linha}</p>
          ))}
          {linhas(perito?.registroProfissional).map((linha) => (
            <p key={`registro-${linha}`} className="no-indent text-[10pt]">{linha}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
