// ============================================================
// WayGo - Servicio de conductores
// Licencia, documentos, estado operativo, consentimiento GPS
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const { removeByPublicUrl } = require('../middlewares/upload');
const audit = require('../utils/audit');
const { emitToRole, emitToUser } = require('../sockets');

async function getDriverProfile(userId) {
  const driver = await prisma.driverProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          profile: { select: { firstName: true, lastName: true, phone: true, photoUrl: true } },
        },
      },
      vehicles: { orderBy: { createdAt: 'asc' } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');
  return driver;
}

async function updateLicense(userId, { licenseNumber, licenseCategory, licenseExpiresAt }, req) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');

  const expires = new Date(licenseExpiresAt);
  if (expires < new Date()) throw ApiError.badRequest('La licencia esta vencida', undefined, 'LICENSE_EXPIRED');

  const updated = await prisma.driverProfile.update({
    where: { userId },
    data: {
      licenseNumber,
      licenseCategory: licenseCategory.toUpperCase(),
      licenseExpiresAt: expires,
      // Si se actualiza la licencia y estaba aprobada, se mantiene; si fue rechazado, vuelve a pendiente
      ...(driver.verificationStatus === 'REJECTED' ? { verificationStatus: 'PENDING' } : {}),
    },
  });

  await audit({ actorId: userId, action: 'DRIVER_LICENSE_UPDATED', entity: 'DriverProfile', entityId: driver.id, req });
  return updated;
}

// ------------------------------------------------------------
// Documentos del conductor
// ------------------------------------------------------------
async function addDocument(userId, { type, fileUrl, expiresAt }, req) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');

  // Un solo documento PENDING/APPROVED por tipo (si existe, se reemplaza el archivo y vuelve a PENDING)
  const existing = await prisma.driverDocument.findFirst({
    where: { driverId: driver.id, type, status: { in: ['PENDING', 'APPROVED'] } },
  });

  let doc;
  if (existing) {
    doc = await prisma.driverDocument.update({
      where: { id: existing.id },
      data: { fileUrl, expiresAt: expiresAt ? new Date(expiresAt) : null, status: 'PENDING', notes: null, reviewedAt: null, reviewedById: null },
    });
    if (existing.fileUrl !== fileUrl) removeByPublicUrl(existing.fileUrl);
    // Si un documento aprobado se reemplaza, el conductor vuelve a revision
    if (driver.verificationStatus === 'APPROVED') {
      await prisma.driverProfile.update({ where: { id: driver.id }, data: { verificationStatus: 'PENDING' } });
    }
  } else {
    doc = await prisma.driverDocument.create({
      data: { driverId: driver.id, type, fileUrl, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
  }

  await audit({ actorId: userId, action: 'DRIVER_DOCUMENT_UPLOADED', entity: 'DriverDocument', entityId: doc.id, metadata: { type }, req });
  return doc;
}

async function listDocuments(userId) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');
  return prisma.driverDocument.findMany({ where: { driverId: driver.id }, orderBy: { createdAt: 'desc' } });
}

async function deleteDocument(userId, documentId, req) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');

  const doc = await prisma.driverDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.driverId !== driver.id) throw ApiError.notFound('Documento no encontrado');
  if (doc.status === 'APPROVED') throw ApiError.forbidden('No puedes eliminar un documento aprobado', 'DOCUMENT_APPROVED');

  await prisma.driverDocument.delete({ where: { id: doc.id } });
  removeByPublicUrl(doc.fileUrl);
  await audit({ actorId: userId, action: 'DRIVER_DOCUMENT_DELETED', entity: 'DriverDocument', entityId: doc.id, metadata: { type: doc.type }, req });
  return { deleted: true };
}

// ------------------------------------------------------------
// Estado operativo y ubicacion
// ------------------------------------------------------------
async function setOperationalStatus(userId, status, req) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');

  if (status === 'AVAILABLE') {
    if (driver.verificationStatus !== 'APPROVED') {
      throw ApiError.forbidden('Debes estar habilitado (documentos aprobados) para conectarte', 'DRIVER_NOT_VERIFIED');
    }
    if (!driver.licenseNumber) {
      throw ApiError.forbidden('Registra tu licencia de conduccion antes de conectarte', 'LICENSE_REQUIRED');
    }
    const hasVehicle = await prisma.vehicle.count({ where: { driverId: driver.id, isActive: true } });
    if (hasVehicle === 0) throw ApiError.forbidden('Registra al menos un vehiculo antes de conectarte', 'VEHICLE_REQUIRED');
  }
  if (driver.operationalStatus === 'BUSY' && status === 'OFFLINE') {
    throw ApiError.conflict('No puedes desconectarte con un servicio en curso', 'DRIVER_BUSY');
  }

  const updated = await prisma.driverProfile.update({ where: { userId }, data: { operationalStatus: status } });
  await audit({ actorId: userId, action: status === 'AVAILABLE' ? 'DRIVER_WENT_AVAILABLE' : 'DRIVER_WENT_OFFLINE', entity: 'DriverProfile', entityId: driver.id, req });
  return updated;
}

async function setLocationConsent(userId, consent, req) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');

  const updated = await prisma.driverProfile.update({
    where: { userId },
    data: {
      locationConsent: consent,
      locationConsentAt: new Date(),
      // Al revocar el consentimiento se borra la ultima ubicacion conocida
      ...(consent ? {} : { lastLat: null, lastLng: null, lastLocationAt: null }),
    },
  });

  await audit({ actorId: userId, action: consent ? 'LOCATION_CONSENT_GRANTED' : 'LOCATION_CONSENT_REVOKED', entity: 'DriverProfile', entityId: driver.id, req });
  return updated;
}

async function updateLocation(userId, { lat, lng }, req) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');
  if (!driver.locationConsent) throw ApiError.forbidden('No has autorizado el uso de tu ubicacion', 'LOCATION_NOT_CONSENTED');
  if (driver.operationalStatus === 'OFFLINE') throw ApiError.conflict('Activa tu disponibilidad para compartir ubicacion', 'DRIVER_OFFLINE');

  // Servicio activo del conductor (para registrar el recorrido y avisar al cliente)
  const active = await prisma.serviceAssignment.findFirst({
    where: { driverId: userId, status: { in: ['ASSIGNED', 'DRIVER_EN_ROUTE', 'IN_SERVICE'] } },
    select: { requestId: true, request: { select: { customerId: true } } },
  });

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.driverProfile.update({
      where: { userId },
      data: { lastLat: lat, lastLng: lng, lastLocationAt: now },
    }),
    prisma.driverLocationShare.create({ data: { driverId: userId, lat, lng } }),
  ]);

  // Guarda el punto de recorrido del servicio activo
  if (active) {
    await prisma.serviceTracking.create({
      data: { requestId: active.requestId, lat, lng, source: 'driver_app' },
    });
  }

  const payload = {
    userId,
    lat: updated.lastLat,
    lng: updated.lastLng,
    at: now.toISOString(),
    requestId: active?.requestId || null,
  };

  // Emite al call center en tiempo real
  emitToRole('CALL_CENTER', 'driver:location', payload);
  // Y al cliente del servicio activo
  if (active?.request.customerId) {
    emitToUser(active.request.customerId, 'driver:location', payload);
  }

  return { lat: updated.lastLat, lng: updated.lastLng, at: now, requestId: active?.requestId || null };
}

module.exports = {
  getDriverProfile,
  updateLicense,
  addDocument,
  listDocuments,
  deleteDocument,
  setOperationalStatus,
  setLocationConsent,
  updateLocation,
};
