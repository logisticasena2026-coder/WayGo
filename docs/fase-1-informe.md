# WayGo — Informe técnico FASE 1

**Fecha:** 14/11/2026
**Alcance:** Análisis del entorno, arquitectura, configuración de React/Node.js/PostgreSQL/Prisma, autenticación y roles.

---

## 1. Entorno detectado

| Herramienta | Estado |
|---|---|
| Node.js | v24.19.0 ✅ |
| npm | 11.17.0 ✅ |
| PostgreSQL | No instalado → se provisionó **16.10 portable** en `tools/postgresql` (sin tocar el sistema, sin admin) |
| Docker | No instalado → se entrega `docker-compose.yml` como alternativa documentada |
| Chocolatey / winget | Disponibles (no se usaron para no modificar el sistema) |

## 2. Base de datos (real, sin datos simulados)

- PostgreSQL 16.10 corriendo en `127.0.0.1:5433`.
- Base de datos `waygo_db`, usuario de aplicación `waygo` (contraseña aleatoria en `backend/.env`).
- Extensión `pgcrypto` habilitada.
- Scripts de gestión: `tools/scripts/db-start.ps1`, `db-stop.ps1`, `db-status.ps1` (también `npm run db:start|stop|status`).
- Migración inicial `init` aplicada: **30 tablas** (26 entidades del pliego + `refresh_tokens`, `verification_tokens`, `review_scores`, `driver_location_shares`).
- UUID en todas las PK, `timestamptz` (UTC) en fechas, `Decimal` para dinero, índices por estado/geolocalización/fechas, consecutivo legible `request_number` para solicitudes.
- Seed ejecutado: 4 roles, 3 tipos de servicio, 10 criterios de evaluación, admin `admin@waygo.local`.

## 3. Archivos creados (principales)

```
package.json                  # raíz, npm workspaces + scripts orquestadores
.gitignore
docker-compose.yml
README.md
prisma/schema.prisma          # modelo relacional completo
prisma/migrations/.../migration.sql
prisma/seed.js
tools/scripts/db-*.ps1
backend/package.json, .env, .env.example
backend/src/config/env.js
backend/src/utils/{prisma,password,jwt,crypto,mailer,audit,apiError,catchAsync}.js
backend/src/middlewares/{auth,errorHandler,notFound,rateLimiter,validate}.js
backend/src/validators/auth.validators.js
backend/src/services/auth.service.js
backend/src/controllers/auth.controller.js
backend/src/routes/{index,auth.routes}.js
backend/src/sockets/index.js
backend/src/{app,server}.js
frontend/ (Vite + React 19)
frontend/src/styles/global.css
frontend/src/services/{api,auth.service}.js
frontend/src/context/AuthContext.jsx
frontend/src/components/ProtectedRoute.jsx
frontend/src/layouts/AppLayout.jsx
frontend/src/pages/LandingPage.jsx
frontend/src/pages/auth/{Login,Register,ForgotPassword,ResetPassword,ConfirmEmail}Page.jsx
frontend/src/pages/DashboardPages.jsx
frontend/src/{App,main}.jsx
tests/auth.test.js            # 19 pruebas de integración
docs/fase-1-informe.md        # este informe
```

## 4. Funciones implementadas

- **Registro** con correo + contraseña (bcrypt 12) y rol público (CUSTOMER/DRIVER); crea `User` + `UserProfile` + perfil de rol en una transacción Prisma.
- **Confirmación de correo** por token opaco (SHA-256 en BD, 24 h), con reenvío.
- **Login**: JWT de acceso (15 min) + refresh token (7 días, cookie HttpOnly `waygo_rt`, rotación y detección de reutilización que revoca la cadena).
- **Recuperación/restablecimiento de contraseña** (token 1 h, revoca todas las sesiones).
- **RBAC**: middleware `requireAuth`, `requireRole`, `requireActive`; roles ADMIN, CUSTOMER, DRIVER, CALL_CENTER.
- **Seguridad**: Helmet, CORS con credenciales, rate limiting (API/auth/reset), express-validator, errores JSON consistentes, respuestas neutras anti-enumeración.
- **Auditoría**: registro de registro, confirmación, login exitoso/fallido, recuperación, reset, reutilización de refresh.
- **Socket.IO**: scaffolding con autenticación JWT en handshake y salas `user:<id>` / `role:<rol>` (base de FASE 4).
- **Frontend**: landing con 4 accesos, registro/login/recuperación/restablecimiento/confirmación, rutas protegidas, layout con menú lateral por rol, proxy `/api` → backend.

## 5. Verificación ejecutada (evidencia real)

1. Conexión PostgreSQL: `SELECT current_user, current_database(), version()` → OK.
2. Migración `init` aplicada; `\dt` lista 30 tablas → OK.
3. Seed → roles, tipos, criterios, admin → OK.
4. Servidor backend: inicio, health `GET /api/health` → OK.
5. Flujo manual: registro cliente → correo de confirmación (consola) → confirmar → login → `me` → refresh (rotación) → logout → OK.
6. Contraseña incorrecta → 401; ruta protegida sin token → 401 → OK.
7. Auditoría en `audit_logs` contiene USER_REGISTERED, EMAIL_CONFIRMED, LOGIN_SUCCESS, LOGIN_FAILED → OK.
8. Frontend: `vite build` OK; servidor dev en 5173 OK; proxy `/api/health` → OK.
9. **Pruebas automatizadas: 19/19 exitosas** (`npm run test:backend`).

## 6. Decisiones documentadas

- **bcrypt** en lugar de Argon2id (el pliego permite ambas): evita compilación nativa en Windows portable.
- **npm workspaces**: el cliente Prisma generado es compartido por backend y seed (resolución de módulos hoisted).
- **Correos en consola** en desarrollo (`MAIL_PROVIDER=console`); SMTP configurable por `.env` para producción.
- **Puerto 5433** para no colisionar con instalaciones PostgreSQL futuras del sistema.
- Rol `ADMIN`/`CALL_CENTER` **no** se puede auto-registrar por la vía pública (solo seed o administración, FASE 2+).
- Fechas almacenadas en UTC (`timestamptz`); zona operativa configurable `APP_TIMEZONE=America/Bogota`.

## 7. Pendientes / deuda técnica para fases siguientes

- Subida de fotografía de perfil y documentos (multer + validación MIME) — FASE 2.
- Verificación documental y habilitación de conductores — FASE 2.
- Dockerfiles de backend/frontend referenciados en `docker-compose.yml` — FASE 7 (despliegue).
- Swagger/OpenAPI — cuando la API crezca (FASE 3-6).
- Nodemailer real (SMTP) — configuración de producción.
- Eventos Socket.IO de negocio — FASE 4.

## 8. Credenciales generadas en esta fase

- **Admin**: `admin@waygo.local` / contraseña aleatoria impresa en consola durante el seed (guardada por el equipo; para regenerarla, definir `SEED_ADMIN_PASSWORD` en `backend/.env` y volver a sembrar en una BD limpia, o actualizarla vía `reset-password`).
- **PostgreSQL**: superusuario `postgres` y usuario `waygo` con contraseñas aleatorias; la de aplicación vive en `backend/.env` (`DATABASE_URL`).
- Secretos JWT aleatorios en `backend/.env`.
