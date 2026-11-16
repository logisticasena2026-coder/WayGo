// ============================================================
// WayGo - Aplicacion Express
// ============================================================
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const config = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const { apiLimiter } = require('./middlewares/rateLimiter');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Seguridad
  app.use(helmet());
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    })
  );

  // Utilidades
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  if (!config.isProd) app.use(morgan('dev'));

  // Archivos subidos (fotos/documentos) - estaticos controlados
  app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)));

  // API con rate limit general
  app.use('/api', apiLimiter, routes);

  // 404 y errores
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
