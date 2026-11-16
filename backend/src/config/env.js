// ============================================================
// WayGo - Configuracion central de entorno
// Carga .env, valida variables obligatorias y expone constantes
// ============================================================
require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  // No se lanza excepcion aqui para permitir comandos CLI (prisma, etc.)
  console.error(`[config] Faltan variables de entorno: ${missing.join(', ')}`);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  appName: process.env.APP_NAME || 'WayGo',
  appTimezone: process.env.APP_TIMEZONE || 'America/Bogota',

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  cookie: {
    secure: String(process.env.COOKIE_SECURE) === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    refreshName: 'waygo_rt',
  },

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mail: {
    provider: process.env.MAIL_PROVIDER || 'console',
    from: process.env.MAIL_FROM || 'no-reply@waygo.local',
    smtp: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),
  },

  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
};
