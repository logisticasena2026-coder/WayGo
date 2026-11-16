// ============================================================
// WayGo - Controlador de paquetes
// ============================================================
const packageService = require('../services/package.service');
const catchAsync = require('../utils/catchAsync');
const { publicUrl, removeFile } = require('../middlewares/upload');
const ApiError = require('../utils/apiError');

const create = catchAsync(async (req, res) => {
  const result = await packageService.createPackage(req.user.id, req.body, req);
  res.status(201).json({ message: 'Paquete creado en borrador', package: result.package, request: result.request });
});

const listMine = catchAsync(async (req, res) => {
  const packages = await packageService.listMyPackages(req.user.id);
  res.json({ packages });
});

const listDriver = catchAsync(async (req, res) => {
  const packages = await packageService.listDriverPackages(req.user.id);
  res.json({ packages });
});

const getOne = catchAsync(async (req, res) => {
  const pkg = await packageService.getPackage(req.params.id, req.user.id);
  res.json({ package: pkg });
});

const track = catchAsync(async (req, res) => {
  const pkg = await packageService.getByTrackingCode(req.params.code);
  res.json({ package: pkg });
});

const updatePhoto = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Adjunta una imagen', undefined, 'FILE_REQUIRED');
  const photoUrl = publicUrl('photos', req.file.filename);
  try {
    const pkg = await packageService.uploadPackagePhoto(req.params.id, photoUrl, req);
    res.json({ message: 'Foto del paquete actualizada', photoUrl: pkg.photoUrl });
  } catch (e) {
    removeFile('photos', req.file.filename);
    throw e;
  }
});

const pickup = catchAsync(async (req, res) => {
  await packageService.updateStatus(req.user.id, req.params.id, 'PICKED_UP', req);
  res.json({ message: 'Paquete recogido' });
});

const inTransit = catchAsync(async (req, res) => {
  await packageService.updateStatus(req.user.id, req.params.id, 'IN_TRANSIT', req);
  res.json({ message: 'Paquete en transito' });
});

const incident = catchAsync(async (req, res) => {
  await packageService.updateStatus(req.user.id, req.params.id, 'INCIDENT', req);
  res.json({ message: 'Incidencia registrada' });
});

const deliver = catchAsync(async (req, res) => {
  const evidence = {
    ...req.body,
    photoUrl: req.file ? publicUrl('documents', req.file.filename) : null,
  };
  try {
    await packageService.deliver(req.user.id, req.params.id, evidence, req);
    res.json({ message: 'Paquete entregado con evidencia' });
  } catch (e) {
    if (req.file) removeFile('documents', req.file.filename);
    throw e;
  }
});

module.exports = { create, listMine, listDriver, getOne, track, updatePhoto, pickup, inTransit, incident, deliver };
