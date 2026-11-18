// ============================================================
// WayGo - Servicio de asignaciones y seguimiento del viaje
// Conductor confirma llegada, inicia y finaliza el servicio.
// Al finalizar se actualizan acumulados y se crea el pago.
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');
const { notifyUser } = require('./notification.service');

async function getActiveAssignment(driverId) {
  return prisma.serviceAssignment.findFirst({
    where: { driverId, status: { in: ['ASSIGNED', 'DRIVER_EN_ROUTE', 'IN_SERVICE'] } },
    include: { request: true, vehicle: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function getActiveForCustomer(customerId) {
  const assignment = await prisma.serviceAssignment.findFirst({
    where: { status: { in: ['ASSIGNED', 'DRIVER_EN_ROUTE', 'IN_SERVICE'] }, request: { customerId } },
    include: {
      request: true,
      vehicle: true,
      driver: { select: { id: true, profile: { select: { firstName: true, lastName: true, photoUrl: true, phone: true } }, driverProfile: { select: { averageRating: true, totalTrips: true, lastLat: true, lastLng: true, lastLocationAt: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (assignment) {
    const tracking = await prisma.serviceTracking.findMany({
      where: { requestId: assignment.requestId },
      orderBy: { recordedAt: 'asc' },
    });
    assignment.tracking = tracking;
  }
  return assignment;
}

/** Obtiene el recorrido registrado de un servicio (puntos GPS) */
async function getTracking(userId, requestId) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound('Solicitud no encontrada');

  const isOwner = request.customerId === userId;
  const isDriver = await prisma.serviceAssignment.findFirst({ where: { requestId, driverId: userId } });
  const isStaff = await prisma.user.findUnique({ where: { id: userId }, select: { role: { select: { name: true } } } });
  const allowed = isOwner || !!isDriver || ['ADMIN', 'CALL_CENTER'].includes(isStaff?.role?.name);
  if (!allowed) throw ApiError.forbidden('No tienes acceso al recorrido de este servicio');

  return prisma.serviceTracking.findMany({ where: { requestId }, orderBy: { recordedAt: 'asc' } });
}

async function assertDriverAssignment(driverId, assignmentId) {
  const a = await prisma.serviceAssignment.findUnique({ where: { id: assignmentId }, include: { request: true } });
  if (!a || a.driverId !== driverId) throw ApiError.notFound('Asignacion no encontrada');
  return a;
}

// ------------------------------------------------------------
// Conductor en camino
// ------------------------------------------------------------
async function driverArrived(driverId, assignmentId, req) {
  const a = await assertDriverAssignment(driverId, assignmentId);
  if (a.status !== 'ASSIGNED') throw ApiError.conflict('No se puede marcar llegada en este estado', 'INVALID_TRANSITION');

  const updated = await prisma.$transaction(async (tx) => {
    const asg = await tx.serviceAssignment.update({
      where: { id: assignmentId },
      data: { status: 'DRIVER_EN_ROUTE', driverArrivedAt: new Date() },
    });
    await tx.serviceRequest.update({ where: { id: a.requestId }, data: { status: 'EN_ROUTE' } });
    await tx.serviceEvent.create({ data: { requestId: a.requestId, actorId: driverId, type: 'DRIVER_EN_ROUTE' } });
    return asg;
  });

  await audit({ actorId: driverId, action: 'DRIVER_EN_ROUTE', entity: 'ServiceAssignment', entityId: assignmentId, req });
  notifyUser({ userId: a.request.customerId, type: 'DRIVER_EN_ROUTE', title: 'Conductor en camino', body: `Tu conductor va en camino para la solicitud #${a.request.requestNumber}.`, data: { requestId: a.requestId } });
  return updated;
}

// ------------------------------------------------------------
// Iniciar servicio
// ------------------------------------------------------------
async function startService(driverId, assignmentId, req) {
  const a = await assertDriverAssignment(driverId, assignmentId);
  if (!['ASSIGNED', 'DRIVER_EN_ROUTE'].includes(a.status)) throw ApiError.conflict('No se puede iniciar en este estado', 'INVALID_TRANSITION');

  const updated = await prisma.$transaction(async (tx) => {
    const asg = await tx.serviceAssignment.update({ where: { id: assignmentId }, data: { status: 'IN_SERVICE', startedAt: new Date() } });
    await tx.serviceRequest.update({ where: { id: a.requestId }, data: { status: 'IN_SERVICE' } });
    await tx.serviceEvent.create({ data: { requestId: a.requestId, actorId: driverId, type: 'SERVICE_STARTED' } });
    return asg;
  });

  await audit({ actorId: driverId, action: 'SERVICE_STARTED', entity: 'ServiceAssignment', entityId: assignmentId, req });
  notifyUser({ userId: a.request.customerId, type: 'SERVICE_STARTED', title: 'Servicio iniciado', body: `Tu servicio #${a.request.requestNumber} ha iniciado.`, data: { requestId: a.requestId } });
  return updated;
}

// ------------------------------------------------------------
// Finalizar servicio (registra kilometros y acumulados)
// ------------------------------------------------------------
async function completeService(driverId, assignmentId, { actualKm }, req) {
  const a = await assertDriverAssignment(driverId, assignmentId);
  if (a.status !== 'IN_SERVICE') throw ApiError.conflict('El servicio debe estar en curso para finalizar', 'INVALID_TRANSITION');

  const km = actualKm ? Number(actualKm) : 0;

  const completed = await prisma.$transaction(async (tx) => {
    const asg = await tx.serviceAssignment.update({
      where: { id: assignmentId },
      data: { status: 'COMPLETED', completedAt: new Date(), actualKm: km },
    });
    await tx.serviceRequest.update({ where: { id: a.requestId }, data: { status: 'COMPLETED' } });

    // Conductor: disponible de nuevo + acumulados
    await tx.driverProfile.update({
      where: { userId: driverId },
      data: {
        operationalStatus: 'AVAILABLE',
        totalTrips: { increment: 1 },
        totalKm: { increment: km },
        totalEarnings: { increment: Number(a.agreedPrice) },
        completedCount: { increment: 1 },
      },
    });

    // Cliente: acumulados
    await tx.customerProfile.update({
      where: { userId: a.request.customerId },
      data: { totalTrips: { increment: 1 }, totalKm: { increment: km }, totalSpent: { increment: Number(a.agreedPrice) } },
    });

    // Registro de pago
    await tx.paymentRecord.create({
      data: { requestId: a.requestId, customerId: a.request.customerId, driverId, amount: a.agreedPrice, status: 'PAID', method: 'CASH', paidAt: new Date() },
    });

    // Si el servicio proviene de un contrato, actualiza los km del contrato
    const exec = await tx.contractExecution.findUnique({ where: { requestId: a.requestId } });
    if (exec) {
      await tx.contractExecution.update({ where: { id: exec.id }, data: { status: 'COMPLETED' } });
      await tx.monthlyContract.update({ where: { id: exec.contractId }, data: { kmUsed: { increment: km } } });
    }

    await tx.serviceEvent.create({ data: { requestId: a.requestId, actorId: driverId, type: 'SERVICE_COMPLETED', payload: { km } } });
    return asg;
  });

  await audit({ actorId: driverId, action: 'SERVICE_COMPLETED', entity: 'ServiceAssignment', entityId: assignmentId, metadata: { km, price: Number(a.agreedPrice) }, req });
  notifyUser({ userId: a.request.customerId, type: 'SERVICE_COMPLETED', title: 'Servicio completado', body: `Tu servicio #${a.request.requestNumber} finalizo. ¡No olvides calificarlo!`, data: { requestId: a.requestId } });

  return completed;
}

module.exports = { getActiveAssignment, getActiveForCustomer, getTracking, driverArrived, startService, completeService };
