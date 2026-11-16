// ============================================================
// WayGo - Validadores de solicitudes de servicio y ofertas
// ============================================================
const { body, param } = require('express-validator');

const coord = (name, label) =>
  body(name)
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: -90, max: 90 }).withMessage(`${label} invalida`);

const requestValidator = [
  body('serviceType').isIn(['PASSENGER']).withMessage('FASE 3 soporta PASSENGER (paquetes y contratos en FASE 5)'),
  body('pickupAddress').trim().notEmpty().withMessage('El lugar de recogida es obligatorio').isLength({ max: 255 }),
  coord('pickupLat', 'Latitud de origen'),
  coord('pickupLng', 'Longitud de origen'),
  body('dropoffAddress').trim().notEmpty().withMessage('El destino es obligatorio').isLength({ max: 255 }),
  coord('dropoffLat', 'Latitud de destino'),
  coord('dropoffLng', 'Longitud de destino'),
  body('scheduledDate').isISO8601().withMessage('Fecha invalida (YYYY-MM-DD)'),
  body('scheduledTime').matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora invalida (HH:mm)'),
  body('passengerCount').optional({ nullable: true }).isInt({ min: 1, max: 50 }).withMessage('Numero de pasajeros invalido'),
  body('observations').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }),
  body('proposedPrice').isFloat({ min: 0.01, max: 100000000 }).withMessage('Precio propuesto invalido (mayor a 0)'),
];

const offerValidator = [
  body('vehicleId').isUUID().withMessage('Debes seleccionar un vehiculo'),
  body('price').isFloat({ min: 0.01, max: 100000000 }).withMessage('Precio invalido (mayor a 0)'),
  body('etaMinutes').optional({ nullable: true }).isInt({ min: 1, max: 1440 }).withMessage('Tiempo estimado invalido'),
  body('message').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }),
];

const uuidParam = (name = 'id') => [param(name).isUUID().withMessage(`${name} debe ser UUID`)];

module.exports = { requestValidator, offerValidator, uuidParam };
