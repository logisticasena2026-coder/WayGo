// ============================================================
// WayGo - Controlador de autenticacion
// Maneja HTTP, cookies de refresh y delega al servicio
// ============================================================
const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const config = require('../config/env');

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: '/api/auth', // la cookie solo viaja a endpoints de auth
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body, req);
  res.status(201).json({
    message: 'Registro exitoso. Revisa tu correo para confirmar la cuenta.',
    user: result,
  });
});

const confirmEmail = catchAsync(async (req, res) => {
  await authService.confirmEmail(req.body, req);
  res.json({ message: 'Correo confirmado. Ya puedes iniciar sesion.' });
});

const resendConfirmation = catchAsync(async (req, res) => {
  await authService.resendConfirmation(req.body, req);
  res.json({ message: 'Si la cuenta existe y esta pendiente, enviamos un nuevo correo de confirmacion.' });
});

const login = catchAsync(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(req.body, req);
  res.cookie(config.cookie.refreshName, refreshToken, refreshCookieOptions());
  res.json({ accessToken, user });
});

const refresh = catchAsync(async (req, res) => {
  const token = req.cookies[config.cookie.refreshName];
  const { accessToken, refreshToken, user } = await authService.refresh({ refreshToken: token }, req);
  res.cookie(config.cookie.refreshName, refreshToken, refreshCookieOptions());
  res.json({ accessToken, user });
});

const logout = catchAsync(async (req, res) => {
  const token = req.cookies[config.cookie.refreshName];
  await authService.logout({ refreshToken: token }, req);
  res.clearCookie(config.cookie.refreshName, { path: '/api/auth' });
  res.json({ message: 'Sesion cerrada.' });
});

const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body, req);
  res.json({ message: 'Si el correo existe, enviamos instrucciones de recuperacion.' });
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body, req);
  res.clearCookie(config.cookie.refreshName, { path: '/api/auth' });
  res.json({ message: 'Contrasena restablecida. Inicia sesion con tu nueva contrasena.' });
});

const me = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ user });
});

module.exports = {
  register,
  confirmEmail,
  resendConfirmation,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
};
