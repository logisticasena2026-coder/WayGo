# ============================================================
# WayGo - Dockerfile del frontend (React + Vite + Nginx)
# Contexto de build: raiz del repositorio (necesita el
# package-lock.json del workspace para un build reproducible).
#   docker build -f frontend/Dockerfile -t waygo-frontend .
# ============================================================

# ---- Etapa 1: build de la SPA ----
FROM node:20-alpine AS build
WORKDIR /app

# Manifests de workspaces + lockfile de la raiz. Sin el lockfile,
# `npm install` resolveria versiones al azar en cada build y el
# dia de manana podria romperse solo. Con `npm ci` se respetan
# exactamente las versiones ya probadas.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# El schema de Prisma se copia antes de instalar porque el
# postinstall de @prisma/client intenta localizarlo.
COPY prisma/ prisma/

RUN npm ci --no-audit --no-fund

COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm run build

# ---- Etapa 2: servidor estatico + proxy ----
# Solo se conserva dist/ y nginx.conf: todo el node_modules de la
# etapa anterior (incluidas las dependencias del backend) queda
# fuera de la imagen final.
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
