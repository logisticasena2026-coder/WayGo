// ============================================================
// WayGo - Rutas de cliente: /api/customers
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/customer.controller');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive, requireRole('CUSTOMER'));

router.get('/me', ctrl.getMe);

module.exports = router;
