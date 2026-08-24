-- Data de ajuizamento da acao.
--
-- E dela que sai o periodo avaliado: cinco anos para tras, ou a
-- admissao, o que vier depois. Fica anulavel porque as pericias ja
-- gravadas nao tem o dado — quem abrir uma delas preenche pela consulta
-- do CNJ, que agora traz a data junto de vara e comarca.

BEGIN;

ALTER TABLE "pericias"
  ADD COLUMN "dataAjuizamento" TEXT;

COMMIT;
