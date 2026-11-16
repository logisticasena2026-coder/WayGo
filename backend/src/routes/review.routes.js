// ============================================================
// WayGo - Rutas de evaluaciones: /api/reviews
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/review.controller');
const validators = require('../validators/review.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive } = require('../middlewares/auth');

const router = Router();

// Resumen publico de un conductor (usado en ofertas)
router.get('/driver/:id/summary', validators.uuidParam(), validate, ctrl.driverSummary);

router.use(requireAuth, requireActive);
router.get('/criteria', ctrl.criteriaList);
router.post('/', validators.reviewValidator, validate, ctrl.create);
router.get('/mine', ctrl.listMine);

module.exports = router;
