// ============================================================
// WayGo - Utilidades de fecha para las vistas (frontend)
// ============================================================

/** Construye un Date a partir de fecha (ISO) y hora "HH:mm" opcional */
export function dateFromSchedule(dateStr, timeStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (timeStr) {
    const [h, m] = String(timeStr).split(':')
    d.setHours(Number(h || 0), Number(m || 0), 0, 0)
  }
  return d
}
