// ============================================================
// WayGo - Rutas de paquetes: /api/packages
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/package.controller');
const validators = require('../validators/package.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');
const { uploadPhoto, uploadDocument } = require('../middlewares/upload');

const router = Router();

// Tracking publico (sin autenticacion)
router.get('/track/:code', ctrl.track);

router.use(requireAuth, requireActive);

// Cliente
router.post('/', requireRole('CUSTOMER'), validators.packageValidator, validate, ctrl.create);
router.get('/', requireRole('CUSTOMER'), ctrl.listMine);
router.post('/:id/photo', requireRole('CUSTOMER'), validators.uuidParam(), validate, uploadPhoto.single('photo'), ctrl.updatePhoto);

// Conductor
router.get('/driver', requireRole('DRIVER'), ctrl.listDriver);
router.post('/:id/pickup', requireRole('DRIVER'), validators.uuidParam(), validate, ctrl.pickup);
router.post('/:id/in-transit', requireRole('DRIVER'), validators.uuidParam(), validate, ctrl.inTransit);
router.post('/:id/incident', requireRole('DRIVER'), validators.uuidParam(), validate, ctrl.incident);
router.post('/:id/deliver', requireRole('DRIVER'), validators.uuidParam(), validate, uploadDocument.single('photo'), validators.deliveryEvidenceValidator, validate, ctrl.deliver);

// Compartido (dueño o conductor asignado)
router.get('/:id', ctrl.getOne);

module.exports = router;
