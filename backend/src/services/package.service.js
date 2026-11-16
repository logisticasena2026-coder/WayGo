// ============================================================
// WayGo - Servicio de paquetes
// Creacion (con solicitud asociada), seguimiento y evidencia
// de entrega por parte del conductor.
// ============================================================
const prisma = require('../utils/prisma');
const crypto = require('crypto');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');
const { colombiaToUtc } = require('../utils/datetime');
const { notifyUser } = require('./notification.service');
const { removeByPublicUrl } = require('../middlewares/upload');

function generateTrackingCode() {
  return 'WG-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function createPackage(customerId, data, req) {
  const serviceType = await prisma.serviceType.findUnique({ where: { code: 'PACKAGE' } });
  if (!serviceType) throw ApiError.internal('Tipo de servicio PACKAGE no sembrado');

  const scheduledAtUtc = colombiaToUtc(data.scheduledDate, data.scheduledTime);

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.create({
      data: {
        customerId,
        serviceTypeId: serviceType.id,
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        scheduledAtUtc,
        observations: data.observations || null,
        proposedPrice: data.proposedPrice,
        status: 'DRAFT',
      },
    });

    const pkg = await tx.package.create({
      data: {
        requestId: request.id,
        trackingCode: generateTrackingCode(),
        senderName: data.senderName,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone || null,
        description: data.description,
        weightKg: data.weightKg ? Number(data.weightKg) : null,
        dimensions: data.dimensions || null,
        declaredValue: data.declaredValue ? Number(data.declaredValue) : null,
      },
    });

    await tx.serviceEvent.create({ data: { requestId: request.id, actorId: customerId, type: 'CREATED' } });
    return { request, package: pkg };
  });

  await audit({ actorId: customerId, action: 'PACKAGE_CREATED', entity: 'Package', entityId: result.package.id, metadata: { trackingCode: result.package.trackingCode }, req });
  return result;
}

async function uploadPackagePhoto(packageId, photoUrl, req) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw ApiError.notFound('Paquete no encontrado');
  const updated = await prisma.package.update({ where: { id: packageId }, data: { photoUrl } });
  if (pkg.photoUrl && pkg.photoUrl !== photoUrl) removeByPublicUrl(pkg.photoUrl);
  await audit({ actorId: req?.user?.id, action: 'PACKAGE_PHOTO_UPDATED', entity: 'Package', entityId: packageId, req });
  return updated;
}

async function listMyPackages(customerId) {
  return prisma.package.findMany({
    where: { request: { customerId } },
    include: {
      request: { select: { id: true, requestNumber: true, status: true, pickupAddress: true, dropoffAddress: true, scheduledDate: true, scheduledTime: true, proposedPrice: true } },
      evidence: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function listDriverPackages(driverId) {
  return prisma.package.findMany({
    where: { request: { assignment: { driverId } } },
    include: {
      request: { select: { id: true, requestNumber: true, status: true, pickupAddress: true, dropoffAddress: true, scheduledDate: true, scheduledTime: true, proposedPrice: true, customer: { select: { profile: { select: { firstName: true, lastName: true, phone: true } } } } } },
      evidence: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getPackage(packageId, userId) {
  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: {
      request: { select: { id: true, requestNumber: true, status: true, pickupAddress: true, dropoffAddress: true, scheduledDate: true, scheduledTime: true, proposedPrice: true, customerId: true, assignment: { select: { driverId: true } } } },
      evidence: true,
    },
  });
  if (!pkg) throw ApiError.notFound('Paquete no encontrado');
  const isOwner = pkg.request.customerId === userId;
  const isDriver = pkg.request.assignment?.driverId === userId;
  if (!isOwner && !isDriver) throw ApiError.forbidden('No tienes acceso a este paquete');
  return pkg;
}

async function getByTrackingCode(code) {
  const pkg = await prisma.package.findUnique({
    where: { trackingCode: code.toUpperCase() },
    include: { request: { select: { status: true, pickupAddress: true, dropoffAddress: true, scheduledDate: true } }, evidence: true },
  });
  if (!pkg) throw ApiError.notFound('No se encontro un paquete con ese codigo de seguimiento');
  return pkg;
}

async function assertDriverAssigned(driverId, packageId) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId }, include: { request: { include: { assignment: true } } } });
  if (!pkg) throw ApiError.notFound('Paquete no encontrado');
  if (!pkg.request.assignment || pkg.request.assignment.driverId !== driverId) throw ApiError.forbidden('No estas asignado a este paquete', 'NOT_ASSIGNED');
  return pkg;
}

async function updateStatus(driverId, packageId, status, req) {
  const pkg = await assertDriverAssigned(driverId, packageId);

  const transitions = {
    PICKED_UP: { from: ['PENDING'], field: 'pickedUpAt', event: 'PACKAGE_PICKED_UP' },
    IN_TRANSIT: { from: ['PICKED_UP'], field: null, event: 'PACKAGE_IN_TRANSIT' },
    INCIDENT: { from: ['PENDING', 'PICKED_UP', 'IN_TRANSIT'], field: null, event: 'PACKAGE_INCIDENT' },
  };
  const t = transitions[status];
  if (!t) throw ApiError.badRequest('Estado no valido');
  if (!t.from.includes(pkg.status)) throw ApiError.conflict(`No puedes pasar de ${pkg.status} a ${status}`, 'INVALID_TRANSITION');

  const updateData = { status };
  if (t.field) updateData[t.field] = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.package.update({ where: { id: packageId }, data: updateData });
    await tx.serviceEvent.create({ data: { requestId: pkg.requestId, actorId: driverId, type: t.event } });
    return p;
  });

  await audit({ actorId: driverId, action: t.event, entity: 'Package', entityId: packageId, req });
  notifyUser({ userId: pkg.request.customerId, type: t.event, title: 'Actualizacion de tu paquete', body: `Tu paquete ${pkg.trackingCode} cambio a ${status}.`, data: { packageId } });
  return updated;
}

async function deliver(driverId, packageId, { receivedBy, receiverDocument, notes, signatureUrl, photoUrl }, req) {
  const pkg = await assertDriverAssigned(driverId, packageId);
  if (!['PICKED_UP', 'IN_TRANSIT'].includes(pkg.status)) throw ApiError.conflict('El paquete no esta en transito', 'INVALID_TRANSITION');

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.package.update({ where: { id: packageId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
    await tx.packageDeliveryEvidence.create({
      data: { packageId, receivedBy, receiverDocument: receiverDocument || null, notes: notes || null, signatureUrl: signatureUrl || null, photoUrl: photoUrl || null },
    });
    await tx.serviceRequest.update({ where: { id: pkg.requestId }, data: { status: 'COMPLETED' } });
    await tx.serviceEvent.create({ data: { requestId: pkg.requestId, actorId: driverId, type: 'PACKAGE_DELIVERED' } });
    return p;
  });

  await audit({ actorId: driverId, action: 'PACKAGE_DELIVERED', entity: 'Package', entityId: packageId, req });
  notifyUser({ userId: pkg.request.customerId, type: 'PACKAGE_DELIVERED', title: 'Paquete entregado', body: `Tu paquete ${pkg.trackingCode} fue entregado a ${receivedBy}.`, data: { packageId } });
  return updated;
}

module.exports = {
  createPackage,
  uploadPackagePhoto,
  listMyPackages,
  listDriverPackages,
  getPackage,
  getByTrackingCode,
  updateStatus,
  deliver,
};
