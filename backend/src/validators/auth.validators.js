// ============================================================
// WayGo - Validadores de autenticacion
// ============================================================
const { body } = require('express-validator');

const passwordRules = () =>
  body('password')
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('La contrasena debe tener entre 8 y 72 caracteres')
    .matches(/[a-z]/).withMessage('Debe contener al menos una minuscula')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayuscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos un numero');

const registerValidator = [
  body('email').isEmail().withMessage('Correo electronico invalido').normalizeEmail().isLength({ max: 160 }),
  passwordRules(),
  body('role')
    .isIn(['CUSTOMER', 'DRIVER'])
    .withMessage('El registro publico solo permite roles CUSTOMER o DRIVER'),
  body('firstName').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 80 }),
  body('lastName').trim().notEmpty().withMessage('El apellido es obligatorio').isLength({ max: 80 }),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }),
];

const loginValidator = [
  body('email').isEmail().withMessage('Correo electronico invalido').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('La contrasena es obligatoria'),
];

const emailOnlyValidator = [
  body('email').isEmail().withMessage('Correo electronico invalido').normalizeEmail(),
];

const tokenValidator = [
  body('token').isString().notEmpty().withMessage('Token requerido'),
];

const resetPasswordValidator = [
  body('token').isString().notEmpty().withMessage('Token requerido'),
  passwordRules(),
];

module.exports = {
  registerValidator,
  loginValidator,
  emailOnlyValidator,
  tokenValidator,
  resetPasswordValidator,
};
