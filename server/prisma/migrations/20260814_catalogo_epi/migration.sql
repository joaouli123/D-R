-- Catálogo consolidado das 61 linhas recebidas nas três planilhas de respiradores.
CREATE TABLE "epis_catalogo" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "caUnico" TEXT,
    "caPecaFacial" TEXT,
    "caFiltroCartucho" TEXT,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epis_catalogo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "epis_aplicacoes" (
    "id" TEXT NOT NULL,
    "epiId" TEXT NOT NULL,
    "anexo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,

    CONSTRAINT "epis_aplicacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "epis_catalogo_chave_key" ON "epis_catalogo"("chave");
CREATE UNIQUE INDEX "epis_aplicacoes_epiId_anexo_categoria_key" ON "epis_aplicacoes"("epiId", "anexo", "categoria");
CREATE INDEX "epis_aplicacoes_anexo_categoria_idx" ON "epis_aplicacoes"("anexo", "categoria");

ALTER TABLE "epis_aplicacoes" ADD CONSTRAINT "epis_aplicacoes_epiId_fkey"
  FOREIGN KEY ("epiId") REFERENCES "epis_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH linhas(categoria, modelo, marca, ca, anexos) AS (
  VALUES
    ('Vapores Orgânicos', '3M 6200 + Cartucho 3M 6001', '3M', '4115 / 5635', 'Anexo 11'),
    ('Vapores Orgânicos', '3M 7502 + Cartucho 3M 6001', '3M', '12069 / 5635', 'Anexo 11'),
    ('Vapores Orgânicos', '3M 6800 + Cartucho 3M 6001', '3M', '3943 / 5635', 'Anexo 11'),
    ('Vapores Orgânicos', 'Honeywell North 5500 + Cartucho N75001', 'Honeywell', '13694 / 16843', 'Anexo 11'),
    ('Vapores Orgânicos', 'Honeywell North 7700 + Cartucho N75001', 'Honeywell', '13694 / 16843', 'Anexo 11'),
    ('Gases Ácidos', '3M 6200 + Cartucho 3M 6002', '3M', '4115 / 5636', 'Anexo 11'),
    ('Gases Ácidos', '3M 7502 + Cartucho 3M 6002', '3M', '12069 / 5636', 'Anexo 11'),
    ('Amônia e Aminas', '3M 6200 + Cartucho 3M 6004', '3M', '4115 / 5638', 'Anexo 11'),
    ('Amônia e Aminas', '3M 7502 + Cartucho 3M 6004', '3M', '12069 / 5638', 'Anexo 11'),
    ('Multigases', '3M 6200 + Cartucho 3M 60926', '3M', '4115 / 5640', 'Anexo 11'),
    ('Multigases', '3M 7502 + Cartucho 3M 6006', '3M', '12069 / 5640', 'Anexo 11'),
    ('Multigases', '3M 6800 + Cartucho 3M 6006', '3M', '3943 / 5640', 'Anexo 11'),
    ('Particulados', 'PFF2 (S) 3M 8210', '3M', '5657', 'Anexo 12, 13'),
    ('Particulados', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
    ('Particulados', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
    ('Particulados', 'PFF1 3M 8110S', '3M', '38389', 'Anexo 12'),
    ('Vapores Orgânicos', 'MSA Advantage 200 LS + Cartucho GME', 'MSA', '8558 / 12693', 'Anexo 11'),
    ('Vapores Orgânicos', 'Libus Série 9000 + Cartucho Libus A1', 'Libus', '37706 / 37707', 'Anexo 11'),
    ('Gases Ácidos', 'MSA Advantage 200 LS + Cartucho GA', 'MSA', '8558 / 12694', 'Anexo 11'),
    ('Gases Ácidos', 'Libus Série 9000 + Cartucho Libus AG1', 'Libus', '37706 / 37708', 'Anexo 11'),
    ('Formaldeído', '3M 6200 + Cartucho 3M 6003', '3M', '4115 / 5637', 'Anexo 11, 13'),
    ('Formaldeído', 'MSA Advantage 200 LS + Cartucho Multi', 'MSA', '8558 / 14757', 'Anexo 11, 13'),
    ('Mercúrio', '3M 6200 + Cartucho 3M 6005', '3M', '4115 / 12067', 'Anexo 11, 13'),
    ('Mercúrio', 'MSA Advantage 200 LS + Cartucho Mercúrio', 'MSA', '8558 / 31393', 'Anexo 11, 13'),
    ('Particulados', 'PFF2 (S) 3M 8210', '3M', '5657', 'Anexo 12, 13'),
    ('Particulados', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
    ('Particulados', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
    ('Formaldeído', '3M 6200 + Cartucho 3M 6003', '3M', '4115 / 5637', 'Anexo 11, 13'),
    ('Formaldeído', 'MSA Advantage 200 LS + Cartucho Multi', 'MSA', '8558 / 14757', 'Anexo 11, 13'),
    ('Mercúrio', '3M 6200 + Cartucho 3M 6005', '3M', '4115 / 12067', 'Anexo 11, 13'),
    ('Mercúrio', 'MSA Advantage 200 LS + Cartucho Mercúrio', 'MSA', '8558 / 31393', 'Anexo 11, 13'),
    ('Negro de Fumo', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
    ('Negro de Fumo', 'PFF2 MSA Affinity', 'MSA', '39420', 'Anexo 12, 13'),
    ('Negro de Fumo', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
    ('Particulados / PFF2', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
    ('Particulados / PFF2', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
    ('Particulados / PFF2', 'PFF2 MSA Affinity 1100', 'MSA', '39420', 'Anexo 12, 13'),
    ('Particulados / PFF2', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 Delta Plus FFP3', 'Delta Plus', '41503', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 MSA Advantage PFF3', 'MSA', '40123', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 Libus 1800', 'Libus', '40500', 'Anexo 12, 13'),
    ('Particulados', 'PFF2 (S) 3M 8210', '3M', '5657', 'Anexo 12, 13'),
    ('Particulados', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
    ('Particulados', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
    ('Particulados', 'PFF1 3M 8110S', '3M', '38389', 'Anexo 12'),
    ('Negro de Fumo', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
    ('Negro de Fumo', 'PFF2 MSA Affinity', 'MSA', '39420', 'Anexo 12, 13'),
    ('Negro de Fumo', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
    ('Particulados / PFF1', 'PFF1 3M 8110S', '3M', '38389', 'Anexo 12'),
    ('Particulados / PFF1', 'PFF1 Delta Plus FFP1', 'Delta Plus', '41500', 'Anexo 12'),
    ('Particulados / PFF1', 'PFF1 Libus 1500', 'Libus', '37975', 'Anexo 12'),
    ('Particulados / PFF1', 'PFF1 Air Safety Classic PFF1', 'Air Safety', '18010', 'Anexo 12'),
    ('Particulados / PFF2', 'PFF2 3M 8210', '3M', '5657', 'Anexo 12, 13'),
    ('Particulados / PFF2', 'PFF2 c/ Válvula 3M 8822', '3M', '5659', 'Anexo 12, 13'),
    ('Particulados / PFF2', 'PFF2 MSA Affinity 1100', 'MSA', '39420', 'Anexo 12, 13'),
    ('Particulados / PFF2', 'PFF2 Libus 1720', 'Libus', '38870', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 3M 9332+ Aura', '3M', '30467', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 Delta Plus FFP3', 'Delta Plus', '41503', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 MSA Advantage PFF3', 'MSA', '40123', 'Anexo 12, 13'),
    ('Particulados / PFF3', 'PFF3 Libus 1800', 'Libus', '40500', 'Anexo 12, 13')
), separados AS (
  SELECT *,
    CASE WHEN ca LIKE '%/%' THEN NULL ELSE trim(ca) END AS ca_unico,
    CASE WHEN ca LIKE '%/%' THEN trim(split_part(ca, '/', 1)) ELSE NULL END AS ca_peca_facial,
    CASE WHEN ca LIKE '%/%' THEN trim(split_part(ca, '/', 2)) ELSE NULL END AS ca_filtro_cartucho
  FROM linhas
), normalizadas AS (
  SELECT *, lower(regexp_replace(concat_ws('|', trim(marca), trim(modelo), coalesce(ca_unico, ''), coalesce(ca_peca_facial, ''), coalesce(ca_filtro_cartucho, '')), '\\s+', ' ', 'g')) AS chave
  FROM separados
), catalogo AS (
  INSERT INTO "epis_catalogo" ("id", "chave", "modelo", "marca", "caUnico", "caPecaFacial", "caFiltroCartucho", "observacao", "updatedAt")
  SELECT DISTINCT ON (chave)
    md5(chave), chave, modelo, marca, ca_unico, ca_peca_facial, ca_filtro_cartucho,
    CASE WHEN ca_unico IS NULL THEN 'CA peça facial / CA cartucho. Ambos necessários para a validade do conjunto.' ELSE 'CA único (Peça Facial Filtrante - PFF).' END,
    CURRENT_TIMESTAMP
  FROM normalizadas
  ORDER BY chave
  ON CONFLICT ("chave") DO UPDATE SET
    "modelo" = EXCLUDED."modelo", "marca" = EXCLUDED."marca", "caUnico" = EXCLUDED."caUnico",
    "caPecaFacial" = EXCLUDED."caPecaFacial", "caFiltroCartucho" = EXCLUDED."caFiltroCartucho",
    "observacao" = EXCLUDED."observacao", "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "id", "chave"
)
INSERT INTO "epis_aplicacoes" ("id", "epiId", "anexo", "categoria")
SELECT DISTINCT md5(c."id" || '|' || anexo || '|' || n.categoria), c."id", anexo, n.categoria
FROM normalizadas n
JOIN catalogo c ON c."chave" = n.chave
CROSS JOIN LATERAL (
  SELECT CASE WHEN trim(parte) LIKE 'Anexo %' THEN trim(parte) ELSE 'Anexo ' || trim(parte) END AS anexo
  FROM regexp_split_to_table(n.anexos, '\\s*,\\s*') AS parte
) anexos_independentes
ON CONFLICT ("epiId", "anexo", "categoria") DO NOTHING;
