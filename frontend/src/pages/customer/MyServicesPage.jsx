// ============================================================
// WayGo - Mis solicitudes (cliente): lista, ofertas y aceptacion
// ============================================================
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { serviceService } from '../../services/service.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP, EmptyState } from '../../components/StatusBadge'
import { useNotifications } from '../../hooks/useNotifications'
import ViewSwitcher from '../../components/ViewSwitcher'
import StatusBoard from '../../components/StatusBoard'
import TimelineView from '../../components/TimelineView'
import GanttView from '../../components/GanttView'
import { dateFromSchedule } from '../../utils/dates'

const REQUEST_STATUS = {
  DRAFT: { label: 'Borrador', tone: 'info' },
  PUBLISHED: { label: 'Publicada', tone: 'info' },
  RECEIVING_OFFERS: { label: 'Recibiendo ofertas', tone: 'info' },
  OFFERED: { label: 'Con ofertas', tone: 'info' },
  ACCEPTED: { label: 'Aceptada', tone: 'success' },
  ASSIGNED: { label: 'Asignada', tone: 'success' },
  EN_ROUTE: { label: 'En camino', tone: 'warning' },
  IN_SERVICE: { label: 'En servicio', tone: 'warning' },
  COMPLETED: { label: 'Completada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'warning' },
  EXPIRED: { label: 'Expirada', tone: 'warning' },
}

export default function MyServicesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [requests, setRequests] = useState(null)
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState(location.state?.message || null)
  const [view, setView] = useState('grid')
  const { notifications } = useNotifications()

  const load = () => serviceService.listMine().then(setRequests).catch(() => setRequests([]))

  useEffect(() => { load() }, [])

  // Refresca al recibir una notificacion en tiempo real
  useEffect(() => {
    if (notifications.length > 0) load()
  }, [notifications])

  const open = async (id) => {
    const r = await serviceService.get(id)
    setSelected(r)
  }

  const publish = async (id) => {
    try { await serviceService.publish(id); setMsg({ type: 'success', text: 'Solicitud publicada' }); load() } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const withdraw = async (id) => {
    if (!window.confirm('Retirar esta solicitud?')) return
    try { await serviceService.withdraw(id, 'Retirada por el cliente'); setMsg({ type: 'success', text: 'Solicitud retirada' }); setSelected(null); load() } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const accept = async (requestId, offerId) => {
    try {
      const res = await serviceService.acceptOffer(requestId, offerId)
      setMsg({ type: 'success', text: res.message })
      setSelected(null); load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e, 'No se pudo aceptar la oferta') }) }
  }

  if (requests === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type || 'success'}`}>{typeof msg === 'string' ? msg : msg.text}</div>}

      <div className="wg-grid wg-grid--2">
        <div className="wg-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2>Mis solicitudes ({requests.length})</h2>
            <ViewSwitcher value={view} onChange={setView} />
          </div>
          {requests.length === 0 && <EmptyState icon="📋" title="Aun no tienes solicitudes" text="Crea una solicitud para comenzar." />}

          {view === 'grid' && (
            <div className="wg-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {requests.map((r) => (
                <button key={r.id} onClick={() => open(r.id)} className="wg-card" style={{ textAlign: 'left', cursor: 'pointer', padding: 16, border: 'none', fontFamily: 'inherit', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>#{r.requestNumber} · {r.serviceType.name}</strong>
                    <StatusBadge value={r.status} map={REQUEST_STATUS} />
                  </div>
                  <div className="wg-muted" style={{ fontSize: 13, marginTop: 4 }}>{r.pickupAddress} → {r.dropoffAddress}</div>
                  <div className="wg-muted" style={{ fontSize: 13 }}>{new Date(r.scheduledDate).toLocaleDateString('es-CO')} {r.scheduledTime} · {Number(r.proposedPrice).toLocaleString('es-CO')} COP · {r.offers.length} oferta(s)</div>
                </button>
              ))}
            </div>
          )}

          {view === 'list' && (
            <table className="wg-table">
              <thead>
                <tr><th>#</th><th>Tipo</th><th>Recorrido</th><th>Fecha/Hora</th><th>Precio</th><th>Ofertas</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} onClick={() => open(r.id)} style={{ cursor: 'pointer' }}>
                    <td>{r.requestNumber}</td>
                    <td>{r.serviceType.name}</td>
                    <td className="wg-muted">{r.pickupAddress} → {r.dropoffAddress}</td>
                    <td className="wg-muted">{new Date(r.scheduledDate).toLocaleDateString('es-CO')} {r.scheduledTime}</td>
                    <td>${Number(r.proposedPrice).toLocaleString('es-CO')}</td>
                    <td>{r.offers.length}</td>
                    <td><StatusBadge value={r.status} map={REQUEST_STATUS} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === 'canvas' && (
            <StatusBoard
              items={requests}
              statusMap={REQUEST_STATUS}
              onItemClick={(r) => open(r.id)}
              renderItem={(r) => (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14 }}>#{r.requestNumber}</strong>
                    <span className="wg-muted" style={{ fontSize: 12 }}>{r.offers.length} ofertas</span>
                  </div>
                  <div className="wg-muted" style={{ fontSize: 12, marginTop: 4 }}>{r.pickupAddress} → {r.dropoffAddress}</div>
                  <div className="wg-muted" style={{ fontSize: 12 }}>{new Date(r.scheduledDate).toLocaleDateString('es-CO')} {r.scheduledTime}</div>
                </div>
              )}
            />
          )}

          {view === 'timeline' && (
            <TimelineView
              items={requests}
              getDate={(r) => dateFromSchedule(r.scheduledDate, r.scheduledTime)}
              renderItem={(r) => (
                <div className="wg-card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => open(r.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 13 }}>#{r.requestNumber} · {r.serviceType.name}</strong>
                    <StatusBadge value={r.status} map={REQUEST_STATUS} />
                  </div>
                  <div className="wg-muted" style={{ fontSize: 12, marginTop: 3 }}>{r.pickupAddress} → {r.dropoffAddress}</div>
                </div>
              )}
            />
          )}

          {view === 'gantt' && (
            <GanttView
              items={requests}
              getStart={(r) => dateFromSchedule(r.scheduledDate, r.scheduledTime)}
              renderLabel={(r) => `#${r.requestNumber} ${r.serviceType.name}`}
            />
          )}
        </div>

        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Detalle</h2>
          {!selected && <EmptyState icon="👈" title="Selecciona una solicitud" text="Aqui veras las ofertas de los conductores y podras aceptar la mejor." />}

          {selected && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Solicitud #{selected.requestNumber}</strong>
                  <StatusBadge value={selected.status} map={REQUEST_STATUS} />
                </div>
                <p className="wg-muted" style={{ fontSize: 13, marginTop: 4 }}>{selected.pickupAddress} → {selected.dropoffAddress}</p>
                <p className="wg-muted" style={{ fontSize: 13 }}>{new Date(selected.scheduledDate).toLocaleDateString('es-CO')} {selected.scheduledTime} · Precio propuesto: ${Number(selected.proposedPrice).toLocaleString('es-CO')}</p>
              </div>

              {selected.status === 'DRAFT' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="wg-btn wg-btn--primary" onClick={() => publish(selected.id)}>Publicar</button>
                  <button className="wg-btn wg-btn--ghost" onClick={() => withdraw(selected.id)}>Eliminar</button>
                </div>
              )}

              {['PUBLISHED', 'RECEIVING_OFFERS', 'OFFERED'].includes(selected.status) && (
                <button className="wg-btn wg-btn--outline" style={{ color: 'var(--wg-danger)', borderColor: 'var(--wg-danger)' }} onClick={() => withdraw(selected.id)}>Retirar solicitud</button>
              )}

              <h3 style={{ fontSize: 15, margin: '16px 0 8px' }}>Ofertas ({selected.offers?.length || 0})</h3>
              {(!selected.offers || selected.offers.length === 0) && <p className="wg-muted" style={{ fontSize: 13 }}>Aun no hay ofertas.</p>}

              <div className="wg-grid" style={{ gap: 12 }}>
                {selected.offers?.map((o) => (
                  <div key={o.id} className="wg-card" style={{ padding: 16, border: o.status === 'ACCEPTED' ? '2px solid var(--wg-success)' : '1px solid var(--wg-gray-200)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {o.driver.profile.photoUrl ? <img src={o.driver.profile.photoUrl} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} /> : <div className="wg-avatar" style={{ width: 48, height: 48 }}>{o.driver.profile.firstName?.[0]}</div>}
                      <div style={{ flex: 1 }}>
                        <strong>{o.driver.profile.firstName} {o.driver.profile.lastName}</strong>
                        <div style={{ fontSize: 13 }} className="wg-muted">
                          ★ {o.driver.driverProfile?.averageRating ? Number(o.driver.driverProfile.averageRating).toFixed(2) : 'n/a'} · {o.driver.driverProfile?.totalTrips || 0} servicios
                        </div>
                        <div style={{ fontSize: 13 }}>{o.vehicle.brand} {o.vehicle.model} · {o.vehicle.color} · {o.vehicle.plate}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--wg-primary)' }}>${Number(o.price).toLocaleString('es-CO')}</div>
                        {o.etaMinutes && <div className="wg-muted" style={{ fontSize: 12 }}>≈ {o.etaMinutes} min</div>}
                      </div>
                    </div>
                    {o.message && <p className="wg-muted" style={{ fontSize: 13, marginTop: 8 }}>“{o.message}”</p>}
                    {o.isCounteroffer && <span className="wg-badge wg-badge--warning" style={{ marginTop: 8 }}>Contraoferta</span>}
                    {o.status === 'PENDING' && selected.status !== 'ASSIGNED' && (
                      <button className="wg-btn wg-btn--primary wg-btn--block wg-mt" onClick={() => accept(selected.id, o.id)}>Aceptar esta oferta</button>
                    )}
                    {o.status === 'ACCEPTED' && <span className="wg-badge wg-badge--success wg-mt">Aceptada</span>}
                    {o.status === 'BLOCKED' && <span className="wg-badge wg-badge--warning wg-mt">Bloqueada</span>}
                  </div>
                ))}
              </div>

              {selected.assignment && (
                <div className="wg-alert wg-alert--success wg-mt">
                  Servicio asignado. Conductor: {selected.assignment.driver?.profile?.firstName} {selected.assignment.driver?.profile?.lastName}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
