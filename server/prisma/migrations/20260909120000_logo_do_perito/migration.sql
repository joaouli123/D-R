-- Logo própria de cada perito (white-label).
--
-- Guarda só o nome do arquivo no volume de uploads, como "fotos.arquivo" já
-- faz. NULL = o perito ainda não subiu logo nenhuma e o documento sai com a
-- arte embutida do sistema.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "logoArquivo" TEXT;
