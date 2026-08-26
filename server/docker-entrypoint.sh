#!/bin/sh
set -e

# Aplica as migrations pendentes antes de aceitar tráfego. Se o
# banco ainda não estiver de pé, o container morre e o orquestrador
# reinicia — melhor do que servir uma API com schema desatualizado.
echo "▸ aplicando migrations..."
MIGRACAO_RECUPERAVEL="20260826104500_numero_vistoria"

if ! npx prisma migrate deploy; then
  # Esta migration possui uma única operação idempotente. Se o banco
  # aplicou o ALTER TABLE, mas o Prisma não conseguiu registrar a
  # conclusão, ele passa a bloquear todas as próximas subidas com P3009.
  # A recuperação é deliberadamente limitada a esse nome: qualquer
  # outra falha continua interrompendo o container sem ser mascarada.
  echo "▸ recuperando estado da migration $MIGRACAO_RECUPERAVEL..."
  npx prisma migrate resolve --rolled-back "$MIGRACAO_RECUPERAVEL"
  npx prisma migrate deploy
fi

# Carga inicial (administrador, 39 quesitos, modelos). É idempotente
# e só roda quando ADMIN_SENHA está definida.
if [ -n "$ADMIN_SENHA" ]; then
  echo "▸ executando seed..."
  node dist/seed.js
else
  echo "· ADMIN_SENHA não definida — seed ignorado."
fi

echo "▸ iniciando API"
exec "$@"
