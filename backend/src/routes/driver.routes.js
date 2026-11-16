// ============================================================
// WayGo - Rutas de conductor: /api/drivers
// ============================================================
const { Router } = require('express');
const ctrl = require('../controllers/driver.controller');
const validators = require('../validators/driver.validators');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');
const { uploadDocument } = require('../middlewares/upload');

const router = Router();

router.use(requireAuth, requireActive, requireRole('DRIVER'));

router.get('/me', ctrl.getMe);
router.put('/me/license', validators.licenseValidator, validate, ctrl.updateLicense);

router.post('/me/documents', uploadDocument.single('file'), validators.driverDocumentValidator, validate, ctrl.addDocument);
router.get('/me/documents', ctrl.listDocuments);
router.delete('/me/documents/:id', validators.uuidParam(), validate, ctrl.deleteDocument);

router.put('/me/status', validators.operationalStatusValidator, validate, ctrl.setOperationalStatus);
router.put('/me/location-consent', validators.locationConsentValidator, validate, ctrl.setLocationConsent);
router.put('/me/location', validators.locationValidator, validate, ctrl.updateLocation);

module.exports = router;
