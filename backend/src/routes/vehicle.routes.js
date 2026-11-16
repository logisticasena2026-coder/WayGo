// ============================================================
// WayGo - Rutas de vehiculos: /api/vehicles
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/vehicle.controller');
const validators = require('../validators/driver.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');
const { uploadVehiclePhoto, uploadDocument } = require('../middlewares/upload');

const router = Router();

router.use(requireAuth, requireActive, requireRole('DRIVER'));

router.get('/', ctrl.list);
router.post('/', validators.vehicleValidator, validate, ctrl.create);
router.get('/:id', validators.uuidParam(), validate, ctrl.getOne);
router.put('/:id', [...validators.uuidParam(), ...validators.vehicleUpdateValidator], validate, ctrl.update);
router.delete('/:id', validators.uuidParam(), validate, ctrl.deactivate);
router.put('/:id/primary', validators.uuidParam(), validate, ctrl.setPrimary);
router.post('/:id/photo', validators.uuidParam(), validate, uploadVehiclePhoto.single('photo'), ctrl.updatePhoto);
router.post('/:id/documents', validators.uuidParam(), validate, uploadDocument.single('file'), validators.vehicleDocumentValidator, validate, ctrl.addDocument);
router.delete('/:id/documents/:docId', validate, ctrl.deleteDocument);

module.exports = router;
