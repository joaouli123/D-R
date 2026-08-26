ALTER TYPE "PapelParticipante" ADD VALUE IF NOT EXISTS 'engenheiro_sst_empresa';
ALTER TYPE "PapelParticipante" ADD VALUE IF NOT EXISTS 'tecnico_sst_empresa';
ALTER TYPE "PapelParticipante" ADD VALUE IF NOT EXISTS 'gestor_lideranca';

ALTER TABLE "pericias"
  ADD COLUMN "cepVistoria" TEXT,
  ADD COLUMN "setorVistoriado" TEXT;
