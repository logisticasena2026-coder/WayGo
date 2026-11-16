// ============================================================
// WayGo - Rutas de autenticacion: /api/auth
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const validators = require('../validators/auth.validators');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { authLimiter, passwordResetLimiter } = require('../middlewares/rateLimiter');

const router = Router();

router.post('/register', authLimiter, validators.registerValidator, validate, ctrl.register);
router.post('/confirm-email', authLimiter, validators.tokenValidator, validate, ctrl.confirmEmail);
router.post('/resend-confirmation', authLimiter, validators.emailOnlyValidator, validate, ctrl.resendConfirmation);
router.post('/login', authLimiter, validators.loginValidator, validate, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/forgot-password', passwordResetLimiter, validators.emailOnlyValidator, validate, ctrl.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validators.resetPasswordValidator, validate, ctrl.resetPassword);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
