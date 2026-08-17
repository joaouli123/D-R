ALTER TABLE "textos_biblioteca"
ADD COLUMN "tiposDocumento" "TipoDocumento"[] NOT NULL DEFAULT ARRAY[]::"TipoDocumento"[];
