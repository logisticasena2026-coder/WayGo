// ============================================================
// WayGo - Rutas de usuario autenticado: /api/users
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/user.controller');
const validators = require('../validators/user.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive } = require('../middlewares/auth');
const { uploadPhoto } = require('../middlewares/upload');

const router = Router();

router.use(requireAuth, requireActive);

router.get('/me/profile', ctrl.getProfile);
router.put('/me/profile', validators.updateProfileValidator, validate, ctrl.updateProfile);
router.post('/me/photo', uploadPhoto.single('photo'), ctrl.updatePhoto);
router.put('/me/password', validators.changePasswordValidator, validate, ctrl.changePassword);

module.exports = router;
