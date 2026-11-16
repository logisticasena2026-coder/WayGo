// ============================================================
// WayGo - Rutas de contratos: /api/contracts
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/contract.controller');
const validators = require('../validators/package.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive);

// Cliente crea y gestiona sus contratos; admin tambien
router.post('/', requireRole('CUSTOMER', 'ADMIN'), validators.contractValidator, validate, ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', validators.uuidParam(), validate, ctrl.getOne);
router.put('/:id/assign', requireRole('CUSTOMER', 'ADMIN'), validators.uuidParam(), validate, validators.assignDriverValidator, validate, ctrl.assignDriver);
router.put('/:id/status', requireRole('CUSTOMER', 'ADMIN'), validators.uuidParam(), validate, validators.contractStatusValidator, validate, ctrl.changeStatus);
router.post('/:id/generate', requireRole('CUSTOMER', 'ADMIN'), validators.uuidParam(), validate, ctrl.generate);

module.exports = router;
