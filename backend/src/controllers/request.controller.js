// ============================================================
// WayGo - Controlador de solicitudes de servicio
// ============================================================
const requestService = require('../services/request.service');
const offerService = require('../services/offer.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const request = await requestService.createRequest(req.user.id, req.body, req);
  res.status(201).json({ message: 'Solicitud creada en borrador', request });
});

const update = catchAsync(async (req, res) => {
  const request = await requestService.updateRequest(req.user.id, req.params.id, req.body, req);
  res.json({ message: 'Solicitud actualizada', request });
});

const publish = catchAsync(async (req, res) => {
  const request = await requestService.publishRequest(req.user.id, req.params.id, req);
  res.json({ message: `Solicitud #${request.requestNumber} publicada`, request });
});

const withdraw = catchAsync(async (req, res) => {
  await requestService.withdrawRequest(req.user.id, req.params.id, req.body, req);
  res.json({ message: 'Solicitud retirada' });
});

const listMy = catchAsync(async (req, res) => {
  const requests = await requestService.listMyRequests(req.user.id, { status: req.query.status });
  res.json({ requests });
});

const getOne = catchAsync(async (req, res) => {
  const request = await requestService.getRequest(req.params.id, req.user.id);
  res.json({ request });
});

const listAvailable = catchAsync(async (req, res) => {
  const requests = await requestService.listAvailableRequests(req.user.id);
  res.json({ requests });
});

const createOffer = catchAsync(async (req, res) => {
  const offer = await offerService.createOffer(req.user.id, req.params.id, req.body, req);
  res.status(201).json({ message: offer.isCounteroffer ? 'Contraoferta enviada' : 'Oferta enviada', offer });
});

const listOffers = catchAsync(async (req, res) => {
  const request = await requestService.getRequest(req.params.id, req.user.id);
  res.json({ offers: request.offers });
});

const acceptOffer = catchAsync(async (req, res) => {
  const result = await offerService.acceptOffer(req.user.id, req.params.id, req.params.offerId, req);
  res.json({ message: `Servicio asignado (solicitud #${result.requestNumber})`, assignment: result.assignment });
});

module.exports = { create, update, publish, withdraw, listMy, getOne, listAvailable, createOffer, listOffers, acceptOffer };
