// ============================================================
// WayGo - Validadores de conductor y vehiculo
// ============================================================
const { body, param } = require('express-validator');

const licenseValidator = [
  body('licenseNumber').trim().notEmpty().withMessage('El numero de licencia es obligatorio').isLength({ max: 40 }),
  body('licenseCategory').trim().notEmpty().withMessage('La categoria es obligatoria (ej: B1, C2)')
    .isLength({ max: 10 }),
  body('licenseExpiresAt').isISO8601().withMessage('Fecha de vencimiento invalida (YYYY-MM-DD)'),
];

const driverDocumentValidator = [
  body('type').isIn(['LICENCIA', 'CEDULA', 'ANTECEDENTES', 'SEGURO', 'OTRO'])
    .withMessage('Tipo de documento invalido'),
  body('expiresAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Fecha invalida (YYYY-MM-DD)'),
];

const operationalStatusValidator = [
  body('status').isIn(['AVAILABLE', 'OFFLINE']).withMessage('Estado invalido (AVAILABLE u OFFLINE)'),
];

const locationValidator = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitud invalida'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitud invalida'),
];

const locationConsentValidator = [
  body('consent').isBoolean().withMessage('consent debe ser booleano'),
];

const vehicleValidator = [
  body('plate').trim().notEmpty().withMessage('La placa es obligatoria')
    .matches(/^[A-Z]{3}[0-9]{2}[0-9A-Z]$/i).withMessage('Placa invalida (formato ABC123 o ABC12D)')
    .isLength({ max: 10 }),
  body('brand').trim().notEmpty().withMessage('La marca es obligatoria').isLength({ max: 60 }),
  body('model').trim().notEmpty().withMessage('El modelo es obligatorio').isLength({ max: 60 }),
  body('year').optional({ nullable: true }).isInt({ min: 1950, max: new Date().getFullYear() + 1 }).withMessage('Anio invalido'),
  body('color').trim().notEmpty().withMessage('El color es obligatorio').isLength({ max: 40 }),
  body('type').optional({ nullable: true, checkFalsy: true })
    .isIn(['SEDAN', 'SUV', 'HATCHBACK', 'MOTO', 'CAMIONETA', 'VAN', 'PICKUP', 'OTRO']).withMessage('Tipo de vehiculo invalido'),
  body('capacity').optional({ nullable: true }).isInt({ min: 1, max: 50 }).withMessage('Capacidad invalida'),
];

const vehicleUpdateValidator = [
  body('plate').optional().trim()
    .matches(/^[A-Z]{3}[0-9]{2}[0-9A-Z]$/i).withMessage('Placa invalida'),
  body('brand').optional().trim().notEmpty().isLength({ max: 60 }),
  body('model').optional().trim().notEmpty().isLength({ max: 60 }),
  body('year').optional({ nullable: true }).isInt({ min: 1950, max: new Date().getFullYear() + 1 }),
  body('color').optional().trim().notEmpty().isLength({ max: 40 }),
  body('type').optional({ nullable: true, checkFalsy: true })
    .isIn(['SEDAN', 'SUV', 'HATCHBACK', 'MOTO', 'CAMIONETA', 'VAN', 'PICKUP', 'OTRO']),
  body('capacity').optional({ nullable: true }).isInt({ min: 1, max: 50 }),
];

const vehicleDocumentValidator = [
  body('type').isIn(['SOAT', 'TECNOMECANICA', 'TARJETA_PROPIEDAD', 'OTRO'])
    .withMessage('Tipo de documento invalido'),
  body('expiresAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Fecha invalida (YYYY-MM-DD)'),
];

const uuidParam = (name = 'id') => [param(name).isUUID().withMessage(`${name} debe ser un UUID valido`)];

const reviewDocumentValidator = [
  body('action').isIn(['APPROVE', 'REJECT']).withMessage('Accion invalida (APPROVE o REJECT)'),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }),
  body('rejectionReason').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }),
];

const verifyDriverValidator = [
  body('action').isIn(['APPROVE', 'REJECT']).withMessage('Accion invalida (APPROVE o REJECT)'),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }),
];

module.exports = {
  licenseValidator,
  driverDocumentValidator,
  operationalStatusValidator,
  locationValidator,
  locationConsentValidator,
  vehicleValidator,
  vehicleUpdateValidator,
  vehicleDocumentValidator,
  uuidParam,
  reviewDocumentValidator,
  verifyDriverValidator,
};
