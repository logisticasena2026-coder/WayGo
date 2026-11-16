// ============================================================
// WayGo - Controlador de contratos mensuales
// ============================================================
const contractService = require('../services/contract.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const contract = await contractService.createContract(req.user.id, req.body, req);
  res.status(201).json({ message: `Contrato #${contract.contractNumber} creado`, contract });
});

const list = catchAsync(async (req, res) => {
  const contracts = await contractService.listContracts(req.user, { status: req.query.status });
  res.json({ contracts });
});

const getOne = catchAsync(async (req, res) => {
  const contract = await contractService.getContract(req.params.id, req.user);
  res.json({ contract });
});

const assignDriver = catchAsync(async (req, res) => {
  const contract = await contractService.assignDriver(req.params.id, req.body.driverId, req.user, req);
  res.json({ message: 'Conductor asignado al contrato', contract });
});

const changeStatus = catchAsync(async (req, res) => {
  const contract = await contractService.changeStatus(req.params.id, req.body.status, req.user, req);
  res.json({ message: `Contrato ${req.body.status}`, contract });
});

const generate = catchAsync(async (req, res) => {
  const count = await contractService.generateExecutions(req.params.id, req.user, req);
  res.json({ message: `${count} ejecuciones generadas`, count });
});

module.exports = { create, list, getOne, assignDriver, changeStatus, generate };
