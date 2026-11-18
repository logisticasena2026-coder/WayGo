// ============================================================
// WayGo - Solicitudes disponibles (conductor)
// ============================================================
import { useEffect, useState } from 'react'
import { serviceService } from '../../services/service.service'
import { driverService } from '../../services/driver.service'
import { apiErrorMessage } from '../../services/api'
import { EmptyState, StatusBadge } from '../../components/StatusBadge'
import { useNotifications } from '../../hooks/useNotifications'
import ViewSwitcher from '../../components/ViewSwitcher'
import StatusBoard from '../../components/StatusBoard'
import TimelineView from '../../components/TimelineView'
import GanttView from '../../components/GanttView'
import { dateFromSchedule } from '../../utils/dates'

const REQ_STATUS = {
  PUBLISHED: { label: 'Publicada', tone: 'info' },
  RECEIVING_OFFERS: { label: 'Con ofertas', tone: 'info' },
}

export default function AvailableRequestsPage() {
  const [requests, setRequests] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [offerForm, setOfferForm] = useState({})
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('grid')
  const { notifications } = useNotifications()

  const load = async () => {
    try {
      const [reqs, vehs] = await Promise.all([serviceService.listAvailable(), driverService.getProfile().then((d) => d.vehicles)])
      setRequests(reqs)
      setVehicles(vehs.filter((v) => v.isActive))
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (notifications.length > 0) load() }, [notifications])

  const setOffer = (id, k, v) => setOfferForm((f) => ({ ...f, [id]: { ...f[id], [k]: v } }))

  const submitOffer = async (requestId) => {
    const f = offerForm[requestId] || {}
    if (!f.vehicleId) return setMsg({ type: 'error', text: 'Selecciona un vehiculo' })
    if (!f.price || Number(f.price) <= 0) return setMsg({ type: 'error', text: 'Indica un precio valido' })
    setMsg(null)
    try {
      await serviceService.createOffer(requestId, { vehicleId: f.vehicleId, price: Number(f.price), etaMinutes: f.etaMinutes ? Number(f.etaMinutes) : undefined, message: f.message })
      setMsg({ type: 'success', text: 'Oferta enviada' })
      load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e, 'No se pudo enviar la oferta') }) }
  }

  if (requests === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2>Solicitudes disponibles ({requests.length})</h2>
        <ViewSwitcher value={view} onChange={setView} />
      </div>
      {requests.length === 0 && <EmptyState icon="🔔" title="No hay solicitudes" text="Cuando un cliente publique una solicitud aparecera aqui." />}

      {view === 'grid' && (
        <div className="wg-grid" style={{ gap: 14 }}>
          {requests.map((r) => {
            const mine = r.offers?.find((o) => o.status === 'PENDING')
            const f = offerForm[r.id] || {}
            return (
              <div key={r.id} className="wg-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong>#{r.requestNumber} · {r.serviceType.name}</strong>
                    <span className="wg-muted" style={{ fontSize: 13, marginLeft: 8 }}>{r.customer.profile?.firstName} {r.customer.profile?.lastName}</span>
                  </div>
                  <span className="wg-badge wg-badge--info" style={{ fontSize: 15 }}>${Number(r.proposedPrice).toLocaleString('es-CO')}</span>
                </div>
                <div className="wg-muted" style={{ fontSize: 14, marginTop: 6 }}>📍 {r.pickupAddress}</div>
                <div className="wg-muted" style={{ fontSize: 14 }}>🏁 {r.dropoffAddress}</div>
                <div className="wg-muted" style={{ fontSize: 13, marginTop: 6 }}>
                  🕐 {new Date(r.scheduledDate).toLocaleDateString('es-CO')} {r.scheduledTime} · {r.passengerCount || 1} pasajero(s)
                </div>
                {r.observations && <p className="wg-muted" style={{ fontSize: 13, marginTop: 4 }}>Obs: {r.observations}</p>}

                {mine ? (
                  <div className="wg-alert wg-alert--info wg-mt">Ya ofertaste ${Number(mine.price).toLocaleString('es-CO')} (puedes actualizarla abajo).</div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
                  <div className="wg-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12 }}>Vehiculo</label>
                    <select className="wg-input" value={f.vehicleId || ''} onChange={(e) => setOffer(r.id, 'vehicleId', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} · {v.brand}</option>)}
                    </select>
                  </div>
                  <div className="wg-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12 }}>Precio (COP)</label>
                    <input className="wg-input" type="number" min="1" placeholder={String(r.proposedPrice)} value={f.price || ''} onChange={(e) => setOffer(r.id, 'price', e.target.value)} />
                  </div>
                  <div className="wg-field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12 }}>Llegada (min)</label>
                    <input className="wg-input" type="number" min="1" placeholder="10" value={f.etaMinutes || ''} onChange={(e) => setOffer(r.id, 'etaMinutes', e.target.value)} />
                  </div>
                </div>
                <div className="wg-field wg-mt" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Mensaje (opcional)</label>
                  <input className="wg-input" value={f.message || ''} onChange={(e) => setOffer(r.id, 'message', e.target.value)} placeholder="Estoy cerca, llego rapido" />
                </div>
                <button className="wg-btn wg-btn--primary wg-btn--block wg-mt" onClick={() => submitOffer(r.id)}>
                  {mine ? 'Actualizar oferta' : 'Enviar oferta'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {view === 'list' && (
        <table className="wg-table">
          <thead>
            <tr><th>#</th><th>Cliente</th><th>Recorrido</th><th>Fecha</th><th>Precio</th><th>Accion</th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.requestNumber}</td>
                <td>{r.customer.profile?.firstName} {r.customer.profile?.lastName}</td>
                <td className="wg-muted">{r.pickupAddress} → {r.dropoffAddress}</td>
                <td className="wg-muted">{new Date(r.scheduledDate).toLocaleDateString('es-CO')} {r.scheduledTime}</td>
                <td>${Number(r.proposedPrice).toLocaleString('es-CO')}</td>
                <td><button className="wg-btn wg-btn--outline" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setView('grid')}>Ofertar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'canvas' && (
        <StatusBoard
          items={requests}
          statusMap={REQ_STATUS}
          getStatus={(r) => (r.offers?.some((o) => o.status === 'PENDING') ? 'RECEIVING_OFFERS' : 'PUBLISHED')}
          renderItem={(r) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>#{r.requestNumber}</strong>
                <span style={{ fontWeight: 700, color: 'var(--wg-primary)' }}>${Number(r.proposedPrice).toLocaleString('es-CO')}</span>
              </div>
              <div className="wg-muted" style={{ fontSize: 12, marginTop: 4 }}>{r.pickupAddress} → {r.dropoffAddress}</div>
              <button className="wg-btn wg-btn--outline wg-btn--block wg-mt" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setView('grid')}>Ofertar</button>
            </div>
          )}
        />
      )}

      {view === 'timeline' && (
        <TimelineView
          items={requests}
          getDate={(r) => dateFromSchedule(r.scheduledDate, r.scheduledTime)}
          renderItem={(r) => (
            <div className="wg-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>#{r.requestNumber} · {r.customer.profile?.firstName}</strong>
                <StatusBadge value={r.status} map={REQ_STATUS} />
              </div>
              <div className="wg-muted" style={{ fontSize: 12, marginTop: 3 }}>{r.pickupAddress} → {r.dropoffAddress}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--wg-primary)' }}>${Number(r.proposedPrice).toLocaleString('es-CO')}</div>
            </div>
          )}
        />
      )}

      {view === 'gantt' && (
        <GanttView
          items={requests}
          getStart={(r) => dateFromSchedule(r.scheduledDate, r.scheduledTime)}
          renderLabel={(r) => `#${r.requestNumber} ${r.customer.profile?.firstName || ''}`}
        />
      )}
    </div>
  )
}
