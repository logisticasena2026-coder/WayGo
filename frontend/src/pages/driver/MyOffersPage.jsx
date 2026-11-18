// ============================================================
// WayGo - Mis ofertas (conductor)
// ============================================================
import { useEffect, useState } from 'react'
import { offerService } from '../../services/offer.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, EmptyState } from '../../components/StatusBadge'
import ViewSwitcher from '../../components/ViewSwitcher'
import StatusBoard from '../../components/StatusBoard'
import TimelineView from '../../components/TimelineView'
import GanttView from '../../components/GanttView'
import { dateFromSchedule } from '../../utils/dates'

const OFFER_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  ACCEPTED: { label: 'Aceptada', tone: 'success' },
  REJECTED: { label: 'Rechazada', tone: 'info' },
  WITHDRAWN: { label: 'Retirada', tone: 'info' },
  EXPIRED: { label: 'Expirada', tone: 'info' },
  BLOCKED: { label: 'Bloqueada', tone: 'info' },
}

export default function MyOffersPage() {
  const [offers, setOffers] = useState(null)
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('grid')

  const load = () => offerService.listMine().then(setOffers).catch(() => setOffers([]))

  useEffect(() => { load() }, [])

  const withdraw = async (id) => {
    if (!window.confirm('Retirar esta oferta?')) return
    try { await offerService.withdraw(id); setMsg({ type: 'success', text: 'Oferta retirada' }); load() } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  if (offers === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2>Mis ofertas ({offers.length})</h2>
        <ViewSwitcher value={view} onChange={setView} />
      </div>
      {offers.length === 0 && <EmptyState icon="💬" title="Sin ofertas" text="Oferta en las solicitudes disponibles." />}

      {view === 'grid' && (
        <div className="wg-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {offers.map((o) => (
            <div key={o.id} className="wg-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <strong>Solicitud #{o.request.requestNumber}</strong>
                  <StatusBadge value={o.status} map={OFFER_STATUS} />
                </div>
                <div className="wg-muted" style={{ fontSize: 13, marginTop: 4 }}>{o.request.pickupAddress} → {o.request.dropoffAddress}</div>
                <div className="wg-muted" style={{ fontSize: 13 }}>{new Date(o.request.scheduledDate).toLocaleDateString('es-CO')} {o.request.scheduledTime} · Veh: {o.vehicle.plate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>${Number(o.price).toLocaleString('es-CO')}</div>
                {o.isCounteroffer && <span className="wg-badge wg-badge--warning">Contraoferta</span>}
                {o.status === 'PENDING' && (
                  <button className="wg-btn wg-btn--ghost" style={{ padding: '6px 10px', fontSize: 13, color: 'var(--wg-danger)', marginLeft: 8 }} onClick={() => withdraw(o.id)}>Retirar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'list' && (
        <table className="wg-table">
          <thead>
            <tr><th>Solicitud</th><th>Recorrido</th><th>Fecha</th><th>Vehiculo</th><th>Precio</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td><strong>#{o.request.requestNumber}</strong></td>
                <td className="wg-muted">{o.request.pickupAddress} → {o.request.dropoffAddress}</td>
                <td className="wg-muted">{new Date(o.request.scheduledDate).toLocaleDateString('es-CO')} {o.request.scheduledTime}</td>
                <td className="wg-muted">{o.vehicle.plate}</td>
                <td>${Number(o.price).toLocaleString('es-CO')}</td>
                <td><StatusBadge value={o.status} map={OFFER_STATUS} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'canvas' && (
        <StatusBoard
          items={offers}
          statusMap={OFFER_STATUS}
          renderItem={(o) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>#{o.request.requestNumber}</strong>
                <span style={{ fontWeight: 700, color: 'var(--wg-primary)' }}>${Number(o.price).toLocaleString('es-CO')}</span>
              </div>
              <div className="wg-muted" style={{ fontSize: 12, marginTop: 4 }}>{o.request.pickupAddress} → {o.request.dropoffAddress}</div>
              <div className="wg-muted" style={{ fontSize: 12 }}>{new Date(o.request.scheduledDate).toLocaleDateString('es-CO')} {o.request.scheduledTime}</div>
            </div>
          )}
        />
      )}

      {view === 'timeline' && (
        <TimelineView
          items={offers}
          getDate={(o) => dateFromSchedule(o.request?.scheduledDate, o.request?.scheduledTime)}
          renderItem={(o) => (
            <div className="wg-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>Solicitud #{o.request.requestNumber}</strong>
                <StatusBadge value={o.status} map={OFFER_STATUS} />
              </div>
              <div className="wg-muted" style={{ fontSize: 12, marginTop: 3 }}>{o.request.pickupAddress} → {o.request.dropoffAddress}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--wg-primary)' }}>${Number(o.price).toLocaleString('es-CO')}</div>
            </div>
          )}
        />
      )}

      {view === 'gantt' && (
        <GanttView
          items={offers}
          getStart={(o) => dateFromSchedule(o.request?.scheduledDate, o.request?.scheduledTime)}
          renderLabel={(o) => `Oferta #${o.request.requestNumber} · $${Number(o.price).toLocaleString('es-CO')}`}
        />
      )}
    </div>
  )
}
