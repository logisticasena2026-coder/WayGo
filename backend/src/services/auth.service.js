// ============================================================
// WayGo - Servicio de autenticacion (logica de negocio)
// Registro, confirmacion, login, refresh (rotacion), logout,
// recuperacion y restablecimiento de contrasena.
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const { hashPassword, verifyPassword } = require('../utils/password');
const { randomToken, sha256 } = require('../utils/crypto');
const { signAccessToken, refreshTtlMs } = require('../utils/jwt');
const mailer = require('../utils/mailer');
const audit = require('../utils/audit');

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 h

// ------------------------------------------------------------
// Registro
// ------------------------------------------------------------
async function register({ email, password, role, firstName, lastName, phone }, req) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict('Ya existe una cuenta con este correo electronico', 'EMAIL_TAKEN');
  }

  const roleRow = await prisma.role.findUnique({ where: { name: role } });
  if (!roleRow) throw ApiError.internal('Roles no inicializados. Ejecuta el seed.');

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      status: 'PENDING_VERIFICATION',
      roleId: roleRow.id,
      profile: { create: { firstName, lastName, phone: phone || null } },
      ...(role === 'CUSTOMER' ? { customerProfile: { create: {} } } : {}),
      ...(role === 'DRIVER' ? { driverProfile: { create: {} } } : {}),
    },
    include: { role: true },
  });

  // Token de confirmacion de correo
  const token = randomToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      type: 'EMAIL_CONFIRMATION',
      expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    },
  });
  await mailer.sendEmailConfirmation(user.email, token);

  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'USER_REGISTERED',
    entity: 'User',
    entityId: user.id,
    metadata: { role },
    req,
  });

  return { id: user.id, email: user.email, role: user.role.name };
}

// ------------------------------------------------------------
// Confirmacion de correo
// ------------------------------------------------------------
async function confirmEmail({ token }, req) {
  const tokenHash = sha256(token);
  const row = await prisma.verificationToken.findFirst({
    where: { tokenHash, type: 'EMAIL_CONFIRMATION' },
    include: { user: true },
  });
  if (!row) throw ApiError.badRequest('Token de confirmacion invalido', undefined, 'TOKEN_INVALID');
  if (row.usedAt) throw ApiError.badRequest('Este token ya fue utilizado', undefined, 'TOKEN_USED');
  if (row.expiresAt < new Date()) throw ApiError.badRequest('El token expiro. Solicita uno nuevo.', undefined, 'TOKEN_EXPIRED');

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: row.userId },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    }),
  ]);

  await audit({
    actorId: row.userId,
    actorEmail: row.user.email,
    action: 'EMAIL_CONFIRMED',
    entity: 'User',
    entityId: row.userId,
    req,
  });

  return { confirmed: true };
}

// ------------------------------------------------------------
// Reenvio de correo de confirmacion
// ------------------------------------------------------------
async function resendConfirmation({ email }, req) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Respuesta neutra para no revelar si el correo existe
  if (!user || user.status !== 'PENDING_VERIFICATION') return { sent: true };

  await prisma.verificationToken.updateMany({
    where: { userId: user.id, type: 'EMAIL_CONFIRMATION', usedAt: null },
    data: { usedAt: new Date() }, // invalida los anteriores
  });

  const token = randomToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      type: 'EMAIL_CONFIRMATION',
      expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    },
  });
  await mailer.sendEmailConfirmation(user.email, token);
  await audit({ actorId: user.id, actorEmail: user.email, action: 'EMAIL_CONFIRMATION_RESENT', entity: 'User', entityId: user.id, req });
  return { sent: true };
}

// ------------------------------------------------------------
// Login
// ------------------------------------------------------------
async function login({ email, password }, req) {
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

  const fail = async (reason) => {
    await audit({ actorEmail: email, action: 'LOGIN_FAILED', entity: 'User', metadata: { reason }, req });
    throw ApiError.unauthorized('Credenciales invalidas', 'AUTH_INVALID_CREDENTIALS');
  };

  if (!user) await fail('user_not_found');
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) await fail('bad_password');

  if (user.status === 'BLOCKED') throw ApiError.forbidden('Tu cuenta esta bloqueada. Contacta soporte.', 'USER_BLOCKED');
  if (user.status === 'DELETED') throw ApiError.forbidden('Cuenta eliminada.', 'USER_DELETED');
  if (user.status === 'PENDING_VERIFICATION') {
    throw ApiError.forbidden('Debes confirmar tu correo electronico antes de ingresar', 'EMAIL_NOT_VERIFIED');
  }

  const accessToken = signAccessToken({ id: user.id, role: user.role.name });
  const { token: refreshToken } = await issueRefreshToken(user.id, req);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ actorId: user.id, actorEmail: user.email, action: 'LOGIN_SUCCESS', entity: 'User', entityId: user.id, req });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role.name } };
}

// ------------------------------------------------------------
// Refresh tokens (rotacion con deteccion de reutilizacion)
// ------------------------------------------------------------
async function issueRefreshToken(userId, req) {
  const token = randomToken(64);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
      createdByIp: req ? (req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || null) : null,
    },
  });
  return { token };
}

async function refresh({ refreshToken }, req) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token requerido', 'REFRESH_REQUIRED');

  const tokenHash = sha256(refreshToken);
  const row = await prisma.refreshToken.findFirst({ where: { tokenHash }, include: { user: { include: { role: true } } } });

  if (!row) throw ApiError.unauthorized('Refresh token invalido', 'REFRESH_INVALID');

  // Reutilizacion de token rotado = posible robo: revocar toda la cadena
  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit({ actorId: row.userId, action: 'REFRESH_TOKEN_REUSE_DETECTED', entity: 'User', entityId: row.userId, req });
    throw ApiError.unauthorized('Sesion invalidada por seguridad. Inicia sesion de nuevo.', 'REFRESH_REUSE');
  }
  if (row.expiresAt < new Date()) throw ApiError.unauthorized('Refresh token expirado', 'REFRESH_EXPIRED');

  if (row.user.status !== 'ACTIVE') throw ApiError.forbidden('Cuenta no activa', 'USER_NOT_ACTIVE');

  // Rotacion
  const { token: newRefreshToken } = await issueRefreshToken(row.userId, req);
  const newHash = sha256(newRefreshToken);
  const newRow = await prisma.refreshToken.findFirst({ where: { tokenHash: newHash } });
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date(), replacedById: newRow.id },
  });

  const accessToken = signAccessToken({ id: row.user.id, role: row.user.role.name });
  return { accessToken, refreshToken: newRefreshToken, user: { id: row.user.id, email: row.user.email, role: row.user.role.name } };
}

async function logout({ refreshToken }, req) {
  if (refreshToken) {
    const tokenHash = sha256(refreshToken);
    await prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
    if (req.user) {
      await audit({ actorId: req.user.id, actorEmail: req.user.email, action: 'LOGOUT', entity: 'User', entityId: req.user.id, req });
    }
  }
  return { loggedOut: true };
}

// ------------------------------------------------------------
// Recuperacion de contrasena
// ------------------------------------------------------------
async function forgotPassword({ email }, req) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Respuesta neutra (no revelar existencia de la cuenta)
  if (!user) return { sent: true };

  await prisma.verificationToken.updateMany({
    where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  await mailer.sendPasswordReset(user.email, token);
  await audit({ actorId: user.id, actorEmail: user.email, action: 'PASSWORD_RESET_REQUESTED', entity: 'User', entityId: user.id, req });
  return { sent: true };
}

async function resetPassword({ token, password }, req) {
  const tokenHash = sha256(token);
  const row = await prisma.verificationToken.findFirst({
    where: { tokenHash, type: 'PASSWORD_RESET' },
    include: { user: true },
  });
  if (!row) throw ApiError.badRequest('Token de restablecimiento invalido', undefined, 'TOKEN_INVALID');
  if (row.usedAt) throw ApiError.badRequest('Este token ya fue utilizado', undefined, 'TOKEN_USED');
  if (row.expiresAt < new Date()) throw ApiError.badRequest('El token expiro. Solicita uno nuevo.', undefined, 'TOKEN_EXPIRED');

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    // Cierra todas las sesiones activas
    prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  await audit({ actorId: row.userId, actorEmail: row.user.email, action: 'PASSWORD_RESET_COMPLETED', entity: 'User', entityId: row.userId, req });
  return { reset: true };
}

// ------------------------------------------------------------
// Perfil actual
// ------------------------------------------------------------
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      status: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      role: { select: { name: true } },
      profile: {
        select: {
          firstName: true, lastName: true, phone: true, photoUrl: true,
          city: true, documentType: true,
        },
      },
      driverProfile: {
        select: { operationalStatus: true, verificationStatus: true, averageRating: true, totalTrips: true },
      },
      customerProfile: { select: { totalTrips: true, totalKm: true, totalSpent: true } },
    },
  });
  if (!user) throw ApiError.notFound('Usuario no encontrado');
  return user;
}

module.exports = {
  register,
  confirmEmail,
  resendConfirmation,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
