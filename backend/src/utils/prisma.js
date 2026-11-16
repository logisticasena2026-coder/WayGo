// ============================================================
// WayGo - Cliente Prisma (singleton)
// Evita multiples conexiones en desarrollo con nodemon
// ============================================================
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma =
  globalForPrisma.__waygoPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__waygoPrisma = prisma;
}

module.exports = prisma;
