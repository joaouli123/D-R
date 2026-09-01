-- A referência editorial liga cada texto da Biblioteca ao item/subitem
-- correspondente do parecer, sem invalidar os textos legados.
ALTER TABLE "textos_biblioteca" ADD COLUMN "referencia" TEXT;

CREATE INDEX "textos_biblioteca_usuarioId_referencia_idx"
ON "textos_biblioteca"("usuarioId", "referencia");
