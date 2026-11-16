// ============================================================
// WayGo - Limitadores de tasa (rate limiting)
// ============================================================
const rateLimit = require('express-rate-limit');

const json = (req, res) => {
  res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intenta de nuevo mas tarde.' },
  });
};

/** Limite general de la API */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: json,
});

/** Limite estricto para endpoints de autenticacion sensibles */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: json,
});

/** Limite muy estricto para recuperacion de contrasena */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: json,
});

module.exports = { apiLimiter, authLimiter, passwordResetLimiter };
