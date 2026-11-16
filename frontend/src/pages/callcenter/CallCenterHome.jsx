// ============================================================
// WayGo - Centro de control (call center)
// Dashboard + mapa operativo + asignacion manual + tickets
// ============================================================
import { useEffect, useState } from 'react'
import { callCenterService } from '../../services/callcenter.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP, EmptyState } from '../../components/StatusBadge'
import OperationalMap from '../../components/OperationalMap'

const REQ_STATUS = {
  DRAFT: { label: 'Borrador', tone: 'info' }, PUBLISHED: { label: 'Publicada', tone: 'info' },
  RECEIVING_OFFERS: { label: 'Con ofertas', tone: 'info' }, ASSIGNED: { label: 'Asignada', tone: 'success' },
  EN_ROUTE: { label: 'En camino', tone: 'warning' }, IN_SERVICE: { label: 'En servicio', tone: 'warning' },
  COMPLETED: { label: 'Completada', tone: 'success' }, CANCELLED: { label: 'Cancelada', tone: 'warning' },
}

export default function CallCenterHome() {
  const [dash, setDash] = useState(null)
  const [map, setMap] = useState({ drivers: [], requests: [] })
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [tickets, setTickets] = useState([])
  const [msg, setMsg] = useState(null)
  const [assignPrice, setAssignPrice] = useState('')

  const load = async () => {
    try {
      const [d, m, t] = await Promise.all([
        callCenterService.dashboard(),
        callCenterService.map(),
        callCenterService.listTickets({ pageSize: 30 }),
      ])
      setDash(d); setMap(m); setTickets(t.items)
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  useEffect(() => { load() }, [])

  const onDriverClick = async (d) => {
    try { const detail = await callCenterService.driverDetail(d.userId); setSelectedDriver(detail) } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const onRequestClick = async (r) => {
    try { const detail = await callCenterService.requestDetail(r.id); setSelectedRequest(detail) } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const assign = async (requestId, driverId) => {
    if (!driverId) return setMsg({ type: 'error', text: 'Selecciona un conductor disponible' })
    setMsg(null)
    try {
      await callCenterService.assign(requestId, driverId, assignPrice ? Number(assignPrice) : undefined)
      setMsg({ type: 'success', text: 'Servicio asignado manualmente' })
      setAssignPrice(''); setSelectedRequest(null); setSelectedDriver(null); load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const resolveTicket = async (id, status) => {
    try { await callCenterService.updateTicket(id, { status, resolution: status === 'RESOLVED' ? 'Resuelto por call center' : '' }); load() } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const openDrivers = map.drivers.filter((d) => d.operationalStatus === 'AVAILABLE')

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      {dash && (
        <div className="wg-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
          <Card label="Conductores conectados" value={dash.connected.drivers} />
          <Card label="Disponibles" value={dash.drivers.available} tone="success" />
          <Card label="Ocupados" value={dash.drivers.busy} tone="warning" />
          <Card label="Clientes conectados" value={dash.connected.customers} />
          <Card label="Solicitudes nuevas" value={dash.requests.new} tone="info" />
          <Card label="Servicios en ejecucion" value={dash.services.inExecution} tone="warning" />
          <Card label="Completados" value={dash.services.completed} tone="success" />
          <Card label="Incidentes abiertos" value={dash.incidents.open} tone="danger" />
        </div>
      )}

      <div className="wg-grid wg-grid--2" style={{ alignItems: 'start' }}>
        <div className="wg-card" style={{ height: 520, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', fontWeight: 700 }}>Mapa operativo</div>
          <div style={{ flex: 1 }}>
            <OperationalMap drivers={map.drivers} requests={map.requests} onDriverClick={onDriverClick} onRequestClick={onRequestClick} />
          </div>
        </div>

        <div>
          <div className="wg-card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Asignacion manual</h3>
            {selectedRequest ? (
              <div>
                <p className="wg-muted" style={{ fontSize: 13 }}>Solicitud #{selectedRequest.requestNumber} · {selectedRequest.pickupAddress} → {selectedRequest.dropoffAddress}</p>
                <div className="wg-field wg-mt">
                  <label>Conductor disponible</label>
                  <select className="wg-input" value={selectedDriver?.userId || ''} onChange={(e) => { const d = map.drivers.find((x) => x.userId === e.target.value); setSelectedDriver(d) }}>
                    <option value="">Seleccionar...</option>
                    {openDrivers.map((d) => <option key={d.userId} value={d.userId}>{d.name} ({d.vehicle?.plate})</option>)}
                  </select>
                </div>
                <div className="wg-field">
                  <label>Precio (vacio = propuesto ${selectedRequest.proposedPrice})</label>
                  <input className="wg-input" type="number" value={assignPrice} onChange={(e) => setAssignPrice(e.target.value)} />
                </div>
                <button className="wg-btn wg-btn--primary wg-btn--block" onClick={() => assign(selectedRequest.id, selectedDriver?.userId)}>Asignar</button>
              </div>
            ) : (
              <EmptyState icon="👆" title="Selecciona una solicitud" text="Haz clic en un marcador del mapa (origen/destino)." />
            )}
          </div>

          <div className="wg-card">
            <h3 style={{ marginBottom: 12 }}>Incidentes / novedades ({tickets.length})</h3>
            {tickets.filter((t) => t.status !== 'CLOSED').slice(0, 8).map((t) => (
              <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--wg-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 14 }}>{t.subject}</strong>
                  <div className="wg-muted" style={{ fontSize: 12 }}>#{t.ticketNumber} · {t.reporter?.profile?.firstName}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusBadge value={t.status} map={{ OPEN: { label: 'Abierto', tone: 'warning' }, IN_PROGRESS: { label: 'En curso', tone: 'info' }, ESCALATED: { label: 'Escalado', tone: 'danger' }, RESOLVED: { label: 'Resuelto', tone: 'success' }, CLOSED: { label: 'Cerrado', tone: 'info' } }} />
                  {t.status === 'OPEN' && <button className="wg-btn wg-btn--ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => resolveTicket(t.id, 'RESOLVED')}>Resolver</button>}
                </div>
              </div>
            ))}
            {tickets.length === 0 && <EmptyState icon="✅" title="Sin novedades" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, tone = 'info' }) {
  return (
    <div className="wg-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: `var(--wg-${tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : 'primary'})` }}>{value}</div>
      <div className="wg-muted" style={{ fontSize: 13 }}>{label}</div>
    </div>
  )
}
