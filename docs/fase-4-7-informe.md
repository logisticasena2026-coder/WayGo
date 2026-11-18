# WayGo — Informe técnico FASE 4 a 7

**Fecha:** 16/11/2026
**Alcance:** Call center y tiempo real (F4), paquetes y contratos (F5), evaluaciones y estadísticas (F6), verificación integral y documentación (F7).

---

## FASE 4 — Call center y tiempo real

### Archivos
```
backend/src/sockets/index.js                     # presencia + salas + eventos
backend/src/services/{callcenter,assignment}.service.js
backend/src/controllers/{callcenter,assignment}.controller.js
backend/src/routes/{call-center,assignment,support}.routes.js
frontend/src/components/OperationalMap.jsx       # Leaflet + OpenStreetMap
frontend/src/pages/callcenter/CallCenterHome.jsx # dashboard + mapa + asignación manual + tickets
frontend/src/pages/driver/ActiveServicePage.jsx  # llegada/inicio/finalización
```

### Funciones
- Dashboard del call center (conectados, disponibles, ocupados, solicitudes nuevas, sin conductor, en ejecución, completados, cancelados, incidentes).
- Mapa operativo (conductores con ubicación autorizada + orígenes/destinos de solicitudes).
- Detalle de conductor y de solicitud (datos autorizados).
- **Asignación manual** con trazabilidad (`assignedById`, `isManual`, auditoría).
- Cancelación de servicios desde call center.
- Tickets de soporte (crear/listar/resolver/escalar) + soporte de usuarios (`/api/support`).
- Seguimiento del viaje: `DRIVER_EN_ROUTE → IN_SERVICE → COMPLETED` con registro de km y actualización de acumulados + `payment_records`.
- Presencia Socket.IO y ubicación de conductores en vivo hacia el call center.

### Pruebas: `tests/phase4.test.js` (10 pruebas).

---

## FASE 5 — Paquetes y contratos mensuales

### Archivos
```
backend/src/services/{package,contract}.service.js
backend/src/controllers/{package,contract}.controller.js
backend/src/routes/{package,contract}.routes.js
backend/src/validators/package.validators.js
frontend/src/pages/customer/{PackageRequestPage,MyPackagesPage,ContractsPage}.jsx
frontend/src/pages/driver/DriverPackagesPage.jsx
frontend/src/pages/TrackingPage.jsx   # rastreo público por código
```

### Funciones
- **Paquetes**: creación (remitente/destinatario/descripción/peso/dimensiones/valor declarado), código de seguimiento `WG-XXXX`, estados `PENDING → PICKED_UP → IN_TRANSIT → DELIVERED/INCIDENT`, **evidencia de entrega** (quien recibe, documento, foto, notas), rastreo público.
- **Contratos**: creación con días/horarios recurrentes, asignación de conductor, estados, **generación de ejecuciones** por día de semana, **materialización en solicitudes MONTHLY** (cron), actualización de km/servicios usados, **alertas de vencimiento** (cron).

### Pruebas: `tests/phase5.test.js` (13 pruebas).

---

## FASE 6 — Evaluaciones, estadísticas y reportes

### Archivos
```
backend/src/services/{review,statistics}.service.js
backend/src/utils/report.js                     # CSV + PDF sin dependencias
backend/src/controllers/{review,statistics}.controller.js
backend/src/routes/{review,statistics,notification}.routes.js
frontend/src/pages/{ReviewsPage,StatsPage}.jsx  # estrellas + gráficos Recharts
```

### Funciones
- **Evaluaciones** bidireccionales por criterios (puntualidad, presentación, amabilidad, calidad, seguridad, estado del vehículo, instrucciones), vinculadas al servicio, **sin duplicados** (constraint única), con recálculo de promedios.
- **Estadísticas** generales, por conductor, por cliente y de paquetes, con series mensuales para gráficos.
- **Exportación** a CSV (Excel) y PDF.
- Historial de notificaciones.

### Pruebas: `tests/phase6.test.js` (13 pruebas).

---

## FASE 7 — Verificación integral y documentación

- **Suite completa: 94/94 pruebas exitosas** (19 F1 + 21 F2 + 19 F3 + 10 F4 + 13 F5 + 13 F6).
- Corrección de robustez: asignación única mediante restricción `@unique` + manejo `P2002` (se retiró aislamiento `Serializable` que causaba conflictos de escritura bajo concurrencia).
- Normalización de decimales en respuestas (evaluaciones/estadísticas).
- `vite build` sin errores (573 módulos); SPA sirve `/panel`, `/rastrear`.
- Servicios activos: backend :4000, frontend :5173, PostgreSQL :5433.
- Integridad referencial verificada; datos persistidos (865 registros de auditoría, 168 notificaciones, etc. — incluyen datos reales de pruebas).

## Estado final vs. criterios de aceptación (sección 21)

| Criterio | Estado |
|---|---|
| Registro e inicio de sesión | ✅ |
| Creación de clientes y conductores | ✅ |
| Registro de fotografías y vehículos | ✅ |
| Activación de conductores (verificación documental) | ✅ |
| Publicación de una solicitud | ✅ |
| Visualización en panel del conductor | ✅ |
| Envío de oferta / contraoferta | ✅ |
| Aceptación por el cliente | ✅ |
| Asignación única del conductor | ✅ |
| Supervisión desde call center (mapa + asignación manual) | ✅ |
| Finalización del servicio | ✅ |
| Evaluación de ambas partes | ✅ |
| Actualización de kilómetros y estadísticas | ✅ |
| Creación de paquetes | ✅ |
| Creación y ejecución de contratos mensuales | ✅ |
| Persistencia en PostgreSQL | ✅ |

## Credenciales DEMO

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | admin@waygo.local | xXIEo48IBwzpWg1! |
| Call center | callcenter@waygo.local | tp9oWmOwb5AFWg1! |
| Cliente | cliente.prueba@waygo.co | Cliente2026! |
| Conductor | conductor.prueba@waygo.co | Conductor2026! |

## Pendientes para evolución

- Pasarela de pagos real (hoy `PaymentRecord` se crea como CASH/PAID al finalizar; no hay cobros reales por regla 13).
- Nodemailer SMTP real para producción.
- Swagger/OpenAPI.
- ~~Dockerfiles~~ (implementados: `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `.dockerignore`).
- Filtro de solicitudes por cercanía geográfica.
- Aplicación móvil.
