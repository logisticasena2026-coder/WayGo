// ============================================================
// WayGo - Servicio de administracion (FASE 2: verificacion)
// Revision documental y habilitacion de conductores
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const audit = require('../utils/audit');

const REQUIRED_DRIVER_DOCS = ['LICENCIA', 'CEDULA'];

// ------------------------------------------------------------
// Conductores
// ------------------------------------------------------------
async function listDrivers({ status, page = 1, pageSize = 20 }) {
  const where = {};
  if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.verificationStatus = status;

  const [total, items] = await prisma.$transaction([
    prisma.driverProfile.count({ where }),
    prisma.driverProfile.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            status: true,
            profile: { select: { firstName: true, lastName: true, phone: true, photoUrl: true } },
          },
        },
        vehicles: { select: { id: true, plate: true, brand: true, model: true, verificationStatus: true } },
        documents: { select: { id: true, type: true, status: true, expiresAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}

async function getDriverDetail(driverProfileId) {
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      user: {
        select: {
          email: true,
          status: true,
          createdAt: true,
          profile: true,
        },
      },
      vehicles: { include: { documents: true }, orderBy: { createdAt: 'asc' } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!driver) throw ApiError.notFound('Conductor no encontrado');
  return driver;
}

// ------------------------------------------------------------
// Revision de documentos (conductor o vehiculo)
// ------------------------------------------------------------
async function reviewDocument({ kind, documentId, action, notes, rejectionReason, reviewerId, req }) {
  const model = kind === 'vehicle' ? prisma.vehicleDocument : prisma.driverDocument;
  const doc = await model.findUnique({ where: { id: documentId } });
  if (!doc) throw ApiError.notFound('Documento no encontrado');

  if (action === 'REJECT' && !rejectionReason) {
    throw ApiError.badRequest('Debes indicar el motivo del rechazo', undefined, 'REJECTION_REASON_REQUIRED');
  }

  const updated = await model.update({
    where: { id: documentId },
    data: {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      notes: action === 'APPROVE' ? notes || null : rejectionReason,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });

  await audit({
    actorId: reviewerId,
    action: action === 'APPROVE' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
    entity: kind === 'vehicle' ? 'VehicleDocument' : 'DriverDocument',
    entityId: documentId,
    metadata: { type: doc.type, notes: updated.notes },
    req,
  });

  return updated;
}

// ------------------------------------------------------------
// Habilitacion de conductor
// Reglas: licencia registrada y vigente + documentos requeridos
// aprobados + al menos un vehiculo activo
// ------------------------------------------------------------
async function verifyDriver({ driverProfileId, action, notes, reviewerId, req }) {
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { documents: true, vehicles: true },
  });
  if (!driver) throw ApiError.notFound('Conductor no encontrado');

  if (action === 'APPROVE') {
    const problems = [];
    if (!driver.licenseNumber) problems.push('Sin licencia registrada');
    if (driver.licenseExpiresAt && driver.licenseExpiresAt < new Date()) problems.push('Licencia vencida');
    for (const type of REQUIRED_DRIVER_DOCS) {
      const ok = driver.documents.some((d) => d.type === type && d.status === 'APPROVED');
      if (!ok) problems.push(`Documento requerido sin aprobar: ${type}`);
    }
    const activeVehicle = driver.vehicles.find((v) => v.isActive);
    if (!activeVehicle) problems.push('Sin vehiculo activo');

    if (problems.length > 0) {
      throw ApiError.badRequest('El conductor no cumple los requisitos de habilitacion', { problems }, 'VERIFICATION_REQUIREMENTS');
    }
  }

  const updated = await prisma.driverProfile.update({
    where: { id: driverProfileId },
    data: {
      verificationStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      verifiedAt: action === 'APPROVE' ? new Date() : null,
      verifiedById: reviewerId,
      // Si se rechaza mientras esta conectado, se desconecta
      ...(action === 'REJECT' ? { operationalStatus: 'OFFLINE' } : {}),
    },
  });

  await audit({
    actorId: reviewerId,
    action: action === 'APPROVE' ? 'DRIVER_VERIFIED' : 'DRIVER_VERIFICATION_REJECTED',
    entity: 'DriverProfile',
    entityId: driverProfileId,
    metadata: { notes },
    req,
  });

  return updated;
}

// ------------------------------------------------------------
// Usuarios (listado basico para administracion)
// ------------------------------------------------------------
async function listUsers({ role, status, search, page = 1, pageSize = 20 }) {
  const where = {};
  if (role && ['ADMIN', 'CUSTOMER', 'DRIVER', 'CALL_CENTER'].includes(role)) where.role = { name: role };
  if (status && ['PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED', 'DELETED'].includes(status)) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { profile: { firstName: { contains: search, mode: 'insensitive' } } },
      { profile: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        role: { select: { name: true } },
        profile: { select: { firstName: true, lastName: true, phone: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}

/** Cambia el estado de un usuario (bloquear / habilitar) */
async function setUserStatus({ userId, status, adminId, req }) {
  if (!['ACTIVE', 'BLOCKED'].includes(status)) throw ApiError.badRequest('Estado invalido (ACTIVE o BLOCKED)');
  if (userId === adminId) throw ApiError.conflict('No puedes cambiar tu propio estado', 'SELF_STATUS');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Usuario no encontrado');

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: userId }, data: { status } });
    if (status === 'BLOCKED') {
      // Revoca sesiones y desconecta al conductor si aplica
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.driverProfile.updateMany({ where: { userId }, data: { operationalStatus: 'OFFLINE' } });
    }
    return u;
  });

  await audit({ actorId: adminId, action: status === 'BLOCKED' ? 'USER_BLOCKED' : 'USER_UNBLOCKED', entity: 'User', entityId: userId, req });
  return { id: updated.id, status: updated.status };
}

module.exports = {
  listDrivers,
  getDriverDetail,
  reviewDocument,
  verifyDriver,
  listUsers,
  setUserStatus,
  REQUIRED_DRIVER_DOCS,
};
