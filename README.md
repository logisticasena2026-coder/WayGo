# WayGo — Plataforma inteligente de transporte y servicios

Plataforma web para servicios de **transporte de personas**, **envío de paquetes** y **contratos mensuales**, con negociación de tarifas entre clientes y conductores, supervisión por un centro de control y estadísticas operativas.

## Características

- **Motor de negociación**: los clientes publican una solicitud con un precio propuesto y los conductores aceptan el precio o presentan **contraofertas**. La aceptación es **transaccional** (un solo conductor por servicio).
- **Seguimiento en vivo**: mapa con la **ruta real** origen → destino (OSRM), el **vehículo en tiempo real** y el rastro ya recorrido.
- **Autocompletado de direcciones** con geocodificación (Nominatim/OpenStreetMap) y opción "usar mi ubicación actual".
- **Vistas múltiples** en los listados: Lista, Grid, Canvas (Kanban), Tiempo (línea temporal) y **Gantt**.
- **Call center**: mapa operativo, asignación manual con trazabilidad, tickets/incidentes y supervisión en tiempo real.
- **Verificación documental** de conductores antes de habilitarlos para operar.
- **Paquetes** con código de seguimiento y evidencia de entrega; **contratos mensuales** con recurrencia y alertas.
- **Evaluaciones bidireccionales** por criterios y **estadísticas** con gráficos y exportación a CSV/PDF.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React 19, Vite, React Router 7, Axios, Socket.IO Client, Leaflet, Recharts |
| Backend | Node.js 20+, Express 4, Socket.IO, JWT, bcrypt |
| Base de datos | PostgreSQL 16 + Prisma ORM 6 |
| Mapas | Leaflet + OpenStreetMap, rutas OSRM, geocodificación Nominatim (gratuitos, sin API key) |
| Despliegue | Docker / Docker Compose |
| Monorepo | npm workspaces (`backend`, `frontend`) |

## Requisitos

- Node.js 20+ y npm 10+
- **Una** de estas opciones para la base de datos:
  - PostgreSQL 16 portable incluido en `tools/postgresql` (Windows), o
  - Docker + Docker Compose, o
  - un PostgreSQL propio.

## Estructura

```
waygo/
  frontend/            # React (Vite) - puerto 5173
    src/
      components/      # Reutilizables: mapa, selector de vista, autocompletado, etc.
      pages/           # Paginas por rol (cliente, conductor, call center, admin)
      layouts/         # Layout con menu lateral por rol
      hooks/           # Hooks personalizados (notificaciones en tiempo real)
      services/        # Clientes HTTP (axios) por modulo
      context/         # Contextos de React (AuthContext)
      utils/           # Utilidades (fechas)
      styles/          # CSS global
    Dockerfile         # Build Vite + Nginx
    nginx.conf         # Proxy /api, /uploads y /socket.io
  backend/             # Express + Socket.IO - puerto 4000
    src/
      controllers/     # Controladores HTTP
      services/        # Logica de negocio
      routes/          # Rutas /api/*
      middlewares/     # Auth, RBAC, rate limit, errores, validacion, upload
      sockets/         # Socket.IO (auth JWT, presencia, salas)
      validators/      # Cadenas express-validator
      utils/           # Prisma, JWT, bcrypt, mailer, auditoria, reportes
    uploads/           # Archivos subidos (fotos, documentos)
    Dockerfile         # Node 20 + Prisma
  prisma/
    schema.prisma      # Modelo relacional completo (30 tablas)
    migrations/        # Migraciones SQL versionadas
    seed.js            # Datos base (roles, tipos, criterios, admin, call center)
  docs/                # Documentacion tecnica por fase
  tests/               # Pruebas de integracion (node:test + supertest)
  tools/
    postgresql/        # PostgreSQL 16 portable (binarios + datos)
    scripts/           # db-start.ps1 / db-stop.ps1 / db-status.ps1
  docker-compose.yml   # Despliegue completo (db + backend + frontend)
  .env.example         # Plantilla de variables para Docker
```

## Puesta en marcha rápida (entorno actual)

```powershell
npm run db:start        # 1. PostgreSQL portable
npm run dev:backend     # 2. API (http://localhost:4000)
npm run dev:frontend    # 3. Web (http://localhost:5173)
```

Abre **http://localhost:5173**.

## Instalación desde cero

### Opción A — Local (Windows, sin Docker)

```powershell
npm install

# Descargar postgresql-16.10-1-windows-x64-binaries.zip de
# https://www.enterprisedb.com/download-postgresql-binaries
# y extraer la carpeta "pgsql" como tools/postgresql/
npm run db:start

copy backend\.env.example backend\.env   # completar DATABASE_URL y secretos JWT
npm run prisma:migrate
npm run prisma:seed

npm run dev:backend
npm run dev:frontend
```

### Opción B — Docker Compose

```powershell
copy .env.example .env                  # completar DB_PASSWORD y secretos JWT
docker compose up -d --build
```

- Frontend en **http://localhost:5173** (Nginx proxya `/api` y `/socket.io` al backend).
- El backend ejecuta **migraciones + seed automáticamente** al iniciar (idempotentes).

## Credenciales DEMO

El seed crea estos usuarios de demostración:

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin@waygo.local` | `xXIEo48IBwzpWg1!` |
| Call center | `callcenter@waygo.local` | `tp9oWmOwb5AFWg1!` |
| Cliente | `cliente.prueba@waygo.co` | `Cliente2026!` |
| Conductor | `conductor.prueba@waygo.co` | `Conductor2026!` |

> Las contraseñas de `admin` y `callcenter` son aleatorias si no se definen `SEED_ADMIN_PASSWORD` / `SEED_CALLCENTER_PASSWORD` en `backend/.env`; en ese caso se imprimen **una sola vez** en la consola al sembrar.

## Comandos útiles

| Comando | Descripción |
|---|---|
| `npm run db:start` / `db:stop` / `db:status` | Gestiona el PostgreSQL portable |
| `npm run dev:backend` | Backend con recarga automática (nodemon) |
| `npm run dev:frontend` | Frontend Vite con HMR |
| `npm run prisma:migrate` | Aplica migraciones (desarrollo) |
| `npm run prisma:seed` | Siembra roles, tipos, criterios y usuarios demo |
| `npm run test:backend` | Ejecuta las pruebas de integración |

## Autenticación y seguridad

- Registro con correo/contraseña (roles públicos: `CUSTOMER`, `DRIVER`).
- Confirmación de correo por token (24 h). En desarrollo los correos se imprimen en la consola (`MAIL_PROVIDER=console`).
- **JWT de acceso** (15 min) + **refresh token** (7 días, cookie HttpOnly con rotación y detección de reutilización).
- Contraseñas con **bcrypt** (12 rondas); recuperación de contraseña por token (1 h).
- RBAC: `ADMIN`, `CUSTOMER`, `DRIVER`, `CALL_CENTER`.
- Helmet, CORS restringido, rate limiting por niveles, validación de entradas, manejo centralizado de errores, tokens opacos con hash SHA-256 y auditoría (`audit_logs`).

## Estado del proyecto

| Fase | Estado |
|---|---|
| FASE 1 — Arquitectura, PostgreSQL, Prisma, autenticación y roles | ✅ `docs/fase-1-informe.md` |
| FASE 2 — Perfiles, vehículos, documentos y verificación documental | ✅ `docs/fase-2-informe.md` |
| FASE 3 — Motor de solicitudes, ofertas y asignación transaccional | ✅ `docs/fase-3-informe.md` |
| FASE 4 — Call center, mapa operativo y tiempo real | ✅ |
| FASE 5 — Paquetes y contratos mensuales | ✅ |
| FASE 6 — Evaluaciones, estadísticas y reportes (CSV/PDF) | ✅ |
| FASE 7 — Pruebas, verificación de integridad y despliegue | ✅ `docs/fase-4-7-informe.md` |

## Licencia

BSD-2-Clause. Ver `LICENSE`.
