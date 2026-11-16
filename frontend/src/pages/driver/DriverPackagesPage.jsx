// ============================================================
// WayGo - Paquetes asignados (conductor)
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { packageService } from '../../services/package.service'
import { StatusBadge, EmptyState } from '../../components/StatusBadge'
import { apiErrorMessage } from '../../services/api'

const PKG_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warning' }, PICKED_UP: { label: 'Recogido', tone: 'info' },
  IN_TRANSIT: { label: 'En transito', tone: 'info' }, DELIVERED: { label: 'Entregado', tone: 'success' }, INCIDENT: { label: 'Incidencia', tone: 'danger' },
}

export default function DriverPackagesPage() {
  const [packages, setPackages] = useState(null)
  const [msg, setMsg] = useState(null)
  const [delivering, setDelivering] = useState(null)
  const fileRef = useRef(null)
  const [evidence, setEvidence] = useState({ receivedBy: '', receiverDocument: '', notes: '' })

  const load = () => packageService.listDriver().then(setPackages).catch(() => setPackages([]))
  useEffect(() => { load() }, [])

  const act = async (fn, label) => {
    setMsg(null)
    try { await fn(); setMsg({ type: 'success', text: label }); load() } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const deliver = async (id) => {
    if (!evidence.receivedBy) return setMsg({ type: 'error', text: 'Indica quien recibe' })
    setMsg(null)
    try {
      await packageService.deliver(id, evidence, fileRef.current?.files?.[0])
      setMsg({ type: 'success', text: 'Paquete entregado con evidencia' })
      setDelivering(null); setEvidence({ receivedBy: '', receiverDocument: '', notes: '' }); load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  if (packages === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}
      <h2 style={{ marginBottom: 16 }}>Paquetes asignados ({packages.length})</h2>
      {packages.length === 0 && <EmptyState icon="📦" title="Sin paquetes asignados" />}
      <div className="wg-grid" style={{ gap: 12 }}>
        {packages.map((p) => (
          <div key={p.id} className="wg-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{p.trackingCode}</strong>
                <div className="wg-muted" style={{ fontSize: 13 }}>{p.description} · {p.weightKg} kg</div>
                <div className="wg-muted" style={{ fontSize: 13 }}>{p.request.pickupAddress} → {p.request.dropoffAddress}</div>
                <div className="wg-muted" style={{ fontSize: 12 }}>Recibe: {p.recipientName} {p.recipientPhone && `· ${p.recipientPhone}`}</div>
              </div>
              <StatusBadge value={p.status} map={PKG_STATUS} />
            </div>

            {delivering === p.id ? (
              <div className="wg-mt" style={{ borderTop: '1px solid var(--wg-gray-100)', paddingTop: 10 }}>
                <div className="wg-field"><label>Quien recibe *</label><input className="wg-input" value={evidence.receivedBy} onChange={(e) => setEvidence({ ...evidence, receivedBy: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="wg-field"><label>Documento</label><input className="wg-input" value={evidence.receiverDocument} onChange={(e) => setEvidence({ ...evidence, receiverDocument: e.target.value })} /></div>
                  <div className="wg-field"><label>Foto evidencia</label><input className="wg-input" type="file" accept="image/*" ref={fileRef} /></div>
                </div>
                <button className="wg-btn wg-btn--primary" onClick={() => deliver(p.id)}>Confirmar entrega</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {p.status === 'PENDING' && <button className="wg-btn wg-btn--primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => act(() => packageService.pickup(p.id), 'Paquete recogido')}>📦 Recoger</button>}
                {p.status === 'PICKED_UP' && <button className="wg-btn wg-btn--primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => act(() => packageService.inTransit(p.id), 'En transito')}>🚚 En transito</button>}
                {['PICKED_UP', 'IN_TRANSIT'].includes(p.status) && <button className="wg-btn wg-btn--outline" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setDelivering(p.id)}>✅ Entregar</button>}
                {['PENDING', 'PICKED_UP', 'IN_TRANSIT'].includes(p.status) && <button className="wg-btn wg-btn--ghost" style={{ padding: '8px 14px', fontSize: 13, color: 'var(--wg-danger)' }} onClick={() => act(() => packageService.incident(p.id), 'Incidencia registrada')}>⚠️ Incidencia</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
