#!/bin/sh
set -e

# Aplica as migrations pendentes antes de aceitar tráfego. Se o
# banco ainda não estiver de pé, o container morre e o orquestrador
# reinicia — melhor do que servir uma API com schema desatualizado.
echo "▸ aplicando migrations..."
npx prisma migrate deploy

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
