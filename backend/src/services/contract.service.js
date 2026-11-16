// ============================================================
// WayGo - Servicio de contratos mensuales
// Creacion con horarios, generacion de ejecuciones recurrentes,
// asignacion de conductor, estado y alertas de vencimiento.
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');
const { notifyUser } = require('./notification.service');

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

async function createContract(customerId, data, req) {
  if (new Date(data.endDate) <= new Date(data.startDate)) throw ApiError.badRequest('La fecha final debe ser posterior a la inicial', 'INVALID_DATES');

  const contract = await prisma.$transaction(async (tx) => {
    const c = await tx.monthlyContract.create({
      data: {
        customerId,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        servicesIncluded: Number(data.servicesIncluded),
        kmIncluded: data.kmIncluded ? Number(data.kmIncluded) : null,
        monthlyPrice: data.monthlyPrice,
        conditions: data.conditions || null,
        status: 'DRAFT',
      },
    });
    for (const s of data.schedules) {
      await tx.contractSchedule.create({ data: { contractId: c.id, dayOfWeek: Number(s.dayOfWeek), time: s.time } });
    }
    return c;
  });

  await audit({ actorId: customerId, action: 'CONTRACT_CREATED', entity: 'MonthlyContract', entityId: contract.id, req });
  return contract;
}

async function listContracts(user, { status } = {}) {
  const where = {};
  if (status) where.status = status;

  if (user.role === 'CUSTOMER') where.customerId = user.id;
  else if (user.role === 'DRIVER') where.driverId = user.id;
  // ADMIN y CALL_CENTER ven todos

  return prisma.monthlyContract.findMany({
    where,
    include: {
      customer: { select: { profile: { select: { firstName: true, lastName: true } } } },
      driver: { select: { profile: { select: { firstName: true, lastName: true } } } },
      schedules: true,
      _count: { select: { executions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getContract(id, user) {
  const contract = await prisma.monthlyContract.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, profile: true } },
      driver: { select: { id: true, profile: true } },
      schedules: true,
      executions: { orderBy: { plannedDate: 'asc' } },
    },
  });
  if (!contract) throw ApiError.notFound('Contrato no encontrado');

  if (user.role === 'CUSTOMER' && contract.customerId !== user.id) throw ApiError.forbidden('No tienes acceso a este contrato');
  if (user.role === 'DRIVER' && contract.driverId !== user.id) throw ApiError.forbidden('No tienes acceso a este contrato');
  return contract;
}

async function assignDriver(contractId, driverId, user, req) {
  const contract = await prisma.monthlyContract.findUnique({ where: { id: contractId } });
  if (!contract) throw ApiError.notFound('Contrato no encontrado');
  if (user.role === 'CUSTOMER' && contract.customerId !== user.id) throw ApiError.forbidden('No eres el titular del contrato');

  const driver = await prisma.driverProfile.findUnique({ where: { userId: driverId } });
  if (!driver || driver.verificationStatus !== 'APPROVED') throw ApiError.badRequest('Conductor no habilitado', 'DRIVER_NOT_VERIFIED');

  const updated = await prisma.monthlyContract.update({ where: { id: contractId }, data: { driverId } });
  await audit({ actorId: user.id, action: 'CONTRACT_DRIVER_ASSIGNED', entity: 'MonthlyContract', entityId: contractId, metadata: { driverId }, req });
  if (driverId) notifyUser({ userId: driverId, type: 'CONTRACT_ASSIGNED', title: 'Nuevo contrato asignado', body: `Se te asigno el contrato #${contract.contractNumber}.`, data: { contractId } });
  return updated;
}

async function changeStatus(contractId, status, user, req) {
  const contract = await prisma.monthlyContract.findUnique({ where: { id: contractId } });
  if (!contract) throw ApiError.notFound('Contrato no encontrado');
  if (user.role === 'CUSTOMER' && contract.customerId !== user.id) throw ApiError.forbidden('No eres el titular del contrato');

  const updated = await prisma.monthlyContract.update({ where: { id: contractId }, data: { status } });
  await audit({ actorId: user.id, action: `CONTRACT_${status}`, entity: 'MonthlyContract', entityId: contractId, req });
  return updated;
}

// ------------------------------------------------------------
// Generacion de ejecuciones (recurrentes) dentro del rango
// ------------------------------------------------------------
async function generateExecutions(contractId, user, req) {
  const contract = await prisma.monthlyContract.findUnique({ where: { id: contractId }, include: { schedules: true } });
  if (!contract) throw ApiError.notFound('Contrato no encontrado');
  if (user.role === 'CUSTOMER' && contract.customerId !== user.id) throw ApiError.forbidden('No eres el titular del contrato');

  const count = await generateExecutionsForContract(contract);
  await audit({ actorId: user.id, action: 'CONTRACT_EXECUTIONS_GENERATED', entity: 'MonthlyContract', entityId: contractId, metadata: { count }, req });
  return count;
}

async function generateExecutionsForContract(contract) {
  if (!contract.schedules || contract.schedules.length === 0) return 0;
  const start = new Date(contract.startDate);
  const end = new Date(contract.endDate);
  if (start > end) return 0;

  const existing = await prisma.contractExecution.findMany({ where: { contractId: contract.id }, select: { plannedDate: true, plannedTime: true } });
  const existingKeys = new Set(existing.map((e) => `${e.plannedDate.toISOString().slice(0, 10)}@${e.plannedTime}`));

  const toCreate = [];
  let cursor = new Date(start);
  const limit = new Date(end);
  let guard = 0;
  while (cursor <= limit && guard < 2000) {
    for (const s of contract.schedules) {
      if (s.dayOfWeek === cursor.getDay()) {
        const key = `${cursor.toISOString().slice(0, 10)}@${s.time}`;
        if (!existingKeys.has(key)) {
          toCreate.push({ contractId: contract.id, scheduleId: s.id, plannedDate: new Date(cursor), plannedTime: s.time });
        }
      }
    }
    cursor = new Date(cursor.getTime() + 86400000);
    guard++;
  }

  if (toCreate.length > 0) {
    await prisma.contractExecution.createMany({ data: toCreate });
  }
  return toCreate.length;
}

// ------------------------------------------------------------
// Materializar ejecuciones proximas en solicitudes de servicio
// (cron) y asignar conductor si el contrato lo tiene
// ------------------------------------------------------------
async function materializeUpcomingExecutions() {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 1); // proximas 24 h
  const horizonStr = horizon.toISOString().slice(0, 10);

  const serviceType = await prisma.serviceType.findUnique({ where: { code: 'MONTHLY' } });
  if (!serviceType) return 0;

  const pending = await prisma.contractExecution.findMany({
    where: { status: 'PENDING', requestId: null, plannedDate: { lte: new Date(horizonStr) } },
    include: { contract: { include: { schedules: true } } },
    orderBy: { plannedDate: 'asc' },
    take: 50,
  });

  let created = 0;
  for (const exec of pending) {
    const c = exec.contract;
    const scheduledAtUtc = new Date(`${exec.plannedDate.toISOString().slice(0, 10)}T${exec.plannedTime}:00-05:00`);

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({
        data: {
          customerId: c.customerId,
          serviceTypeId: serviceType.id,
          pickupAddress: c.pickupAddress,
          dropoffAddress: c.dropoffAddress,
          scheduledDate: exec.plannedDate,
          scheduledTime: exec.plannedTime,
          scheduledAtUtc,
          proposedPrice: c.monthlyPrice,
          finalPrice: c.monthlyPrice,
          status: c.driverId ? 'ASSIGNED' : 'PUBLISHED',
          publishedAt: new Date(),
          expiresAt: scheduledAtUtc,
        },
      });

      await tx.contractExecution.update({ where: { id: exec.id }, data: { requestId: request.id, status: 'GENERATED' } });
      await tx.monthlyContract.update({ where: { id: c.id }, data: { servicesUsed: { increment: 1 } } });

      if (c.driverId) {
        const vehicle = await tx.vehicle.findFirst({ where: { driverId: c.driverId, isPrimary: true } });
        if (vehicle) {
          await tx.serviceAssignment.create({
            data: { requestId: request.id, driverId: c.driverId, vehicleId: vehicle.id, agreedPrice: c.monthlyPrice, status: 'ASSIGNED' },
          });
          await tx.driverProfile.update({ where: { userId: c.driverId }, data: { operationalStatus: 'BUSY' } });
        }
      }
      await tx.serviceEvent.create({ data: { requestId: request.id, type: 'CONTRACT_GENERATED', payload: { contractId: c.id } } });
      return request;
    });

    notifyUser({ userId: c.customerId, type: 'CONTRACT_SERVICE_GENERATED', title: 'Servicio del contrato generado', body: `Se genero el servicio #${result.requestNumber} de tu contrato #${c.contractNumber}.`, data: { requestId: result.id } });
    created++;
  }
  return created;
}

// ------------------------------------------------------------
// Alertas de contratos proximos a vencer (cron)
// ------------------------------------------------------------
async function sendExpiryAlerts() {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);

  const contracts = await prisma.monthlyContract.findMany({
    where: { status: 'ACTIVE', endDate: { lte: horizon }, expiryAlertSentAt: null },
  });

  for (const c of contracts) {
    await prisma.$transaction([
      prisma.monthlyContract.update({ where: { id: c.id }, data: { expiryAlertSentAt: new Date() } }),
      prisma.notification.create({
        data: {
          userId: c.customerId,
          type: 'CONTRACT_EXPIRING',
          title: 'Contrato proximo a vencer',
          body: `Tu contrato #${c.contractNumber} vence el ${c.endDate.toISOString().slice(0, 10)}.`,
          data: { contractId: c.id },
        },
      }),
    ]);
    notifyUser({ userId: c.customerId, type: 'CONTRACT_EXPIRING', title: 'Contrato proximo a vencer', body: `Tu contrato #${c.contractNumber} vence pronto.`, data: { contractId: c.id } });
  }
  return contracts.length;
}

module.exports = {
  createContract,
  listContracts,
  getContract,
  assignDriver,
  changeStatus,
  generateExecutions,
  generateExecutionsForContract,
  materializeUpcomingExecutions,
  sendExpiryAlerts,
  DAY_NAMES,
};
