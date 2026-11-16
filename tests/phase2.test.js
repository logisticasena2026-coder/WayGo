// ============================================================
// WayGo - Pruebas de integracion: FASE 2 (perfiles, vehiculos,
// documentos, verificacion documental y habilitacion)
// Ejecutar con: npm --prefix backend test
// ============================================================
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const createApp = require('../backend/src/app');
const prisma = require('../backend/src/utils/prisma');
const { sha256 } = require('../backend/src/utils/crypto');

const app = createApp();
const stamp = Date.now();
const DRIVER_EMAIL = `test.driver.${stamp}@waygo.co`;
const CUSTOMER_EMAIL = `test.customer.${stamp}@waygo.co`;
const PASSWORD = 'Prueba2026!';

let driverToken = null;
let customerToken = null;
let adminToken = null;
let driverId = null;
let driverProfileId = null;
let vehicleId = null;
let licenseDocId = null;
let cedulaDocId = null;

// Archivo PDF minimo para subir documentos
const pdfPath = path.join(__dirname, 'fixture.pdf');

function fixturePdf() {
  if (!fs.existsSync(pdfPath)) {
    fs.writeFileSync(pdfPath, Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.from('WayGo test document'),
    ]));
  }
}

async function registerAndConfirm(email, role) {
  await request(app).post('/api/auth/register').send({
    email, password: PASSWORD, role,
    firstName: role === 'DRIVER' ? 'Conductor' : 'Cliente',
    lastName: 'Prueba',
  });
  const user = await prisma.user.findUnique({ where: { email } });
  const rawToken = `confirm-${email}-${stamp}`;
  await prisma.verificationToken.create({
    data: { userId: user.id, tokenHash: sha256(rawToken), type: 'EMAIL_CONFIRMATION', expiresAt: new Date(Date.now() + 3600000) },
  });
  await request(app).post('/api/auth/confirm-email').send({ token: rawToken });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: login.body.accessToken, userId: user.id };
}

before(async () => {
  fixturePdf();
  await prisma.$queryRaw`SELECT 1`;

  const customer = await registerAndConfirm(CUSTOMER_EMAIL, 'CUSTOMER');
  customerToken = customer.token;

  const driver = await registerAndConfirm(DRIVER_EMAIL, 'DRIVER');
  driverToken = driver.token;
  driverId = driver.userId;
  const dp = await prisma.driverProfile.findUnique({ where: { userId: driverId } });
  driverProfileId = dp.id;

  const admin = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });
  if (!admin) throw new Error('Admin no sembrado');
  // Login de admin con password del seed (definida en .env o aleatoria impresa)
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: admin.email,
    password: process.env.SEED_ADMIN_PASSWORD || '___',
  });
  // Si no tenemos la password del seed, generamos un admin de prueba con rol ADMIN
  if (adminLogin.status !== 200) {
    const a = await prisma.user.create({
      data: {
        email: `admin.test.${stamp}@waygo.co`,
        passwordHash: require('bcryptjs').hashSync(PASSWORD, 4),
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        role: { connect: { name: 'ADMIN' } },
        profile: { create: { firstName: 'Admin', lastName: 'Test' } },
      },
    });
    const l = await request(app).post('/api/auth/login').send({ email: a.email, password: PASSWORD });
    adminToken = l.body.accessToken;
  } else {
    adminToken = adminLogin.body.accessToken;
  }
});

after(async () => {
  for (const email of [DRIVER_EMAIL, CUSTOMER_EMAIL]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  const adminTest = await prisma.user.findUnique({ where: { email: `admin.test.${stamp}@waygo.co` } });
  if (adminTest) await prisma.user.delete({ where: { id: adminTest.id } }).catch(() => {});
  await prisma.$disconnect();
});

// ------------------------------------------------------------
// Perfil de usuario
// ------------------------------------------------------------
test('actualizar perfil de cliente', async () => {
  const res = await request(app)
    .put('/api/users/me/profile')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ city: 'Medellin', address: 'Cra 50 # 10-20', documentType: 'CC', documentNumber: '1022334455' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.profile.city, 'Medellin');
});

test('actualizar perfil con telefono invalido falla', async () => {
  const res = await request(app)
    .put('/api/users/me/profile')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ phone: 'abc' });
  assert.strictEqual(res.status, 400);
});

// ------------------------------------------------------------
// Conductor: no puede operar sin habilitacion
// ------------------------------------------------------------
test('conductor sin habilitar no puede ponerse DISPONIBLE', async () => {
  const res = await request(app)
    .put('/api/drivers/me/status')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ status: 'AVAILABLE' });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error.code, 'DRIVER_NOT_VERIFIED');
});

test('registrar licencia del conductor', async () => {
  const res = await request(app)
    .put('/api/drivers/me/license')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ licenseNumber: '9876543210', licenseCategory: 'C1', licenseExpiresAt: '2030-01-01' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.driver.licenseCategory, 'C1');
});

// ------------------------------------------------------------
// Vehiculos
// ------------------------------------------------------------
test('crear vehiculo', async () => {
  const res = await request(app)
    .post('/api/vehicles')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ plate: 'XYZ987', brand: 'Toyota', model: 'Corolla', year: 2021, color: 'Negro', type: 'SEDAN', capacity: 4 });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.vehicle.isPrimary, true); // primer vehiculo = principal
  vehicleId = res.body.vehicle.id;
});

test('placa duplicada falla (409)', async () => {
  const res = await request(app)
    .post('/api/vehicles')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ plate: 'xyz987', brand: 'X', model: 'Y', color: 'Z' });
  assert.strictEqual(res.status, 409);
});

test('placa invalida falla (400)', async () => {
  const res = await request(app)
    .post('/api/vehicles')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ plate: '12', brand: 'X', model: 'Y', color: 'Z' });
  assert.strictEqual(res.status, 400);
});

test('cliente no puede crear vehiculos (403 rol)', async () => {
  const res = await request(app)
    .post('/api/vehicles')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ plate: 'AAA111', brand: 'X', model: 'Y', color: 'Z' });
  assert.strictEqual(res.status, 403);
});

// ------------------------------------------------------------
// Documentos (multipart)
// ------------------------------------------------------------
test('subir documento LICENCIA', async () => {
  const res = await request(app)
    .post('/api/drivers/me/documents')
    .set('Authorization', `Bearer ${driverToken}`)
    .field('type', 'LICENCIA')
    .field('expiresAt', '2030-01-01')
    .attach('file', pdfPath, { filename: 'licencia.pdf', contentType: 'application/pdf' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.document.status, 'PENDING');
  licenseDocId = res.body.document.id;
});

test('subir documento CEDULA', async () => {
  const res = await request(app)
    .post('/api/drivers/me/documents')
    .set('Authorization', `Bearer ${driverToken}`)
    .field('type', 'CEDULA')
    .attach('file', pdfPath, { filename: 'cedula.pdf', contentType: 'application/pdf' });
  assert.strictEqual(res.status, 201);
  cedulaDocId = res.body.document.id;
});

test('rechaza archivo con MIME no permitido', async () => {
  const bad = path.join(__dirname, 'bad.exe');
  fs.writeFileSync(bad, Buffer.from([0x4d, 0x5a, 0x90, 0x00]));
  const res = await request(app)
    .post('/api/drivers/me/documents')
    .set('Authorization', `Bearer ${driverToken}`)
    .field('type', 'OTRO')
    .attach('file', bad, { filename: 'falso.exe', contentType: 'application/x-msdownload' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'INVALID_FILE_TYPE');
});

test('documento de vehiculo SOAT', async () => {
  const res = await request(app)
    .post(`/api/vehicles/${vehicleId}/documents`)
    .set('Authorization', `Bearer ${driverToken}`)
    .field('type', 'SOAT')
    .attach('file', pdfPath, { filename: 'soat.pdf', contentType: 'application/pdf' });
  assert.strictEqual(res.status, 201);
});

// ------------------------------------------------------------
// Verificacion documental por el administrador
// ------------------------------------------------------------
test('admin lista conductores PENDING', async () => {
  const res = await request(app)
    .get('/api/admin/drivers?status=PENDING')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.items.some((d) => d.id === driverProfileId));
});

test('conductor no puede revisar documentos (403 rol)', async () => {
  const res = await request(app)
    .post(`/api/admin/driver-documents/${licenseDocId}/review`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ action: 'APPROVE' });
  assert.strictEqual(res.status, 403);
});

test('habilitar sin aprobar documentos falla (400 requisitos)', async () => {
  const res = await request(app)
    .post(`/api/admin/drivers/${driverProfileId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'APPROVE' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'VERIFICATION_REQUIREMENTS');
});

test('aprobar documentos y habilitar conductor', async () => {
  await request(app).post(`/api/admin/driver-documents/${licenseDocId}/review`)
    .set('Authorization', `Bearer ${adminToken}`).send({ action: 'APPROVE' });
  await request(app).post(`/api/admin/driver-documents/${cedulaDocId}/review`)
    .set('Authorization', `Bearer ${adminToken}`).send({ action: 'APPROVE' });

  const res = await request(app)
    .post(`/api/admin/drivers/${driverProfileId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'APPROVE' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.verificationStatus, 'APPROVED');
});

test('rechazo de documento requiere motivo', async () => {
  const res = await request(app)
    .post(`/api/admin/driver-documents/${licenseDocId}/review`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'REJECT' });
  assert.strictEqual(res.status, 400);
});

// ------------------------------------------------------------
// Conductor habilitado ya puede operar
// ------------------------------------------------------------
test('conductor habilitado se pone DISPONIBLE', async () => {
  const res = await request(app)
    .put('/api/drivers/me/status')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ status: 'AVAILABLE' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.operationalStatus, 'AVAILABLE');
});

test('ubicacion requiere consentimiento previo', async () => {
  const res = await request(app)
    .put('/api/drivers/me/location')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ lat: 4.6, lng: -74.08 });
  assert.strictEqual(res.status, 403);
});

test('con consentimiento, la ubicacion se actualiza', async () => {
  await request(app).put('/api/drivers/me/location-consent')
    .set('Authorization', `Bearer ${driverToken}`).send({ consent: true });

  const res = await request(app)
    .put('/api/drivers/me/location')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ lat: 4.6097, lng: -74.0817 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.location.lat, 4.6097);
});

test('admin bloquea y habilita usuario', async () => {
  const customerUser = await prisma.user.findUnique({ where: { email: CUSTOMER_EMAIL } });
  const block = await request(app)
    .put(`/api/admin/users/${customerUser.id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'BLOCKED' });
  assert.strictEqual(block.status, 200);

  const unblock = await request(app)
    .put(`/api/admin/users/${customerUser.id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'ACTIVE' });
  assert.strictEqual(unblock.status, 200);
});
