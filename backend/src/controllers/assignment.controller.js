// ============================================================
// WayGo - Controlador de asignaciones / seguimiento
// ============================================================
const assignmentService = require('../services/assignment.service');
const catchAsync = require('../utils/catchAsync');

const myActive = catchAsync(async (req, res) => {
  const assignment = await assignmentService.getActiveAssignment(req.user.id);
  res.json({ assignment });
});

const myActiveAsCustomer = catchAsync(async (req, res) => {
  const assignment = await assignmentService.getActiveForCustomer(req.user.id);
  res.json({ assignment });
});

const tracking = catchAsync(async (req, res) => {
  const points = await assignmentService.getTracking(req.user.id, req.params.id);
  res.json({ points });
});

const arrive = catchAsync(async (req, res) => {
  await assignmentService.driverArrived(req.user.id, req.params.id, req);
  res.json({ message: 'Llegada registrada' });
});

const start = catchAsync(async (req, res) => {
  await assignmentService.startService(req.user.id, req.params.id, req);
  res.json({ message: 'Servicio iniciado' });
});

const complete = catchAsync(async (req, res) => {
  await assignmentService.completeService(req.user.id, req.params.id, req.body, req);
  res.json({ message: 'Servicio finalizado' });
});

module.exports = { myActive, myActiveAsCustomer, tracking, arrive, start, complete };
