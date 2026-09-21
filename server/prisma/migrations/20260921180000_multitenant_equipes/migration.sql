-- Multi-tenant: equipes (organizações) hierárquicas.
--
-- Tudo o que já existe no banco pertence à equipe raiz, criada aqui com id fixo
-- (o mesmo de ORGANIZACAO_RAIZ_ID em src/tenancy.ts). É a equipe do perito
-- titular: nada muda para quem já usa o sistema.
--
-- A ordem importa em banco com dados: cada coluna nasce anulável, é preenchida
-- com a equipe raiz e só então vira NOT NULL. O estado final é idêntico ao que
-- o Prisma gera a partir do schema (sem default), então `migrate dev` não
-- enxerga drift.

-- CreateTable
CREATE TABLE "organizacoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "paiId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizacoes_paiId_idx" ON "organizacoes"("paiId");

-- AddForeignKey
ALTER TABLE "organizacoes" ADD CONSTRAINT "organizacoes_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "organizacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Equipe raiz
INSERT INTO "organizacoes" ("id", "nome", "atualizadoEm")
VALUES ('00000000-0000-4000-8000-000000000001', 'D&R Perícia Elite', CURRENT_TIMESTAMP);

-- AlterTable: coluna anulável, backfill, NOT NULL
ALTER TABLE "usuarios" ADD COLUMN "organizacaoId" TEXT;
UPDATE "usuarios" SET "organizacaoId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "usuarios" ALTER COLUMN "organizacaoId" SET NOT NULL;

ALTER TABLE "empresas" ADD COLUMN "organizacaoId" TEXT;
UPDATE "empresas" SET "organizacaoId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "empresas" ALTER COLUMN "organizacaoId" SET NOT NULL;

ALTER TABLE "pericias" ADD COLUMN "organizacaoId" TEXT;
UPDATE "pericias" SET "organizacaoId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "pericias" ALTER COLUMN "organizacaoId" SET NOT NULL;

ALTER TABLE "documentos" ADD COLUMN "organizacaoId" TEXT;
UPDATE "documentos" SET "organizacaoId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "documentos" ALTER COLUMN "organizacaoId" SET NOT NULL;

-- O CNPJ deixa de ser único no sistema inteiro e passa a ser único por equipe:
-- a mesma empresa pode ser cliente de duas equipes, cada uma com o seu cadastro.
DROP INDEX "empresas_cnpj_key";

-- CreateIndex
CREATE UNIQUE INDEX "empresas_organizacaoId_cnpj_key" ON "empresas"("organizacaoId", "cnpj");

CREATE INDEX "usuarios_organizacaoId_idx" ON "usuarios"("organizacaoId");

CREATE INDEX "pericias_organizacaoId_idx" ON "pericias"("organizacaoId");

CREATE INDEX "documentos_organizacaoId_idx" ON "documentos"("organizacaoId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "organizacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "empresas" ADD CONSTRAINT "empresas_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "organizacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pericias" ADD CONSTRAINT "pericias_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "organizacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documentos" ADD CONSTRAINT "documentos_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "organizacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
