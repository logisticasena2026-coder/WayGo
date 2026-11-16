// ============================================================
// WayGo - Servicio de vehiculos
// CRUD, foto, documentos y vehiculo principal
// ============================================================
const prisma = require('../utils/prisma');
const ApiError = require('../utils/apiError');
const { removeByPublicUrl } = require('../middlewares/upload');
const audit = require('../utils/audit');

async function getDriverProfileId(userId) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw ApiError.notFound('Perfil de conductor no encontrado');
  return driver;
}

async function assertOwnership(userId, vehicleId) {
  const driver = await getDriverProfileId(userId);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { documents: true } });
  if (!vehicle || vehicle.driverId !== driver.id) throw ApiError.notFound('Vehiculo no encontrado');
  return { driver, vehicle };
}

// ------------------------------------------------------------
async function listVehicles(userId) {
  const driver = await getDriverProfileId(userId);
  return prisma.vehicle.findMany({
    where: { driverId: driver.id },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

async function getVehicle(userId, vehicleId) {
  const { vehicle } = await assertOwnership(userId, vehicleId);
  return vehicle;
}

async function createVehicle(userId, data, req) {
  const driver = await getDriverProfileId(userId);

  const plate = data.plate.toUpperCase();
  const dup = await prisma.vehicle.findFirst({ where: { driverId: driver.id, plate } });
  if (dup) throw ApiError.conflict('Ya tienes un vehiculo registrado con esa placa', 'PLATE_TAKEN');

  const isFirst = (await prisma.vehicle.count({ where: { driverId: driver.id } })) === 0;

  const vehicle = await prisma.vehicle.create({
    data: {
      driverId: driver.id,
      plate,
      brand: data.brand,
      model: data.model,
      year: data.year ? Number(data.year) : null,
      color: data.color,
      type: data.type || null,
      capacity: data.capacity ? Number(data.capacity) : 4,
      isPrimary: isFirst, // el primer vehiculo queda como principal
    },
  });

  await audit({ actorId: userId, action: 'VEHICLE_CREATED', entity: 'Vehicle', entityId: vehicle.id, metadata: { plate }, req });
  return vehicle;
}

async function updateVehicle(userId, vehicleId, data, req) {
  const { vehicle } = await assertOwnership(userId, vehicleId);

  const update = {};
  for (const key of ['brand', 'model', 'color', 'type']) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  if (data.year !== undefined) update.year = data.year ? Number(data.year) : null;
  if (data.capacity !== undefined) update.capacity = Number(data.capacity);
  if (data.plate !== undefined) {
    const plate = data.plate.toUpperCase();
    if (plate !== vehicle.plate) {
      const dup = await prisma.vehicle.findFirst({ where: { driverId: vehicle.driverId, plate } });
      if (dup) throw ApiError.conflict('Ya tienes un vehiculo registrado con esa placa', 'PLATE_TAKEN');
      update.plate = plate;
    }
  }
  if (Object.keys(update).length === 0) throw ApiError.badRequest('No hay campos para actualizar');

  // Cambios relevantes vuelven a revision si el vehiculo estaba aprobado
  if (vehicle.verificationStatus === 'APPROVED' && (update.plate || update.brand || update.model || update.type)) {
    update.verificationStatus = 'PENDING';
  }

  const updated = await prisma.vehicle.update({ where: { id: vehicleId }, data: update });
  await audit({ actorId: userId, action: 'VEHICLE_UPDATED', entity: 'Vehicle', entityId: vehicleId, metadata: { fields: Object.keys(update) }, req });
  return updated;
}

async function deactivateVehicle(userId, vehicleId, req) {
  const { vehicle } = await assertOwnership(userId, vehicleId);
  if (vehicle.isPrimary) {
    const others = await prisma.vehicle.count({ where: { driverId: vehicle.driverId, isActive: true, id: { not: vehicleId } } });
    if (others > 0) throw ApiError.conflict('Asigna otro vehiculo como principal antes de desactivar este', 'PRIMARY_VEHICLE');
  }

  const updated = await prisma.vehicle.update({ where: { id: vehicleId }, data: { isActive: false, isPrimary: false } });
  await audit({ actorId: userId, action: 'VEHICLE_DEACTIVATED', entity: 'Vehicle', entityId: vehicleId, req });
  return updated;
}

async function setPrimary(userId, vehicleId, req) {
  const { driver, vehicle } = await assertOwnership(userId, vehicleId);
  if (!vehicle.isActive) throw ApiError.conflict('No puedes hacer principal un vehiculo inactivo', 'VEHICLE_INACTIVE');

  await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { driverId: driver.id, isPrimary: true }, data: { isPrimary: false } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { isPrimary: true } }),
  ]);

  await audit({ actorId: userId, action: 'VEHICLE_SET_PRIMARY', entity: 'Vehicle', entityId: vehicleId, req });
  return prisma.vehicle.findUnique({ where: { id: vehicleId } });
}

// ------------------------------------------------------------
// Foto del vehiculo
// ------------------------------------------------------------
async function updateVehiclePhoto(userId, vehicleId, photoUrl, req) {
  const { vehicle } = await assertOwnership(userId, vehicleId);
  const updated = await prisma.vehicle.update({ where: { id: vehicleId }, data: { photoUrl } });
  if (vehicle.photoUrl && vehicle.photoUrl !== photoUrl) removeByPublicUrl(vehicle.photoUrl);
  await audit({ actorId: userId, action: 'VEHICLE_PHOTO_UPDATED', entity: 'Vehicle', entityId: vehicleId, req });
  return updated;
}

// ------------------------------------------------------------
// Documentos del vehiculo
// ------------------------------------------------------------
async function addVehicleDocument(userId, vehicleId, { type, fileUrl, expiresAt }, req) {
  const { vehicle } = await assertOwnership(userId, vehicleId);

  const existing = await prisma.vehicleDocument.findFirst({
    where: { vehicleId: vehicle.id, type, status: { in: ['PENDING', 'APPROVED'] } },
  });

  let doc;
  if (existing) {
    doc = await prisma.vehicleDocument.update({
      where: { id: existing.id },
      data: { fileUrl, expiresAt: expiresAt ? new Date(expiresAt) : null, status: 'PENDING', notes: null, reviewedAt: null, reviewedById: null },
    });
    if (existing.fileUrl !== fileUrl) removeByPublicUrl(existing.fileUrl);
    if (vehicle.verificationStatus === 'APPROVED') {
      await prisma.vehicle.update({ where: { id: vehicle.id }, data: { verificationStatus: 'PENDING' } });
    }
  } else {
    doc = await prisma.vehicleDocument.create({
      data: { vehicleId: vehicle.id, type, fileUrl, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
  }

  await audit({ actorId: userId, action: 'VEHICLE_DOCUMENT_UPLOADED', entity: 'VehicleDocument', entityId: doc.id, metadata: { type, vehicleId }, req });
  return doc;
}

async function deleteVehicleDocument(userId, vehicleId, documentId, req) {
  const { vehicle } = await assertOwnership(userId, vehicleId);
  const doc = await prisma.vehicleDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.vehicleId !== vehicle.id) throw ApiError.notFound('Documento no encontrado');
  if (doc.status === 'APPROVED') throw ApiError.forbidden('No puedes eliminar un documento aprobado', 'DOCUMENT_APPROVED');

  await prisma.vehicleDocument.delete({ where: { id: doc.id } });
  removeByPublicUrl(doc.fileUrl);
  await audit({ actorId: userId, action: 'VEHICLE_DOCUMENT_DELETED', entity: 'VehicleDocument', entityId: doc.id, req });
  return { deleted: true };
}

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deactivateVehicle,
  setPrimary,
  updateVehiclePhoto,
  addVehicleDocument,
  deleteVehicleDocument,
};
