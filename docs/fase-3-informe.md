# WayGo — Informe técnico FASE 3

**Fecha:** 14/11/2026
**Alcance:** Motor de solicitudes de servicio y negociación de ofertas (creación, publicación, ofertas, contraofertas, aceptación transaccional con asignación única).

---

## 1. Objetivo cumplido

- Formulario de solicitud con: número consecutivo, cliente, tipo de servicio, origen/destino (dirección + coordenadas GPS), fecha y hora, pasajeros, observaciones, precio propuesto y estado.
- Ciclo de estados: `DRAFT → PUBLISHED → RECEIVING_OFFERS → ASSIGNED → ...` con `CANCELLED` y `EXPIRED`.
- Conductores habilitados ven las solicitudes publicadas y pueden **aceptar el precio propuesto** o **contraofertar**.
- El cliente recibe las ofertas (foto, nombre, calificación, servicios, vehículo, placa, marca/modelo, color, precio, ETA) y **acepta una única oferta**.
- **Asignación transaccional**: se bloquean las demás ofertas, se asigna un solo conductor y el conductor pasa a `BUSY`.
- Retiro de solicitud por el cliente solo antes de la asignación.
- Notificaciones en tiempo real (Socket.IO) y persistidas en `notifications`.
- Expiración automática de solicitudes vencidas (cron).

## 2. Archivos creados

### Backend
```
src/utils/datetime.js                    # zona horaria America/Bogota (UTC-5)
src/validators/service.validators.js     # validacion solicitudes + ofertas
src/services/notification.service.js     # notificaciones BD + Socket.IO
src/services/request.service.js          # CRUD, publicar, retirar, listar, expirar
src/services/offer.service.js            # ofertar, contraofertar, retirar, aceptar (transaccional)
src/controllers/{request,offer}.controller.js
src/routes/{service,offer}.routes.js
src/server.js                            # + cron de expiracion cada 5 min
```

### Frontend
```
src/services/service.service.js          # solicitudes (cliente)
src/services/offer.service.js            # ofertas (conductor)
src/hooks/useNotifications.js            # Socket.IO en tiempo real
src/pages/customer/RequestServicePage.jsx  # formulario de solicitud
src/pages/customer/MyServicesPage.jsx    # mis solicitudes + ofertas + aceptacion
src/pages/driver/AvailableRequestsPage.jsx # solicitudes disponibles + ofertar
src/pages/driver/MyOffersPage.jsx        # mis ofertas
src/App.jsx                              # rutas conectadas
```

### Pruebas
```
tests/phase3.test.js                     # 19 pruebas de integracion
```

## 3. Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/services` | Crear solicitud (borrador) — cliente |
| GET | `/api/services/mine` | Mis solicitudes — cliente |
| PUT | `/api/services/:id` | Editar borrador — cliente |
| POST | `/api/services/:id/publish` | Publicar — cliente |
| POST | `/api/services/:id/withdraw` | Retirar/cancelar — cliente |
| GET | `/api/services/available` | Solicitudes disponibles — conductor |
| GET | `/api/services/:id` | Detalle (dueño o conductor) |
| POST | `/api/services/:id/offers` | Ofertar/contraofertar — conductor |
| GET | `/api/services/:id/offers` | Ofertas de una solicitud |
| POST | `/api/services/:id/offers/:offerId/accept` | Aceptar oferta (transaccional) — cliente |
| GET | `/api/offers` | Mis ofertas — conductor |
| DELETE | `/api/offers/:id` | Retirar oferta — conductor |

## 4. Reglas de negocio implementadas

- **Transacción serializable** en `acceptOffer`: la restricción `@unique(requestId)` en `service_assignments` impide que dos aceptaciones concurrentes creen dos asignaciones.
- Al aceptar: oferta → `ACCEPTED`, otras ofertas → `BLOCKED`, solicitud → `ASSIGNED` con `finalPrice`, conductor → `BUSY`.
- Un conductor mantiene **una sola oferta activa** por solicitud (actualizarla = contraoferta).
- No se puede ofertar a solicitud propia, ni con vehículo ajeno o inactivo, ni si el conductor no está habilitado.
- No se puede retirar una solicitud asignada/en curso; no se puede retirar una oferta ya procesada.
- Precio propuesto ≠ precio ofertado ⇒ se marca `isCounteroffer`.
- Fechas: se almacenan en UTC; la zona operativa es `America/Bogota` (UTC-5, sin DST).

## 5. Verificación ejecutada (evidencia real)

1. Flujo manual completo por API (PowerShell):
   - Cliente crea borrador (#1) → publica → conductor la ve disponible.
   - Conductor acepta precio (45000, no contraoferta) → actualiza a contraoferta (52000).
   - Cliente ve la oferta con vehículo y precio → acepta → asignación creada.
   - Segunda aceptación → 409; retiro tras asignación → 409; conductor → `BUSY`.
   - Notificaciones persistidas: `NEW_OFFER`, `COUNTEROFFER`, `OFFER_ACCEPTED`.
2. **Pruebas automatizadas: 59/59 exitosas** (19 FASE 1 + 21 FASE 2 + 19 FASE 3).
3. `vite build` sin errores; SPA sirviendo; proxy OK.

## 6. Pendientes para fases siguientes

- FASE 4: call center, mapa operativo, seguimiento en tiempo real, eventos de negocio Socket.IO extendidos.
- FASE 5: paquetes (seguimiento + evidencia) y contratos mensuales (generación recurrente).
- FASE 6: evaluaciones, estadísticas, reportes Excel/PDF.
- Mejora futura: filtro de solicitudes por cercanía geográfica del conductor (se usará con Leaflet en FASE 4).
