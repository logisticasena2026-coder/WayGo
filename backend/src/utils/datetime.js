// ============================================================
// WayGo - Utilidades de fecha/hora
// Colombia usa UTC-5 todo el ano (sin horario de verano).
// Las fechas se almacenan en UTC y se presentan en America/Bogota.
// ============================================================
const COLOMBIA_OFFSET = '-05:00';
const TZ = 'America/Bogota';

/**
 * Convierte una fecha y hora locales de Colombia (YYYY-MM-DD + HH:mm)
 * a un objeto Date en UTC.
 */
function colombiaToUtc(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00${COLOMBIA_OFFSET}`);
}

/**
 * Devuelve la fecha actual en Colombia como string YYYY-MM-DD.
 */
function todayColombia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * Formatea una fecha UTC para mostrarla en Colombia (YYYY-MM-DD HH:mm).
 */
function formatColombia(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(date));
}

module.exports = { colombiaToUtc, todayColombia, formatColombia, TZ };
