// ============================================================
// WayGo - Validadores de evaluaciones
// ============================================================
const { body, param } = require('express-validator');

const reviewValidator = [
  body('requestId').isUUID().withMessage('requestId debe ser UUID'),
  body('type').isIn(['CUSTOMER_TO_DRIVER', 'DRIVER_TO_CUSTOMER', 'CUSTOMER_VEHICLE_SERVICE', 'CALL_CENTER_INCIDENT'])
    .withMessage('Tipo de evaluacion invalido'),
  body('comment').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }),
  body('scores').isArray({ min: 1 }).withMessage('Debe incluir al menos una calificacion'),
  body('scores.*.criteriaId').isUUID().withMessage('criteriaId invalido'),
  body('scores.*.score').isInt({ min: 1, max: 5 }).withMessage('La calificacion debe estar entre 1 y 5'),
];

const uuidParam = (name = 'id') => [param(name).isUUID().withMessage(`${name} debe ser UUID`)];

module.exports = { reviewValidator, uuidParam };
