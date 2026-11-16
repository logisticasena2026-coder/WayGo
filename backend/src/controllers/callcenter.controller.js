// ============================================================
// WayGo - Controlador del call center
// ============================================================
const ccService = require('../services/callcenter.service');
const catchAsync = require('../utils/catchAsync');

const dashboard = catchAsync(async (req, res) => {
  const data = await ccService.getDashboard();
  res.json(data);
});

const map = catchAsync(async (req, res) => {
  const data = await ccService.getOperationalMap();
  res.json(data);
});

const driverDetail = catchAsync(async (req, res) => {
  const driver = await ccService.getDriverDetail(req.params.id);
  res.json({ driver });
});

const requestDetail = catchAsync(async (req, res) => {
  const request = await ccService.getRequestDetail(req.params.id);
  res.json({ request });
});

const manualAssign = catchAsync(async (req, res) => {
  const assignment = await ccService.manualAssign({ ...req.body, operatorId: req.user.id, req });
  res.json({ message: 'Servicio asignado manualmente', assignment });
});

const cancelService = catchAsync(async (req, res) => {
  await ccService.cancelService({ requestId: req.params.id, reason: req.body.reason, operatorId: req.user.id, req });
  res.json({ message: 'Servicio cancelado' });
});

const createTicket = catchAsync(async (req, res) => {
  const ticket = await ccService.createTicket({ ...req.body, reporterId: req.user.id, req });
  res.status(201).json({ message: 'Novedad registrada', ticket });
});

const listTickets = catchAsync(async (req, res) => {
  const { status, priority, page, pageSize } = req.query;
  const result = await ccService.listTickets({ status, priority, page: Number(page) || 1, pageSize: Math.min(Number(pageSize) || 20, 100) });
  res.json(result);
});

const updateTicket = catchAsync(async (req, res) => {
  const ticket = await ccService.updateTicket({ ticketId: req.params.id, ...req.body, handlerId: req.user.id, req });
  res.json({ message: 'Ticket actualizado', ticket });
});

module.exports = { dashboard, map, driverDetail, requestDetail, manualAssign, cancelService, createTicket, listTickets, updateTicket };
