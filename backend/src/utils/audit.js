// ============================================================
// WayGo - Registro de auditoria
// Persiste operaciones importantes con actor, entidad e IP
// ============================================================
const prisma = require('./prisma');

/**
 * @param {object} p
 * @param {string} [p.actorId]   UUID del usuario que ejecuta la accion
 * @param {string} [p.actorEmail]
 * @param {string} p.action      Codigo de accion (USER_REGISTERED, LOGIN_SUCCESS...)
 * @param {string} [p.entity]    Entidad afectada (User, ServiceRequest...)
 * @param {string} [p.entityId]
 * @param {object} [p.metadata]  Datos adicionales serializables
 * @param {object} [p.req]       Request de Express (para IP y user-agent)
 */
async function audit({ actorId = null, actorEmail = null, action, entity = null, entityId = null, metadata = null, req = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        actorEmail,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        metadata: metadata || undefined,
        ipAddress: req ? (req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || null) : null,
        userAgent: req ? req.headers['user-agent'] || null : null,
      },
    });
  } catch (e) {
    // La auditoria nunca debe romper el flujo principal
    console.error('[audit] Error registrando evento:', e.message);
  }
}

module.exports = audit;
