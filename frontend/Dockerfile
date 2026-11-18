# ============================================================
# WayGo - Dockerfile del frontend (React + Vite + Nginx)
# Contexto de build: ./frontend
#   docker build -f frontend/Dockerfile -t waygo-frontend ./frontend
# ============================================================

# ---- Etapa 1: build de la SPA ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Etapa 2: servidor estatico + proxy ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
