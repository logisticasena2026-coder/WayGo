// ============================================================
// WayGo - Servicio del call center (centro de operaciones)
// Dashboard, mapa operativo, detalle, asignacion manual,
// cancelacion de servicios y tickets de soporte.
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');
const { getConnectedUserIds, emitToUser } = require('../sockets');
const { notifyUser } = require('./notification.service');

// ------------------------------------------------------------
// Dashboard (conteos)
// ------------------------------------------------------------
async function getDashboard() {
  const connectedIds = new Set(getConnectedUserIds());

  const [customersCount, driversCount, drivers, requestsByStatus, servicesByStatus, openIncidents] = await Promise.all([
    prisma.user.count({ where: { role: { name: 'CUSTOMER' }, status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: { name: 'DRIVER' }, status: 'ACTIVE' } }),
    prisma.driverProfile.findMany({
      where: { verificationStatus: 'APPROVED' },
      select: { userId: true, operationalStatus: true, lastLat: true, lastLng: true, lastLocationAt: true },
    }),
    prisma.serviceRequest.groupBy({ by: ['status'], _count: true }),
    prisma.serviceAssignment.groupBy({ by: ['status'], _count: true }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
  ]);

  const connectedCustomers = await prisma.user.count({
    where: { role: { name: 'CUSTOMER' }, status: 'ACTIVE', id: { in: [...connectedIds] } },
  });
  const connectedDrivers = drivers.filter((d) => connectedIds.has(d.userId)).length;
  const availableDrivers = drivers.filter((d) => d.operationalStatus === 'AVAILABLE').length;
  const busyDrivers = drivers.filter((d) => d.operationalStatus === 'BUSY').length;

  const byStatus = (list, key) => {
    const m = {};
    for (const r of list) m[r[key]] = r._count;
    return m;
  };
  const reqStatus = byStatus(requestsByStatus, 'status');
  const asgStatus = byStatus(servicesByStatus, 'status');

  return {
    connected: { customers: connectedCustomers, drivers: connectedDrivers, available: availableDrivers, busy: busyDrivers },
    requests: {
      total: Object.values(reqStatus).reduce((a, b) => a + b, 0),
      new: (reqStatus.PUBLISHED || 0) + (reqStatus.RECEIVING_OFFERS || 0),
      withoutDriver: (reqStatus.PUBLISHED || 0),
      scheduled: (reqStatus.PUBLISHED || 0) + (reqStatus.RECEIVING_OFFERS || 0) + (reqStatus.ASSIGNED || 0),
    },
    services: {
      inExecution: (asgStatus.ASSIGNED || 0) + (asgStatus.DRIVER_EN_ROUTE || 0) + (asgStatus.IN_SERVICE || 0),
      completed: asgStatus.COMPLETED || 0,
      cancelled: asgStatus.CANCELLED || 0,
    },
    incidents: { open: openIncidents },
    drivers: { total: drivers.length, connected: connectedDrivers, available: availableDrivers, busy: busyDrivers },
    customers: { total: customersCount },
  };
}

// ------------------------------------------------------------
// Mapa operativo
// ------------------------------------------------------------
async function getOperationalMap() {
  const [drivers, requests] = await Promise.all([
    prisma.driverProfile.findMany({
      where: { verificationStatus: 'APPROVED', operationalStatus: { not: 'OFFLINE' }, lastLat: { not: null } },
      include: {
        user: { select: { id: true, profile: { select: { firstName: true, lastName: true, photoUrl: true, phone: true } } } },
        vehicles: { where: { isPrimary: true }, take: 1 },
      },
    }),
    prisma.serviceRequest.findMany({
      where: { status: { in: ['PUBLISHED', 'RECEIVING_OFFERS', 'ASSIGNED', 'EN_ROUTE', 'IN_SERVICE'] } },
      select: {
        id: true, requestNumber: true, status: true,
        pickupAddress: true, pickupLat: true, pickupLng: true,
        dropoffAddress: true, dropoffLat: true, dropoffLng: true,
        proposedPrice: true, scheduledDate: true, scheduledTime: true,
        customer: { select: { id: true, profile: { select: { firstName: true, lastName: true, photoUrl: true } } } },
        assignment: { select: { driverId: true, status: true } },
      },
    }),
  ]);

  return {
    drivers: drivers.map((d) => ({
      userId: d.userId,
      name: `${d.user.profile.firstName} ${d.user.profile.lastName}`,
      photoUrl: d.user.profile.photoUrl,
      phone: d.user.profile.phone,
      operationalStatus: d.operationalStatus,
      lat: d.lastLat, lng: d.lastLng, lastLocationAt: d.lastLocationAt,
      vehicle: d.vehicles[0] ? { plate: d.vehicles[0].plate, brand: d.vehicles[0].brand, model: d.vehicles[0].model } : null,
    })),
    requests: requests.map((r) => ({
      id: r.id, requestNumber: r.requestNumber, status: r.status,
      customer: `${r.customer.profile.firstName} ${r.customer.profile.lastName}`,
      customerPhotoUrl: r.customer.profile.photoUrl,
      pickup: { address: r.pickupAddress, lat: r.pickupLat, lng: r.pickupLng },
      dropoff: { address: r.dropoffAddress, lat: r.dropoffLat, lng: r.dropoffLng },
      proposedPrice: Number(r.proposedPrice),
      scheduledDate: r.scheduledDate, scheduledTime: r.scheduledTime,
      assignedDriverId: r.assignment?.driverId || null,
    })),
  };
}

// ------------------------------------------------------------
// Detalle de conductor (datos autorizados para call center)
// ------------------------------------------------------------
async function getDriverDetail(userId) {
  const driver = await prisma.driverProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { email: true, profile: true } },
      vehicles: { orderBy: { isPrimary: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!driver) throw ApiError.notFound('Conductor no encontrado');
  return driver;
}

// ------------------------------------------------------------
// Detalle de solicitud
// ------------------------------------------------------------
async function getRequestDetail(requestId) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      serviceType: true,
      customer: { select: { id: true, email: true, profile: true } },
      offers: {
        include: {
          driver: { select: { id: true, profile: true, driverProfile: { select: { averageRating: true, totalTrips: true } } } },
          vehicle: true,
        },
      },
      assignment: { include: { driver: { select: { profile: true } }, vehicle: true } },
    },
  });
  if (!request) throw ApiError.notFound('Solicitud no encontrada');
  return request;
}

// ------------------------------------------------------------
// Asignacion manual (con trazabilidad del operador)
// ------------------------------------------------------------
async function manualAssign({ requestId, driverId, vehicleId, price, operatorId, req }) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound('Solicitud no encontrada');
  if (!['PUBLISHED', 'RECEIVING_OFFERS'].includes(request.status)) {
    throw ApiError.conflict('La solicitud no esta abierta para asignacion', 'REQUEST_NOT_OPEN');
  }

  const driver = await prisma.driverProfile.findUnique({ where: { userId: driverId } });
  if (!driver) throw ApiError.notFound('Conductor no encontrado');
  if (driver.verificationStatus !== 'APPROVED') throw ApiError.conflict('El conductor no esta habilitado', 'DRIVER_NOT_VERIFIED');
  if (driver.operationalStatus === 'BUSY') throw ApiError.conflict('El conductor ya tiene un servicio', 'DRIVER_BUSY');

  let vehicle;
  if (vehicleId) {
    vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.driverId !== driver.id || !vehicle.isActive) {
      throw ApiError.conflict('Vehiculo invalido o inactivo', 'VEHICLE_INVALID');
    }
  } else {
    vehicle = await prisma.vehicle.findFirst({ where: { driverId: driver.id, isPrimary: true } });
    if (!vehicle) throw ApiError.conflict('El conductor no tiene vehiculo principal', 'NO_VEHICLE');
  }

  const agreedPrice = price ? Number(price) : Number(request.proposedPrice);

  const assignment = await prisma.$transaction(async (tx) => {
    let a;
    try {
      a = await tx.serviceAssignment.create({
        data: {
          requestId, driverId, vehicleId: vehicle.id, agreedPrice,
          assignedById: operatorId, isManual: true, status: 'ASSIGNED',
        },
      });
    } catch (e) {
      if (e.code === 'P2002') throw ApiError.conflict('El servicio ya fue asignado', 'ALREADY_ASSIGNED');
      throw e;
    }
    await tx.serviceOffer.updateMany({ where: { requestId, status: 'PENDING' }, data: { status: 'BLOCKED' } });
    await tx.serviceRequest.update({ where: { id: requestId }, data: { status: 'ASSIGNED', finalPrice: agreedPrice } });
    await tx.driverProfile.update({ where: { userId: driverId }, data: { operationalStatus: 'BUSY' } });
    await tx.serviceEvent.create({ data: { requestId, actorId: operatorId, type: 'MANUAL_ASSIGNMENT', payload: { driverId, vehicleId: vehicle.id, price: agreedPrice } } });
    return a;
  });

  await audit({ actorId: operatorId, action: 'MANUAL_ASSIGNMENT', entity: 'ServiceAssignment', entityId: assignment.id, metadata: { requestId, driverId }, req });

  notifyUser({ userId: driverId, type: 'REQUEST_ASSIGNED', title: 'Servicio asignado', body: `Te asignaron la solicitud #${request.requestNumber} desde el call center.`, data: { requestId } });
  notifyUser({ userId: request.customerId, type: 'REQUEST_ASSIGNED', title: 'Conductor asignado', body: `Un operador asigno un conductor a tu solicitud #${request.requestNumber}.`, data: { requestId } });

  return assignment;
}

// ------------------------------------------------------------
// Cancelar un servicio (call center)
// ------------------------------------------------------------
async function cancelService({ requestId, reason, operatorId, req }) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound('Solicitud no encontrada');
  if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(request.status)) throw ApiError.conflict('La solicitud no se puede cancelar', 'REQUEST_NOT_CANCELLABLE');

  await prisma.$transaction(async (tx) => {
    await tx.serviceRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason || 'Cancelada por call center' } });
    if (request.assignment) {
      const a = await tx.serviceAssignment.findUnique({ where: { requestId } });
      if (a) {
        await tx.serviceAssignment.update({ where: { id: a.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
        await tx.driverProfile.update({ where: { userId: a.driverId }, data: { operationalStatus: 'AVAILABLE' } });
      }
    }
    await tx.serviceEvent.create({ data: { requestId, actorId: operatorId, type: 'CANCELLED_BY_CALL_CENTER', payload: { reason } } });
  });

  await audit({ actorId: operatorId, action: 'SERVICE_CANCELLED', entity: 'ServiceRequest', entityId: requestId, metadata: { reason }, req });

  if (request.assignment?.driverId) notifyUser({ userId: request.assignment.driverId, type: 'REQUEST_CANCELLED', title: 'Servicio cancelado', body: `El call center cancelo la solicitud #${request.requestNumber}.`, data: { requestId } });
  notifyUser({ userId: request.customerId, type: 'REQUEST_CANCELLED', title: 'Servicio cancelado', body: `Tu solicitud #${request.requestNumber} fue cancelada.`, data: { requestId } });

  return { cancelled: true };
}

// ------------------------------------------------------------
// Tickets de soporte
// ------------------------------------------------------------
async function createTicket({ subject, description, requestId, priority, reporterId, req }) {
  const ticket = await prisma.supportTicket.create({
    data: { subject, description, priority: priority || 'MEDIUM', reporterId, requestId: requestId || null },
  });
  await audit({ actorId: reporterId, action: 'TICKET_CREATED', entity: 'SupportTicket', entityId: ticket.id, req });
  return ticket;
}

async function listTickets({ status, priority, page = 1, pageSize = 20 }) {
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  const [total, items] = await prisma.$transaction([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      include: {
        reporter: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        handler: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        request: { select: { requestNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}

async function updateTicket({ ticketId, status, handlerId, resolution, action, req }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw ApiError.notFound('Ticket no encontrado');

  const update = {};
  if (status) update.status = status;
  if (resolution !== undefined) update.resolution = resolution;
  if (action === 'take') update.handlerId = handlerId;
  if (status === 'RESOLVED' || status === 'CLOSED') update.closedAt = new Date();

  const updated = await prisma.supportTicket.update({ where: { id: ticketId }, data: update });
  await audit({ actorId: handlerId, action: 'TICKET_UPDATED', entity: 'SupportTicket', entityId: ticketId, metadata: { status }, req });

  notifyUser({ userId: ticket.reporterId, type: 'TICKET_UPDATE', title: 'Actualizacion de tu reporte', body: `Tu reporte "${ticket.subject}" cambio a ${updated.status}.`, data: { ticketId } });
  return updated;
}

module.exports = {
  getDashboard,
  getOperationalMap,
  getDriverDetail,
  getRequestDetail,
  manualAssign,
  cancelService,
  createTicket,
  listTickets,
  updateTicket,
};
