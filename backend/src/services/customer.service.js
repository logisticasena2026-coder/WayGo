// ============================================================
// WayGo - Servicio de clientes (perfil y acumulados)
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');

async function getCustomerProfile(userId) {
  const customer = await prisma.customerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          profile: { select: { firstName: true, lastName: true, phone: true, photoUrl: true, city: true } },
        },
      },
    },
  });
  if (!customer) throw ApiError.notFound('Perfil de cliente no encontrado');
  return customer;
}

module.exports = { getCustomerProfile };
