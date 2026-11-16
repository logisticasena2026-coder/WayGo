// ============================================================
// WayGo - Pagina generica para modulos en construccion
// (Los paneles de cada fase reemplazaran estas vistas)
// ============================================================
import { useAuth } from '../context/AuthContext'

export function DashboardHome() {
  const { user } = useAuth()
  const role = user?.role?.name

  const statusBadge = (() => {
    if (role === 'DRIVER') {
      const v = user?.driverProfile?.verificationStatus
      if (v === 'APPROVED') return <span className="wg-badge wg-badge--success">Conductor habilitado</span>
      if (v === 'REJECTED') return <span className="wg-badge wg-badge--warning">Documentos rechazados</span>
      return <span className="wg-badge wg-badge--warning">Verificacion documental pendiente</span>
    }
    return <span className="wg-badge wg-badge--success">Cuenta activa</span>
  })()

  return (
    <div className="wg-grid wg-grid--2">
      <div className="wg-card">
        <h2 style={{ marginBottom: 8 }}>Hola, {user?.profile?.firstName} 👋</h2>
        <p className="wg-muted">Bienvenido a tu panel de WayGo.</p>
        <div className="wg-mt">{statusBadge}</div>
      </div>
      <div className="wg-card">
        <h3 style={{ marginBottom: 8 }}>Estado de tu cuenta</h3>
        <p className="wg-muted" style={{ fontSize: 14 }}>
          Correo: {user?.email}<br />
          Rol: {role}<br />
          Miembro desde: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CO') : '-'}
        </p>
      </div>
    </div>
  )
}

export function ModulePlaceholder({ title, description }) {
  return (
    <div className="wg-card" style={{ textAlign: 'center', padding: '56px 24px' }}>
      <div style={{ fontSize: 42, marginBottom: 12 }}>🚧</div>
      <h2>{title}</h2>
      <p className="wg-muted wg-mt" style={{ maxWidth: 480, margin: '8px auto 0' }}>
        {description || 'Este modulo se implementa en una fase posterior del desarrollo de WayGo.'}
      </p>
    </div>
  )
}
