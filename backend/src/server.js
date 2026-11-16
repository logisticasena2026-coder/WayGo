// ============================================================
// WayGo - Punto de entrada del servidor
// HTTP + Express + Socket.IO con apagado ordenado
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./config/env');
const createApp = require('./app');
const prisma = require('./utils/prisma');
const { initSocket } = require('./sockets');
const { expireStaleRequests } = require('./services/request.service');
const { materializeUpcomingExecutions, sendExpiryAlerts } = require('./services/contract.service');

async function main() {
  // Asegura el directorio de subidas
  const uploadDir = path.join(__dirname, '..', config.upload.dir);
  fs.mkdirSync(uploadDir, { recursive: true });

  // Verifica conexion a la base de datos antes de aceptar trafico
  await prisma.$queryRaw`SELECT 1`;
  console.log('[db] Conexion a PostgreSQL verificada.');

  const app = createApp();
  const server = http.createServer(app);

  initSocket(server);
  console.log('[socket.io] Inicializado.');

  server.listen(config.port, () => {
    console.log(`[server] WayGo API escuchando en http://localhost:${config.port}`);
    console.log(`[server] Entorno: ${config.env} | Zona horaria operativa: ${config.appTimezone}`);
  });

  // Cron: expira solicitudes vencidas cada 5 minutos
  const cron = setInterval(async () => {
    try {
      const n = await expireStaleRequests();
      if (n > 0) console.log(`[cron] ${n} solicitudes expiradas.`);
      const gen = await materializeUpcomingExecutions();
      if (gen > 0) console.log(`[cron] ${gen} servicios de contrato generados.`);
      const alerts = await sendExpiryAlerts();
      if (alerts > 0) console.log(`[cron] ${alerts} alertas de vencimiento enviadas.`);
    } catch (e) {
      console.error('[cron] error:', e.message);
    }
  }, 5 * 60 * 1000);
  cron.unref();

  // Apagado ordenado
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} recibido. Cerrando...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error('[server] Error fatal al iniciar:', e);
  process.exit(1);
});
