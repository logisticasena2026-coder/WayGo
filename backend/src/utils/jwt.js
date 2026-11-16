// ============================================================
// WayGo - Emision y verificacion de JWT de acceso
// (Los refresh tokens son opacos y se manejan con crypto.js)
// ============================================================
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Firma un access token para el usuario.
 * @param {{id:string, role:string}} payload
 */
const signAccessToken = (payload) =>
  jwt.sign({ sub: payload.id, role: payload.role, type: 'access' }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires,
    issuer: 'waygo',
    audience: 'waygo-api',
  });

/** Verifica un access token y retorna su payload (lanza si invalido) */
const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwt.accessSecret, { issuer: 'waygo', audience: 'waygo-api' });

/** Duracion del refresh token en ms (para expiracion en BD) */
const refreshTtlMs = () => {
  const v = config.jwt.refreshExpires; // ej "7d"
  const match = /^(\d+)([smhd])$/.exec(v);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
};

module.exports = { signAccessToken, verifyAccessToken, refreshTtlMs };
