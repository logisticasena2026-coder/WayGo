// ============================================================
// WayGo - Mis paquetes (cliente)
// ============================================================
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { packageService } from '../../services/package.service'
import { StatusBadge, EmptyState } from '../../components/StatusBadge'
import { apiErrorMessage } from '../../services/api'
import ViewSwitcher from '../../components/ViewSwitcher'
import StatusBoard from '../../components/StatusBoard'
import TimelineView from '../../components/TimelineView'
import GanttView from '../../components/GanttView'
import { dateFromSchedule } from '../../utils/dates'

const PKG_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warning' }, PICKED_UP: { label: 'Recogido', tone: 'info' },
  IN_TRANSIT: { label: 'En transito', tone: 'info' }, DELIVERED: { label: 'Entregado', tone: 'success' },
  INCIDENT: { label: 'Incidencia', tone: 'danger' }, CANCELLED: { label: 'Cancelado', tone: 'warning' },
}

export default function MyPackagesPage() {
  const location = useLocation()
  const [packages, setPackages] = useState(null)
  const [msg, setMsg] = useState(location.state?.message || null)
  const [view, setView] = useState('grid')

  const load = () => packageService.listMine().then(setPackages).catch((e) => setMsg({ type: 'error', text: apiErrorMessage(e) }))

  useEffect(() => { load() }, [])

  if (packages === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type || 'success'}`}>{typeof msg === 'string' ? msg : msg.text}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2>Mis paquetes ({packages.length})</h2>
        <ViewSwitcher value={view} onChange={setView} />
      </div>
      {packages.length === 0 && <EmptyState icon="📦" title="Sin paquetes" text="Envia un paquete desde 'Solicitar servicio'." />}

      {view === 'grid' && (
        <div className="wg-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
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
      )}

      {view === 'list' && (
        <table className="wg-table">
          <thead>
            <tr><th>Codigo</th><th>Descripcion</th><th>Recorrido</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.trackingCode}</strong></td>
                <td className="wg-muted">{p.description}</td>
                <td className="wg-muted">{p.request.pickupAddress} → {p.request.dropoffAddress}</td>
                <td><StatusBadge value={p.status} map={PKG_STATUS} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'canvas' && (
        <StatusBoard
          items={packages}
          statusMap={PKG_STATUS}
          renderItem={(p) => (
            <div>
              <strong style={{ fontSize: 14 }}>{p.trackingCode}</strong>
              <div className="wg-muted" style={{ fontSize: 12, marginTop: 4 }}>{p.description}</div>
              <div className="wg-muted" style={{ fontSize: 12 }}>{p.request.pickupAddress} → {p.request.dropoffAddress}</div>
            </div>
          )}
        />
      )}

      {view === 'timeline' && (
        <TimelineView
          items={packages}
          getDate={(p) => dateFromSchedule(p.request?.scheduledDate, p.request?.scheduledTime)}
          renderItem={(p) => (
            <div className="wg-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{p.trackingCode}</strong>
                <StatusBadge value={p.status} map={PKG_STATUS} />
              </div>
              <div className="wg-muted" style={{ fontSize: 12, marginTop: 3 }}>{p.description}</div>
            </div>
          )}
        />
      )}

      {view === 'gantt' && (
        <GanttView
          items={packages}
          getStart={(p) => dateFromSchedule(p.request?.scheduledDate, p.request?.scheduledTime)}
          getEnd={(p) => (p.deliveredAt ? new Date(p.deliveredAt) : null)}
          renderLabel={(p) => `${p.trackingCode} · ${p.description}`}
        />
      )}
    </div>
  )
}
