// ============================================================
// WayGo - Mis ofertas (conductor)
// ============================================================
import { useEffect, useState } from 'react'
import { offerService } from '../../services/offer.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, EmptyState } from '../../components/StatusBadge'

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
      <h2 style={{ marginBottom: 16 }}>Mis ofertas ({offers.length})</h2>
      {offers.length === 0 && <EmptyState icon="💬" title="Sin ofertas" text="Oferta en las solicitudes disponibles." />}

      <div className="wg-grid" style={{ gap: 12 }}>
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
    </div>
  )
}
