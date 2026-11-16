// ============================================================
// WayGo - Servicio de evaluaciones (bidireccional, sin duplicados)
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');
const { notifyUser } = require('./notification.service');

async function recomputeDriverAverage(driverUserId) {
  const agg = await prisma.review.aggregate({
    where: { revieweeId: driverUserId, type: { in: ['CUSTOMER_TO_DRIVER', 'CUSTOMER_VEHICLE_SERVICE'] } },
    _avg: { overall: true },
  });
  await prisma.driverProfile.update({
    where: { userId: driverUserId },
    data: { averageRating: agg._avg.overall ? Number(agg._avg.overall.toFixed(2)) : null },
  });
}

async function recomputeCustomerAverage(customerUserId) {
  const agg = await prisma.review.aggregate({
    where: { revieweeId: customerUserId, type: 'DRIVER_TO_CUSTOMER' },
    _avg: { overall: true },
  });
  await prisma.customerProfile.update({
    where: { userId: customerUserId },
    data: { averageRatingReceived: agg._avg.overall ? Number(agg._avg.overall.toFixed(2)) : null },
  });
}

async function createReview(reviewerId, { requestId, type, comment, scores }, req) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId }, include: { assignment: true } });
  if (!request) throw ApiError.notFound('Solicitud no encontrada');
  if (request.status !== 'COMPLETED') throw ApiError.badRequest('Solo se pueden evaluar servicios completados', 'REQUEST_NOT_COMPLETED');

  const isCustomer = request.customerId === reviewerId;
  const isDriver = request.assignment?.driverId === reviewerId;
  if (!isCustomer && !isDriver) throw ApiError.forbidden('No participaste en este servicio', 'NOT_PARTICIPANT');

  let revieweeId;
  if (isCustomer) {
    if (!['CUSTOMER_TO_DRIVER', 'CUSTOMER_VEHICLE_SERVICE'].includes(type)) {
      throw ApiError.badRequest('El cliente solo puede evaluar al conductor o al vehiculo/servicio', 'INVALID_REVIEW_TYPE');
    }
    revieweeId = request.assignment.driverId;
  } else {
    if (type !== 'DRIVER_TO_CUSTOMER') throw ApiError.badRequest('El conductor solo puede evaluar al cliente', 'INVALID_REVIEW_TYPE');
    revieweeId = request.customerId;
  }

  // Validar criterios que aplican al tipo
  const criteria = await prisma.reviewCriteria.findMany({ where: { appliesTo: type, isActive: true } });
  const criteriaIds = new Set(criteria.map((c) => c.id));
  for (const s of scores) {
    if (!criteriaIds.has(s.criteriaId)) throw ApiError.badRequest(`El criterio ${s.criteriaId} no aplica a este tipo de evaluacion`, 'INVALID_CRITERIA');
  }

  const overall = Number((scores.reduce((a, s) => a + s.score, 0) / scores.length).toFixed(2));

  try {
    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: { requestId, reviewerId, revieweeId, type, overall, comment: comment || null },
      });
      for (const s of scores) {
        await tx.reviewScore.create({ data: { reviewId: r.id, criteriaId: s.criteriaId, score: s.score } });
      }
      return r;
    });

    // Recalcular promedios
    if (isCustomer) await recomputeDriverAverage(revieweeId);
    else await recomputeCustomerAverage(revieweeId);

    await audit({ actorId: reviewerId, action: 'REVIEW_CREATED', entity: 'Review', entityId: review.id, metadata: { type, overall }, req });

    notifyUser({
      userId: revieweeId,
      type: 'REVIEW_RECEIVED',
      title: 'Nueva evaluacion recibida',
      body: `Recibiste una calificacion de ${overall} estrellas.`,
      data: { reviewId: review.id, requestId },
    });

    return { ...review, overall: Number(review.overall) };
  } catch (e) {
    if (e.code === 'P2002') throw ApiError.conflict('Ya evaluaste este servicio con este tipo de evaluacion', 'DUPLICATE_REVIEW');
    throw e;
  }
}

async function listMyReviews(userId) {
  const [authored, received] = await Promise.all([
    prisma.review.findMany({
      where: { reviewerId: userId },
      include: { request: { select: { requestNumber: true } }, scores: { include: { criteria: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.findMany({
      where: { revieweeId: userId },
      include: { request: { select: { requestNumber: true } }, reviewer: { select: { profile: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { authored, received };
}

async function getDriverSummary(driverUserId) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
  if (!driver) throw ApiError.notFound('Conductor no encontrado');

  const [reviewCount, criteriaAgg] = await Promise.all([
    prisma.review.count({ where: { revieweeId: driverUserId, type: { in: ['CUSTOMER_TO_DRIVER', 'CUSTOMER_VEHICLE_SERVICE'] } } }),
    prisma.reviewScore.groupBy({ by: ['criteriaId'], where: { review: { revieweeId: driverUserId } }, _avg: { score: true } }),
  ]);

  const criteria = await prisma.reviewCriteria.findMany({ where: { id: { in: criteriaAgg.map((c) => c.criteriaId) } } });

  return {
    averageRating: driver.averageRating ? Number(driver.averageRating) : null,
    totalTrips: driver.totalTrips,
    reviewCount,
    criteriaAverages: criteriaAgg.map((c) => ({
      code: criteria.find((x) => x.id === c.criteriaId)?.code,
      name: criteria.find((x) => x.id === c.criteriaId)?.name,
      average: Number(c._avg.score.toFixed(2)),
    })),
  };
}

module.exports = { createReview, listMyReviews, getDriverSummary };
