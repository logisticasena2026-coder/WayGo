// ============================================================
// WayGo - Servicio de ofertas y negociacion
// Ofertar (aceptar precio o contraofertar), retirar, y aceptacion
// transaccional por el cliente (asignacion unica).
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');
const { notifyUser } = require('./notification.service');
const { OPEN_STATUSES } = require('./request.service');

// ------------------------------------------------------------
// Crear / actualizar oferta (aceptar precio propuesto o contraofertar)
// ------------------------------------------------------------
async function createOffer(driverId, requestId, { vehicleId, price, etaMinutes, message }, req) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId: driverId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');
  if (driver.verificationStatus !== 'APPROVED') throw ApiError.forbidden('Debes estar habilitado para ofertar', 'DRIVER_NOT_VERIFIED');

  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound('Solicitud no encontrada');
  if (!OPEN_STATUSES.includes(request.status)) throw ApiError.conflict('La solicitud ya no recibe ofertas', 'REQUEST_CLOSED');
  if (request.customerId === driverId) throw ApiError.conflict('No puedes ofertar a tu propia solicitud', 'SELF_OFFER');

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.driverId !== driver.id) throw ApiError.conflict('El vehiculo no te pertenece', 'VEHICLE_NOT_OWNED');
  if (!vehicle.isActive) throw ApiError.conflict('El vehiculo esta inactivo', 'VEHICLE_INACTIVE');

  const isCounteroffer = Number(price) !== Number(request.proposedPrice);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.serviceOffer.findFirst({ where: { requestId, driverId } });

    let offer;
    if (existing) {
      if (!['PENDING'].includes(existing.status)) {
        throw ApiError.conflict('Tu oferta ya fue procesada y no se puede modificar', 'OFFER_NOT_EDITABLE');
      }
      offer = await tx.serviceOffer.update({
        where: { id: existing.id },
        data: { vehicleId, price, isCounteroffer, etaMinutes: etaMinutes || null, message: message || null },
      });
    } else {
      offer = await tx.serviceOffer.create({
        data: {
          requestId, driverId, vehicleId, price, isCounteroffer,
          etaMinutes: etaMinutes || null, message: message || null,
        },
      });
    }

    // Si la solicitud estaba PUBLICADA, pasa a RECIBIENDO_OFERTAS
    if (request.status === 'PUBLISHED') {
      await tx.serviceRequest.update({ where: { id: requestId }, data: { status: 'RECEIVING_OFFERS' } });
    }
    await tx.serviceEvent.create({
      data: { requestId, actorId: driverId, type: isCounteroffer ? 'COUNTEROFFER_RECEIVED' : 'OFFER_RECEIVED', payload: { price: Number(price), offerId: offer.id } },
    });
    return { offer, existed: !!existing };
  });

  await audit({ actorId: driverId, action: 'OFFER_CREATED', entity: 'ServiceOffer', entityId: result.offer.id, metadata: { requestId, price: Number(price), counteroffer: isCounteroffer }, req });

  notifyUser({
    userId: request.customerId,
    type: isCounteroffer ? 'COUNTEROFFER' : 'NEW_OFFER',
    title: isCounteroffer ? 'Nueva contraoferta recibida' : 'Nueva oferta recibida',
    body: `Un conductor oferta $${Number(price).toLocaleString('es-CO')} para tu solicitud #${request.requestNumber}.`,
    data: { requestId },
  });

  return result.offer;
}

// ------------------------------------------------------------
// Listar ofertas de un conductor
// ------------------------------------------------------------
async function listMyOffers(driverId) {
  return prisma.serviceOffer.findMany({
    where: { driverId },
    include: {
      request: {
        select: {
          id: true, requestNumber: true, pickupAddress: true, dropoffAddress: true,
          scheduledDate: true, scheduledTime: true, proposedPrice: true, status: true,
        },
      },
      vehicle: { select: { plate: true, brand: true, model: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ------------------------------------------------------------
// Retirar una oferta
// ------------------------------------------------------------
async function withdrawOffer(driverId, offerId, req) {
  const offer = await prisma.serviceOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.driverId !== driverId) throw ApiError.notFound('Oferta no encontrada');
  if (offer.status !== 'PENDING') throw ApiError.conflict('La oferta ya no se puede retirar', 'OFFER_NOT_WITHDRAWABLE');

  const withdrawn = await prisma.$transaction(async (tx) => {
    const o = await tx.serviceOffer.update({ where: { id: offerId }, data: { status: 'WITHDRAWN' } });
    await tx.serviceEvent.create({ data: { requestId: offer.requestId, actorId: driverId, type: 'OFFER_WITHDRAWN', payload: { offerId } } });
    return o;
  });

  await audit({ actorId: driverId, action: 'OFFER_WITHDRAWN', entity: 'ServiceOffer', entityId: offerId, req });

  const request = await prisma.serviceRequest.findUnique({ where: { id: offer.requestId } });
  if (request?.customerId) {
    notifyUser({
      userId: request.customerId,
      type: 'OFFER_WITHDRAWN',
      title: 'Oferta retirada',
      body: `Un conductor retiro su oferta de la solicitud #${request.requestNumber}.`,
      data: { requestId: request.id },
    });
  }

  return withdrawn;
}

// ------------------------------------------------------------
// Aceptar una oferta (transaccional: asignacion unica)
// ------------------------------------------------------------
async function acceptOffer(customerId, requestId, offerId, req) {
  // Transaccion serializable: evita que dos conductores obtengan el servicio
  const assignment = await prisma.$transaction(async (tx) => {
    const offer = await tx.serviceOffer.findUnique({
      where: { id: offerId },
      include: { request: true, vehicle: true },
    });
    if (!offer || offer.requestId !== requestId) throw ApiError.notFound('Oferta no encontrada');
    if (offer.request.customerId !== customerId) throw ApiError.forbidden('No puedes aceptar ofertas de otra solicitud', 'NOT_REQUEST_OWNER');
    if (offer.status !== 'PENDING') throw ApiError.conflict('Esta oferta ya no esta disponible', 'OFFER_NOT_ACCEPTABLE');
    if (!OPEN_STATUSES.includes(offer.request.status)) throw ApiError.conflict('La solicitud ya no esta abierta', 'REQUEST_CLOSED');

    // Asignacion unica: la restriccion @unique(requestId) protege ante carreras.
    // Si dos aceptaciones concurrentes llegan aqui, una fallara con P2002.
    let created;
    try {
      created = await tx.serviceAssignment.create({
        data: {
          requestId,
          offerId: offer.id,
          driverId: offer.driverId,
          vehicleId: offer.vehicleId,
          agreedPrice: offer.price,
          status: 'ASSIGNED',
        },
      });
    } catch (e) {
      if (e.code === 'P2002') throw ApiError.conflict('El servicio ya fue asignado a otro conductor', 'ALREADY_ASSIGNED');
      throw e;
    }

    await tx.serviceOffer.update({ where: { id: offer.id }, data: { status: 'ACCEPTED' } });
    // Bloquea el resto de ofertas
    await tx.serviceOffer.updateMany({
      where: { requestId, id: { not: offer.id }, status: 'PENDING' },
      data: { status: 'BLOCKED' },
    });
    await tx.serviceRequest.update({ where: { id: requestId }, data: { status: 'ASSIGNED', finalPrice: offer.price } });
    await tx.driverProfile.update({ where: { userId: offer.driverId }, data: { operationalStatus: 'BUSY' } });
    await tx.serviceEvent.create({ data: { requestId, actorId: customerId, type: 'OFFER_ACCEPTED', payload: { offerId, driverId: offer.driverId, price: Number(offer.price) } } });

    return created;
  });

  await audit({ actorId: customerId, action: 'OFFER_ACCEPTED', entity: 'ServiceAssignment', entityId: assignment.id, metadata: { requestId, driverId: assignment.driverId }, req });

  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });

  // Notifica al conductor asignado
  notifyUser({
    userId: assignment.driverId,
    type: 'OFFER_ACCEPTED',
    title: '¡Oferta aceptada!',
    body: `Tu oferta fue aceptada para la solicitud #${request.requestNumber}.`,
    data: { requestId },
  });

  return { assignment, requestNumber: request?.requestNumber };
}

module.exports = { createOffer, listMyOffers, withdrawOffer, acceptOffer };
