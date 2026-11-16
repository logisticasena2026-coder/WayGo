// ============================================================
// WayGo - Notificaciones: persistencia en BD + emision Socket.IO
// ============================================================
const prisma = require('../utils/prisma');
const { emitToUser, emitToRole } = require('../sockets');

/**
 * Crea una notificacion en BD y la emite en tiempo real al usuario.
 * @param {object} p
 * @param {string} p.userId   destinatario
 * @param {string} p.type     codigo de evento (NEW_OFFER, OFFER_ACCEPTED...)
 * @param {string} p.title
 * @param {string} [p.body]
 * @param {object} [p.data]   datos asociados (id de solicitud, oferta...)
 */
async function notifyUser({ userId, type, title, body, data }) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body: body || null, data: data || undefined },
    });
  } catch (e) {
    console.error('[notify] error persistiendo notificacion:', e.message);
  }
  emitToUser(userId, `notif:${type}`, { type, title, body, data, at: new Date().toISOString() });
}

/** Emite un evento simple a un rol completo (ej. nueva solicitud a conductores) */
function emitToDrivers(event, payload) {
  emitToRole('DRIVER', event, payload);
}

module.exports = { notifyUser, emitToDrivers };
