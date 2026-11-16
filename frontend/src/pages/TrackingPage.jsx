// ============================================================
// WayGo - Seguimiento publico de paquete por codigo
// ============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { packageService } from '../services/package.service'
import { apiErrorMessage } from '../services/api'
import { StatusBadge } from '../components/StatusBadge'

const PKG_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warning' }, PICKED_UP: { label: 'Recogido', tone: 'info' },
  IN_TRANSIT: { label: 'En transito', tone: 'info' }, DELIVERED: { label: 'Entregado', tone: 'success' },
  INCIDENT: { label: 'Incidencia', tone: 'danger' }, CANCELLED: { label: 'Cancelado', tone: 'warning' },
}

export default function TrackingPage() {
  const [code, setCode] = useState('')
  const [pkg, setPkg] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const search = async (e) => {
    e.preventDefault()
    setError(null); setPkg(null); setLoading(true)
    try { setPkg(await packageService.track(code.trim())) } catch (e2) { setError(apiErrorMessage(e2, 'No se pudo consultar')) } finally { setLoading(false) }
  }

  return (
    <div className="wg-auth">
      <div className="wg-auth__card" style={{ maxWidth: 480 }}>
        <div className="wg-auth__logo"><img src="/favicon.svg" alt="WayGo" /></div>
        <h2>Rastrear paquete</h2>
        <p className="wg-auth__subtitle">Ingresa el codigo de seguimiento</p>

        <form onSubmit={search}>
          <div className="wg-field">
            <input className="wg-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WG-XXXXXXXX" required />
          </div>
          <button className="wg-btn wg-btn--primary wg-btn--block" disabled={loading}>{loading ? 'Consultando...' : 'Rastrear'}</button>
        </form>

        {error && <div className="wg-alert wg-alert--error wg-mt">{error}</div>}
        {pkg && (
          <div className="wg-card wg-mt" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{pkg.trackingCode}</strong>
              <StatusBadge value={pkg.status} map={PKG_STATUS} />
            </div>
            <div className="wg-muted" style={{ fontSize: 13, marginTop: 6 }}>{pkg.description}</div>
            <div className="wg-muted" style={{ fontSize: 13 }}>{pkg.request?.pickupAddress} → {pkg.request?.dropoffAddress}</div>
            {pkg.evidence && <div className="wg-alert wg-alert--success wg-mt" style={{ padding: '8px 12px', fontSize: 13 }}>Entregado a {pkg.evidence.receivedBy} el {new Date(pkg.evidence.deliveredAt).toLocaleString('es-CO')}</div>}
          </div>
        )}

        <div className="wg-auth__links"><Link to="/">← Volver al inicio</Link></div>
      </div>
    </div>
  )
}
