import { useEffect, useState } from 'react'

import { Input } from '@/components/ui'
import { formatarHonorarios, honorariosPorExtenso } from '@/lib/honorarios'
import { interpretarEntradaHonorarios, textoDoCampoHonorarios } from '@/lib/honorariosEntrada'

interface CampoHonorariosProps {
  /** Valor guardado na perícia, em centavos; `undefined` = sem honorários. */
  centavos: number | undefined
  onChange: (centavos: number | undefined) => void
}

// Um campo de texto, não `type="number"`: o número do navegador reescrevia o
// que o perito digitava ("2500," virava "2500") e não entendia "2.500,00", que
// é como se escreve dinheiro por aqui. O texto fica como foi digitado até o
// perito sair do campo; o valor válido, porém, vai para a perícia a cada
// tecla, para o salvamento nunca pegar um valor defasado.
export function CampoHonorarios({ centavos, onChange }: CampoHonorariosProps) {
  const [texto, setTexto] = useState(() => textoDoCampoHonorarios(centavos))
  const [erro, setErro] = useState<string | undefined>()

  // Valor trocado por fora (perícia carregada depois, outro rascunho): o campo
  // acompanha. Quando quem mudou foi o próprio campo, o texto já diz o mesmo.
  useEffect(() => {
    const entrada = interpretarEntradaHonorarios(texto)
    const doTexto = 'erro' in entrada ? undefined : entrada.centavos || undefined
    if (doTexto !== (centavos || undefined)) {
      setTexto(textoDoCampoHonorarios(centavos))
      setErro(undefined)
    }
    // Só o valor de fora interessa: reagir ao texto apagaria o que se digita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centavos])

  return (
    <Input
      label="Valor proposto dos honorários (R$)"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder="0,00"
      value={texto}
      error={erro}
      hint={centavos
        ? `Por extenso: ${honorariosPorExtenso(centavos)}.`
        : 'Opcional. A seção não será emitida enquanto o valor estiver vazio ou zerado.'}
      onChange={(evento) => {
        const bruto = evento.target.value
        setTexto(bruto)
        const entrada = interpretarEntradaHonorarios(bruto)
        if ('erro' in entrada) {
          setErro(entrada.erro)
          return
        }
        setErro(undefined)
        onChange(entrada.centavos || undefined)
      }}
      onBlur={() => {
        const descartado = 'erro' in interpretarEntradaHonorarios(texto)
        setTexto(textoDoCampoHonorarios(centavos))
        setErro(descartado
          ? `"${texto.trim()}" não é um valor válido; o campo voltou para ${centavos ? formatarHonorarios(centavos) : 'vazio'}.`
          : undefined)
      }}
    />
  )
}
