ALTER TABLE "fotos" ADD COLUMN "agenteId" TEXT;

CREATE INDEX "fotos_periciaId_agenteId_idx" ON "fotos"("periciaId", "agenteId");
