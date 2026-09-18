-- Assinatura manuscrita de cada perito (foto da assinatura em papel).
--
-- Guarda só o nome do PNG no volume de uploads, como "logoArquivo". O arquivo
-- já chega tratado pelo servidor: recortado, com fundo transparente e no
-- tamanho da linha de assinatura. NULL = o documento sai só com a linha.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "assinaturaArquivo" TEXT;
