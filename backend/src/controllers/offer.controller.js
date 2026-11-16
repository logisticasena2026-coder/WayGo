// ============================================================
// WayGo - Controlador de ofertas (vista del conductor)
// ============================================================
const offerService = require('../services/offer.service');
const catchAsync = require('../utils/catchAsync');

const listMyOffers = catchAsync(async (req, res) => {
  const offers = await offerService.listMyOffers(req.user.id);
  res.json({ offers });
});

const withdraw = catchAsync(async (req, res) => {
  await offerService.withdrawOffer(req.user.id, req.params.id, req);
  res.json({ message: 'Oferta retirada' });
});

module.exports = { listMyOffers, withdraw };
