// ============================================================
// WayGo - Controlador de vehiculos
// ============================================================
const vehicleService = require('../services/vehicle.service');
const catchAsync = require('../utils/catchAsync');
const { publicUrl, removeFile } = require('../middlewares/upload');
const ApiError = require('../utils/apiError');

const list = catchAsync(async (req, res) => {
  const vehicles = await vehicleService.listVehicles(req.user.id);
  res.json({ vehicles });
});

const getOne = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.getVehicle(req.user.id, req.params.id);
  res.json({ vehicle });
});

const create = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.user.id, req.body, req);
  res.status(201).json({ message: 'Vehiculo registrado', vehicle });
});

const update = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(req.user.id, req.params.id, req.body, req);
  res.json({ message: 'Vehiculo actualizado', vehicle });
});

const deactivate = catchAsync(async (req, res) => {
  await vehicleService.deactivateVehicle(req.user.id, req.params.id, req);
  res.json({ message: 'Vehiculo desactivado' });
});

const setPrimary = catchAsync(async (req, res) => {
  const vehicle = await vehicleService.setPrimary(req.user.id, req.params.id, req);
  res.json({ message: 'Vehiculo principal actualizado', vehicle });
});

const updatePhoto = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Debes adjuntar una imagen', undefined, 'FILE_REQUIRED');
  const photoUrl = publicUrl('vehicles', req.file.filename);
  try {
    const vehicle = await vehicleService.updateVehiclePhoto(req.user.id, req.params.id, photoUrl, req);
    res.json({ message: 'Foto del vehiculo actualizada', photoUrl: vehicle.photoUrl });
  } catch (e) {
    removeFile('vehicles', req.file.filename);
    throw e;
  }
});

const addDocument = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Debes adjuntar el archivo del documento', undefined, 'FILE_REQUIRED');
  const fileUrl = publicUrl('documents', req.file.filename);
  try {
    const doc = await vehicleService.addVehicleDocument(req.user.id, req.params.id, { ...req.body, fileUrl }, req);
    res.status(201).json({ message: 'Documento del vehiculo cargado. Queda pendiente de revision.', document: doc });
  } catch (e) {
    removeFile('documents', req.file.filename);
    throw e;
  }
});

const deleteDocument = catchAsync(async (req, res) => {
  await vehicleService.deleteVehicleDocument(req.user.id, req.params.id, req.params.docId, req);
  res.json({ message: 'Documento eliminado' });
});

module.exports = { list, getOne, create, update, deactivate, setPrimary, updatePhoto, addDocument, deleteDocument };
