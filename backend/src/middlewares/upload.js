// ============================================================
// WayGo - Subida de archivos (multer)
// - Almacenamiento en disco con nombre UUID + extension segura
// - Filtro MIME estricto (imagenes para fotos, imagenes+PDF para documentos)
// - Limite de tamaño configurable (MAX_FILE_SIZE_MB)
// ============================================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', config.upload.dir);

const SUBDIRS = {
  photos: path.join(UPLOAD_ROOT, 'photos'),
  documents: path.join(UPLOAD_ROOT, 'documents'),
  vehicles: path.join(UPLOAD_ROOT, 'vehicles'),
};

// Asegura los directorios al iniciar
Object.values(SUBDIRS).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const DOCUMENT_TYPES = {
  ...IMAGE_TYPES,
  'application/pdf': '.pdf',
};

function makeStorage(kind) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, SUBDIRS[kind]),
    filename: (req, file, cb) => {
      const ext = (kind === 'documents' ? DOCUMENT_TYPES : IMAGE_TYPES)[file.mimetype] || '.bin';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

function makeFileFilter(allowed, label) {
  return (req, file, cb) => {
    if (!allowed[file.mimetype]) {
      return cb(ApiError.badRequest(`Tipo de archivo no permitido. ${label}`, { mimetype: file.mimetype }, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  };
}

const limits = { fileSize: config.upload.maxFileSizeMb * 1024 * 1024, files: 1 };

/** Subida de fotografia (perfil): solo imagenes */
const uploadPhoto = multer({
  storage: makeStorage('photos'),
  fileFilter: makeFileFilter(IMAGE_TYPES, 'Solo JPG, PNG o WebP.'),
  limits,
});

/** Subida de foto de vehiculo: solo imagenes */
const uploadVehiclePhoto = multer({
  storage: makeStorage('vehicles'),
  fileFilter: makeFileFilter(IMAGE_TYPES, 'Solo JPG, PNG o WebP.'),
  limits,
});

/** Subida de documentos: imagenes o PDF */
const uploadDocument = multer({
  storage: makeStorage('documents'),
  fileFilter: makeFileFilter(DOCUMENT_TYPES, 'Solo JPG, PNG, WebP o PDF.'),
  limits,
});

/** URL publica relativa de un archivo subido */
const publicUrl = (kind, filename) => `/uploads/${kind}/${filename}`;

/** Elimina un archivo subido (mejor esfuerzo, sin lanzar) */
function removeFile(kind, filename) {
  if (!filename) return;
  const full = path.join(SUBDIRS[kind] || UPLOAD_ROOT, path.basename(filename));
  fs.unlink(full, () => {});
}

/** Elimina el archivo fisico a partir de su URL publica (/uploads/<kind>/<file>) */
function removeByPublicUrl(url) {
  if (!url || typeof url !== 'string') return;
  const match = /^\/uploads\/(photos|documents|vehicles)\/([^/]+)$/.exec(url);
  if (match) removeFile(match[1], match[2]);
}

module.exports = {
  uploadPhoto,
  uploadVehiclePhoto,
  uploadDocument,
  publicUrl,
  removeByPublicUrl,
};
