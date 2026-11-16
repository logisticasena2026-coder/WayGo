// ============================================================
// WayGo - Controlador de usuarios (perfil propio)
// ============================================================
const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const { publicUrl, removeFile } = require('../middlewares/upload');
const ApiError = require('../utils/apiError');

const getProfile = catchAsync(async (req, res) => {
  const profile = await userService.getProfile(req.user.id);
  res.json({ profile });
});

const updateProfile = catchAsync(async (req, res) => {
  const profile = await userService.updateProfile(req.user.id, req.body, req);
  res.json({ message: 'Perfil actualizado', profile });
});

const updatePhoto = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Debes adjuntar una imagen', undefined, 'FILE_REQUIRED');
  const photoUrl = publicUrl('photos', req.file.filename);
  try {
    const profile = await userService.updatePhoto(req.user.id, photoUrl, req);
    res.json({ message: 'Fotografia actualizada', photoUrl: profile.photoUrl });
  } catch (e) {
    removeFile('photos', req.file.filename);
    throw e;
  }
});

const changePassword = catchAsync(async (req, res) => {
  await userService.changePassword(req.user.id, req.body, req);
  res.json({ message: 'Contrasena actualizada. Las demas sesiones fueron cerradas.' });
});

module.exports = { getProfile, updateProfile, updatePhoto, changePassword };
