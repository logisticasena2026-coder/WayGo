// ============================================================
// WayGo - Rutas de solicitudes de servicio: /api/services
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/request.controller');
const validators = require('../validators/service.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive);

// Cliente: crear / listar / publicar / retirar
router.post('/', requireRole('CUSTOMER'), validators.requestValidator, validate, ctrl.create);
router.get('/mine', requireRole('CUSTOMER'), ctrl.listMy);
router.put('/:id', requireRole('CUSTOMER'), validators.uuidParam(), validate, ctrl.update);
router.post('/:id/publish', requireRole('CUSTOMER'), validators.uuidParam(), validate, ctrl.publish);
router.post('/:id/withdraw', requireRole('CUSTOMER'), validators.uuidParam(), validate, ctrl.withdraw);

// Conductor: solicitudes disponibles
router.get('/available', requireRole('DRIVER'), ctrl.listAvailable);

// Compartido (cliente dueño o conductor habilitado): detalle
router.get('/:id', ctrl.getOne);

// Ofertas sobre una solicitud
router.post('/:id/offers', requireRole('DRIVER'), validators.uuidParam(), validate, validators.offerValidator, validate, ctrl.createOffer);
router.get('/:id/offers', ctrl.listOffers);
router.post('/:id/offers/:offerId/accept', requireRole('CUSTOMER'), validate, ctrl.acceptOffer);

module.exports = router;
