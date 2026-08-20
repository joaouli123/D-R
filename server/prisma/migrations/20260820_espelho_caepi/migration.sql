BEGIN;

-- ============================================================
-- Espelho da base oficial do CAEPI/MTE.
--
-- Guarda todos os registros, válidos e vencidos: a avaliação de um
-- processo trabalhista olha os últimos 5 anos, e um CA vencido hoje
-- valia normalmente no período periciado. Na base de 20/08/2026 são
-- 6.719 homologações que venceram dentro dessa janela.
--
-- A chave é (numeroCa, processo), não o número do CA sozinho: o CSV
-- traz 124.067 linhas para 42.321 CAs porque repete o registro uma
-- vez por norma técnica, mas 22 CAs têm mais de uma homologação com
-- validades diferentes — e é justamente esse caso que a perícia
-- precisa distinguir.
-- ============================================================

CREATE TABLE IF NOT EXISTS "cas_oficiais" (
  "numeroCa"          TEXT NOT NULL,
  "processo"          TEXT NOT NULL,

  "dataValidade"      TEXT,
  "situacao"          TEXT NOT NULL,
  "cnpj"              TEXT,
  "razaoSocial"       TEXT,
  "natureza"          TEXT,
  "equipamento"       TEXT NOT NULL,
  "descricao"         TEXT,
  "marca"             TEXT,
  "referencia"        TEXT,
  "cor"               TEXT,

  "aprovadoParaLaudo" TEXT,
  "restricaoLaudo"    TEXT,
  "observacaoLaudo"   TEXT,

  "normas"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "laudos"            JSONB  NOT NULL DEFAULT '[]'::JSONB,

  "categoria"         TEXT NOT NULL,
  "anexos"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "exigeNrrsf"        BOOLEAN NOT NULL DEFAULT FALSE,
  "descontinuado"     BOOLEAN NOT NULL DEFAULT FALSE,

  "sincronizadoEm"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cas_oficiais_pkey" PRIMARY KEY ("numeroCa", "processo")
);

-- O perito digita o número do CA; a chave primária começa por ele,
-- mas o índice próprio mantém a busca barata mesmo com o composto.
CREATE INDEX IF NOT EXISTS "cas_oficiais_numeroCa_idx"    ON "cas_oficiais" ("numeroCa");
CREATE INDEX IF NOT EXISTS "cas_oficiais_equipamento_idx" ON "cas_oficiais" ("equipamento");
CREATE INDEX IF NOT EXISTS "cas_oficiais_situacao_idx"    ON "cas_oficiais" ("situacao");
CREATE INDEX IF NOT EXISTS "cas_oficiais_marca_idx"       ON "cas_oficiais" ("marca");
CREATE INDEX IF NOT EXISTS "cas_oficiais_exigeNrrsf_idx"  ON "cas_oficiais" ("exigeNrrsf");

-- Busca textual do seletor de EPI: o perito digita marca, referência
-- ou parte da descrição. Sem isso, 42 mil linhas fazem varredura completa.
CREATE INDEX IF NOT EXISTS "cas_oficiais_busca_idx" ON "cas_oficiais"
  USING gin (to_tsvector('portuguese',
    coalesce("marca", '') || ' ' || coalesce("referencia", '') || ' ' ||
    coalesce("razaoSocial", '') || ' ' || coalesce("descricao", '')));

-- ============================================================
-- Atenuação sonora (NRRsf).
--
-- Tabela à parte de propósito. O NRRsf não existe no CSV — vem da
-- ficha individual do CA — e é o único dado do módulo que o perito
-- pode preencher. Estando em outra tabela, a sincronização do CSV
-- não tem como sobrescrever o valor dele nem por engano.
-- ============================================================

CREATE TABLE IF NOT EXISTS "cas_atenuacao" (
  "numeroCa"          TEXT PRIMARY KEY,
  "nrrsfDb"           DOUBLE PRECISION,
  "fonte"             TEXT NOT NULL,
  "bandas"            JSONB,
  "observacao"        TEXT,
  "fichaConsultadaEm" TIMESTAMP(3),
  "atualizadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cas_atenuacao_fonte_check" CHECK ("fonte" IN ('CAEPI', 'PERITO'))
);

CREATE INDEX IF NOT EXISTS "cas_atenuacao_fonte_idx" ON "cas_atenuacao" ("fonte");

-- ============================================================
-- Histórico das sincronizações, para a tela de status responder
-- "quando foi a última vez que isso conversou com o MTE".
-- ============================================================

CREATE TABLE IF NOT EXISTS "caepi_sincronizacoes" (
  "id"                   TEXT PRIMARY KEY,
  "iniciadoEm"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concluidoEm"          TIMESTAMP(3),
  "status"               TEXT NOT NULL,
  "origem"               TEXT NOT NULL DEFAULT 'agendada',
  "registrosLidos"       INTEGER NOT NULL DEFAULT 0,
  "registrosNovos"       INTEGER NOT NULL DEFAULT 0,
  "registrosAtualizados" INTEGER NOT NULL DEFAULT 0,
  "fichasConsultadas"    INTEGER NOT NULL DEFAULT 0,
  "erro"                 TEXT
);

CREATE INDEX IF NOT EXISTS "caepi_sincronizacoes_iniciadoEm_idx"
  ON "caepi_sincronizacoes" ("iniciadoEm");

-- Os dois CAs que o perito já havia levantado à mão entram como
-- semente. Conferem com a ficha do MTE (17 dB e 13 dB), e ficam
-- marcados como PERITO para que a planilha dele continue sendo a
-- referência caso a ficha oficial saia do ar.
INSERT INTO "cas_atenuacao" ("numeroCa", "nrrsfDb", "fonte", "observacao", "atualizadoEm")
VALUES
  ('11882', 17, 'PERITO', 'Conferido com a planilha do perito e com a ficha do CAEPI.', CURRENT_TIMESTAMP),
  ('18189', 13, 'PERITO', 'Conferido com a planilha do perito e com a ficha do CAEPI.', CURRENT_TIMESTAMP)
ON CONFLICT ("numeroCa") DO NOTHING;

COMMIT;
