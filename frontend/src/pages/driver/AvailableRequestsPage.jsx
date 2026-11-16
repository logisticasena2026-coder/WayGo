// ============================================================
// WayGo - Solicitudes disponibles (conductor)
// ============================================================
import { useEffect, useState } from 'react'
import { serviceService } from '../../services/service.service'
import { driverService } from '../../services/driver.service'
import { apiErrorMessage } from '../../services/api'
import { EmptyState } from '../../components/StatusBadge'
import { useNotifications } from '../../hooks/useNotifications'

export default function AvailableRequestsPage() {
  const [requests, setRequests] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [offerForm, setOfferForm] = useState({})
  const [msg, setMsg] = useState(null)
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

      <h2 style={{ marginBottom: 16 }}>Solicitudes disponibles ({requests.length})</h2>
      {requests.length === 0 && <EmptyState icon="🔔" title="No hay solicitudes" text="Cuando un cliente publique una solicitud aparecera aqui." />}

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
    </div>
  )
}
