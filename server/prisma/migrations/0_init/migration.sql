-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('admin', 'perito', 'assistente');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('insalubridade', 'periculosidade', 'ambas');

-- CreateEnum
CREATE TYPE "StatusPericia" AS ENUM ('rascunho', 'em_andamento', 'concluida', 'entregue');

-- CreateEnum
CREATE TYPE "PapelParticipante" AS ENUM ('perito_judicial', 'assistente_reclamante', 'assistente_reclamada', 'advogado_reclamante', 'advogado_reclamada', 'preposto', 'acompanhante');

-- CreateEnum
CREATE TYPE "SecaoFoto" AS ENUM ('ambiente', 'atividades', 'equipamentos', 'epi', 'produtos', 'documentos');

-- CreateEnum
CREATE TYPE "SecaoTexto" AS ENUM ('apresentacao', 'objetivo', 'empresa', 'ambiente', 'atividades', 'analise', 'conclusao', 'manifestacao', 'impugnacao', 'esclarecimento', 'generico');

-- CreateEnum
CREATE TYPE "TemaQuesito" AS ENUM ('gerais', 'insalubridade', 'periculosidade', 'ruido', 'calor', 'quimicos', 'biologicos', 'epi', 'ergonomia', 'eletricidade', 'inflamaveis');

-- CreateEnum
CREATE TYPE "OrigemQuesito" AS ENUM ('juizo', 'reclamante', 'reclamada', 'proprio');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('parecer', 'laudo', 'quesitos', 'manifestacao', 'impugnacao', 'esclarecimento');

-- CreateEnum
CREATE TYPE "StatusDocumento" AS ENUM ('rascunho', 'finalizado', 'enviado');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'assistente',
    "registroProfissional" TEXT,
    "titulo" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcesso" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "cnae" TEXT,
    "grauRisco" TEXT,
    "endereco" TEXT NOT NULL DEFAULT '',
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL DEFAULT 'SP',
    "cep" TEXT,
    "contatoNome" TEXT,
    "contatoEmail" TEXT,
    "contatoTelefone" TEXT,
    "ramoAtividade" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pericias" (
    "id" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL DEFAULT '',
    "vara" TEXT NOT NULL DEFAULT '',
    "comarca" TEXT NOT NULL DEFAULT '',
    "reclamante" TEXT NOT NULL DEFAULT '',
    "cpfReclamante" TEXT,
    "funcaoReclamante" TEXT,
    "admissao" TEXT,
    "demissao" TEXT,
    "dataVistoria" TEXT,
    "horaVistoria" TEXT,
    "localVistoria" TEXT,
    "modalidade" "Modalidade" NOT NULL DEFAULT 'insalubridade',
    "status" "StatusPericia" NOT NULL DEFAULT 'rascunho',
    "tecnico" JSONB NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pericias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamadas" (
    "id" TEXT NOT NULL,
    "periciaId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reclamadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participantes" (
    "id" TEXT NOT NULL,
    "periciaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "papel" "PapelParticipante" NOT NULL,
    "registro" TEXT,
    "contato" TEXT,

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos" (
    "id" TEXT NOT NULL,
    "periciaId" TEXT NOT NULL,
    "secao" "SecaoFoto" NOT NULL,
    "arquivo" TEXT NOT NULL,
    "legenda" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textos_biblioteca" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "secao" "SecaoTexto" NOT NULL DEFAULT 'generico',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conteudo" TEXT NOT NULL,
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "textos_biblioteca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quesitos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "codigo" TEXT NOT NULL,
    "tema" "TemaQuesito" NOT NULL,
    "origem" "OrigemQuesito" NOT NULL,
    "pergunta" TEXT NOT NULL,
    "respostaPadrao" TEXT,
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "personalizado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quesitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "titulo" TEXT NOT NULL,
    "periciaId" TEXT,
    "numeroProcesso" TEXT NOT NULL DEFAULT '—',
    "reclamante" TEXT NOT NULL DEFAULT '—',
    "empresaPrincipal" TEXT NOT NULL DEFAULT '—',
    "status" "StatusDocumento" NOT NULL DEFAULT 'rascunho',
    "conteudo" JSONB,
    "anexoExternoNome" TEXT,
    "anexoExternoArquivo" TEXT,
    "enviadoPara" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE INDEX "pericias_responsavelId_idx" ON "pericias"("responsavelId");

-- CreateIndex
CREATE INDEX "pericias_numeroProcesso_idx" ON "pericias"("numeroProcesso");

-- CreateIndex
CREATE INDEX "reclamadas_periciaId_idx" ON "reclamadas"("periciaId");

-- CreateIndex
CREATE INDEX "reclamadas_empresaId_idx" ON "reclamadas"("empresaId");

-- CreateIndex
CREATE INDEX "participantes_periciaId_idx" ON "participantes"("periciaId");

-- CreateIndex
CREATE INDEX "fotos_periciaId_idx" ON "fotos"("periciaId");

-- CreateIndex
CREATE INDEX "textos_biblioteca_usuarioId_idx" ON "textos_biblioteca"("usuarioId");

-- CreateIndex
CREATE INDEX "quesitos_usuarioId_idx" ON "quesitos"("usuarioId");

-- CreateIndex
CREATE INDEX "documentos_periciaId_idx" ON "documentos"("periciaId");

-- CreateIndex
CREATE INDEX "documentos_criadoPorId_idx" ON "documentos"("criadoPorId");

-- AddForeignKey
ALTER TABLE "pericias" ADD CONSTRAINT "pericias_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamadas" ADD CONSTRAINT "reclamadas_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "pericias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamadas" ADD CONSTRAINT "reclamadas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "pericias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "pericias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textos_biblioteca" ADD CONSTRAINT "textos_biblioteca_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quesitos" ADD CONSTRAINT "quesitos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "pericias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

