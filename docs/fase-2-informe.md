# WayGo — Informe técnico FASE 2

**Fecha:** 14/11/2026
**Alcance:** Perfiles de clientes y conductores, vehículos, documentos, verificación documental, habilitación de conductores y paneles de usuario.

---

## 1. Objetivo cumplido

- Perfil de usuario editable con fotografía y cambio de contraseña.
- Perfil de conductor: licencia de conducción, documentos requeridos, estado operativo (DISPONIBLE/DESCONECTADO) y consentimiento de geolocalización.
- Registro de uno o varios vehículos con fotografía y documentos (SOAT, tecnomecánica, tarjeta de propiedad).
- Módulo de **verificación documental y habilitación de conductores** (ADMIN): revisión de documentos con aprobación/rechazo motivado y habilitación con reglas de requisitos.
- Paneles de usuario (cliente, conductor, administrador) conectados a la API real.

## 2. Archivos creados

### Backend
```
src/middlewares/upload.js                 # multer: fotos/vehiculos/documentos, MIME + tamaño
src/validators/user.validators.js         # perfil + cambio de contrasena
src/validators/driver.validators.js       # licencia, docs, vehiculo, estado, ubicacion
src/services/user.service.js              # perfil, foto, contrasena
src/services/driver.service.js            # licencia, docs, estado, consentimiento, ubicacion
src/services/vehicle.service.js           # CRUD vehiculos, foto, docs
src/services/customer.service.js          # perfil cliente
src/services/admin.service.js             # verificacion documental + habilitacion + usuarios
src/controllers/{user,driver,vehicle,customer,admin}.controller.js
src/routes/{user,driver,vehicle,customer,admin}.routes.js
src/middlewares/errorHandler.js           # + manejo MulterError
```

### Frontend
```
src/services/{user,driver,vehicle,customer,admin}.service.js
src/components/StatusBadge.jsx            # badges de estado + estados vacios + spinner
src/pages/ProfilePage.jsx                 # datos, foto, contrasena
src/pages/customer/CustomerHome.jsx
src/pages/driver/DriverHome.jsx           # toggle DISPONIBLE/DESCONECTADO + resumen
src/pages/driver/VehiclesPage.jsx         # listar/crear/editar + foto + principal
src/pages/driver/DocumentsPage.jsx        # licencia + subir documentos
src/pages/admin/AdminDriversPage.jsx      # revision documental + habilitacion
src/pages/admin/AdminUsersPage.jsx        # listado y bloqueo/habilitacion
src/App.jsx                               # rutas por rol
src/layouts/AppLayout.jsx                 # menu admin actualizado
```

### Pruebas
```
tests/phase2.test.js                      # 21 pruebas de integracion
```

## 3. Endpoints implementados

| Módulo | Endpoints |
|---|---|
| `/api/users` | `GET/PUT /me/profile`, `POST /me/photo`, `PUT /me/password` |
| `/api/drivers` | `GET /me`, `PUT /me/license`, `POST/GET/DELETE /me/documents`, `PUT /me/status`, `PUT /me/location-consent`, `PUT /me/location` |
| `/api/vehicles` | `GET/POST /`, `GET/PUT/DELETE /:id`, `PUT /:id/primary`, `POST /:id/photo`, `POST/DELETE /:id/documents` |
| `/api/customers` | `GET /me` |
| `/api/admin` | `GET /drivers`, `GET /drivers/:id`, `POST /drivers/:id/verify`, `POST /driver-documents/:docId/review`, `POST /vehicle-documents/:docId/review`, `GET /users`, `PUT /users/:id/status` |

## 4. Reglas de negocio implementadas

- **Habilitación de conductores**: requiere licencia registrada y vigente + documentos obligatorios (LICENCIA, CEDULA) aprobados + al menos un vehículo activo.
- **Disponibilidad**: solo conductores `APPROVED` pueden pasar a `AVAILABLE`; el estado `BUSY` se reserva al sistema (no se puede fijar manualmente) y bloquea la desconexión.
- **Geolocalización**: solo se transmite si hay consentimiento explícito (`locationConsent`) y el conductor está conectado. Se registra en `driver_location_shares`. Revocar el consentimiento borra la última ubicación.
- **Vehículo principal**: el primero es automático; no se puede desactivar el principal sin designar otro.
- **Documentos**: reemplazo vuelve el registro a `PENDING` (y al conductor si estaba aprobado); no se pueden eliminar documentos aprobados.
- **Rechazo motivado**: no se permite rechazar sin indicar el motivo.
- **Trazabilidad**: toda revisión, habilitación, cambio de estado y bloqueo queda en `audit_logs`.

## 5. Verificación ejecutada (evidencia real)

1. Flujo manual completo contra la API (PowerShell + curl):
   - 403 al intentar conectar sin habilitación → OK
   - Licencia, vehículo (primero = principal), placa inválida (400), placa duplicada (409) → OK
   - Subida de documentos PDF (multipart) con MIME válido → OK
   - Rechazo de `.exe` (MIME no permitido) → OK
   - Aprobación de documentos + habilitación de conductor → OK
   - Conductor habilitado se pone DISPONIBLE → OK
   - Consentimiento GPS + actualización de ubicación → OK; revocación bloquea (403) → OK
2. **Pruebas automatizadas: 40/40 exitosas** (`npm run test:backend`).
3. Frontend: `vite build` OK; SPA sirve `/panel`; proxy `/api` OK.
4. Datos persistidos en PostgreSQL verificados (usuarios, `driver_profiles`, `vehicles`, `driver_documents`, `driver_location_shares`, `audit_logs`).

## 6. Pendientes para fases siguientes

- FASE 3: motor de solicitudes y ofertas (formulario de solicitud, publicación, ofertas/contraofertas, aceptación transaccional).
- FASE 4: call center, mapa operativo, notificaciones Socket.IO de negocio.
- FASE 5: paquetes y contratos mensuales.
- FASE 6: evaluaciones, estadísticas, reportes (Excel/PDF).
- Nodemailer real (SMTP) para producción.

## 7. Credenciales DEMO activas

| Rol | Usuario | Contraseña | Estado |
|---|---|---|---|
| Admin | admin@waygo.local | xXIEo48IBwzpWg1! | ACTIVE |
| Cliente | cliente.prueba@waygo.co | Cliente2026! | ACTIVE |
| Conductor | conductor.prueba@waygo.co | Conductor2026! | Habilitado (APPROVED) |
