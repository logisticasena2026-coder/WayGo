// ============================================================
// WayGo - Manejador centralizado de errores
// Responde siempre JSON: { error: { code, message, details? } }
// ============================================================
const config = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Errores de negocio controlados
  if (err.isApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Errores de validacion de express-validator (formateados por middleware validate)
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada invalidos', details: err.errors },
    });
  }

  // Errores conocidos de Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: { code: 'UNIQUE_CONSTRAINT', message: 'Ya existe un registro con esos datos', details: { fields: err.meta?.target } },
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Registro no encontrado' },
    });
  }

  // Errores de multer (subida de archivos)
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'El archivo supera el tamano maximo permitido',
      LIMIT_FILE_COUNT: 'Solo se permite un archivo por solicitud',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado',
    };
    return res.status(400).json({
      error: { code: 'UPLOAD_ERROR', message: messages[err.code] || 'Error al subir el archivo' },
    });
  }

  // JSON mal formado
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Cuerpo de la solicitud no es JSON valido' },
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Cuerpo de la solicitud demasiado grande' },
    });
  }

  console.error('[error]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(config.isProd ? {} : { details: { message: err.message } }),
    },
  });
}

module.exports = errorHandler;
