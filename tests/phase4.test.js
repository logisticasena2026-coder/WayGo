// ============================================================
// WayGo - Pruebas de integracion: FASE 4 (call center, seguimiento,
// asignacion manual, tickets y acumulados)
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
const CUSTOMER_EMAIL = `test.c4.${stamp}@waygo.co`;
const DRIVER_EMAIL = `test.d4.${stamp}@waygo.co`;
const CC_EMAIL = `test.cc4.${stamp}@waygo.co`;
const ADMIN_EMAIL = `test.adm4.${stamp}@waygo.co`;
const PASSWORD = 'Prueba2026!';

let customerToken, driverToken, ccToken, adminToken;
let customerId, driverUserId, requestId, assignmentId;

async function registerAndConfirm(email, role, firstName) {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role, firstName, lastName: 'Prueba' });
  const user = await prisma.user.findUnique({ where: { email } });
  const raw = `c-${email}-${stamp}`;
  await prisma.verificationToken.create({ data: { userId: user.id, tokenHash: sha256(raw), type: 'EMAIL_CONFIRMATION', expiresAt: new Date(Date.now() + 3600000) } });
  await request(app).post('/api/auth/confirm-email').send({ token: raw });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: login.body.accessToken, userId: user.id };
}

async function createStaffUser(email, roleName, profileExtra = {}) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  const u = await prisma.user.create({
    data: {
      email, passwordHash: bcrypt.hashSync(PASSWORD, 4), status: 'ACTIVE', emailVerifiedAt: new Date(),
      roleId: role.id,
      profile: { create: { firstName: roleName, lastName: 'Staff' } },
      ...(roleName === 'CALL_CENTER' ? { callCenterProfile: { create: {} } } : {}),
    },
  });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: login.body.accessToken, userId: u.id };
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const c = await registerAndConfirm(CUSTOMER_EMAIL, 'CUSTOMER', 'Cliente');
  customerToken = c.token; customerId = c.userId;

  const d = await registerAndConfirm(DRIVER_EMAIL, 'DRIVER', 'Conductor');
  driverToken = d.token; driverUserId = d.userId;

  // Habilitar conductor
  const dp = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
  await prisma.driverProfile.update({ where: { id: dp.id }, data: { licenseNumber: 'L' + stamp, licenseCategory: 'B1', licenseExpiresAt: new Date('2030-01-01'), verificationStatus: 'APPROVED', operationalStatus: 'AVAILABLE' } });
  await prisma.vehicle.create({ data: { driverId: dp.id, plate: 'WGG111', brand: 'Kia', model: 'Rio', color: 'Azul', isActive: true, isPrimary: true, verificationStatus: 'APPROVED' } });

  const cc = await createStaffUser(CC_EMAIL, 'CALL_CENTER');
  ccToken = cc.token;
  const adm = await createStaffUser(ADMIN_EMAIL, 'ADMIN');
  adminToken = adm.token;
});

after(async () => {
  for (const email of [CUSTOMER_EMAIL, DRIVER_EMAIL, CC_EMAIL, ADMIN_EMAIL]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

function auth(t) { return { Authorization: `Bearer ${t}` }; }
function futureDate(d = 1) { return new Date(Date.now() + d * 86400000).toISOString().slice(0, 10); }

test('crear y publicar solicitud', async () => {
  const r = await request(app).post('/api/services').set(auth(customerToken))
    .send({ serviceType: 'PASSENGER', pickupAddress: 'Origen', dropoffAddress: 'Destino', scheduledDate: futureDate(1), scheduledTime: '10:00', proposedPrice: 25000 });
  requestId = r.body.request.id;
  const p = await request(app).post(`/api/services/${requestId}/publish`).set(auth(customerToken));
  assert.strictEqual(p.status, 200);
});

test('call center NO puede acceder a rutas de admin (403)', async () => {
  const res = await request(app).get('/api/admin/users').set(auth(ccToken));
  assert.strictEqual(res.status, 403);
});

test('admin NO puede acceder al call center (403)', async () => {
  const res = await request(app).get('/api/call-center/dashboard').set(auth(adminToken));
  assert.strictEqual(res.status, 403);
});

test('asignacion manual por el operador', async () => {
  const res = await request(app).post('/api/call-center/assign').set(auth(ccToken))
    .send({ requestId, driverId: driverUserId, price: 28000 });
  assert.strictEqual(res.status, 200);
  assignmentId = res.body.assignment.id;

  const asg = await prisma.serviceAssignment.findUnique({ where: { id: assignmentId } });
  assert.strictEqual(asg.isManual, true);
  assert.ok(asg.assignedById); // trazabilidad del operador
});

test('solicitud queda ASIGNADA y conductor BUSY', async () => {
  const r = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  assert.strictEqual(r.status, 'ASSIGNED');
  const dp = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
  assert.strictEqual(dp.operationalStatus, 'BUSY');
});

test('flujo de seguimiento: en camino -> en servicio -> completado', async () => {
  await request(app).post(`/api/assignments/${assignmentId}/arrive`).set(auth(driverToken));
  let r = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  assert.strictEqual(r.status, 'EN_ROUTE');

  await request(app).post(`/api/assignments/${assignmentId}/start`).set(auth(driverToken));
  r = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  assert.strictEqual(r.status, 'IN_SERVICE');

  await request(app).post(`/api/assignments/${assignmentId}/complete`).set(auth(driverToken)).send({ actualKm: 12.5 });
  r = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  assert.strictEqual(r.status, 'COMPLETED');
});

test('al completar se actualizan acumulados y se crea pago', async () => {
  const dp = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
  assert.strictEqual(dp.totalTrips, 1);
  assert.strictEqual(Number(dp.totalKm), 12.5);
  assert.strictEqual(Number(dp.totalEarnings), 28000);
  assert.strictEqual(dp.operationalStatus, 'AVAILABLE');

  const cp = await prisma.customerProfile.findUnique({ where: { userId: customerId } });
  assert.strictEqual(cp.totalTrips, 1);
  assert.strictEqual(Number(cp.totalSpent), 28000);

  const payment = await prisma.paymentRecord.findFirst({ where: { requestId } });
  assert.ok(payment);
  assert.strictEqual(payment.status, 'PAID');
});

test('cliente crea ticket de soporte', async () => {
  const res = await request(app).post('/api/support/tickets').set(auth(customerToken))
    .send({ subject: 'Problema con el servicio', description: 'El vehiculo llego tarde', requestId });
  assert.strictEqual(res.status, 201);
});

test('call center lista y resuelve tickets', async () => {
  const list = await request(app).get('/api/call-center/tickets').set(auth(ccToken));
  assert.ok(list.body.total >= 1);
  const ticketId = list.body.items[0].id;

  const upd = await request(app).put(`/api/call-center/tickets/${ticketId}`).set(auth(ccToken))
    .send({ status: 'RESOLVED', resolution: 'Se contacta al cliente' });
  assert.strictEqual(upd.status, 200);
  assert.strictEqual(upd.body.ticket.status, 'RESOLVED');
});

test('dashboard del call center responde conteos', async () => {
  const res = await request(app).get('/api/call-center/dashboard').set(auth(ccToken));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.customers.total >= 1);
  assert.ok(res.body.services.completed >= 1);
});
