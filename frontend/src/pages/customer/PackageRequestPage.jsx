// ============================================================
// WayGo - Solicitar envio de paquete (cliente)
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { packageService } from '../../services/package.service'
import { serviceService } from '../../services/service.service'
import { apiErrorMessage } from '../../services/api'
import AddressInput from '../../components/AddressInput'

const today = () => new Date().toISOString().slice(0, 10)

export default function PackageRequestPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ senderName: '', recipientName: '', recipientPhone: '', pickupAddress: '', pickupLat: '', pickupLng: '', dropoffAddress: '', dropoffLat: '', dropoffLng: '', description: '', weightKg: '', dimensions: '', declaredValue: '', scheduledDate: '', scheduledTime: '', proposedPrice: '' })
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const setAddress = (prefix) => ({ address, lat, lng }) =>
    setForm((f) => ({ ...f, [`${prefix}Address`]: address, [`${prefix}Lat`]: lat ?? '', [`${prefix}Lng`]: lng ?? '' }))

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setSaving(true)
    try {
      const payload = { ...form, weightKg: form.weightKg ? Number(form.weightKg) : undefined, declaredValue: form.declaredValue ? Number(form.declaredValue) : undefined, proposedPrice: Number(form.proposedPrice) }
      const { request } = await packageService.create(payload)
      await serviceService.publish(request.id)
      navigate('/panel/paquetes', { state: { message: 'Paquete creado y publicado' } })
    } catch (e2) { setErr(apiErrorMessage(e2, 'No se pudo crear el paquete')) } finally { setSaving(false) }
  }

  return (
    <div className="wg-card" style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 6 }}>Enviar un paquete</h2>
      <p className="wg-muted" style={{ fontSize: 14, marginBottom: 20 }}>Indica remitente, destinatario y la informacion del paquete. Obtendras un codigo de seguimiento.</p>
      {err && <div className="wg-alert wg-alert--error">{err}</div>}
      <form onSubmit={submit}>
        <div className="wg-form-grid">
          <div className="wg-field wg-form-grid--half"><label>Nombre del remitente *</label><input className="wg-input" value={form.senderName} onChange={set('senderName')} required /></div>
          <div className="wg-field wg-form-grid--half"><label>Nombre del destinatario *</label><input className="wg-input" value={form.recipientName} onChange={set('recipientName')} required /></div>
          <div className="wg-field"><label>Telefono del destinatario</label><input className="wg-input" value={form.recipientPhone} onChange={set('recipientPhone')} /></div>
          <div className="wg-field"><label>Peso (kg)</label><input className="wg-input" type="number" step="0.1" value={form.weightKg} onChange={set('weightKg')} /></div>
          <div className="wg-field"><label>Dimensiones</label><input className="wg-input" value={form.dimensions} onChange={set('dimensions')} placeholder="30x20x10 cm" /></div>
          <div className="wg-field"><label>Valor declarado (COP)</label><input className="wg-input" type="number" value={form.declaredValue} onChange={set('declaredValue')} /></div>
          <div className="wg-form-grid--half">
            <AddressInput label="Direccion de recogida *" value={form.pickupAddress} lat={form.pickupLat} lng={form.pickupLng} onChange={setAddress('pickup')} placeholder="Ej: Carrera 7 # 30-10, Bogota" />
          </div>
          <div className="wg-form-grid--half">
            <AddressInput label="Direccion de entrega *" value={form.dropoffAddress} lat={form.dropoffLat} lng={form.dropoffLng} onChange={setAddress('dropoff')} placeholder="Ej: Calle 80 # 15-20, Bogota" />
          </div>
          <div className="wg-field wg-form-grid--full"><label>Descripcion del paquete *</label><input className="wg-input" value={form.description} onChange={set('description')} required /></div>
          <div className="wg-field"><label>Fecha *</label><input className="wg-input" type="date" min={today()} value={form.scheduledDate} onChange={set('scheduledDate')} required /></div>
          <div className="wg-field"><label>Hora *</label><input className="wg-input" type="time" value={form.scheduledTime} onChange={set('scheduledTime')} required /></div>
          <div className="wg-field"><label>Precio propuesto (COP) *</label><input className="wg-input" type="number" value={form.proposedPrice} onChange={set('proposedPrice')} required /></div>
        </div>
        <button className="wg-btn wg-btn--primary wg-btn--block wg-mt" disabled={saving}>{saving ? 'Publicando...' : 'Publicar envio'}</button>
      </form>
    </div>
  )
}
