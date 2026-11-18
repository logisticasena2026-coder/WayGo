// ============================================================
// WayGo - Validadores de paquetes y contratos
// ============================================================
const { body, param } = require('express-validator');

const packageValidator = [
  body('pickupAddress').trim().notEmpty().withMessage('Direccion de recogida obligatoria').isLength({ max: 255 }),
  body('dropoffAddress').trim().notEmpty().withMessage('Direccion de entrega obligatoria').isLength({ max: 255 }),
  body('pickupLat').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitud de recogida invalida'),
  body('pickupLng').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitud de recogida invalida'),
  body('dropoffLat').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitud de entrega invalida'),
  body('dropoffLng').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitud de entrega invalida'),
  body('scheduledDate').isISO8601().withMessage('Fecha invalida (YYYY-MM-DD)'),
  body('scheduledTime').matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora invalida (HH:mm)'),
  body('proposedPrice').isFloat({ min: 0.01, max: 100000000 }).withMessage('Precio invalido'),
  body('senderName').trim().notEmpty().withMessage('Nombre del remitente obligatorio').isLength({ max: 120 }),
  body('recipientName').trim().notEmpty().withMessage('Nombre del destinatario obligatorio').isLength({ max: 120 }),
  body('recipientPhone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }),
  body('description').trim().notEmpty().withMessage('Descripcion del paquete obligatoria'),
  body('weightKg').optional({ nullable: true }).isFloat({ min: 0.1, max: 5000 }).withMessage('Peso invalido'),
  body('dimensions').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 60 }),
  body('declaredValue').optional({ nullable: true }).isFloat({ min: 0, max: 100000000 }).withMessage('Valor declarado invalido'),
  body('observations').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }),
];

const deliveryEvidenceValidator = [
  body('receivedBy').trim().notEmpty().withMessage('Nombre de quien recibe obligatorio').isLength({ max: 120 }),
  body('receiverDocument').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }),
];

const contractValidator = [
  body('type').trim().notEmpty().withMessage('Tipo de contrato obligatorio').isLength({ max: 60 }),
  body('startDate').isISO8601().withMessage('Fecha inicial invalida (YYYY-MM-DD)'),
  body('endDate').isISO8601().withMessage('Fecha final invalida (YYYY-MM-DD)'),
  body('pickupAddress').trim().notEmpty().isLength({ max: 255 }),
  body('dropoffAddress').trim().notEmpty().isLength({ max: 255 }),
  body('pickupLat').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body('pickupLng').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  body('dropoffLat').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body('dropoffLng').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  body('servicesIncluded').isInt({ min: 1, max: 10000 }).withMessage('Cantidad de servicios invalida'),
  body('kmIncluded').optional({ nullable: true }).isFloat({ min: 0, max: 1000000 }),
  body('monthlyPrice').isFloat({ min: 0.01, max: 100000000 }).withMessage('Precio mensual invalido'),
  body('conditions').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 2000 }),
  body('schedules').isArray({ min: 1 }).withMessage('Debe indicar al menos un dia/horario de servicio'),
  body('schedules.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Dia de la semana invalido (0=domingo..6=sabado)'),
  body('schedules.*.time').matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora invalida (HH:mm)'),
];

const contractStatusValidator = [
  body('status').isIn(['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED']).withMessage('Estado invalido'),
];

const assignDriverValidator = [body('driverId').isUUID().withMessage('driverId debe ser UUID')];

const uuidParam = (name = 'id') => [param(name).isUUID().withMessage(`${name} debe ser UUID`)];

module.exports = {
  packageValidator,
  deliveryEvidenceValidator,
  contractValidator,
  contractStatusValidator,
  assignDriverValidator,
  uuidParam,
};
