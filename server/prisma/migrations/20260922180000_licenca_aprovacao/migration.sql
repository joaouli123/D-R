-- Cadastro público: a licença nasce suspensa e aguardando a aprovação do titular.
ALTER TABLE "licencas" ADD COLUMN "aguardandoAprovacao" BOOLEAN NOT NULL DEFAULT false;
