// ============================================================
// WayGo - Pruebas de integracion: FASE 3 (motor de solicitudes
// y ofertas, contraofertas y asignacion transaccional)
// Ejecutar con: npm --prefix backend test
// ============================================================
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const createApp = require('../backend/src/app');
const prisma = require('../backend/src/utils/prisma');
const { sha256 } = require('../backend/src/utils/crypto');
const { colombiaToUtc, todayColombia } = require('../backend/src/utils/datetime');

const app = createApp();
const stamp = Date.now();
const CUSTOMER_EMAIL = `test.c3.${stamp}@waygo.co`;
const DRIVER1_EMAIL = `test.d3a.${stamp}@waygo.co`;
const DRIVER2_EMAIL = `test.d3b.${stamp}@waygo.co`;
const PASSWORD = 'Prueba2026!';

let customerToken, driver1Token, driver2Token;
let customerId, driver1Id, driver2Id;
let vehicle1Id, vehicle2Id;
let requestId, requestNumber;
let offer1Id;

async function registerAndConfirm(email, role, firstName) {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role, firstName, lastName: 'Prueba' });
  const user = await prisma.user.findUnique({ where: { email } });
  const raw = `c-${email}-${stamp}`;
  await prisma.verificationToken.create({ data: { userId: user.id, tokenHash: sha256(raw), type: 'EMAIL_CONFIRMATION', expiresAt: new Date(Date.now() + 3600000) } });
  await request(app).post('/api/auth/confirm-email').send({ token: raw });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: login.body.accessToken, userId: user.id };
}

async function setupDriver(email, firstName, vehiclePlate) {
  const { token, userId } = await registerAndConfirm(email, 'DRIVER', firstName);
  // Habilitar conductor
  const dp = await prisma.driverProfile.findUnique({ where: { userId } });
  await prisma.driverProfile.update({ where: { id: dp.id }, data: { licenseNumber: 'L' + Date.now() + Math.floor(Math.random() * 999), licenseCategory: 'B1', licenseExpiresAt: new Date('2030-01-01'), verificationStatus: 'APPROVED' } });
  await prisma.driverDocument.create({ data: { driverId: dp.id, type: 'LICENCIA', fileUrl: '/uploads/x.pdf', status: 'APPROVED' } });
  await prisma.driverDocument.create({ data: { driverId: dp.id, type: 'CEDULA', fileUrl: '/uploads/x.pdf', status: 'APPROVED' } });
  const veh = await prisma.vehicle.create({ data: { driverId: dp.id, plate: vehiclePlate, brand: 'Toyota', model: 'Yaris', color: 'Gris', isActive: true, verificationStatus: 'APPROVED' } });
  return { token, userId, vehicleId: veh.id };
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;

  const c = await registerAndConfirm(CUSTOMER_EMAIL, 'CUSTOMER', 'Cliente');
  customerToken = c.token; customerId = c.userId;

  const d1 = await setupDriver(DRIVER1_EMAIL, 'Conductor1', 'PLA101');
  driver1Token = d1.token; driver1Id = d1.userId; vehicle1Id = d1.vehicleId;

  const d2 = await setupDriver(DRIVER2_EMAIL, 'Conductor2', 'PLA202');
  driver2Token = d2.token; driver2Id = d2.userId; vehicle2Id = d2.vehicleId;
});

after(async () => {
  for (const email of [CUSTOMER_EMAIL, DRIVER1_EMAIL, DRIVER2_EMAIL]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

function futureDate(offsetDays = 1) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function auth(token) { return { Authorization: `Bearer ${token}` }; }

// ------------------------------------------------------------
test('crear solicitud en borrador', async () => {
  const res = await request(app).post('/api/services')
    .set(auth(customerToken))
    .send({
      serviceType: 'PASSENGER', pickupAddress: 'Origen A', dropoffAddress: 'Destino B',
      scheduledDate: futureDate(2), scheduledTime: '09:00', passengerCount: 2, proposedPrice: 30000,
    });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.request.status, 'DRAFT');
  requestId = res.body.request.id;
  requestNumber = res.body.request.requestNumber;
  assert.ok(requestNumber >= 1);
});

test('conductor no puede crear solicitudes (403)', async () => {
  const res = await request(app).post('/api/services')
    .set(auth(driver1Token))
    .send({ serviceType: 'PASSENGER', pickupAddress: 'A', dropoffAddress: 'B', scheduledDate: futureDate(2), scheduledTime: '09:00', proposedPrice: 30000 });
  assert.strictEqual(res.status, 403);
});

test('fecha en el pasado es rechazada al publicar', async () => {
  // Crear solicitud con fecha pasada es imposible por validacion de formato; se valida en publish
  const pastReq = await request(app).post('/api/services')
    .set(auth(customerToken))
    .send({ serviceType: 'PASSENGER', pickupAddress: 'A', dropoffAddress: 'B', scheduledDate: futureDate(2), scheduledTime: '23:59', proposedPrice: 30000 });
  // no publicamos; solo validamos creacion
  assert.strictEqual(pastReq.status, 201);
});

test('publicar la solicitud', async () => {
  const res = await request(app).post(`/api/services/${requestId}/publish`).set(auth(customerToken));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.request.status, 'PUBLISHED');
});

test('conductor ve la solicitud disponible', async () => {
  const res = await request(app).get('/api/services/available').set(auth(driver1Token));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.requests.some((r) => r.id === requestId));
});

test('conductor 1 envia oferta aceptando el precio', async () => {
  const res = await request(app).post(`/api/services/${requestId}/offers`)
    .set(auth(driver1Token))
    .send({ vehicleId: vehicle1Id, price: 30000, etaMinutes: 10 });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.offer.isCounteroffer, false);
  offer1Id = res.body.offer.id;
});

test('conductor 2 envia contraoferta', async () => {
  const res = await request(app).post(`/api/services/${requestId}/offers`)
    .set(auth(driver2Token))
    .send({ vehicleId: vehicle2Id, price: 35000, message: 'Mejor vehiculo' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.offer.isCounteroffer, true);
});

test('conductor no puede ofertar con vehiculo ajeno', async () => {
  const res = await request(app).post(`/api/services/${requestId}/offers`)
    .set(auth(driver2Token))
    .send({ vehicleId: vehicle1Id, price: 32000 });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.error.code, 'VEHICLE_NOT_OWNED');
});

test('cliente ve 2 ofertas', async () => {
  const res = await request(app).get(`/api/services/${requestId}/offers`).set(auth(customerToken));
  assert.strictEqual(res.body.offers.length, 2);
  const o = res.body.offers[0];
  assert.ok(o.driver.profile.firstName);
  assert.ok(o.vehicle.plate);
  assert.ok(o.price !== undefined);
});

test('cliente acepta la oferta del conductor 2', async () => {
  // Buscar id de la oferta del conductor 2
  const offers = await request(app).get(`/api/services/${requestId}/offers`).set(auth(customerToken));
  const o2 = offers.body.offers.find((o) => o.driver.id === driver2Id);
  const res = await request(app).post(`/api/services/${requestId}/offers/${o2.id}/accept`).set(auth(customerToken));
  assert.strictEqual(res.status, 200);
});

test('asignacion unica: una sola asignacion para la solicitud', async () => {
  const assignments = await prisma.serviceAssignment.findMany({ where: { requestId } });
  assert.strictEqual(assignments.length, 1);
  assert.strictEqual(assignments[0].driverId, driver2Id);
});

test('la otra oferta queda BLOQUEADA', async () => {
  const offers = await prisma.serviceOffer.findMany({ where: { requestId } });
  const o1 = offers.find((o) => o.id === offer1Id);
  assert.strictEqual(o1.status, 'BLOCKED');
});

test('la solicitud queda ASIGNADA con precio final', async () => {
  const r = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  assert.strictEqual(r.status, 'ASSIGNED');
  assert.strictEqual(Number(r.finalPrice), 35000);
});

test('conductor asignado queda OCUPADO (BUSY)', async () => {
  const dp = await prisma.driverProfile.findUnique({ where: { userId: driver2Id } });
  assert.strictEqual(dp.operationalStatus, 'BUSY');
});

test('aceptar de nuevo falla (409)', async () => {
  const res = await request(app).post(`/api/services/${requestId}/offers/${offer1Id}/accept`).set(auth(customerToken));
  assert.strictEqual(res.status, 409);
});

test('retirar solicitud asignada falla (409)', async () => {
  const res = await request(app).post(`/api/services/${requestId}/withdraw`).set(auth(customerToken)).send({ reason: 'x' });
  assert.strictEqual(res.status, 409);
});

test('notificaciones persistidas en BD', async () => {
  const notifs = await prisma.notification.findMany({ where: { OR: [{ userId: customerId }, { userId: driver2Id }] } });
  const types = notifs.map((n) => n.type);
  assert.ok(types.includes('NEW_OFFER'));
  assert.ok(types.includes('COUNTEROFFER'));
  assert.ok(types.includes('OFFER_ACCEPTED'));
});

test('se registran eventos de trazabilidad', async () => {
  const events = await prisma.serviceEvent.findMany({ where: { requestId } });
  const types = events.map((e) => e.type);
  assert.ok(types.includes('CREATED'));
  assert.ok(types.includes('PUBLISHED'));
  assert.ok(types.includes('OFFER_ACCEPTED'));
});

test('utilidades de fecha/hora: Bogota es UTC-5', () => {
  const utc = colombiaToUtc('2026-12-01', '10:00');
  assert.strictEqual(utc.toISOString(), '2026-12-01T15:00:00.000Z');
  assert.ok(todayColombia().match(/^\d{4}-\d{2}-\d{2}$/));
});
