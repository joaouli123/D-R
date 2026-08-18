BEGIN;

ALTER TABLE "epis_catalogo"
  ADD COLUMN "nivelProtecaoDb" DOUBLE PRECISION,
  ADD COLUMN "metodoAtenuacao" TEXT;

INSERT INTO "epis_catalogo" (
  "id", "chave", "modelo", "marca", "caUnico", "nivelProtecaoDb",
  "metodoAtenuacao", "observacao", "updatedAt"
) VALUES
  (
    md5('protecao-auditiva|ca-11882'), 'protecao-auditiva|ca-11882',
    'Protetor auditivo CA 11882', 'Não informada', '11882', 17, 'NRRsf',
    'NRRsf de 17 dB informado pelo cliente.', CURRENT_TIMESTAMP
  ),
  (
    md5('protecao-auditiva|ca-18189'), 'protecao-auditiva|ca-18189',
    'Protetor auditivo CA 18189', 'Não informada', '18189', 13, 'NRRsf',
    'NRRsf de 13 dB informado pelo cliente.', CURRENT_TIMESTAMP
  )
ON CONFLICT ("chave") DO UPDATE SET
  "caUnico" = EXCLUDED."caUnico",
  "nivelProtecaoDb" = EXCLUDED."nivelProtecaoDb",
  "metodoAtenuacao" = EXCLUDED."metodoAtenuacao",
  "observacao" = EXCLUDED."observacao",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "epis_aplicacoes" ("id", "epiId", "anexo", "categoria")
SELECT
  md5(c."id" || '|Anexo 1|Proteção auditiva'),
  c."id",
  'Anexo 1',
  'Proteção auditiva'
FROM "epis_catalogo" c
WHERE c."chave" IN ('protecao-auditiva|ca-11882', 'protecao-auditiva|ca-18189')
ON CONFLICT ("epiId", "anexo", "categoria") DO NOTHING;

COMMIT;
