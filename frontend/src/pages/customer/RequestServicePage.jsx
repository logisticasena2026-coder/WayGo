// ============================================================
// WayGo - Solicitar servicio (cliente)
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { serviceService } from '../../services/service.service'
import { apiErrorMessage } from '../../services/api'

const today = () => new Date().toISOString().slice(0, 10)

const INITIAL = {
  pickupAddress: '', pickupLat: '', pickupLng: '',
  dropoffAddress: '', dropoffLat: '', dropoffLng: '',
  scheduledDate: '', scheduledTime: '', passengerCount: 1,
  observations: '', proposedPrice: '',
}

export default function RequestServicePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setErr(null); setSaving(true)
    try {
      const payload = {
        ...form,
        serviceType: 'PASSENGER',
        passengerCount: Number(form.passengerCount) || 1,
        proposedPrice: Number(form.proposedPrice),
        pickupLat: form.pickupLat || undefined,
        pickupLng: form.pickupLng || undefined,
        dropoffLat: form.dropoffLat || undefined,
        dropoffLng: form.dropoffLng || undefined,
      }
      const req = await serviceService.create(payload)
      await serviceService.publish(req.id)
      navigate('/panel/servicios', { state: { message: `Solicitud #${req.requestNumber} publicada` } })
    } catch (e2) {
      setErr(apiErrorMessage(e2, 'No se pudo publicar la solicitud'))
    } finally { setSaving(false) }
  }

  const coordFields = [
    { lat: 'pickupLat', lng: 'pickupLng' },
    { lat: 'dropoffLat', lng: 'dropoffLng' },
  ]

  return (
    <div className="wg-card" style={{ maxWidth: 760 }}>
      <h2 style={{ marginBottom: 6 }}>Solicitar un servicio</h2>
      <p className="wg-muted" style={{ fontSize: 14, marginBottom: 20 }}>
        Indica origen, destino, fecha y hora, y el precio que estas dispuesto a pagar. Los conductores podran aceptarlo o contraofertar.
      </p>
      {err && <div className="wg-alert wg-alert--error">{err}</div>}

      <form onSubmit={submit}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>Lugar de recogida</h3>
        <div className="wg-field">
          <label>Direccion de origen *</label>
          <input className="wg-input" value={form.pickupAddress} onChange={set('pickupAddress')} placeholder="Ej: Calle 100 # 11-22, Bogota" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="wg-field"><label>Latitud (opcional)</label><input className="wg-input" value={form.pickupLat} onChange={set('pickupLat')} placeholder="4.6814" /></div>
          <div className="wg-field"><label>Longitud (opcional)</label><input className="wg-input" value={form.pickupLng} onChange={set('pickupLng')} placeholder="-74.0464" /></div>
        </div>

        <h3 style={{ fontSize: 15, margin: '18px 0 10px' }}>Destino</h3>
        <div className="wg-field">
          <label>Direccion de destino *</label>
          <input className="wg-input" value={form.dropoffAddress} onChange={set('dropoffAddress')} placeholder="Ej: Aeropuerto El Dorado" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="wg-field"><label>Latitud (opcional)</label><input className="wg-input" value={form.dropoffLat} onChange={set('dropoffLat')} placeholder="4.7016" /></div>
          <div className="wg-field"><label>Longitud (opcional)</label><input className="wg-input" value={form.dropoffLng} onChange={set('dropoffLng')} placeholder="-74.1469" /></div>
        </div>

        <h3 style={{ fontSize: 15, margin: '18px 0 10px' }}>Programacion y precio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div className="wg-field">
            <label>Fecha *</label>
            <input className="wg-input" type="date" min={today()} value={form.scheduledDate} onChange={set('scheduledDate')} required />
          </div>
          <div className="wg-field">
            <label>Hora *</label>
            <input className="wg-input" type="time" value={form.scheduledTime} onChange={set('scheduledTime')} required />
          </div>
          <div className="wg-field">
            <label>Pasajeros</label>
            <input className="wg-input" type="number" min="1" max="50" value={form.passengerCount} onChange={set('passengerCount')} />
          </div>
          <div className="wg-field">
            <label>Precio propuesto (COP) *</label>
            <input className="wg-input" type="number" min="1" step="1000" value={form.proposedPrice} onChange={set('proposedPrice')} placeholder="45000" required />
          </div>
        </div>

        <div className="wg-field">
          <label>Observaciones</label>
          <textarea className="wg-input" rows="3" value={form.observations} onChange={set('observations')} placeholder="Detalles adicionales, puntos de referencia..." />
        </div>

        <button type="submit" className="wg-btn wg-btn--primary wg-btn--block" disabled={saving}>
          {saving ? 'Publicando...' : 'Publicar solicitud'}
        </button>
      </form>
    </div>
  )
}
