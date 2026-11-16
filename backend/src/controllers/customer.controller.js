// ============================================================
// WayGo - Controlador de clientes
// ============================================================
const customerService = require('../services/customer.service');
const catchAsync = require('../utils/catchAsync');

const getMe = catchAsync(async (req, res) => {
  const customer = await customerService.getCustomerProfile(req.user.id);
  res.json({ customer });
});

module.exports = { getMe };
