-- O cliente solicitou a remoção integral dos textos antigos da biblioteca.
-- A cópia abaixo mantém uma saída de recuperação administrativa sem voltar
-- a expor conteúdo desatualizado na aplicação.
CREATE TABLE "textos_biblioteca_arquivo_20260901" AS
TABLE "textos_biblioteca" WITH NO DATA;

INSERT INTO "textos_biblioteca_arquivo_20260901"
SELECT * FROM "textos_biblioteca";

DELETE FROM "textos_biblioteca";
