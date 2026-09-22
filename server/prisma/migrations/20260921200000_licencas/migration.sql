-- Licenças: uma empresa cliente por licença, isolada das demais.
--
-- Até aqui cada EQUIPE era um inquilino. Agora o inquilino é a LICENÇA, e as
-- equipes dentro dela compartilham empresas, perícias e documentos.
--
-- Como o que já existe vira licença, sem afrouxar nenhum isolamento:
--   · a equipe raiz (a do perito titular) fica na licença principal, criada
--     aqui com id fixo (o mesmo de LICENCA_PRINCIPAL_ID em src/tenancy.ts),
--     sozinha — o que era dela continua só dela;
--   · cada equipe logo abaixo da raiz vira uma licença própria (com o mesmo
--     nome e o mesmo id da equipe), levando junto as equipes abaixo dela.
--
-- A ordem importa em banco com dados: cada coluna nasce anulável, é
-- preenchida e só então vira NOT NULL. O estado final é idêntico ao que o
-- Prisma gera a partir do schema, então `migrate dev` não enxerga drift.

-- CreateTable
CREATE TABLE "licencas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licencas_pkey" PRIMARY KEY ("id")
);

-- Licença principal
INSERT INTO "licencas" ("id", "nome", "atualizadoEm")
VALUES ('00000000-0000-4000-8000-000000000002', 'D&R Perícia Elite', CURRENT_TIMESTAMP);

-- Uma licença por equipe logo abaixo da raiz. Uma equipe sem mãe que não seja
-- a raiz não deveria existir; se existir, também vira licença.
INSERT INTO "licencas" ("id", "nome", "criadoEm", "atualizadoEm")
SELECT "id", "nome", "criadoEm", CURRENT_TIMESTAMP
FROM "organizacoes"
WHERE "id" <> '00000000-0000-4000-8000-000000000001'
  AND ("paiId" = '00000000-0000-4000-8000-000000000001' OR "paiId" IS NULL);

-- AlterTable: coluna anulável, backfill pela árvore, NOT NULL
ALTER TABLE "organizacoes" ADD COLUMN "licencaId" TEXT;

WITH RECURSIVE "arvore" ("id", "licencaId") AS (
    SELECT "id",
           CASE WHEN "id" = '00000000-0000-4000-8000-000000000001'
                THEN '00000000-0000-4000-8000-000000000002'
                ELSE "id" END
    FROM "organizacoes"
    WHERE "paiId" IS NULL OR "paiId" = '00000000-0000-4000-8000-000000000001'
  UNION ALL
    SELECT "o"."id", "a"."licencaId"
    FROM "organizacoes" "o"
    JOIN "arvore" "a" ON "o"."paiId" = "a"."id"
    -- As filhas da raiz já entraram acima, cada uma com a sua licença.
    WHERE "o"."paiId" <> '00000000-0000-4000-8000-000000000001'
)
UPDATE "organizacoes" SET "licencaId" = "arvore"."licencaId"
FROM "arvore"
WHERE "organizacoes"."id" = "arvore"."id";

ALTER TABLE "organizacoes" ALTER COLUMN "licencaId" SET NOT NULL;

-- A equipe principal de toda licença fica abaixo da raiz: é por ela que o
-- perito titular gere os acessos de todas.
UPDATE "organizacoes" SET "paiId" = '00000000-0000-4000-8000-000000000001'
WHERE "paiId" IS NULL AND "id" <> '00000000-0000-4000-8000-000000000001';

-- AlterTable: o conteúdo segue a licença da equipe que o criou
ALTER TABLE "empresas" ADD COLUMN "licencaId" TEXT;
UPDATE "empresas" SET "licencaId" = "o"."licencaId"
FROM "organizacoes" "o" WHERE "empresas"."organizacaoId" = "o"."id";
ALTER TABLE "empresas" ALTER COLUMN "licencaId" SET NOT NULL;

ALTER TABLE "pericias" ADD COLUMN "licencaId" TEXT;
UPDATE "pericias" SET "licencaId" = "o"."licencaId"
FROM "organizacoes" "o" WHERE "pericias"."organizacaoId" = "o"."id";
ALTER TABLE "pericias" ALTER COLUMN "licencaId" SET NOT NULL;

ALTER TABLE "documentos" ADD COLUMN "licencaId" TEXT;
UPDATE "documentos" SET "licencaId" = "o"."licencaId"
FROM "organizacoes" "o" WHERE "documentos"."organizacaoId" = "o"."id";
ALTER TABLE "documentos" ALTER COLUMN "licencaId" SET NOT NULL;

-- O CNPJ passa a ser único por licença. Duas equipes da mesma licença que
-- cadastraram a mesma empresa ficam com um cadastro só: o mais antigo, para o
-- qual os processos do outro passam a apontar. Sem isso o índice único
-- abaixo falharia e a API não subiria.
WITH "duplicadas" AS (
    SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "licencaId", "cnpj" ORDER BY "criadoEm", "id") AS "fica"
    FROM "empresas"
)
UPDATE "reclamadas" SET "empresaId" = "d"."fica"
FROM "duplicadas" "d" WHERE "reclamadas"."empresaId" = "d"."id" AND "d"."id" <> "d"."fica";

WITH "duplicadas" AS (
    SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "licencaId", "cnpj" ORDER BY "criadoEm", "id") AS "fica"
    FROM "empresas"
)
UPDATE "participantes" SET "empresaId" = "d"."fica"
FROM "duplicadas" "d" WHERE "participantes"."empresaId" = "d"."id" AND "d"."id" <> "d"."fica";

WITH "duplicadas" AS (
    SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "licencaId", "cnpj" ORDER BY "criadoEm", "id") AS "fica"
    FROM "empresas"
)
DELETE FROM "empresas" WHERE "id" IN (SELECT "id" FROM "duplicadas" WHERE "id" <> "fica");

-- DropIndex
DROP INDEX "empresas_organizacaoId_cnpj_key";

-- CreateIndex
CREATE INDEX "organizacoes_licencaId_idx" ON "organizacoes"("licencaId");

-- CreateIndex
CREATE INDEX "empresas_organizacaoId_idx" ON "empresas"("organizacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_licencaId_cnpj_key" ON "empresas"("licencaId", "cnpj");

-- CreateIndex
CREATE INDEX "pericias_licencaId_idx" ON "pericias"("licencaId");

-- CreateIndex
CREATE INDEX "documentos_licencaId_idx" ON "documentos"("licencaId");

-- AddForeignKey
ALTER TABLE "organizacoes" ADD CONSTRAINT "organizacoes_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "licencas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "licencas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pericias" ADD CONSTRAINT "pericias_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "licencas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "licencas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
