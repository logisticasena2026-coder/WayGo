# ============================================================
# WayGo - Dockerfile del backend (Node.js + Express + Prisma)
# Contexto de build: raiz del repositorio (necesita prisma/ y
# los manifests de los workspaces para npm ci).
#   docker build -f backend/Dockerfile -t waygo-backend .
# ============================================================

# ---- Etapa 1: dependencias ----
FROM node:20-alpine AS deps
WORKDIR /app

# Manifests de workspaces + schema de Prisma (para npm ci y generate)
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY prisma/ prisma/

RUN npm ci --no-audit --no-fund
RUN npx prisma generate --schema prisma/schema.prisma

# ---- Etapa 2: imagen de ejecucion ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 4000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY backend/ ./backend/
COPY prisma/ ./prisma/

# Directorio de archivos subidos (fotos/documentos)
RUN mkdir -p /app/backend/uploads

# Las migraciones y el seed se ejecutan via docker-compose (command)
# o puedes correrlos manualmente con:
#   npx prisma migrate deploy --schema prisma/schema.prisma && node prisma/seed.js
CMD ["node", "backend/src/server.js"]
