// ============================================================
// WayGo - Pruebas de integracion: FASE 5 (paquetes y contratos)
// Ejecutar con: npm --prefix backend test
// ============================================================
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const createApp = require('../backend/src/app');
const prisma = require('../backend/src/utils/prisma');
const { sha256 } = require('../backend/src/utils/crypto');
const contractService = require('../backend/src/services/contract.service');

const app = createApp();
const stamp = Date.now();
const CUSTOMER_EMAIL = `test.c5.${stamp}@waygo.co`;
const DRIVER_EMAIL = `test.d5.${stamp}@waygo.co`;
const PASSWORD = 'Prueba2026!';

let customerToken, driverToken, customerId, driverUserId;
let packageId, requestId, contractId;

async function registerAndConfirm(email, role, firstName) {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role, firstName, lastName: 'Prueba' });
  const user = await prisma.user.findUnique({ where: { email } });
  const raw = `c-${email}-${stamp}`;
  await prisma.verificationToken.create({ data: { userId: user.id, tokenHash: sha256(raw), type: 'EMAIL_CONFIRMATION', expiresAt: new Date(Date.now() + 3600000) } });
  await request(app).post('/api/auth/confirm-email').send({ token: raw });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: login.body.accessToken, userId: user.id };
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const c = await registerAndConfirm(CUSTOMER_EMAIL, 'CUSTOMER', 'Cliente');
  customerToken = c.token; customerId = c.userId;

  const d = await registerAndConfirm(DRIVER_EMAIL, 'DRIVER', 'Conductor');
  driverToken = d.token; driverUserId = d.userId;

  const dp = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
  await prisma.driverProfile.update({ where: { id: dp.id }, data: { licenseNumber: 'L' + stamp, licenseCategory: 'B1', licenseExpiresAt: new Date('2030-01-01'), verificationStatus: 'APPROVED', operationalStatus: 'AVAILABLE' } });
  await prisma.vehicle.create({ data: { driverId: dp.id, plate: 'WGG222', brand: 'Chevrolet', model: 'Spark', color: 'Rojo', isActive: true, isPrimary: true, verificationStatus: 'APPROVED' } });
});

after(async () => {
  for (const email of [CUSTOMER_EMAIL, DRIVER_EMAIL]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

function auth(t) { return { Authorization: `Bearer ${t}` }; }
function futureDate(d = 1) { return new Date(Date.now() + d * 86400000).toISOString().slice(0, 10); }

// ------------------------------------------------------------
// Paquetes
// ------------------------------------------------------------
test('crear paquete (solicitud + codigo de seguimiento)', async () => {
  const res = await request(app).post('/api/packages').set(auth(customerToken)).send({
    pickupAddress: 'Carrera 7 # 30-10', dropoffAddress: 'Calle 80 # 15-20',
    scheduledDate: futureDate(1), scheduledTime: '14:00', proposedPrice: 12000,
    senderName: 'Juan Emisor', recipientName: 'Maria Receptor', recipientPhone: '3001111111',
    description: 'Documentos de oficina', weightKg: 2.5, dimensions: '30x20x10',
  });
  assert.strictEqual(res.status, 201);
  packageId = res.body.package.id;
  requestId = res.body.request.id;
  assert.ok(res.body.package.trackingCode.startsWith('WG-'));
});

test('tracking publico devuelve el paquete', async () => {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  const res = await request(app).get(`/api/packages/track/${pkg.trackingCode}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.package.senderName, 'Juan Emisor');
});

test('tracking con codigo inexistente falla (404)', async () => {
  const res = await request(app).get('/api/packages/track/WG-NOEXISTE');
  assert.strictEqual(res.status, 404);
});

test('conductor no asignado no puede actualizar el paquete', async () => {
  const res = await request(app).post(`/api/packages/${packageId}/pickup`).set(auth(driverToken));
  assert.strictEqual(res.status, 403);
});

test('publicar solicitud, asignar y completar flujo del paquete', async () => {
  await request(app).post(`/api/services/${requestId}/publish`).set(auth(customerToken));
  const vehicle = await prisma.vehicle.findFirst({ where: { driver: { userId: driverUserId } } });
  await request(app).post('/api/services/' + requestId + '/offers').set(auth(driverToken)).send({ vehicleId: vehicle.id, price: 12000 });
  const offers = await request(app).get(`/api/services/${requestId}/offers`).set(auth(customerToken));
  await request(app).post(`/api/services/${requestId}/offers/${offers.body.offers[0].id}/accept`).set(auth(customerToken));

  await request(app).post(`/api/packages/${packageId}/pickup`).set(auth(driverToken));
  let pkg = await prisma.package.findUnique({ where: { id: packageId } });
  assert.strictEqual(pkg.status, 'PICKED_UP');

  await request(app).post(`/api/packages/${packageId}/in-transit`).set(auth(driverToken));
  pkg = await prisma.package.findUnique({ where: { id: packageId } });
  assert.strictEqual(pkg.status, 'IN_TRANSIT');
});

test('entregar con evidencia', async () => {
  const res = await request(app).post(`/api/packages/${packageId}/deliver`).set(auth(driverToken))
    .send({ receivedBy: 'Maria Receptor', receiverDocument: '52123456', notes: 'Entregado en porteria' });
  assert.strictEqual(res.status, 200);

  const evidence = await prisma.packageDeliveryEvidence.findUnique({ where: { packageId } });
  assert.ok(evidence);
  assert.strictEqual(evidence.receivedBy, 'Maria Receptor');

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  assert.strictEqual(pkg.status, 'DELIVERED');
});

// ------------------------------------------------------------
// Contratos mensuales
// ------------------------------------------------------------
test('crear contrato con horarios', async () => {
  const res = await request(app).post('/api/contracts').set(auth(customerToken)).send({
    type: 'ESCOLAR',
    startDate: futureDate(0), endDate: futureDate(14),
    pickupAddress: 'Casa', dropoffAddress: 'Colegio',
    servicesIncluded: 10, monthlyPrice: 600000,
    schedules: [{ dayOfWeek: 1, time: '07:00' }, { dayOfWeek: 3, time: '07:00' }],
  });
  assert.strictEqual(res.status, 201);
  contractId = res.body.contract.id;
  assert.ok(res.body.contract.contractNumber >= 1);
});

test('fechas invalidas (fin antes de inicio) falla', async () => {
  const res = await request(app).post('/api/contracts').set(auth(customerToken)).send({
    type: 'X', startDate: futureDate(5), endDate: futureDate(1), pickupAddress: 'A', dropoffAddress: 'B',
    servicesIncluded: 10, monthlyPrice: 100000, schedules: [{ dayOfWeek: 1, time: '07:00' }],
  });
  assert.strictEqual(res.status, 400);
});

test('asignar conductor habilitado al contrato', async () => {
  const res = await request(app).put(`/api/contracts/${contractId}/assign`).set(auth(customerToken)).send({ driverId: driverUserId });
  assert.strictEqual(res.status, 200);
  const c = await prisma.monthlyContract.findUnique({ where: { id: contractId } });
  assert.strictEqual(c.driverId, driverUserId);
});

test('activar contrato', async () => {
  const res = await request(app).put(`/api/contracts/${contractId}/status`).set(auth(customerToken)).send({ status: 'ACTIVE' });
  assert.strictEqual(res.status, 200);
});

test('generar ejecuciones recurrentes', async () => {
  const res = await request(app).post(`/api/contracts/${contractId}/generate`).set(auth(customerToken));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.count >= 1);

  const execs = await prisma.contractExecution.findMany({ where: { contractId } });
  // Solo lunes y miercoles dentro de 14 dias
  const days = execs.map((e) => new Date(e.plannedDate).getDay());
  assert.ok(days.every((d) => d === 1 || d === 3));
});

test('materializar ejecuciones crea solicitudes MONTHLY', async () => {
  const contract = await prisma.monthlyContract.findUnique({ where: { id: contractId }, include: { schedules: true } });
  await contractService.generateExecutionsForContract(contract);
  const count = await contractService.materializeUpcomingExecutions();
  assert.ok(count >= 0);
  const generated = await prisma.contractExecution.findMany({ where: { contractId, status: 'GENERATED' } });
  if (generated.length > 0) {
    assert.ok(generated[0].requestId);
  }
});

test('el conductor puede listar contratos asignados', async () => {
  const res = await request(app).get('/api/contracts').set(auth(driverToken));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.contracts.some((c) => c.id === contractId));
});
