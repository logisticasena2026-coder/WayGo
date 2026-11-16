// ============================================================
// WayGo - Servicio de solicitudes de servicio
// Crear, publicar, retirar, listar (cliente/conductor), expirar
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');
const { colombiaToUtc, todayColombia } = require('../utils/datetime');
const { emitToDrivers } = require('./notification.service');

const OPEN_STATUSES = ['PUBLISHED', 'RECEIVING_OFFERS'];

const baseInclude = {
  serviceType: { select: { code: true, name: true } },
  customer: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
};

// ------------------------------------------------------------
// Crear (borrador)
// ------------------------------------------------------------
async function createRequest(customerId, data, req) {
  const serviceType = await prisma.serviceType.findUnique({ where: { code: data.serviceType } });
  if (!serviceType) throw ApiError.badRequest('Tipo de servicio invalido');

  const scheduledAtUtc = colombiaToUtc(data.scheduledDate, data.scheduledTime);

  const request = await prisma.serviceRequest.create({
    data: {
      customerId,
      serviceTypeId: serviceType.id,
      pickupAddress: data.pickupAddress,
      pickupLat: data.pickupLat !== undefined && data.pickupLat !== '' ? Number(data.pickupLat) : null,
      pickupLng: data.pickupLng !== undefined && data.pickupLng !== '' ? Number(data.pickupLng) : null,
      dropoffAddress: data.dropoffAddress,
      dropoffLat: data.dropoffLat !== undefined && data.dropoffLat !== '' ? Number(data.dropoffLat) : null,
      dropoffLng: data.dropoffLng !== undefined && data.dropoffLng !== '' ? Number(data.dropoffLng) : null,
      scheduledDate: new Date(data.scheduledDate),
      scheduledTime: data.scheduledTime,
      scheduledAtUtc,
      passengerCount: data.passengerCount ? Number(data.passengerCount) : null,
      observations: data.observations || null,
      proposedPrice: data.proposedPrice,
      status: 'DRAFT',
    },
  });

  await prisma.serviceEvent.create({
    data: { requestId: request.id, actorId: customerId, type: 'CREATED' },
  });
  await audit({ actorId: customerId, action: 'REQUEST_CREATED', entity: 'ServiceRequest', entityId: request.id, req });

  return request;
}

// ------------------------------------------------------------
// Actualizar borrador
// ------------------------------------------------------------
async function updateRequest(customerId, requestId, data, req) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request || request.customerId !== customerId) throw ApiError.notFound('Solicitud no encontrada');
  if (request.status !== 'DRAFT') throw ApiError.conflict('Solo se puede editar una solicitud en borrador', 'REQUEST_NOT_EDITABLE');

  const update = {};
  for (const key of ['pickupAddress', 'dropoffAddress', 'observations', 'pickupLat', 'pickupLng', 'dropoffLat', 'dropoffLng']) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  if (data.passengerCount !== undefined) update.passengerCount = data.passengerCount ? Number(data.passengerCount) : null;
  if (data.proposedPrice !== undefined) update.proposedPrice = data.proposedPrice;
  if (data.scheduledDate && data.scheduledTime) {
    update.scheduledDate = new Date(data.scheduledDate);
    update.scheduledTime = data.scheduledTime;
    update.scheduledAtUtc = colombiaToUtc(data.scheduledDate, data.scheduledTime);
  }

  const updated = await prisma.serviceRequest.update({ where: { id: requestId }, data: update });
  await audit({ actorId: customerId, action: 'REQUEST_UPDATED', entity: 'ServiceRequest', entityId: requestId, req });
  return updated;
}

// ------------------------------------------------------------
// Publicar (borrador -> publicado, disponible para conductores)
// ------------------------------------------------------------
async function publishRequest(customerId, requestId, req) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request || request.customerId !== customerId) throw ApiError.notFound('Solicitud no encontrada');
  if (request.status !== 'DRAFT') throw ApiError.conflict('La solicitud ya fue publicada', 'REQUEST_NOT_PUBLISHABLE');

  const now = new Date();
  if (request.scheduledAtUtc <= now) throw ApiError.badRequest('La fecha y hora del servicio deben ser futuras', 'SCHEDULE_IN_PAST');

  const published = await prisma.$transaction(async (tx) => {
    const r = await tx.serviceRequest.update({
      where: { id: requestId },
      data: { status: 'PUBLISHED', publishedAt: now, expiresAt: request.scheduledAtUtc },
    });
    await tx.serviceEvent.create({ data: { requestId, actorId: customerId, type: 'PUBLISHED' } });
    return r;
  });

  await audit({ actorId: customerId, action: 'REQUEST_PUBLISHED', entity: 'ServiceRequest', entityId: requestId, req });
  emitToDrivers('request:new', {
    id: published.id,
    requestNumber: published.requestNumber,
    pickupAddress: published.pickupAddress,
    dropoffAddress: published.dropoffAddress,
    scheduledDate: published.scheduledDate,
    scheduledTime: published.scheduledTime,
    proposedPrice: Number(published.proposedPrice),
  });

  return published;
}

// ------------------------------------------------------------
// Retirar / cancelar (solo antes de la asignacion)
// ------------------------------------------------------------
async function withdrawRequest(customerId, requestId, { reason }, req) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request || request.customerId !== customerId) throw ApiError.notFound('Solicitud no encontrada');

  if (['ASSIGNED', 'EN_ROUTE', 'IN_SERVICE', 'COMPLETED'].includes(request.status)) {
    throw ApiError.conflict('No puedes retirar una solicitud ya asignada o en curso', 'REQUEST_NOT_WITHDRAWABLE');
  }
  if (['CANCELLED', 'EXPIRED'].includes(request.status)) throw ApiError.conflict('La solicitud ya no esta activa', 'REQUEST_INACTIVE');

  const cancelled = await prisma.$transaction(async (tx) => {
    const r = await tx.serviceRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason || 'Retirada por el cliente' },
    });
    // Bloquea las ofertas pendientes
    await tx.serviceOffer.updateMany({
      where: { requestId, status: { in: ['PENDING', 'ACCEPTED'] } },
      data: { status: 'WITHDRAWN' },
    });
    await tx.serviceEvent.create({ data: { requestId, actorId: customerId, type: 'CANCELLED', payload: { reason } } });
    return r;
  });

  await audit({ actorId: customerId, action: 'REQUEST_CANCELLED', entity: 'ServiceRequest', entityId: requestId, metadata: { reason }, req });
  return cancelled;
}

// ------------------------------------------------------------
// Listados
// ------------------------------------------------------------
async function listMyRequests(customerId, { status } = {}) {
  const where = { customerId };
  if (status) where.status = status;
  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      ...baseInclude,
      offers: {
        include: {
          driver: { select: { id: true, profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
          vehicle: { select: { plate: true, brand: true, model: true, color: true, photoUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      assignment: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return requests;
}

async function getRequest(requestId, userId) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      ...baseInclude,
      offers: {
        include: {
          driver: { select: { id: true, profile: { select: { firstName: true, lastName: true, photoUrl: true } }, driverProfile: { select: { averageRating: true, totalTrips: true } } } },
          vehicle: { select: { plate: true, brand: true, model: true, color: true, photoUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      assignment: { include: { driver: { select: { profile: true } }, vehicle: true } },
    },
  });
  if (!request) throw ApiError.notFound('Solicitud no encontrada');

  const isOwner = request.customerId === userId;
  const isDriver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!isOwner && !isDriver) throw ApiError.forbidden('No tienes acceso a esta solicitud');

  return request;
}

async function listAvailableRequests(driverId) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId: driverId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');
  if (driver.verificationStatus !== 'APPROVED') {
    throw ApiError.forbidden('Debes estar habilitado para ver solicitudes', 'DRIVER_NOT_VERIFIED');
  }

  const now = new Date();
  return prisma.serviceRequest.findMany({
    where: {
      status: { in: OPEN_STATUSES },
      expiresAt: { gt: now },
    },
    include: {
      serviceType: { select: { code: true, name: true } },
      customer: { select: { id: true, profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
      offers: { where: { driverId }, select: { id: true, status: true, price: true } },
    },
    orderBy: { scheduledAtUtc: 'asc' },
  });
}

// ------------------------------------------------------------
// Expirar solicitudes vencidas (se llama por cron)
// ------------------------------------------------------------
async function expireStaleRequests() {
  const now = new Date();
  const expired = await prisma.serviceRequest.updateMany({
    where: { status: { in: OPEN_STATUSES }, expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  // Expira ofertas pendientes de solicitudes expiradas
  if (expired.count > 0) {
    await prisma.serviceOffer.updateMany({
      where: { request: { status: 'EXPIRED' }, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
  }
  return expired.count;
}

module.exports = {
  createRequest,
  updateRequest,
  publishRequest,
  withdrawRequest,
  listMyRequests,
  getRequest,
  listAvailableRequests,
  expireStaleRequests,
  OPEN_STATUSES,
};
