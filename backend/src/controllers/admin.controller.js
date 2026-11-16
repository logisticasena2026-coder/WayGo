// ============================================================
// WayGo - Controlador de administracion (FASE 2)
// ============================================================
const adminService = require('../services/admin.service');
const catchAsync = require('../utils/catchAsync');

const listDrivers = catchAsync(async (req, res) => {
  const { status, page, pageSize } = req.query;
  const result = await adminService.listDrivers({
    status,
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
  });
  res.json(result);
});

const getDriver = catchAsync(async (req, res) => {
  const driver = await adminService.getDriverDetail(req.params.id);
  res.json({ driver });
});

const reviewDriverDocument = catchAsync(async (req, res) => {
  const document = await adminService.reviewDocument({
    kind: 'driver',
    documentId: req.params.docId,
    action: req.body.action,
    notes: req.body.notes,
    rejectionReason: req.body.rejectionReason,
    reviewerId: req.user.id,
    req,
  });
  res.json({ message: req.body.action === 'APPROVE' ? 'Documento aprobado' : 'Documento rechazado', document });
});

const reviewVehicleDocument = catchAsync(async (req, res) => {
  const document = await adminService.reviewDocument({
    kind: 'vehicle',
    documentId: req.params.docId,
    action: req.body.action,
    notes: req.body.notes,
    rejectionReason: req.body.rejectionReason,
    reviewerId: req.user.id,
    req,
  });
  res.json({ message: req.body.action === 'APPROVE' ? 'Documento aprobado' : 'Documento rechazado', document });
});

const verifyDriver = catchAsync(async (req, res) => {
  const driver = await adminService.verifyDriver({
    driverProfileId: req.params.id,
    action: req.body.action,
    notes: req.body.notes,
    reviewerId: req.user.id,
    req,
  });
  res.json({
    message: req.body.action === 'APPROVE' ? 'Conductor habilitado' : 'Solicitud de habilitacion rechazada',
    verificationStatus: driver.verificationStatus,
  });
});

const listUsers = catchAsync(async (req, res) => {
  const { role, status, search, page, pageSize } = req.query;
  const result = await adminService.listUsers({
    role,
    status,
    search,
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
  });
  res.json(result);
});

const setUserStatus = catchAsync(async (req, res) => {
  const result = await adminService.setUserStatus({
    userId: req.params.id,
    status: req.body.status,
    adminId: req.user.id,
    req,
  });
  res.json({ message: req.body.status === 'BLOCKED' ? 'Usuario bloqueado' : 'Usuario habilitado', user: result });
});

module.exports = {
  listDrivers,
  getDriver,
  reviewDriverDocument,
  reviewVehicleDocument,
  verifyDriver,
  listUsers,
  setUserStatus,
};
