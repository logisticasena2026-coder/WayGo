// ============================================================
// WayGo - Utilidades criptograficas para tokens opacos
// (confirmacion de correo, recuperacion y refresh tokens)
// Nunca se persiste el token en claro, solo su SHA-256.
// ============================================================
const crypto = require('crypto');

/** Genera un token opaco URL-safe */
const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');

/** Hash SHA-256 hex de un token (lo que se guarda en BD) */
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

module.exports = { randomToken, sha256 };
