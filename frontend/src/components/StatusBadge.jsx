// ============================================================
// WayGo - Componentes de estado y presentacion reutilizables
// ============================================================

export function StatusBadge({ value, map }) {
  const m = map?.[value] || { label: value, tone: 'info' }
  return <span className={`wg-badge wg-badge--${m.tone}`}>{m.label}</span>
}

export const STATUS_MAP = {
  // verificacion
  PENDING: { label: 'Pendiente', tone: 'warning' },
  APPROVED: { label: 'Aprobado', tone: 'success' },
  REJECTED: { label: 'Rechazado', tone: 'info' },
  EXPIRED: { label: 'Vencido', tone: 'warning' },
  // estado conductor
  OFFLINE: { label: 'Desconectado', tone: 'info' },
  AVAILABLE: { label: 'Disponible', tone: 'success' },
  BUSY: { label: 'Ocupado', tone: 'warning' },
  // usuario
  ACTIVE: { label: 'Activo', tone: 'success' },
  BLOCKED: { label: 'Bloqueado', tone: 'warning' },
  DELETED: { label: 'Eliminado', tone: 'info' },
  PENDING_VERIFICATION: { label: 'Pendiente de verificacion', tone: 'warning' },
}

export function EmptyState({ icon = '📭', title, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--wg-gray-400)' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontWeight: 600, color: 'var(--wg-gray-600)' }}>{title}</p>
      {text && <p style={{ fontSize: 14 }}>{text}</p>}
    </div>
  )
}

export function Spinner() {
  return <div className="wg-spinner" />
}
