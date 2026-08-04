# ============================================================
# API do D&R Perícia Elite
#
# Usa o Chromium do Debian em vez do que o Puppeteer baixa: a
# imagem fica menor e o binário recebe as atualizações de segurança
# do sistema. PUPPETEER_EXECUTABLE_PATH aponta para ele.
# ============================================================

# ---------- build ----------
FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Descarta as dependências de desenvolvimento. O pacote `prisma`
# fica em dependencies de propósito: o entrypoint roda
# `prisma migrate deploy` na subida, e o CLI precisa sobreviver
# a este prune.
RUN npm prune --omit=dev


# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime

# chromium  → motor de PDF
# fonts-liberation → Times New Roman metricamente compatível, a
#   serifa que o documento pericial usa
# fonts-dejavu-core → cobertura de caracteres de apoio
# tini → PID 1 que encaminha SIGTERM e colhe processos órfãos do
#   Chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       chromium \
       fonts-liberation \
       fonts-dejavu-core \
       ca-certificates \
       tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3333 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    UPLOAD_DIR=/app/uploads

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# O usuário 'node' já existe na imagem base; roda sem privilégios.
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3333)+'/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
