// ============================================================
// WayGo - Pruebas de integracion: autenticacion y salud de API
// Ejecutar con: npm --prefix backend test
// Requiere: PostgreSQL activo y seed ejecutado
// ============================================================
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const createApp = require('../backend/src/app');
const prisma = require('../backend/src/utils/prisma');
const { sha256 } = require('../backend/src/utils/crypto');

const app = createApp();

// Correos unicos por ejecucion para no colisionar entre corridas
const stamp = Date.now();
const CUSTOMER_EMAIL = `test.cliente.${stamp}@waygo.co`;
const DRIVER_EMAIL = `test.conductor.${stamp}@waygo.co`;
const PASSWORD = 'Prueba2026!';

let createdUserId = null;

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

after(async () => {
  // Limpieza de datos de prueba
  if (createdUserId) {
    await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
  }
  const driver = await prisma.user.findUnique({ where: { email: DRIVER_EMAIL } });
  if (driver) await prisma.user.delete({ where: { id: driver.id } }).catch(() => {});
  await prisma.$disconnect();
});

test('GET /api/health responde ok', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.strictEqual(res.body.app, 'WayGo API');
});

test('registro rechaza correo invalido', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: 'no-es-correo',
    password: PASSWORD,
    role: 'CUSTOMER',
    firstName: 'Test',
    lastName: 'User',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('registro rechaza contrasena debil', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: CUSTOMER_EMAIL,
    password: 'debil',
    role: 'CUSTOMER',
    firstName: 'Test',
    lastName: 'User',
  });
  assert.strictEqual(res.status, 400);
});

test('registro rechaza roles no publicos (ADMIN)', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: CUSTOMER_EMAIL,
    password: PASSWORD,
    role: 'ADMIN',
    firstName: 'Test',
    lastName: 'User',
  });
  assert.strictEqual(res.status, 400);
});

test('registro de cliente exitoso (201) y crea perfil', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: CUSTOMER_EMAIL,
    password: PASSWORD,
    role: 'CUSTOMER',
    firstName: 'Cliente',
    lastName: 'Prueba',
    phone: '3001112233',
  });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.user.id);
  createdUserId = res.body.user.id;

  const profile = await prisma.customerProfile.findUnique({ where: { userId: createdUserId } });
  assert.ok(profile, 'Debe existir CustomerProfile');
});

test('registro con correo duplicado retorna 409', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: CUSTOMER_EMAIL,
    password: PASSWORD,
    role: 'CUSTOMER',
    firstName: 'Otro',
    lastName: 'Usuario',
  });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.error.code, 'EMAIL_TAKEN');
});

test('login sin confirmar correo retorna 403 EMAIL_NOT_VERIFIED', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: CUSTOMER_EMAIL,
    password: PASSWORD,
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error.code, 'EMAIL_NOT_VERIFIED');
});

test('confirmacion de correo activa la cuenta', async () => {
  // Genera un token conocido y lo registra (hash) en BD
  const rawToken = 'token-de-prueba-' + stamp;
  await prisma.verificationToken.create({
    data: {
      userId: createdUserId,
      tokenHash: sha256(rawToken),
      type: 'EMAIL_CONFIRMATION',
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  const res = await request(app).post('/api/auth/confirm-email').send({ token: rawToken });
  assert.strictEqual(res.status, 200);

  const user = await prisma.user.findUnique({ where: { id: createdUserId } });
  assert.strictEqual(user.status, 'ACTIVE');
  assert.ok(user.emailVerifiedAt);
});

test('reutilizar el token de confirmacion falla', async () => {
  const res = await request(app).post('/api/auth/confirm-email').send({ token: 'token-de-prueba-' + stamp });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'TOKEN_USED');
});

test('login con contrasena incorrecta retorna 401', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: CUSTOMER_EMAIL,
    password: 'Incorrecta1',
  });
  assert.strictEqual(res.status, 401);
});

test('login exitoso retorna access token y cookie de refresh', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: CUSTOMER_EMAIL,
    password: PASSWORD,
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.accessToken);
  assert.strictEqual(res.body.user.role, 'CUSTOMER');

  const cookies = res.headers['set-cookie'] || [];
  assert.ok(cookies.some((c) => c.startsWith('waygo_rt=')), 'Debe enviar cookie waygo_rt');
  assert.ok(cookies.some((c) => /HttpOnly/i.test(c)), 'La cookie debe ser HttpOnly');
});

test('GET /api/auth/me con token retorna el perfil', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.accessToken}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, CUSTOMER_EMAIL);
  assert.ok(res.body.user.profile.firstName);
});

test('GET /api/auth/me sin token retorna 401', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.strictEqual(res.status, 401);
});

test('refresh rota la cookie y entrega nuevo access token', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
  const res = await agent.post('/api/auth/refresh');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.accessToken);
});

test('refresh sin cookie retorna 401', async () => {
  const res = await request(app).post('/api/auth/refresh');
  assert.strictEqual(res.status, 401);
});

test('registro de conductor crea DriverProfile con verificacion PENDING', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: DRIVER_EMAIL,
    password: PASSWORD,
    role: 'DRIVER',
    firstName: 'Conductor',
    lastName: 'Prueba',
  });
  assert.strictEqual(res.status, 201);

  const driver = await prisma.driverProfile.findUnique({ where: { userId: res.body.user.id } });
  assert.ok(driver, 'Debe existir DriverProfile');
  assert.strictEqual(driver.verificationStatus, 'PENDING');
  assert.strictEqual(driver.operationalStatus, 'OFFLINE');
});

test('forgot-password responde neutro para correo inexistente', async () => {
  const res = await request(app).post('/api/auth/forgot-password').send({ email: `nadie.${stamp}@waygo.co` });
  assert.strictEqual(res.status, 200);
});

test('reset-password con token invalido retorna 400', async () => {
  const res = await request(app).post('/api/auth/reset-password').send({
    token: 'token-inexistente',
    password: 'Nueva2026!',
  });
  assert.strictEqual(res.status, 400);
});

test('auditoria registra eventos de autenticacion', async () => {
  const logs = await prisma.auditLog.findMany({
    where: { actorEmail: CUSTOMER_EMAIL },
    orderBy: { createdAt: 'asc' },
  });
  const actions = logs.map((l) => l.action);
  assert.ok(actions.includes('USER_REGISTERED'));
  assert.ok(actions.includes('EMAIL_CONFIRMED'));
  assert.ok(actions.includes('LOGIN_SUCCESS'));
  assert.ok(actions.includes('LOGIN_FAILED'));
});
