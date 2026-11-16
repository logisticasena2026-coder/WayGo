// ============================================================
// WayGo - Rutas de asignaciones / seguimiento: /api/assignments
// ============================================================
const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/assignment.controller');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive);

// Conductor: servicio activo y acciones de seguimiento
router.get('/active', requireRole('DRIVER'), ctrl.myActive);
router.post('/:id/arrive', requireRole('DRIVER'), ctrl.arrive);
router.post('/:id/start', requireRole('DRIVER'), ctrl.start);
router.post('/:id/complete', requireRole('DRIVER'), [body('actualKm').optional().isFloat({ min: 0, max: 100000 })], validate, ctrl.complete);

// Cliente: seguimiento de su servicio activo
router.get('/active-as-customer', requireRole('CUSTOMER'), ctrl.myActiveAsCustomer);

module.exports = router;
