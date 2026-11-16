// ============================================================
// WayGo - Servicio activo del conductor (llegada/inicio/fin)
// ============================================================
import { useEffect, useState } from 'react'
import { assignmentService } from '../../services/assignment.service'
import { apiErrorMessage } from '../../services/api'
import { EmptyState } from '../../components/StatusBadge'

export default function ActiveServicePage() {
  const [assignment, setAssignment] = useState(null)
  const [km, setKm] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => assignmentService.active().then((a) => { setAssignment(a); setLoading(false) }).catch(() => setLoading(false))

  useEffect(() => { load() }, [])

  const action = async (fn, label) => {
    setMsg(null)
    try { await fn(); setMsg({ type: 'success', text: label }); load() } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  if (loading) return <div className="wg-loading"><div className="wg-spinner" /></div>
  if (!assignment) return <div className="wg-card"><EmptyState icon="🚗" title="Sin servicio activo" text="Cuando aceptes o te asignen un servicio, aparecera aqui." /></div>

  const status = assignment.status
  const step = status === 'ASSIGNED' ? 1 : status === 'DRIVER_EN_ROUTE' ? 2 : 3

  return (
    <div className="wg-card" style={{ maxWidth: 620 }}>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}
      <h2>Servicio activo</h2>
      <div className="wg-muted" style={{ fontSize: 14, marginTop: 6 }}>
        Solicitud #{assignment.request.requestNumber}<br />
        📍 {assignment.request.pickupAddress} → 🏁 {assignment.request.dropoffAddress}<br />
        🕐 {new Date(assignment.request.scheduledDate).toLocaleDateString('es-CO')} {assignment.request.scheduledTime}<br />
        💰 ${Number(assignment.agreedPrice).toLocaleString('es-CO')} · Vehiculo: {assignment.vehicle.brand} {assignment.vehicle.plate}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'center' }}>
        <Step n={1} active={step === 1} done={step > 1} label="Asignado" />
        <Divider />
        <Step n={2} active={step === 2} done={step > 2} label="En camino" />
        <Divider />
        <Step n={3} active={step === 3} done={false} label="En servicio" />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {status === 'ASSIGNED' && <button className="wg-btn wg-btn--primary" onClick={() => action(() => assignmentService.arrive(assignment.id), 'Llegada registrada')}>🚗 Confirmar llegada</button>}
        {(status === 'ASSIGNED' || status === 'DRIVER_EN_ROUTE') && <button className="wg-btn wg-btn--primary" onClick={() => action(() => assignmentService.start(assignment.id), 'Servicio iniciado')}>▶️ Iniciar servicio</button>}
        {status === 'IN_SERVICE' && (
          <>
            <div className="wg-field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>Kilometros recorridos</label>
              <input className="wg-input" type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0" />
            </div>
            <button className="wg-btn wg-btn--primary" onClick={() => action(() => assignmentService.complete(assignment.id, km ? Number(km) : undefined), 'Servicio finalizado')}>✅ Finalizar servicio</button>
          </>
        )}
      </div>
    </div>
  )
}

function Step({ n, active, done, label }) {
  const bg = done ? 'var(--wg-success)' : active ? 'var(--wg-primary)' : 'var(--wg-gray-200)'
  const color = done || active ? '#fff' : 'var(--wg-gray-600)'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 700 }}>{done ? '✓' : n}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Divider() { return <div style={{ flex: 1, height: 2, background: 'var(--wg-gray-200)' }} /> }
