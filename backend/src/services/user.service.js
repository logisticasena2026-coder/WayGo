// ============================================================
// WayGo - Servicio de usuarios (perfil, foto, contrasena)
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const { hashPassword, verifyPassword } = require('../utils/password');
const { removeByPublicUrl } = require('../middlewares/upload');
const audit = require('../utils/audit');

/** Campos actualizables del perfil */
const UPDATABLE = ['firstName', 'lastName', 'phone', 'documentType', 'documentNumber', 'birthDate', 'address', 'city'];

async function getProfile(userId) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Perfil no encontrado');
  return profile;
}

async function updateProfile(userId, data, req) {
  const update = {};
  for (const key of UPDATABLE) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  if (update.birthDate) update.birthDate = new Date(update.birthDate);
  if (Object.keys(update).length === 0) throw ApiError.badRequest('No hay campos para actualizar');

  const profile = await prisma.userProfile.update({ where: { userId }, data: update });
  await audit({ actorId: userId, action: 'PROFILE_UPDATED', entity: 'UserProfile', entityId: profile.id, metadata: { fields: Object.keys(update) }, req });
  return profile;
}

async function updatePhoto(userId, photoUrl, req) {
  const current = await prisma.userProfile.findUnique({ where: { userId } });
  if (!current) throw ApiError.notFound('Perfil no encontrado');

  const profile = await prisma.userProfile.update({ where: { userId }, data: { photoUrl } });
  // Borra la foto anterior del disco
  if (current.photoUrl && current.photoUrl !== photoUrl) removeByPublicUrl(current.photoUrl);

  await audit({ actorId: userId, action: 'PROFILE_PHOTO_UPDATED', entity: 'UserProfile', entityId: profile.id, req });
  return profile;
}

async function changePassword(userId, { currentPassword, newPassword }, req) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Usuario no encontrado');

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('La contrasena actual es incorrecta', undefined, 'WRONG_CURRENT_PASSWORD');

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Cierra las demas sesiones activas
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  await audit({ actorId: userId, actorEmail: user.email, action: 'PASSWORD_CHANGED', entity: 'User', entityId: userId, req });
  return { changed: true };
}

module.exports = { getProfile, updateProfile, updatePhoto, changePassword };
