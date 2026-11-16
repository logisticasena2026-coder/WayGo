// ============================================================
// WayGo - Middlewares de autenticacion y autorizacion (RBAC)
// ============================================================
const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const prisma = require('../utils/prisma');

/**
 * Exige un access token valido en el encabezado Authorization: Bearer <jwt>
 * Carga req.user con { id, email, role, status }
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Token de acceso requerido', 'AUTH_TOKEN_REQUIRED');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (e) {
      throw ApiError.unauthorized('Token de acceso invalido o expirado', 'AUTH_TOKEN_INVALID');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true, role: { select: { name: true } } },
    });
    if (!user) throw ApiError.unauthorized('Usuario inexistente', 'AUTH_USER_NOT_FOUND');
    if (user.status === 'BLOCKED') throw ApiError.forbidden('Tu cuenta esta bloqueada', 'USER_BLOCKED');
    if (user.status === 'DELETED') throw ApiError.forbidden('Cuenta eliminada', 'USER_DELETED');

    req.user = { id: user.id, email: user.email, status: user.status, role: user.role.name };
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Exige uno de los roles indicados.
 * Uso: router.get('/admin', requireAuth, requireRole('ADMIN'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requiere rol: ${roles.join(' o ')}`, 'ROLE_REQUIRED'));
    }
    next();
  };
}

/** Exige cuenta con correo verificado y activa */
function requireActive(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.status !== 'ACTIVE') {
    return next(ApiError.forbidden('Debes confirmar tu correo electronico para continuar', 'EMAIL_NOT_VERIFIED'));
  }
  next();
}

module.exports = { requireAuth, requireRole, requireActive };
