// ============================================================
// WayGo - Error de API con codigo HTTP y detalles estructurados
// ============================================================
class ApiError extends Error {
  /**
   * @param {number} statusCode Codigo HTTP
   * @param {string} code Codigo de error de negocio (ej. AUTH_INVALID_CREDENTIALS)
   * @param {string} message Mensaje legible
   * @param {object} [details] Detalles adicionales (errores de validacion, etc.)
   */
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isApiError = true;
  }

  static badRequest(msg, details, code = 'BAD_REQUEST') { return new ApiError(400, code, msg, details); }
  static unauthorized(msg = 'No autenticado', code = 'UNAUTHORIZED') { return new ApiError(401, code, msg); }
  static forbidden(msg = 'No tienes permisos para esta operacion', code = 'FORBIDDEN') { return new ApiError(403, code, msg); }
  static notFound(msg = 'Recurso no encontrado', code = 'NOT_FOUND') { return new ApiError(404, code, msg); }
  static conflict(msg, code = 'CONFLICT') { return new ApiError(409, code, msg); }
  static tooMany(msg = 'Demasiadas solicitudes, intenta mas tarde') { return new ApiError(429, 'RATE_LIMITED', msg); }
  static internal(msg = 'Error interno del servidor') { return new ApiError(500, 'INTERNAL_ERROR', msg); }
}

module.exports = ApiError;
