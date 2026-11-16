// ============================================================
// WayGo - Rutas de ofertas (vista del conductor): /api/offers
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/offer.controller');
const validators = require('../validators/service.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive, requireRole('DRIVER'));

router.get('/', ctrl.listMyOffers);
router.delete('/:id', validators.uuidParam(), validate, ctrl.withdraw);

module.exports = router;
