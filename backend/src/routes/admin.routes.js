// ============================================================
// WayGo - Rutas de administracion: /api/admin
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/admin.controller');
const validators = require('../validators/driver.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive, requireRole('ADMIN'));

// Conductores y verificacion
router.get('/drivers', ctrl.listDrivers);
router.get('/drivers/:id', validators.uuidParam(), validate, ctrl.getDriver);
router.post('/drivers/:id/verify', validators.uuidParam(), validate, validators.verifyDriverValidator, validate, ctrl.verifyDriver);
router.post('/driver-documents/:docId/review', ctrl.reviewDriverDocument);
router.post('/vehicle-documents/:docId/review', ctrl.reviewVehicleDocument);

// Usuarios
router.get('/users', ctrl.listUsers);
router.put('/users/:id/status', validators.uuidParam(), validate, ctrl.setUserStatus);

module.exports = router;
