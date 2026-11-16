// ============================================================
// WayGo - Pruebas de integracion: FASE 6 (evaluaciones,
// estadisticas y exportacion de reportes)
// Ejecutar con: npm --prefix backend test
// ============================================================
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const createApp = require('../backend/src/app');
const prisma = require('../backend/src/utils/prisma');
const { sha256 } = require('../backend/src/utils/crypto');

const app = createApp();
const stamp = Date.now();
const CUSTOMER_EMAIL = `test.c6.${stamp}@waygo.co`;
const DRIVER_EMAIL = `test.d6.${stamp}@waygo.co`;
const ADMIN_EMAIL = `test.adm6.${stamp}@waygo.co`;
const PASSWORD = 'Prueba2026!';

let customerToken, driverToken, adminToken, customerId, driverUserId, requestId, assignmentId;

async function registerAndConfirm(email, role, firstName) {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role, firstName, lastName: 'Prueba' });
  const user = await prisma.user.findUnique({ where: { email } });
  const raw = `c-${email}-${stamp}`;
  await prisma.verificationToken.create({ data: { userId: user.id, tokenHash: sha256(raw), type: 'EMAIL_CONFIRMATION', expiresAt: new Date(Date.now() + 3600000) } });
  await request(app).post('/api/auth/confirm-email').send({ token: raw });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: login.body.accessToken, userId: user.id };
}

async function createStaff(email, roleName) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  const u = await prisma.user.create({ data: { email, passwordHash: bcrypt.hashSync(PASSWORD, 4), status: 'ACTIVE', emailVerifiedAt: new Date(), roleId: role.id, profile: { create: { firstName: roleName, lastName: 'Staff' } } } });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: login.body.accessToken, userId: u.id };
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const c = await registerAndConfirm(CUSTOMER_EMAIL, 'CUSTOMER', 'Cliente');
  customerToken = c.token; customerId = c.userId;
  const d = await registerAndConfirm(DRIVER_EMAIL, 'DRIVER', 'Conductor');
  driverToken = d.token; driverUserId = d.userId;
  const adm = await createStaff(ADMIN_EMAIL, 'ADMIN');
  adminToken = adm.token;

  const dp = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
  await prisma.driverProfile.update({ where: { id: dp.id }, data: { licenseNumber: 'L' + stamp, licenseCategory: 'B1', licenseExpiresAt: new Date('2030-01-01'), verificationStatus: 'APPROVED', operationalStatus: 'AVAILABLE' } });
  await prisma.vehicle.create({ data: { driverId: dp.id, plate: 'WGG333', brand: 'Mazda', model: '2', color: 'Gris', isActive: true, isPrimary: true, verificationStatus: 'APPROVED' } });

  // Crear y completar un servicio
  const r = await request(app).post('/api/services').set(auth(customerToken))
    .send({ serviceType: 'PASSENGER', pickupAddress: 'A', dropoffAddress: 'B', scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), scheduledTime: '10:00', proposedPrice: 20000 });
  requestId = r.body.request.id;
  await request(app).post(`/api/services/${requestId}/publish`).set(auth(customerToken));
  const veh = await prisma.vehicle.findFirst({ where: { driver: { userId: driverUserId } } });
  await request(app).post(`/api/services/${requestId}/offers`).set(auth(driverToken)).send({ vehicleId: veh.id, price: 20000 });
  const offers = await request(app).get(`/api/services/${requestId}/offers`).set(auth(customerToken));
  await request(app).post(`/api/services/${requestId}/offers/${offers.body.offers[0].id}/accept`).set(auth(customerToken));
  const asg = await prisma.serviceAssignment.findUnique({ where: { requestId } });
  assignmentId = asg.id;
  await request(app).post(`/api/assignments/${assignmentId}/arrive`).set(auth(driverToken));
  await request(app).post(`/api/assignments/${assignmentId}/start`).set(auth(driverToken));
  await request(app).post(`/api/assignments/${assignmentId}/complete`).set(auth(driverToken)).send({ actualKm: 8 });
});

after(async () => {
  for (const email of [CUSTOMER_EMAIL, DRIVER_EMAIL, ADMIN_EMAIL]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

function auth(t) { return { Authorization: `Bearer ${t}` }; }

test('cliente evalua al conductor con criterios', async () => {
  const criteria = await prisma.reviewCriteria.findMany({ where: { appliesTo: 'CUSTOMER_TO_DRIVER' }, take: 3 });
  const res = await request(app).post('/api/reviews').set(auth(customerToken)).send({
    requestId, type: 'CUSTOMER_TO_DRIVER', comment: 'Muy buen servicio',
    scores: criteria.map((c) => ({ criteriaId: c.id, score: 5 })),
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.review.overall, 5);
});

test('no se permite evaluacion duplicada', async () => {
  const criteria = await prisma.reviewCriteria.findMany({ where: { appliesTo: 'CUSTOMER_TO_DRIVER' }, take: 1 });
  const res = await request(app).post('/api/reviews').set(auth(customerToken)).send({
    requestId, type: 'CUSTOMER_TO_DRIVER',
    scores: [{ criteriaId: criteria[0].id, score: 4 }],
  });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.error.code, 'DUPLICATE_REVIEW');
});

test('conductor evalua al cliente (bidireccional)', async () => {
  const criteria = await prisma.reviewCriteria.findMany({ where: { appliesTo: 'DRIVER_TO_CUSTOMER' }, take: 2 });
  const res = await request(app).post('/api/reviews').set(auth(driverToken)).send({
    requestId, type: 'DRIVER_TO_CUSTOMER',
    scores: criteria.map((c) => ({ criteriaId: c.id, score: 4 })),
  });
  assert.strictEqual(res.status, 201);
});

test('no se puede evaluar un servicio no completado', async () => {
  // Crear otro servicio sin completar
  const r = await request(app).post('/api/services').set(auth(customerToken))
    .send({ serviceType: 'PASSENGER', pickupAddress: 'A', dropoffAddress: 'B', scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), scheduledTime: '12:00', proposedPrice: 15000 });
  const criteria = await prisma.reviewCriteria.findMany({ where: { appliesTo: 'CUSTOMER_TO_DRIVER' }, take: 1 });
  const res = await request(app).post('/api/reviews').set(auth(customerToken)).send({
    requestId: r.body.request.id, type: 'CUSTOMER_TO_DRIVER', scores: [{ criteriaId: criteria[0].id, score: 5 }],
  });
  assert.strictEqual(res.status, 400);
});

test('resumen publico del conductor refleja promedio', async () => {
  const res = await request(app).get(`/api/reviews/driver/${driverUserId}/summary`).set(auth(customerToken));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.summary.averageRating, 5);
  assert.strictEqual(res.body.summary.reviewCount, 1);
});

test('estadisticas del conductor', async () => {
  const res = await request(app).get('/api/statistics/driver').set(auth(driverToken));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.stats.totalTrips, 1);
  assert.strictEqual(res.body.stats.totalEarnings, 20000);
});

test('estadisticas del cliente', async () => {
  const res = await request(app).get('/api/statistics/customer').set(auth(customerToken));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.stats.completedTrips, 1);
});

test('estadisticas generales (admin)', async () => {
  const res = await request(app).get('/api/statistics/general').set(auth(adminToken));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.summary.totalCustomers >= 1);
  assert.ok(res.body.summary.completedTrips >= 1);
  assert.ok(res.body.summary.totalRevenue >= 20000);
});

test('conductor no puede ver estadisticas generales (403)', async () => {
  const res = await request(app).get('/api/statistics/general').set(auth(driverToken));
  assert.strictEqual(res.status, 403);
});

test('exportar reporte CSV', async () => {
  const res = await request(app).get('/api/statistics/export/general?format=csv').set(auth(adminToken));
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.ok(res.text.includes('Total de clientes'));
});

test('exportar reporte PDF', async () => {
  const res = await request(app).get('/api/statistics/export/general?format=pdf').set(auth(adminToken));
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['content-type'], /application\/pdf/);
  const pdf = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : res.text;
  assert.ok(pdf.startsWith('%PDF-1.4'));
});

test('notificaciones listadas y marcadas como leidas', async () => {
  const list = await request(app).get('/api/notifications').set(auth(customerToken));
  assert.strictEqual(list.status, 200);
  assert.ok(list.body.notifications.length >= 1);
  const read = await request(app).put('/api/notifications/read-all').set(auth(customerToken));
  assert.strictEqual(read.status, 200);
});
