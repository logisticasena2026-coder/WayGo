// ============================================================
// WayGo - Servicio de estadisticas
// ============================================================
const prisma = require('../utils/prisma');

function monthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function fillMonthlySeries(months = 6) {
  const series = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    series.push({ month: monthKey(d), count: 0 });
  }
  return series;
}

function applyMonthly(series, items, keyFn) {
  const map = new Map(series.map((s) => [s.month, s]));
  for (const item of items) {
    const k = monthKey(keyFn(item));
    if (map.has(k)) map.get(k).count += 1;
  }
  return series;
}

// ------------------------------------------------------------
async function getGeneral() {
  const since = new Date(Date.now() - 180 * 86400000);

  const [
    totalCustomers, totalDrivers, activeUsers,
    totalRequests, completedTrips, cancelledServices, pendingServices,
    totalRevenue, avgDriverRating, completedByMonth, cancelledByMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { name: 'CUSTOMER' }, status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: { name: 'DRIVER' }, status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: 'COMPLETED' } }),
    prisma.serviceRequest.count({ where: { status: 'CANCELLED' } }),
    prisma.serviceRequest.count({ where: { status: { in: ['PUBLISHED', 'RECEIVING_OFFERS', 'ASSIGNED', 'EN_ROUTE', 'IN_SERVICE'] } } }),
    prisma.paymentRecord.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.driverProfile.aggregate({ _avg: { averageRating: true } }),
    prisma.serviceRequest.findMany({ where: { status: 'COMPLETED', updatedAt: { gte: since } }, select: { updatedAt: true } }),
    prisma.serviceRequest.findMany({ where: { status: 'CANCELLED', updatedAt: { gte: since } }, select: { updatedAt: true } }),
  ]);

  const series = fillMonthlySeries(6);
  return {
    summary: {
      totalCustomers, totalDrivers, activeUsers,
      totalRequests, completedTrips, cancelledServices, pendingServices,
      totalRevenue: totalRevenue._sum.amount ? Number(totalRevenue._sum.amount) : 0,
      avgDriverRating: avgDriverRating._avg.averageRating ? Number(avgDriverRating._avg.averageRating.toFixed(2)) : null,
    },
    servicesByMonth: applyMonthly(series, completedByMonth, (r) => r.updatedAt),
    cancelledByMonth: applyMonthly(series.map((s) => ({ ...s })), cancelledByMonth, (r) => r.updatedAt),
  };
}

async function getDriverStats(userId) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) return null;

  const since = new Date(Date.now() - 180 * 86400000);
  const completed = await prisma.serviceRequest.findMany({
    where: { assignment: { driverId: userId }, status: 'COMPLETED', updatedAt: { gte: since } },
    select: { updatedAt: true },
  });
  const reviews = await prisma.review.count({ where: { revieweeId: userId } });

  const completionRate = driver.totalTrips + driver.cancelledCount > 0
    ? Math.round((driver.completedCount / (driver.completedCount + driver.cancelledCount)) * 100)
    : 0;

  return {
    totalTrips: driver.totalTrips,
    totalKm: Number(driver.totalKm),
    totalEarnings: Number(driver.totalEarnings),
    averageRating: driver.averageRating ? Number(driver.averageRating) : null,
    completedCount: driver.completedCount,
    cancelledCount: driver.cancelledCount,
    completionRate,
    reviewCount: reviews,
    servicesByMonth: applyMonthly(fillMonthlySeries(6), completed, (r) => r.updatedAt),
  };
}

async function getCustomerStats(userId) {
  const customer = await prisma.customerProfile.findUnique({ where: { userId } });
  if (!customer) return null;

  const since = new Date(Date.now() - 180 * 86400000);
  const completed = await prisma.serviceRequest.findMany({
    where: { customerId: userId, status: 'COMPLETED', updatedAt: { gte: since } },
    select: { updatedAt: true },
  });
  const totalRequests = await prisma.serviceRequest.count({ where: { customerId: userId } });
  const monthlyContracts = await prisma.monthlyContract.count({ where: { customerId: userId } });
  const ratingsGiven = await prisma.review.count({ where: { reviewerId: userId } });

  return {
    totalRequests,
    completedTrips: customer.totalTrips,
    totalKm: Number(customer.totalKm),
    totalSpent: Number(customer.totalSpent),
    monthlyContracts,
    ratingsGiven,
    servicesByMonth: applyMonthly(fillMonthlySeries(6), completed, (r) => r.updatedAt),
  };
}

async function getPackageStats() {
  const [total, delivered, pending, incidents, deliveredPackages] = await Promise.all([
    prisma.package.count(),
    prisma.package.count({ where: { status: 'DELIVERED' } }),
    prisma.package.count({ where: { status: { in: ['PENDING', 'PICKED_UP', 'IN_TRANSIT'] } } }),
    prisma.package.count({ where: { status: 'INCIDENT' } }),
    prisma.package.findMany({ where: { status: 'DELIVERED' }, select: { deliveredAt: true, createdAt: true } }),
  ]);

  let avgDeliveryHours = 0;
  if (deliveredPackages.length > 0) {
    const totalH = deliveredPackages.reduce((a, p) => {
      const end = p.deliveredAt || p.createdAt;
      return a + (new Date(end) - new Date(p.createdAt)) / 3600000;
    }, 0);
    avgDeliveryHours = Math.round(totalH / deliveredPackages.length);
  }

  return {
    total, delivered, pending, incidents,
    avgDeliveryHours,
  };
}

module.exports = { getGeneral, getDriverStats, getCustomerStats, getPackageStats };
