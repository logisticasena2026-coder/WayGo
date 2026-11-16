// ============================================================
// WayGo - Mis paquetes (cliente)
// ============================================================
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { packageService } from '../../services/package.service'
import { StatusBadge, EmptyState } from '../../components/StatusBadge'
import { apiErrorMessage } from '../../services/api'

const PKG_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warning' }, PICKED_UP: { label: 'Recogido', tone: 'info' },
  IN_TRANSIT: { label: 'En transito', tone: 'info' }, DELIVERED: { label: 'Entregado', tone: 'success' },
  INCIDENT: { label: 'Incidencia', tone: 'danger' }, CANCELLED: { label: 'Cancelado', tone: 'warning' },
}

export default function MyPackagesPage() {
  const location = useLocation()
  const [packages, setPackages] = useState(null)
  const [msg, setMsg] = useState(location.state?.message || null)

  const load = () => packageService.listMine().then(setPackages).catch((e) => setMsg({ type: 'error', text: apiErrorMessage(e) }))

  useEffect(() => { load() }, [])

  if (packages === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type || 'success'}`}>{typeof msg === 'string' ? msg : msg.text}</div>}
      <h2 style={{ marginBottom: 16 }}>Mis paquetes ({packages.length})</h2>
      {packages.length === 0 && <EmptyState icon="📦" title="Sin paquetes" text="Envia un paquete desde 'Solicitar servicio'." />}
      <div className="wg-grid" style={{ gap: 12 }}>
        {packages.map((p) => (
          <div key={p.id} className="wg-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <strong>{p.trackingCode}</strong>
              <StatusBadge value={p.status} map={PKG_STATUS} />
            </div>
            <div className="wg-muted" style={{ fontSize: 13, marginTop: 4 }}>{p.description}</div>
            <div className="wg-muted" style={{ fontSize: 13 }}>{p.request.pickupAddress} → {p.request.dropoffAddress}</div>
            {p.evidence && <div className="wg-alert wg-alert--success wg-mt" style={{ padding: '8px 12px', fontSize: 13 }}>Entregado a {p.evidence.receivedBy}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
