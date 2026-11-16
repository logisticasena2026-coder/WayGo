// ============================================================
// WayGo - Validadores de perfil de usuario
// ============================================================
const { body } = require('express-validator');

const updateProfileValidator = [
  body('firstName').optional().trim().notEmpty().withMessage('El nombre no puede estar vacio').isLength({ max: 80 }),
  body('lastName').optional().trim().notEmpty().withMessage('El apellido no puede estar vacio').isLength({ max: 80 }),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim()
    .matches(/^[0-9+\-\s()]{7,30}$/).withMessage('Telefono invalido'),
  body('documentType').optional({ nullable: true, checkFalsy: true }).isIn(['CC', 'CE', 'NIT', 'PAS'])
    .withMessage('Tipo de documento invalido (CC, CE, NIT, PAS)'),
  body('documentNumber').optional({ nullable: true, checkFalsy: true }).trim()
    .matches(/^[A-Za-z0-9\-]{4,30}$/).withMessage('Numero de documento invalido'),
  body('birthDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Fecha de nacimiento invalida (YYYY-MM-DD)'),
  body('address').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }),
  body('city').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
];

const changePasswordValidator = [
  body('currentPassword').isString().notEmpty().withMessage('La contrasena actual es obligatoria'),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 72 }).withMessage('La nueva contrasena debe tener entre 8 y 72 caracteres')
    .matches(/[a-z]/).withMessage('Debe contener al menos una minuscula')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayuscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos un numero'),
];

module.exports = { updateProfileValidator, changePasswordValidator };
