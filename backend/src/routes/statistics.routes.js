// ============================================================
// WayGo - Rutas de estadisticas: /api/statistics
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/statistics.controller');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive);

// General (admin / call center)
router.get('/general', requireRole('ADMIN', 'CALL_CENTER'), ctrl.general);
router.get('/export/general', requireRole('ADMIN', 'CALL_CENTER'), ctrl.exportGeneral);

// Por conductor: propio (DRIVER) o de otro (ADMIN)
router.get('/driver', requireRole('DRIVER'), ctrl.driver);
router.get('/driver/:id', requireRole('ADMIN'), ctrl.driver);

// Por cliente: propio (CUSTOMER) o de otro (ADMIN)
router.get('/customer', requireRole('CUSTOMER'), ctrl.customer);
router.get('/customer/:id', requireRole('ADMIN'), ctrl.customer);

// Paquetes (admin / call center)
router.get('/packages', requireRole('ADMIN', 'CALL_CENTER'), ctrl.packages);

module.exports = router;
