import { describe, expect, it } from 'vitest'
import {
  LIMITE_IMAGEM_BYTES as BYTES_NO_FRONT,
  LIMITE_FOTOS_POR_ENVIO as FOTOS_NO_FRONT,
  LIMITE_IMAGEM_MB as MB_NO_FRONT,
} from '../../src/lib/limitesUpload'
import {
  LIMITE_FOTOS_POR_ENVIO,
  LIMITE_IMAGEM_BYTES,
  LIMITE_IMAGEM_MB,
  LIMITE_MULTER_BYTES,
} from './limites.js'

// ============================================================
// O teto da imagem vale nos dois lados — e tem de ser o MESMO número.
//
// O navegador barra antes de enviar; o multer barra de novo no servidor.
// Se os dois divergirem, um dos lados vira mentira: ou o front recusa foto
// que o servidor aceitaria, ou deixa subir 30 MB para o servidor devolver
// 413 no fim — que é exatamente o que o perito viu como “nunca sobe”.
// ============================================================

describe('limite de imagem', () => {
  it('o front e a API usam o mesmo teto', () => {
    expect(MB_NO_FRONT).toBe(LIMITE_IMAGEM_MB)
    expect(BYTES_NO_FRONT).toBe(LIMITE_IMAGEM_BYTES)
  })

  it('é de 3 MB, como o perito pediu', () => {
    expect(LIMITE_IMAGEM_MB).toBe(3)
    expect(LIMITE_IMAGEM_BYTES).toBe(3 * 1024 * 1024)
  })

  it('o que vai para o multer é um byte a mais que o teto', () => {
    // Não é folga: é a borda. O busboy conta os bytes e dispara `limit`
    // quando o acumulado FICA IGUAL a `fileSize`
    // (busboy/lib/types/multipart.js — `if (fileSize === fileSizeLimit)`),
    // não quando o ultrapassa. Passando o teto cru, a foto de exatamente
    // 3 MB passava na conferência do navegador (que recusa com `>`) e
    // voltava 413 do servidor. O número que o multer recebe é o primeiro
    // tamanho RECUSADO, não o último aceito.
    expect(LIMITE_MULTER_BYTES).toBe(LIMITE_IMAGEM_BYTES + 1)
  })

  it('o teto de fotos por envio também vale nos dois lados', () => {
    expect(FOTOS_NO_FRONT).toBe(LIMITE_FOTOS_POR_ENVIO)
    expect(LIMITE_FOTOS_POR_ENVIO).toBe(30)
  })
})
