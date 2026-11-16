// ============================================================
// WayGo - Controlador de conductores
// ============================================================
const driverService = require('../services/driver.service');
const catchAsync = require('../utils/catchAsync');
const { publicUrl, removeFile } = require('../middlewares/upload');
const ApiError = require('../utils/apiError');

const getMe = catchAsync(async (req, res) => {
  const driver = await driverService.getDriverProfile(req.user.id);
  res.json({ driver });
});

const updateLicense = catchAsync(async (req, res) => {
  const driver = await driverService.updateLicense(req.user.id, req.body, req);
  res.json({ message: 'Licencia actualizada', driver });
});

const addDocument = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Debes adjuntar el archivo del documento', undefined, 'FILE_REQUIRED');
  const fileUrl = publicUrl('documents', req.file.filename);
  try {
    const doc = await driverService.addDocument(req.user.id, { ...req.body, fileUrl }, req);
    res.status(201).json({ message: 'Documento cargado. Queda pendiente de revision.', document: doc });
  } catch (e) {
    removeFile('documents', req.file.filename);
    throw e;
  }
});

const listDocuments = catchAsync(async (req, res) => {
  const documents = await driverService.listDocuments(req.user.id);
  res.json({ documents });
});

const deleteDocument = catchAsync(async (req, res) => {
  await driverService.deleteDocument(req.user.id, req.params.id, req);
  res.json({ message: 'Documento eliminado' });
});

const setOperationalStatus = catchAsync(async (req, res) => {
  const driver = await driverService.setOperationalStatus(req.user.id, req.body.status, req);
  res.json({
    message: req.body.status === 'AVAILABLE' ? 'Ahora estas disponible' : 'Te has desconectado',
    operationalStatus: driver.operationalStatus,
  });
});

const setLocationConsent = catchAsync(async (req, res) => {
  const consent = req.body.consent === true || req.body.consent === 'true';
  const driver = await driverService.setLocationConsent(req.user.id, consent, req);
  res.json({
    message: consent ? 'Autorizaste compartir tu ubicacion mientras estas conectado' : 'Revocaste el permiso de ubicacion',
    locationConsent: driver.locationConsent,
  });
});

const updateLocation = catchAsync(async (req, res) => {
  const result = await driverService.updateLocation(req.user.id, {
    lat: Number(req.body.lat),
    lng: Number(req.body.lng),
  }, req);
  res.json({ location: result });
});

module.exports = {
  getMe,
  updateLicense,
  addDocument,
  listDocuments,
  deleteDocument,
  setOperationalStatus,
  setLocationConsent,
  updateLocation,
};
