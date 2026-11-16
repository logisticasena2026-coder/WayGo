// ============================================================
// WayGo - Recoge los resultados de express-validator
// ============================================================
const { validationResult } = require('express-validator');

/**
 * Middleware que se coloca despues de las cadenas de validacion.
 * Si hay errores, responde 400 con detalle por campo.
 */
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg, value: undefined }));
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada invalidos', details },
  });
};
