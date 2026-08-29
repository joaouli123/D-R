-- A diligência precisa registrar início e término, e cada representante
-- de reclamada precisa permanecer ligado à empresa correspondente.
ALTER TABLE "pericias" ADD COLUMN "horaFimVistoria" TEXT;

ALTER TABLE "participantes" ADD COLUMN "empresaId" TEXT;

CREATE INDEX "participantes_empresaId_idx" ON "participantes"("empresaId");

ALTER TABLE "participantes"
ADD CONSTRAINT "participantes_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
