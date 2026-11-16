# WayGo — Plataforma inteligente de transporte y servicios

Plataforma web para servicios de **transporte de personas**, **envío de paquetes** y **contratos mensuales**, con negociación de tarifas entre clientes y conductores, supervisión por call center y estadísticas operativas.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React 19, Vite, React Router 7, Axios, Socket.IO Client, Leaflet, Recharts |
| Backend | Node.js 24, Express 4, Socket.IO, JWT, bcrypt |
| Base de datos | PostgreSQL 16 (portable, en `tools/postgresql`) + Prisma ORM 6 |
| Monorepo | npm workspaces (`backend`, `frontend`) |

## Estructura

```
waygo/
  frontend/          # React (Vite) - puerto 5173
    src/
      components/    # Componentes reutilizables (rutas protegidas, etc.)
      pages/         # Paginas (landing, auth, dashboards)
      layouts/       # Layout con menu lateral por rol
      hooks/         # Hooks personalizados
      services/      # Clientes HTTP (axios) y servicios
      context/       # Contextos de React (AuthContext)
      styles/        # CSS global
      assets/        # Recursos estaticos
  backend/           # Express + Socket.IO - puerto 4000
    src/
      controllers/   # Controladores HTTP
      services/      # Logica de negocio
      routes/        # Definicion de rutas /api/*
      middlewares/   # Auth, RBAC, rate limit, errores, validacion
      sockets/       # Socket.IO (auth JWT, salas por usuario/rol)
      validators/    # Cadenas express-validator
      utils/         # Prisma, JWT, bcrypt, mailer, auditoria
    uploads/         # Archivos subidos (fotos, documentos)
  prisma/
    schema.prisma    # Modelo relacional completo (30 tablas)
    migrations/      # Migraciones SQL versionadas
    seed.js          # Datos base (roles, tipos, criterios, admin)
  docs/              # Documentacion tecnica por fase
  tests/             # Pruebas de integracion (node:test + supertest)
  tools/
    postgresql/      # PostgreSQL 16 portable (binarios + datos)
    scripts/         # db-start.ps1 / db-stop.ps1 / db-status.ps1
  docker-compose.yml # Alternativa de despliegue con Docker
  .env.example       # Plantilla de variables (ver backend/.env.example)
```

## Requisitos

- Node.js 24+ y npm 11+
- Windows 10/11 (para el PostgreSQL portable incluido) **o** Docker / PostgreSQL propio

## Puesta en marcha (entorno actual, ya instalado)

```powershell
# 1. Iniciar PostgreSQL portable
npm run db:start

# 2. Iniciar el backend (http://localhost:4000)
npm run dev:backend

# 3. En otra terminal, iniciar el frontend (http://localhost:5173)
npm run dev:frontend
```

Abrir **http://localhost:5173** en el navegador.

## Instalación desde cero (otro equipo)

```powershell
# 1. Instalar dependencias (workspaces: instala backend + frontend)
npm install

# 2. PostgreSQL: opcion A) portable
#    Descargar postgresql-16.10-1-windows-x64-binaries.zip de
#    https://www.enterprisedb.com/download-postgresql-binaries
#    y extraer su carpeta "pgsql" como tools/postgresql/
npm run db:start   # inicializa data/ la primera vez (ver docs/fase-1-informe.md)

#    Opcion B) Docker
docker compose up -d db

# 3. Configurar variables
copy backend\.env.example backend\.env
#    Editar backend/.env: DATABASE_URL, secretos JWT, etc.

# 4. Migraciones y datos base
npm run prisma:migrate
npm run prisma:seed

# 5. Ejecutar
npm run dev:backend
npm run dev:frontend
```

## Comandos útiles

| Comando | Descripción |
|---|---|
| `npm run db:start` / `db:stop` / `db:status` | Gestiona el PostgreSQL portable |
| `npm run dev:backend` | Backend con recarga automática (nodemon) |
| `npm run dev:frontend` | Frontend Vite con HMR |
| `npm run prisma:migrate` | Aplica migraciones (desarrollo) |
| `npm run prisma:seed` | Siembra roles, tipos de servicio, criterios y admin |
| `npm run test:backend` | Ejecuta las pruebas de integración |

## Autenticación (FASE 1)

- Registro con correo/contraseña (roles públicos: **CUSTOMER**, **DRIVER**).
- Confirmación de correo por token (24 h). En desarrollo los correos se imprimen en la consola del backend (`MAIL_PROVIDER=console`).
- Login con **JWT de acceso** (15 min, Authorization Bearer) + **refresh token** (7 días, cookie HttpOnly con rotación y detección de reutilización).
- Recuperación de contraseña por token (1 h).
- Contraseñas con **bcrypt** (12 rondas).
- RBAC: `ADMIN`, `CUSTOMER`, `DRIVER`, `CALL_CENTER`.

### Credenciales del administrador sembrado

El seed crea `admin@waygo.local`. La contraseña se define con `SEED_ADMIN_PASSWORD` en `backend/.env`; si se omite, se genera una aleatoria que **se imprime una sola vez** en consola al sembrar.

## Seguridad

Helmet, CORS restringido al frontend, rate limiting por niveles, validación de entradas con express-validator, manejo centralizado de errores, tokens opacos con hash SHA-256, auditoría de operaciones sensibles (`audit_logs`).

## Estado del proyecto

- [x] **FASE 1** — Arquitectura, PostgreSQL, Prisma (30 tablas), autenticación y roles (ver `docs/fase-1-informe.md`)
- [x] **FASE 2** — Perfiles, vehículos, documentos, verificación documental y paneles (ver `docs/fase-2-informe.md`)
- [x] **FASE 3** — Motor de solicitudes, ofertas, contraofertas y asignación transaccional (ver `docs/fase-3-informe.md`)
- [x] **FASE 4** — Call center, mapa operativo y tiempo real
- [x] **FASE 5** — Paquetes y contratos mensuales
- [x] **FASE 6** — Evaluaciones, estadísticas y reportes (CSV/PDF)
- [x] **FASE 7** — Pruebas finales, verificación de integridad y documentación (ver `docs/fase-4-7-informe.md`)
