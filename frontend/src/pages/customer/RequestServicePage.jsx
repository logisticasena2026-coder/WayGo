// ============================================================
// WayGo - Solicitar servicio (cliente)
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { serviceService } from '../../services/service.service'
import { apiErrorMessage } from '../../services/api'
import AddressInput from '../../components/AddressInput'

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

  const setAddress = (prefix) => ({ address, lat, lng }) =>
    setForm((f) => ({ ...f, [`${prefix}Address`]: address, [`${prefix}Lat`]: lat ?? '', [`${prefix}Lng`]: lng ?? '' }))

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

  return (
    <div className="wg-card" style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 6 }}>Solicitar un servicio</h2>
      <p className="wg-muted" style={{ fontSize: 14, marginBottom: 20 }}>
        Indica origen, destino, fecha y hora, y el precio que estas dispuesto a pagar. Los conductores podran aceptarlo o contraofertar.
      </p>
      {err && <div className="wg-alert wg-alert--error">{err}</div>}

      <form onSubmit={submit}>
        <div className="wg-form-grid">
          <div className="wg-form-grid--half">
            <AddressInput
              label="Direccion de origen *"
              value={form.pickupAddress}
              lat={form.pickupLat}
              lng={form.pickupLng}
              onChange={setAddress('pickup')}
              placeholder="Ej: Calle 100 # 11-22, Bogota"
            />
          </div>
          <div className="wg-form-grid--half">
            <AddressInput
              label="Direccion de destino *"
              value={form.dropoffAddress}
              lat={form.dropoffLat}
              lng={form.dropoffLng}
              onChange={setAddress('dropoff')}
              placeholder="Ej: Aeropuerto El Dorado"
            />
          </div>

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

          <div className="wg-field wg-form-grid--full">
            <label>Observaciones</label>
            <textarea className="wg-input" rows="3" value={form.observations} onChange={set('observations')} placeholder="Detalles adicionales, puntos de referencia..." />
          </div>
        </div>

        <button type="submit" className="wg-btn wg-btn--primary wg-btn--block wg-mt" disabled={saving}>
          {saving ? 'Publicando...' : 'Publicar solicitud'}
        </button>
      </form>
    </div>
  )
}
