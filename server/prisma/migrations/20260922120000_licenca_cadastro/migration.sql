-- Cadastro completo da licença: contato e endereço do cliente, além do nome
-- e do CPF/CNPJ que já existiam. Tudo opcional — as licenças abertas antes
-- continuam válidas sem esses dados.

-- AlterTable
ALTER TABLE "licencas" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "uf" TEXT;
